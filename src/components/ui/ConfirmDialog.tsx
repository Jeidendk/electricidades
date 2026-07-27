import { AlertTriangle } from 'lucide-react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog = ({
  open, title, message, confirmLabel = 'Confirmar', cancelLabel = 'Cancelar', onConfirm, onCancel,
}: ConfirmDialogProps) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 backdrop-blur-[4px] p-4 animate-fade-in">
      <div className="bg-white rounded-2xl p-[32px] shadow-[0_25px_60px_rgba(0,0,0,0.3)] w-full max-w-[420px] relative animate-scale-in text-center py-6">
        <div className="w-14 h-14 rounded-2xl bg-amber-100 flex items-center justify-center mx-auto mb-5">
          <AlertTriangle className="w-7 h-7 text-amber-500" />
        </div>
        <h3 className="text-[18px] font-extrabold text-gray-900 mb-2">{title}</h3>
        <p className="text-[13px] text-gray-500 mb-7 leading-relaxed">{message}</p>
        <div className="flex gap-3 justify-center">
          <button onClick={onCancel} className="flex-1 py-3 rounded-xl border border-gray-200 bg-white font-bold text-[13px] text-gray-700 hover:bg-gray-50 transition-colors">{cancelLabel}</button>
          <button onClick={onConfirm} className="flex-1 py-3 rounded-xl border border-transparent bg-espoch-red hover:bg-espoch-darkred text-white font-bold text-[13px] shadow-[0_0_12px_rgba(176,0,0,0.4)] transition-colors">{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
};
