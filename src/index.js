#!/usr/bin/env node

import cors from 'cors';
import express from 'express';
import helmet from 'helmet';

import NodeFetchCache, { MemoryCache } from 'node-fetch-cache';
+// ─── Add this line to import BullMQ so we can ping Redis ───────────────────────
+import { Queue } from 'bullmq';

const app = express();
const router = express.Router();
const port = parseInt(process.env.PORT, 10) || 3000;
const fetch = NodeFetchCache.create({
    cache: new MemoryCache({ ttl: 60000 }),
    shouldCacheResponse: (response) => response.ok,
});

// ─── STEP 1: Initialize a Redis-backed queue using Render’s REDIS_URL ───────────
const renderQueue = new Queue('render', {
  connection: {
    connectionString: process.env.REDIS_URL
  }
});

// ─── STEP 2: Add a /healthz endpoint that pings Redis ───────────────────────────
app.get('/healthz', async (req, res) => {
  try {
    const client = await renderQueue.client;
    const pong = await client.ping();
    if (pong === 'PONG') {
      return res.sendStatus(200);    // Redis is alive
    } else {
      return res.status(500).json({ message: 'Redis ping failed' });
    }
  } catch (err) {
    console.error('Health check error:', err);
    return res.status(500).json({
      message: 'Redis health check failed',
      error: err.message
    });
  }
});

router.get(/([di])\/(\w+)\/?(.*)?/, async (req, res, next) => {
    try {
        const regexp = /([di])\/(\w+)\/?(.*)?/;
        const match = req.originalUrl.match(regexp);
        const type = match[1];
        const hash = match[2];
        const path = match[3] ? `path=/${match[3]}&` : '';
        const publicKeyUrl = `https://disk.yandex.ru/${type}/${hash}`;
        const redirectUrl = `https://cloud-api.yandex.net/v1/disk/public/resources/download?${path}public_key=${publicKeyUrl}`;
        const response = await fetch(redirectUrl);
        const result = await response.json();
        if (response.ok) {
            res.redirect(result.href);
        } else {
            res.json(result);
        };
    } catch(e) {
        res.redirect('/');
    };
});

router.all('*', (req, res) => {
    res.redirect('/');
});


app.set('json spaces', 2);
app.set('x-powered-by', false);

app.use(
    cors(),
    helmet({ contentSecurityPolicy: false, xDownloadOptions: false }),
    express.urlencoded({ extended: false }),
    express.json(),
    express.static('./public'),
    router,
);


app.listen(port, () => {
    console.log(`listening at ${port}/tcp`);
});
