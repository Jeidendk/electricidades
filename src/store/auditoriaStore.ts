import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { notifyStoreError } from '../lib/notifyError';
import { componerNombreCompleto } from '../lib/texto';

export type OperacionAuditoria = 'INSERT' | 'UPDATE' | 'DELETE';

/** Un movimiento registrado por el trigger `registrar_auditoria` (migración 0048). */
export interface MovimientoAuditoria {
  id: number;
  tabla: string;
  operacion: OperacionAuditoria;
  registroId: string | null;
  /** Nombre legible del registro afectado; sobrevive al borrado de la fila original. */
  registroEtiqueta: string | null;
  usuarioId: string | null;
  /** Nombre de quien lo hizo; null si fue el servidor o si la cuenta ya no existe. */
  usuarioNombre: string | null;
  usuarioRol: string | null;
  datosAntes: Record<string, unknown> | null;
  datosDespues: Record<string, unknown> | null;
  camposCambiados: string[];
  createdAt: string;
  /** Cuándo se deshizo este movimiento; null si sigue vigente (migración 0049). */
  restauradoEn: string | null;
}

export interface FiltrosAuditoria {
  tabla?: string;
  operacion?: OperacionAuditoria | '';
  usuarioId?: string;
  /** ISO date (yyyy-mm-dd) inclusive. */
  desde?: string;
  hasta?: string;
}

interface AuditoriaState {
  movimientos: MovimientoAuditoria[];
  loading: boolean;
  /** False cuando la consulta falla: distingue "no hay movimientos" de "no se pudo leer". */
  disponible: boolean;
  fetchMovimientos: (filtros?: FiltrosAuditoria) => Promise<void>;
  /**
   * Deshace un movimiento. Devuelve el mensaje del servidor si salió bien, o `null` si falló
   * (el error ya se mostró). Toda la lógica y las comprobaciones viven en la función SQL
   * `restaurar_auditoria`: el cliente solo la invoca.
   */
  restaurar: (id: number) => Promise<string | null>;
}

/**
 * Tope por consulta. La bitácora crece sin límite y traerla entera dejaría la pantalla
 * inutilizable; para buscar algo puntual están los filtros.
 */
export const LIMITE_AUDITORIA = 300;

export const useAuditoriaStore = create<AuditoriaState>()((set) => ({
  movimientos: [],
  loading: false,
  disponible: true,

  fetchMovimientos: async (filtros = {}) => {
    set({ loading: true });
    try {
      let consulta = supabase
        .from('auditoria')
        .select(
          'id, tabla, operacion, registro_id, registro_etiqueta, usuario_id, ' +
          'datos_antes, datos_despues, campos_cambiados, created_at, restaurado_en, ' +
          // Hay DOS claves foráneas de `auditoria` a `usuarios` —`usuario_id` (quién hizo el
          // cambio) y `restaurado_por` (quién lo deshizo, migración 0049)—, así que hay que
          // nombrar la que se quiere: sin eso PostgREST responde "more than one relationship
          // was found" y no devuelve nada.
          'usuarios!auditoria_usuario_id_fkey(nombre, apellido, roles(nombre))',
        )
        .order('created_at', { ascending: false })
        .limit(LIMITE_AUDITORIA);

      if (filtros.tabla) consulta = consulta.eq('tabla', filtros.tabla);
      if (filtros.operacion) consulta = consulta.eq('operacion', filtros.operacion);
      if (filtros.usuarioId) consulta = consulta.eq('usuario_id', filtros.usuarioId);
      if (filtros.desde) consulta = consulta.gte('created_at', `${filtros.desde}T00:00:00`);
      // `hasta` es inclusive: sin la hora, un filtro "hasta hoy" dejaría fuera todo lo de hoy.
      if (filtros.hasta) consulta = consulta.lte('created_at', `${filtros.hasta}T23:59:59.999`);

      const { data, error } = await consulta;
      if (error) throw error;

      set({
        disponible: true,
        movimientos: ((data as any[]) || []).map(fila => ({
          id: fila.id,
          tabla: fila.tabla,
          operacion: fila.operacion,
          registroId: fila.registro_id,
          registroEtiqueta: fila.registro_etiqueta,
          usuarioId: fila.usuario_id,
          usuarioNombre: componerNombreCompleto(fila.usuarios?.nombre, fila.usuarios?.apellido) || null,
          usuarioRol: fila.usuarios?.roles?.nombre ?? null,
          datosAntes: fila.datos_antes ?? null,
          datosDespues: fila.datos_despues ?? null,
          camposCambiados: fila.campos_cambiados ?? [],
          createdAt: fila.created_at,
          restauradoEn: fila.restaurado_en ?? null,
        })),
      });
    } catch (error: any) {
      // Mientras la migración 0048 no se haya ejecutado, la tabla no existe y esto da 404.
      // Se marca como no disponible para que la pantalla lo explique en vez de decir
      // "sin movimientos", que haría pensar que nadie tocó nada.
      set({ disponible: false, movimientos: [] });
      notifyStoreError('No se pudo cargar la auditoría:', error);
    } finally {
      set({ loading: false });
    }
  },

  restaurar: async (id) => {
    try {
      const { data, error } = await supabase.rpc('restaurar_auditoria', { p_id: id });
      if (error) throw error;
      return (data as string) ?? 'Movimiento restaurado.';
    } catch (error: any) {
      // Los `raise exception` de la función llegan con su texto en español y explican el caso
      // concreto (id ocupado, campo cambiado después, clave foránea). Se muestran tal cual.
      notifyStoreError('No se pudo restaurar:', error);
      return null;
    }
  },
}));
