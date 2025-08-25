// Cloudflare Pages Functions: /api/tasks
// Methods: GET (list by user_id), POST (create), PATCH (update fields)

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
    const type = url.searchParams.get("type");
    const status = url.searchParams.get("status");
    const limitParam = url.searchParams.get("limit");
    const limit = Math.max(1, Math.min(Number(limitParam || 100), 500));

    if (!userId) {
      return json({ error: "user_id is required" }, 400);
    }

    const conditions: string[] = ["user_id = ?"]; const binds: unknown[] = [userId];
    if (type) { conditions.push("type = ?"); binds.push(type); }
    if (status) { conditions.push("status = ?"); binds.push(status); }

    const sql = `SELECT id, user_id, type, title, status, reward_xp, updated_at
                 FROM tasks
                 WHERE ${conditions.join(" AND ")}
                 ORDER BY updated_at DESC
                 LIMIT ?`;
    binds.push(limit);

    const stmt = env.DB.prepare(sql).bind(...binds);
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
    const type: string = String(payload.type || "").trim();
    const title: string = String(payload.title || "").trim();
    const status: string = String(payload.status || "open");
    const rewardXp: number = Number(payload.reward_xp || 0);
    const updatedAt: number = Number(payload.updated_at || Date.now());

    if (!userId || !type || !title) {
      return json({ error: "user_id, type and title are required" }, 400);
    }

    const insert = env.DB.prepare(
      `INSERT INTO tasks (id, user_id, type, title, status, reward_xp, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).bind(id, userId, type, title, status, rewardXp, updatedAt);

    await insert.run();
    return json({ data: { id, user_id: userId, type, title, status, reward_xp: rewardXp, updated_at: updatedAt } }, 201);
  } catch (err) {
    return json({ error: toMessage(err) }, 500);
  }
}

export async function onRequestPatch({ env, request }: CFContext): Promise<Response> {
  try {
    const payload = await request.json();
    const id: string = String(payload.id || "").trim();
    const userId: string = String(payload.user_id || "").trim();
    if (!id || !userId) {
      return json({ error: "id and user_id are required" }, 400);
    }

    const fields: string[] = [];
    const binds: unknown[] = [];

    if (payload.title !== undefined) { fields.push("title = ?"); binds.push(String(payload.title)); }
    if (payload.status !== undefined) { fields.push("status = ?"); binds.push(String(payload.status)); }
    if (payload.reward_xp !== undefined) { fields.push("reward_xp = ?"); binds.push(Number(payload.reward_xp)); }

    // always bump updated_at
    fields.push("updated_at = ?"); binds.push(Date.now());

    if (fields.length === 1) {
      return json({ error: "No fields to update" }, 400);
    }

    const sql = `UPDATE tasks SET ${fields.join(", ")} WHERE id = ? AND user_id = ?`;
    binds.push(id, userId);

    const result = await env.DB.prepare(sql).bind(...binds).run();
    if (result.success && (result.meta?.rows_written ?? 0) > 0) {
      return json({ ok: true });
    }
    return json({ error: "Task not found" }, 404);
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


