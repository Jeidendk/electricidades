/**
 * Comprobación de esquema para las URLs que el repositorio guarda y abre.
 *
 * Se comprueba al guardar Y al abrir, no solo una vez: una fila puede entrar por la API sin
 * pasar por el formulario, y un `javascript:` guardado ahí se ejecutaría en la sesión de quien
 * lo abra. `new URL` rechaza además lo que no es una dirección.
 */
const ESQUEMAS_PERMITIDOS = ['http:', 'https:'];

export const esUrlSegura = (url: string | null | undefined): boolean => {
  if (!url) return false;
  try {
    return ESQUEMAS_PERMITIDOS.includes(new URL(url).protocol);
  } catch {
    return false;
  }
};
