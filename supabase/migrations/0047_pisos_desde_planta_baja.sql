-- 0047 — Los pisos de `espacios` pasan a contarse desde la planta baja.
--
-- Hasta ahora el nivel de calle se guardaba como `piso = 1`, así que "Piso 1" en pantalla era
-- en realidad la planta baja, "Piso 2" el primer piso, y así. La aplicación YA sabe representar
-- la planta baja (`OPCIONES_PISO` la define como el valor 0 y `formatoPiso` la imprime), pero
-- ningún espacio la usaba: el mínimo cargado era 1 en los 19 grupos edificio/piso.
--
-- Se resta 1 a cada espacio. No se tocan las etiquetas: el dato era el que estaba corrido.
--
-- EFECTO SECUNDARIO QUE ARREGLA: EDIFICIO DE CIENCIAS BÁSICAS tenía 8 espacios en `piso = 4`,
-- un valor que NO existe en el selector de la interfaz (llega hasta 3). Esos espacios no se
-- podían editar sin que el select cayera en blanco. Tras el corrimiento quedan en 3 y entran.
--
-- NO ES IDEMPOTENTE: correrla dos veces resta dos. El paso 1 aborta si detecta que ya se
-- aplicó (algún espacio en planta baja), así que una segunda ejecución falla en vez de
-- corromper los datos.

begin;

-- ───────────────────────────────────────────────────────────────────────────────
-- 1. Guarda: si ya hay espacios en planta baja, la migración ya corrió.
-- ───────────────────────────────────────────────────────────────────────────────
do $$
declare
  en_planta_baja int;
  bajo_cero      int;
begin
  select count(*) into en_planta_baja from public.espacios where piso = 0;
  select count(*) into bajo_cero      from public.espacios where piso < 0;

  if bajo_cero > 0 then
    raise exception 'Hay % espacios con piso negativo. Revisar a mano antes de correr esta migración.', bajo_cero;
  end if;

  if en_planta_baja > 0 then
    raise exception
      'Ya hay % espacios en planta baja (piso = 0): esta migración parece haberse aplicado. Abortando para no restar dos veces.',
      en_planta_baja;
  end if;
end $$;

-- ───────────────────────────────────────────────────────────────────────────────
-- 2. El corrimiento.
-- ───────────────────────────────────────────────────────────────────────────────
update public.espacios
set    piso = piso - 1
where  piso is not null;

-- ───────────────────────────────────────────────────────────────────────────────
-- 3. Que no se pueda volver a bajar de la planta baja.
--    Sin tope superior a propósito: un edificio nuevo puede tener más niveles que los que
--    hoy ofrece el selector, y un CHECK ajustado obligaría a otra migración para subirlo.
-- ───────────────────────────────────────────────────────────────────────────────
alter table public.espacios drop constraint if exists espacios_piso_check;
alter table public.espacios add  constraint espacios_piso_check check (piso is null or piso >= 0);

commit;

-- ───────────────────────────────────────────────────────────────────────────────
-- 4. Verificación. Correr DESPUÉS y comparar con el listado de antes:
--    cada edificio debe tener los mismos espacios, un nivel más abajo.
-- ───────────────────────────────────────────────────────────────────────────────
-- select e.nombre as edificio,
--        es.piso,
--        case when es.piso = 0 then 'Planta Baja' else 'Piso ' || es.piso end as etiqueta,
--        count(*) as espacios,
--        string_agg(es.nombre, ', ' order by es.nombre) as cuales
-- from   public.espacios es
-- join   public.edificios e on e.id = es.id_edificio
-- group  by e.nombre, es.piso
-- order  by e.nombre, es.piso;

-- ───────────────────────────────────────────────────────────────────────────────
-- 5. PENDIENTE, NO LO RESUELVE ESTA MIGRACIÓN: dos edificios numeran distinto.
--    En EDIFICIO DE AULAS las Aulas 1xx estaban en el nivel de calle, así que quedan en
--    Planta Baja. En EDIFICIO DE CIENCIAS BÁSICAS las Aulas 1xx estaban un nivel más arriba,
--    así que quedan en Piso 1. Restar 1 conserva esa diferencia; cuál de las dos refleja el
--    edificio real hay que verlo en el sitio.
--
--    Además hay nombres repetidos dentro del mismo edificio, que conviene depurar aparte:
--      - 'Aula 102' dos veces en EDIFICIO DE CIENCIAS BÁSICAS
--      - 'Laboratorio de Informática CTI1' dos veces en EDIFICIO DE CIENCIAS BÁSICAS
--    Para listarlos:
-- select e.nombre as edificio, es.nombre, count(*)
-- from   public.espacios es
-- join   public.edificios e on e.id = es.id_edificio
-- group  by e.nombre, es.nombre
-- having count(*) > 1
-- order  by e.nombre, es.nombre;
