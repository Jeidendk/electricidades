import { useLocation } from 'react-router-dom';
import { rutaNombrada } from '../../lib/breadcrumbRutas';

/**
 * Rastro de navegación del banner: "INSTITUCIÓN / ESTRUCTURA ACADÉMICA".
 *
 * Antes vivía en el topbar, que ya no se muestra en escritorio. Aquí queda junto al título de
 * la página, que es donde el usuario mira para saber dónde está.
 *
 * En rutas sin nombre no dibuja nada, en vez de inventar un rastro vacío.
 */
export const BreadcrumbRuta = ({ className = '' }: { className?: string }) => {
  const { pathname } = useLocation();
  const ruta = rutaNombrada(pathname);
  if (!ruta) return null;

  return (
    <div className={`flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest mb-1.5 ${className}`}>
      <span className="text-gray-400">{ruta.seccion}</span>
      <span className="text-gray-600">/</span>
      <span className="text-espoch-yellow">{ruta.titulo}</span>
    </div>
  );
};
