# Arquitetura

Este documento resume a arquitetura atual do projeto e como os serviços interagem.

## Serviços

- Frontend (`web`): React 18 + Vite, servido por Nginx (porta interna 80). Fonte em `frontend/`.
- API (`api`): Node.js + Express, exposta internamente na porta 3001. Fonte em `backend/`.
- Banco (`postgres`): PostgreSQL com volume persistente em `./data/postgres`.
- Proxy/HTTPS (`caddy`): Termina TLS (Let’s Encrypt) e faz reverse proxy para `web` e `api`.

## Rede e Roteamento

- Caddy publica as portas 80/443 no host.
- Regras:
  - `/{anything not starting with /api}` → `web:80` (SPA)
  - `/api/*` → `api:3001`
- O container `web` não expõe portas no host; apenas Caddy é público.

## Fluxo de Dados

1. Usuário acessa `https://<SITE_DOMAIN>`.
2. Caddy encerra TLS e proxy para `web` (Nginx) para recursos estáticos/SPA.
3. Chamadas REST do frontend para `/api/*` são roteadas por Caddy → `api:3001`.
4. A API acessa PostgreSQL via rede Docker.

## Variáveis de Ambiente

Arquivo `.env` no diretório raiz do servidor (carregado pelo Compose):

- Banco: `PGDATABASE`, `PGUSER`, `PGPASSWORD`
- Domínio: `SITE_DOMAIN` (ex.: `personal-leveling.run.place`)
- URLs públicas:
  - `PUBLIC_API_URL` (ex.: `https://personal-leveling.run.place/api`) — injetada no build do frontend como `VITE_API_URL`
  - `FRONTEND_URL` (ex.: `https://personal-leveling.run.place`)

## DNS e Certificados

- DNS:
  - `A` para `<SITE_DOMAIN>` → IP da VM
  - `CNAME` para `www.<SITE_DOMAIN>` → `<SITE_DOMAIN>` (ou `A` para o mesmo IP)
- Caddy obtém certificados automaticamente (HTTP-01). Garanta portas 80/443 abertas.

## CI/CD (GitHub Actions)

- Workflow: `.github/workflows/deploy.yml`
- Passos remotos via SSH:
  - Atualiza repositório no servidor
  - `docker compose pull postgres api web caddy`
  - `docker compose build api web`
  - `docker compose up -d postgres api web caddy`

## Desenvolvimento Local

- `docker-compose.yml` provê `postgres`, `api`, `web`, `caddy`.
- Vite dev server também pode ser usado localmente (porta 5173) com proxy para `api` conforme `frontend/vite.config.js`.

## Observabilidade e Troubleshooting

- Logs:
  - `docker compose logs --tail=200 caddy|web|api|postgres`
- Saúde:
  - API: `GET /api/health`
- Problemas comuns:
  - Certificado: verifique DNS, portas 80/443, variável `SITE_DOMAIN` e logs do Caddy
  - Build frontend em VM pequena: configurar swap (2GB)
