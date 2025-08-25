# Personal Leveling

Aplicação web para gamificação de produtividade pessoal, construída com React + Node.js/Express + PostgreSQL.

## 🚀 Tecnologias

- **Frontend**: React 18 + Vite
- **Backend**: Node.js + Express
- **Database**: PostgreSQL
- **Deploy**: Render (Free tier)

## 📁 Estrutura

```
/
├── frontend/          # React app (Vite)
│   ├── src/
│   │   ├── components/
│   │   ├── contexts/
│   │   └── ...
│   └── package.json
├── backend/           # Node.js/Express API
│   ├── src/
│   │   ├── routes/
│   │   ├── db/
│   │   └── ...
│   └── package.json
├── package.json       # Root workspace
└── docs/
```

## 🛠️ Desenvolvimento Local

### Pré-requisitos

- Node.js 18+
- PostgreSQL (ou Docker)

### 1. Instalar dependências

```bash
npm run install:all
```

### 2. Configurar banco (Docker)

```bash
docker run --name postgres-pl -e POSTGRES_PASSWORD=password -e POSTGRES_DB=personal_leveling -p 5432:5432 -d postgres:15
```

### 3. Configurar variáveis de ambiente

```bash
# backend/.env
DATABASE_URL=postgresql://postgres:password@localhost:5432/personal_leveling
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

### 4. Aplicar migrações

```bash
cd backend
npm run migrate
```

### 5. Rodar aplicação

```bash
# Terminal 1: Backend
npm run dev:backend

# Terminal 2: Frontend
npm run dev:frontend
```

Acesse:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001/api/health

## 🌐 Deploy

### Render (Free tier)

1. **PostgreSQL Database**: Criar via Render Dashboard
2. **Backend API**: Web Service com Node.js
3. **Frontend**: Static Site com build do Vite

Ver guia completo em: [`docs/features/deploy-render.md`](docs/features/deploy-render.md)

## 📊 Funcionalidades

- ✅ Autenticação de usuários
- ✅ Registro de atividades
- ✅ Gerenciamento de tarefas (diárias/semanais)
- ✅ API REST completa
- ✅ Interface React responsiva

## 🔄 Próximas Funcionalidades

- [ ] Sistema de XP e níveis
- [ ] Atributos gamificados
- [ ] Conquistas e badges
- [ ] Missões e combates PvE
- [ ] Estatísticas avançadas

## 📚 Documentação

- [`docs/IDEIA_GERAL.md`](docs/IDEIA_GERAL.md) - Visão geral do produto
- [`docs/DIRETRIZ_DE_CODIGO.md`](docs/DIRETRIZ_DE_CODIGO.md) - Padrões de código
- [`docs/features/deploy-render.md`](docs/features/deploy-render.md) - Guia de deploy

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Push para a branch
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo `LICENSE` para mais detalhes.
