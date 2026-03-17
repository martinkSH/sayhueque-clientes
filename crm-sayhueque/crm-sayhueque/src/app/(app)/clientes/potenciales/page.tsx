import { createClient } from '@/lib/supabase/server'
import ClientesPageClient from '@/components/ClientesPageClient'

export default async function ClientesPotencialesPage() {
  const supabase = createClient()

  const [{ data: clientes }, { data: usuarios }] = await Promise.all([
    supabase
      .from('clientes')
      .select(`
        *,
        vendedor:usuarios!vendedor_principal(id, nombre)
      `)
      .eq('tipo', 'potencial')
      .eq('activo', true)
      .order('nombre_agencia'),
    supabase.from('usuarios').select('id, nombre').eq('activo', true).order('nombre'),
  ])

  return (
    <ClientesPageClient
      clientes={clientes ?? []}
      tipo="potencial"
      usuarios={usuarios ?? []}
    />
  )
}
