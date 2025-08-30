# Documentação do Projeto

Este diretório centraliza a documentação técnica do projeto.

## Conteúdo

- Arquitetura e fluxos
- Guias de deploy e operações
- Decisões e trade-offs

## Stack e Arquitetura (resumo)

- Frontend: React 18 + Vite (`frontend/`), servido por Nginx no container `web` e publicado pelo Caddy com TLS.
- Backend: Node.js + Express (`backend/`), container `api` exposto internamente na rede Docker.
- Banco: PostgreSQL (`postgres`), persistência em `./data/postgres`.
- Proxy/HTTPS: Caddy (`caddy`) termina TLS (Let’s Encrypt) e roteia `/api/*` → `api:3001`, demais rotas → `web:80`.

Detalhes completos em `docs/ARCHITECTURE.md`.

## Padrões de Documentação

- Cada feature relevante deve possuir um documento em `docs/features/` descrevendo:
  - Objetivo e escopo
  - Modelo de dados
  - Fluxos de usuário e estados
  - Considerações de UI/UX e acessibilidade

## Convenções

- Comentários no código devem explicar o "porquê" das decisões.
- Atualize este diretório sempre que houver decisões arquiteturais relevantes.
