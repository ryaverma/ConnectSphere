import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { createServer } from 'http';
import { fileURLToPath } from 'url';
import path from 'path';
import mongoose from 'mongoose';
import { config } from './config.js';
import { redisClient, subscriber } from './services/redis.js';
import { initWebSocket } from './websocket/wsServer.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Routes
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import contactRoutes from './routes/contacts.js';
import campaignRoutes from './routes/campaigns.js';
import messageRoutes from './routes/messages.js';
import eventRoutes from './routes/events.js';
import notificationRoutes from './routes/notifications.js';
import reminderRoutes from './routes/reminders.js';
import analyticsRoutes from './routes/analytics.js';
import networkGraphRoutes from './routes/networkGraph.js';
import searchRoutes from './routes/search.js';
import jobRoutes from './routes/jobs.js';
import integrationRoutes from './routes/integrations.js';
import billingRoutes from './routes/billing.js';
import webhookRoutes from './routes/webhooks.js';
import onboardingRoutes from './routes/onboarding.js';

const app = express();

// Security & utility middleware
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: config.corsOrigins, credentials: true }));
app.use(compression());
app.use(morgan(config.nodeEnv === 'production' ? 'combined' : 'dev'));
app.use(cookieParser());

// Raw body for Stripe webhooks (must come before json parser)
app.use('/api/webhooks/stripe', express.raw({ type: 'application/json' }));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Static file serving for avatar uploads
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Health check
app.get('/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/reminders', reminderRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/network-graph', networkGraphRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/integrations', integrationRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/onboarding', onboardingRoutes);
// Email reply webhook (different path prefix per spec)
app.use('/webhook', webhookRoutes);

// 404 handler
app.use((_req, res) => res.status(404).json({ error: 'Route not found' }));

// Global error handler
app.use((err, _req, res, _next) => {
  console.error('[Error]', err);
  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    error: err.message || 'Internal server error',
    ...(config.nodeEnv === 'development' && { stack: err.stack }),
  });
});

async function start() {
  try {
    // Connect MongoDB
    await mongoose.connect(config.mongodb.uri);
    console.log('[MongoDB] Connected');

    // Connect Redis
    await redisClient.ping();
    console.log('[Redis] Connected');

    // Start HTTP server
    const httpServer = createServer(app);

    // Init WebSocket
    initWebSocket(httpServer);

    httpServer.listen(config.port, () => {
      console.log(`[Server] Running on port ${config.port} (${config.nodeEnv})`);
    });
  } catch (err) {
    console.error('[Startup] Fatal error:', err);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('[Shutdown] SIGTERM received');
  await mongoose.disconnect();
  await redisClient.quit();
  await subscriber.quit();
  process.exit(0);
});

start();
