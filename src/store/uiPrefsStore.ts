import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Aplica/quita la clase que compacta el espaciado de tablas y listas (ver index.css).
const applyDensidad = (compacta: boolean) => {
  document.documentElement.classList.toggle('density-compact', compacta);
};

interface UiPrefsState {
  // Última ruta visitada (para restaurarla al volver a abrir la app).
  lastPath: string | null;
  setLastPath: (path: string) => void;

  // Ajustes editables desde el modal de Configuración.
  notificaciones: boolean;
  setNotificaciones: (v: boolean) => void;
  densidadCompacta: boolean;
  setDensidadCompacta: (v: boolean) => void;

  // Última ubicación abierta en Horarios, para no volver siempre al primer edificio/aula.
  // Es una preferencia de vista, no un dato compartido: por eso vive en el navegador.
  horarioEdificioId: string | null;
  horarioAulaId: string | null;
  setHorarioUbicacion: (edificioId: string, aulaId: string) => void;
}

export const useUiPrefsStore = create<UiPrefsState>()(
  persist(
    (set) => ({
      lastPath: null,
      setLastPath: (path) => set({ lastPath: path }),

      notificaciones: true,
      setNotificaciones: (v) => set({ notificaciones: v }),
      densidadCompacta: false,
      setDensidadCompacta: (v) => { applyDensidad(v); set({ densidadCompacta: v }); },

      horarioEdificioId: null,
      horarioAulaId: null,
      setHorarioUbicacion: (edificioId, aulaId) => set({ horarioEdificioId: edificioId, horarioAulaId: aulaId }),
    }),
    {
      name: 'ui-prefs',
      // Aplica la densidad guardada apenas se rehidrata (mismo patrón que themeStore).
      onRehydrateStorage: () => (state) => {
        if (state) applyDensidad(state.densidadCompacta);
      },
    },
  ),
);
