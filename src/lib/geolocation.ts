// Helpers de geolocalización del navegador (GPS del móvil).

export interface Coords { lat: number; lng: number; accuracy?: number }

// Obtiene la posición actual una vez. Rechaza si no hay permiso/soporte.
export const getCurrentPosition = (): Promise<Coords> =>
  new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('Este dispositivo no soporta geolocalización.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy }),
      (err) => reject(new Error(
        err.code === err.PERMISSION_DENIED ? 'Permiso de ubicación denegado.' :
        err.code === err.POSITION_UNAVAILABLE ? 'Ubicación no disponible.' :
        'No se pudo obtener la ubicación (timeout).')),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  });

// Observa la posición en vivo (para el marcador del usuario en el mapa).
// Devuelve una función para cancelar el watch.
export const watchPosition = (
  onUpdate: (c: Coords) => void,
  onError?: (msg: string) => void,
): (() => void) => {
  if (!('geolocation' in navigator)) {
    onError?.('Geolocalización no soportada.');
    return () => {};
  }
  const id = navigator.geolocation.watchPosition(
    (pos) => onUpdate({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy }),
    (err) => onError?.(err.message),
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 },
  );
  return () => navigator.geolocation.clearWatch(id);
};
