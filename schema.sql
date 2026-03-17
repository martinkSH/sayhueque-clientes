-- ============================================================
-- CRM Say Hueque - Supabase Schema
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- USUARIOS (manejado por Supabase Auth + esta tabla de perfil)
-- ============================================================
create table public.usuarios (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  nombre text not null,
  rol text not null default 'vendedor' check (rol in ('admin', 'vendedor')),
  avatar_url text,
  activo boolean default true,
  created_at timestamptz default now()
);

-- ============================================================
-- CLIENTES
-- ============================================================
create table public.clientes (
  id uuid primary key default uuid_generate_v4(),
  nombre_agencia text not null,
  tipo text not null default 'potencial' check (tipo in ('actual', 'potencial')),
  area text[] not null default '{}', -- puede pertenecer a más de un área
  estado text default 'open' check (estado in ('cliente_frecuente', 'cliente_esporadico', 'ex_cliente', 'open', 'en_desarrollo')),
  pais text,
  idioma text,
  perfil_agencia text,
  origen_contacto text,
  web text,
  vendedor_principal uuid references public.usuarios(id),
  volumen text check (volumen in ('VIP', 'ALTO', 'MEDIO', 'BAJO', 'EN_DESARROLLO')),
  opera_family_travel boolean default false,
  tiene_dmc_arg boolean,
  vende_arg_chile boolean,
  notas text, -- campo largo para comentarios generales / historia de la agencia
  ultimo_contacto timestamptz,
  ultimo_contacto_evento_id uuid, -- referencia al evento donde fue el último contacto
  ultimo_contacto_descripcion text, -- ej: "FIT2026", "Email directo", etc.
  importado_de text, -- hoja de origen del excel para trazabilidad
  activo boolean default true,
  created_at timestamptz default now(),
  created_by uuid references public.usuarios(id),
  updated_at timestamptz default now()
);

-- ============================================================
-- CONTACTOS (personas dentro de cada agencia)
-- ============================================================
create table public.contactos (
  id uuid primary key default uuid_generate_v4(),
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  nombre text not null,
  apellido text,
  cargo text,
  email text,
  telefono text,
  es_principal boolean default false,
  notas text,
  activo boolean default true,
  created_at timestamptz default now(),
  created_by uuid references public.usuarios(id)
);

-- ============================================================
-- COMENTARIOS / HISTORIAL DE INTERACCIONES
-- ============================================================
create table public.comentarios (
  id uuid primary key default uuid_generate_v4(),
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  usuario_id uuid not null references public.usuarios(id),
  contenido text not null,
  tipo text default 'general' check (tipo in ('general', 'seguimiento', 'reunion', 'email', 'llamada', 'whatsapp')),
  es_ultimo_contacto boolean default false, -- flag para identificar el comentario más reciente
  evento_id uuid, -- se completa si vino de un evento/feria
  created_at timestamptz default now()
);

-- ============================================================
-- EVENTOS / FERIAS
-- ============================================================
create table public.eventos (
  id uuid primary key default uuid_generate_v4(),
  nombre text not null, -- ej: "FIT 2026", "LATA Expo 2026"
  descripcion text,
  tipo text default 'feria' check (tipo in ('feria', 'webinar', 'roadshow', 'reunion', 'otro')),
  lugar text,
  fecha_inicio date,
  fecha_fin date,
  estado text default 'planificacion' check (estado in ('planificacion', 'en_curso', 'finalizado')),
  created_by uuid references public.usuarios(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- FK retroactiva en comentarios
alter table public.comentarios
  add constraint fk_comentarios_evento
  foreign key (evento_id) references public.eventos(id);

-- FK retroactiva en clientes
alter table public.clientes
  add constraint fk_clientes_ultimo_evento
  foreign key (ultimo_contacto_evento_id) references public.eventos(id);

-- ============================================================
-- EVENTO_CLIENTES (agenda de un evento: qué clientes visitar)
-- ============================================================
create table public.evento_clientes (
  id uuid primary key default uuid_generate_v4(),
  evento_id uuid not null references public.eventos(id) on delete cascade,
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  contacto_id uuid references public.contactos(id), -- contacto específico a ver en la feria
  estado text default 'pendiente' check (estado in ('pendiente', 'confirmado', 'visitado', 'cancelado')),
  fecha_reunion timestamptz, -- horario específico de la cita
  notas_previas text, -- qué queremos hablar / contexto antes de la reunión
  resumen_reunion text, -- notas tomadas durante/después
  acciones_followup text, -- qué hay que hacer después
  wish_list text, -- qué destinos/servicios le interesan
  prioridad int default 3 check (prioridad between 1 and 5), -- 1 = máxima prioridad
  actualizo_cliente boolean default false, -- si ya se actualizó el ultimo_contacto del cliente
  created_at timestamptz default now(),
  unique(evento_id, cliente_id) -- un cliente aparece una sola vez por evento
);

-- ============================================================
-- UPDATED_AT TRIGGERS
-- ============================================================
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_clientes_updated_at
  before update on public.clientes
  for each row execute function public.handle_updated_at();

create trigger trg_eventos_updated_at
  before update on public.eventos
  for each row execute function public.handle_updated_at();

-- ============================================================
-- FUNCIÓN: cerrar evento → actualizar ultimo_contacto en clientes
-- Se llama manualmente al "cerrar" un evento desde la app
-- ============================================================
create or replace function public.cerrar_evento(p_evento_id uuid)
returns void as $$
declare
  v_evento record;
  v_ec record;
  v_descripcion text;
begin
  select * into v_evento from public.eventos where id = p_evento_id;
  if not found then raise exception 'Evento no encontrado'; end if;

  v_descripcion := v_evento.nombre;

  -- Para cada cliente visitado en el evento
  for v_ec in
    select * from public.evento_clientes
    where evento_id = p_evento_id
      and estado = 'visitado'
      and actualizo_cliente = false
  loop
    -- Insertar comentario automático en el historial del cliente
    insert into public.comentarios (cliente_id, usuario_id, contenido, tipo, es_ultimo_contacto, evento_id)
    select
      v_ec.cliente_id,
      v_evento.created_by,
      coalesce(v_ec.resumen_reunion, 'Reunión en ' || v_descripcion),
      'reunion',
      true,
      p_evento_id;

    -- Marcar comentarios anteriores como no-último
    update public.comentarios
    set es_ultimo_contacto = false
    where cliente_id = v_ec.cliente_id
      and id != (select id from public.comentarios
                 where cliente_id = v_ec.cliente_id
                 order by created_at desc limit 1);

    -- Actualizar ultimo_contacto en el cliente
    update public.clientes
    set
      ultimo_contacto = coalesce(v_ec.fecha_reunion, now()),
      ultimo_contacto_evento_id = p_evento_id,
      ultimo_contacto_descripcion = v_descripcion,
      updated_at = now()
    where id = v_ec.cliente_id;

    -- Marcar como procesado
    update public.evento_clientes
    set actualizo_cliente = true
    where id = v_ec.id;

  end loop;

  -- Marcar evento como finalizado
  update public.eventos set estado = 'finalizado', updated_at = now()
  where id = p_evento_id;

end;
$$ language plpgsql security definer;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table public.usuarios enable row level security;
alter table public.clientes enable row level security;
alter table public.contactos enable row level security;
alter table public.comentarios enable row level security;
alter table public.eventos enable row level security;
alter table public.evento_clientes enable row level security;

-- Todos los usuarios autenticados pueden leer todo
create policy "usuarios_select" on public.usuarios for select to authenticated using (true);
create policy "clientes_select" on public.clientes for select to authenticated using (true);
create policy "contactos_select" on public.contactos for select to authenticated using (true);
create policy "comentarios_select" on public.comentarios for select to authenticated using (true);
create policy "eventos_select" on public.eventos for select to authenticated using (true);
create policy "evento_clientes_select" on public.evento_clientes for select to authenticated using (true);

-- Insert / update / delete para usuarios autenticados
create policy "clientes_insert" on public.clientes for insert to authenticated with check (true);
create policy "clientes_update" on public.clientes for update to authenticated using (true);
create policy "contactos_insert" on public.contactos for insert to authenticated with check (true);
create policy "contactos_update" on public.contactos for update to authenticated using (true);
create policy "comentarios_insert" on public.comentarios for insert to authenticated with check (true);
create policy "eventos_insert" on public.eventos for insert to authenticated with check (true);
create policy "eventos_update" on public.eventos for update to authenticated using (true);
create policy "evento_clientes_insert" on public.evento_clientes for insert to authenticated with check (true);
create policy "evento_clientes_update" on public.evento_clientes for update to authenticated using (true);
create policy "evento_clientes_delete" on public.evento_clientes for delete to authenticated using (true);

-- Usuarios: solo el propio usuario o admin puede actualizar su perfil
create policy "usuarios_insert" on public.usuarios for insert to authenticated with check (id = auth.uid());
create policy "usuarios_update" on public.usuarios for update to authenticated using (id = auth.uid());

-- ============================================================
-- FUNCTION: handle_new_user (trigger al registrarse)
-- ============================================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.usuarios (id, email, nombre, rol)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'nombre', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'rol', 'vendedor')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- ÍNDICES para performance
-- ============================================================
create index idx_clientes_tipo on public.clientes(tipo);
create index idx_clientes_area on public.clientes using gin(area);
create index idx_clientes_vendedor on public.clientes(vendedor_principal);
create index idx_clientes_ultimo_contacto on public.clientes(ultimo_contacto);
create index idx_clientes_nombre on public.clientes(nombre_agencia);
create index idx_contactos_cliente on public.contactos(cliente_id);
create index idx_comentarios_cliente on public.comentarios(cliente_id);
create index idx_comentarios_created on public.comentarios(created_at desc);
create index idx_evento_clientes_evento on public.evento_clientes(evento_id);
create index idx_evento_clientes_cliente on public.evento_clientes(cliente_id);
