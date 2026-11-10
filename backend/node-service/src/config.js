import dotenv from 'dotenv';
dotenv.config();

// Secrets must come from the environment (.env). Fail fast instead of silently
// falling back to a value that is public in the repository.
function required(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name} (see .env.example)`);
  }
  return value;
}

export const config = {
  port: parseInt(process.env.PORT || '3001'),
  nodeEnv: process.env.NODE_ENV || 'development',
  appUrl: process.env.APP_URL || 'http://localhost:5173',
  apiUrl: process.env.API_URL || 'http://localhost:3001',

  mongodb: {
    uri: required('MONGODB_URI'),
  },

  redis: {
    url: required('REDIS_URL'),
  },

  jwt: {
    secret: required('JWT_SECRET'),
    refreshSecret: required('JWT_REFRESH_SECRET'),
    expiry: process.env.JWT_EXPIRY || '15m',
    refreshExpiry: process.env.REFRESH_EXPIRY || '7d',
  },

  oauth: {
    linkedin: {
      clientId: process.env.LINKEDIN_CLIENT_ID || '',
      clientSecret: process.env.LINKEDIN_CLIENT_SECRET || '',
    },
    github: {
      clientId: process.env.GITHUB_CLIENT_ID || '',
      clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
    },
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    },
  },

  sendgrid: {
    apiKey: process.env.SENDGRID_API_KEY || '',
    fromEmail: process.env.FROM_EMAIL || 'noreply@connectsphere.io',
  },

  aws: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    bucket: process.env.S3_BUCKET || 'connectsphere-uploads',
  },

  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY || '',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
  },

  neo4j: {
    uri: process.env.NEO4J_URI || '',
    user: process.env.NEO4J_USER || 'neo4j',
    password: process.env.NEO4J_PASSWORD || '',
  },

  pythonService: {
    url: process.env.PYTHON_AGENT_SERVICE_URL || 'http://localhost:8001',
    internalSecret: required('INTERNAL_SERVICE_SECRET'),
  },

  corsOrigins: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'http://localhost:5176', 'http://localhost:3000'],
};
