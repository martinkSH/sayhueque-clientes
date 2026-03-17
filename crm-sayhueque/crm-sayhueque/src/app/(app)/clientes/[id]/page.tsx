import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import ClienteDetailClient from '@/components/ClienteDetailClient'

export default async function ClienteDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient()

  const [
    { data: cliente },
    { data: contactos },
    { data: comentarios },
    { data: eventosParticipados },
    { data: usuarios },
    { data: currentUser },
  ] = await Promise.all([
    supabase
      .from('clientes')
      .select('*, vendedor:usuarios!vendedor_principal(id, nombre)')
      .eq('id', params.id)
      .single(),
    supabase
      .from('contactos')
      .select('*')
      .eq('cliente_id', params.id)
      .eq('activo', true)
      .order('es_principal', { ascending: false })
      .order('nombre'),
    supabase
      .from('comentarios')
      .select('*, usuario:usuarios!usuario_id(id, nombre), evento:eventos!evento_id(id, nombre)')
      .eq('cliente_id', params.id)
      .order('created_at', { ascending: false })
      .limit(50),
    supabase
      .from('evento_clientes')
      .select('*, evento:eventos!evento_id(id, nombre, tipo, fecha_inicio, estado)')
      .eq('cliente_id', params.id)
      .order('created_at', { ascending: false })
      .limit(10),
    supabase.from('usuarios').select('id, nombre').eq('activo', true).order('nombre'),
    supabase.auth.getUser(),
  ])

  if (!cliente) notFound()

  return (
    <ClienteDetailClient
      cliente={cliente}
      contactos={contactos ?? []}
      comentarios={comentarios ?? []}
      eventosParticipados={eventosParticipados ?? []}
      usuarios={usuarios ?? []}
      currentUserId={currentUser.user?.id ?? ''}
    />
  )
}
