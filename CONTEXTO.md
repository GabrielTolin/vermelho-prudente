# Vermelho Prudente — Contexto do Projeto

## Sobre a Empresa
- **Nome:** Vermelho Prudente Canalizações Hidráulicas
- **Email:** prudente.pt@gmail.com
- **Setor:** Canalizações / Hidráulica
- **Mercados:** Portugal + Espanha

---

## Stack Técnica

### Frontend
- React + Vite + Tailwind CSS v4
- PWA com `vite-plugin-pwa` (instalável no telemóvel)
- Deploy: **Vercel** → `https://vermelho-prudente.vercel.app`

### Backend
- Node.js + Express
- Deploy: **Render** (free tier) → `https://vermelho-prudente.onrender.com`
- Keep-alive: cron-job.org a cada 10 minutos → `GET /api`

### Base de Dados + Auth
- **Supabase** (partilhado com o projeto Kingdom Selection)
- URL: `https://wbzfvipcslqczxqivkjn.supabase.co`
- Todas as tabelas têm prefixo `vp_` para não misturar com o Kingdom Selection

### Email
- **Resend** — relatório mensal automático
- Conta: `gabrieltolin@gmail.com` (conta do programador)
- Em modo de teste envia para `gabrieltolin@gmail.com`
- Para enviar para `prudente.pt@gmail.com` é necessário verificar domínio no Resend

---

## Repositório
- GitHub: `https://github.com/GabrielTolin/vermelho-prudente`
- Branch principal: `master`

---

## Estrutura de Ficheiros

```
vermelho-prudente/
├── index.html
├── vercel.json                        ← rewrites para React Router
├── vite.config.js                     ← PWA config
├── package.json
├── .gitignore
├── CONTEXTO.md
├── public/
│   └── logo.png                       ← logo para PWA
├── src/
│   ├── main.jsx
│   ├── index.css                      ← variáveis de cor CSS
│   ├── App.jsx                        ← rotas + fundo com logo
│   ├── assets/
│   │   └── logo.png                   ← logo para fundo da app
│   ├── context/
│   │   └── AuthContext.jsx            ← Supabase client + AuthProvider
│   ├── components/
│   │   ├── RotaProtegida.jsx          ← proteção de rotas por role
│   │   ├── RedireccionarPorRole.jsx   ← redireciona admin/funcionário
│   │   ├── admin/
│   │   │   ├── ListaObras.jsx
│   │   │   ├── ListaFuncionarios.jsx
│   │   │   ├── ObraModal.jsx          ← detalhe obra + presença + associar
│   │   │   ├── FuncionarioModal.jsx   ← detalhe funcionário + editar + recibos
│   │   │   ├── CriarObraModal.jsx     ← criar obra com GPS por morada
│   │   │   ├── CriarFuncionarioModal.jsx
│   │   │   └── RecibosTab.jsx
│   │   └── funcionario/
│   │       └── AlterarPasswordModal.jsx
│   ├── pages/
│   │   ├── Login.jsx
│   │   ├── admin/
│   │   │   └── Dashboard.jsx
│   │   └── funcionario/
│   │       └── Ponto.jsx
│   ├── services/
│   │   └── api.js                     ← BASE_URL do Render
│   └── utils/
│       ├── gps.js                     ← Haversine + validação raio
│       └── horas.js                   ← formatarHora, formatarData, arredondar30min, calcularPeriodo
└── server/
    ├── index.js                       ← Express + CORS
    ├── supabase.js                    ← cliente com service role key
    ├── package.json
    ├── .env                           ← NÃO vai para o Git
    ├── .env.example
    └── routes/
        ├── funcionarios.js            ← CRUD + criar auth user
        ├── ponto.js
        └── relatorio.js              ← relatório mensal por email (Resend)
```

---

## Base de Dados Supabase

Todas as tabelas têm prefixo `vp_` (Vermelho Prudente).

```sql
vp_funcionarios       — id, nome, email, telefone, valor_hora, ativo, tipo_periodo, criado_em
vp_obras              — id, nome, morada, latitude, longitude, raio_metros, ativa, criado_em
vp_obra_funcionarios  — obra_id, funcionario_id (tabela de associação)
vp_registos_ponto     — id, funcionario_id, obra_id, tipo, hora, latitude, longitude
vp_recibos            — id, funcionario_id, nome, url, criado_em
```

Tabela partilhada com Kingdom Selection:
```sql
perfis                — id, funcionario_id, role, created_at
```

### RLS (Row Level Security)
Todas as tabelas têm RLS ativo com políticas `to authenticated using (true)`.

### Storage
- Bucket: `recibos` (privado)
- Path: `{funcionario_id}/{timestamp}_{nome_ficheiro}.pdf`
- Acesso via signed URL (60 segundos)

---

## Autenticação

- **Supabase Auth** com email + password
- Roles: `admin` / `funcionario`
- Password temporária ao criar funcionário: `VermelhoPrudente2026!`
- O funcionário pode alterar a password dentro da app (🔑 no header)
- `AuthContext.jsx` — `loading` começa `true`, só passa a `false` após `getSession` + `carregarPerfil`
- `RotaProtegida.jsx` — mostra spinner durante `loading` para evitar redirect prematuro

---

## Funcionalidades

### App do Funcionário (`/ponto`)
- Resumo do mês: horas, dias, valor a receber
- GPS ativo com coordenadas em tempo real
- Lista das obras associadas
- Marcar entrada/saída com validação GPS (máx. 200m da obra)
- Arredondamento automático para o múltiplo de 30 minutos mais próximo
- Histórico de registos do dia
- Tab de recibos — ver e descarregar PDFs enviados pelo admin
- Alterar password (botão 🔑 no header)

### Dashboard Admin (`/dashboard`)
- Card "Total em obra agora"
- Botões: Nova Obra / Novo Funcionário
- Tab Obras: lista de obras ativas com presentes/ausentes em tempo real (atualiza a cada 30s)
- Tab Funcionários: lista com horas, dias e custo do período atual

### Modal de Obra
- Presença agora (atualiza a cada 30s)
- Lista de funcionários associados
- Adicionar / remover funcionários
- Encerrar obra

### Modal de Funcionário
- Tab Informações: editar nome, telefone, valor/hora, período de fecho
- Tab Registos de Ponto: histórico do período agrupado por dia
- Tab Recibos: upload de PDFs, abrir, apagar

### Criar Obra
- Nome, morada, raio GPS (padrão 200m)
- Obter coordenadas por morada (OpenStreetMap Nominatim — gratuito)
- Capturar GPS do dispositivo se admin estiver no local
- **GPS é obrigatório** — sem coordenadas os funcionários não conseguem marcar ponto

### Criar Funcionário
- Nome, email, telefone, valor/hora, período de fecho
- Cria automaticamente o acesso no Supabase Auth (via backend com service role key)
- Password temporária: `VermelhoPrudente2026!`

---

## Períodos de Fecho

| Tipo | País | Período |
|------|------|---------|
| `mensal_25` | Portugal | Dia 26 mês anterior → dia 25 mês atual |
| `mensal_fim` | Espanha | Dia 1 → último dia do mês atual |

Configurável por funcionário no campo `tipo_periodo`.

---

## Relatório Mensal Automático

- **Quando:** dia 26 de cada mês às 08:00 (cron-job.org)
- **Como:** cron-job.org faz POST para `https://vermelho-prudente.onrender.com/api/relatorio/enviar`
- **O que envia:** email HTML com tabela de todos os funcionários (nome, dias, horas, custo) + total
- **Para quem:** `gabrieltolin@gmail.com` (em teste) → trocar para `prudente.pt@gmail.com` após verificar domínio no Resend
- Cada funcionário tem o período calculado individualmente conforme o `tipo_periodo`

---

## Variáveis de Ambiente

### Frontend (não tem .env — credenciais hardcoded no AuthContext)
```
SUPABASE_URL = https://wbzfvipcslqczxqivkjn.supabase.co
SUPABASE_ANON_KEY = eyJ... (anon key)
```

### Backend (`server/.env`)
```
SUPABASE_URL=https://wbzfvipcslqczxqivkjn.supabase.co
SUPABASE_SERVICE_KEY=eyJ... (service role key)
RESEND_API_KEY=re_...
EMAIL_ADMIN=prudente.pt@gmail.com
PORT=3001
```

---

## Cores e Design

- **Fundo:** `#0a0a0a` (preto)
- **Cards:** `#111111`
- **Bordas:** `#1e1e1e`
- **Destaque:** `#cc0000` (vermelho)
- **Fundo logo:** logo.png em mosaico com `opacity: 0.07`
- Modais: centrados, sem arredondamento (`rounded-none`)
- Mobile-first, max-width `lg` centrado

---

## GPS e Validação de Ponto

- Fórmula Haversine em `src/utils/gps.js`
- Raio padrão: 200 metros (configurável por obra até 500m)
- Se obra não tiver GPS → botão de marcar ponto não aparece
- Se funcionário estiver fora do raio → mensagem com distância exata
- Timezone automático do dispositivo (`Intl.DateTimeFormat().resolvedOptions().timeZone`)
- Arredondamento: múltiplo de 30 minutos mais próximo (ex: 13:12 → 13:00, 13:16 → 13:30)

---

## Deploy — Checklist

- [x] Vercel ligado ao repositório GitHub (auto-deploy no push)
- [x] Render ligado ao repositório GitHub, Root Directory: `server`
- [x] `vercel.json` com rewrite `(.*)` → `/index.html`
- [x] Keep-alive no cron-job.org a cada 10 min → `GET https://vermelho-prudente.onrender.com/api`
- [x] Relatório mensal no cron-job.org dia 26 às 08:00 → `POST https://vermelho-prudente.onrender.com/api/relatorio/enviar`
- [ ] Verificar domínio no Resend para enviar para `prudente.pt@gmail.com`

---

## Notas Importantes

- O Render free tier tem cold start de ~30-60s — o keep-alive evita que adormeça
- Credenciais Supabase hardcoded no `AuthContext.jsx` (workaround para Vercel)
- O `loading` no AuthContext é crítico — sem ele utilizadores autenticados são redirecionados para login ao recarregar
- CORS no backend: sempre incluir `localhost:5173` + `https://vermelho-prudente.vercel.app`
- Registos de ponto guardam latitude/longitude mas não são usados para auditoria (só para validação em tempo real)
- Quando houver 3º cliente: considerar upgrade para Supabase Pro (25$/mês) — free tier limita a 2 projetos ativos
