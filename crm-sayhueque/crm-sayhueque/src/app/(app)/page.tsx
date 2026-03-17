import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { daysSinceContact, formatRelativeTime, cn, contactUrgencyBg } from '@/lib/utils'
import { Users, Star, CalendarDays, AlertTriangle, TrendingUp, Clock } from 'lucide-react'

export default async function DashboardPage() {
  const supabase = createClient()

  const [
    { count: totalActuales },
    { count: totalPotenciales },
    { data: eventosActivos },
    { data: sinContactoReciente },
  ] = await Promise.all([
    supabase.from('clientes').select('*', { count: 'exact', head: true }).eq('tipo', 'actual').eq('activo', true),
    supabase.from('clientes').select('*', { count: 'exact', head: true }).eq('tipo', 'potencial').eq('activo', true),
    supabase.from('eventos').select('id, nombre, tipo, fecha_inicio, fecha_fin, estado').in('estado', ['planificacion', 'en_curso']).order('fecha_inicio'),
    supabase.from('clientes')
      .select('id, nombre_agencia, tipo, ultimo_contacto, ultimo_contacto_descripcion, vendedor:usuarios!vendedor_principal(nombre)')
      .eq('tipo', 'actual')
      .eq('activo', true)
      .or('ultimo_contacto.is.null,ultimo_contacto.lt.' + new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())
      .order('ultimo_contacto', { ascending: true, nullsFirst: true })
      .limit(8),
  ])

  const stats = [
    { label: 'Clientes actuales', value: totalActuales ?? 0, icon: Star, href: '/clientes/actuales', color: 'bg-brand-50 text-brand-700' },
    { label: 'Clientes potenciales', value: totalPotenciales ?? 0, icon: Users, href: '/clientes/potenciales', color: 'bg-earth-50 text-earth-700' },
    { label: 'Eventos activos', value: eventosActivos?.length ?? 0, icon: CalendarDays, href: '/eventos', color: 'bg-blue-50 text-blue-700' },
    { label: 'Sin contacto +90d', value: sinContactoReciente?.length ?? 0, icon: AlertTriangle, href: '/clientes/actuales', color: 'bg-amber-50 text-amber-700' },
  ]

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Resumen de la agenda comercial</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map(({ label, value, icon: Icon, href, color }) => (
          <Link key={label} href={href}
            className="bg-white rounded-xl border border-[#e8e4dd] p-5 hover:shadow-md hover:-translate-y-px transition-all duration-150 group"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-gray-500 font-medium mb-1">{label}</p>
                <p className="text-3xl font-semibold text-gray-900">{value}</p>
              </div>
              <div className={cn('p-2 rounded-lg', color)}>
                <Icon className="w-5 h-5" />
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Clientes sin contacto reciente */}
        <div className="bg-white rounded-xl border border-[#e8e4dd]">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#e8e4dd]">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-500" />
              <h2 className="text-sm font-semibold text-gray-900">Clientes a retomar</h2>
            </div>
            <Link href="/clientes/actuales" className="text-xs text-brand-600 hover:underline">Ver todos</Link>
          </div>
          <div className="divide-y divide-[#f0ede8]">
            {sinContactoReciente?.length === 0 && (
              <p className="px-5 py-8 text-sm text-gray-400 text-center">¡Todo al día! 🎉</p>
            )}
            {sinContactoReciente?.map((c: any) => {
              const days = daysSinceContact(c.ultimo_contacto)
              return (
                <Link key={c.id} href={`/clientes/${c.id}`}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{c.nombre_agencia}</p>
                    <p className="text-xs text-gray-400">
                      {c.ultimo_contacto ? formatRelativeTime(c.ultimo_contacto) : 'Sin contacto registrado'}
                    </p>
                  </div>
                  <span className={cn('badge text-[11px]', contactUrgencyBg(days))}>
                    {days === null ? 'Nunca' : `${days}d`}
                  </span>
                </Link>
              )
            })}
          </div>
        </div>

        {/* Eventos activos */}
        <div className="bg-white rounded-xl border border-[#e8e4dd]">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#e8e4dd]">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-brand-500" />
              <h2 className="text-sm font-semibold text-gray-900">Próximos eventos</h2>
            </div>
            <Link href="/eventos" className="text-xs text-brand-600 hover:underline">Ver todos</Link>
          </div>
          <div className="divide-y divide-[#f0ede8]">
            {(!eventosActivos || eventosActivos.length === 0) && (
              <div className="px-5 py-8 text-center">
                <p className="text-sm text-gray-400 mb-3">No hay eventos planificados</p>
                <Link href="/eventos/nuevo"
                  className="inline-flex items-center gap-1.5 text-xs bg-brand-500 text-white px-3 py-1.5 rounded-lg hover:bg-brand-600 transition-colors"
                >
                  Crear evento
                </Link>
              </div>
            )}
            {eventosActivos?.map((ev: any) => (
              <Link key={ev.id} href={`/eventos/${ev.id}`}
                className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 transition-colors"
              >
                <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center shrink-0">
                  <CalendarDays className="w-4 h-4 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{ev.nombre}</p>
                  <p className="text-xs text-gray-400 capitalize">{ev.tipo} · {ev.estado}</p>
                </div>
                <span className="text-xs text-gray-400">{ev.fecha_inicio?.slice(0, 10) ?? '—'}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
