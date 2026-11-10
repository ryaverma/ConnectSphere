import { Router } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import sgMail from '@sendgrid/mail';
import { config } from '../config.js';
import { redisClient, keys } from '../services/redis.js';
import { generateAccessToken, generateRefreshToken, invalidateToken, tokenRemainingSeconds } from '../utils/tokens.js';
import User from '../models/User.js';
import UserIntegration from '../models/UserIntegration.js';
import Contact from '../models/Contact.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// ─── POST /api/auth/register ──────────────────────────────────────────────────
router.post('/register', async (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password || !name) {
    return res.status(400).json({ error: 'email, password, and name are required' });
  }
  const exists = await User.findOne({ email }).lean();
  if (exists) return res.status(409).json({ error: 'Email already registered' });

  const user = await User.create({ email, password_hash: password, name });
  const { token } = generateAccessToken(user._id);
  const { token: refreshToken } = generateRefreshToken(user._id);

  res.status(201).json({ user: user.toSafeObject(), token, refreshToken });
});

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'email and password required' });

  const user = await User.findOne({ email, deleted_at: null });
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  const valid = await user.comparePassword(password);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

  user.last_login_at = new Date();
  await user.save();

  const { token, jti } = generateAccessToken(user._id);
  const { token: refreshToken } = generateRefreshToken(user._id);

  res.json({ user: user.toSafeObject(), token, refreshToken });
});

// ─── POST /api/auth/logout ────────────────────────────────────────────────────
router.post('/logout', authenticate, async (req, res) => {
  const remaining = tokenRemainingSeconds(
    req.headers.authorization.slice(7),
    config.jwt.secret,
  );
  await invalidateToken(req.jti, remaining || 900);
  res.json({ message: 'Logged out' });
});

// ─── POST /api/auth/refresh ───────────────────────────────────────────────────
router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ error: 'refreshToken required' });

  let payload;
  try {
    payload = jwt.verify(refreshToken, config.jwt.refreshSecret);
  } catch {
    return res.status(401).json({ error: 'Invalid or expired refresh token' });
  }
  if (payload.type !== 'refresh') return res.status(401).json({ error: 'Wrong token type' });

  const user = await User.findById(payload.sub).select('_id deleted_at').lean();
  if (!user || user.deleted_at) return res.status(401).json({ error: 'User not found' });

  const { token } = generateAccessToken(user._id);
  res.json({ token });
});

// ─── POST /api/auth/forgot-password ──────────────────────────────────────────
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'email required' });

  const user = await User.findOne({ email, deleted_at: null }).select('_id email name').lean();
  // Always return 200 to avoid user enumeration
  if (user) {
    const resetToken = jwt.sign({ sub: user._id, type: 'reset' }, config.jwt.secret, { expiresIn: '1h' });
    await redisClient.set(`reset:${user._id}`, resetToken, 'EX', 3600);

    // Send password reset email
    if (config.sendgrid?.apiKey) {
      try {
        sgMail.setApiKey(config.sendgrid.apiKey);
        const resetUrl = `${config.appUrl}/reset-password?token=${resetToken}`;
        await sgMail.send({
          to: user.email,
          from: config.sendgrid.fromEmail || 'noreply@connectsphere.io',
          subject: 'Reset your ConnectSphere password',
          text: `Click this link to reset your password: ${resetUrl}\n\nThis link expires in 1 hour.`,
          html: `<p>Hello ${user.name || 'there'},</p><p>Click <a href="${resetUrl}">here</a> to reset your ConnectSphere password.</p><p>This link expires in 1 hour. If you did not request a password reset, you can ignore this email.</p>`,
        });
        console.log(`[auth] Password reset email sent to ${user.email}`);
      } catch (emailErr) {
        console.error(`[auth] Failed to send password reset email: ${emailErr.message}`);
        // Do not fail the request — token is already saved
      }
    } else {
      // Dev mode: log the reset URL
      const resetUrl = `${config.appUrl}/reset-password?token=${resetToken}`;
      console.log(`[auth] DEV: Password reset URL for ${user.email}: ${resetUrl}`);
    }
  }
  res.json({ message: 'If that email exists, a reset link has been sent' });
});

// ─── POST /api/auth/reset-password ───────────────────────────────────────────
router.post('/reset-password', async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) return res.status(400).json({ error: 'token and password required' });

  let payload;
  try {
    payload = jwt.verify(token, config.jwt.secret);
  } catch {
    return res.status(401).json({ error: 'Invalid or expired reset token' });
  }
  if (payload.type !== 'reset') return res.status(401).json({ error: 'Wrong token type' });

  const stored = await redisClient.get(`reset:${payload.sub}`);
  if (stored !== token) return res.status(401).json({ error: 'Token already used or expired' });

  const user = await User.findById(payload.sub);
  if (!user) return res.status(404).json({ error: 'User not found' });

  user.password_hash = password; // pre-save hook hashes it
  await user.save();
  await redisClient.del(`reset:${payload.sub}`);

  res.json({ message: 'Password updated' });
});

// ─── POST /api/auth/verify-email ─────────────────────────────────────────────
router.post('/verify-email', async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: 'token required' });

  let payload;
  try {
    payload = jwt.verify(token, config.jwt.secret);
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
  if (payload.type !== 'verify') return res.status(400).json({ error: 'Wrong token type' });

  await User.findByIdAndUpdate(payload.sub, { email_verified: true });
  res.json({ message: 'Email verified' });
});

// ─── GET /api/auth/oauth/:provider/authorize ─────────────────────────────────
router.get('/oauth/:provider/authorize', async (req, res) => {
  const { provider } = req.params;
  const validProviders = ['linkedin', 'github', 'google'];

  if (!validProviders.includes(provider)) {
    return res.status(400).json({ message: 'Invalid OAuth provider' });
  }

  const oauthConfig = config.oauth?.[provider];
  if (!oauthConfig?.clientId) {
    return res.status(501).json({
      message: `OAuth for ${provider} is not configured. Set ${provider.toUpperCase()}_CLIENT_ID and ${provider.toUpperCase()}_CLIENT_SECRET in environment variables.`,
    });
  }

  // Generate CSRF state token
  const state = uuidv4().replace(/-/g, '');

  // Store state in Redis with 10 minute TTL
  await redisClient.set(`oauth:state:${state}`, provider, 'EX', 600);

  const callbackUrl = `${config.apiUrl}/api/auth/oauth/${provider}/callback`;
  let authUrl;

  if (provider === 'linkedin') {
    authUrl = `https://www.linkedin.com/oauth/v2/authorization?` +
      `response_type=code&client_id=${oauthConfig.clientId}` +
      `&redirect_uri=${encodeURIComponent(callbackUrl)}` +
      `&scope=r_liteprofile%20r_emailaddress` +
      `&state=${state}`;
  } else if (provider === 'github') {
    authUrl = `https://github.com/login/oauth/authorize?` +
      `client_id=${oauthConfig.clientId}` +
      `&redirect_uri=${encodeURIComponent(callbackUrl)}` +
      `&scope=read:user,user:email` +
      `&state=${state}`;
  } else if (provider === 'google') {
    authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${oauthConfig.clientId}` +
      `&redirect_uri=${encodeURIComponent(callbackUrl)}` +
      `&response_type=code` +
      `&scope=openid%20email%20profile` +
      `&state=${state}`;
  }

  res.redirect(authUrl);
});

// ─── GET /api/auth/oauth/:provider/callback ───────────────────────────────────
router.get('/oauth/:provider/callback', async (req, res) => {
  const { provider } = req.params;
  const { code, state, error } = req.query;

  if (error) {
    return res.redirect(`${config.appUrl}/settings?integration=${provider}&status=error&reason=${encodeURIComponent(error)}`);
  }

  // Validate CSRF state
  const storedProvider = await redisClient.get(`oauth:state:${state}`);
  if (!storedProvider || storedProvider !== provider) {
    return res.status(400).json({ message: 'Invalid OAuth state. Please try again.' });
  }
  await redisClient.del(`oauth:state:${state}`);

  const oauthConfig = config.oauth?.[provider];
  if (!oauthConfig?.clientId) {
    return res.status(501).json({ message: `OAuth for ${provider} is not configured` });
  }

  const callbackUrl = `${config.apiUrl}/api/auth/oauth/${provider}/callback`;

  try {
    let accessToken, profile;

    if (provider === 'github') {
      // Exchange code for token
      const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: oauthConfig.clientId,
          client_secret: oauthConfig.clientSecret,
          code,
          redirect_uri: callbackUrl,
        }),
      });
      const tokenData = await tokenRes.json();
      accessToken = tokenData.access_token;

      // Fetch profile
      const profileRes = await fetch('https://api.github.com/user', {
        headers: { 'Authorization': `token ${accessToken}`, 'Accept': 'application/vnd.github.v3+json' },
      });
      profile = await profileRes.json();

    } else if (provider === 'linkedin') {
      const tokenRes = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: callbackUrl,
          client_id: oauthConfig.clientId,
          client_secret: oauthConfig.clientSecret,
        }),
      });
      const tokenData = await tokenRes.json();
      accessToken = tokenData.access_token;

      const profileRes = await fetch('https://api.linkedin.com/v2/me', {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      });
      profile = await profileRes.json();

    } else if (provider === 'google') {
      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: callbackUrl,
          client_id: oauthConfig.clientId,
          client_secret: oauthConfig.clientSecret,
        }),
      });
      const tokenData = await tokenRes.json();
      accessToken = tokenData.access_token;

      const profileRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      });
      profile = await profileRes.json();
    }

    if (!accessToken) {
      throw new Error('Failed to obtain access token from provider');
    }

    // Encrypt the token before storing (AES-256-CBC)
    const encryptionKey = crypto.createHash('sha256').update(config.jwt.secret).digest();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', encryptionKey, iv);
    const encrypted = Buffer.concat([cipher.update(accessToken, 'utf8'), cipher.final()]);
    const encryptedToken = iv.toString('hex') + ':' + encrypted.toString('hex');

    // We need to determine the user from the session/query — for OAuth we need the user to be logged in
    // Get user from JWT token in cookie or Authorization header
    let userId;
    const authHeader = req.headers.authorization;
    const cookieToken = req.cookies?.token;
    const tokenToCheck = authHeader?.split(' ')[1] || cookieToken;
    if (tokenToCheck) {
      try {
        const decoded = jwt.verify(tokenToCheck, config.jwt.secret);
        userId = decoded.sub;
      } catch (e) {
        // Token expired — redirect to sign in
        return res.redirect(`${config.appUrl}/signin?redirect=/settings`);
      }
    }

    if (!userId) {
      return res.redirect(`${config.appUrl}/signin?redirect=/settings`);
    }

    await UserIntegration.findOneAndUpdate(
      { user_id: userId, provider },
      {
        user_id: userId,
        provider,
        access_token: encryptedToken,
        is_active: true,
        connected_at: new Date(),
        last_sync_at: new Date(),
        sync_error: null,
        provider_user_id: String(profile?.id || profile?.sub || ''),
        scopes: provider === 'github' ? ['read:user', 'user:email'] : ['profile', 'email'],
      },
      { upsert: true, new: true }
    );

    res.redirect(`${config.appUrl}/settings?integration=${provider}&status=connected`);

  } catch (err) {
    console.error(`[auth] OAuth ${provider} callback error: ${err.message}`);
    res.redirect(`${config.appUrl}/settings?integration=${provider}&status=error&reason=${encodeURIComponent(err.message)}`);
  }
});

const DEMO_CONTACTS = [
  { name: 'Sarah Chen', email: 'sarah.chen@google.com', title: 'Senior ML Engineer', company: 'Google', location: 'San Francisco, CA', initials: 'SC', avatar_color: 'bg-blue-500', strength_score: 92, skills: ['Machine Learning', 'Python', 'TensorFlow', 'Deep Learning'], status: 'responded', source: 'linkedin', mutual_connections: 8, bio: 'ML engineer passionate about responsible AI and scalable systems.', education: 'MIT - MS Computer Science', interests: ['AI Research', 'Startups', 'Rock Climbing'], graph_x: 400, graph_y: 300 },
  { name: 'Marcus Johnson', email: 'marcus@meta.com', title: 'Product Manager', company: 'Meta', location: 'New York, NY', initials: 'MJ', avatar_color: 'bg-indigo-500', strength_score: 78, skills: ['Product Strategy', 'Growth', 'Analytics', 'UX Research'], status: 'active', source: 'linkedin', mutual_connections: 5, bio: 'Building products that matter for billions of people.', education: 'Stanford - MBA', interests: ['Product Management', 'Design', 'Tennis'], graph_x: 550, graph_y: 200 },
  { name: 'Priya Patel', email: 'priya@openai.com', title: 'Research Scientist', company: 'OpenAI', location: 'San Francisco, CA', initials: 'PP', avatar_color: 'bg-violet-500', strength_score: 88, skills: ['NLP', 'PyTorch', 'Research', 'Statistics'], status: 'in-campaign', source: 'github', mutual_connections: 12, bio: 'Researching the boundaries of language models.', education: 'Carnegie Mellon - PhD AI', interests: ['AI Safety', 'Hiking', 'Poetry'], graph_x: 300, graph_y: 180 },
  { name: 'James Wilson', email: 'jwilson@stripe.com', title: 'Staff Engineer', company: 'Stripe', location: 'Seattle, WA', initials: 'JW', avatar_color: 'bg-purple-500', strength_score: 65, skills: ['Distributed Systems', 'Go', 'Rust', 'APIs'], status: 'pending', source: 'github', mutual_connections: 3, bio: 'Building the financial infrastructure of the internet.', education: 'UC Berkeley - BS CS', interests: ['Open Source', 'Climbing', 'Coffee'], graph_x: 600, graph_y: 380 },
  { name: 'Elena Rodriguez', email: 'elena@airbnb.com', title: 'Design Lead', company: 'Airbnb', location: 'San Francisco, CA', initials: 'ER', avatar_color: 'bg-teal-500', strength_score: 82, skills: ['UX Design', 'Design Systems', 'Figma', 'User Research'], status: 'responded', source: 'linkedin', mutual_connections: 7, bio: 'Creating belonging through design.', education: 'RISD - BFA Graphic Design', interests: ['Typography', 'Travel', 'Photography'], graph_x: 250, graph_y: 350 },
  { name: 'David Kim', email: 'dkim@netflix.com', title: 'Data Scientist', company: 'Netflix', location: 'Los Angeles, CA', initials: 'DK', avatar_color: 'bg-emerald-500', strength_score: 71, skills: ['Data Science', 'Spark', 'SQL', 'A/B Testing'], status: 'dormant', source: 'email', mutual_connections: 4, bio: 'Using data to drive entertainment decisions.', education: 'UCLA - MS Statistics', interests: ['Film', 'Data Viz', 'Cycling'], graph_x: 480, graph_y: 450 },
  { name: 'Aisha Thompson', email: 'aisha@anthropic.com', title: 'AI Safety Researcher', company: 'Anthropic', location: 'San Francisco, CA', initials: 'AT', avatar_color: 'bg-orange-500', strength_score: 95, skills: ['AI Safety', 'Interpretability', 'RL', 'Python'], status: 'active', source: 'linkedin', mutual_connections: 15, bio: 'Making AI systems safe and beneficial.', education: 'Oxford - DPhil CS', interests: ['AI Policy', 'Philosophy', 'Chess'], graph_x: 350, graph_y: 130 },
  { name: 'Ryan Park', email: 'rpark@linkedin.com', title: 'Engineering Manager', company: 'LinkedIn', location: 'Sunnyvale, CA', initials: 'RP', avatar_color: 'bg-rose-500', strength_score: 59, skills: ['Engineering Leadership', 'System Design', 'Java', 'Agile'], status: 'dormant', source: 'linkedin', mutual_connections: 9, bio: 'Building teams that build products at scale.', education: 'Stanford - BS CS', interests: ['Leadership', 'Golf', 'Strategy'], graph_x: 520, graph_y: 320 },
  { name: 'Mei Zhang', email: 'mei@databricks.com', title: 'Solutions Architect', company: 'Databricks', location: 'Chicago, IL', initials: 'MZ', avatar_color: 'bg-cyan-500', strength_score: 76, skills: ['Apache Spark', 'MLflow', 'AWS', 'Data Engineering'], status: 'in-campaign', source: 'linkedin', mutual_connections: 6, bio: 'Helping enterprises unlock their data.', education: 'University of Michigan - MS Data Science', interests: ['Big Data', 'Running', 'Cooking'], graph_x: 170, graph_y: 260 },
  { name: 'Tom Bradley', email: 'tom@sequoia.com', title: 'Partner', company: 'Sequoia Capital', location: 'Menlo Park, CA', initials: 'TB', avatar_color: 'bg-pink-500', strength_score: 45, skills: ['Venture Capital', 'Startups', 'Business Strategy', 'Finance'], status: 'pending', source: 'email', mutual_connections: 2, bio: 'Investing in the next generation of companies.', education: 'Harvard - MBA', interests: ['Startups', 'Sailing', 'Wine'], graph_x: 630, graph_y: 270 },
  { name: 'Zara Ahmed', email: 'zara@shopify.com', title: 'Senior Product Designer', company: 'Shopify', location: 'Toronto, Canada', initials: 'ZA', avatar_color: 'bg-blue-500', strength_score: 83, skills: ['Product Design', 'Interaction Design', 'Prototyping', 'CSS'], status: 'active', source: 'linkedin', mutual_connections: 11, bio: 'Designing for millions of entrepreneurs.', education: 'Parsons - BFA Design', interests: ['E-commerce', 'Art', 'Yoga'], graph_x: 200, graph_y: 420 },
  { name: 'Carlos Mendez', email: 'carlos@tesla.com', title: 'Autopilot Engineer', company: 'Tesla', location: 'Palo Alto, CA', initials: 'CM', avatar_color: 'bg-indigo-500', strength_score: 68, skills: ['Computer Vision', 'C++', 'CUDA', 'Autonomous Driving'], status: 'pending', source: 'github', mutual_connections: 4, bio: 'Accelerating the transition to sustainable transport.', education: 'Caltech - PhD EE', interests: ['EVs', 'Robotics', 'Astronomy'], graph_x: 380, graph_y: 480 },
  { name: 'Nina Williams', email: 'nina@figma.com', title: 'Head of Partnerships', company: 'Figma', location: 'San Francisco, CA', initials: 'NW', avatar_color: 'bg-violet-500', strength_score: 87, skills: ['Business Development', 'Partnerships', 'SaaS', 'Strategy'], status: 'responded', source: 'linkedin', mutual_connections: 14, bio: 'Building the ecosystem around collaborative design.', education: 'Northwestern - BA Business', interests: ['Design Tools', 'Coffee', 'Podcasts'], graph_x: 460, graph_y: 160 },
  { name: 'Alex Foster', email: 'alex@a16z.com', title: 'Investment Associate', company: 'a16z', location: 'San Francisco, CA', initials: 'AF', avatar_color: 'bg-purple-500', strength_score: 52, skills: ['Venture Capital', 'Market Analysis', 'Fintech', 'SaaS'], status: 'dormant', source: 'email', mutual_connections: 3, bio: 'Finding the next wave of software companies.', education: 'Princeton - BS Economics', interests: ['Fintech', 'Soccer', 'Reading'], graph_x: 580, graph_y: 430 },
  { name: 'Isabel Costa', email: 'isabel@spotify.com', title: 'ML Platform Engineer', company: 'Spotify', location: 'New York, NY', initials: 'IC', avatar_color: 'bg-teal-500', strength_score: 79, skills: ['MLOps', 'Kubernetes', 'Python', 'Feature Stores'], status: 'in-campaign', source: 'linkedin', mutual_connections: 7, bio: 'Scaling ML infrastructure for music and podcasts.', education: 'ETH Zurich - MS CS', interests: ['Music Tech', 'Running', 'Cooking'], graph_x: 280, graph_y: 480 },
];

// ─── POST /api/auth/demo ──────────────────────────────────────────────────────
router.post('/demo', async (req, res) => {
  const DEMO_EMAIL = 'demo@connectsphere.dev';

  let user = await User.findOne({ email: DEMO_EMAIL, deleted_at: null });
  const isNew = !user;

  if (isNew) {
    user = await User.create({
      email: DEMO_EMAIL,
      password_hash: 'Password123!',
      name: 'Jordan Lee',
      title: 'ML Engineer',
      company: 'TechCorp',
      location: 'San Francisco, CA',
      initials: 'JL',
      avatar_color: 'bg-indigo-600',
      bio: 'Passionate about AI/ML and building products that matter.',
      skills: ['Machine Learning', 'Python', 'React', 'Product Strategy'],
      interests: ['AI Research', 'Startups', 'Open Source'],
      goal: 'Find internships and job opportunities',
      onboarding_completed: true,
      email_verified: true,
    });
  }

  // Seed the exact mock contacts if none exist yet
  const existingCount = await Contact.countDocuments({ user_id: user._id });
  if (existingCount === 0) {
    const daysAgo = (n) => new Date(Date.now() - n * 86400000);
    const lastInteractionMap = { 'responded': 2, 'active': 1, 'in-campaign': 7, 'pending': 14, 'dormant': 60 };
    await Contact.insertMany(
      DEMO_CONTACTS.map(c => ({
        ...c,
        user_id: user._id,
        last_interaction_at: daysAgo(lastInteractionMap[c.status] || 30),
      }))
    );
  }

  user.last_login_at = new Date();
  await user.save();

  const { token } = generateAccessToken(user._id);
  const { token: refreshToken } = generateRefreshToken(user._id);
  res.json({ user: user.toSafeObject(), token, refreshToken });
});

export default router;
