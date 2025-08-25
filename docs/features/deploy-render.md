# Deploy no Render

Guia completo para fazer deploy da aplicação Personal Leveling no Render.

## Visão Geral

A aplicação será deployada em 3 serviços no Render:
1. **PostgreSQL Database** - Banco de dados
2. **Backend API** - Web Service com Node.js/Express
3. **Frontend** - Static Site com build do Vite

## 1. PostgreSQL Database

### Criar Database
1. Acesse [Render Dashboard](https://dashboard.render.com/)
2. Clique em "New" → "PostgreSQL"
3. Configure:
   - **Name**: `personal-leveling-db`
   - **Database**: `personal_leveling`
   - **User**: `personal_leveling_user`
   - **Region**: Escolha a mais próxima
   - **PostgreSQL Version**: 15
   - **Plan**: Free

### Configurações Importantes
- **Internal Database URL**: Será usada pelo backend
- **External Database URL**: Para conexões externas (se necessário)
- **Database**: `personal_leveling`
- **User**: `personal_leveling_user`

## 2. Backend API (Web Service)

### Criar Web Service
1. Clique em "New" → "Web Service"
2. Conecte com seu repositório GitHub
3. Configure:
   - **Name**: `personal-leveling-api`
   - **Environment**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Plan**: Free

### Variáveis de Ambiente
Configure as seguintes variáveis:

```
DATABASE_URL=postgresql://personal_leveling_user:password@host:port/personal_leveling
NODE_ENV=production
PORT=10000
FRONTEND_URL=https://seu-frontend.onrender.com
JWT_SECRET=sua-chave-secreta-super-segura
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### Build Settings
- **Root Directory**: `backend`
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm start`

## 3. Frontend (Static Site)

### Criar Static Site
1. Clique em "New" → "Static Site"
2. Conecte com seu repositório GitHub
3. Configure:
   - **Name**: `personal-leveling-frontend`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `frontend/dist`
   - **Root Directory**: `frontend`

### Variáveis de Ambiente
```
VITE_API_URL=https://seu-backend.onrender.com
```

### Build Settings
- **Root Directory**: `frontend`
- **Build Command**: `npm install && npm run build`
- **Publish Directory**: `dist`

## 4. Configuração de CORS

No backend, certifique-se de que o CORS está configurado para aceitar requisições do frontend:

```javascript
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true
}));
```

## 5. Migrações do Banco

Após o deploy do backend, execute as migrações:

1. Acesse o console do backend no Render
2. Execute: `npm run migrate`

Ou configure um script de build que execute as migrações automaticamente.

## 6. Testes Pós-Deploy

### Backend
- [ ] Health check: `https://seu-backend.onrender.com/api/health`
- [ ] Teste de conexão com banco
- [ ] Teste de criação de usuário
- [ ] Teste de autenticação

### Frontend
- [ ] Carregamento da página inicial
- [ ] Login/registro funcionando
- [ ] Navegação entre páginas
- [ ] CRUD de atividades e tarefas

## 7. Domínios Customizados (Opcional)

### Backend
- Configure um domínio customizado no Render
- Atualize `FRONTEND_URL` no backend

### Frontend
- Configure um domínio customizado no Render
- Atualize `VITE_API_URL` no frontend

## 8. Monitoramento

### Logs
- Acesse os logs no dashboard do Render
- Configure alertas para erros

### Métricas
- Monitore uso de recursos
- Configure alertas de performance

## Troubleshooting

### Problemas Comuns

1. **Erro de conexão com banco**
   - Verifique `DATABASE_URL`
   - Confirme se o banco está ativo

2. **CORS errors**
   - Verifique `FRONTEND_URL` no backend
   - Confirme se o frontend está acessível

3. **Build failures**
   - Verifique logs de build
   - Confirme se todas as dependências estão no `package.json`

4. **Runtime errors**
   - Verifique logs do serviço
   - Confirme variáveis de ambiente

### Comandos Úteis

```bash
# Verificar status dos serviços
curl https://seu-backend.onrender.com/api/health

# Testar conexão com banco
curl -X POST https://seu-backend.onrender.com/api/users \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'
```

## Custos

- **Free Tier**: $0/mês
  - PostgreSQL: 1GB storage, 90 dias
  - Web Service: 750 horas/mês
  - Static Site: Ilimitado

- **Paid Plans**: A partir de $7/mês por serviço
  - Mais recursos e uptime garantido
  - Suporte prioritário
