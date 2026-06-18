import { Router } from 'express'
import { supabase } from '../supabase.js'

const router = Router()

router.get('/hoje/:funcionarioId', async (req, res) => {
  const hoje = new Date().toISOString().split('T')[0]
  const { data, error } = await supabase
    .from('registos_ponto')
    .select('*')
    .eq('funcionario_id', req.params.funcionarioId)
    .gte('hora', `${hoje}T00:00:00`)
    .lte('hora', `${hoje}T23:59:59`)
    .order('hora')
  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

router.post('/', async (req, res) => {
  const { funcionario_id, tipo, latitude, longitude } = req.body
  const { data, error } = await supabase
    .from('registos_ponto')
    .insert({ funcionario_id, tipo, latitude, longitude, hora: new Date().toISOString() })
    .select()
    .single()
  if (error) return res.status(400).json({ error: error.message })
  res.status(201).json(data)
})

export default router
