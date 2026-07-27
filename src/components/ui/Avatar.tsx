import { useState } from 'react';
import { getInitials } from '../../lib/utils';

interface AvatarProps {
  nombre?: string | null;
  /** URL de foto. Si falta o falla la carga, se muestran las iniciales. */
  src?: string | null;
  className?: string;
}

// Avatar redondo: usa la foto si existe; si no, dibuja las iniciales (ej. "JA").
export const Avatar = ({ nombre, src, className = 'w-9 h-9 text-[11px]' }: AvatarProps) => {
  const [failed, setFailed] = useState(false);
  const hasPhoto = !!src && !failed;

  if (hasPhoto) {
    return (
      <img
        src={src as string}
        alt={nombre || 'avatar'}
        onError={() => setFailed(true)}
        className={`${className} rounded-full object-cover border-2 border-white shadow-sm`}
      />
    );
  }

  return (
    <div
      className={`${className} rounded-full bg-espoch-ink flex items-center justify-center text-white font-black border-2 border-white shadow-sm select-none`}
      aria-label={nombre || 'avatar'}
    >
      {getInitials(nombre)}
    </div>
  );
};
