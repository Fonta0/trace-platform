# TRACE — Plataforma de Rastreabilidade de Ativos

MVP de rastreabilidade corporativa com integridade transacional, API REST autenticada e dashboard React em tempo real.

---

## Stack

| Camada     | Tecnologia                                    |
|------------|-----------------------------------------------|
| Backend    | Node.js 20 + TypeScript + Express             |
| ORM        | Prisma 5 + PostgreSQL 16                      |
| Auth       | JWT (jsonwebtoken) + bcryptjs                 |
| Validação  | Zod                                           |
| Frontend   | React 18 + TypeScript + Vite                  |
| Estado     | TanStack React Query v5                       |
| Estilos    | Tailwind CSS v3                               |
| Container  | Docker + Docker Compose                       |

---

## Estrutura do Projeto

```
trace-platform/
├── backend/
│   ├── src/
│   │   ├── errors/        # Hierarquia de erros de domínio
│   │   ├── middleware/    # auth, asyncHandler, errorHandler
│   │   ├── routes/        # auth, trace, assets, inventory
│   │   ├── services/      # TraceService (transações atômicas)
│   │   ├── types/         # Tipos TypeScript
│   │   ├── validators/    # Schemas Zod
│   │   └── server.ts      # Entry point
│   ├── Dockerfile
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── components/    # AssetCard, InventoryTable, Timeline, MovementForm, Toast
│   │   ├── hooks/         # useSmartSearch, useCheckOut, useAssetTimeline...
│   │   ├── services/      # api.ts (cliente HTTP tipado)
│   │   ├── types/         # Tipos de domínio
│   │   └── App.tsx        # Dashboard, Inventário, Cards
│   ├── Dockerfile
│   ├── package.json
│   └── vite.config.ts
├── prisma/
│   ├── schema.prisma      # Entidades: Asset, TraceLog, User, Category
│   └── seed.ts            # 17 ativos + 6 usuários + histórico realista
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## Rodando com Docker (recomendado)

```bash
# 1. Clone o repositório
git clone https://github.com/sua-org/trace-platform.git
cd trace-platform

# 2. Configure as variáveis de ambiente
cp .env.example .env
# Edite .env e troque JWT_SECRET por uma chave segura

# 3. Suba tudo com um comando
docker compose up --build

# A API sobe em:      http://localhost:3333
# O frontend sobe em: http://localhost:5173
```

O docker-compose executa automaticamente:
- `prisma migrate deploy` — aplica as migrations
- `ts-node prisma/seed.ts` — popula o banco com dados de exemplo

---

## Rodando localmente (sem Docker)

### Pré-requisitos
- Node.js 20+
- PostgreSQL 16+ rodando localmente

### Backend

```bash
cd backend
npm install

# Configure o banco
cp ../.env.example .env
# Edite DATABASE_URL e JWT_SECRET no .env

# Migrations + seed
npm run db:migrate
npm run db:seed

# Inicia em modo dev (hot reload)
npm run dev
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

---

## Usuários de Teste (após seed)

| Nome           | E-mail              | Senha       | Role     |
|----------------|---------------------|-------------|----------|
| Admin Sistema  | admin@trace.io      | Trace@2024  | Admin    |
| Ana Lima       | ana@trace.io        | Trace@2024  | Operator |
| Carlos Mota    | carlos@trace.io     | Trace@2024  | Operator |
| Beatriz Neves  | bea@trace.io        | Trace@2024  | Operator |
| Rafael Matos   | rafael@trace.io     | Trace@2024  | Operator |
| Fernanda Costa | fernanda@trace.io   | Trace@2024  | Viewer   |

---

## Endpoints da API

### Auth
```
POST /api/auth/login          Body: { email, password }
```

### Inventory
```
GET  /api/inventory/dashboard
GET  /api/inventory/categories
```

### Assets
```
GET  /api/assets              ?q=&status=&page=&limit=
GET  /api/assets/:id
GET  /api/assets/:id/timeline
```

### Trace (requer role Admin ou Operator)
```
POST /api/trace/check-out         Body: { assetId, userId, destinationLocation, notes? }
POST /api/trace/check-in          Body: { assetId, userId, returnLocation, notes? }
POST /api/trace/maintenance/start Body: { assetId, userId, notes? }
POST /api/trace/maintenance/end   Body: { assetId, userId, notes? }
```

Todas as rotas (exceto `/api/auth/login` e `/health`) requerem o header:
```
Authorization: Bearer <token>
```

---

## Decisões de Arquitetura

### Transações Atômicas (`$transaction`)
Toda movimentação de ativo (check-out, check-in, manutenção) executa `asset.update` + `traceLog.create` em um único `BEGIN/COMMIT` do PostgreSQL. Se qualquer operação falhar, nenhuma alteração é persistida — garantia ACID completa.

O padrão **double-checked locking** é aplicado:
1. Leitura fora da transação — fail-fast barato
2. Re-leitura dentro da transação — captura race conditions concorrentes

### TraceLog é imutável
Nenhuma rota expõe `DELETE` ou `UPDATE` em `trace_logs`. Cada linha é um evento histórico permanente — a "blockchain" do ativo.

### React Query — Cache Strategy
| Query              | staleTime | refetchInterval | Comportamento                              |
|--------------------|-----------|-----------------|--------------------------------------------|
| Dashboard          | 30s       | 60s             | Polling automático em background           |
| Smart Search       | 15s       | —               | Debounce 280ms, placeholderData (sem flicker) |
| Asset Timeline     | 30s       | —               | gcTime 5min, cache generoso               |

Após toda mutação, `queryClient.invalidateQueries` descarta o cache das queries afetadas → React Query refaz o fetch silenciosamente → UI sempre consistente sem F5.

### Smart Search
Busca simultânea por `serialNumber` e `name` com `mode: "insensitive"` (PostgreSQL `ILIKE`), aproveitando os índices `@@index([serialNumber])` e `@@index([name])` declarados no schema Prisma.

---

## Scripts disponíveis

```bash
# Backend
npm run dev          # Hot reload (ts-node-dev)
npm run build        # Compila TypeScript
npm run start        # Executa o build compilado
npm run db:migrate   # Aplica migrations Prisma
npm run db:seed      # Popula o banco com dados de exemplo
npm run db:studio    # Abre o Prisma Studio (GUI do banco)
npm run db:reset     # Reseta e re-seed o banco

# Frontend
npm run dev          # Dev server Vite
npm run build        # Build de produção
npm run preview      # Pré-visualiza o build
```
