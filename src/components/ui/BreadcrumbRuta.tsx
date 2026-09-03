import { useLocation } from 'react-router-dom';
import { rutaNombrada } from '../../lib/breadcrumbRutas';
import { normalizarTexto } from '../../lib/texto';

/**
 * Rastro de navegación del banner: "INSTITUCIÓN / ESTRUCTURA ACADÉMICA".
 *
 * Antes vivía en el topbar, que ya no se muestra en escritorio. Aquí queda junto al título de
 * la página, que es donde el usuario mira para saber dónde está.
 *
 * Solo dibuja lo que APORTA. En Trámites la sección, el nombre de la ruta y el título de la
 * página son la misma palabra: repetirla tres veces no orienta a nadie, así que en ese caso
 * no se dibuja nada. En Horarios queda "ACADÉMICO", que sí agrega contexto.
 */
export const BreadcrumbRuta = ({
  tituloPagina,
  className = '',
}: {
  /** Título que ya muestra el banner; se omite del rastro para no repetirlo. */
  tituloPagina?: string;
  className?: string;
}) => {
  const { pathname } = useLocation();
  const ruta = rutaNombrada(pathname);
  if (!ruta) return null;

  const yaVisible = normalizarTexto(tituloPagina);
  const segmentos = [ruta.seccion, ruta.titulo]
    .filter(Boolean)
    // Sin duplicados entre sí ("Trámites / Trámites").
    .filter((texto, indice, todos) => todos.findIndex(otro => normalizarTexto(otro) === normalizarTexto(texto)) === indice)
    // Ni repetir lo que el título grande ya dice.
    .filter(texto => !yaVisible || normalizarTexto(texto) !== yaVisible);

  if (segmentos.length === 0) return null;

  return (
    <div className={`flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest mb-1.5 ${className}`}>
      {segmentos.map((texto, indice) => (
        <span key={texto} className="flex items-center gap-2">
          {indice > 0 && <span className="text-gray-600">/</span>}
          <span className={indice === segmentos.length - 1 ? 'text-espoch-yellow' : 'text-gray-400'}>{texto}</span>
        </span>
      ))}
    </div>
  );
};
