import { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

// TODO: substituir pelos valores do novo projeto Supabase
const SUPABASE_URL = 'https://wbzfvipcslqczxqivkjn.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndiemZ2aXBjc2xxY3p4cWl2a2puIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0ODIzMzksImV4cCI6MjA5MzA1ODMzOX0.JEgLRZxr1GVlfa03bFf40o6bedfCe7q8AGE8njIanCk'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [utilizador, setUtilizador] = useState(null)
  const [perfil, setPerfil] = useState(null)
  const [loading, setLoading] = useState(true)

  async function carregarPerfil(user) {
    if (!user) { setPerfil(null); return }
    const { data } = await supabase
      .from('perfis')
      .select('*')
      .eq('id', user.id)
      .single()
    setPerfil(data)
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUtilizador(session?.user ?? null)
      carregarPerfil(session?.user ?? null).finally(() => setLoading(false))
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUtilizador(session?.user ?? null)
      carregarPerfil(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  async function login(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  async function logout() {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ utilizador, perfil, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
