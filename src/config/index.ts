import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const ConfigSchema = z.object({
  // Server
  nodeEnv: z.enum(['development', 'production', 'test']).default('development'),
  port: z.coerce.number().default(3000),
  logLevel: z.enum(['debug', 'info', 'warn', 'error']).default('info'),

  // WhatsApp
  whatsappMode: z.enum(['official', 'bridge']).default('official'),
  whatsappPhoneNumberId: z.string().optional(),
  whatsappBusinessAccountId: z.string().optional(),
  whatsappAccessToken: z.string().optional(),
  whatsappWebhookVerifyToken: z.string(),
  whatsappAppSecret: z.string().optional(),
  whatsappBridgeApiUrl: z.string().url().optional(),
  whatsappBridgeApiKey: z.string().optional(),

  // Notion
  notionApiKey: z.string(),
  notionDatabaseId: z.string(),

  // AI/LLM
  anthropicApiKey: z.string(),
  openaiApiKey: z.string().optional(),

  // Redis
  redisHost: z.string().default('localhost'),
  redisPort: z.coerce.number().default(6379),
  redisPassword: z.string().optional(),
  redisDb: z.coerce.number().default(0),

  // PostgreSQL
  postgresHost: z.string().default('localhost'),
  postgresPort: z.coerce.number().default(5432),
  postgresDb: z.string().default('whatsapp_intake'),
  postgresUser: z.string().default('postgres'),
  postgresPassword: z.string().default('postgres'),

  // S3/R2
  s3Endpoint: z.string().url(),
  s3Region: z.string().default('us-east-1'),
  s3Bucket: z.string(),
  s3AccessKeyId: z.string(),
  s3SecretAccessKey: z.string(),

  // Processing
  maxRetries: z.coerce.number().default(3),
  retryBackoffMs: z.coerce.number().default(2000),
  jobTimeoutMs: z.coerce.number().default(300000),

  // Admin UI
  adminPort: z.coerce.number().default(3001),
  adminUsername: z.string().default('admin'),
  adminPassword: z.string().default('change_me_in_production'),
});

const rawConfig = {
  // Server
  nodeEnv: process.env.NODE_ENV,
  port: process.env.PORT,
  logLevel: process.env.LOG_LEVEL,

  // WhatsApp
  whatsappMode: process.env.WHATSAPP_MODE,
  whatsappPhoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
  whatsappBusinessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID,
  whatsappAccessToken: process.env.WHATSAPP_ACCESS_TOKEN,
  whatsappWebhookVerifyToken: process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN,
  whatsappAppSecret: process.env.WHATSAPP_APP_SECRET,
  whatsappBridgeApiUrl: process.env.WHATSAPP_BRIDGE_API_URL,
  whatsappBridgeApiKey: process.env.WHATSAPP_BRIDGE_API_KEY,

  // Notion
  notionApiKey: process.env.NOTION_API_KEY,
  notionDatabaseId: process.env.NOTION_DATABASE_ID,

  // AI/LLM
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  openaiApiKey: process.env.OPENAI_API_KEY,

  // Redis
  redisHost: process.env.REDIS_HOST,
  redisPort: process.env.REDIS_PORT,
  redisPassword: process.env.REDIS_PASSWORD,
  redisDb: process.env.REDIS_DB,

  // PostgreSQL
  postgresHost: process.env.POSTGRES_HOST,
  postgresPort: process.env.POSTGRES_PORT,
  postgresDb: process.env.POSTGRES_DB,
  postgresUser: process.env.POSTGRES_USER,
  postgresPassword: process.env.POSTGRES_PASSWORD,

  // S3/R2
  s3Endpoint: process.env.S3_ENDPOINT,
  s3Region: process.env.S3_REGION,
  s3Bucket: process.env.S3_BUCKET,
  s3AccessKeyId: process.env.S3_ACCESS_KEY_ID,
  s3SecretAccessKey: process.env.S3_SECRET_ACCESS_KEY,

  // Processing
  maxRetries: process.env.MAX_RETRIES,
  retryBackoffMs: process.env.RETRY_BACKOFF_MS,
  jobTimeoutMs: process.env.JOB_TIMEOUT_MS,

  // Admin UI
  adminPort: process.env.ADMIN_PORT,
  adminUsername: process.env.ADMIN_USERNAME,
  adminPassword: process.env.ADMIN_PASSWORD,
};

export const config = ConfigSchema.parse(rawConfig);

export function validateConfig(): void {
  try {
    ConfigSchema.parse(rawConfig);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Configuration validation failed:');
      error.errors.forEach((err) => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`);
      });
      process.exit(1);
    }
    throw error;
  }
}
