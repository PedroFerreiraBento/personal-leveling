// Netlify Function (v2): api-activities
// Persistent storage using Netlify Blobs.
// Routes:
//   POST /api/activities                 -> create general preset
//   POST /api/activities/:userId         -> create personal preset for userId
//   GET  /api/activities                 -> list general presets
//   GET  /api/activities/:userId         -> list personal presets for userId

import { getStore } from '@netlify/blobs';

const STORE_NAME = 'app-data';
const GENERAL_KEY = 'activities-general.json';
function personalKey(userId) { return `activities-personal-${String(userId)}.json`; }

function jsonResponse(status, body, extraHeaders) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...(extraHeaders || {}) },
  });
}

function parsePathname(pathname) {
  // Expecting /.netlify/functions/api-activities or /.netlify/functions/api-activities/<userId>
  const parts = (pathname || '').split('/').filter(Boolean);
  const idx = parts.indexOf('api-activities');
  const userId = idx >= 0 && parts[idx + 1] ? parts[idx + 1] : null;
  return { userId };
}

async function initStore() {
  const isNetlify = !!(process.env.NETLIFY || process.env.AWS_LAMBDA_FUNCTION_NAME);
  if (isNetlify) {
    return getStore({ name: STORE_NAME });
  }
  // Local dev: need siteID/token, typically injected by `netlify dev`
  const siteID = process.env.NETLIFY_SITE_ID || process.env.SITE_ID || process.env.NETLIFY_BLOBS_SITE_ID;
  const token = process.env.NETLIFY_API_TOKEN || process.env.NETLIFY_TOKEN || process.env.NETLIFY_BLOBS_TOKEN;
  if (!siteID || !token) {
    throw new Error('Netlify Blobs not configured. In local dev, set NETLIFY_SITE_ID and NETLIFY_API_TOKEN (or run via `netlify dev`). In production, credentials are auto-injected.');
  }
  return getStore({ name: STORE_NAME, siteID, token });
}

async function readJson(store, key) {
  const data = await store.get(key, { type: 'json' });
  return Array.isArray(data) ? data : [];
}
async function writeJson(store, key, arr) {
  await store.set(key, JSON.stringify(Array.isArray(arr) ? arr : []), { contentType: 'application/json' });
}

export default async function handler(request) {
  const method = request.method.toUpperCase();
  const url = new URL(request.url);
  const { userId } = parsePathname(url.pathname);

  try {
    if (method === 'OPTIONS') {
      // Basic CORS (if needed)
      return new Response('', {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    const store = await initStore();

    if (method === 'GET') {
      if (userId) {
        const list = await readJson(store, personalKey(userId));
        return jsonResponse(200, list);
      } else {
        const list = await readJson(store, GENERAL_KEY);
        return jsonResponse(200, list);
      }
    }

    if (method === 'POST') {
      const bodyText = await request.text();
      let payload;
      try { payload = JSON.parse(bodyText || '{}'); }
      catch { return jsonResponse(400, { error: 'Invalid JSON' }); }

      const nowId = Date.now();
      const visibility = userId ? 'personal' : 'general';
      const created = {
        id: nowId,
        title: String(payload.title || 'Sem título'),
        category: payload.category || '',
        duration: Number(payload.duration) || 0,
        visibility,
        ownerId: userId || null,
        metricsSpec: (payload.metricsSpec && typeof payload.metricsSpec === 'object') ? payload.metricsSpec : null,
        scoring: (payload.scoring && typeof payload.scoring === 'object') ? payload.scoring : null,
      };

      if (visibility === 'general') {
        const current = await readJson(store, GENERAL_KEY);
        current.unshift(created);
        await writeJson(store, GENERAL_KEY, current);
      } else {
        const key = personalKey(userId);
        const current = await readJson(store, key);
        current.unshift(created);
        await writeJson(store, key, current);
      }

      return jsonResponse(201, created);
    }

    if (method === 'PUT') {
      // Update existing preset by id, preserving id and scope.
      const bodyText = await request.text();
      let payload;
      try { payload = JSON.parse(bodyText || '{}'); }
      catch { return jsonResponse(400, { error: 'Invalid JSON' }); }

      const id = Number(payload && payload.id);
      if (!Number.isFinite(id)) return jsonResponse(400, { error: 'Missing id' });

      const visibility = userId ? 'personal' : 'general';
      const key = visibility === 'personal' ? personalKey(userId) : GENERAL_KEY;
      const current = await readJson(store, key);
      const idx = current.findIndex(it => Number(it && it.id) === id);
      if (idx === -1) return jsonResponse(404, { error: 'Not found' });

      const prev = current[idx] || {};
      const updated = {
        id,
        title: String(payload.title ?? prev.title ?? 'Sem título'),
        category: payload.category ?? prev.category ?? '',
        duration: Number(payload.duration ?? prev.duration ?? 0) || 0,
        visibility,
        ownerId: visibility === 'personal' ? (userId || prev.ownerId || null) : null,
        metricsSpec: (payload.metricsSpec && typeof payload.metricsSpec === 'object') ? payload.metricsSpec : (prev.metricsSpec || null),
        scoring: (payload.scoring && typeof payload.scoring === 'object') ? payload.scoring : (prev.scoring || null),
      };
      current[idx] = updated;
      await writeJson(store, key, current);
      return jsonResponse(200, updated);
    }

    if (method === 'DELETE') {
      // Accept id via query (?id=) or JSON body { id }
      let id = null;
      try { id = Number(new URL(request.url).searchParams.get('id')); } catch {}
      if (!Number.isFinite(id)) {
        try {
          const bodyText = await request.text();
          const payload = JSON.parse(bodyText || '{}');
          id = Number(payload && payload.id);
        } catch {}
      }
      if (!Number.isFinite(id)) return jsonResponse(400, { error: 'Missing id' });

      if (userId) {
        const key = personalKey(userId);
        const current = await readJson(store, key);
        const next = current.filter(it => Number(it && it.id) !== id);
        await writeJson(store, key, next);
        return jsonResponse(200, { deleted: true, scope: 'personal', userId, id });
      } else {
        const current = await readJson(store, GENERAL_KEY);
        const next = current.filter(it => Number(it && it.id) !== id);
        await writeJson(store, GENERAL_KEY, next);
        return jsonResponse(200, { deleted: true, scope: 'general', id });
      }
    }

    return jsonResponse(405, { error: 'Method not allowed' });
  } catch (e) {
    return jsonResponse(500, { error: 'Server error', detail: String((e && e.message) || e) });
  }
}
