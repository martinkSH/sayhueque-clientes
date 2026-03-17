import { createClient } from '@/lib/supabase/server'
import TemporadaClient from '@/components/TemporadaClient'

export default async function TemporadaPage() {
  const supabase = createClient()

  const { data: clientes } = await supabase
    .from('clientes')
    .select(`
      id, nombre_agencia, tipo, area, pais, estado, volumen,
      viajes_confirmados_2526, viajes_cotizados_2526,
      ultimo_contacto, ultimo_contacto_descripcion,
      vendedor:usuarios!vendedor_principal(id, nombre)
    `)
    .eq('activo', true)
    .or('viajes_confirmados_2526.gt.0,viajes_cotizados_2526.gt.0')
    .order('viajes_confirmados_2526', { ascending: false })

  const { data: usuarios } = await supabase
    .from('usuarios')
    .select('id, nombre')
    .eq('activo', true)
    .order('nombre')

  // Normalizar vendedor: Supabase devuelve array en joins, necesitamos objeto o null
  const clientesNorm = (clientes ?? []).map((c: any) => ({
    ...c,
    vendedor: Array.isArray(c.vendedor) ? (c.vendedor[0] ?? null) : (c.vendedor ?? null),
  }))

  return <TemporadaClient clientes={clientesNorm} usuarios={usuarios ?? []} />
}
