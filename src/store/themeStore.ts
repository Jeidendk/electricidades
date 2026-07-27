import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ThemeState {
  dark: boolean;
  toggle: () => void;
  setDark: (v: boolean) => void;
}

// Aplica/quita la clase .dark en <html> (activa el variant dark de Tailwind + overrides CSS).
export const applyTheme = (dark: boolean) => {
  const root = document.documentElement;
  root.classList.toggle('dark', dark);
  root.classList.toggle('light', !dark);
};

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      dark: false,
      toggle: () => set((s) => { const d = !s.dark; applyTheme(d); return { dark: d }; }),
      setDark: (v) => { applyTheme(v); set({ dark: v }); },
    }),
    {
      name: 'theme-storage',
      // Al recargar, aplica la clase .dark/.light apenas se rehidrata el valor persistido,
      // sin esperar al useEffect del router (evita el "flash" y el estado desincronizado).
      onRehydrateStorage: () => (state) => {
        if (state) applyTheme(state.dark);
      },
    }
  )
);
