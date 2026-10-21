-- 0045 · Trámites académicos: borrador, envío, versiones y revisión del coordinador
--
-- EJECUTAR DESPUÉS DE LA 0044 Y ANTES DE DESPLEGAR.
--
-- QUÉ FALTABA
-- `solicitudes_admin` guardaba el asunto y un estado, nada más: no había documento presentado,
-- ni destinatario, ni historial. La pantalla del admin ofrecía un `<select>` con los tres
-- estados, así que cualquiera con acceso podía poner "aprobado" sin dejar rastro de quién ni
-- por qué. Y el oficio que el estudiante llenaba en "Modelos de oficio" no se presentaba: se
-- descargaba y ahí terminaba el sistema.
--
-- QUÉ AÑADE
--   1. `carreras.id_director` / `facultades.id_decano` — hasta ahora el coordinador existía solo
--      como texto (`carreras.director`), imposible de usar como destinatario ni para permisos.
--   2. `usuarios.firma_path` + bucket privado `firmas` — la firma vivía en `localStorage` bajo
--      una clave compartida: en un laboratorio, el siguiente estudiante heredaba la firma del
--      anterior.
--   3. `solicitudes_admin_versiones` — una instantánea por envío. Cambiar la plantilla o el logo
--      después NO altera lo ya presentado.
--   4. `solicitudes_admin_eventos` — quién hizo qué y cuándo, con las observaciones.
--   5. Funciones transaccionales para guardar, enviar y revisar. El frontend ya no elige estado.
--
-- NO TOCA `solicitudes_equipo` NI `prestamos`: son el módulo de préstamos.
-- NO BORRA NINGUNA SOLICITUD HISTÓRICA: las columnas nuevas quedan en NULL y el estado de las
-- filas existentes se conserva tal cual.
--
-- Ejecutar en Supabase → SQL Editor.

begin;

-- ---------------------------------------------------------------------------
-- 1 · El coordinador tiene que ser una cuenta, no un nombre escrito
--
-- CÓMO SE CONFIGURA: por cada carrera, apuntar `id_director` al usuario que la coordina.
--     update public.carreras
--        set id_director = (select id from public.usuarios where email = 'coordinador@espoch.edu.ec')
--      where nombre = 'Electricidad';
-- Mientras `id_director` esté vacío, la pantalla del estudiante avisa de que no hay coordinador
-- configurado y no deja enviar: inventar un destinatario o mandárselo a todos los
-- administradores sería peor que decir que falta un dato.
-- ---------------------------------------------------------------------------
alter table public.carreras
  add column if not exists id_director uuid references public.usuarios(id) on delete set null;
alter table public.facultades
  add column if not exists id_decano uuid references public.usuarios(id) on delete set null;

comment on column public.carreras.id_director is
  'Cuenta del coordinador/director de carrera. `director` (texto) se conserva para el nombre '
  'impreso en los oficios; esta columna es la que decide permisos y destino de un trámite.';
comment on column public.facultades.id_decano is
  'Cuenta del decano. Mismo criterio que carreras.id_director.';


-- ---------------------------------------------------------------------------
-- 2 · Firma del perfil, privada y por persona
-- ---------------------------------------------------------------------------
alter table public.usuarios
  add column if not exists firma_path text;

comment on column public.usuarios.firma_path is
  'Ruta de la imagen de firma dentro del bucket privado `firmas`, siempre `<id de usuario>/…`. '
  'Es una IMAGEN de firma, no una firma electrónica certificada.';

-- Bucket privado. 2 MB y solo imágenes: una firma pesa unas decenas de KB.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('firmas', 'firmas', false, 2097152, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do update
  set public = false,
      file_size_limit = 2097152,
      allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp'];

-- Cada quien solo alcanza su propia carpeta. El coordinador NO necesita leer este bucket: la
-- firma que se presentó viaja dentro de la instantánea de la versión enviada.
drop policy if exists firmas_lee_lo_suyo on storage.objects;
create policy firmas_lee_lo_suyo on storage.objects
  for select to authenticated
  using (bucket_id = 'firmas' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists firmas_sube_lo_suyo on storage.objects;
create policy firmas_sube_lo_suyo on storage.objects
  for insert to authenticated
  with check (bucket_id = 'firmas' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists firmas_reemplaza_lo_suyo on storage.objects;
create policy firmas_reemplaza_lo_suyo on storage.objects
  for update to authenticated
  using (bucket_id = 'firmas' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'firmas' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists firmas_borra_lo_suyo on storage.objects;
create policy firmas_borra_lo_suyo on storage.objects
  for delete to authenticated
  using (bucket_id = 'firmas' and (storage.foldername(name))[1] = auth.uid()::text);


-- ---------------------------------------------------------------------------
-- 3 · La solicitud: destinatario, plantilla, borrador y rastro de la decisión
-- ---------------------------------------------------------------------------
alter table public.solicitudes_admin
  add column if not exists id_destinatario uuid    references public.usuarios(id) on delete set null,
  add column if not exists id_formato      text    references public.formatos(id) on delete set null,
  add column if not exists version         smallint not null default 0,
  add column if not exists borrador        jsonb,
  add column if not exists enviada_en      timestamptz,
  add column if not exists decidida_en     timestamptz,
  add column if not exists decidido_por    uuid    references public.usuarios(id) on delete set null,
  add column if not exists observaciones   text;

comment on column public.solicitudes_admin.version is
  'Cuántas veces se ha presentado. 0 = todavía es un borrador; 2 o más = hubo reenvío. Por eso '
  'no hace falta un estado "reenviada".';
comment on column public.solicitudes_admin.borrador is
  'Documento en edición. Se pisa con cada guardado; lo presentado vive en las versiones, que '
  'son inmutables.';
comment on column public.solicitudes_admin.observaciones is
  'Última indicación del revisor. El histórico completo está en solicitudes_admin_eventos.';

do $$
begin
  if exists (select 1 from public.solicitudes_admin group by numero having count(*) > 1) then
    raise notice 'Hay números de trámite repetidos: no se creó el índice único. Depurarlos y repetir.';
  else
    create unique index if not exists solicitudes_admin_numero_unico
      on public.solicitudes_admin (numero);
  end if;
end;
$$;

create index if not exists solicitudes_admin_destinatario_idx on public.solicitudes_admin (id_destinatario);
create index if not exists solicitudes_admin_usuario_idx      on public.solicitudes_admin (id_usuario);


-- ---------------------------------------------------------------------------
-- 4 · Las versiones presentadas — el respaldo de lo que el estudiante entregó
--
-- `documento` guarda TODO lo necesario para reimprimir el oficio sin depender de nada que
-- pueda cambiar después: los datos completados, el texto de la plantilla ya resuelto, el
-- destinatario, el encabezado y el pie usados, y la imagen de firma si el estudiante decidió
-- incorporarla. Esa copia es el motivo de que la instantánea pese: es lo que la hace válida.
-- ---------------------------------------------------------------------------
create table if not exists public.solicitudes_admin_versiones (
  id           bigserial primary key,
  id_solicitud bigint      not null references public.solicitudes_admin(id) on delete cascade,
  version      smallint    not null,
  documento    jsonb       not null,
  creada_por   uuid        references public.usuarios(id) on delete set null,
  creada_en    timestamptz not null default now(),
  unique (id_solicitud, version)
);

comment on table public.solicitudes_admin_versiones is
  'Instantánea inmutable de cada envío. Sin políticas de update ni delete: lo presentado no se '
  'reescribe.';

create index if not exists solicitudes_admin_versiones_solicitud_idx
  on public.solicitudes_admin_versiones (id_solicitud, version desc);


-- ---------------------------------------------------------------------------
-- 5 · El historial de decisiones
--
-- `accion` es texto con CHECK y no un enum: agregar una acción nueva no debería obligar a
-- partir la migración en dos por el problema de `alter type ... add value`.
-- ---------------------------------------------------------------------------
create table if not exists public.solicitudes_admin_eventos (
  id            bigserial primary key,
  id_solicitud  bigint      not null references public.solicitudes_admin(id) on delete cascade,
  id_version    bigint      references public.solicitudes_admin_versiones(id) on delete set null,
  accion        text        not null check (accion in (
                  'creada', 'enviada', 'reenviada', 'aprobada', 'rechazada', 'cambios_solicitados'
                )),
  actor         uuid        references public.usuarios(id) on delete set null,
  observaciones text,
  creado_en     timestamptz not null default now()
);

create index if not exists solicitudes_admin_eventos_solicitud_idx
  on public.solicitudes_admin_eventos (id_solicitud, creado_en);


-- ---------------------------------------------------------------------------
-- 6 · Numeración en el servidor
-- ---------------------------------------------------------------------------
create sequence if not exists public.solicitudes_admin_numero_seq;

create or replace function public.numero_solicitud_admin()
returns text
language sql
volatile
set search_path = public
as $$
  select 'TRA-'
      || to_char(now() at time zone 'America/Guayaquil', 'YYYY')
      || '-'
      || lpad(nextval('public.solicitudes_admin_numero_seq')::text, 5, '0');
$$;

do $$
declare
  v_maximo bigint;
begin
  select coalesce(max(nullif(regexp_replace(numero, '^\D*\d{4}\D*', ''), '')::bigint), 0)
    into v_maximo
    from public.solicitudes_admin
   where numero ~ '^\D*\d{4}\D*\d+$';

  if v_maximo > 0 then
    perform setval('public.solicitudes_admin_numero_seq', v_maximo);
  end if;
exception when others then
  raise notice 'No se pudo alinear la secuencia con los números existentes: %', sqlerrm;
end;
$$;


-- ---------------------------------------------------------------------------
-- 7 · Quién es quién
--
-- `es_staff()` (migración 0024) es admin + técnico y sigue gobernando la LECTURA de la bandeja,
-- que es lo que esas pantallas ya hacían. Decidir es otra cosa: la decide el destinatario, y
-- como facultad administrativa explícita, el administrador.
-- ---------------------------------------------------------------------------
create or replace function public.es_administrador()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
      from public.usuarios u
      join public.roles r on r.id = u.id_rol
     where u.id = auth.uid()
       and r.nombre = 'Administrador'
  );
$$;

commit;


-- ---------------------------------------------------------------------------
-- 8 · Operaciones transaccionales
-- ---------------------------------------------------------------------------

-- 8.1 · Guardar borrador. Crea la solicitud la primera vez y la pisa después.
create or replace function public.guardar_borrador_solicitud_academica(
  p_id              bigint,
  p_asunto          text,
  p_tipo            text,
  p_id_destinatario uuid,
  p_id_formato      text,
  p_documento       jsonb,
  p_descripcion     text default null
)
returns public.solicitudes_admin
language plpgsql
security definer
set search_path = public
as $$
declare
  v_usuario uuid := auth.uid();
  v_sol     public.solicitudes_admin;
begin
  if v_usuario is null then
    raise exception 'Inicia sesión para guardar el trámite.' using errcode = '28000';
  end if;
  if coalesce(btrim(p_asunto), '') = '' then
    raise exception 'El trámite necesita un asunto.' using errcode = '22023';
  end if;

  if p_id is null then
    insert into public.solicitudes_admin
      (numero, asunto, tipo, id_usuario, fecha, estado, descripcion,
       id_destinatario, id_formato, version, borrador)
    values
      (public.numero_solicitud_admin(), btrim(p_asunto), coalesce(p_tipo, 'Oficio')::public.tipo_solicitud_admin,
       v_usuario, (now() at time zone 'America/Guayaquil')::date, 'borrador',
       nullif(btrim(p_descripcion), ''), p_id_destinatario, p_id_formato, 0, p_documento)
    returning * into v_sol;

    insert into public.solicitudes_admin_eventos (id_solicitud, accion, actor)
    values (v_sol.id, 'creada', v_usuario);

    return v_sol;
  end if;

  select * into v_sol from public.solicitudes_admin where id = p_id for update;
  if not found then
    raise exception 'El trámite no existe.' using errcode = 'P0002';
  end if;
  if v_sol.id_usuario is distinct from v_usuario then
    raise exception 'Solo puedes editar tus propios trámites.' using errcode = '42501';
  end if;
  -- Una solicitud presentada no se modifica por detrás: para corregirla, el coordinador tiene
  -- que haber pedido cambios.
  if v_sol.estado not in ('borrador', 'cambios_solicitados') then
    raise exception 'Este trámite ya fue presentado y no se puede editar (estado: %).', v_sol.estado
      using errcode = '55000';
  end if;

  update public.solicitudes_admin
     set asunto          = btrim(p_asunto),
         tipo            = coalesce(p_tipo, tipo::text)::public.tipo_solicitud_admin,
         descripcion     = nullif(btrim(p_descripcion), ''),
         id_destinatario = p_id_destinatario,
         id_formato      = p_id_formato,
         borrador        = p_documento,
         updated_at      = now()
   where id = p_id
  returning * into v_sol;

  return v_sol;
end;
$$;


-- 8.2 · Presentar el trámite. Aquí nace la versión, que ya no cambia.
create or replace function public.enviar_solicitud_academica(
  p_id        bigint,
  p_documento jsonb
)
returns public.solicitudes_admin
language plpgsql
security definer
set search_path = public
as $$
declare
  v_usuario    uuid := auth.uid();
  v_sol        public.solicitudes_admin;
  v_version    smallint;
  v_id_version bigint;
  v_reenvio    boolean;
begin
  if v_usuario is null then
    raise exception 'Inicia sesión para presentar el trámite.' using errcode = '28000';
  end if;

  -- El bloqueo serializa el doble clic: el segundo llega cuando el estado ya cambió.
  select * into v_sol from public.solicitudes_admin where id = p_id for update;
  if not found then
    raise exception 'El trámite no existe.' using errcode = 'P0002';
  end if;
  if v_sol.id_usuario is distinct from v_usuario then
    raise exception 'Solo puedes presentar tus propios trámites.' using errcode = '42501';
  end if;
  if v_sol.estado not in ('borrador', 'cambios_solicitados') then
    raise exception 'Este trámite ya está presentado (estado: %).', v_sol.estado
      using errcode = '55000';
  end if;
  if v_sol.id_destinatario is null then
    raise exception 'El trámite no tiene destinatario: falta configurar el coordinador de la carrera.'
      using errcode = '22023';
  end if;
  if v_sol.id_destinatario = v_usuario then
    raise exception 'No puedes dirigirte un trámite a ti mismo.' using errcode = '22023';
  end if;
  if p_documento is null or jsonb_typeof(p_documento) <> 'object' then
    raise exception 'Falta el documento que se presenta.' using errcode = '22023';
  end if;

  v_reenvio := v_sol.version > 0;
  v_version := (v_sol.version + 1)::smallint;

  insert into public.solicitudes_admin_versiones (id_solicitud, version, documento, creada_por)
  values (p_id, v_version, p_documento, v_usuario)
  returning id into v_id_version;

  update public.solicitudes_admin
     set estado        = 'pendiente',
         version       = v_version,
         enviada_en    = now(),
         observaciones = null,
         decidida_en   = null,
         decidido_por  = null,
         updated_at    = now()
   where id = p_id
  returning * into v_sol;

  insert into public.solicitudes_admin_eventos (id_solicitud, id_version, accion, actor)
  values (p_id, v_id_version, case when v_reenvio then 'reenviada' else 'enviada' end, v_usuario);

  return v_sol;
end;
$$;


-- 8.3 · La decisión del responsable.
create or replace function public.revisar_solicitud_academica(
  p_id            bigint,
  p_decision      text,
  p_observaciones text default null
)
returns public.solicitudes_admin
language plpgsql
security definer
set search_path = public
as $$
declare
  v_usuario    uuid := auth.uid();
  v_sol        public.solicitudes_admin;
  v_id_version bigint;
  v_accion     text;
begin
  if v_usuario is null then
    raise exception 'Inicia sesión para revisar el trámite.' using errcode = '28000';
  end if;
  if p_decision not in ('aprobado', 'rechazado', 'cambios_solicitados') then
    raise exception 'Decisión desconocida: %.', p_decision using errcode = '22023';
  end if;
  -- Rechazar o devolver sin decir por qué deja al estudiante sin saber qué corregir.
  if p_decision <> 'aprobado' and coalesce(btrim(p_observaciones), '') = '' then
    raise exception 'Escribe las observaciones para %.',
      case when p_decision = 'rechazado' then 'rechazar' else 'pedir cambios' end
      using errcode = '22023';
  end if;

  select * into v_sol from public.solicitudes_admin where id = p_id for update;
  if not found then
    raise exception 'El trámite no existe.' using errcode = 'P0002';
  end if;

  -- Nadie decide sobre lo suyo, ni siquiera un administrador.
  if v_sol.id_usuario = v_usuario then
    raise exception 'No puedes revisar tu propio trámite.' using errcode = '42501';
  end if;
  if v_sol.id_destinatario is distinct from v_usuario and not public.es_administrador() then
    raise exception 'Este trámite lo revisa su destinatario.' using errcode = '42501';
  end if;
  -- Dos revisores a la vez: el segundo encuentra el trámite ya decidido y no lo pisa.
  if v_sol.estado <> 'pendiente' then
    raise exception 'Este trámite ya fue revisado (estado: %).', v_sol.estado
      using errcode = '55000';
  end if;

  select id into v_id_version
    from public.solicitudes_admin_versiones
   where id_solicitud = p_id
   order by version desc
   limit 1;

  v_accion := case p_decision
                when 'aprobado' then 'aprobada'
                when 'rechazado' then 'rechazada'
                else 'cambios_solicitados'
              end;

  update public.solicitudes_admin
     set estado        = p_decision::public.estado_solicitud_admin,
         observaciones = nullif(btrim(p_observaciones), ''),
         decidida_en   = now(),
         decidido_por  = v_usuario,
         updated_at    = now()
   where id = p_id
  returning * into v_sol;

  insert into public.solicitudes_admin_eventos (id_solicitud, id_version, accion, actor, observaciones)
  values (p_id, v_id_version, v_accion, v_usuario, nullif(btrim(p_observaciones), ''));

  return v_sol;
end;
$$;


revoke all on function public.guardar_borrador_solicitud_academica(bigint, text, text, uuid, text, jsonb, text) from anon;
revoke all on function public.enviar_solicitud_academica(bigint, jsonb)                                          from anon;
revoke all on function public.revisar_solicitud_academica(bigint, text, text)                                    from anon;
revoke all on function public.numero_solicitud_admin()                                                           from anon;

grant execute on function public.guardar_borrador_solicitud_academica(bigint, text, text, uuid, text, jsonb, text) to authenticated;
grant execute on function public.enviar_solicitud_academica(bigint, jsonb)                                          to authenticated;
grant execute on function public.revisar_solicitud_academica(bigint, text, text)                                    to authenticated;


-- ---------------------------------------------------------------------------
-- 9 · RLS
-- ---------------------------------------------------------------------------
begin;

alter table public.solicitudes_admin           enable row level security;
alter table public.solicitudes_admin_versiones enable row level security;
alter table public.solicitudes_admin_eventos   enable row level security;

-- Una política con `using (true)` anula a las demás (las permisivas se suman con OR). Se buscan
-- por su condición y no por su nombre, que puede ser cualquiera.
do $$
declare
  v_politica record;
begin
  for v_politica in
    select policyname, tablename
      from pg_policies
     where schemaname = 'public'
       and tablename = 'solicitudes_admin'
       and (coalesce(qual, '') = 'true' or coalesce(with_check, '') = 'true')
  loop
    raise notice 'Se quita la política abierta %.%', v_politica.tablename, v_politica.policyname;
    execute format('drop policy %I on public.%I', v_politica.policyname, v_politica.tablename);
  end loop;
end;
$$;

-- Lectura: el autor, el destinatario y el personal de la bandeja (admin y técnico, que es quien
-- ya entraba a Trámites).
drop policy if exists solicitudes_admin_lectura on public.solicitudes_admin;
create policy solicitudes_admin_lectura on public.solicitudes_admin
  for select to authenticated
  using (id_usuario = auth.uid() or id_destinatario = auth.uid() or public.es_staff());

-- Sin INSERT ni UPDATE directos: el estado lo deciden las funciones de arriba. El borrado queda
-- para el administrador, que es quien depura la bandeja.
drop policy if exists solicitudes_admin_admin_borra on public.solicitudes_admin;
create policy solicitudes_admin_admin_borra on public.solicitudes_admin
  for delete to authenticated
  using (public.es_administrador());

drop policy if exists solicitudes_admin_versiones_lectura on public.solicitudes_admin_versiones;
create policy solicitudes_admin_versiones_lectura on public.solicitudes_admin_versiones
  for select to authenticated
  using (exists (
    select 1
      from public.solicitudes_admin s
     where s.id = solicitudes_admin_versiones.id_solicitud
       and (s.id_usuario = auth.uid() or s.id_destinatario = auth.uid() or public.es_staff())
  ));

drop policy if exists solicitudes_admin_eventos_lectura on public.solicitudes_admin_eventos;
create policy solicitudes_admin_eventos_lectura on public.solicitudes_admin_eventos
  for select to authenticated
  using (exists (
    select 1
      from public.solicitudes_admin s
     where s.id = solicitudes_admin_eventos.id_solicitud
       and (s.id_usuario = auth.uid() or s.id_destinatario = auth.uid() or public.es_staff())
  ));

commit;


-- ---------------------------------------------------------------------------
-- 10 · Comprobaciones
-- ---------------------------------------------------------------------------

-- 10.1 · Columnas nuevas de `solicitudes_admin` (deben salir 8).
select column_name, data_type, is_nullable
  from information_schema.columns
 where table_schema = 'public' and table_name = 'solicitudes_admin'
   and column_name in ('id_destinatario', 'id_formato', 'version', 'borrador',
                       'enviada_en', 'decidida_en', 'decidido_por', 'observaciones')
 order by column_name;

-- 10.2 · Las dos tablas nuevas.
select table_name
  from information_schema.tables
 where table_schema = 'public'
   and table_name in ('solicitudes_admin_versiones', 'solicitudes_admin_eventos');

-- 10.3 · Políticas que quedan en las tres tablas.
select tablename, policyname, cmd
  from pg_policies
 where schemaname = 'public'
   and tablename in ('solicitudes_admin', 'solicitudes_admin_versiones', 'solicitudes_admin_eventos')
 order by tablename, policyname;

-- 10.4 · El bucket de firmas debe ser privado.
select id, public, file_size_limit from storage.buckets where id = 'firmas';

-- 10.5 · Carreras SIN coordinador configurado: mientras aparezcan aquí, sus estudiantes no
--        pueden presentar trámites. Resolver con el update del comentario del punto 1.
select id, nombre, director
  from public.carreras
 where id_director is null
 order by nombre;
