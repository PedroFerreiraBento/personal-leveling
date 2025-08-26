# Deploy em Droplet (Docker Compose + GitHub Actions)

Este guia documenta o deploy do projeto em um Droplet (Ubuntu/Debian) usando Docker Compose e o workflow `.github/workflows/deploy.yml`.

## Requisitos no servidor

- Docker e Docker Compose instalados
- Usuário com acesso ao diretório do app (ex.: `/home/deploy/personal-leveling`)
- Arquivo `.env` no diretório do app com variáveis:
  - `PGDATABASE`, `PGUSER`, `PGPASSWORD`
  - `PUBLIC_API_URL` (usado no build do frontend como `VITE_API_URL`)
  - Opcional: `FRONTEND_URL`

Exemplo `.env`:
```
PGDATABASE=personal_leveling
PGUSER=postgres
PGPASSWORD=<senha>
PUBLIC_API_URL=https://personal-leveling.run.place/api
```

## Swap (evita OOM no build do frontend)

Em Droplets pequenos, o build do frontend pode consumir memória e falhar sem logs claros. Crie 2GB de swap para evitar OOM.

Comandos:
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
Faça logout/login da sessão para aplicar o grupo.

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
  - Usa somente `docker-compose.yml` e só os serviços `postgres` e `web`.
  - Executa: `pull postgres web` (best effort), `build web`, `up -d postgres web`.
  - Mostra `compose ps` no final.

Observações:
- O serviço `web` não depende mais do `api`. O deploy foca apenas em `postgres` + `web`.
- O build do `web` injeta `VITE_API_URL` via `PUBLIC_API_URL` do `.env`.

## Otimizações do build do frontend

Arquivo: `frontend/Dockerfile`
- `ENV NODE_OPTIONS=--max-old-space-size=256` para limitar o heap do Node.
- `npm ci --no-audit --no-fund` (ou `npm install` com as mesmas flags) para reduzir overhead.

## Rodando o deploy

- Faça um push na branch `main` ou dispare manualmente o workflow “Deploy to Droplet”.
- Em caso de falha no `build web`, verifique:
  - Swap configurado e ativo
  - `PUBLIC_API_URL` definido no `.env`
  - Acesso ao Docker sem senha (grupo `docker` ou `NOPASSWD`)

## Troubleshooting rápido

- Ver logs dos serviços no servidor:
```bash
cd /home/deploy/personal-leveling
docker compose -f docker-compose.yml logs --tail=200 web
docker compose -f docker-compose.yml logs --tail=200 postgres
```
- Ver status:
```bash
docker compose -f docker-compose.yml ps
```
