import { createClient } from '@/lib/supabase/server'
import NuevoClienteForm from '@/components/NuevoClienteForm'

export default async function NuevoClientePage() {
  const supabase = createClient()
  const { data: usuarios } = await supabase.from('usuarios').select('id, nombre').eq('activo', true).order('nombre')
  const { data: user } = await supabase.auth.getUser()

  return <NuevoClienteForm usuarios={usuarios ?? []} currentUserId={user.user?.id ?? ''} />
}
