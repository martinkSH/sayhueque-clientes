import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import EventoDetailClient from '@/components/EventoDetailClient'

export default async function EventoDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient()

  const [
    { data: evento },
    { data: agenda },
    { data: todosClientes },
    { data: user },
  ] = await Promise.all([
    supabase.from('eventos').select('*, creador:usuarios!created_by(nombre)').eq('id', params.id).single(),
    supabase
      .from('evento_clientes')
      .select(`
        *,
        cliente:clientes!cliente_id(id, nombre_agencia, pais, area, tipo, ultimo_contacto),
        contacto:contactos!contacto_id(id, nombre, apellido, cargo, email)
      `)
      .eq('evento_id', params.id)
      .order('prioridad')
      .order('created_at'),
    supabase
      .from('clientes')
      .select('id, nombre_agencia, pais, area, tipo, contactos(id, nombre, apellido, cargo, email)')
      .eq('activo', true)
      .order('nombre_agencia'),
    supabase.auth.getUser(),
  ])

  if (!evento) notFound()

  return (
    <EventoDetailClient
      evento={evento}
      agenda={agenda ?? []}
      todosClientes={todosClientes ?? []}
      currentUserId={user.user?.id ?? ''}
    />
  )
}
