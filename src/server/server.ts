  // 📁 /src/server.ts
  import express from 'express';
  import { Result, tryResult, isOk, isErr, mapErr } from '../common/utils/RustResult';
  import { convertToTimeZone } from './functions/convertToTimeZone';

  
  const app = express();
  app.use(express.json());
  
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
  