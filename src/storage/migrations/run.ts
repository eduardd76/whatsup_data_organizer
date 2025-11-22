import fs from 'fs';
import path from 'path';
import { database } from '../database';
import { logger } from '../../utils/logger';

async function runMigrations() {
  try {
    await database.connect();

    const migrationsDir = __dirname;
    const files = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    logger.info(`Found ${files.length} migration files`);

    for (const file of files) {
      logger.info(`Running migration: ${file}`);
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      await database.query(sql);
      logger.info(`Completed migration: ${file}`);
    }

    logger.info('All migrations completed successfully');
    await database.disconnect();
    process.exit(0);
  } catch (error) {
    logger.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigrations();
