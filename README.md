# CRM Agenda · Say Hueque

Agenda de clientes y gestión de ferias para el equipo comercial de Say Hueque.

**Stack:** Next.js 14 · Supabase · Tailwind CSS · TypeScript · Vercel

---

## Setup inicial

### 1. Crear proyecto en Supabase

1. Ir a [supabase.com](https://supabase.com) → New project
2. Guardar la URL y las claves (anon key + service role key)

### 2. Ejecutar el schema

En el **SQL Editor** de Supabase, pegar y ejecutar el contenido de `schema.sql`.

### 3. Clonar y configurar el proyecto

```bash
git clone https://github.com/martinkSH/crm-sayhueque.git
cd crm-sayhueque
npm install

cp .env.local.example .env.local
# Editar .env.local con tus keys de Supabase
```

### 4. Correr en desarrollo

```bash
npm run dev
# → http://localhost:3000
```

### 5. Crear el primer usuario

En Supabase → **Authentication → Users → Add user**:
- Email: `tu@sayhueque.com`
- Password: el que quieras
- En `User Metadata` (JSON): `{ "nombre": "Tu Nombre", "rol": "admin" }`

El trigger `on_auth_user_created` crea automáticamente el registro en la tabla `usuarios`.

### 6. Importar datos del Excel

```bash
# Poner el Excel en la raíz del proyecto
cp /ruta/al/BASE_DATOS_ok__2_.xlsx .

# Instalar dependencias extra para el script
npm install xlsx

# Ejecutar la importación
SUPABASE_URL=https://xxx.supabase.co \
SUPABASE_SERVICE_KEY=eyJ... \
EXCEL_FILE=./BASE_DATOS_ok__2_.xlsx \
node scripts/import-excel.mjs
```

La importación procesa:
- `AGENCIAS ACTUALES` → ~376 clientes actuales con sus contactos
- `AGENCIA POTENCIALES` → ~1.321 clientes potenciales con sus contactos
- Eventos históricos: LATA 2024/2025, ATTA 2024/2025, PURE 2024, ITB 2021

### 7. Deploy en Vercel

```bash
# Conectar repo a Vercel
vercel --prod

# Agregar variables de entorno en Vercel:
# NEXT_PUBLIC_SUPABASE_URL
# NEXT_PUBLIC_SUPABASE_ANON_KEY
# SUPABASE_SERVICE_ROLE_KEY
```

---

## Estructura del proyecto

```
src/
├── app/
│   ├── (app)/                  # Layout protegido (requiere login)
│   │   ├── page.tsx            # Dashboard
│   │   ├── clientes/
│   │   │   ├── actuales/       # Lista clientes actuales
│   │   │   ├── potenciales/    # Lista clientes potenciales
│   │   │   ├── nuevo/          # Formulario nuevo cliente
│   │   │   └── [id]/           # Detalle de cliente
│   │   └── eventos/
│   │       ├── page.tsx        # Lista de eventos
│   │       ├── nuevo/          # Crear evento
│   │       └── [id]/           # Detalle / agenda del evento
│   ├── login/                  # Página de login
│   └── layout.tsx
├── components/
│   ├── Sidebar.tsx             # Navegación lateral
│   ├── ClientesPageClient.tsx  # Lista de clientes con filtros
│   ├── ClienteDetailClient.tsx # Ficha de cliente (comentarios, contactos, eventos)
│   ├── NuevoClienteForm.tsx    # Formulario de alta
│   └── EventoDetailClient.tsx  # Agenda de evento / feria
├── lib/
│   ├── supabase/               # Clientes de Supabase (browser + server)
│   └── utils.ts                # Helpers: fechas, colores, etc.
└── types/
    └── index.ts                # Tipos TypeScript completos
```

---

## Flujo de ferias

1. **Crear evento** → `/eventos/nuevo`  
   Cargar nombre (ej: "FIT 2026"), fechas, lugar y tipo.

2. **Armar agenda** → buscar clientes en el evento y agregarlos.  
   Se puede elegir el contacto específico a visitar, agregar notas previas y wish-list.

3. **Durante la feria** → marcar cada cliente como `confirmado` → `visitado`.  
   Tomar notas y resumen de la reunión en el momento.

4. **Cerrar evento** → clic en "Cerrar evento".  
   Todos los clientes marcados como `visitado` se actualizan automáticamente:
   - `ultimo_contacto` → fecha del evento
   - `ultimo_contacto_descripcion` → nombre del evento
   - Se agrega un comentario al historial del cliente con el resumen de la reunión

---

## Roles

| Rol       | Puede hacer                                      |
|-----------|--------------------------------------------------|
| `admin`   | Todo, incluyendo acceso a Configuración          |
| `vendedor`| Ver/editar clientes, crear eventos, cargar notas |

---

## Schema de base de datos

Ver `schema.sql` para el detalle completo. Las tablas principales:

- `usuarios` — perfiles vinculados a Supabase Auth
- `clientes` — agencias (actuales o potenciales)
- `contactos` — personas dentro de cada agencia
- `comentarios` — historial de interacciones
- `eventos` — ferias, webinars, roadshows
- `evento_clientes` — agenda de cada evento (qué clientes visitar)

La función `cerrar_evento(p_evento_id)` maneja toda la lógica de actualización al finalizar una feria.
