# Vermelho Prudente — Field Time Tracking

App de gestão de ponto e obras para empresa de canalizações com equipas em Portugal e Espanha.

**Live:** [vermelho-prudente.vercel.app](https://vermelho-prudente.vercel.app)

**Stack:** React · Vite · Tailwind CSS · Node.js · Express · Supabase (PostgreSQL + Auth + Storage) · Vercel · Render

---

## O que faz

- Funcionários marcam entrada/saída via GPS — só funciona dentro de um raio configurável da obra (Haversine formula, default 200m)
- Admin gere obras, funcionários, recibos e gera relatórios mensais em PDF
- Dois ciclos de fecho: dia 26→25 (Portugal) e dia 1→último (Espanha), configurável por funcionário
- PWA instalável no telemóvel — o público-alvo usa o Telemóvel em obra, sem laptop.

---

## Decisões técnicas

**PWA em vez de React Native**
O cliente não tem budget para App Store. Uma PWA instalável no Android e no IPhone resolve o caso de uso (ícone no ecrã, funciona offline para ver dados em cache) sem fricção de distribuição.

**Nominatim (OpenStreetMap) em vez de Google Maps**
Geocoding de moradas para coordenadas GPS sem custo e sem cartão de crédito. Para o volume de requests deste projeto (admin cria obras pontualmente), o rate limit do Nominatim nunca é problema.

**Frontend (Vercel) e backend (Render) separados**
O Supabase anon key pode estar no frontend — é público por design. Mas `createUser` e `deleteUser` requerem a service role key, que nunca pode estar no cliente. O Express serve exclusivamente para operações admin que exigem a service key.

**Supabase partilhado com prefixo `vp_`**
Este projeto corre no mesmo Supabase de outro cliente. Em vez de criar um segundo projeto (e pagar), todas as tabelas têm prefixo `vp_` para isolamento lógico. Funciona porque RLS garante isolamento por utilizador autenticado, e mantem sem problemas por se tratarem de empresas de pequeno porte (10 - 30 funcionários).

**jsPDF no browser para relatórios**
O relatório mensal era enviado por email via Resend — falhou em produção por restrições do plano gratuito. Migrei para geração de PDF diretamente no browser: zero dependência de serviços externos, download imediato, histórico de 12 meses disponível.

---

## Estrutura

```
├── src/
│   ├── pages/
│   │   ├── admin/Dashboard.jsx       # gestão de obras, funcionários, relatórios
│   │   └── funcionario/Ponto.jsx     # clock-in/out com GPS
│   ├── components/admin/
│   │   ├── ObraModal.jsx             # presença em tempo real (polling 30s)
│   │   ├── FuncionarioModal.jsx      # editar registos + upload recibos
│   │   ├── RelatoriosMensais.jsx     # geração PDF com jsPDF
│   │   └── RegistoManualModal.jsx    # correção de ponto pelo admin
│   └── utils/
│       ├── gps.js                    # Haversine
│       └── horas.js                  # arredondamento 30min + cálculo de período
└── server/
    └── routes/
        ├── funcionarios.js           # createUser / deleteUser com service key
        └── relatorio.js              # endpoint legado (Resend)
```

---

## Setup local

```bash
# Frontend
npm install
npm run dev

# Backend
cd server
npm install
node index.js
```

Variáveis necessárias em `server/.env`:
```
SUPABASE_URL=
SUPABASE_SERVICE_KEY=
RESEND_API_KEY=
EMAIL_ADMIN=
PORT=3001
```

O frontend usa as credenciais Supabase hardcoded em `src/context/AuthContext.jsx` — workaround para limitação do Vercel com variáveis de ambiente em projetos sem `vite.config` configurado para isso.

---

Desenvolvido por [Gabriel Tolin](https://github.com/GabrielTolin)
