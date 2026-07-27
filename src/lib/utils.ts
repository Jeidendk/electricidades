// Une clases condicionales (mini-clsx sin dependencias).
export const cn = (...classes: (string | false | null | undefined)[]) =>
  classes.filter(Boolean).join(' ');

// Fecha de hoy en formato YYYY-MM-DD.
export const hoy = () => new Date().toISOString().slice(0, 10);

// Iniciales a partir de un nombre completo: "José Allauca" -> "JA".
// Toma la primera letra de las dos primeras palabras; si solo hay una, sus dos primeras letras.
export const getInitials = (nombre?: string | null): string => {
  const parts = (nombre || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
};

// Genera el siguiente id con prefijo a partir de los existentes (EQ001, OT002...).
export const nextId = (items: { id: string }[], prefix: string, pad = 3) => {
  const max = items.reduce((m, it) => {
    if (!it.id.startsWith(prefix)) return m;
    const n = parseInt(it.id.replace(/\D/g, ''), 10);
    return Number.isNaN(n) ? m : Math.max(m, n);
  }, 0);
  return prefix + String(max + 1).padStart(pad, '0');
};
