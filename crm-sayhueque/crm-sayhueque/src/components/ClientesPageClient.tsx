'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Cliente, ClienteArea, ClienteEstado, AREAS, ESTADOS_LABELS } from '@/types'
import { cn, daysSinceContact, formatRelativeTime, contactUrgencyBg } from '@/lib/utils'
import { Search, Plus, Filter, Globe, ChevronRight, Star, User } from 'lucide-react'

const AREA_COLORS: Record<ClienteArea, string> = {
  'DMC Grupos':       'bg-purple-50 text-purple-700 border-purple-200',
  'DMC FITs / CRAFT': 'bg-blue-50 text-blue-700 border-blue-200',
  'Aliwen':           'bg-teal-50 text-teal-700 border-teal-200',
  'Plataformas / Web':'bg-orange-50 text-orange-700 border-orange-200',
}

const ESTADO_COLORS: Record<ClienteEstado, string> = {
  cliente_frecuente:  'bg-green-50 text-green-700 border-green-200',
  cliente_esporadico: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  ex_cliente:         'bg-red-50 text-red-700 border-red-200',
  open:               'bg-gray-100 text-gray-600 border-gray-200',
  en_desarrollo:      'bg-blue-50 text-blue-700 border-blue-200',
}

interface Props {
  clientes: (Cliente & { vendedor?: { nombre: string } | null })[]
  tipo: 'actual' | 'potencial'
  usuarios: { id: string; nombre: string }[]
}

export default function ClientesPageClient({ clientes, tipo, usuarios }: Props) {
  const [search, setSearch] = useState('')
  const [filterArea, setFilterArea] = useState<string>('')
  const [filterVendedor, setFilterVendedor] = useState<string>('')
  const [filterEstado, setFilterEstado] = useState<string>('')
  const [sortBy, setSortBy] = useState<'nombre' | 'ultimo_contacto' | 'pais'>('nombre')

  const filtered = useMemo(() => {
    let result = clientes

    if (search) {
      const q = search.toLowerCase()
      result = result.filter(c =>
        c.nombre_agencia.toLowerCase().includes(q) ||
        c.pais?.toLowerCase().includes(q) ||
        c.vendedor?.nombre.toLowerCase().includes(q)
      )
    }
    if (filterArea) result = result.filter(c => c.area.includes(filterArea as ClienteArea))
    if (filterVendedor) result = result.filter(c => c.vendedor_principal === filterVendedor)
    if (filterEstado) result = result.filter(c => c.estado === filterEstado)

    result = [...result].sort((a, b) => {
      if (sortBy === 'nombre') return a.nombre_agencia.localeCompare(b.nombre_agencia)
      if (sortBy === 'ultimo_contacto') {
        if (!a.ultimo_contacto) return 1
        if (!b.ultimo_contacto) return -1
        return new Date(a.ultimo_contacto).getTime() - new Date(b.ultimo_contacto).getTime()
      }
      if (sortBy === 'pais') return (a.pais ?? '').localeCompare(b.pais ?? '')
      return 0
    })

    return result
  }, [clientes, search, filterArea, filterVendedor, filterEstado, sortBy])

  const hasFilters = search || filterArea || filterVendedor || filterEstado

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            {tipo === 'actual' ? 'Clientes actuales' : 'Clientes potenciales'}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">{filtered.length} de {clientes.length} agencias</p>
        </div>
        <Link
          href="/clientes/nuevo"
          className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Nuevo cliente
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-[#e8e4dd] p-4 mb-5">
        <div className="flex flex-wrap gap-3 items-center">
          {/* Search */}
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar agencia, país..."
              className="sh-input pl-8 text-sm"
            />
          </div>

          {/* Área */}
          <select value={filterArea} onChange={e => setFilterArea(e.target.value)} className="sh-select w-auto text-sm min-w-36">
            <option value="">Todas las áreas</option>
            {AREAS.map(a => <option key={a} value={a}>{a}</option>)}
          </select>

          {/* Vendedor */}
          <select value={filterVendedor} onChange={e => setFilterVendedor(e.target.value)} className="sh-select w-auto text-sm min-w-36">
            <option value="">Todos los vendedores</option>
            {usuarios.map(u => <option key={u.id} value={u.id}>{u.nombre}</option>)}
          </select>

          {tipo === 'actual' && (
            <select value={filterEstado} onChange={e => setFilterEstado(e.target.value)} className="sh-select w-auto text-sm min-w-40">
              <option value="">Todos los estados</option>
              {Object.entries(ESTADOS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          )}

          {/* Ordenar */}
          <select value={sortBy} onChange={e => setSortBy(e.target.value as any)} className="sh-select w-auto text-sm min-w-36">
            <option value="nombre">Ordenar: Nombre</option>
            <option value="ultimo_contacto">Ordenar: Sin contacto</option>
            <option value="pais">Ordenar: País</option>
          </select>

          {hasFilters && (
            <button
              onClick={() => { setSearch(''); setFilterArea(''); setFilterVendedor(''); setFilterEstado('') }}
              className="text-xs text-gray-400 hover:text-red-500 transition-colors px-2 py-1 rounded"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-[#e8e4dd] overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <Filter className="w-8 h-8 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">No hay clientes con esos filtros</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#f0ede8] bg-[#faf8f5]">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Agencia</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Área</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">País</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Vendedor</th>
                {tipo === 'actual' && (
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Último contacto</th>
                )}
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Estado</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f7f5f1]">
              {filtered.map(c => {
                const days = daysSinceContact(c.ultimo_contacto)
                return (
                  <tr key={c.id} className="hover:bg-[#faf8f5] transition-colors group">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center shrink-0">
                          <span className="text-xs font-semibold text-brand-700">
                            {c.nombre_agencia.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 leading-tight">{c.nombre_agencia}</p>
                          {c.volumen && (
                            <span className="text-[10px] text-gray-400">{c.volumen}</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {c.area.slice(0, 2).map(a => (
                          <span key={a} className={cn('badge border', AREA_COLORS[a as ClienteArea] ?? 'bg-gray-100 text-gray-600')}>
                            {a}
                          </span>
                        ))}
                        {c.area.length > 2 && (
                          <span className="badge bg-gray-100 text-gray-500">+{c.area.length - 2}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 text-gray-600">
                        <Globe className="w-3 h-3 text-gray-400" />
                        <span>{c.pais ?? '—'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 text-gray-600">
                        <User className="w-3 h-3 text-gray-400" />
                        <span>{(c.vendedor as any)?.nombre ?? '—'}</span>
                      </div>
                    </td>
                    {tipo === 'actual' && (
                      <td className="px-4 py-3">
                        <div>
                          <span className={cn('badge border text-[11px]', contactUrgencyBg(days))}>
                            {days === null ? 'Sin contacto' : days === 0 ? 'Hoy' : `${days}d`}
                          </span>
                          {c.ultimo_contacto_descripcion && (
                            <p className="text-[11px] text-gray-400 mt-0.5">{c.ultimo_contacto_descripcion}</p>
                          )}
                        </div>
                      </td>
                    )}
                    <td className="px-4 py-3">
                      <span className={cn('badge border text-[11px]',
                        ESTADO_COLORS[c.estado] ?? 'bg-gray-100 text-gray-600'
                      )}>
                        {ESTADOS_LABELS[c.estado] ?? c.estado}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/clientes/${c.id}`}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 flex items-center"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
