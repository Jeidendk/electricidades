import { normalizarTexto } from './texto.ts';

const VACIAS = new Set(['como', 'que', 'cual', 'cuales', 'donde', 'cuando', 'puedo', 'necesito', 'quiero', 'ver', 'buscar', 'para', 'una', 'uno', 'unos', 'las', 'los', 'del', 'con', 'por', 'mis', 'documento', 'documentos', 'formato', 'formatos']);
export function terminosConsulta(consulta: string): string[] {
  return [...new Set(normalizarTexto(consulta).split(/[^a-z0-9]+/).filter(t => t.length > 2 && !VACIAS.has(t)))];
}
export function coincideConsulta(texto: string, terminos: string[]): boolean {
  const normalizado = normalizarTexto(texto);
  return terminos.length > 0 && terminos.some(t => normalizado.includes(t));
}
