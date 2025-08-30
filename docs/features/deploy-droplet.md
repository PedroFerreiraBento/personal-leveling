# Deploy em Droplet (Docker Compose + GitHub Actions)

Guia de deploy do projeto em um Droplet (Ubuntu/Debian) usando Docker Compose e o workflow `.github/workflows/deploy.yml`.

## Requisitos no servidor

- Docker e Docker Compose instalados
- Usuário com acesso ao diretório do app (ex.: `/home/deploy/personal-leveling`)
- Arquivo `.env` no diretório do app com variáveis:
  - Banco: `PGDATABASE`, `PGUSER`, `PGPASSWORD`
  - Domínio: `SITE_DOMAIN` (ex.: `personal-leveling.run.place`)
  - URLs públicas: `PUBLIC_API_URL` (ex.: `https://personal-leveling.run.place/api`), `FRONTEND_URL` (ex.: `https://personal-leveling.run.place`)

Exemplo `.env`:

```dotenv
PGDATABASE=personal_leveling
PGUSER=postgres
PGPASSWORD=<senha>
SITE_DOMAIN=personal-leveling.run.place
PUBLIC_API_URL=https://personal-leveling.run.place/api
FRONTEND_URL=https://personal-leveling.run.place
```

## DNS e portas

- Registros DNS:
  - `A` para `personal-leveling.run.place` → IP da VM
  - `CNAME` para `www.personal-leveling.run.place` → `personal-leveling.run.place` (ou `A` para o mesmo IP)
- Firewall/UFW/Cloud: portas 80 e 443 liberadas. A porta 80 é necessária para validação ACME HTTP-01 (Let’s Encrypt).

## Swap (evita OOM no build do frontend)

Em Droplets pequenos, o build do frontend pode consumir memória e falhar. Crie 2GB de swap para evitar OOM.

```bash
sudo fallocate -l 2G /swapfile || sudo dd if=/dev/zero of=/swapfile bs=1M count=2048
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile swap swap defaults 0 0' | sudo tee -a /etc/fstab
sudo sysctl vm.swappiness=10
echo 'vm.swappiness=10' | sudo tee -a /etc/sysctl.conf
```
Validar:

```bash
swapon --show
free -h
```

## Sudo/Docker (não interativo)

O workflow usa `sudo -n docker` somente se necessário. Configure uma destas opções para evitar prompts de senha:

- Opção A (recomendada): adicionar o usuário ao grupo `docker`:

```bash
sudo usermod -aG docker $USER
newgrp docker
sudo systemctl enable docker
sudo systemctl start docker
```
Faça logout/login para aplicar o grupo.

- Opção B: permitir `NOPASSWD` apenas para docker:

```bash
sudo visudo
# Adicione (troque deploy pelo seu usuário):
deploy ALL=(ALL) NOPASSWD: /usr/bin/docker, /usr/bin/docker-compose
```

## Como o workflow de deploy funciona

Arquivo: `/.github/workflows/deploy.yml`

- Valida segredos: `SSH_PRIVATE_KEY`, `DROPLET_HOST`, `DROPLET_USER`, `DROPLET_APP_DIR` (opcional `SSH_PASSPHRASE`).
- Conecta via SSH e:
  - Clona/atualiza o repo no `APP_DIR`.
  - Verifica Docker; usa `docker` ou `sudo -n docker`.
  - Composição: `docker-compose.yml` com serviços `postgres`, `api`, `web`, `caddy`.
  - Executa:
    - `pull postgres api web caddy` (best effort)
    - `build api web`
    - `up -d postgres api web caddy`
  - Mostra `compose ps` no final.

Observações:
- `caddy` termina TLS e faz proxy:
  - `/api/*` → `api:3001`
  - demais rotas → `web:80`
- O build do `web` injeta `VITE_API_URL` via `PUBLIC_API_URL` do `.env`.
- O `web` não publica portas no host; quem publica 80/443 é o `caddy`.

## Otimizações do build do frontend

Arquivo: `frontend/Dockerfile`
- `ENV NODE_OPTIONS=--max-old-space-size=256`
- `npm ci --no-audit --no-fund` ou equivalente

## Rodando o deploy

- Faça push na branch `main` ou dispare manualmente o workflow “Deploy to Droplet”.
- Em caso de falha no `build web` ou `api`, verifique:
  - Swap configurado e ativo
  - `PUBLIC_API_URL` e `SITE_DOMAIN` definidos no `.env`
  - Acesso ao Docker sem senha (grupo `docker` ou `NOPASSWD`)

## Troubleshooting rápido

- Ver logs dos serviços no servidor:

```bash
cd /home/deploy/personal-leveling
docker compose -f docker-compose.yml logs --tail=200 caddy
docker compose -f docker-compose.yml logs --tail=200 web
docker compose -f docker-compose.yml logs --tail=200 api
docker compose -f docker-compose.yml logs --tail=200 postgres
```
- Ver status:

```bash
docker compose -f docker-compose.yml ps
```
