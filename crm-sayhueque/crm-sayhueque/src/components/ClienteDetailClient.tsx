'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {
  Cliente, Contacto, Comentario, EventoCliente,
  AREAS, ESTADOS_LABELS, COMENTARIO_TIPO_LABELS,
  ClienteArea, ClienteEstado, ComentarioTipo
} from '@/types'
import { cn, formatDate, formatRelativeTime, daysSinceContact, contactUrgencyBg, getInitials } from '@/lib/utils'
import {
  ArrowLeft, Globe, Mail, Phone, User, Plus, Send,
  Edit2, Star, Users, CalendarDays, MessageSquare,
  ChevronDown, Check, Briefcase, Trash2, ExternalLink
} from 'lucide-react'

const AREA_COLORS: Record<ClienteArea, string> = {
  'DMC Grupos':       'bg-purple-50 text-purple-700 border-purple-200',
  'DMC FITs / CRAFT': 'bg-blue-50 text-blue-700 border-blue-200',
  'Aliwen':           'bg-teal-50 text-teal-700 border-teal-200',
  'Plataformas / Web':'bg-orange-50 text-orange-700 border-orange-200',
}

const TIPO_ICONS: Record<ComentarioTipo, string> = {
  general: '💬', seguimiento: '🔄', reunion: '🤝',
  email: '📧', llamada: '📞', whatsapp: '💚'
}

interface Props {
  cliente: Cliente & { vendedor?: { id: string; nombre: string } | null }
  contactos: Contacto[]
  comentarios: (Comentario & { usuario?: { nombre: string } | null; evento?: { id: string; nombre: string } | null })[]
  eventosParticipados: (EventoCliente & { evento?: any })[]
  usuarios: { id: string; nombre: string }[]
  currentUserId: string
}

type Tab = 'comentarios' | 'contactos' | 'eventos'

export default function ClienteDetailClient({
  cliente, contactos, comentarios, eventosParticipados, usuarios, currentUserId
}: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [tab, setTab] = useState<Tab>('comentarios')

  // Comentario nuevo
  const [nuevoComentario, setNuevoComentario] = useState('')
  const [tipoComentario, setTipoComentario] = useState<ComentarioTipo>('general')
  const [savingComment, setSavingComment] = useState(false)

  // Contacto nuevo
  const [showContactoForm, setShowContactoForm] = useState(false)
  const [nuevoContacto, setNuevoContacto] = useState({ nombre: '', apellido: '', cargo: '', email: '', telefono: '' })
  const [savingContacto, setSavingContacto] = useState(false)

  // Edit estado / tipo
  const [editingEstado, setEditingEstado] = useState(false)

  // State local para reflejar cambios optimistas
  const [localComentarios, setLocalComentarios] = useState(comentarios)
  const [localContactos, setLocalContactos] = useState(contactos)

  const days = daysSinceContact(cliente.ultimo_contacto)

  async function submitComentario() {
    if (!nuevoComentario.trim()) return
    setSavingComment(true)
    const { data, error } = await supabase
      .from('comentarios')
      .insert({
        cliente_id: cliente.id,
        usuario_id: currentUserId,
        contenido: nuevoComentario.trim(),
        tipo: tipoComentario,
      })
      .select('*, usuario:usuarios!usuario_id(id, nombre)')
      .single()

    if (!error && data) {
      setLocalComentarios(prev => [data, ...prev])
      // Actualizar ultimo_contacto del cliente
      await supabase.from('clientes').update({
        ultimo_contacto: new Date().toISOString(),
        ultimo_contacto_descripcion: COMENTARIO_TIPO_LABELS[tipoComentario],
      }).eq('id', cliente.id)
    }
    setNuevoComentario('')
    setSavingComment(false)
  }

  async function submitContacto() {
    if (!nuevoContacto.nombre.trim()) return
    setSavingContacto(true)
    const { data, error } = await supabase
      .from('contactos')
      .insert({
        cliente_id: cliente.id,
        created_by: currentUserId,
        es_principal: localContactos.length === 0,
        ...nuevoContacto,
      })
      .select('*')
      .single()

    if (!error && data) {
      setLocalContactos(prev => [...prev, data])
      setNuevoContacto({ nombre: '', apellido: '', cargo: '', email: '', telefono: '' })
      setShowContactoForm(false)
    }
    setSavingContacto(false)
  }

  async function toggleTipo() {
    const newTipo = cliente.tipo === 'actual' ? 'potencial' : 'actual'
    await supabase.from('clientes').update({ tipo: newTipo }).eq('id', cliente.id)
    router.refresh()
  }

  async function updateEstado(estado: ClienteEstado) {
    await supabase.from('clientes').update({ estado }).eq('id', cliente.id)
    setEditingEstado(false)
    router.refresh()
  }

  async function deleteContacto(id: string) {
    if (!confirm('¿Eliminar este contacto?')) return
    await supabase.from('contactos').update({ activo: false }).eq('id', id)
    setLocalContactos(prev => prev.filter(c => c.id !== id))
  }

  return (
    <div className="min-h-screen bg-[#f7f5f1]">
      {/* Top bar */}
      <div className="bg-white border-b border-[#e8e4dd] px-8 py-4">
        <div className="max-w-6xl mx-auto flex items-center gap-4">
          <Link href={`/clientes/${cliente.tipo === 'actual' ? 'actuales' : 'potenciales'}`}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {cliente.tipo === 'actual' ? 'Clientes actuales' : 'Clientes potenciales'}
          </Link>
          <span className="text-gray-300">/</span>
          <span className="text-sm font-medium text-gray-900">{cliente.nombre_agencia}</span>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* LEFT: Info panel */}
          <div className="space-y-4">
            {/* Header card */}
            <div className="bg-white rounded-xl border border-[#e8e4dd] p-5">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-brand-50 flex items-center justify-center">
                    <span className="text-lg font-bold text-brand-700">
                      {cliente.nombre_agencia.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <h1 className="text-lg font-semibold text-gray-900 leading-tight">{cliente.nombre_agencia}</h1>
                    {cliente.web && (
                      <a href={cliente.web.startsWith('http') ? cliente.web : `https://${cliente.web}`}
                        target="_blank" rel="noopener noreferrer"
                        className="text-xs text-brand-600 hover:underline flex items-center gap-1 mt-0.5"
                      >
                        <ExternalLink className="w-3 h-3" />
                        {cliente.web.replace(/^https?:\/\//, '')}
                      </a>
                    )}
                  </div>
                </div>
                <Link href={`/clientes/${cliente.id}/editar`}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                </Link>
              </div>

              {/* Tipo toggle */}
              <div className="flex gap-2 mb-4">
                <button onClick={toggleTipo}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border',
                    cliente.tipo === 'actual'
                      ? 'bg-brand-500 text-white border-brand-500'
                      : 'bg-white text-gray-600 border-[#e8e4dd] hover:border-brand-300'
                  )}
                >
                  <Star className="w-3 h-3" />
                  {cliente.tipo === 'actual' ? 'Cliente actual' : 'Potencial'}
                </button>
              </div>

              {/* Estado */}
              <div className="relative mb-3">
                <button onClick={() => setEditingEstado(!editingEstado)}
                  className="flex items-center gap-2 w-full text-left"
                >
                  <span className={cn('badge border text-xs', {
                    'bg-green-50 text-green-700 border-green-200': cliente.estado === 'cliente_frecuente',
                    'bg-yellow-50 text-yellow-700 border-yellow-200': cliente.estado === 'cliente_esporadico',
                    'bg-red-50 text-red-700 border-red-200': cliente.estado === 'ex_cliente',
                    'bg-gray-100 text-gray-600 border-gray-200': cliente.estado === 'open',
                    'bg-blue-50 text-blue-700 border-blue-200': cliente.estado === 'en_desarrollo',
                  })}>
                    {ESTADOS_LABELS[cliente.estado] ?? cliente.estado}
                  </span>
                  <ChevronDown className="w-3 h-3 text-gray-400" />
                </button>
                {editingEstado && (
                  <div className="absolute left-0 top-7 z-10 bg-white rounded-xl border border-[#e8e4dd] shadow-lg py-1 min-w-48 animate-slide-up">
                    {Object.entries(ESTADOS_LABELS).map(([k, v]) => (
                      <button key={k} onClick={() => updateEstado(k as ClienteEstado)}
                        className="flex items-center gap-2 w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors"
                      >
                        {cliente.estado === k && <Check className="w-3 h-3 text-brand-500" />}
                        <span className={cliente.estado === k ? 'font-medium' : ''}>{v}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Áreas */}
              <div className="flex flex-wrap gap-1.5">
                {cliente.area.map(a => (
                  <span key={a} className={cn('badge border text-xs', AREA_COLORS[a as ClienteArea] ?? 'bg-gray-100 text-gray-600')}>
                    {a}
                  </span>
                ))}
              </div>
            </div>

            {/* Info card */}
            <div className="bg-white rounded-xl border border-[#e8e4dd] p-5 space-y-3">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Información</h3>
              {[
                { icon: Globe, label: 'País', value: cliente.pais },
                { icon: Globe, label: 'Idioma', value: cliente.idioma },
                { icon: User, label: 'Vendedor', value: (cliente.vendedor as any)?.nombre },
                { icon: Briefcase, label: 'Volumen', value: cliente.volumen },
                { icon: Briefcase, label: 'Perfil', value: cliente.perfil_agencia },
                { icon: Briefcase, label: 'Origen', value: cliente.origen_contacto },
              ].map(({ icon: Icon, label, value }) => value ? (
                <div key={label} className="flex items-start gap-2.5">
                  <Icon className="w-3.5 h-3.5 text-gray-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wide">{label}</p>
                    <p className="text-sm text-gray-700">{value}</p>
                  </div>
                </div>
              ) : null)}

              {/* Flags */}
              <div className="flex flex-wrap gap-2 pt-1">
                {cliente.opera_family_travel && (
                  <span className="badge bg-pink-50 text-pink-700 border border-pink-200">Family travel ✓</span>
                )}
                {cliente.tiene_dmc_arg && (
                  <span className="badge bg-gray-100 text-gray-600">Tiene DMC ARG</span>
                )}
              </div>
            </div>

            {/* Último contacto */}
            <div className={cn('rounded-xl border p-4', contactUrgencyBg(days))}>
              <p className="text-xs font-semibold uppercase tracking-wide mb-1">Último contacto</p>
              <p className="text-sm font-medium">
                {cliente.ultimo_contacto ? formatRelativeTime(cliente.ultimo_contacto) : 'Sin contacto registrado'}
              </p>
              {cliente.ultimo_contacto_descripcion && (
                <p className="text-xs opacity-70 mt-0.5">vía {cliente.ultimo_contacto_descripcion}</p>
              )}
              {cliente.ultimo_contacto && (
                <p className="text-xs opacity-60 mt-0.5">{formatDate(cliente.ultimo_contacto, 'dd/MM/yyyy')}</p>
              )}
            </div>

            {/* Notas generales */}
            {cliente.notas && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-2">Notas</p>
                <p className="text-sm text-amber-800 leading-relaxed whitespace-pre-wrap">{cliente.notas}</p>
              </div>
            )}
          </div>

          {/* RIGHT: Tabs */}
          <div className="lg:col-span-2 space-y-4">
            {/* Tab headers */}
            <div className="bg-white rounded-xl border border-[#e8e4dd] overflow-hidden">
              <div className="flex border-b border-[#e8e4dd]">
                {([
                  { key: 'comentarios', label: 'Historial', icon: MessageSquare, count: localComentarios.length },
                  { key: 'contactos', label: 'Contactos', icon: User, count: localContactos.length },
                  { key: 'eventos', label: 'Eventos', icon: CalendarDays, count: eventosParticipados.length },
                ] as const).map(({ key, label, icon: Icon, count }) => (
                  <button key={key} onClick={() => setTab(key)}
                    className={cn(
                      'flex items-center gap-2 px-5 py-3.5 text-sm font-medium transition-colors border-b-2',
                      tab === key
                        ? 'border-brand-500 text-brand-600 bg-brand-50/50'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                    )}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {label}
                    <span className={cn(
                      'ml-0.5 text-xs px-1.5 py-0.5 rounded-full',
                      tab === key ? 'bg-brand-100 text-brand-700' : 'bg-gray-100 text-gray-500'
                    )}>{count}</span>
                  </button>
                ))}
              </div>

              {/* TAB: COMENTARIOS */}
              {tab === 'comentarios' && (
                <div>
                  {/* Nuevo comentario */}
                  <div className="p-4 border-b border-[#f0ede8] bg-[#faf8f5]">
                    <div className="flex gap-2 mb-2">
                      {(Object.keys(COMENTARIO_TIPO_LABELS) as ComentarioTipo[]).map(t => (
                        <button key={t} onClick={() => setTipoComentario(t)}
                          className={cn(
                            'flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs transition-colors',
                            tipoComentario === t
                              ? 'bg-brand-500 text-white'
                              : 'bg-white text-gray-600 border border-[#e8e4dd] hover:border-brand-300'
                          )}
                        >
                          <span>{TIPO_ICONS[t]}</span>
                          {COMENTARIO_TIPO_LABELS[t]}
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <textarea
                        value={nuevoComentario}
                        onChange={e => setNuevoComentario(e.target.value)}
                        placeholder="Agregar nota, seguimiento, resultado de reunión..."
                        rows={2}
                        className="sh-input text-sm resize-none flex-1"
                        onKeyDown={e => { if (e.key === 'Enter' && e.metaKey) submitComentario() }}
                      />
                      <button
                        onClick={submitComentario}
                        disabled={!nuevoComentario.trim() || savingComment}
                        className="self-end px-3 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1">⌘ + Enter para guardar</p>
                  </div>

                  {/* Lista comentarios */}
                  <div className="divide-y divide-[#f7f5f1] max-h-[500px] overflow-y-auto">
                    {localComentarios.length === 0 && (
                      <p className="py-10 text-center text-sm text-gray-400">No hay registros aún. ¡Agregá el primer comentario!</p>
                    )}
                    {localComentarios.map((c: any) => (
                      <div key={c.id} className="px-5 py-4 hover:bg-[#faf8f5] transition-colors">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center shrink-0 text-xs font-medium text-gray-600">
                              {getInitials(c.usuario?.nombre ?? 'U')}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <span className="text-xs font-semibold text-gray-700">{c.usuario?.nombre ?? 'Usuario'}</span>
                                <span className="text-[10px] text-gray-400">{formatRelativeTime(c.created_at)}</span>
                                <span className="text-[11px]">{TIPO_ICONS[c.tipo as ComentarioTipo]}</span>
                                {c.evento && (
                                  <Link href={`/eventos/${c.evento.id}`}
                                    className="badge bg-blue-50 text-blue-600 border border-blue-200 text-[10px] hover:underline"
                                  >
                                    {c.evento.nombre}
                                  </Link>
                                )}
                              </div>
                              <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{c.contenido}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB: CONTACTOS */}
              {tab === 'contactos' && (
                <div>
                  <div className="divide-y divide-[#f7f5f1]">
                    {localContactos.length === 0 && !showContactoForm && (
                      <p className="py-10 text-center text-sm text-gray-400">No hay contactos cargados</p>
                    )}
                    {localContactos.map(c => (
                      <div key={c.id} className="px-5 py-4 hover:bg-[#faf8f5] transition-colors group">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-full bg-earth-100 flex items-center justify-center shrink-0">
                              <span className="text-sm font-semibold text-earth-700">
                                {getInitials(c.nombre, c.apellido)}
                              </span>
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-semibold text-gray-900">
                                  {c.nombre} {c.apellido ?? ''}
                                </p>
                                {c.es_principal && (
                                  <span className="badge bg-brand-50 text-brand-700 border border-brand-200 text-[10px]">Principal</span>
                                )}
                              </div>
                              {c.cargo && <p className="text-xs text-gray-500 mt-0.5">{c.cargo}</p>}
                              <div className="flex flex-wrap gap-3 mt-2">
                                {c.email && (
                                  <a href={`mailto:${c.email}`}
                                    className="flex items-center gap-1 text-xs text-brand-600 hover:underline"
                                  >
                                    <Mail className="w-3 h-3" />
                                    {c.email}
                                  </a>
                                )}
                                {c.telefono && (
                                  <a href={`tel:${c.telefono}`}
                                    className="flex items-center gap-1 text-xs text-gray-600 hover:underline"
                                  >
                                    <Phone className="w-3 h-3" />
                                    {c.telefono}
                                  </a>
                                )}
                              </div>
                              {c.notas && <p className="text-xs text-gray-500 mt-1.5 italic">{c.notas}</p>}
                            </div>
                          </div>
                          <button onClick={() => deleteContacto(c.id)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-gray-400 hover:text-red-500 rounded"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Form nuevo contacto */}
                  {showContactoForm ? (
                    <div className="p-5 border-t border-[#e8e4dd] bg-[#faf8f5] animate-slide-up">
                      <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-3">Nuevo contacto</h4>
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        {[
                          { key: 'nombre', placeholder: 'Nombre *', required: true },
                          { key: 'apellido', placeholder: 'Apellido' },
                          { key: 'cargo', placeholder: 'Cargo / Puesto' },
                          { key: 'email', placeholder: 'Email' },
                          { key: 'telefono', placeholder: 'Teléfono' },
                        ].map(({ key, placeholder }) => (
                          <input key={key}
                            value={(nuevoContacto as any)[key]}
                            onChange={e => setNuevoContacto(prev => ({ ...prev, [key]: e.target.value }))}
                            placeholder={placeholder}
                            className="sh-input text-sm"
                          />
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <button onClick={submitContacto} disabled={savingContacto || !nuevoContacto.nombre.trim()}
                          className="flex items-center gap-1.5 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white text-sm rounded-lg transition-colors disabled:opacity-40"
                        >
                          <Check className="w-3.5 h-3.5" />
                          Guardar
                        </button>
                        <button onClick={() => setShowContactoForm(false)}
                          className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 border border-[#e8e4dd] rounded-lg hover:bg-white transition-colors"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 border-t border-[#f0ede8]">
                      <button onClick={() => setShowContactoForm(true)}
                        className="flex items-center gap-2 text-sm text-brand-600 hover:text-brand-700 font-medium"
                      >
                        <Plus className="w-4 h-4" />
                        Agregar contacto
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* TAB: EVENTOS */}
              {tab === 'eventos' && (
                <div className="divide-y divide-[#f7f5f1]">
                  {eventosParticipados.length === 0 && (
                    <p className="py-10 text-center text-sm text-gray-400">No participó en ningún evento aún</p>
                  )}
                  {eventosParticipados.map((ec: any) => (
                    <Link key={ec.id} href={`/eventos/${ec.evento.id}`}
                      className="flex items-start gap-4 px-5 py-4 hover:bg-[#faf8f5] transition-colors"
                    >
                      <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center shrink-0">
                        <CalendarDays className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-gray-900">{ec.evento.nombre}</p>
                          <span className={cn('badge text-[10px] border', {
                            'bg-green-50 text-green-700 border-green-200': ec.estado === 'visitado',
                            'bg-yellow-50 text-yellow-700 border-yellow-200': ec.estado === 'confirmado',
                            'bg-gray-100 text-gray-600 border-gray-200': ec.estado === 'pendiente',
                            'bg-red-50 text-red-700 border-red-200': ec.estado === 'cancelado',
                          })}>
                            {ec.estado}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5 capitalize">{ec.evento.tipo} · {formatDate(ec.evento.fecha_inicio)}</p>
                        {ec.resumen_reunion && (
                          <p className="text-xs text-gray-600 mt-1.5 line-clamp-2">{ec.resumen_reunion}</p>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
