import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'
import { CalendarDays, Plus, Users, MapPin, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

const ESTADO_STYLE = {
  planificacion: 'bg-blue-50 text-blue-700 border-blue-200',
  en_curso:      'bg-green-50 text-green-700 border-green-200',
  finalizado:    'bg-gray-100 text-gray-500 border-gray-200',
}
const ESTADO_LABEL = {
  planificacion: 'Planificación',
  en_curso:      'En curso',
  finalizado:    'Finalizado',
}

export default async function EventosPage() {
  const supabase = createClient()

  const { data: eventos } = await supabase
    .from('eventos')
    .select(`
      *,
      creador:usuarios!created_by(nombre),
      evento_clientes(count)
    `)
    .order('created_at', { ascending: false })

  const activos = eventos?.filter(e => e.estado !== 'finalizado') ?? []
  const finalizados = eventos?.filter(e => e.estado === 'finalizado') ?? []

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Eventos y Ferias</h1>
          <p className="text-sm text-gray-500 mt-0.5">Agendá tus visitas en ferias y actualizá los clientes automáticamente</p>
        </div>
        <Link href="/eventos/nuevo"
          className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Nuevo evento
        </Link>
      </div>

      {/* Activos */}
      {activos.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Próximos / En curso</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activos.map((ev: any) => (
              <Link key={ev.id} href={`/eventos/${ev.id}`}
                className="bg-white rounded-xl border border-[#e8e4dd] p-5 hover:shadow-md hover:-translate-y-px transition-all duration-150 group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                    <CalendarDays className="w-5 h-5 text-blue-600" />
                  </div>
                  <span className={cn('badge border text-xs', ESTADO_STYLE[ev.estado as keyof typeof ESTADO_STYLE])}>
                    {ESTADO_LABEL[ev.estado as keyof typeof ESTADO_LABEL]}
                  </span>
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">{ev.nombre}</h3>
                <div className="space-y-1.5 mb-3">
                  {ev.lugar && (
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                      <MapPin className="w-3 h-3" />
                      {ev.lugar}
                    </div>
                  )}
                  {(ev.fecha_inicio || ev.fecha_fin) && (
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                      <CalendarDays className="w-3 h-3" />
                      {formatDate(ev.fecha_inicio)} {ev.fecha_fin ? `→ ${formatDate(ev.fecha_fin)}` : ''}
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <Users className="w-3 h-3" />
                    {ev.evento_clientes?.[0]?.count ?? 0} clientes en agenda
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400 capitalize">{ev.tipo}</span>
                  <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-brand-500 group-hover:translate-x-0.5 transition-all" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Finalizados */}
      {finalizados.length > 0 && (
        <div>
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Historial</h2>
          <div className="bg-white rounded-xl border border-[#e8e4dd] divide-y divide-[#f7f5f1]">
            {finalizados.map((ev: any) => (
              <Link key={ev.id} href={`/eventos/${ev.id}`}
                className="flex items-center gap-4 px-5 py-3.5 hover:bg-[#faf8f5] transition-colors group"
              >
                <div className="w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center shrink-0">
                  <CalendarDays className="w-4 h-4 text-gray-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-700">{ev.nombre}</p>
                  <p className="text-xs text-gray-400">
                    {formatDate(ev.fecha_inicio)} · {ev.evento_clientes?.[0]?.count ?? 0} clientes · <span className="capitalize">{ev.tipo}</span>
                  </p>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-brand-500 transition-colors shrink-0" />
              </Link>
            ))}
          </div>
        </div>
      )}

      {(!eventos || eventos.length === 0) && (
        <div className="bg-white rounded-xl border border-[#e8e4dd] py-20 text-center">
          <CalendarDays className="w-10 h-10 text-gray-200 mx-auto mb-4" />
          <p className="text-gray-500 font-medium mb-2">No hay eventos creados</p>
          <p className="text-sm text-gray-400 mb-6">Creá un evento para armar la agenda de una feria</p>
          <Link href="/eventos/nuevo"
            className="inline-flex items-center gap-2 bg-brand-500 text-white text-sm px-4 py-2 rounded-lg hover:bg-brand-600 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Crear primer evento
          </Link>
        </div>
      )}
    </div>
  )
}
