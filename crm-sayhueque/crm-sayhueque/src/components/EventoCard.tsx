'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { formatDate, cn } from '@/lib/utils'
import { CalendarDays, MapPin, Users, ArrowRight, Trash2, AlertTriangle } from 'lucide-react'

const ESTADO_STYLE: Record<string, string> = {
  planificacion: 'bg-blue-50 text-blue-700 border-blue-200',
  en_curso:      'bg-green-50 text-green-700 border-green-200',
  finalizado:    'bg-gray-100 text-gray-500 border-gray-200',
}
const ESTADO_LABEL: Record<string, string> = {
  planificacion: 'Planificación',
  en_curso:      'En curso',
  finalizado:    'Finalizado',
}

export default function EventoCard({ evento, compact = false }: { evento: any; compact?: boolean }) {
  const router = useRouter()
  const supabase = createClient()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function handleDelete(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (!confirmDelete) { setConfirmDelete(true); return }
    setDeleting(true)
    // Eliminar evento_clientes primero (por FK), luego el evento
    await supabase.from('evento_clientes').delete().eq('evento_id', evento.id)
    await supabase.from('comentarios').update({ evento_id: null }).eq('evento_id', evento.id)
    await supabase.from('eventos').delete().eq('id', evento.id)
    router.refresh()
  }

  function cancelDelete(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    setConfirmDelete(false)
  }

  if (compact) {
    return (
      <div className="flex items-center gap-4 px-5 py-3.5 hover:bg-[#faf8f5] transition-colors group">
        <Link href={`/eventos/${evento.id}`} className="flex items-center gap-4 flex-1 min-w-0">
          <div className="w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center shrink-0">
            <CalendarDays className="w-4 h-4 text-gray-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-700">{evento.nombre}</p>
            <p className="text-xs text-gray-400">
              {formatDate(evento.fecha_inicio)} · {evento.evento_clientes?.[0]?.count ?? 0} clientes · <span className="capitalize">{evento.tipo}</span>
            </p>
          </div>
          <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-brand-500 transition-colors shrink-0" />
        </Link>

        {/* Delete compact */}
        <div className="flex items-center gap-1 shrink-0">
          {confirmDelete ? (
            <>
              <button onClick={handleDelete} disabled={deleting}
                className="text-xs px-2 py-1 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-60"
              >
                {deleting ? '...' : 'Confirmar'}
              </button>
              <button onClick={cancelDelete} className="text-xs px-2 py-1 text-gray-500 border border-[#e8e4dd] rounded-lg hover:bg-gray-50 transition-colors">
                No
              </button>
            </>
          ) : (
            <button onClick={handleDelete}
              className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-[#e8e4dd] p-5 hover:shadow-md hover:-translate-y-px transition-all duration-150 group relative">
      <Link href={`/eventos/${evento.id}`} className="block">
        <div className="flex items-start justify-between mb-3">
          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
            <CalendarDays className="w-5 h-5 text-blue-600" />
          </div>
          <span className={cn('badge border text-xs', ESTADO_STYLE[evento.estado] ?? 'bg-gray-100 text-gray-500')}>
            {ESTADO_LABEL[evento.estado] ?? evento.estado}
          </span>
        </div>
        <h3 className="font-semibold text-gray-900 mb-1">{evento.nombre}</h3>
        <div className="space-y-1.5 mb-3">
          {evento.lugar && (
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <MapPin className="w-3 h-3" />
              {evento.lugar}
            </div>
          )}
          {(evento.fecha_inicio || evento.fecha_fin) && (
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <CalendarDays className="w-3 h-3" />
              {formatDate(evento.fecha_inicio)}{evento.fecha_fin ? ` → ${formatDate(evento.fecha_fin)}` : ''}
            </div>
          )}
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <Users className="w-3 h-3" />
            {evento.evento_clientes?.[0]?.count ?? 0} clientes en agenda
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400 capitalize">{evento.tipo}</span>
          <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-brand-500 group-hover:translate-x-0.5 transition-all" />
        </div>
      </Link>

      {/* Delete button — abajo a la izquierda */}
      <div className="absolute bottom-4 left-4">
        {confirmDelete ? (
          <div className="flex items-center gap-1.5 bg-white border border-red-200 rounded-lg px-2 py-1.5 shadow-sm animate-slide-up">
            <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0" />
            <span className="text-xs text-red-600 font-medium">¿Eliminar?</span>
            <button onClick={handleDelete} disabled={deleting}
              className="text-xs px-2 py-0.5 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors disabled:opacity-60"
            >
              {deleting ? '...' : 'Sí'}
            </button>
            <button onClick={cancelDelete}
              className="text-xs px-2 py-0.5 text-gray-500 border border-[#e8e4dd] rounded-md hover:bg-gray-50 transition-colors"
            >
              No
            </button>
          </div>
        ) : (
          <button
            onClick={handleDelete}
            className="opacity-0 group-hover:opacity-100 flex items-center gap-1.5 p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  )
}
