// ============================================================
// CRM Say Hueque - Types
// ============================================================

export type UserRole = 'admin' | 'vendedor'
export type ClienteTipo = 'actual' | 'potencial'
export type ClienteArea = 'DMC Grupos' | 'DMC FITs / CRAFT' | 'Aliwen' | 'Plataformas / Web'
export type ClienteEstado = 'cliente_frecuente' | 'cliente_esporadico' | 'ex_cliente' | 'open' | 'en_desarrollo'
export type ClienteVolumen = 'VIP' | 'ALTO' | 'MEDIO' | 'BAJO' | 'EN_DESARROLLO'
export type ComentarioTipo = 'general' | 'seguimiento' | 'reunion' | 'email' | 'llamada' | 'whatsapp'
export type EventoTipo = 'feria' | 'webinar' | 'roadshow' | 'reunion' | 'otro'
export type EventoEstado = 'planificacion' | 'en_curso' | 'finalizado'
export type EventoClienteEstado = 'pendiente' | 'confirmado' | 'visitado' | 'cancelado'

export interface Usuario {
  id: string
  email: string
  nombre: string
  rol: UserRole
  avatar_url?: string
  activo: boolean
  created_at: string
}

export interface Cliente {
  id: string
  nombre_agencia: string
  tipo: ClienteTipo
  area: ClienteArea[]
  estado: ClienteEstado
  pais?: string
  idioma?: string
  perfil_agencia?: string
  origen_contacto?: string
  web?: string
  vendedor_principal?: string
  volumen?: ClienteVolumen
  opera_family_travel: boolean
  tiene_dmc_arg?: boolean
  vende_arg_chile?: boolean
  notas?: string
  ultimo_contacto?: string
  ultimo_contacto_evento_id?: string
  ultimo_contacto_descripcion?: string
  importado_de?: string
  activo: boolean
  created_at: string
  created_by?: string
  updated_at: string
  // joins
  contactos?: Contacto[]
  comentarios?: Comentario[]
  vendedor?: Usuario
}

export interface Contacto {
  id: string
  cliente_id: string
  nombre: string
  apellido?: string
  cargo?: string
  email?: string
  telefono?: string
  es_principal: boolean
  notas?: string
  activo: boolean
  created_at: string
  created_by?: string
}

export interface Comentario {
  id: string
  cliente_id: string
  usuario_id: string
  contenido: string
  tipo: ComentarioTipo
  es_ultimo_contacto: boolean
  evento_id?: string
  created_at: string
  // joins
  usuario?: Usuario
  evento?: Evento
}

export interface Evento {
  id: string
  nombre: string
  descripcion?: string
  tipo: EventoTipo
  lugar?: string
  fecha_inicio?: string
  fecha_fin?: string
  estado: EventoEstado
  created_by?: string
  created_at: string
  updated_at: string
  // joins
  evento_clientes?: EventoCliente[]
  creador?: Usuario
}

export interface EventoCliente {
  id: string
  evento_id: string
  cliente_id: string
  contacto_id?: string
  estado: EventoClienteEstado
  fecha_reunion?: string
  notas_previas?: string
  resumen_reunion?: string
  acciones_followup?: string
  wish_list?: string
  prioridad: number
  actualizo_cliente: boolean
  created_at: string
  // joins
  cliente?: Cliente
  contacto?: Contacto
  evento?: Evento
}

// ============================================================
// Helpers para UI
// ============================================================

export const AREAS: ClienteArea[] = [
  'DMC Grupos',
  'DMC FITs / CRAFT',
  'Aliwen',
  'Plataformas / Web',
]

export const ESTADOS_LABELS: Record<ClienteEstado, string> = {
  cliente_frecuente: 'Cliente frecuente',
  cliente_esporadico: 'Cliente esporádico',
  ex_cliente: 'Ex cliente',
  open: 'Open',
  en_desarrollo: 'En desarrollo',
}

export const VOLUMEN_LABELS: Record<ClienteVolumen, string> = {
  VIP: 'VIP',
  ALTO: 'Alto',
  MEDIO: 'Medio',
  BAJO: 'Bajo',
  EN_DESARROLLO: 'En desarrollo',
}

export const COMENTARIO_TIPO_LABELS: Record<ComentarioTipo, string> = {
  general: 'General',
  seguimiento: 'Seguimiento',
  reunion: 'Reunión',
  email: 'Email',
  llamada: 'Llamada',
  whatsapp: 'WhatsApp',
}

export const EVENTO_TIPO_LABELS: Record<EventoTipo, string> = {
  feria: 'Feria',
  webinar: 'Webinar',
  roadshow: 'Roadshow',
  reunion: 'Reunión',
  otro: 'Otro',
}
