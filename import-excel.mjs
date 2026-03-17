#!/usr/bin/env node
/**
 * Script de importación del Excel BASE_DATOS_ok a Supabase
 * 
 * Uso:
 *   node scripts/import-excel.mjs --file ./BASE_DATOS_ok__2_.xlsx --supabase-url https://xxx.supabase.co --service-key eyJ...
 *
 * Instalar dependencias antes:
 *   npm install xlsx @supabase/supabase-js
 */

import XLSX from 'xlsx'
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

// ── Config ──────────────────────────────────────────────────
const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY
const EXCEL_FILE = process.env.EXCEL_FILE || './BASE_DATOS_ok__2_.xlsx'

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌  Definí las variables de entorno: SUPABASE_URL y SUPABASE_SERVICE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
})

// ── Helpers ──────────────────────────────────────────────────
function clean(v) {
  if (v === null || v === undefined) return null
  if (typeof v === 'string') return v.trim() || null
  return v
}

function cleanEmail(v) {
  const s = clean(v)
  if (!s) return null
  return s.toLowerCase().includes('@') ? s.toLowerCase() : null
}

function mapArea(vendedor, hoja) {
  const v = (vendedor ?? '').toString().toUpperCase()
  const h = (hoja ?? '').toString().toUpperCase()
  const areas = []
  if (['AGATA', 'CRAFT', 'WENDY', 'CARO', 'MARIEL'].includes(v)) areas.push('DMC FITs / CRAFT')
  if (h.includes('ALIWEN') || v === 'ALIWEN') areas.push('Aliwen')
  if (h.includes('PLATAFORMA')) areas.push('Plataformas / Web')
  if (areas.length === 0) areas.push('DMC Grupos')
  return [...new Set(areas)]
}

function mapEstado(estado) {
  if (!estado) return 'open'
  const s = estado.toString().toUpperCase()
  if (s.includes('FRECUENTE')) return 'cliente_frecuente'
  if (s.includes('ESPORAD')) return 'cliente_esporadico'
  if (s.includes('EX')) return 'ex_cliente'
  if (s.includes('DESARROL')) return 'en_desarrollo'
  return 'open'
}

function parseDate(v) {
  if (!v) return null
  if (v instanceof Date) return v.toISOString()
  if (typeof v === 'number') {
    // Excel serial date
    const d = XLSX.SSF.parse_date_code(v)
    if (d) return new Date(d.y, d.m - 1, d.d).toISOString()
  }
  if (typeof v === 'string') {
    const parsed = new Date(v)
    if (!isNaN(parsed.getTime())) return parsed.toISOString()
  }
  return null
}

// ── Read Excel ────────────────────────────────────────────────
console.log(`📂  Leyendo ${EXCEL_FILE}...`)
const workbook = XLSX.readFile(EXCEL_FILE, { cellDates: true })

// ── PASO 1: Importar AGENCIAS ACTUALES ────────────────────────
async function importarActuales(wb) {
  const sheet = wb.Sheets['AGENCIAS ACTUALES']
  if (!sheet) { console.warn('  ⚠  Hoja "AGENCIAS ACTUALES" no encontrada'); return }
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: null })

  console.log(`\n📋  AGENCIAS ACTUALES: ${rows.length} filas`)
  let importadas = 0, omitidas = 0

  // Agrupar por nombre de agencia
  const byAgencia = {}
  for (const row of rows) {
    const nombre = clean(row['NOMBRE AGENCIA'])
    if (!nombre) continue
    if (!byAgencia[nombre]) {
      byAgencia[nombre] = { row, contactos: [] }
    }
    const email = cleanEmail(row['EMAIL'])
    const fname = clean(row['FIRST_NAME'])
    const lname = clean(row['LAST_NAME'])
    if (fname || email) {
      byAgencia[nombre].contactos.push({
        nombre: fname ?? 'Sin nombre',
        apellido: lname,
        cargo: clean(row['puesto']),
        email,
        es_principal: byAgencia[nombre].contactos.length === 0,
      })
    }
  }

  for (const [nombre, { row, contactos }] of Object.entries(byAgencia)) {
    const cliente = {
      nombre_agencia: nombre,
      tipo: 'actual',
      area: mapArea(clean(row['VENDEDOR']), 'AGENCIAS ACTUALES'),
      estado: mapEstado(clean(row['ESTADO'])),
      pais: clean(row['COUNTRY']),
      idioma: clean(row['IDIOMA']),
      web: null,
      perfil_agencia: clean(row['PERFIL AGENCIA']),
      origen_contacto: clean(row['ORIGEN CONTACTO']),
      opera_family_travel: !!(clean(row['OPERAN FAMILY TRAVEL?'])),
      ultimo_contacto: parseDate(row['Ultima comunicacion']),
      ultimo_contacto_descripcion: clean(row['Ultima comunicacion']) ? 'Importado (Excel)' : null,
      notas: clean(row['COMENTARIOS']),
      importado_de: 'AGENCIAS ACTUALES',
    }

    const { data, error } = await supabase.from('clientes').insert(cliente).select('id').single()
    if (error) { console.error(`  ❌ ${nombre}: ${error.message}`); omitidas++; continue }

    // Insertar contactos
    if (contactos.length > 0 && data?.id) {
      await supabase.from('contactos').insert(
        contactos.map(c => ({ ...c, cliente_id: data.id }))
      )
    }
    importadas++
    if (importadas % 50 === 0) console.log(`  ... ${importadas} importadas`)
  }
  console.log(`  ✅ ${importadas} clientes actuales importadas, ${omitidas} omitidas`)
}

// ── PASO 2: Importar AGENCIAS POTENCIALES ─────────────────────
async function importarPotenciales(wb) {
  const sheet = wb.Sheets['AGENCIA POTENCIALES']
  if (!sheet) { console.warn('  ⚠  Hoja "AGENCIA POTENCIALES" no encontrada'); return }
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: null })

  console.log(`\n📋  AGENCIAS POTENCIALES: ${rows.length} filas`)
  let importadas = 0, omitidas = 0

  const byAgencia = {}
  for (const row of rows) {
    const nombre = clean(row['Agencias'])
    if (!nombre || typeof nombre === 'number') continue
    if (!byAgencia[nombre]) {
      byAgencia[nombre] = { row, contactos: [] }
    }
    const email = cleanEmail(row['EMAIL'])
    const fname = clean(row['FIRST NAME'])
    const lname = clean(row['LAST NAME'])
    if (fname || email) {
      byAgencia[nombre].contactos.push({
        nombre: fname ?? 'Sin nombre',
        apellido: lname,
        cargo: clean(row['Puesto']),
        email,
        es_principal: byAgencia[nombre].contactos.length === 0,
      })
    }
  }

  for (const [nombre, { row, contactos }] of Object.entries(byAgencia)) {
    const prioridad = parseInt(clean(row['PRIORIDAD FOLLOW UP'])) || null
    const cliente = {
      nombre_agencia: nombre,
      tipo: 'potencial',
      area: mapArea(clean(row['Vendedor']), 'AGENCIA POTENCIALES'),
      estado: 'open',
      pais: clean(row['COUNTRY']),
      idioma: clean(row['Idioma']),
      perfil_agencia: clean(row['PERFIL DE AGENCIA']),
      origen_contacto: clean(row['ORIGEN \nCONTACTO']),
      opera_family_travel: !!(clean(row['FAMILY TRAVEL?'])),
      tiene_dmc_arg: clean(row['Tienen DMC ARG actulalmente?']) === 'No' ? false :
                     clean(row['Tienen DMC ARG actulalmente?']) ? true : null,
      volumen: prioridad === 1 ? 'VIP' : prioridad === 2 ? 'ALTO' : prioridad === 3 ? 'MEDIO' : prioridad >= 4 ? 'BAJO' : null,
      ultimo_contacto: parseDate(row['Last communication ']),
      ultimo_contacto_descripcion: parseDate(row['Last communication ']) ? 'Importado (Excel)' : null,
      notas: clean(row['COMENTARIOS']),
      importado_de: 'AGENCIA POTENCIALES',
    }

    const { data, error } = await supabase.from('clientes').insert(cliente).select('id').single()
    if (error) { console.error(`  ❌ ${nombre}: ${error.message}`); omitidas++; continue }

    if (contactos.length > 0 && data?.id) {
      await supabase.from('contactos').insert(
        contactos.map(c => ({ ...c, cliente_id: data.id }))
      )
    }
    importadas++
    if (importadas % 100 === 0) console.log(`  ... ${importadas} importadas`)
  }
  console.log(`  ✅ ${importadas} clientes potenciales importadas, ${omitidas} omitidas`)
}

// ── PASO 3: Importar eventos históricos (LATA, ATTA, PURE) ────
async function importarEventosHistoricos(wb, adminUserId) {
  const MAPEO_EVENTOS = [
    { hoja: 'LATA EXPO 25',  nombre: 'LATA Expo 2025', tipo: 'feria', lugar: 'Londres, UK', fecha: '2025-06-02' },
    { hoja: 'LATA EXPO 24',  nombre: 'LATA Expo 2024', tipo: 'feria', lugar: 'Londres, UK', fecha: '2024-06-24' },
    { hoja: 'ATTA OCT25',    nombre: 'ATTA Summit 2025', tipo: 'feria', lugar: 'Chile', fecha: '2025-10-01' },
    { hoja: 'ATTA OCT24',    nombre: 'ATTA Summit 2024', tipo: 'feria', lugar: null, fecha: '2024-10-01' },
    { hoja: 'PURE SEP24',    nombre: 'PURE 2024', tipo: 'feria', lugar: 'Londres, UK', fecha: '2024-09-23' },
    { hoja: 'ITB FEB 21',    nombre: 'ITB 2021', tipo: 'feria', lugar: 'Berlín, Alemania', fecha: '2021-03-01' },
  ]

  console.log(`\n📅  Importando eventos históricos...`)

  for (const { hoja, nombre, tipo, lugar, fecha } of MAPEO_EVENTOS) {
    const sheet = wb.Sheets[hoja]
    if (!sheet) { console.log(`  ⚠  Saltando "${hoja}" (no encontrada)`); continue }

    // Crear el evento
    const { data: evento } = await supabase
      .from('eventos')
      .insert({ nombre, tipo, lugar, fecha_inicio: fecha, estado: 'finalizado', created_by: adminUserId })
      .select('id')
      .single()
    if (!evento) { console.log(`  ❌  No se pudo crear evento ${nombre}`); continue }

    // Leer rows y vincular clientes que existan en la DB
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: null })
    let vinculados = 0

    for (const row of rows) {
      // Buscar nombre de agencia en las columnas posibles
      const agenciaNombre = clean(row['Unnamed: 1'] ?? row['nombre de la Empresa'] ?? row['Agencias'])
      if (!agenciaNombre || typeof agenciaNombre === 'number') continue

      const { data: cliente } = await supabase
        .from('clientes')
        .select('id')
        .ilike('nombre_agencia', agenciaNombre)
        .single()
      if (!cliente) continue

      const resumen = clean(row['Resumen Reunion'] ?? row['Resumen meeting 2025'] ?? row['Resumen Reunion Junio 2024 / LATA EXPO'])
      const acciones = clean(row['Acciones'] ?? row['Accion'])

      await supabase.from('evento_clientes').insert({
        evento_id: evento.id,
        cliente_id: cliente.id,
        estado: 'visitado',
        resumen_reunion: resumen,
        acciones_followup: acciones,
        actualizo_cliente: true,
      }).select()

      // Actualizar ultimo_contacto del cliente
      await supabase.from('clientes')
        .update({ ultimo_contacto: new Date(fecha).toISOString(), ultimo_contacto_descripcion: nombre, ultimo_contacto_evento_id: evento.id })
        .eq('id', cliente.id)

      vinculados++
    }
    console.log(`  ✅  ${nombre}: ${vinculados} clientes vinculados`)
  }
}

// ── Main ──────────────────────────────────────────────────────
async function main() {
  console.log('🚀  Iniciando importación...\n')

  // Obtener un admin para asignar como created_by
  const { data: admin } = await supabase.from('usuarios').select('id').limit(1).single()
  const adminId = admin?.id ?? null

  await importarActuales(workbook)
  await importarPotenciales(workbook)

  if (adminId) {
    await importarEventosHistoricos(workbook, adminId)
  } else {
    console.warn('\n⚠  No hay usuarios en la DB. Creá el primer usuario en Supabase Auth antes de importar eventos.')
  }

  console.log('\n🎉  Importación completada!')
  console.log('\nPróximos pasos:')
  console.log('  1. Revisá en Supabase que los datos se vean bien')
  console.log('  2. Asigná vendedores a los clientes importados')
  console.log('  3. Revisá los clientes sin área asignada')
}

main().catch(e => { console.error('💥', e); process.exit(1) })
