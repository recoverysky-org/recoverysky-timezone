  // 📁 /src/server.ts
  import dotenv from 'dotenv';
  import express from 'express';
  import path from 'path';
  import { Result, tryResult, isOk, isErr, mapErr } from '../common/utils/RustResult';
  import { convertToTimeZone } from './functions/convertToTimeZone';
  import { initializeTimezoneComplete } from './functions/timezonecomplete-setup';
  import { updateTimezoneData } from './functions/fetchIANA';

  // Load environment variables from .env file
  dotenv.config();

  const app = express();
  app.use(express.json());
  
  /**
   * Gets the correct tzdata path for the current environment
   * @returns string - Path to tzdata directory
   */
  function getTzdataPath(): string {
    // Check if we're running from dist/ directory
    const isRunningFromDist = __dirname.includes('dist');
    
    // In development (ts-node): src/server/tzdata
    // In production/dist: dist/server/tzdata  
    // In docker: /app/dist/server/tzdata (or wherever the app is mounted)
    const baseDir = isRunningFromDist ? 'dist' : 'src';
    return path.join(process.cwd(), baseDir, 'server', 'tzdata');
  }

  // Update timezone data and initialize timezonecomplete on server startup
  (async () => {
    const tzdataPath = getTzdataPath();
    console.log(`🌍 Using tzdata path: ${tzdataPath}`);
    
    // First, update timezone data
    const updateResult = await updateTimezoneData(tzdataPath);
    if (updateResult.ok) {
      console.log('✅ Timezone data updated successfully');
    } else {
      console.error('❌ Failed to update timezone data:', updateResult.error.message);
    }
    
    // Then initialize timezonecomplete
    const initResult = await initializeTimezoneComplete();
    if (initResult.ok) {
      console.log('✅ TimezoneComplete initialized successfully');
    } else {
      console.error('❌ Failed to initialize TimezoneComplete:', initResult.error.message);
    }
  })();
  
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
    const { isoString, fromTimeZone,toTimeZone } = req.body;
    
    // Convert ISO string to UTC
    const conversionResult = await tryResult(async () => await convertToTimeZone(isoString, fromTimeZone, toTimeZone));
    if (!conversionResult.ok) {
      return res.status(400).json({ error: conversionResult.error.message });
    }
    
    return res.json(conversionResult.value);
  });

  app.post('/api/v1/update-tzdata', async (req, res) => {
    const { isoString, timeZone } = req.body;
  
    
    return res.json({ ok: true});
  });
    
  app.listen(3838, () => {
    console.log('⏱️ Timezone conversion API running at http://localhost:3838');
  });
  
  // 🛠️ Usage:
  // POST http://localhost:3838/api/v1/convert-to-utc
  // Body: { "isoString": "2025-07-03T15:00:00-04:00" }
  // Response: { "utc": "2025-07-03T19:00:00Z", "milliseconds": 1741017600000 }
  
  // 🌀 Optional:
  // Schedule the tzdata update via cron or CI/CD pipeline using:
  //    pnpm tz:update
  