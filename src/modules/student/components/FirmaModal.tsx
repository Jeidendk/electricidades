import { useState, useRef, useEffect } from 'react';
import { PenTool, Upload, X } from 'lucide-react';
import { useExclusiveModal } from '../../../hooks/useExclusiveModal';

interface FirmaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (firma: string) => void;
}

export const FirmaModal = ({ isOpen, onClose, onSave }: FirmaModalProps) => {
  useExclusiveModal('firma', isOpen, onClose);

  const [firmaImg, setFirmaImg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      const existing = localStorage.getItem('espoch_student_firma');
      if (existing) {
        setFirmaImg(existing);
      } else {
        setFirmaImg(null);
      }
    }
  }, [isOpen]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setFirmaImg(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    if (!firmaImg) return;
    
    // Convert to canvas to ensure standard size/white background if transparent
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let w = img.width;
      let h = img.height;
      const MAX = 600;
      if (w > MAX || h > MAX) {
        if (w > h) { h = Math.round((h/w)*MAX); w = MAX; }
        else { w = Math.round((w/h)*MAX); h = MAX; }
      }
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        localStorage.setItem('espoch_student_firma', dataUrl);
        onSave(dataUrl);
        onClose();
      }
    };
    img.src = firmaImg;
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100]" onClick={onClose}></div>
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[440px] bg-white rounded-3xl shadow-2xl z-[101] p-6 animate-fade-in">
        <div className="text-center mb-6 relative">
          <button onClick={onClose} className="absolute right-0 top-0 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors">
            <X className="w-4 h-4" />
          </button>
          <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto mb-4 text-amber-500">
            <PenTool className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-extrabold text-gray-900 mb-1">Registro de Firma</h3>
          <p className="text-xs text-gray-500">Suba una foto clara de su firma manuscrita para generar oficios automáticamente.</p>
        </div>

        <div 
          className="border-2 border-dashed border-gray-200 rounded-2xl h-[150px] flex items-center justify-center cursor-pointer hover:border-espoch-yellow/50 hover:bg-amber-50/30 transition-all overflow-hidden relative mb-6"
          onClick={() => fileInputRef.current?.click()}
        >
          {firmaImg ? (
            <img src={firmaImg} className="w-full h-full object-contain p-4 absolute inset-0" alt="Firma Preview" />
          ) : (
            <div className="flex flex-col items-center text-gray-400">
              <Upload className="w-8 h-8 mb-3 opacity-40" />
              <p className="text-xs font-bold">Haga clic para subir su firma</p>
              <p className="text-[10px] text-gray-300 mt-1">JPG o PNG · Fondo blanco recomendado</p>
            </div>
          )}
          <input type="file" ref={fileInputRef} accept="image/*" className="hidden" onChange={handleFileChange} />
        </div>

        <div className="flex gap-3 justify-end">
          <button onClick={onClose} className="px-5 py-2.5 rounded-full text-xs font-bold text-gray-600 hover:bg-gray-100 transition-colors">
            Más tarde
          </button>
          <button 
            onClick={handleSave} 
            disabled={!firmaImg} 
            className="px-6 py-2.5 rounded-full bg-espoch-red hover:bg-espoch-darkred text-white text-xs font-bold shadow-md transition-all disabled:opacity-40 disabled:cursor-not-allowed border border-red-500/30"
          >
            Guardar Firma
          </button>
        </div>
      </div>
    </>
  );
};
