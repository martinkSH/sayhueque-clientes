'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { AREAS, ESTADOS_LABELS, ClienteArea, ClienteEstado } from '@/types'
import { ArrowLeft, Save } from 'lucide-react'

const IDIOMAS = ['Español', 'Inglés', 'Francés', 'Alemán', 'Portugués', 'Italiano', 'Neerlandés', 'Otro']
const VOLUMENES = ['VIP', 'ALTO', 'MEDIO', 'BAJO', 'EN_DESARROLLO']

export default function NuevoClienteForm({
  usuarios, currentUserId
}: {
  usuarios: { id: string; nombre: string }[]
  currentUserId: string
}) {
  const router = useRouter()
  const supabase = createClient()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    nombre_agencia: '',
    tipo: 'potencial' as 'actual' | 'potencial',
    area: [] as ClienteArea[],
    estado: 'open' as ClienteEstado,
    pais: '',
    idioma: '',
    perfil_agencia: '',
    origen_contacto: '',
    web: '',
    vendedor_principal: currentUserId,
    volumen: '',
    opera_family_travel: false,
    tiene_dmc_arg: false,
    vende_arg_chile: false,
    notas: '',
  })

  function toggleArea(area: ClienteArea) {
    setForm(prev => ({
      ...prev,
      area: prev.area.includes(area)
        ? prev.area.filter(a => a !== area)
        : [...prev.area, area]
    }))
  }

  function set(key: string, value: any) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.nombre_agencia.trim()) { setError('El nombre de la agencia es obligatorio'); return }
    if (form.area.length === 0) { setError('Seleccioná al menos un área'); return }
    setSaving(true)
    setError('')

    const { data, error: err } = await supabase
      .from('clientes')
      .insert({
        ...form,
        volumen: form.volumen || null,
        vendedor_principal: form.vendedor_principal || null,
        created_by: currentUserId,
      })
      .select('id')
      .single()

    if (err) { setError('Error al guardar: ' + err.message); setSaving(false); return }
    router.push(`/clientes/${data.id}`)
  }

  return (
    <div className="min-h-screen bg-[#f7f5f1]">
      <div className="bg-white border-b border-[#e8e4dd] px-8 py-4">
        <div className="max-w-3xl mx-auto flex items-center gap-4">
          <Link href="/clientes/potenciales" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Volver
          </Link>
          <span className="text-gray-300">/</span>
          <span className="text-sm font-medium text-gray-900">Nuevo cliente</span>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-8 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Datos básicos */}
          <div className="bg-white rounded-xl border border-[#e8e4dd] p-6">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Datos básicos</h2>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="sh-label">Nombre de la agencia *</label>
                <input value={form.nombre_agencia} onChange={e => set('nombre_agencia', e.target.value)}
                  className="sh-input" placeholder="Ej: KE Adventure Travel" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="sh-label">Tipo</label>
                  <select value={form.tipo} onChange={e => set('tipo', e.target.value)} className="sh-select">
                    <option value="potencial">Potencial</option>
                    <option value="actual">Actual</option>
                  </select>
                </div>
                <div>
                  <label className="sh-label">Estado</label>
                  <select value={form.estado} onChange={e => set('estado', e.target.value)} className="sh-select">
                    {Object.entries(ESTADOS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Área */}
          <div className="bg-white rounded-xl border border-[#e8e4dd] p-6">
            <h2 className="text-sm font-semibold text-gray-900 mb-1">Área *</h2>
            <p className="text-xs text-gray-400 mb-4">Puede pertenecer a más de un área</p>
            <div className="flex flex-wrap gap-2">
              {AREAS.map(a => (
                <button key={a} type="button" onClick={() => toggleArea(a)}
                  className={`px-3 py-2 rounded-lg text-sm border transition-colors ${
                    form.area.includes(a)
                      ? 'bg-brand-500 text-white border-brand-500'
                      : 'bg-white text-gray-600 border-[#e8e4dd] hover:border-brand-300'
                  }`}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>

          {/* Contacto / localización */}
          <div className="bg-white rounded-xl border border-[#e8e4dd] p-6">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Localización y datos comerciales</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="sh-label">País</label>
                <input value={form.pais} onChange={e => set('pais', e.target.value)} className="sh-input" placeholder="Ej: United Kingdom" />
              </div>
              <div>
                <label className="sh-label">Idioma</label>
                <select value={form.idioma} onChange={e => set('idioma', e.target.value)} className="sh-select">
                  <option value="">Sin especificar</option>
                  {IDIOMAS.map(i => <option key={i} value={i}>{i}</option>)}
                </select>
              </div>
              <div>
                <label className="sh-label">Sitio web</label>
                <input value={form.web} onChange={e => set('web', e.target.value)} className="sh-input" placeholder="https://..." />
              </div>
              <div>
                <label className="sh-label">Volumen</label>
                <select value={form.volumen} onChange={e => set('volumen', e.target.value)} className="sh-select">
                  <option value="">Sin especificar</option>
                  {VOLUMENES.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="sh-label">Vendedor asignado</label>
                <select value={form.vendedor_principal} onChange={e => set('vendedor_principal', e.target.value)} className="sh-select">
                  <option value="">Sin asignar</option>
                  {usuarios.map(u => <option key={u.id} value={u.id}>{u.nombre}</option>)}
                </select>
              </div>
              <div>
                <label className="sh-label">Perfil de agencia</label>
                <input value={form.perfil_agencia} onChange={e => set('perfil_agencia', e.target.value)} className="sh-input" placeholder="Ej: Luxury FIT" />
              </div>
              <div className="col-span-2">
                <label className="sh-label">Origen del contacto</label>
                <input value={form.origen_contacto} onChange={e => set('origen_contacto', e.target.value)} className="sh-input" placeholder="Ej: ATTA 2024, referido, web..." />
              </div>
            </div>

            {/* Flags */}
            <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-[#f0ede8]">
              {[
                { key: 'opera_family_travel', label: 'Opera Family Travel' },
                { key: 'tiene_dmc_arg', label: 'Ya tiene DMC Argentina' },
                { key: 'vende_arg_chile', label: 'Vende Argentina / Chile' },
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={(form as any)[key]} onChange={e => set(key, e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500" />
                  <span className="text-sm text-gray-700">{label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Notas */}
          <div className="bg-white rounded-xl border border-[#e8e4dd] p-6">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Notas e historial general</h2>
            <textarea value={form.notas} onChange={e => set('notas', e.target.value)}
              rows={4} className="sh-input text-sm resize-none"
              placeholder="Historia de la relación, contexto importante, observaciones..." />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{error}</p>
          )}

          <div className="flex gap-3 pb-8">
            <button type="submit" disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-60 shadow-sm"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Guardando...' : 'Guardar cliente'}
            </button>
            <Link href="/clientes/potenciales"
              className="px-6 py-2.5 text-sm text-gray-600 border border-[#e8e4dd] rounded-lg hover:bg-white transition-colors"
            >
              Cancelar
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
