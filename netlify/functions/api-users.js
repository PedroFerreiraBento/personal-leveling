// Netlify Function (v2): Users API using Netlify Blobs (single-array model)
// Methods:
// - GET /api/users -> list all users
// - POST /api/users -> create user (expects full user object; server checks email uniqueness)
// - PUT /api/users/:id -> replace user
// - PATCH /api/users/:id -> partial update
// - DELETE /api/users/:id -> delete user

import { getStore } from "@netlify/blobs";

const STORE_NAME = "app-data";
const USERS_KEY = "users.json";

function jsonResponse(status, data) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function readUsers(store) {
  const arr = await store.get(USERS_KEY, { type: "json" });
  return Array.isArray(arr) ? arr : [];
}
async function writeUsers(store, users) {
  await store.set(USERS_KEY, JSON.stringify(users));
}

export default async function handler(request, context) {
  try {
    // In Netlify Functions v2, Blobs credentials are injected automatically in production.
    const isNetlify = !!(
      process.env.NETLIFY || process.env.AWS_LAMBDA_FUNCTION_NAME
    );

    let store;
    if (isNetlify) {
      // Use implicit credentials
      store = getStore({ name: STORE_NAME });
    } else {
      // Local development fallback: require siteID/token via env or `.env` with `netlify dev`
      const siteID =
        process.env.NETLIFY_SITE_ID ||
        process.env.SITE_ID ||
        process.env.NETLIFY_BLOBS_SITE_ID;
      const token =
        process.env.NETLIFY_API_TOKEN ||
        process.env.NETLIFY_TOKEN ||
        process.env.NETLIFY_BLOBS_TOKEN;
      if (!siteID || !token) {
        throw new Error(
          "Netlify Blobs not configured. In local dev, set NETLIFY_SITE_ID and NETLIFY_API_TOKEN (or run via `netlify dev`). In production, credentials are auto-injected."
        );
      }
      console.log("Using Netlify Blobs with siteID:", siteID);
      store = getStore({ name: STORE_NAME, siteID, token });
    }

    const method = request.method.toUpperCase();
    const url = new URL(request.url);
    const parts = url.pathname.split("/").filter(Boolean);
    const fnIndex = parts.lastIndexOf("api-users");
    const maybeId =
      fnIndex >= 0 && parts.length > fnIndex + 1 ? parts[fnIndex + 1] : null;

    if (method === "GET" && !maybeId) {
      const users = await readUsers(store);
      return jsonResponse(200, users);
    }

    if (method === "POST" && !maybeId) {
      const bodyText = await request.text();
      if (!bodyText) return jsonResponse(400, { error: "Missing body" });
      let payload;
      try {
        payload = JSON.parse(bodyText);
      } catch {
        return jsonResponse(400, { error: "Invalid JSON" });
      }
      const users = await readUsers(store);
      const em = String(payload.email || "")
        .trim()
        .toLowerCase();
      if (!em) return jsonResponse(400, { error: "Email obrigatório" });
      if (users.some((u) => String(u.email || "").toLowerCase() === em)) {
        return jsonResponse(409, { error: "Email já cadastrado" });
      }
      const user = { ...payload, email: em };
      users.push(user);
      await writeUsers(store, users);
      return jsonResponse(201, user);
    }

    if (
      (method === "PUT" || method === "PATCH" || method === "DELETE") &&
      maybeId
    ) {
      const users = await readUsers(store);
      const idx = users.findIndex((u) => String(u.id) === String(maybeId));
      if (idx === -1)
        return jsonResponse(404, { error: "Usuário não encontrado" });

      if (method === "DELETE") {
        users.splice(idx, 1);
        await writeUsers(store, users);
        return jsonResponse(204, {});
      }

      const bodyText = await request.text();
      if (!bodyText) return jsonResponse(400, { error: "Missing body" });
      let payload;
      try {
        payload = JSON.parse(bodyText);
      } catch {
        return jsonResponse(400, { error: "Invalid JSON" });
      }

      if (method === "PUT") {
        users[idx] = { ...payload, id: users[idx].id };
      } else {
        users[idx] = { ...users[idx], ...payload };
      }
      await writeUsers(store, users);
      return jsonResponse(200, users[idx]);
    }

    return jsonResponse(405, { error: "Method Not Allowed" });
  } catch (e) {
    return jsonResponse(500, {
      error: "Internal Error",
      detail: String((e && e.message) || e),
    });
  }
}
