import { Router } from 'express'
import { supabase } from '../supabase.js'

const router = Router()

router.get('/', async (_req, res) => {
  const { data, error } = await supabase.from('vp_funcionarios').select('*').order('nome')
  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

router.post('/', async (req, res) => {
  const { nome, email, telefone, valor_hora } = req.body

  // 1. Criar utilizador no Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password: 'VermelhoPrudente2026!',
    email_confirm: true,
    user_metadata: { nome, role: 'funcionario' },
  })

  if (authError) return res.status(400).json({ error: authError.message })

  // 2. Inserir na tabela vp_funcionarios
  const { data, error } = await supabase.from('vp_funcionarios').insert({
    id: authData.user.id,
    nome,
    email,
    telefone: telefone || null,
    valor_hora: Number(valor_hora) || 0,
    ativo: true,
  }).select().single()

  if (error) {
    // Reverter criação do auth se falhar
    await supabase.auth.admin.deleteUser(authData.user.id)
    return res.status(400).json({ error: error.message })
  }

  // 3. Criar perfil
  await supabase.from('perfis').insert({
    id: authData.user.id,
    role: 'funcionario',
  })

  res.status(201).json(data)
})

router.put('/:id', async (req, res) => {
  const { data, error } = await supabase
    .from('vp_funcionarios')
    .update(req.body)
    .eq('id', req.params.id)
    .select()
    .single()
  if (error) return res.status(400).json({ error: error.message })
  res.json(data)
})

export default router
