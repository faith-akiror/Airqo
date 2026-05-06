import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // API Routes
  app.get('/api/airquality', async (req, res) => {
    try {
      const { tenant = 'airqo', startTime, endTime, site_id } = req.query;
      const AIRQO_API_KEY = process.env.AIRQO_API_KEY;

      const params: any = { tenant };
      if (AIRQO_API_KEY) params.token = AIRQO_API_KEY;
      if (startTime) params.startTime = startTime;
      if (endTime) params.endTime = endTime;
      if (site_id) params.site_id = site_id;

      // Use 'recent' endpoint if no time range provided
      const endpoint = (startTime && endTime) 
        ? 'https://api.airqo.net/api/v2/devices/measurements'
        : 'https://api.airqo.net/api/v2/devices/measurements/recent';

      console.log(`[Proxy] AirQo API Call: ${endpoint}`, { ...params, token: '***' });

      const response = await axios.get(endpoint, { 
        params,
        // Remove Bearer for now as token param is usually preferred for AirQo
      });
      res.json(response.data);
    } catch (error: any) {
      console.error('[Proxy Error] AirQo API Status:', error.response?.status);
      console.error('[Proxy Error] AirQo API Data:', JSON.stringify(error.response?.data, null, 2));
      res.status(error.response?.status || 500).json({ 
        error: error.message,
        details: error.response?.data 
      });
    }
  });

  app.get('/api/grids', async (req, res) => {
    try {
      const { tenant = 'airqo' } = req.query;
      const AIRQO_API_KEY = process.env.AIRQO_API_KEY;

      const params: any = { tenant };
      if (AIRQO_API_KEY) params.token = AIRQO_API_KEY;

      console.log(`[Proxy] AirQo Sites Call`, { ...params, token: '***' });

      // Try sites endpoint - it's more reliable for getting sensor locations
      const response = await axios.get('https://api.airqo.net/api/v2/devices/sites', {
        params
      });
      res.json(response.data);
    } catch (error: any) {
      console.error('[Proxy Error] AirQo Sites API Status:', error.response?.status);
      res.status(error.response?.status || 500).json({ 
        error: error.message,
        details: error.response?.data
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
