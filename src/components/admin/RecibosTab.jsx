import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../context/AuthContext'
import { formatarData } from '../../utils/horas'

export default function RecibosTab({ funcionario }) {
  const [recibos, setRecibos] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [erro, setErro] = useState('')
  const inputRef = useRef()

  useEffect(() => {
    carregarRecibos()
  }, [])

  async function carregarRecibos() {
    setLoading(true)
    const { data } = await supabase
      .from('vp_recibos')
      .select('*')
      .eq('funcionario_id', funcionario.id)
      .order('criado_em', { ascending: false })
    setRecibos(data || [])
    setLoading(false)
  }

  async function handleUpload(e) {
    const file = e.target.files[0]
    if (!file) return
    if (file.type !== 'application/pdf') {
      setErro('Apenas ficheiros PDF são permitidos.')
      return
    }

    setErro('')
    setUploading(true)

    const caminho = `${funcionario.id}/${Date.now()}_${file.name}`
    const { error: uploadError } = await supabase.storage
      .from('recibos')
      .upload(caminho, file)

    if (uploadError) {
      setErro('Erro ao fazer upload.')
      setUploading(false)
      return
    }

    const { data: urlData } = supabase.storage.from('recibos').getPublicUrl(caminho)

    const { error: dbError } = await supabase.from('vp_recibos').insert({
      funcionario_id: funcionario.id,
      nome: file.name,
      url: caminho,
    })

    setUploading(false)
    if (dbError) { setErro('Erro ao guardar recibo.'); return }
    inputRef.current.value = ''
    await carregarRecibos()
  }

  async function download(recibo) {
    const { data, error } = await supabase.storage
      .from('recibos')
      .createSignedUrl(recibo.url, 60)
    if (error) { setErro('Erro ao abrir recibo.'); return }
    window.open(data.signedUrl, '_blank')
  }

  async function apagar(recibo) {
    if (!confirm(`Apagar "${recibo.nome}"?`)) return
    await supabase.storage.from('recibos').remove([recibo.url])
    await supabase.from('vp_recibos').delete().eq('id', recibo.id)
    await carregarRecibos()
  }

  return (
    <div>
      {/* Upload */}
      <div
        onClick={() => inputRef.current.click()}
        className="border-2 border-dashed border-[#333] hover:border-[#cc0000] rounded-xl px-4 py-6 text-center cursor-pointer transition mb-5"
      >
        <p className="text-2xl mb-1">📄</p>
        <p className="text-white text-sm font-medium">
          {uploading ? 'A fazer upload...' : 'Clica para enviar recibo PDF'}
        </p>
        <p className="text-gray-500 text-xs mt-1">Apenas ficheiros PDF</p>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={handleUpload}
        />
      </div>

      {erro && <p className="text-red-400 text-sm text-center mb-3">{erro}</p>}

      {/* Lista */}
      {loading ? (
        <div className="flex justify-center mt-6">
          <div className="w-6 h-6 border-4 border-[#cc0000] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : recibos.length === 0 ? (
        <div className="text-center py-8 text-gray-600 text-sm">
          Nenhum recibo enviado
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {recibos.map(r => (
            <div key={r.id} className="bg-[#0a0a0a] border border-[#1e1e1e] rounded-xl px-4 py-3 flex items-center gap-3">
              <span className="text-xl flex-shrink-0">📄</span>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm truncate">{r.nome}</p>
                <p className="text-gray-500 text-xs mt-0.5">{formatarData(r.criado_em)}</p>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button
                  onClick={() => download(r)}
                  className="text-xs text-[#cc0000] hover:text-white border border-[#cc0000]/40 hover:bg-[#cc0000] hover:border-[#cc0000] px-2 py-1 rounded-lg transition"
                >
                  Abrir
                </button>
                <button
                  onClick={() => apagar(r)}
                  className="text-xs text-gray-500 hover:text-red-400 border border-[#333] hover:border-red-800 px-2 py-1 rounded-lg transition"
                >
                  Apagar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
