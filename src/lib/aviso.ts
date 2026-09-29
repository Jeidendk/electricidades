/**
 * Avisos y confirmaciones del sistema, con SweetAlert2.
 *
 * Existe porque quedaban 17 `alert()` y `window.confirm()` nativos repartidos en 8 pantallas:
 * los pinta el navegador con su propio estilo, dicen "electricidades-beta.vercel.app dice" y
 * no se parecen en nada al resto de diálogos. Además bloquean el hilo.
 *
 * SweetAlert2 se carga con `await import()` en cada llamada, como ya hacían las pantallas que
 * sí lo usaban: son avisos ocasionales y no tienen por qué pesar en la carga inicial.
 */

/** Rojo institucional. El botón de los diálogos lo usa en todo el sistema. */
const ROJO_ESPOCH = '#B00020';

const abrir = async (opciones: Record<string, unknown>) => {
  const Swal = (await import('sweetalert2')).default;
  return Swal.fire({ confirmButtonColor: ROJO_ESPOCH, ...opciones });
};

/** Dato que falta o aclaración: el usuario todavía puede completar lo que se le pide. */
export const avisoInfo = (title: string, text?: string) => abrir({ icon: 'info', title, text });

/** Algo salió mal. El texto debe decir qué hacer, no solo que falló. */
export const avisoError = (title: string, text?: string) => abrir({ icon: 'error', title, text });

/** Confirmación breve de que la acción se completó. Se cierra sola. */
export const avisoExito = (title: string, text?: string) =>
  abrir({ icon: 'success', title, text, timer: 1600, showConfirmButton: false });

/**
 * Pregunta antes de una acción que no se deshace. Devuelve `true` solo si se confirma.
 * El botón de confirmar lleva el rojo de la acción y el de cancelar queda en gris, para que
 * el destructivo no sea el que se pulsa por inercia.
 */
export const confirmarAccion = async (opciones: {
  title: string;
  text?: string;
  confirmar?: string;
  cancelar?: string;
}): Promise<boolean> => {
  const resultado = await abrir({
    icon: 'warning',
    title: opciones.title,
    text: opciones.text,
    showCancelButton: true,
    confirmButtonText: opciones.confirmar ?? 'Sí, continuar',
    cancelButtonText: opciones.cancelar ?? 'Cancelar',
    cancelButtonColor: '#64748b',
    reverseButtons: true,
  });
  return resultado.isConfirmed;
};
