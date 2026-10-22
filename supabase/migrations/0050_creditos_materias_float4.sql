-- Migración para soportar decimales en créditos de materias (float4)
ALTER TABLE public.materias 
  ALTER COLUMN creditos TYPE float4 USING creditos::float4;
