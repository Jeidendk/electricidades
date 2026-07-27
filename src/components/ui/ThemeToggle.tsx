import { Moon, Sun } from 'lucide-react';
import { useThemeStore } from '../../store/themeStore';

export const ThemeToggle = ({ className = '' }: { className?: string }) => {
  const dark = useThemeStore(s => s.dark);
  const toggle = useThemeStore(s => s.toggle);
  return (
    <button
      onClick={toggle}
      title={dark ? 'Modo claro' : 'Modo oscuro'}
      className={`text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors ${className}`}
    >
      {dark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
    </button>
  );
};
