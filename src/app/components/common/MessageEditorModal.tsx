import { useState } from 'react';
import { X, RefreshCw, Send, Calendar, Save, Check, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { messagesApi } from '../../api/messages';
import { pollJob } from '../../api/jobs';
import type { Contact } from '../../types';
import { cn } from '../ui/utils';

const USE_REAL_API = import.meta.env.VITE_USE_REAL_API !== 'false';

type MessageTone = 'professional' | 'friendly' | 'direct';
type UiVariant = 'short' | 'long';
type BackendVariant = 'short' | 'long' | 'followup_1' | 'followup_2';

type DraftLike = {
  _id?: string;
  id?: string;
  subject?: string;
  body?: string;
  tone?: MessageTone;
  variant?: BackendVariant | null;
  ai_confidence?: number;
};

const generateMessage = (contact: Contact, tone: MessageTone, variant: UiVariant): { subject: string; body: string } => {
  const subjects = {
    professional: `Fellow ${contact.skills[0] || 'tech'} professional - would love to connect`,
    friendly: `Hi ${contact.name.split(' ')[0]}! Would love to chat`,
    direct: `Quick question about your work at ${contact.company}`,
  };

  const bodies = {
    short: `Hi ${contact.name.split(' ')[0]},\n\nI've been following your work at ${contact.company} and am genuinely impressed. We share ${contact.mutualConnections} mutual connections and ${contact.interests?.[0] ? `a common interest in ${contact.interests[0]}` : 'similar professional backgrounds'}.\n\nWould you be open to a 15-minute chat?\n\nBest,\nJordan`,
    long: `Hi ${contact.name.split(' ')[0]},\n\nI came across your profile through our mutual connections and wanted to reach out. Your work on ${contact.skills[0] || 'your field'} at ${contact.company} is fascinating-especially [recent project].\n\nI'm currently exploring ${contact.title?.includes('Engineer') ? 'engineering opportunities' : 'professional connections'} and your experience at ${contact.company} is exactly the kind of insight I'm seeking.\n\nWe also share connections including ${contact.mutualConnections} mutual contacts, which made me feel comfortable reaching out directly.\n\nWould you be open to a 20-minute virtual coffee chat? I'm happy to work around your schedule.\n\nBest regards,\nJordan Lee`,
  };

  return {
    subject: subjects[tone],
    body: bodies[variant],
  };
};

function toUiVariant(variant?: BackendVariant | null): UiVariant {
  return variant === 'short' ? 'short' : 'long';
}

function toBackendVariant(variant: UiVariant): BackendVariant {
  return variant === 'short' ? 'short' : 'long';
}

function normalizeDraft(draft: DraftLike) {
  return {
    id: draft.id || draft._id || null,
    subject: draft.subject || '',
    body: draft.body || '',
    tone: (draft.tone || 'professional') as MessageTone,
    variant: toUiVariant(draft.variant),
    confidence: Math.round(draft.ai_confidence || 0),
  };
}

async function loadGeneratedDraft(contactId: string, tone: MessageTone, preferredVariant: UiVariant) {
  const { job_id } = await messagesApi.generate({ contact_id: contactId, tone });
  const job = await pollJob(job_id, { timeout: 120000 });
  const draftIds = ((job.output as { draft_ids?: string[] } | undefined)?.draft_ids) || [];
  if (!draftIds.length) throw new Error('No drafts were created');
  const drafts = await Promise.all(draftIds.map((id) => messagesApi.get(id)));
  const preferred = drafts.find((draft) => draft.variant === toBackendVariant(preferredVariant)) || drafts[0];
  return normalizeDraft(preferred as DraftLike);
}

async function ensureDraftId(
  draftId: string | null,
  contactId: string,
  message: { subject: string; body: string },
  tone: MessageTone,
) {
  if (draftId) return draftId;
  const created = await messagesApi.create({
    contact_id: contactId,
    subject: message.subject,
    body: message.body,
    tone,
    status: 'draft',
  });
  return created._id || created.id || null;
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          animate={{ scale: [1, 1.5, 1], opacity: [0.4, 1, 0.4] }}
          transition={{ repeat: Infinity, duration: 0.9, delay: i * 0.2, ease: 'easeInOut' }}
          className="w-1.5 h-1.5 rounded-full bg-indigo-500"
        />
      ))}
    </div>
  );
}

function ConfidenceMeter({ score }: { score: number }) {
  const [showBreakdown, setShowBreakdown] = useState(false);
  const barColor = score >= 80 ? '#00703c' : score >= 60 ? '#b39200' : '#9ca3af';
  const label = score >= 80 ? 'High' : score >= 60 ? 'Medium' : 'Low';
  const textColor = score >= 80 ? 'text-green-700 dark:text-green-400' : score >= 60 ? 'text-yellow-600 dark:text-yellow-400' : 'text-gray-500 dark:text-gray-400';

  return (
    <div className="bg-white dark:bg-[#303134] rounded-lg p-4 border border-[#e6e6e6] dark:border-[#3c4043]">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-gray-900 dark:text-[#e8eaed] flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-[#0a66c2] dark:text-[#8ab4f8]" /> AI Confidence
        </h3>
        <span className={`text-sm font-bold ${textColor}`}>{score}% · {label}</span>
      </div>
      <div className="h-1.5 bg-gray-100 dark:bg-[#3c4043] rounded-full overflow-hidden mb-2">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(score + 5, 97)}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="h-full rounded-full"
          style={{ backgroundColor: barColor }}
        />
      </div>
      <button onClick={() => setShowBreakdown(!showBreakdown)} className="text-xs text-[#0a66c2] dark:text-[#8ab4f8] hover:underline transition-colors">
        {showBreakdown ? 'Hide breakdown ▲' : 'View breakdown ▼'}
      </button>
      <AnimatePresence>
        {showBreakdown && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden mt-2 space-y-1.5">
            {[
              { label: 'Personalization', score: Math.min(score + 8, 98) },
              { label: 'Mutual connections', score: Math.min(score + 2, 95) },
              { label: 'Tone match', score: Math.min(score - 5, 90) },
              { label: 'Specificity', score: Math.min(score - 10, 85) },
            ].map(({ label: l, score: s }) => (
              <div key={l} className="flex items-center gap-2 text-xs">
                <span className="text-gray-500 dark:text-[#9aa0a6] w-28 flex-shrink-0">{l}</span>
                <div className="flex-1 h-1 bg-gray-100 dark:bg-[#3c4043] rounded-full overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${s}%` }} transition={{ duration: 0.6, ease: 'easeOut' }} className="h-full rounded-full" style={{ backgroundColor: barColor }} />
                </div>
                <span className="text-gray-600 dark:text-[#9aa0a6] font-medium">{s}%</span>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface Props {
  contact: Contact;
  onClose: () => void;
  onSend: () => void;
  existingMessage?: { id?: string; subject: string; body: string; tone?: MessageTone; variant?: BackendVariant | null };
}

export default function MessageEditorModal({ contact, onClose, onSend, existingMessage }: Props) {
  const isEditing = !!existingMessage;
  const initialDraft = existingMessage
    ? normalizeDraft(existingMessage)
    : { id: null, ...normalizeDraft(generateMessage(contact, 'professional', 'long')) };

  const [tone, setTone] = useState<MessageTone>(initialDraft.tone);
  const [variant, setVariant] = useState<UiVariant>(initialDraft.variant);
  const [msg, setMsg] = useState(() => ({ subject: initialDraft.subject, body: initialDraft.body }));
  const [draftId, setDraftId] = useState<string | null>(initialDraft.id);
  const [confidence, setConfidence] = useState(initialDraft.confidence);
  const [scheduled, setScheduled] = useState(false);
  const [sending, setSending] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [rippleTone, setRippleTone] = useState<string | null>(null);
  const [rippleVariant, setRippleVariant] = useState<string | null>(null);

  const charCount = msg.body.length;
  const charLimit = 500;
  const isOverLimit = charCount > charLimit;

  const handleToneChange = (nextTone: MessageTone) => {
    setRippleTone(nextTone);
    setTimeout(() => setRippleTone(null), 400);
    setTone(nextTone);
    if (!USE_REAL_API) setMsg(generateMessage(contact, nextTone, variant));
  };

  const handleVariantChange = (nextVariant: UiVariant) => {
    setRippleVariant(nextVariant);
    setTimeout(() => setRippleVariant(null), 400);
    setVariant(nextVariant);
    if (!USE_REAL_API) setMsg(generateMessage(contact, tone, nextVariant));
  };

  const regenerate = async () => {
    setRegenerating(true);
    try {
      if (!USE_REAL_API || !contact.id) {
        await new Promise((r) => setTimeout(r, 1500));
        setMsg(generateMessage(contact, tone, variant));
        return;
      }

      if (draftId) {
        const { job_id } = await messagesApi.regenerate(draftId, {
          tone,
          variant: toBackendVariant(variant),
        });
        await pollJob(job_id, { timeout: 120000 });
        const refreshed = normalizeDraft(await messagesApi.get(draftId));
        setMsg({ subject: refreshed.subject, body: refreshed.body });
        setTone(refreshed.tone);
        setVariant(refreshed.variant);
        setConfidence(refreshed.confidence);
      } else {
        const generated = await loadGeneratedDraft(contact.id, tone, variant);
        setDraftId(generated.id);
        setMsg({ subject: generated.subject, body: generated.body });
        setTone(generated.tone);
        setVariant(generated.variant);
        setConfidence(generated.confidence);
      }

      toast.success('AI draft ready');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate message';
      toast.error(message);
    } finally {
      setRegenerating(false);
    }
  };

  const handleSend = async () => {
    setSending(true);
    try {
      if (USE_REAL_API && contact.id) {
        const currentDraftId = await ensureDraftId(draftId, contact.id, msg, tone);
        if (!currentDraftId) throw new Error('Unable to create a draft for this message');
        setDraftId(currentDraftId);
        await messagesApi.update(currentDraftId, { subject: msg.subject, body: msg.body, tone });
        if (scheduled) {
          const scheduledFor = new Date();
          scheduledFor.setDate(scheduledFor.getDate() + 1);
          scheduledFor.setHours(9, 0, 0, 0);
          await messagesApi.schedule(currentDraftId, scheduledFor.toISOString());
        } else {
          await messagesApi.send(currentDraftId);
        }
      } else {
        await new Promise((r) => setTimeout(r, 1000));
      }
      onSend();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to send message';
      toast.error(message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 20 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="relative bg-white dark:bg-[#303134] rounded-xl shadow-[0_4px_24px_rgba(0,0,0,0.12)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.5)] w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col border border-[#e6e6e6] dark:border-[#3c4043]"
      >
        <div className="flex items-center justify-between p-5 border-b border-[#e6e6e6] dark:border-[#3c4043]">
          <div className="flex items-center gap-3">
            <div className={cn('w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-medium', contact.avatarColor)}>
              {contact.initials}
            </div>
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-slate-100">{isEditing ? 'Edit Message' : 'New Message'} · {contact.name}</h2>
              <p className="text-xs text-gray-500 dark:text-slate-400">{contact.title} at {contact.company}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 dark:text-[#71767a] hover:text-gray-600 dark:hover:text-[#e8eaed] hover:bg-[#f7f9fa] dark:hover:bg-[#3c4043] rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div className="flex-1 p-5 flex flex-col gap-4 overflow-y-auto border-r border-[#e6e6e6] dark:border-[#3c4043]">
            <div className="flex gap-4 flex-wrap">
              <div className="flex gap-2">
                {(['professional', 'friendly', 'direct'] as const).map((item) => (
                  <motion.button
                    key={item}
                    onClick={() => handleToneChange(item)}
                    whileTap={{ scale: 0.9 }}
                    animate={rippleTone === item ? { scale: [1, 0.85, 1.05, 1] } : {}}
                    transition={{ duration: 0.3 }}
                    className={cn(
                      'relative text-xs px-3 py-1.5 rounded-lg border transition-all capitalize overflow-hidden',
                      tone === item
                        ? 'border-[#0a66c2] bg-blue-50 dark:bg-[#8ab4f8]/10 text-[#0a66c2] dark:text-[#8ab4f8] shadow-sm'
                        : 'border-[#e6e6e6] dark:border-[#3c4043] text-gray-600 dark:text-[#9aa0a6] hover:border-[#0a66c2]/40 hover:bg-blue-50/50 dark:hover:bg-[#8ab4f8]/5'
                    )}
                  >
                    {rippleTone === item && <motion.span initial={{ scale: 0, opacity: 0.5 }} animate={{ scale: 3, opacity: 0 }} transition={{ duration: 0.4 }} className="absolute inset-0 rounded-lg bg-blue-300 pointer-events-none" style={{ transformOrigin: 'center' }} />}
                    {item}
                  </motion.button>
                ))}
              </div>
              <div className="flex gap-2">
                {(['short', 'long'] as const).map((item) => (
                  <motion.button
                    key={item}
                    onClick={() => handleVariantChange(item)}
                    whileTap={{ scale: 0.9 }}
                    animate={rippleVariant === item ? { scale: [1, 0.85, 1.05, 1] } : {}}
                    transition={{ duration: 0.3 }}
                    className={cn(
                      'relative text-xs px-3 py-1.5 rounded-lg border transition-all capitalize overflow-hidden',
                      variant === item
                        ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-400 shadow-sm'
                        : 'border-[#e6e6e6] dark:border-[#3c4043] text-gray-600 dark:text-[#9aa0a6] hover:border-teal-300 hover:bg-teal-50/50 dark:hover:bg-teal-900/10'
                    )}
                  >
                    {rippleVariant === item && <motion.span initial={{ scale: 0, opacity: 0.5 }} animate={{ scale: 3, opacity: 0 }} transition={{ duration: 0.4 }} className="absolute inset-0 rounded-lg bg-teal-400 pointer-events-none" />}
                    {item}
                  </motion.button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-400 dark:text-[#71767a] uppercase tracking-wide mb-1 block">Subject</label>
              <input
                value={msg.subject}
                onChange={(e) => setMsg((m) => ({ ...m, subject: e.target.value }))}
                className="w-full px-3 py-2.5 border border-[#e6e6e6] dark:border-[#3c4043] bg-white dark:bg-[#292a2d] text-gray-900 dark:text-[#e8eaed] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0a66c2] dark:focus:ring-[#8ab4f8] transition-all"
              />
            </div>

            <div className="flex-1">
              <label className="text-xs font-medium text-gray-400 dark:text-[#71767a] uppercase tracking-wide mb-1 block">Message</label>
              <AnimatePresence mode="wait">
                {regenerating ? (
                  <motion.div
                    key="regenerating"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="w-full h-48 border border-[#e6e6e6] dark:border-[#3c4043] rounded-lg flex flex-col items-center justify-center gap-3 bg-[#f7f9fa] dark:bg-[#292a2d]"
                  >
                    <TypingDots />
                    <p className="text-xs text-gray-500">AI is crafting a new message...</p>
                    <div className="space-y-1.5 w-3/4">
                      {[80, 60, 70, 50].map((w, i) => (
                        <motion.div
                          key={i}
                          animate={{ opacity: [0.3, 0.6, 0.3] }}
                          transition={{ repeat: Infinity, duration: 1.2, delay: i * 0.15 }}
                          className="h-2 bg-[#0a66c2]/20 dark:bg-[#8ab4f8]/20 rounded-full"
                          style={{ width: `${w}%` }}
                        />
                      ))}
                    </div>
                  </motion.div>
                ) : (
                  <motion.textarea
                    key="editor"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    value={msg.body}
                    onChange={(e) => setMsg((m) => ({ ...m, body: e.target.value }))}
                    rows={12}
                    className="w-full px-3 py-2.5 border border-[#e6e6e6] dark:border-[#3c4043] bg-white dark:bg-[#292a2d] text-gray-900 dark:text-[#e8eaed] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0a66c2] dark:focus:ring-[#8ab4f8] resize-none transition-all"
                  />
                )}
              </AnimatePresence>
              <div className="flex items-center justify-between mt-1">
                <motion.span
                  animate={{ color: isOverLimit ? '#ef4444' : charCount > 400 ? '#f97316' : '#9ca3af' }}
                  className="text-xs"
                >
                  {charCount} / {charLimit} characters
                  {isOverLimit && ' - consider shortening'}
                </motion.span>
                <AnimatePresence>
                  {isOverLimit && (
                    <motion.span
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="text-xs text-red-500 font-medium"
                    >
                      Over limit by {charCount - charLimit}
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={regenerate}
              disabled={regenerating}
              className="flex items-center gap-2 text-sm text-[#0a66c2] dark:text-[#8ab4f8] hover:text-[#004182] dark:hover:text-[#4285f4] w-fit disabled:opacity-60"
            >
              <motion.div
                animate={regenerating ? { rotate: 360 } : {}}
                transition={{ repeat: regenerating ? Infinity : 0, duration: 0.8, ease: 'linear' }}
              >
                <RefreshCw className="w-4 h-4" />
              </motion.div>
              {regenerating ? 'Generating...' : 'Regenerate with AI'}
            </motion.button>
          </div>

          <div className="w-72 p-5 flex flex-col gap-4 overflow-y-auto bg-[#f7f9fa] dark:bg-[#292a2d]">
            <ConfidenceMeter score={confidence || (contact.strengthScore > 80 ? contact.strengthScore - 5 : contact.strengthScore + 3)} />

            <div className="bg-white dark:bg-[#303134] rounded-lg p-4 border border-[#e6e6e6] dark:border-[#3c4043]">
              <h3 className="text-sm font-medium text-gray-900 dark:text-[#e8eaed] mb-3">Why This Message Works</h3>
              <div className="space-y-2">
                {[
                  `References ${contact.company} specifically`,
                  `Mentions ${contact.mutualConnections} mutual connections`,
                  contact.skills[0] ? `Acknowledges expertise in ${contact.skills[0]}` : null,
                  contact.interests?.[0] ? `Shares interest: ${contact.interests[0]}` : null,
                  'Personalized ask included',
                ].filter(Boolean).map((reason, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.06, duration: 0.2 }}
                    className="flex items-start gap-2 text-xs text-gray-700 dark:text-[#9aa0a6]"
                  >
                    <Check className="w-3.5 h-3.5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                    {reason}
                  </motion.div>
                ))}
              </div>
            </div>

            <div className="bg-white dark:bg-[#303134] rounded-lg p-4 border border-[#e6e6e6] dark:border-[#3c4043]">
              <h3 className="text-sm font-medium text-gray-900 dark:text-[#e8eaed] mb-3">Contact Context</h3>
              <div className="space-y-2 text-xs text-gray-600 dark:text-[#9aa0a6]">
                <div><span className="text-gray-400 dark:text-[#71767a]">Skills:</span> {contact.skills.slice(0, 3).join(', ')}</div>
                <div><span className="text-gray-400 dark:text-[#71767a]">Mutual connections:</span> {contact.mutualConnections}</div>
                {contact.interests?.[0] && <div><span className="text-gray-400 dark:text-[#71767a]">Interests:</span> {contact.interests.slice(0, 2).join(', ')}</div>}
                <div><span className="text-gray-400 dark:text-[#71767a]">Last active:</span> {contact.lastInteraction}</div>
              </div>
            </div>

            <div className="bg-blue-50 dark:bg-[#8ab4f8]/8 rounded-lg p-4 border border-blue-100 dark:border-[#8ab4f8]/15">
              <h3 className="text-sm font-medium text-blue-800 dark:text-[#8ab4f8] mb-2">Best Time to Send</h3>
              <p className="text-xs text-blue-700 dark:text-[#8ab4f8]/80">Tuesday-Thursday, 9-11 AM recipient's local time shows 35% higher open rates.</p>
            </div>
          </div>
        </div>

        <div className="p-5 border-t border-[#e6e6e6] dark:border-[#3c4043] flex items-center justify-between gap-3">
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="flex items-center gap-2 text-sm text-gray-600 dark:text-[#9aa0a6] hover:text-gray-800 dark:hover:text-[#e8eaed] border border-[#e6e6e6] dark:border-[#3c4043] hover:bg-[#f7f9fa] dark:hover:bg-[#3c4043] px-4 py-2 rounded-lg transition-colors"
          >
            <Save className="w-4 h-4" /> Save Draft
          </motion.button>
          <div className="flex gap-3">
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setScheduled(!scheduled)}
              className={cn('flex items-center gap-2 text-sm px-4 py-2 rounded-lg border transition-colors', scheduled ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-400' : 'border-[#e6e6e6] dark:border-[#3c4043] text-gray-600 dark:text-[#9aa0a6] hover:bg-[#f7f9fa] dark:hover:bg-[#3c4043]')}
            >
              <Calendar className="w-4 h-4" /> {scheduled ? 'Scheduled for Tomorrow 9 AM' : 'Schedule Send'}
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.96 }}
              onClick={handleSend}
              disabled={sending}
              className="flex items-center gap-2 text-sm bg-[#0a66c2] hover:bg-[#004182] text-white px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-60"
            >
              {sending ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Send className="w-4 h-4" />}
              {scheduled ? 'Save Schedule' : 'Send Now'}
            </motion.button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
