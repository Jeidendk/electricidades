import { X, Moon, Bell, Rows3 } from 'lucide-react';
import { useThemeStore } from '../../store/themeStore';
import { useUiPrefsStore } from '../../store/uiPrefsStore';
import { useExclusiveModal } from '../../hooks/useExclusiveModal';

interface ConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const Toggle = ({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    onClick={() => onChange(!checked)}
    className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${checked ? 'bg-espoch-red' : 'bg-gray-300'}`}
  >
    <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-5' : ''}`} />
  </button>
);

const Row = ({ icon: Icon, title, desc, children }: { icon: React.ElementType; title: string; desc: string; children: React.ReactNode }) => (
  <div className="flex items-center justify-between gap-4 py-3">
    <div className="flex items-center gap-3 min-w-0">
      <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 shrink-0">
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0">
        <p className="text-[13px] font-bold text-gray-800 leading-tight">{title}</p>
        <p className="text-[11px] text-gray-400 font-medium truncate">{desc}</p>
      </div>
    </div>
    {children}
  </div>
);

// Modal de Configuración: ajustes reales y persistidos (tema, notificaciones, densidad).
export const ConfigModal = ({ isOpen, onClose }: ConfigModalProps) => {
  const dark = useThemeStore(s => s.dark);
  const setDark = useThemeStore(s => s.setDark);
  const { notificaciones, setNotificaciones, densidadCompacta, setDensidadCompacta } = useUiPrefsStore();

  useExclusiveModal('config', isOpen, onClose);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-[420px] p-6 animate-scale-in">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-lg font-extrabold text-gray-900">Configuración</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-xs text-gray-500 mb-2">Preferencias de la aplicación (se guardan en este navegador).</p>

        <div className="divide-y divide-gray-100">
          <Row icon={Moon} title="Modo oscuro" desc="Tema oscuro para toda la interfaz">
            <Toggle checked={dark} onChange={setDark} />
          </Row>
          <Row icon={Bell} title="Notificaciones" desc="Mostrar alertas y avisos del sistema">
            <Toggle checked={notificaciones} onChange={setNotificaciones} />
          </Row>
          <Row icon={Rows3} title="Densidad compacta" desc="Reduce el espaciado de tablas y listas">
            <Toggle checked={densidadCompacta} onChange={setDensidadCompacta} />
          </Row>
        </div>

        <div className="flex justify-end mt-5">
          <button onClick={onClose} className="bg-espoch-ink hover:bg-black text-white px-5 py-2.5 rounded-full text-xs font-bold transition-colors">
            Listo
          </button>
        </div>
      </div>
    </div>
  );
};
