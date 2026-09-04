// Traducción de errores de base de datos (Supabase/Postgres) a mensajes claros
// para el usuario. Evita mostrar SQL crudo tipo:
//   'update or delete on table "inventario" violates foreign key constraint ...'
// y en su lugar explica que el elemento está en uso en otra parte del sistema.

// Nombre técnico de tabla → nombre entendible para el usuario.
const TABLA_AMIGABLE: Record<string, string> = {
  ordenes_mantenimiento: 'órdenes de mantenimiento',
  prestamos: 'préstamos',
  asignaciones: 'asignaciones de equipos',
  clases: 'horarios (clases asignadas)',
  solicitudes_equipo: 'solicitudes de equipos',
  solicitudes_admin: 'solicitudes',
  espacios: 'espacios / aulas',
  edificios: 'edificios',
  materias: 'materias',
  carreras: 'carreras',
  facultades: 'facultades',
  inventario: 'inventario',
  catalogo_equipos: 'catálogo de equipos',
  horario_estudiante: 'horarios de estudiantes',
  materia_recursos: 'recursos de materias',
  usuarios: 'usuarios / docentes',
};

const nombreTabla = (t?: string): string => {
  if (!t) return 'otra parte del sistema';
  return TABLA_AMIGABLE[t] || t.replace(/_/g, ' ');
};

export interface FriendlyError {
  title: string;
  text: string;
}

// Devuelve un título + texto entendible según el tipo de error.
export function friendlyDbError(err: any): FriendlyError {
  const code: string = err?.code || '';
  const msg: string = err?.message || '';

  // 23503: violación de llave foránea → el registro está referenciado en otra tabla.
  if (code === '23503' || /foreign key constraint/i.test(msg)) {
    // El segundo "table \"...\"" del mensaje es la tabla que todavía lo usa.
    const m = msg.match(/constraint\s+"[^"]+"\s+on\s+table\s+"([^"]+)"/i) || [...msg.matchAll(/on table "([^"]+)"/gi)].pop();
    const tabla = nombreTabla(Array.isArray(m) ? m[1] : (m as any)?.[1]);
    return {
      title: 'No se puede eliminar',
      text: `Este elemento está siendo usado en ${tabla}. Primero elimínalo o reasígnalo ahí antes de borrarlo aquí.`,
    };
  }

  // 23505: valor duplicado en índice único.
  if (code === '23505' || /duplicate key|unique constraint/i.test(msg)) {
    return { title: 'Registro duplicado', text: 'Ya existe un registro con esos datos. Verifica que no esté repetido.' };
  }

  // 23502: falta un valor obligatorio.
  if (code === '23502' || /not-null constraint/i.test(msg)) {
    return { title: 'Datos incompletos', text: 'Falta completar un campo obligatorio.' };
  }

  // Sin mensaje útil o respuesta cruda del servidor.
  if (!msg || msg === '{}' || /^\{/.test(msg)) {
    return { title: 'No se pudo completar la operación', text: 'Ocurrió un error inesperado. Intenta nuevamente.' };
  }

  return { title: 'No se pudo completar la operación', text: msg };
}

/**
 * Traduce los errores de Supabase Auth que el administrador puede encontrarse al invitar a
 * alguien. Llegan en inglés y sin contexto: "email rate limit exceeded" no le dice a nadie que
 * el problema es el proveedor de correo y no los datos que acaba de escribir.
 */
export function friendlyAuthError(err: any): FriendlyError {
  const msg = String(err?.message || err?.error_description || err?.msg || '');

  // El servicio de correo que trae Supabase por defecto es solo para pruebas: manda unos pocos
  // mensajes por hora. No se puede subir ese tope; se resuelve configurando un SMTP propio.
  if (/rate limit/i.test(msg)) {
    return {
      title: 'Límite de correos alcanzado',
      text: 'El proveedor de correo no acepta más envíos por ahora. Espera una hora e inténtalo otra vez, '
        + 'o configura un SMTP propio en Supabase para quitar ese tope. La cuenta puede haberse creado igual: '
        + 'revisa la lista antes de volver a intentarlo.',
    };
  }

  if (/already registered|already exists/i.test(msg)) {
    return {
      title: 'Ese correo ya tiene cuenta',
      text: 'Busca a la persona en la lista. Si no aparece, puede que su ficha se haya perdido al crearla.',
    };
  }

  if (/invalid email|email address .* invalid/i.test(msg)) {
    return { title: 'Correo no válido', text: 'Revisa la dirección: parece mal escrita.' };
  }

  if (!msg || msg === '{}') {
    return {
      title: 'No se pudo enviar la invitación',
      text: `Error del servidor (status ${err?.status ?? '?'}, code ${err?.code ?? '?'}).`,
    };
  }

  return { title: 'No se pudo enviar la invitación', text: msg };
}

// Aviso estándar cuando una operación de guardado/borrado falla en un store.
export const notifyStoreError = (context: string, err: any) => {
  console.error(context, err);
  const { title, text } = friendlyDbError(err);
  import('sweetalert2').then(S => S.default.fire({
    icon: 'error',
    title,
    text,
    confirmButtonColor: '#b00000',
  }));
};
