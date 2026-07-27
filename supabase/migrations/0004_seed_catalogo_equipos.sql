-- =====================================================================
-- SEED opcional de catalogo_equipos (para probar el flujo de préstamos)
-- =====================================================================
-- La tabla catalogo_equipos alimenta el catálogo del estudiante. Si está
-- vacía no hay nada que solicitar. Estos ítems de ejemplo permiten probar
-- el flujo Solicitud -> Préstamo de extremo a extremo.
-- Idempotente: on conflict (id) do nothing. Bórralos cuando tengas data real.
-- =====================================================================

insert into public.catalogo_equipos (id, serie, nombre, categoria, stock, stock_total, estado, ubicacion) values
  ('EQ001', 'MUL-1001', 'Multímetro Digital Fluke 87V',        'herramientas', 8, 10, 'disponible', 'Lab. Circuitos'),
  ('EQ002', 'OSC-2005', 'Osciloscopio Tektronix TBS1072C',     'herramientas', 3, 5,  'disponible', 'Lab. Circuitos'),
  ('EQ004', 'PLC-1200', 'Módulo PLC Siemens S7-1200',          'equipos',      6, 8,  'disponible', 'Lab. Control'),
  ('EQ005', 'MOT-3F01', 'Motor Trifásico WEG 5HP',             'equipos',      2, 3,  'disponible', 'Lab. Potencia'),
  ('EQ006', 'FTE-AC01', 'Fuente de Alimentación DC 30V/5A',    'herramientas', 5, 10, 'disponible', 'Lab. Electrónica'),
  ('EQ007', 'PROY-012', 'Proyector Epson PowerLite X51+',      'tecnologico',  1, 2,  'disponible', 'Aula Magna')
on conflict (id) do nothing;
