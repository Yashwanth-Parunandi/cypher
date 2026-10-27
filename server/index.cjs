#!/usr/bin/env node
/*
  Simple API server exposing POST /api/pinJSON
  - Reads Pinata credentials from environment variables:
      PINATA_API_KEY, PINATA_SECRET_API_KEY
    Fallbacks:
      VITE_PINATA_API_KEY, VITE_PINATA_SECRET_API_KEY
  - PORT env to set port (default 4000)
*/

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const axios = require('axios');

// Load env from project root
dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 4000;

// Middlewares
app.use(cors());
app.use(express.json({ limit: '2mb' }));

const PINATA_API_KEY = process.env.PINATA_API_KEY || process.env.VITE_PINATA_API_KEY;
const PINATA_SECRET_API_KEY = process.env.PINATA_SECRET_API_KEY || process.env.VITE_PINATA_SECRET_API_KEY;

if (!PINATA_API_KEY || !PINATA_SECRET_API_KEY) {
  console.warn('[WARN] Pinata API keys are not set. Set PINATA_API_KEY and PINATA_SECRET_API_KEY in your .env');
}

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// POST /api/pinJSON -> { data: any, options?: object }
app.post('/api/pinJSON', async (req, res) => {
  try {
    if (!PINATA_API_KEY || !PINATA_SECRET_API_KEY) {
      return res.status(500).json({ error: 'Server not configured with Pinata credentials' });
    }

    const { data, options } = req.body || {};
    if (typeof data === 'undefined') {
      return res.status(400).json({ error: 'Missing "data" in request body' });
    }

    const resp = await axios.post(
      'https://api.pinata.cloud/pinning/pinJSONToIPFS',
      {
        pinataContent: data,
        ...(options ? { pinataOptions: options } : {}),
      },
      {
        headers: {
          'Content-Type': 'application/json',
          pinata_api_key: PINATA_API_KEY,
          pinata_secret_api_key: PINATA_SECRET_API_KEY,
        },
        timeout: 60_000,
      }
    );

    // pinata returns IpfsHash
    const { IpfsHash, PinSize, Timestamp } = resp.data || {};
    return res.json({ hash: IpfsHash, size: PinSize, timestamp: Timestamp });
  } catch (err) {
    console.error('Failed to pin JSON:', err?.response?.data || err?.message || err);
    const status = err?.response?.status || 500;
    const payload = err?.response?.data || { error: 'Failed to pin JSON' };
    return res.status(status).json(payload);
  }
});

app.listen(PORT, () => {
  console.log(`API server listening on http://localhost:${PORT}`);
});
