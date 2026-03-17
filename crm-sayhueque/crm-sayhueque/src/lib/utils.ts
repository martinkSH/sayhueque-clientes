import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { formatDistanceToNow, format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatRelativeTime(dateString?: string | null): string {
  if (!dateString) return 'Sin contacto'
  try {
    const date = parseISO(dateString)
    return formatDistanceToNow(date, { addSuffix: true, locale: es })
  } catch {
    return 'Fecha inválida'
  }
}

export function formatDate(dateString?: string | null, fmt = 'dd MMM yyyy'): string {
  if (!dateString) return '-'
  try {
    return format(parseISO(dateString), fmt, { locale: es })
  } catch {
    return '-'
  }
}

export function daysSinceContact(dateString?: string | null): number | null {
  if (!dateString) return null
  try {
    const date = parseISO(dateString)
    const diff = Date.now() - date.getTime()
    return Math.floor(diff / (1000 * 60 * 60 * 24))
  } catch {
    return null
  }
}

export function contactUrgencyColor(days: number | null): string {
  if (days === null) return 'text-gray-400'
  if (days > 180) return 'text-red-500'
  if (days > 90) return 'text-amber-500'
  if (days > 30) return 'text-yellow-500'
  return 'text-green-600'
}

export function contactUrgencyBg(days: number | null): string {
  if (days === null) return 'bg-gray-100 text-gray-500'
  if (days > 180) return 'bg-red-50 text-red-700 border border-red-200'
  if (days > 90) return 'bg-amber-50 text-amber-700 border border-amber-200'
  if (days > 30) return 'bg-yellow-50 text-yellow-700 border border-yellow-200'
  return 'bg-green-50 text-green-700 border border-green-200'
}

export function getInitials(nombre: string, apellido?: string): string {
  const first = nombre.charAt(0).toUpperCase()
  const last = apellido ? apellido.charAt(0).toUpperCase() : nombre.charAt(1)?.toUpperCase() || ''
  return `${first}${last}`
}
