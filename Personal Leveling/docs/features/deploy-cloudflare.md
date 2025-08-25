# Deploy: Cloudflare Pages + D1

Objetivo: frontend estático + API via Pages Functions com D1 (SQLite serverless), sem armazenar dados de aplicação no `localStorage`. Apenas sessão do usuário pode existir localmente.

## Pré‑requisitos

- Conta Cloudflare com Pages e D1 habilitados
- Node.js 18+
- Wrangler CLI

```bash
npm i -D wrangler
```

## Configuração

1. Criar banco D1 (dev/prod):

```bash
npx wrangler d1 create plv-db
```

2. Preencher `wrangler.toml` com o binding do D1 (anote o `database_id`).

```toml
name = "personal-leveling"
compatibility_date = "2024-09-01"

[[d1_databases]]
binding = "DB"
database_name = "plv-db"
# database_id = "<preencher>"
```

3. Migrações (local):

```bash
npx wrangler d1 migrations apply plv-db --local --database db/.wrangler/local.sqlite
```

Por padrão, `--local` usa um banco em memória. O parâmetro `--database` é opcional.

4. Rodar local (Pages + Functions):

```bash
npx wrangler pages dev . --port=5500
```

Abrir `http://127.0.0.1:5500`.

## API mínima: /api/activities

- GET `/api/activities?user_id=<id>&limit=100`
- POST `/api/activities` com JSON:

```json
{
  "user_id": "u1",
  "title": "Leitura",
  "category": "knowledge",
  "duration_minutes": 45,
  "timestamp": 1732300000000
}
```

Responses: JSON, status apropriado (200/201/400/500).

## API: /api/tasks

- GET `/api/tasks?user_id=<id>&type=daily&status=open&limit=100`
- POST `/api/tasks` com JSON:

```json
{
  "user_id": "u1",
  "type": "daily",
  "title": "Planejar dia",
  "status": "open",
  "reward_xp": 10
}
```

- PATCH `/api/tasks` com JSON (atualização parcial):

```json
{
  "id": "<task-id>",
  "user_id": "u1",
  "status": "done"
}
```

## Healthcheck

- GET `/api/health` → `{ ok: true }` se o D1 estiver acessível.

## Deploy (Cloudflare Pages)

1. Conectar o repositório ao Pages (build: none). Functions em `functions/` são detectadas automaticamente.
2. Configurar Environment Variables e D1 binding na aba Settings do projeto Pages.
3. Aplicar migrações em produção:

```bash
npx wrangler d1 migrations apply plv-db
```

## Modelo de dados

- Dados de aplicação residem exclusivamente no D1. O cliente não deve persistir entidades (activities/tasks) no `localStorage`. Caso haja sessão local, usar storage apenas para token/identificador de sessão (fases com autenticação).

## Operação

- Logs em tempo real:

```bash
npx wrangler tail
```

- Healthcheck: crie `/api/health` consultando `SELECT 1` (opcional).


