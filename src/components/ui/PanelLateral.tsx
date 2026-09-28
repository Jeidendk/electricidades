import type { ReactNode } from 'react';
import { PanelLeft, X } from 'lucide-react';

/**
 * Panel lateral que se SUPERPONE al contenido en vez de empujarlo.
 *
 * Tres pantallas tenían el mismo árbol fijo de 280px a la izquierda —Repositorio,
 * Infraestructura y Estructura Académica—, y en las tres se consulta un momento y se deja de
 * mirar. Ocupando sitio de forma permanente le quitaba ese ancho al contenido siempre, para
 * algo que se usa a ratos.
 *
 * El contenedor que lo recibe necesita `relative`: el panel se ancla contra él.
 */
export const PanelLateral = ({ abierto, onCerrar, titulo, accion, buscador, children, pie }: {
  abierto: boolean;
  onCerrar: () => void;
  titulo: string;
  /** Botón propio de cada pantalla, normalmente el "+" de crear. */
  accion?: ReactNode;
  /** Campo de búsqueda, que va fijo en la cabecera y no se desplaza con la lista. */
  buscador?: ReactNode;
  /** El árbol o listado. Lleva su propio scroll. */
  children: ReactNode;
  /** Resumen al fondo, del tipo "9 edificios · 85 espacios". */
  pie?: ReactNode;
}) => (
  <>
    {/* Pulsar fuera cierra: es lo que espera cualquiera de un panel superpuesto. */}
    {abierto && (
      <button
        aria-label={`Cerrar ${titulo}`}
        onClick={onCerrar}
        className="absolute inset-0 z-20 cursor-default rounded-2xl bg-black/5"
      />
    )}

    <div
      className={`absolute inset-y-0 left-0 z-30 w-[280px] flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-2xl transition-all duration-200 ${
        abierto ? 'flex translate-x-0 opacity-100' : 'hidden -translate-x-3 opacity-0'
      }`}
    >
      <div className="shrink-0 border-b border-gray-100 p-5">
        <div className="mb-4 flex items-center gap-2">
          <h3 className="text-[14px] font-bold text-gray-900">{titulo}</h3>
          <div className="ml-auto flex items-center gap-1">
            {accion}
            <button
              onClick={onCerrar}
              title="Cerrar"
              className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
        {buscador}
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto custom-scrollbar">
        {children}
      </div>

      {pie && <div className="shrink-0 border-t border-gray-100 bg-gray-50/50 px-5 py-3 text-center">{pie}</div>}
    </div>
  </>
);

/** Botón que abre el panel. Se marca cuando está abierto, para saber que la capa está encima. */
export const BotonPanelLateral = ({ abierto, onClick, titulo }: {
  abierto: boolean;
  onClick: () => void;
  titulo: string;
}) => (
  <button
    onClick={onClick}
    title={titulo}
    aria-expanded={abierto}
    className={`flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full border transition-colors ${
      abierto
        ? 'border-transparent bg-[#0f172a] text-white'
        : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:text-gray-900'
    }`}
  >
    <PanelLeft className="h-4 w-4" />
  </button>
);
