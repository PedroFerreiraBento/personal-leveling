// Cloudflare Pages Functions: /api/health

interface Env {
  DB: D1Database;
}

type CFContext = {
  env: Env;
  request: Request;
};

export async function onRequestGet({ env }: CFContext): Promise<Response> {
  try {
    const { results } = await env.DB.prepare("SELECT 1 as ok").all();
    const ok = results && results[0] && results[0].ok === 1;
    return json({ ok });
  } catch (err) {
    return json({ ok: false, error: toMessage(err) }, 500);
  }
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" }
  });
}

function toMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  try { return String(err); } catch { return "unknown error"; }
}


