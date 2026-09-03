import { useLocation } from 'react-router-dom';
import { rutaNombrada } from '../../lib/breadcrumbRutas';
import { normalizarTexto } from '../../lib/texto';

/**
 * Rastro de navegación del banner: "INSTITUCIÓN / ESTRUCTURA ACADÉMICA".
 *
 * Antes vivía en el topbar, que ya no se muestra en escritorio. Aquí queda junto al título de
 * la página, que es donde el usuario mira para saber dónde está.
 *
 * Los segmentos son los ancestros y van en gris: el resaltado en amarillo lo lleva el título
 * de al lado, que es el sitio donde el usuario está realmente parado.
 *
 * Solo dibuja lo que APORTA. En Trámites la sección, el nombre de la ruta y el título de la
 * página son la misma palabra: repetirla tres veces no orienta a nadie, así que en ese caso
 * no se dibuja nada. En Horarios queda "ACADÉMICO", que sí agrega contexto.
 */
export const BreadcrumbRuta = ({
  tituloPagina,
  niveles = [],
  separadorFinal = false,
  className = '',
}: {
  /** Título que ya muestra el banner; se omite del rastro para no repetirlo. */
  tituloPagina?: string;
  /**
   * Niveles que la propia página abre y la ruta no conoce: al entrar a una carrera, la
   * facultad pasa a ser un ancestro. Se añaden después de los segmentos de la ruta.
   */
  niveles?: string[];
  /** Cierra el rastro con una barra, para encadenarlo con el título que va al lado. */
  separadorFinal?: boolean;
  className?: string;
}) => {
  const { pathname } = useLocation();
  const ruta = rutaNombrada(pathname);
  if (!ruta) return null;

  const yaVisible = normalizarTexto(tituloPagina);
  const segmentos = [ruta.seccion, ruta.titulo, ...niveles]
    .filter(Boolean)
    // Sin duplicados entre sí ("Trámites / Trámites").
    .filter((texto, indice, todos) => todos.findIndex(otro => normalizarTexto(otro) === normalizarTexto(texto)) === indice)
    // Ni repetir lo que el título grande ya dice.
    .filter(texto => !yaVisible || normalizarTexto(texto) !== yaVisible);

  if (segmentos.length === 0) return null;

  return (
    <div className={`flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest ${className}`}>
      {segmentos.map((texto, indice) => (
        <span key={texto} className="flex items-center gap-2">
          {indice > 0 && <span className="text-gray-600">/</span>}
          <span className="text-gray-400">{texto}</span>
        </span>
      ))}
      {separadorFinal && <span className="text-gray-600">/</span>}
    </div>
  );
};
