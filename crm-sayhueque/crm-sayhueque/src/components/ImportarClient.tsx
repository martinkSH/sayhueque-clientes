'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Upload, FileSpreadsheet, CheckCircle2, AlertTriangle, X, Play, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'

interface RowCliente {
  nombre_agencia: string
  tipo: 'actual' | 'potencial'
  area: string[]
  estado: string
  pais: string | null
  idioma: string | null
  perfil_agencia: string | null
  origen_contacto: string | null
  opera_family_travel: boolean
  tiene_dmc_arg: boolean | null
  volumen: string | null
  notas: string | null
  ultimo_contacto: string | null
  ultimo_contacto_descripcion: string | null
  importado_de: string
  contactos: { nombre: string; apellido: string | null; cargo: string | null; email: string | null; telefono: string | null; es_principal: boolean }[]
}

interface Resultado { ok: number; errores: string[] }

function clean(v: any): string | null {
  if (v === null || v === undefined) return null
  const s = String(v).trim()
  return s === '' || s === 'null' || s === 'undefined' || s === 'NaN' ? null : s
}

function cleanEmail(v: any): string | null {
  const s = clean(v)
  if (!s) return null
  const e = s.toLowerCase()
  return e.includes('@') && e.includes('.') ? e : null
}

function mapArea(vendedor: string | null, hoja: string): string[] {
  const v = (vendedor ?? '').toUpperCase()
  const h = hoja.toUpperCase()
  if (h.includes('ALIWEN')) return ['Aliwen']
  if (h.includes('PLATAFORMA')) return ['Plataformas / Web']
  if (['AGATA','CRAFT','WENDY','CARO','MARIEL','AGUSTINA','PATY'].includes(v)) return ['DMC FITs / CRAFT']
  return ['DMC Grupos']
}

function mapEstado(v: any): string {
  const s = (clean(v) ?? '').toUpperCase()
  if (s.includes('FRECUENTE')) return 'cliente_frecuente'
  if (s.includes('ESPORAD')) return 'cliente_esporadico'
  if (s.includes('EX')) return 'ex_cliente'
  if (s.includes('DESARROL')) return 'en_desarrollo'
  return 'open'
}

function mapVolumen(v: any): string | null {
  const n = parseInt(String(v))
  return ({1:'VIP',2:'ALTO',3:'MEDIO',4:'BAJO'} as any)[n] ?? null
}

function parseExcelDate(v: any): string | null {
  if (!v) return null
  if (v instanceof Date) return v.toISOString()
  if (typeof v === 'string') {
    const d = new Date(v)
    if (!isNaN(d.getTime())) return d.toISOString()
  }
  if (typeof v === 'number' && v > 1000) {
    const d = new Date((v - 25569) * 86400 * 1000)
    if (!isNaN(d.getTime())) return d.toISOString()
  }
  return null
}

function parseActuales(rows: any[]): RowCliente[] {
  const byAgencia: Record<string, RowCliente> = {}
  for (const row of rows) {
    const nombre = clean(row['NOMBRE AGENCIA'])
    if (!nombre) continue
    if (!byAgencia[nombre]) {
      byAgencia[nombre] = {
        nombre_agencia: nombre,
        tipo: 'actual',
        area: mapArea(clean(row['VENDEDOR']), 'AGENCIAS ACTUALES'),
        estado: mapEstado(row['ESTADO']),
        pais: clean(row['COUNTRY']),
        idioma: clean(row['IDIOMA']),
        perfil_agencia: clean(row['PERFIL AGENCIA']),
        origen_contacto: clean(row['ORIGEN CONTACTO']),
        opera_family_travel: !!(clean(row['OPERAN FAMILY TRAVEL?'])),
        tiene_dmc_arg: null,
        volumen: null,
        notas: clean(row['COMENTARIOS']),
        ultimo_contacto: parseExcelDate(row['Ultima comunicacion']),
        ultimo_contacto_descripcion: parseExcelDate(row['Ultima comunicacion']) ? 'Importado (Excel)' : null,
        importado_de: 'AGENCIAS ACTUALES',
        contactos: [],
      }
    }
    const nc = clean(row['FIRST_NAME'])
    const ec = cleanEmail(row['EMAIL'])
    if (nc || ec) {
      byAgencia[nombre].contactos.push({
        nombre: nc ?? 'Sin nombre',
        apellido: clean(row['LAST_NAME']),
        cargo: clean(row['puesto']),
        email: ec,
        telefono: null,
        es_principal: byAgencia[nombre].contactos.length === 0,
      })
    }
  }
  return Object.values(byAgencia)
}

function parsePotenciales(rows: any[]): RowCliente[] {
  const byAgencia: Record<string, RowCliente> = {}
  for (const row of rows) {
    const nombre = clean(row['Agencias'])
    if (!nombre || !isNaN(Number(nombre))) continue
    if (!byAgencia[nombre]) {
      byAgencia[nombre] = {
        nombre_agencia: nombre,
        tipo: 'potencial',
        area: mapArea(clean(row['Vendedor']), 'AGENCIA POTENCIALES'),
        estado: 'open',
        pais: clean(row['COUNTRY']),
        idioma: clean(row['Idioma']),
        perfil_agencia: clean(row['PERFIL DE AGENCIA']),
        origen_contacto: clean(row['ORIGEN \nCONTACTO']) ?? clean(row['ORIGEN CONTACTO']),
        opera_family_travel: !!(clean(row['FAMILY TRAVEL?'])),
        tiene_dmc_arg: clean(row['Tienen DMC ARG actulalmente?']) === 'No' ? false : clean(row['Tienen DMC ARG actulalmente?']) ? true : null,
        volumen: mapVolumen(row['PRIORIDAD FOLLOW UP']),
        notas: clean(row['COMENTARIOS']),
        ultimo_contacto: parseExcelDate(row['Last communication ']),
        ultimo_contacto_descripcion: parseExcelDate(row['Last communication ']) ? 'Importado (Excel)' : null,
        importado_de: 'AGENCIA POTENCIALES',
        contactos: [],
      }
    }
    const nc = clean(row['FIRST NAME'])
    const ec = cleanEmail(row['EMAIL'])
    if (nc || ec) {
      byAgencia[nombre].contactos.push({
        nombre: nc ?? 'Sin nombre',
        apellido: clean(row['LAST NAME']),
        cargo: clean(row['Puesto']),
        email: ec,
        telefono: null,
        es_principal: byAgencia[nombre].contactos.length === 0,
      })
    }
  }
  return Object.values(byAgencia)
}

type Estado = 'idle' | 'leyendo' | 'preview' | 'importando' | 'done'

export default function ImportarClient() {
  const supabase = createClient()
  const inputRef = useRef<HTMLInputElement>(null)
  const [estado, setEstado] = useState<Estado>('idle')
  const [clientes, setClientes] = useState<RowCliente[]>([])
  const [progreso, setProgreso] = useState(0)
  const [resultado, setResultado] = useState<Resultado>({ ok: 0, errores: [] })
  const [fileName, setFileName] = useState('')

  async function handleFile(file: File) {
    setFileName(file.name)
    setEstado('leyendo')
    try {
      // Importar xlsx desde npm (ya está en package.json)
      const XLSX = await import('xlsx')
      const buffer = await file.arrayBuffer()
      const wb = XLSX.read(buffer, { cellDates: true })
      const parsed: RowCliente[] = []

      if (wb.SheetNames.includes('AGENCIAS ACTUALES')) {
        const rows = XLSX.utils.sheet_to_json(wb.Sheets['AGENCIAS ACTUALES'], { defval: null })
        parsed.push(...parseActuales(rows as any[]))
      }
      if (wb.SheetNames.includes('AGENCIA POTENCIALES')) {
        const rows = XLSX.utils.sheet_to_json(wb.Sheets['AGENCIA POTENCIALES'], { defval: null })
        parsed.push(...parsePotenciales(rows as any[]))
      }

      setClientes(parsed)
      setEstado('preview')
    } catch (e: any) {
      alert('Error leyendo el archivo: ' + e.message)
      setEstado('idle')
    }
  }

  async function importar() {
    setEstado('importando')
    setProgreso(0)
    const res: Resultado = { ok: 0, errores: [] }

    for (let i = 0; i < clientes.length; i++) {
      const { contactos, ...clienteData } = clientes[i]
      const { data, error } = await supabase
        .from('clientes')
        .insert(clienteData)
        .select('id')
        .single()

      if (error) {
        res.errores.push(`${clientes[i].nombre_agencia}: ${error.message}`)
      } else {
        if (data && contactos.length > 0) {
          await supabase.from('contactos').insert(
            contactos.map(ct => ({ ...ct, cliente_id: data.id }))
          )
        }
        res.ok++
      }
      setProgreso(Math.round(((i + 1) / clientes.length) * 100))
    }

    setResultado(res)
    setEstado('done')
  }

  function reset() {
    setEstado('idle'); setClientes([]); setProgreso(0)
    setResultado({ ok: 0, errores: [] }); setFileName('')
  }

  const actuales = clientes.filter(c => c.tipo === 'actual')
  const potenciales = clientes.filter(c => c.tipo === 'potencial')
  const totalContactos = clientes.reduce((s, c) => s + c.contactos.length, 0)

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Importar desde Excel</h1>
        <p className="text-sm text-gray-500 mt-1">Subí el archivo BASE_DATOS_ok para cargar todos los clientes</p>
      </div>

      {estado === 'idle' && (
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
          className="border-2 border-dashed border-[#e8e4dd] hover:border-brand-400 rounded-2xl p-16 text-center cursor-pointer transition-colors group"
        >
          <div className="w-16 h-16 bg-brand-50 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:bg-brand-100 transition-colors">
            <FileSpreadsheet className="w-8 h-8 text-brand-600" />
          </div>
          <p className="text-base font-medium text-gray-900 mb-1">Arrastrá el Excel acá o hacé click</p>
          <p className="text-sm text-gray-400">BASE_DATOS_ok__2_.xlsx</p>
          <input ref={inputRef} type="file" accept=".xlsx,.xls" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
        </div>
      )}

      {estado === 'leyendo' && (
        <div className="bg-white rounded-2xl border border-[#e8e4dd] p-12 text-center">
          <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm font-medium text-gray-700">Procesando {fileName}...</p>
        </div>
      )}

      {estado === 'preview' && (
        <div className="space-y-5 animate-slide-up">
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Clientes actuales', value: actuales.length, color: 'text-green-700' },
              { label: 'Clientes potenciales', value: potenciales.length, color: 'text-blue-700' },
              { label: 'Contactos', value: totalContactos, color: 'text-purple-700' },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-white rounded-xl border border-[#e8e4dd] p-4 text-center">
                <p className={cn('text-3xl font-bold mb-1', color)}>{value}</p>
                <p className="text-xs text-gray-500">{label}</p>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-xl border border-[#e8e4dd] overflow-hidden">
            <div className="px-5 py-3 border-b border-[#f0ede8] bg-[#faf8f5]">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Preview — primeros 10 registros</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#f0ede8]">
                    {['Agencia','Tipo','País','Área','Contactos'].map(h => (
                      <th key={h} className="text-left px-4 py-2 text-xs text-gray-400 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f7f5f1]">
                  {clientes.slice(0, 10).map((c, i) => (
                    <tr key={i} className="hover:bg-[#faf8f5]">
                      <td className="px-4 py-2 font-medium text-gray-900">{c.nombre_agencia}</td>
                      <td className="px-4 py-2">
                        <span className={cn('badge text-[11px]', c.tipo === 'actual' ? 'bg-green-50 text-green-700' : 'bg-blue-50 text-blue-700')}>
                          {c.tipo}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-gray-500">{c.pais ?? '—'}</td>
                      <td className="px-4 py-2 text-gray-500 text-xs">{c.area.join(', ')}</td>
                      <td className="px-4 py-2 text-gray-500">{c.contactos.length}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {clientes.length > 10 && (
              <div className="px-5 py-3 border-t border-[#f0ede8] bg-[#faf8f5]">
                <p className="text-xs text-gray-400">... y {clientes.length - 10} más</p>
              </div>
            )}
          </div>

          <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
            <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
            <p className="text-sm text-amber-800">
              Si ya importaste antes pueden crearse duplicados. Si es la primera vez, podés continuar tranquilo.
            </p>
          </div>

          <div className="flex gap-3">
            <button onClick={importar}
              className="flex items-center gap-2 px-6 py-3 bg-brand-500 hover:bg-brand-600 text-white font-medium rounded-xl transition-colors shadow-sm"
            >
              <Play className="w-4 h-4" />
              Importar {clientes.length} clientes
            </button>
            <button onClick={reset}
              className="flex items-center gap-2 px-5 py-3 text-gray-600 border border-[#e8e4dd] rounded-xl hover:bg-white transition-colors"
            >
              <X className="w-4 h-4" />
              Cancelar
            </button>
          </div>
        </div>
      )}

      {estado === 'importando' && (
        <div className="bg-white rounded-2xl border border-[#e8e4dd] p-10 text-center animate-fade-in">
          <div className="w-16 h-16 bg-brand-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <Upload className="w-8 h-8 text-brand-600" />
          </div>
          <p className="text-base font-semibold text-gray-900 mb-1">Importando clientes...</p>
          <p className="text-sm text-gray-500 mb-6">No cerrés esta ventana</p>
          <div className="bg-gray-100 rounded-full h-3 mb-2 overflow-hidden">
            <div className="bg-brand-500 h-3 rounded-full transition-all duration-300" style={{ width: `${progreso}%` }} />
          </div>
          <p className="text-sm font-semibold text-brand-600">{progreso}%</p>
          <p className="text-xs text-gray-400 mt-1">{Math.round((progreso / 100) * clientes.length)} de {clientes.length} clientes</p>
        </div>
      )}

      {estado === 'done' && (
        <div className="space-y-5 animate-slide-up">
          <div className="bg-white rounded-2xl border border-[#e8e4dd] p-8 text-center">
            <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-1">¡Importación completada!</h2>
            <p className="text-sm text-gray-500">
              <span className="text-green-600 font-bold text-lg">{resultado.ok}</span> clientes importados correctamente
            </p>
            {resultado.errores.length > 0 && (
              <p className="text-sm text-amber-600 mt-1">{resultado.errores.length} con errores</p>
            )}
          </div>

          {resultado.errores.length > 0 && (
            <div className="bg-white rounded-xl border border-amber-200 overflow-hidden">
              <div className="px-5 py-3 bg-amber-50 border-b border-amber-200">
                <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Errores ({resultado.errores.length})</p>
              </div>
              <div className="max-h-48 overflow-y-auto divide-y divide-[#f7f5f1]">
                {resultado.errores.map((e, i) => (
                  <p key={i} className="px-5 py-2 text-xs text-gray-600">{e}</p>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <a href="/" className="flex-1 py-3 bg-brand-500 hover:bg-brand-600 text-white font-medium rounded-xl text-center transition-colors">
              Ir al dashboard
            </a>
            <button onClick={reset}
              className="flex items-center gap-2 px-5 py-3 text-gray-600 border border-[#e8e4dd] rounded-xl hover:bg-white transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Importar otro
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
