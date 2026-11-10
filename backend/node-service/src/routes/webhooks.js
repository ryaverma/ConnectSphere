import { Router } from 'express';
import { publishEvent, EVENTS } from '../services/redis.js';
import Message from '../models/Message.js';
import Campaign from '../models/Campaign.js';
import { recalculateStrengthScore } from './contacts.js';
import UserSubscription from '../models/UserSubscription.js';
import Stripe from 'stripe';
import { config } from '../config.js';

async function syncCampaignStats(campaignId) {
  if (!campaignId) return;
  const counts = await Message.aggregate([
    { $match: { campaign_id: campaignId, deleted_at: null } },
    {
      $group: {
        _id: null,
        total:   { $sum: 1 },
        sent:    { $sum: { $cond: [{ $in: ['$status', ['sent', 'opened', 'replied', 'bounced']] }, 1, 0] } },
        opened:  { $sum: { $cond: [{ $eq: ['$status', 'opened'] }, 1, 0] } },
        replied: { $sum: { $cond: [{ $eq: ['$status', 'replied'] }, 1, 0] } },
        bounced: { $sum: { $cond: [{ $eq: ['$status', 'bounced'] }, 1, 0] } },
      },
    },
  ]);
  const s = counts[0] || { total: 0, sent: 0, opened: 0, replied: 0, bounced: 0 };
  await Campaign.findByIdAndUpdate(campaignId, {
    'stats.total_contacts': s.total,
    'stats.sent':    s.sent,
    'stats.opened':  s.opened,
    'stats.replied': s.replied,
    'stats.bounced': s.bounced,
  });
}

const router = Router();

// POST /api/webhooks/sendgrid — email open/click/bounce tracking
router.post('/sendgrid', async (req, res) => {
  const events = Array.isArray(req.body) ? req.body : [req.body];
  for (const evt of events) {
    const { event: eventType, sg_message_id } = evt;
    if (!sg_message_id) continue;

    const msg = await Message.findOne({ tracking_pixel_url: { $regex: sg_message_id } });
    if (!msg) continue;

    if (eventType === 'open') {
      msg.status = 'opened';
      msg.opened_at = new Date();
      msg.open_count = (msg.open_count || 0) + 1;
    } else if (eventType === 'click') {
      msg.click_count = (msg.click_count || 0) + 1;
    } else if (eventType === 'bounce' || eventType === 'dropped') {
      msg.status = 'bounced';
      msg.bounced_at = new Date();
    } else if (eventType === 'delivered') {
      // no-op
    } else if (eventType === 'spamreport') {
      msg.status = 'blocked';
    }

    if (msg.isModified()) {
      await msg.save();
      await syncCampaignStats(msg.campaign_id);
      // Recalculate score whenever the contact's engagement status changes
      if (['opened', 'replied', 'bounced'].includes(eventType)) {
        await recalculateStrengthScore(msg.contact_id);
      }
    }

    // If a reply is detected
    if (eventType === 'group_resubscribe') { /* placeholder for reply detection */ }
  }
  res.status(200).json({ ok: true });
});

// POST /webhook/email/incoming — reply detection
router.post('/email/incoming', async (req, res) => {
  const { thread_id, message_id, contact_id, received_at } = req.body;
  if (!thread_id && !message_id) return res.status(400).json({ error: 'thread_id or message_id required' });

  // Find original message by thread reference
  const msg = message_id
    ? await Message.findById(message_id)
    : await Message.findOne({ tracking_pixel_url: { $regex: thread_id || '' } });

  if (msg) {
    await publishEvent(EVENTS.INTERACTION_RECEIVED, {
      user_id: msg.user_id, message_id: msg._id,
      contact_id: contact_id || msg.contact_id,
      thread_id, received_at: received_at || new Date().toISOString(),
    });
  }
  res.status(200).json({ ok: true });
});

// POST /webhooks/stripe — verify signature and process Stripe events
router.post('/stripe', async (req, res) => {
  if (!config.stripe?.secretKey || !config.stripe?.webhookSecret) {
    return res.status(501).json({ message: 'Stripe not configured' });
  }

  let event;
  try {
    const stripeClient = new Stripe(config.stripe.secretKey);
    const sig = req.headers['stripe-signature'];
    event = stripeClient.webhooks.constructEvent(req.body, sig, config.stripe.webhookSecret);
  } catch (err) {
    console.error(`[webhooks] Stripe signature verification failed: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        await UserSubscription.findOneAndUpdate(
          { stripe_subscription_id: session.subscription },
          { status: 'active', stripe_customer_id: session.customer }
        );
        break;
      }
      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        await UserSubscription.findOneAndUpdate(
          { stripe_subscription_id: subscription.id },
          { status: 'canceled', canceled_at: new Date() }
        );
        break;
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        await UserSubscription.findOneAndUpdate(
          { stripe_customer_id: invoice.customer },
          { status: 'past_due' }
        );
        break;
      }
      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        await UserSubscription.findOneAndUpdate(
          { stripe_subscription_id: subscription.id },
          {
            status: subscription.status,
            current_period_start: new Date(subscription.current_period_start * 1000),
            current_period_end: new Date(subscription.current_period_end * 1000),
          }
        );
        break;
      }
      default:
        console.log(`[webhooks] Unhandled Stripe event: ${event.type}`);
    }
  } catch (err) {
    console.error(`[webhooks] Error processing Stripe event ${event.type}: ${err.message}`);
    // Return 200 anyway to prevent Stripe from retrying indefinitely
  }

  res.status(200).json({ received: true });
});

export default router;
