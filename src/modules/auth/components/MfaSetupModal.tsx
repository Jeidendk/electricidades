import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import * as qrcode from 'qrcode';
import { X, Shield, Smartphone, ShieldCheck } from 'lucide-react';
import Swal from 'sweetalert2';
import { useExclusiveModal } from '../../../hooks/useExclusiveModal';

interface MfaSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MfaSetupModal = ({ isOpen, onClose }: MfaSetupModalProps) => {
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [factorId, setFactorId] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [isEnrolled, setIsEnrolled] = useState(false);

  useExclusiveModal('mfa', isOpen, onClose);

  useEffect(() => {
    if (isOpen) {
      checkMfaStatus();
    } else {
      // Reset form
      setQrCodeUrl('');
      setFactorId('');
      setVerifyCode('');
      setIsEnrolled(false);
    }
  }, [isOpen]);

  const checkMfaStatus = async () => {
    setLoading(true);
    const { data: factorsData } = await supabase.auth.mfa.listFactors();
    const totpFactor = factorsData?.totp?.[0];
    
    if (totpFactor && totpFactor.status === 'verified') {
      setIsEnrolled(true);
    }
    setLoading(false);
  };

  const setupMfa = async () => {
    setLoading(true);
    // 1. Enroll MFA
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
    });

    if (error) {
      setLoading(false);
      Swal.fire('Error', error.message, 'error');
      return;
    }

    setFactorId(data.id);
    
    // 2. Generate QR Code
    try {
      const qrUrl = await qrcode.toDataURL(data.totp.uri);
      setQrCodeUrl(qrUrl);
    } catch (err) {
      console.error(err);
      Swal.fire('Error', 'No se pudo generar el código QR', 'error');
    }
    setLoading(false);
  };

  const onVerify = async () => {
    if (verifyCode.length !== 6) {
      Swal.fire('Atención', 'El código debe tener 6 dígitos', 'warning');
      return;
    }

    setLoading(true);
    // 1. Challenge
    const challenge = await supabase.auth.mfa.challenge({ factorId });
    if (challenge.error) {
      setLoading(false);
      Swal.fire('Error', challenge.error.message, 'error');
      return;
    }

    // 2. Verify
    const verify = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challenge.data.id,
      code: verifyCode,
    });

    setLoading(false);

    if (verify.error) {
      Swal.fire('Código incorrecto', 'Verifica el código ingresado o intenta de nuevo.', 'error');
    } else {
      setIsEnrolled(true);
      Swal.fire('¡Éxito!', 'La Autenticación en 2 Pasos ha sido habilitada.', 'success');
      setTimeout(() => {
        onClose();
      }, 1500);
    }
  };

  const disableMfa = async () => {
    const result = await Swal.fire({
      title: '¿Estás seguro?',
      text: 'Deshabilitarás la seguridad adicional de tu cuenta.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, deshabilitar',
      cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
      setLoading(true);
      const { data: factorsData } = await supabase.auth.mfa.listFactors();
      const totpFactor = factorsData?.totp?.[0];
      
      if (totpFactor) {
        const { error } = await supabase.auth.mfa.unenroll({ factorId: totpFactor.id });
        if (error) {
          Swal.fire('Error', error.message, 'error');
        } else {
          setIsEnrolled(false);
          setQrCodeUrl('');
          Swal.fire('MFA Desactivado', 'Tu cuenta ahora usa seguridad básica.', 'info');
        }
      }
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50">
          <h3 className="font-bold text-gray-800 flex items-center gap-2">
            <Shield className="w-5 h-5 text-espoch-red" />
            Seguridad de la Cuenta
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex flex-col items-center">
          
          {loading && !qrCodeUrl && !isEnrolled ? (
            <div className="py-10 flex flex-col items-center">
              <span className="animate-spin w-8 h-8 border-4 border-espoch-red border-t-transparent rounded-full mb-3"></span>
              <p className="text-sm text-gray-500">Cargando...</p>
            </div>
          ) : isEnrolled ? (
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <ShieldCheck className="w-8 h-8 text-green-600" />
              </div>
              <h4 className="text-lg font-bold text-gray-900 mb-2">Autenticación de 2 Pasos Activa</h4>
              <p className="text-sm text-gray-500 mb-6">
                Tu cuenta está protegida. Se te pedirá un código de tu aplicación de autenticación cuando inicies sesión.
              </p>
              <button 
                onClick={disableMfa}
                disabled={loading}
                className="px-4 py-2 border border-red-200 text-red-600 rounded-lg text-sm font-semibold hover:bg-red-50 transition-colors disabled:opacity-50"
              >
                {loading ? 'Desactivando...' : 'Desactivar Autenticación en 2 Pasos'}
              </button>
            </div>
          ) : !qrCodeUrl ? (
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <Smartphone className="w-8 h-8 text-gray-600" />
              </div>
              <h4 className="text-lg font-bold text-gray-900 mb-2">Activar Autenticación en 2 Pasos (MFA)</h4>
              <p className="text-sm text-gray-500 mb-6 px-4">
                Protege tu cuenta con una capa adicional de seguridad usando Google Authenticator o Authy.
              </p>
              <button 
                onClick={setupMfa}
                disabled={loading}
                className="w-full bg-espoch-red hover:bg-espoch-darkred text-white py-3 rounded-xl font-bold transition-all disabled:opacity-50 shadow-md"
              >
                {loading ? 'Preparando...' : 'Comenzar Configuración'}
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center text-center w-full">
              <h4 className="text-lg font-bold text-gray-900 mb-2">Escanea el Código QR</h4>
              <p className="text-xs text-gray-500 mb-4 px-2">
                Abre tu aplicación de autenticación (Google Authenticator) y escanea este código.
              </p>
              
              <div className="bg-white p-2 border-2 border-gray-100 rounded-xl mb-6 shadow-sm">
                <img src={qrCodeUrl} alt="MFA QR Code" className="w-40 h-40" />
              </div>

              <div className="w-full mb-2">
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2 block">
                  Ingresa el código de 6 dígitos
                </label>
                <div className="flex gap-2 justify-center mb-4">
                  {[0,1,2,3,4,5].map((i) => (
                    <div
                      key={i}
                      className={`w-10 h-12 rounded-xl flex items-center justify-center text-xl font-bold border-2 transition-all ${
                        verifyCode[i]
                          ? 'border-espoch-red bg-espoch-red/5 text-gray-900'
                          : 'border-gray-200 bg-gray-50 text-transparent'
                      }`}
                    >
                      {verifyCode[i] || '•'}
                    </div>
                  ))}
                </div>
                
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={verifyCode}
                  onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="w-full text-center bg-gray-50 text-gray-800 font-bold text-lg tracking-[0.5em] rounded-xl py-3 px-4 outline-none border border-gray-200 focus:ring-2 focus:ring-espoch-red/50 transition-all placeholder:tracking-normal placeholder:font-normal placeholder:text-sm"
                  placeholder="Ingresa el código aquí"
                />
              </div>

              <button 
                onClick={onVerify}
                disabled={loading || verifyCode.length !== 6}
                className="w-full bg-espoch-red hover:bg-espoch-darkred text-white py-3 rounded-xl font-bold transition-all disabled:opacity-50 mt-4 shadow-md"
              >
                {loading ? 'Verificando...' : 'Verificar y Activar'}
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
