// 📁 /src/server.ts
import dotenv from 'dotenv';
import express from 'express';
import path from 'path';
import { tryResult } from 'ts-rust-result';
import { convertToTimeZone } from './functions/convertToTimeZone';
import { setupTimezoneData } from './functions/setupTimezoneData';
import { logger } from './logger';
import { getCurrentTzOffset } from './functions/getCurrentTzOffset';
import { getTzToTzOffset } from './functions/getTzToTzOffset';

// Load environment variables from .env file
dotenv.config();

const app = express();
app.use(express.json());

// Middleware for API logging
app.use((req, res, next) => {
  const originalSend = res.send;
  res.send = function (data) {
    logger.api(req.method, req.path, res.statusCode, { ip: req.ip });
    return originalSend.call(this, data);
  };
  next();
});

/**
 * Gets the correct tzdata path for the current environment
 * @returns string - Path to tzdata directory
 */
function getTzdataPath(): string {
  // Use NODE_ENV to determine the correct path
  const baseDir = process.env.NODE_ENV === 'production' ? 'dist' : 'src';
  return path.join(process.cwd(), baseDir, 'server', 'tzdata');
}

// Simple error handler for timezone setup
async function handleTimezoneSetup(): Promise<void> {
  const result = await setupTimezoneData();
  if (!result.ok) {
    logger.error(`Timezone setup failed: ${result.error.message}`);
    return;
  }
  logger.success('Timezone setup completed successfully');
}

/**
 * Convert a ISO string to a specific timezone
 * @param req - The request object
 * @param res - The response object
 * @returns The converted ISO string
 */
app.post('/api/v1/convert-to-tz', async (req, res) => {
  /**
   * @param isoString - (required)The ISO string to convert (note UTC offset is ignored)
   * @param fromTimeZone - (required) The timezone to convert from
   * @param toTimeZone - (required)The timezone to convert to
   * @returns The converted ISO string
   */
  const { isoString, fromTimeZone, toTimeZone } = req.body;

  logger.debug(`Converting ${isoString} from ${fromTimeZone} to ${toTimeZone}`, { ip: req.ip });

  // Convert ISO string to UTC
  const result = await tryResult(async () => await convertToTimeZone(isoString, fromTimeZone, toTimeZone));
  if (!result.ok) {
    logger.error(`Conversion failed: ${result.error.message}`, { ip: req.ip });
    return res.status(400).json(result);
  }

  logger.debug(`Conversion successful: ${JSON.stringify(result.value)}`, { ip: req.ip });
  return res.json(result);
});

app.post('/api/v1/current-tz-offset', async (req, res) => {
  /**
   * @param sourceTimeZone - (required) The source timezone to get offset for
   * @returns The current UTC offset difference between the two timezones
   */
  const { sourceTimeZone } = req.body;

  logger.debug(`Getting current UTC offset from ${sourceTimeZone}`, { ip: req.ip });

  const result = await tryResult(async () => await getCurrentTzOffset(sourceTimeZone))
  if (!result.ok) {
    logger.error(`Current UTC offset failed: ${result.error.message}`, { ip: req.ip });
    return res.status(400).json(result);
  }

  logger.debug(`Current UTC offset successful: ${JSON.stringify(result.value)}`, { ip: req.ip });
  return res.json(result);
});

app.post('/api/v1/tz-to-tz-offset', async (req, res) => {
  /**
   * @param sourceTimeZone - (required) The source timezone to get offset for
   * @param targetTimeZone - (required) The target timezone to get offset for
   * @returns The current UTC offset difference between the two timezones
   */
  const { sourceTimeZone, targetTimeZone } = req.body;

  logger.debug(`Getting current UTC offset from ${sourceTimeZone} to ${targetTimeZone}`, { ip: req.ip });

  const result = await tryResult(async () => await getTzToTzOffset(sourceTimeZone, targetTimeZone))
  if (!result.ok) {
    logger.error(`Current UTC offset failed: ${result.error.message}`, { ip: req.ip });
    return res.status(400).json(result);
  }

  logger.debug(`Current UTC offset successful: ${JSON.stringify(result.value)}`, { ip: req.ip });
  return res.json(result);
});

/**
 * Start the server
 */
export async function startServer(): Promise<void> {
  try {
    console.log('🚀 Starting server...');
    
    // Initial setup on server startup
    console.log('🔄 Starting timezone setup...');
    await handleTimezoneSetup();
    console.log('✅ Timezone setup completed');

    // Set up timer to refresh timezone data every minute
    setInterval(handleTimezoneSetup, 60 * 1000);

    const port = 3838;
    app.listen(port, () => {
      logger.success(`⏱️ Timezone conversion API running at http://localhost:${port}`);
      logger.debug('Debug mode enabled 🌼');
    });
  } catch (error: any) {
    logger.error(`Server crashed: ${error.message}`);
    console.error('💥 Full error:', error);
    throw error; // Re-throw to see the full stack trace
   }
}

