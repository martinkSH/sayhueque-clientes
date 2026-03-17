'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { TrendingUp, TrendingDown, Minus, Search, ChevronRight, Filter } from 'lucide-react'

interface Cliente {
  id: string
  nombre_agencia: string
  tipo: string
  area: string[]
  pais: string | null
  estado: string
  volumen: string | null
  viajes_confirmados_2526: number
  viajes_cotizados_2526: number
  ultimo_contacto: string | null
  ultimo_contacto_descripcion: string | null
  vendedor: { id: string; nombre: string } | null
}

function calcRatio(conf: number, cot: number): number | null {
  const total = conf + cot
  if (total === 0) return null
  return Math.round((conf / total) * 100)
}

function nivelConversion(ratio: number | null, conf: number): 'alto' | 'medio' | 'bajo' | 'solo_cotizo' | 'sin_datos' {
  if (ratio === null) return conf > 0 ? 'alto' : 'sin_datos'
  if (conf === 0) return 'solo_cotizo'
  if (ratio >= 50) return 'alto'
  if (ratio >= 20) return 'medio'
  return 'bajo'
}

const NIVEL_CONFIG = {
  alto:       { label: 'Alto', color: 'bg-green-50 text-green-700 border-green-200', bar: 'bg-green-500' },
  medio:      { label: 'Medio', color: 'bg-yellow-50 text-yellow-700 border-yellow-200', bar: 'bg-yellow-400' },
  bajo:       { label: 'Bajo', color: 'bg-red-50 text-red-700 border-red-200', bar: 'bg-red-400' },
  solo_cotizo:{ label: 'Solo cotizó', color: 'bg-orange-50 text-orange-700 border-orange-200', bar: 'bg-orange-400' },
  sin_datos:  { label: 'Sin datos', color: 'bg-gray-100 text-gray-500 border-gray-200', bar: 'bg-gray-300' },
}

const AREA_SHORT: Record<string, string> = {
  'DMC Grupos': 'Grupos',
  'DMC FITs / CRAFT': 'FITs',
  'Aliwen': 'Aliwen',
  'Plataformas / Web': 'Plataformas',
}

export default function TemporadaClient({
  clientes, usuarios
}: {
  clientes: Cliente[]
  usuarios: { id: string; nombre: string }[]
}) {
  const [search, setSearch] = useState('')
  const [filterNivel, setFilterNivel] = useState('')
  const [filterArea, setFilterArea] = useState('')
  const [filterVendedor, setFilterVendedor] = useState('')
  const [sortBy, setSortBy] = useState<'confirmados' | 'ratio' | 'cotizados' | 'nombre'>('confirmados')

  const clientesEnriquecidos = useMemo(() => clientes.map(c => {
    const conf = c.viajes_confirmados_2526 ?? 0
    const cot = c.viajes_cotizados_2526 ?? 0
    const ratio = calcRatio(conf, cot)
    const nivel = nivelConversion(ratio, conf)
    return { ...c, conf, cot, ratio, nivel }
  }), [clientes])

  const filtered = useMemo(() => {
    let r = clientesEnriquecidos
    if (search) {
      const q = search.toLowerCase()
      r = r.filter(c => c.nombre_agencia.toLowerCase().includes(q) || c.pais?.toLowerCase().includes(q))
    }
    if (filterNivel) r = r.filter(c => c.nivel === filterNivel)
    if (filterArea) r = r.filter(c => c.area?.includes(filterArea))
    if (filterVendedor) r = r.filter(c => (c.vendedor as any)?.id === filterVendedor)

    return [...r].sort((a, b) => {
      if (sortBy === 'confirmados') return b.conf - a.conf
      if (sortBy === 'cotizados') return b.cot - a.cot
      if (sortBy === 'ratio') return (b.ratio ?? -1) - (a.ratio ?? -1)
      return a.nombre_agencia.localeCompare(b.nombre_agencia)
    })
  }, [clientesEnriquecidos, search, filterNivel, filterArea, filterVendedor, sortBy])

  // Stats globales
  const totalConf = clientesEnriquecidos.reduce((s, c) => s + c.conf, 0)
  const totalCot = clientesEnriquecidos.reduce((s, c) => s + c.cot, 0)
  const ratioGlobal = calcRatio(totalConf, totalCot)
  const porNivel = {
    alto: clientesEnriquecidos.filter(c => c.nivel === 'alto').length,
    medio: clientesEnriquecidos.filter(c => c.nivel === 'medio').length,
    bajo: clientesEnriquecidos.filter(c => c.nivel === 'bajo').length,
    solo_cotizo: clientesEnriquecidos.filter(c => c.nivel === 'solo_cotizo').length,
  }

  const hasFilters = search || filterNivel || filterArea || filterVendedor

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Temporada 25/26</h1>
        <p className="text-sm text-gray-500 mt-0.5">Ratio de conversión por cliente</p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-[#e8e4dd] p-4 text-center lg:col-span-1">
          <p className="text-3xl font-bold text-brand-600">{clientesEnriquecidos.length}</p>
          <p className="text-xs text-gray-500 mt-0.5">Clientes con datos</p>
        </div>
        <div className="bg-white rounded-xl border border-[#e8e4dd] p-4 text-center">
          <p className="text-3xl font-bold text-gray-900">{totalConf}</p>
          <p className="text-xs text-gray-500 mt-0.5">Viajes confirmados</p>
        </div>
        <div className="bg-white rounded-xl border border-[#e8e4dd] p-4 text-center">
          <p className="text-3xl font-bold text-gray-900">{totalCot}</p>
          <p className="text-xs text-gray-500 mt-0.5">Cotizados no conf.</p>
        </div>
        <div className="bg-white rounded-xl border border-[#e8e4dd] p-4 text-center">
          <p className={cn('text-3xl font-bold', ratioGlobal && ratioGlobal >= 40 ? 'text-green-600' : ratioGlobal && ratioGlobal >= 20 ? 'text-yellow-600' : 'text-red-600')}>
            {ratioGlobal !== null ? `${ratioGlobal}%` : '—'}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">Ratio global</p>
        </div>
        {/* Mini breakdown por nivel */}
        <div className="bg-white rounded-xl border border-[#e8e4dd] p-3 flex flex-col justify-center gap-1.5">
          {Object.entries(porNivel).map(([nivel, count]) => (
            <div key={nivel} className="flex items-center gap-2">
              <div className={cn('w-2 h-2 rounded-full shrink-0', NIVEL_CONFIG[nivel as keyof typeof NIVEL_CONFIG].bar)} />
              <span className="text-xs text-gray-500 flex-1 capitalize">{NIVEL_CONFIG[nivel as keyof typeof NIVEL_CONFIG].label}</span>
              <span className="text-xs font-semibold text-gray-700">{count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl border border-[#e8e4dd] p-4 mb-5">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-40">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Buscar agencia..." className="sh-input pl-8 text-sm" />
          </div>
          <select value={filterNivel} onChange={e => setFilterNivel(e.target.value)} className="sh-select w-auto text-sm min-w-36">
            <option value="">Todos los niveles</option>
            {Object.entries(NIVEL_CONFIG).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
          <select value={filterArea} onChange={e => setFilterArea(e.target.value)} className="sh-select w-auto text-sm min-w-36">
            <option value="">Todas las áreas</option>
            {Object.entries(AREA_SHORT).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select value={filterVendedor} onChange={e => setFilterVendedor(e.target.value)} className="sh-select w-auto text-sm min-w-36">
            <option value="">Todos los vendedores</option>
            {usuarios.map(u => <option key={u.id} value={u.id}>{u.nombre}</option>)}
          </select>
          <select value={sortBy} onChange={e => setSortBy(e.target.value as any)} className="sh-select w-auto text-sm min-w-40">
            <option value="confirmados">Ordenar: Confirmados</option>
            <option value="ratio">Ordenar: Ratio %</option>
            <option value="cotizados">Ordenar: Cotizados</option>
            <option value="nombre">Ordenar: Nombre</option>
          </select>
          {hasFilters && (
            <button onClick={() => { setSearch(''); setFilterNivel(''); setFilterArea(''); setFilterVendedor('') }}
              className="text-xs text-gray-400 hover:text-red-500 transition-colors px-2 py-1 rounded">
              Limpiar
            </button>
          )}
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl border border-[#e8e4dd] overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <Filter className="w-8 h-8 text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-400">Sin resultados con esos filtros</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#f0ede8] bg-[#faf8f5]">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Agencia</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Área</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Confirmados</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Cotizados</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-48">Ratio de conversión</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Nivel</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Vendedor</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f7f5f1]">
              {filtered.map(c => {
                const cfg = NIVEL_CONFIG[c.nivel]
                const ratioDisplay = c.ratio !== null ? c.ratio : (c.conf > 0 ? 100 : 0)
                const Icon = c.nivel === 'alto' ? TrendingUp : c.nivel === 'bajo' || c.nivel === 'solo_cotizo' ? TrendingDown : Minus
                return (
                  <tr key={c.id} className="hover:bg-[#faf8f5] transition-colors group">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center shrink-0">
                          <span className="text-xs font-bold text-brand-700">{c.nombre_agencia.charAt(0)}</span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 leading-tight">{c.nombre_agencia}</p>
                          {c.pais && <p className="text-[10px] text-gray-400">{c.pais}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {(c.area ?? []).slice(0,2).map((a: string) => (
                          <span key={a} className="badge bg-gray-100 text-gray-600 text-[10px]">
                            {AREA_SHORT[a] ?? a}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-lg font-bold text-gray-900">{c.conf}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-sm text-gray-500">{c.cot}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                          <div
                            className={cn('h-2 rounded-full transition-all', cfg.bar)}
                            style={{ width: `${Math.min(ratioDisplay, 100)}%` }}
                          />
                        </div>
                        <span className="text-xs font-semibold text-gray-700 w-8 text-right">
                          {c.ratio !== null ? `${c.ratio}%` : c.conf > 0 ? '100%' : '—'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('badge border text-[11px] flex items-center gap-1 w-fit', cfg.color)}>
                        <Icon className="w-3 h-3" />
                        {cfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {(c.vendedor as any)?.nombre ?? '—'}
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
        {filtered.length > 0 && (
          <div className="px-4 py-3 border-t border-[#f0ede8] bg-[#faf8f5] text-xs text-gray-400">
            {filtered.length} clientes · {filtered.reduce((s,c)=>s+c.conf,0)} confirmados · {filtered.reduce((s,c)=>s+c.cot,0)} cotizados
            {(() => {
              const tc = filtered.reduce((s,c)=>s+c.conf,0)
              const tq = filtered.reduce((s,c)=>s+c.cot,0)
              const r = calcRatio(tc, tq)
              return r !== null ? ` · Ratio filtrado: ${r}%` : ''
            })()}
          </div>
        )}
      </div>
    </div>
  )
}
