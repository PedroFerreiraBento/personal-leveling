# Diretriz de Código e Trabalho do Agente de IA

Este documento estabelece como o "agente" de IA deve trabalhar na construção do código e na compreensão do contexto do projeto.

## Princípios

1. Contexto primeiro: Antes de alterar qualquer código, ler os documentos relevantes em `docs/` e os comentários no código.
2. Menor surpresa: Manter APIs internas simples, coesas e previsíveis. Não introduzir dependências desnecessárias.
3. Código autoexplicativo: Preferir nomes claros e comentários sucintos. Documentar decisões arquiteturais em `docs/`.
4. Reprodutibilidade: Garantir que o projeto funcione abrindo `index.html` e, preferencialmente, via um servidor estático simples.
5. Evolução incremental: Para mudanças grandes, fatiar em PRs/commits pequenos com escopo claro.

## Processo do Agente

- Ler `README.md` (raiz) e `docs/README.md` para visão geral.
- Para uma feature:
  - Verificar se existe pasta e documentação específica em `docs/<feature>` ou um documento em `docs/features`.
  - Se não houver, usar o template `docs/templates/FEATURE_GUIDE.md` para criar documentação inicial e só então codificar.
- Antes de editar arquivos:
  - Identificar pontos de extensão em `index.html`, `assets/scripts/main.js` e `assets/styles/main.css`.
  - Procurar comentários com `// TODO` e `/* TODO */`.
- Testar localmente abrindo `index.html`. Se a feature depender de `fetch` a arquivos locais, usar um servidor estático.

## Deploy e Publicação (Render)

- **Backend**: Web Service com Node.js/Express
- **Frontend**: Static Site com build do Vite
- **Database**: PostgreSQL gerenciado pelo Render
- **URLs de produção**: Configuradas no Render Dashboard

### Comandos de Desenvolvimento Local

```bash
# Instalar dependências
npm run install:all

# Rodar ambos os serviços
npm run dev

# Rodar individualmente
npm run dev:backend  # porta 3001
npm run dev:frontend # porta 5173

# Migrações do banco
cd backend && npm run migrate
```

### Deploy no Render

1. **PostgreSQL Database**: Criar via Render Dashboard
2. **Backend API**: Web Service com Node.js
3. **Frontend**: Static Site com build do Vite

Ver guia completo em: [`docs/features/deploy-render.md`](docs/features/deploy-render.md)

## Padrões de Código

### Backend (Node.js/Express)
- **Estrutura**: Modular com separação de rotas, middleware e configurações
- **Banco de dados**: PostgreSQL com migrations versionadas
- **Autenticação**: JWT (implementação futura)
- **Validação**: Middleware de validação de dados
- **Logs**: Estruturados e centralizados
- **Erros**: Tratamento consistente com códigos HTTP apropriados

### Frontend (React)
- **Componentes**: Funcionais com hooks
- **Estado**: Context API para estado global, useState para local
- **Roteamento**: React Router para navegação
- **Estilos**: CSS modules ou styled-components
- **API**: Axios para comunicação com backend
- **Validação**: Formulários com validação client-side

### Banco de Dados (PostgreSQL)
- **Schema**: Migrations versionadas
- **Constraints**: Validações no nível do banco
- **Índices**: Para performance de queries
- **Triggers**: Para campos automáticos (updated_at)

### Estrutura de Componentes React

Para maximizar reuso e clareza, os componentes React estão organizados em `frontend/src/components/`:

- **Componentes de UI**: Reutilizáveis e independentes
- **Componentes de Página**: Específicos para cada rota
- **Contextos**: Para estado global (AuthContext)
- **Hooks Customizados**: Para lógica reutilizável

### Estrutura de Estilos

- **CSS Modules**: Para estilos específicos de componentes
- **CSS Global**: Para estilos base e utilitários
- **Design System**: Tokens de design consistentes

### Diretrizes para Componentes

1. Criar componente em `frontend/src/components/<Component>.jsx`
2. Criar estilos em `frontend/src/components/<Component>.css`
3. Usar props para configuração
4. Implementar PropTypes para validação
5. Manter componentes pequenos e focados

## Documentação

- Cada diretório que contenha lógica relevante deve ter um `README.md` com:
  - Objetivo
  - Principais arquivos
  - Fluxos (quando aplicável)
  - Decisões e trade-offs
- Features complexas devem descrever o fluxo (eventos, estados, renderização) e o modelo de dados usado no `App.db`.

### Como escrever Status Updates (`docs/status-updates.md`)

- Formato de data: `YYYY-MM-DD` (ex.: `2025-08-23`).
- Cada dia deve ter listas categorizadas (usar apenas o que se aplica):

```
## 2025-08-23

- Added:
  - ...
- Changed:
  - ...
- Moved:
  - ...
- Docs:
  - ...
- Deployed:
  - Produção (Netlify): [personal-leveling-rpg.netlify.app](https://personal-leveling-rpg.netlify.app)
```

- Dicas:
  - Seja conciso; mova detalhes para `docs/features/<feature>.md`.
  - Linke arquivos/rotas relevantes entre crases (ex.: `app.html`, `assets/scripts/main.js`).

### Roteamento e Navegação

- **React Router**: Configurado em `frontend/src/App.jsx`
- **Rotas Protegidas**: Implementadas com `ProtectedRoute`
- **Navegação**: Usando `useNavigate` e `Link` do React Router
- **Estado de Autenticação**: Gerenciado pelo `AuthContext`

### API e Comunicação

- **Axios**: Configurado para comunicação com backend
- **Proxy**: Configurado no Vite para desenvolvimento
- **Endpoints**: Documentados em `docs/features/deploy-render.md`
- **Tratamento de Erros**: Centralizado e consistente

## Revisão e Qualidade

- Mantener comentários atualizados quando refatorar.
- Validar HTML/CSS (W3C validators) e checar acessibilidade básica (semântica, contrastes, foco).
- Testar em pelo menos dois navegadores modernos.

## Mapa de Arquivos (o que ler e quando)

- `README.md` (raiz)
  - Visão rápida do projeto, estrutura de pastas e como rodar localmente.
- `PLAN.md` (raiz)
  - Fonte da verdade do planejamento e progresso. Consulte antes de iniciar uma tarefa para saber prioridade e estado atual. Atualize ao concluir etapas.
- `DIRETRIZ_DE_CODIGO.md` (raiz)
  - Este documento. Ponto de partida para entender processos, padrões e onde buscar informação.

### Backend
- `backend/src/index.js`
  - Ponto de entrada do servidor Express
- `backend/src/routes/`
  - Rotas da API (users, activities, tasks)
- `backend/src/db/`
  - Configuração do banco e migrations
- `backend/.env`
  - Variáveis de ambiente para desenvolvimento

### Frontend
- `frontend/src/App.jsx`
  - Configuração de rotas e estrutura principal
- `frontend/src/components/`
  - Componentes React (Login, Dashboard, Activities, Tasks)
- `frontend/src/contexts/`
  - Contextos para estado global (AuthContext)
- `frontend/vite.config.js`
  - Configuração do Vite e proxy

### Documentação
- `docs/IDEIA_GERAL.md`
  - Objetivos, visão, funcionalidades e escopo do produto.
- `docs/features/deploy-render.md`
  - Guia completo de deploy no Render

## Plano de Projeto (uso do PLAN.md)

- O `PLAN.md` mantém o estado atual do projeto (tarefas, notas, meta vigente).
- Antes de começar:
  - Leia a seção "Current Goal" para alinhar foco.
  - Verifique a "Task List" e marque apenas o que foi realmente concluído no código/documentos.
- Ao finalizar uma tarefa:
  - Atualize a "Task List" (marque como [x]).
  - Se a tarefa gerou decisões relevantes, adicione um resumo em `docs/` (no arquivo da feature ou em `docs/README.md`).
- Mudanças de direção:
  - Registre no `PLAN.md` e referencie documentos afetados (ex.: `docs/DESIGN_GUIDE.md`).
- Boas práticas:
  - Mantenha commits/etapas pequenas e coerentes com itens do `PLAN.md`.
  - Revise o `PLAN.md` quando abrir uma nova frente de trabalho (ex.: nova feature).
