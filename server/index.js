import express from 'express'
import cors from 'cors'
import 'dotenv/config'

// Rotas
import funcionariosRouter from './routes/funcionarios.js'
import pontosRouter from './routes/ponto.js'
import relatorioRouter from './routes/relatorio.js'

const app = express()
const PORT = process.env.PORT || 3001

// CORS: permitir frontend local + produção Vercel
app.use(cors({
  origin: true,
  credentials: true,
}))

app.use(express.json())

// Health check / keep-alive
app.get('/api', (_req, res) => res.json({ ok: true }))

// Rotas
app.use('/api/funcionarios', funcionariosRouter)
app.use('/api/ponto', pontosRouter)
app.use('/api/relatorio', relatorioRouter)

app.listen(PORT, () => console.log(`Servidor a correr na porta ${PORT}`))
