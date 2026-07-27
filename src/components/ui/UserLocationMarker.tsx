import { useEffect, useState } from 'react';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { watchPosition, type Coords } from '../../lib/geolocation';

// Icono "punto azul" tipo Google Maps para la posición del usuario.
const userIcon = L.divIcon({
  className: 'bg-transparent border-none',
  html: `<div class="relative w-5 h-5">
    <div class="absolute inset-0 bg-blue-500/40 rounded-full animate-ping"></div>
    <div class="absolute inset-[3px] bg-blue-600 rounded-full border-2 border-white shadow-md"></div>
  </div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

// Marcador que sigue la posición GPS del usuario en vivo.
// Si onPosition se pasa, reporta la última posición (para reusar como ubicación).
export const UserLocationMarker = ({ onPosition }: { onPosition?: (c: Coords) => void }) => {
  const [pos, setPos] = useState<Coords | null>(null);

  useEffect(() => {
    const stop = watchPosition(
      (c) => { setPos(c); onPosition?.(c); },
      () => {},
    );
    return stop;
  }, []);

  if (!pos) return null;
  return (
    <Marker position={[pos.lat, pos.lng]} icon={userIcon} zIndexOffset={3000}>
      <Popup>Tu ubicación{pos.accuracy ? ` (±${Math.round(pos.accuracy)} m)` : ''}</Popup>
    </Marker>
  );
};
