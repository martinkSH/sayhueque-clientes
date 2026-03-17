'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn, getInitials } from '@/lib/utils'
import { Usuario } from '@/types'
import {
  Users, Star, CalendarDays, BarChart2,
  LogOut, Leaf, ChevronRight, Settings,
  Upload, TrendingUp
} from 'lucide-react'

const navItems = [
  { href: '/', label: 'Dashboard', icon: BarChart2 },
  { href: '/clientes/actuales', label: 'Clientes actuales', icon: Star },
  { href: '/clientes/potenciales', label: 'Clientes potenciales', icon: Users },
  { href: '/eventos', label: 'Eventos / Ferias', icon: CalendarDays },
  { href: '/temporada', label: 'Temporada 25/26', icon: TrendingUp },
]

export default function Sidebar({ usuario }: { usuario: Usuario | null }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <aside className="w-56 bg-white border-r border-[#e8e4dd] flex flex-col h-full shrink-0">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-[#e8e4dd]">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center shadow-sm group-hover:bg-brand-600 transition-colors">
            <Leaf className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900 leading-tight">Say Hueque</p>
            <p className="text-[10px] text-gray-400 leading-tight">CRM Agenda</p>
          </div>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
          return (
            <Link key={href} href={href}
              className={cn(
                'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all duration-150',
                active
                  ? 'bg-brand-500 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="flex-1">{label}</span>
              {active && <ChevronRight className="w-3 h-3 opacity-60" />}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 py-3 border-t border-[#e8e4dd] space-y-0.5">
        {usuario?.rol === 'admin' && (
          <Link href="/importar"
            className={cn(
              'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors',
              pathname === '/importar'
                ? 'bg-brand-500 text-white'
                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
            )}
          >
            <Upload className="w-4 h-4" />
            <span>Importar Excel</span>
          </Link>
        )}
        {usuario?.rol === 'admin' && (
          <Link href="/settings"
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-gray-500 hover:bg-gray-50 hover:text-gray-900 transition-colors"
          >
            <Settings className="w-4 h-4" />
            <span>Configuración</span>
          </Link>
        )}

        {/* User */}
        <div className="flex items-center gap-2.5 px-3 py-2 mt-1">
          <div className="w-7 h-7 rounded-full bg-brand-100 flex items-center justify-center shrink-0">
            <span className="text-xs font-semibold text-brand-700">
              {usuario ? getInitials(usuario.nombre) : '?'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-gray-900 truncate">{usuario?.nombre || 'Usuario'}</p>
            <p className="text-[10px] text-gray-400 capitalize">{usuario?.rol}</p>
          </div>
          <button onClick={handleLogout} title="Cerrar sesión"
            className="p-1 text-gray-400 hover:text-red-500 transition-colors rounded"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  )
}
