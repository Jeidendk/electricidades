/**
 * Conversaciones del asistente, EN MEMORIA.
 *
 * No se persisten a propósito: una conversación puede contener el trámite personal de un
 * estudiante, y guardarla exige antes decidir permisos, retención y borrado. Mientras eso no
 * esté definido, viven mientras dure la sesión y desaparecen al recargar.
 *
 * El contrato `AlmacenConversaciones` (en `lib/asistente/tipos.ts`) existe para reemplazar esto
 * por un almacén real sin tocar la pantalla.
 */
import { create } from 'zustand';

import type { Conversacion, MensajeConversacion, RespuestaAsistente } from '../lib/asistente/tipos';

/** Cuántos caracteres de la primera pregunta se usan como título de la conversación. */
const LARGO_TITULO = 48;

const nuevoId = () => crypto.randomUUID();

const tituloDesde = (pregunta: string) => {
  const limpio = pregunta.trim().replace(/\s+/g, ' ');
  return limpio.length > LARGO_TITULO ? `${limpio.slice(0, LARGO_TITULO)}…` : limpio || 'Consulta sin título';
};

interface EstadoAsistente {
  conversaciones: Conversacion[];
  /** Conversación abierta; null cuando la pantalla está en su estado inicial. */
  activaId: string | null;
  /** Hay una pregunta en curso: la interfaz muestra el estado de carga y permite cancelar. */
  consultando: boolean;

  nuevaConversacion: () => void;
  abrirConversacion: (id: string) => void;
  eliminarConversacion: (id: string) => void;
  /** Agrega la pregunta y devuelve el id de la conversación donde quedó. */
  registrarPregunta: (pregunta: string) => string;
  registrarRespuesta: (conversacionId: string, respuesta: RespuestaAsistente) => void;
  setConsultando: (consultando: boolean) => void;
}

const mensaje = (autor: MensajeConversacion['autor'], texto: string, respuesta?: RespuestaAsistente): MensajeConversacion => ({
  id: nuevoId(),
  autor,
  texto,
  creadoEn: new Date().toISOString(),
  ...(respuesta ? { respuesta } : {}),
});

export const useAsistenteStore = create<EstadoAsistente>()((set, get) => ({
  conversaciones: [],
  activaId: null,
  consultando: false,

  nuevaConversacion: () => set({ activaId: null }),

  abrirConversacion: id => set({ activaId: id }),

  eliminarConversacion: id => set(estado => ({
    conversaciones: estado.conversaciones.filter(c => c.id !== id),
    activaId: estado.activaId === id ? null : estado.activaId,
  })),

  registrarPregunta: pregunta => {
    const { activaId, conversaciones } = get();
    const existente = conversaciones.find(c => c.id === activaId);

    if (existente) {
      set({
        conversaciones: conversaciones.map(c => (
          c.id === existente.id ? { ...c, mensajes: [...c.mensajes, mensaje('usuario', pregunta)] } : c
        )),
      });
      return existente.id;
    }

    const conversacion: Conversacion = {
      id: nuevoId(),
      titulo: tituloDesde(pregunta),
      creadaEn: new Date().toISOString(),
      mensajes: [mensaje('usuario', pregunta)],
    };
    // La más reciente primero: es la que se busca en un historial que crece.
    set({ conversaciones: [conversacion, ...conversaciones], activaId: conversacion.id });
    return conversacion.id;
  },

  registrarRespuesta: (conversacionId, respuesta) => set(estado => ({
    conversaciones: estado.conversaciones.map(c => (
      c.id === conversacionId
        ? { ...c, mensajes: [...c.mensajes, mensaje('asistente', respuesta.texto, respuesta)] }
        : c
    )),
  })),

  setConsultando: consultando => set({ consultando }),
}));
