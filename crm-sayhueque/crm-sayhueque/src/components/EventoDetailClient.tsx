'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Evento, EventoCliente, EventoClienteEstado, ClienteArea } from '@/types'
import { cn, formatDate, formatRelativeTime } from '@/lib/utils'
import {
  ArrowLeft, Plus, Search, MapPin, CalendarDays, Users,
  Check, Clock, X, ChevronDown, ChevronUp, Send,
  CheckCircle2, AlertTriangle, Edit3, Trash2, Flag
} from 'lucide-react'

const ESTADO_CONFIG: Record<EventoClienteEstado, { label: string; color: string; icon: any }> = {
  pendiente:   { label: 'Pendiente',  color: 'bg-gray-100 text-gray-600 border-gray-200',   icon: Clock },
  confirmado:  { label: 'Confirmado', color: 'bg-blue-50 text-blue-700 border-blue-200',   icon: Check },
  visitado:    { label: 'Visitado',   color: 'bg-green-50 text-green-700 border-green-200', icon: CheckCircle2 },
  cancelado:   { label: 'Cancelado',  color: 'bg-red-50 text-red-700 border-red-200',       icon: X },
}

const AREA_COLORS: Record<ClienteArea, string> = {
  'DMC Grupos':       'bg-purple-50 text-purple-700',
  'DMC FITs / CRAFT': 'bg-blue-50 text-blue-700',
  'Aliwen':           'bg-teal-50 text-teal-700',
  'Plataformas / Web':'bg-orange-50 text-orange-700',
}

interface Props {
  evento: Evento & { creador?: { nombre: string } | null }
  agenda: (EventoCliente & { cliente?: any; contacto?: any })[]
  todosClientes: any[]
  currentUserId: string
}

export default function EventoDetailClient({ evento, agenda, todosClientes, currentUserId }: Props) {
  const router = useRouter()
  const supabase = createClient()

  const [localAgenda, setLocalAgenda] = useState(agenda)
  const [showAddCliente, setShowAddCliente] = useState(false)
  const [searchCliente, setSearchCliente] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editData, setEditData] = useState<Partial<EventoCliente>>({})
  const [closingEvento, setClosingEvento] = useState(false)
  const [confirmClose, setConfirmClose] = useState(false)

  const clientesEnAgenda = new Set(localAgenda.map(e => e.cliente_id))
  const clientesFiltrados = useMemo(() => {
    if (!searchCliente) return []
    const q = searchCliente.toLowerCase()
    return todosClientes.filter(c =>
      !clientesEnAgenda.has(c.id) &&
      (c.nombre_agencia.toLowerCase().includes(q) || c.pais?.toLowerCase().includes(q))
    ).slice(0, 8)
  }, [searchCliente, todosClientes, clientesEnAgenda])

  async function agregarCliente(cliente: any, contactoId?: string) {
    const { data, error } = await supabase
      .from('evento_clientes')
      .insert({
        evento_id: evento.id,
        cliente_id: cliente.id,
        contacto_id: contactoId ?? null,
        estado: 'pendiente',
        prioridad: localAgenda.length + 1,
      })
      .select(`
        *,
        cliente:clientes!cliente_id(id, nombre_agencia, pais, area, tipo),
        contacto:contactos!contacto_id(id, nombre, apellido, cargo, email)
      `)
      .single()

    if (!error && data) {
      setLocalAgenda(prev => [...prev, data])
      setSearchCliente('')
    }
  }

  async function updateEstadoEC(ecId: string, estado: EventoClienteEstado) {
    await supabase.from('evento_clientes').update({ estado }).eq('id', ecId)
    setLocalAgenda(prev => prev.map(ec => ec.id === ecId ? { ...ec, estado } : ec))
  }

  async function saveEditEC(ecId: string) {
    const { data } = await supabase
      .from('evento_clientes')
      .update(editData)
      .eq('id', ecId)
      .select('*')
      .single()
    if (data) setLocalAgenda(prev => prev.map(ec => ec.id === ecId ? { ...ec, ...editData } : ec))
    setEditingId(null)
    setEditData({})
  }

  async function removeFromAgenda(ecId: string) {
    if (!confirm('¿Quitar este cliente de la agenda?')) return
    await supabase.from('evento_clientes').delete().eq('id', ecId)
    setLocalAgenda(prev => prev.filter(ec => ec.id !== ecId))
  }

  async function cerrarEvento() {
    setClosingEvento(true)
    const { error } = await supabase.rpc('cerrar_evento', { p_evento_id: evento.id })
    if (error) { alert('Error al cerrar: ' + error.message); setClosingEvento(false); return }
    router.refresh()
    setConfirmClose(false)
    setClosingEvento(false)
  }

  const visitados = localAgenda.filter(e => e.estado === 'visitado').length
  const total = localAgenda.length

  const estadoStyle = {
    planificacion: 'bg-blue-50 text-blue-700 border-blue-200',
    en_curso:      'bg-green-50 text-green-700 border-green-200',
    finalizado:    'bg-gray-100 text-gray-500 border-gray-200',
  }

  return (
    <div className="min-h-screen bg-[#f7f5f1]">
      {/* Top bar */}
      <div className="bg-white border-b border-[#e8e4dd] px-8 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/eventos" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors">
              <ArrowLeft className="w-4 h-4" />
              Eventos
            </Link>
            <span className="text-gray-300">/</span>
            <span className="text-sm font-medium text-gray-900">{evento.nombre}</span>
          </div>
          {evento.estado !== 'finalizado' && (
            <button onClick={() => setConfirmClose(true)}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <CheckCircle2 className="w-4 h-4" />
              Cerrar evento
            </button>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-8 py-6 space-y-6">
        {/* Header */}
        <div className="bg-white rounded-xl border border-[#e8e4dd] p-6">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-xl font-semibold text-gray-900">{evento.nombre}</h1>
                <span className={cn('badge border text-xs',
                  estadoStyle[evento.estado as keyof typeof estadoStyle]
                )}>
                  {evento.estado === 'planificacion' ? 'Planificación' : evento.estado === 'en_curso' ? 'En curso' : 'Finalizado'}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                {evento.lugar && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{evento.lugar}</span>}
                {evento.fecha_inicio && (
                  <span className="flex items-center gap-1">
                    <CalendarDays className="w-3.5 h-3.5" />
                    {formatDate(evento.fecha_inicio)}{evento.fecha_fin ? ` → ${formatDate(evento.fecha_fin)}` : ''}
                  </span>
                )}
                <span className="flex items-center gap-1 capitalize"><Flag className="w-3.5 h-3.5" />{evento.tipo}</span>
              </div>
              {evento.descripcion && <p className="text-sm text-gray-600 mt-2">{evento.descripcion}</p>}
            </div>

            {/* Stats */}
            <div className="flex gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">{total}</p>
                <p className="text-xs text-gray-500">En agenda</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{visitados}</p>
                <p className="text-xs text-gray-500">Visitados</p>
              </div>
              {total > 0 && (
                <div className="text-center">
                  <p className="text-2xl font-bold text-brand-600">{Math.round((visitados / total) * 100)}%</p>
                  <p className="text-xs text-gray-500">Completado</p>
                </div>
              )}
            </div>
          </div>

          {/* Progress bar */}
          {total > 0 && (
            <div className="mt-4 bg-gray-100 rounded-full h-1.5">
              <div
                className="bg-green-500 h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${(visitados / total) * 100}%` }}
              />
            </div>
          )}
        </div>

        {/* Agregar cliente */}
        {evento.estado !== 'finalizado' && (
          <div className="bg-white rounded-xl border border-[#e8e4dd] p-4">
            <div className="relative">
              <div className="flex items-center gap-3">
                <Search className="w-4 h-4 text-gray-400 shrink-0" />
                <input
                  value={searchCliente}
                  onChange={e => setSearchCliente(e.target.value)}
                  placeholder="Buscar cliente para agregar a la agenda..."
                  className="flex-1 text-sm outline-none placeholder:text-gray-400"
                />
                {searchCliente && (
                  <button onClick={() => setSearchCliente('')} className="text-gray-400 hover:text-gray-600">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              {clientesFiltrados.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-2 z-20 bg-white rounded-xl border border-[#e8e4dd] shadow-lg overflow-hidden animate-slide-up">
                  {clientesFiltrados.map((c: any) => (
                    <div key={c.id} className="px-4 py-3 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{c.nombre_agencia}</p>
                          <p className="text-xs text-gray-400">{c.pais} · {c.tipo}</p>
                        </div>
                        <div className="flex gap-2">
                          {/* Si tiene contactos, mostrar opción de elegir */}
                          {c.contactos?.slice(0, 3).map((ct: any) => (
                            <button key={ct.id}
                              onClick={() => agregarCliente(c, ct.id)}
                              className="text-xs px-2 py-1 bg-brand-50 text-brand-700 rounded-lg hover:bg-brand-100 transition-colors"
                            >
                              + {ct.nombre} {ct.apellido ?? ''}
                            </button>
                          ))}
                          <button onClick={() => agregarCliente(c)}
                            className="text-xs px-3 py-1 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Agenda list */}
        <div className="space-y-2">
          {localAgenda.length === 0 ? (
            <div className="bg-white rounded-xl border border-[#e8e4dd] py-16 text-center">
              <Users className="w-8 h-8 text-gray-200 mx-auto mb-3" />
              <p className="text-sm text-gray-500 font-medium">La agenda está vacía</p>
              <p className="text-xs text-gray-400 mt-1">Buscá clientes arriba para agregarlos</p>
            </div>
          ) : (
            localAgenda.map(ec => {
              const isExpanded = expandedId === ec.id
              const isEditing = editingId === ec.id
              const EcIcon = ESTADO_CONFIG[ec.estado].icon

              return (
                <div key={ec.id} className={cn(
                  'bg-white rounded-xl border transition-all duration-150',
                  ec.estado === 'visitado' ? 'border-green-200' : 'border-[#e8e4dd]'
                )}>
                  {/* Main row */}
                  <div className="flex items-center gap-3 px-4 py-3">
                    {/* Prioridad */}
                    <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500 shrink-0">
                      {ec.prioridad}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link href={`/clientes/${ec.cliente_id}`}
                          className="text-sm font-semibold text-gray-900 hover:text-brand-600 transition-colors"
                        >
                          {ec.cliente?.nombre_agencia}
                        </Link>
                        {ec.cliente?.pais && <span className="text-xs text-gray-400">{ec.cliente.pais}</span>}
                        {ec.cliente?.area?.slice(0, 1).map((a: ClienteArea) => (
                          <span key={a} className={cn('badge text-[10px]', AREA_COLORS[a] ?? 'bg-gray-100 text-gray-500')}>{a}</span>
                        ))}
                      </div>
                      {ec.contacto && (
                        <p className="text-xs text-gray-500 mt-0.5">
                          {ec.contacto.nombre} {ec.contacto.apellido ?? ''} {ec.contacto.cargo ? `· ${ec.contacto.cargo}` : ''}
                          {ec.contacto.email && <span className="text-brand-600 ml-1">· {ec.contacto.email}</span>}
                        </p>
                      )}
                      {ec.fecha_reunion && (
                        <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDate(ec.fecha_reunion, 'dd/MM HH:mm')}
                        </p>
                      )}
                    </div>

                    {/* Estado selector */}
                    <div className="flex items-center gap-1.5">
                      {(Object.keys(ESTADO_CONFIG) as EventoClienteEstado[]).map(s => {
                        const cfg = ESTADO_CONFIG[s]
                        const Icon = cfg.icon
                        return (
                          <button key={s}
                            onClick={() => updateEstadoEC(ec.id, s)}
                            title={cfg.label}
                            className={cn(
                              'p-1.5 rounded-lg border transition-colors',
                              ec.estado === s ? cn(cfg.color, 'border') : 'border-transparent text-gray-300 hover:text-gray-500 hover:bg-gray-50'
                            )}
                          >
                            <Icon className="w-3.5 h-3.5" />
                          </button>
                        )
                      })}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1">
                      <button onClick={() => { setExpandedId(isExpanded ? null : ec.id); setEditingId(null) }}
                        className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                      {evento.estado !== 'finalizado' && (
                        <button onClick={() => removeFromAgenda(ec.id)}
                          className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Expanded: notas */}
                  {isExpanded && (
                    <div className="border-t border-[#f0ede8] px-4 py-4 animate-slide-up">
                      {isEditing ? (
                        <div className="space-y-3">
                          <div>
                            <label className="sh-label">Fecha y hora de reunión</label>
                            <input type="datetime-local"
                              value={editData.fecha_reunion ?? ec.fecha_reunion ?? ''}
                              onChange={e => setEditData(p => ({ ...p, fecha_reunion: e.target.value }))}
                              className="sh-input text-sm"
                            />
                          </div>
                          <div>
                            <label className="sh-label">Wish list / Qué le interesa</label>
                            <input value={editData.wish_list ?? ec.wish_list ?? ''}
                              onChange={e => setEditData(p => ({ ...p, wish_list: e.target.value }))}
                              className="sh-input text-sm" placeholder="Destinos, productos, servicios..." />
                          </div>
                          <div>
                            <label className="sh-label">Notas previas (prep)</label>
                            <textarea value={editData.notas_previas ?? ec.notas_previas ?? ''}
                              onChange={e => setEditData(p => ({ ...p, notas_previas: e.target.value }))}
                              rows={2} className="sh-input text-sm resize-none" placeholder="Qué queremos hablar, contexto previo..." />
                          </div>
                          <div>
                            <label className="sh-label">Resumen de la reunión</label>
                            <textarea value={editData.resumen_reunion ?? ec.resumen_reunion ?? ''}
                              onChange={e => setEditData(p => ({ ...p, resumen_reunion: e.target.value }))}
                              rows={3} className="sh-input text-sm resize-none" placeholder="Qué se habló, qué surgió, próximos pasos..." />
                          </div>
                          <div>
                            <label className="sh-label">Acciones de follow-up</label>
                            <textarea value={editData.acciones_followup ?? ec.acciones_followup ?? ''}
                              onChange={e => setEditData(p => ({ ...p, acciones_followup: e.target.value }))}
                              rows={2} className="sh-input text-sm resize-none" placeholder="Qué hay que hacer después..." />
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => saveEditEC(ec.id)}
                              className="flex items-center gap-1.5 px-4 py-2 bg-brand-500 text-white text-sm rounded-lg hover:bg-brand-600 transition-colors"
                            >
                              <Check className="w-3.5 h-3.5" />
                              Guardar notas
                            </button>
                            <button onClick={() => { setEditingId(null); setEditData({}) }}
                              className="px-4 py-2 text-sm text-gray-600 border border-[#e8e4dd] rounded-lg hover:bg-gray-50 transition-colors"
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {[
                            { label: 'Wish list', value: ec.wish_list },
                            { label: 'Notas previas', value: ec.notas_previas },
                            { label: 'Resumen reunión', value: ec.resumen_reunion },
                            { label: 'Follow-up', value: ec.acciones_followup },
                          ].map(({ label, value }) => value ? (
                            <div key={label}>
                              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">{label}</p>
                              <p className="text-sm text-gray-700 whitespace-pre-wrap">{value}</p>
                            </div>
                          ) : null)}
                          {!ec.wish_list && !ec.notas_previas && !ec.resumen_reunion && !ec.acciones_followup && (
                            <p className="text-sm text-gray-400 italic">Sin notas cargadas</p>
                          )}
                          {evento.estado !== 'finalizado' && (
                            <button
                              onClick={() => { setEditingId(ec.id); setEditData({}) }}
                              className="flex items-center gap-1.5 text-xs text-brand-600 hover:text-brand-700 font-medium mt-1"
                            >
                              <Edit3 className="w-3 h-3" />
                              {ec.wish_list || ec.notas_previas || ec.resumen_reunion ? 'Editar notas' : 'Agregar notas'}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Modal confirmar cierre */}
      {confirmClose && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl border border-[#e8e4dd] p-6 max-w-md w-full shadow-xl animate-slide-up">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Cerrar evento</h3>
                <p className="text-sm text-gray-600">
                  Al cerrar <strong>{evento.nombre}</strong>, todos los clientes marcados como{' '}
                  <strong>visitados ({visitados})</strong> se actualizarán con la fecha y evento como último contacto.
                  Esta acción no se puede deshacer.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={cerrarEvento} disabled={closingEvento}
                className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-60"
              >
                {closingEvento ? 'Cerrando...' : `Confirmar — actualizar ${visitados} clientes`}
              </button>
              <button onClick={() => setConfirmClose(false)}
                className="px-4 py-2.5 text-sm text-gray-600 border border-[#e8e4dd] rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
