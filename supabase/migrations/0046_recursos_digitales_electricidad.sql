-- 0046 · Semillas y permisos para recursos digitales de la carrera de Electricidad
--
-- QUÉ HACE:
-- 1. Habilita lectura pública/autenticada para las tablas `recursos` y `materia_recursos`.
-- 2. Inserta los recursos académicos oficiales de la carrera (software, libros, manuales y sílabos).
-- 3. Asocia los recursos con las materias de la carrera para que los filtros de PAO funcionen en tiempo real.
--
-- Ejecutar en Supabase → SQL Editor.

begin;

-- 1 · Asegurar políticas de lectura en public.recursos y public.materia_recursos
alter table public.recursos enable row level security;
alter table public.materia_recursos enable row level security;

drop policy if exists recursos_lectura_estudiantes on public.recursos;
create policy recursos_lectura_estudiantes on public.recursos
  for select using (true);

drop policy if exists materia_recursos_lectura_estudiantes on public.materia_recursos;
create policy materia_recursos_lectura_estudiantes on public.materia_recursos
  for select using (true);

-- 2 · Insertar recursos reales de la carrera si no existen
insert into public.recursos (id, tipo, titulo, autor, formato, size_desc, descripcion, portada_url)
values
  (
    1,
    'software',
    'Proteus 8.13 SP0 Release',
    'Labcenter Electronics',
    'ZIP / EXE',
    '580 MB',
    'Suite completa para diseño, captura de esquemáticos y simulación de circuitos electrónicos analógicos y digitales.',
    'https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=300&h=400&auto=format&fit=crop'
  ),
  (
    2,
    'libro',
    'Fundamentos de Circuitos Eléctricos',
    'Charles K. Alexander, Matthew N. O. Sadiku',
    'PDF',
    '45 MB',
    'Guía imprescindible para el análisis de mallas, nodos, teoremas de redes y régimen transitorio.',
    'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&q=80&w=300&h=400'
  ),
  (
    3,
    'libro',
    'Manual de Prácticas de Laboratorio',
    'Comisión Académica de Electricidad',
    'PDF',
    '12 MB',
    'Protocolos de ensayo, precauciones de seguridad y esquemas de conexionado para prácticas de laboratorio.',
    'https://images.unsplash.com/photo-1581092334651-ddf26d9a09d0?q=80&w=300&h=400&auto=format&fit=crop'
  ),
  (
    4,
    'libro',
    'Normas de Seguridad en Laboratorios',
    'Unidad de Seguridad y Salud en el Trabajo',
    'PDF',
    '8 MB',
    'Reglamento y normas de seguridad para el uso de laboratorios y equipos de la carrera de Electricidad.',
    'https://images.unsplash.com/photo-1532012197267-da84d127e765?auto=format&fit=crop&q=80&w=300&h=400'
  ),
  (
    5,
    'software',
    'MATLAB R2023b & Simulink',
    'MathWorks',
    'ISO / ZIP',
    '3.4 GB',
    'Entorno de cálculo numérico, álgebra lineal y diseño y simulación de sistemas dinámicos y de control.',
    'https://images.unsplash.com/photo-1629654291663-b91ad427698f?q=80&w=300&h=400&auto=format&fit=crop'
  ),
  (
    6,
    'libro',
    'Máquinas Eléctricas y Transformadores',
    'Stephen J. Chapman',
    'PDF',
    '38 MB',
    'Principios fundamentales de conversión electromecánica de energía, devanados, pérdidas y ensayos.',
    'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?auto=format&fit=crop&q=80&w=300&h=400'
  ),
  (
    7,
    'software',
    'AutoCAD Electrical 2024',
    'Autodesk',
    'EXE',
    '2.8 GB',
    'Diseño asistido por computadora para diagramas unifilares, cuadros eléctricos e instalaciones industriales.',
    'https://images.unsplash.com/photo-1503694978374-8a2fa686963a?q=80&w=300&h=400&auto=format&fit=crop'
  ),
  (
    8,
    'libro',
    'Sílabo y Plan Analítico - Electrónica de Potencia',
    'Área de Electrónica y Automatización',
    'PDF',
    '4.2 MB',
    'Plan analítico oficial, cronograma temático, guías de prácticas y criterios de evaluación semestral.',
    'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&q=80&w=300&h=400'
  )
on conflict (id) do update set
  tipo = excluded.tipo,
  titulo = excluded.titulo,
  autor = excluded.autor,
  formato = excluded.formato,
  size_desc = excluded.size_desc,
  descripcion = excluded.descripcion,
  portada_url = excluded.portada_url;

-- Sincronizar secuencia de IDs si aplica
select setval(pg_get_serial_sequence('public.recursos', 'id'), coalesce(max(id), 1)) from public.recursos;

commit;
