'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { EVENTO_TIPO_LABELS, EventoTipo } from '@/types'
import { ArrowLeft, Save } from 'lucide-react'

export default function NuevoEventoPage() {
  const router = useRouter()
  const supabase = createClient()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    nombre: '',
    tipo: 'feria' as EventoTipo,
    descripcion: '',
    lugar: '',
    fecha_inicio: '',
    fecha_fin: '',
  })

  function set(k: string, v: any) { setForm(p => ({ ...p, [k]: v })) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const { data: user } = await supabase.auth.getUser()
    const { data, error } = await supabase
      .from('eventos')
      .insert({ ...form, created_by: user.user?.id, estado: 'planificacion' })
      .select('id')
      .single()
    if (!error) router.push(`/eventos/${data.id}`)
    else { alert('Error al crear: ' + error.message); setSaving(false) }
  }

  return (
    <div className="min-h-screen bg-[#f7f5f1]">
      <div className="bg-white border-b border-[#e8e4dd] px-8 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-4">
          <Link href="/eventos" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Eventos
          </Link>
          <span className="text-gray-300">/</span>
          <span className="text-sm font-medium text-gray-900">Nuevo evento</span>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-8 py-8">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="bg-white rounded-xl border border-[#e8e4dd] p-6 space-y-4">
            <h2 className="text-sm font-semibold text-gray-900">Información del evento</h2>
            <div>
              <label className="sh-label">Nombre del evento *</label>
              <input value={form.nombre} onChange={e => set('nombre', e.target.value)}
                className="sh-input" placeholder="Ej: FIT Buenos Aires 2026" required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="sh-label">Tipo</label>
                <select value={form.tipo} onChange={e => set('tipo', e.target.value)} className="sh-select">
                  {Object.entries(EVENTO_TIPO_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="sh-label">Lugar</label>
                <input value={form.lugar} onChange={e => set('lugar', e.target.value)}
                  className="sh-input" placeholder="Ej: Buenos Aires, Argentina" />
              </div>
              <div>
                <label className="sh-label">Fecha inicio</label>
                <input type="date" value={form.fecha_inicio} onChange={e => set('fecha_inicio', e.target.value)} className="sh-input" />
              </div>
              <div>
                <label className="sh-label">Fecha fin</label>
                <input type="date" value={form.fecha_fin} onChange={e => set('fecha_fin', e.target.value)} className="sh-input" />
              </div>
            </div>
            <div>
              <label className="sh-label">Descripción</label>
              <textarea value={form.descripcion} onChange={e => set('descripcion', e.target.value)}
                rows={3} className="sh-input resize-none text-sm" placeholder="Contexto, objetivos, notas generales..." />
            </div>
          </div>

          <div className="flex gap-3">
            <button type="submit" disabled={saving || !form.nombre.trim()}
              className="flex items-center gap-2 px-6 py-2.5 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-60 shadow-sm"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Creando...' : 'Crear evento'}
            </button>
            <Link href="/eventos" className="px-6 py-2.5 text-sm text-gray-600 border border-[#e8e4dd] rounded-lg hover:bg-white transition-colors">
              Cancelar
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
