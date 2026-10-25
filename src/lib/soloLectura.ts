import { useOutletContext } from 'react-router-dom';
import type { AuthUser } from '../store/authStore';
import { esRolAutoridad } from '../store/authStore';

interface ContextoOutlet {
  currentUser?: AuthUser | null;
  /** Lo pone `AutoridadLayout`. Las demás pantallas no lo envían. */
  soloLectura?: boolean;
}

/**
 * True cuando la pantalla debe mostrarse SIN acciones de escritura.
 *
 * Las cuatro pantallas que comparten admin y autoridad (Horarios, Infraestructura, Estructura
 * Académica y Reportes) preguntan esto en vez de mirar el rol una por una: así, si mañana se
 * suma otro rol de consulta, basta que su layout mande `soloLectura` por el contexto.
 *
 * **No es control de acceso.** Esconder un botón no impide una llamada a la API: quien lo
 * impide de verdad es la RLS de la migración 0052. Esto evita ofrecer acciones que fallarían.
 */
export const useSoloLectura = (): boolean => {
  const contexto = useOutletContext<ContextoOutlet>() ?? {};
  // Se mira también el rol: una pantalla alcanzada por una ruta que no pase `soloLectura`
  // seguiría siendo de consulta para un decano.
  return contexto.soloLectura === true || esRolAutoridad(contexto.currentUser?.role);
};
