// Cloudflare Pages Functions: /api/activities
// Methods: GET (list by user_id), POST (create)

interface Env {
  DB: D1Database;
}

type CFContext = {
  env: Env;
  request: Request;
};

export async function onRequestGet({ env, request }: CFContext): Promise<Response> {
  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get("user_id");
    const limitParam = url.searchParams.get("limit");
    const limit = Math.max(1, Math.min(Number(limitParam || 100), 500));

    if (!userId) {
      return json({ error: "user_id is required" }, 400);
    }

    const stmt = env.DB.prepare(
      `SELECT id, user_id, title, category, duration_minutes, timestamp
       FROM activities
       WHERE user_id = ?
       ORDER BY timestamp DESC
       LIMIT ?`
    ).bind(userId, limit);

    const { results } = await stmt.all();
    return json({ data: results });
  } catch (err) {
    return json({ error: toMessage(err) }, 500);
  }
}

export async function onRequestPost({ env, request }: CFContext): Promise<Response> {
  try {
    const payload = await request.json();
    const id: string = payload.id || crypto.randomUUID();
    const userId: string = payload.user_id;
    const title: string = String(payload.title || "").trim();
    const category: string | null = payload.category ? String(payload.category) : null;
    const durationMinutes: number = Number(payload.duration_minutes);
    const timestamp: number = Number(payload.timestamp || Date.now());

    if (!userId || !title || !Number.isFinite(durationMinutes) || durationMinutes <= 0) {
      return json({ error: "user_id, title and positive duration_minutes are required" }, 400);
    }

    const insert = env.DB.prepare(
      `INSERT INTO activities (id, user_id, title, category, duration_minutes, timestamp)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).bind(id, userId, title, category, durationMinutes, timestamp);

    await insert.run();
    return json({ data: { id, user_id: userId, title, category, duration_minutes: durationMinutes, timestamp } }, 201);
  } catch (err) {
    return json({ error: toMessage(err) }, 500);
  }
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}

function toMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  try { return String(err); } catch { return "unknown error"; }
}


