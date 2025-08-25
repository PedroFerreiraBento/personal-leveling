# Feature: Autenticação (Login/Cadastro)

Objetivo: introduzir um fluxo simples de autenticação no front-end (sem backend) para gatear o acesso ao app. A nova `index.html` será a tela de login/cadastro; o app atual foi movido para `app.html` na raiz.

## Escopo

- Criar nova `index.html` como página de autenticação com tabs ou toggle para "Entrar" e "Cadastrar".
- Mover o conteúdo atual de `index.html` (app) para `app.html` na raiz para manter caminhos atuais de assets.
- Persistência client-side via `localStorage`:
  - Tabela `app:users` (array de usuários) com `{ id, username, email, passHash, salt, createdAt }`.
  - Sessão atual em `app:session` com `{ userId, issuedAt }`.
  - Hash de senha no cliente (Web Crypto API: SHA-256 de `salt + password`).
- Fluxos:
  - Cadastro: valida campos → gera salt → calcula hash → salva em `app:users` (bloquear emails duplicados) → cria sessão → redireciona para `app.html`.
  - Login: busca usuário por email → calcula hash e compara → cria sessão → redireciona para `app.html`.
  - Logout: botão no app que limpa `app:session` e redireciona para `index.html`.
- Proteção básica de rota: `app.html` verifica sessão; se ausente, redireciona para `index.html`.
- i18n: textos PT/EN alinhados ao sistema atual.
- A11y: labels, `aria-*`, foco e navegação por teclado.

## Não Escopo (v1)

- Sem backend/servidor nem recuperação de senha real.
- Segurança limitada (client-side). Não armazenar dados sensíveis; incluir aviso no README.

## Critérios de Pronto (DoD)

- `index.html` exibe login/cadastro com validação mínima e estados de erro acessíveis.
- Cadastro e login criam/validam sessão em `localStorage` conforme especificação.
- `app.html` carrega somente com sessão válida; caso contrário, redireciona.
- Logout funcional a partir do app (ex.: no menu/header).
- i18n para labels, placeholders e mensagens (PT/EN) integrado ao `App.ui`.
- Manifest e SW continuam operando; `start_url` mantém `/index.html`.
- Documentação: seção curta em `README.md` sobre limitações de segurança e uso.

## Integrações no Código

- `assets/scripts/main.js` e `assets/scripts/auth.js`:
  - Funções: `hash()`, `getUsers()`, `saveUser()`, `login()`, `logout()`, `getSession()`, `requireAuth()`.
  - Em `app.html`, chamar `App.auth.requireAuth()` no boot.
  - Listener de logout (ex.: `#logoutBtn`).
- Arquivos:
  - `assets/scripts/auth.js` (utilitários de autenticação).
  - `assets/styles/auth.css` (layout simples, reusando tokens/componentes existentes).

## Estrutura de Arquivos

- `index.html` → Login/Cadastro.
- `app.html` (raiz) → App principal.
- `assets/scripts/auth.js` → autenticação.
- `assets/styles/auth.css` → estilos da página de auth.

## Migração e Roteamento

- Mover o conteúdo do `index.html` atual para `app.html` mantendo paths relativos.
- Atualizar quaisquer links internos que assumam `index.html` como app.
- `manifest.json`: manter `start_url` como `/index.html` (login). PWA deve abrir no login quando sem sessão.

## QA Rápido

- Cadastro novo usuário → redireciona e mantém sessão após reload do `app.html`.
- Login com credenciais corretas → redireciona, sem erros no console.
- Login inválido → mensagem de erro clara, foco no campo.
- Logout → volta para `index.html` e sessão limpa.
- PWA instalado → comportamento consistente (abre login se sem sessão; abre app se já houver sessão persistida).

## Riscos e Mitigações

- Segurança client-side: incluir aviso no README e banner discreto na página de login.
- Colisão de emails: validar unicidade ao cadastrar.
- Hashing no browser: usar Web Crypto API com `SubtleCrypto.digest` (fallback simples se indisponível, com aviso).
