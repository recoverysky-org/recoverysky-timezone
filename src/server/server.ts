  // 📁 /src/server.ts
  import express from 'express';
  import { DateTime } from 'timezonecomplete';
  
  const app = express();
  app.use(express.json());
  
  app.post('/api/v1/convert-to-utc', (req, res) => {
    try {
      const { dateTime, timeZone } = req.body;
      if (!dateTime || !timeZone) {
        return res.status(400).json({ error: 'Missing dateTime or timeZone in body' });
      }
  
      const localTime = new DateTime(dateTime, timeZone);
      const utcTime = localTime.toUtcString();
  
      return res.json({ utc: utcTime });
    } catch (err) {
      return res.status(400).json({ error: (err as Error).message });
    }
  });
  
  app.listen(3838, () => {
    console.log('⏱️ Timezone conversion API running at http://localhost:3000');
  });
  
  // 🛠️ Usage:
  // POST http://localhost:3000/convert-to-utc
  // Body: { "dateTime": "2025-07-03T15:00", "timeZone": "America/New_York" }
  // Response: { "utc": "2025-07-03T19:00:00Z" }
  
  // 🌀 Optional:
  // Schedule the tzdata update via cron or CI/CD pipeline using:
  //    pnpm tz:update
  