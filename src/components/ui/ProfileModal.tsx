import { useEffect, useRef, useState } from 'react';
import type { ElementType } from 'react';
import {
  BookOpen,
  Building2,
  Camera,
  GraduationCap,
  Mail,
  ShieldCheck,
  User,
  X,
} from 'lucide-react';
import Swal from 'sweetalert2';
import { supabase } from '../../lib/supabase';
import { uploadImage } from '../../lib/upload';
import { useAuthStore, ETIQUETA_ROL } from '../../store/authStore';
import { useExclusiveModal } from '../../hooks/useExclusiveModal';
import { Avatar } from './Avatar';
import { enMayusculas } from '../../lib/texto';
import { componerNombreCompleto } from '../../modules/admin/data/docentesData';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ProfileDetails {
  codigoInstitucional: string;
  facultad: string;
  carrera: string;
  pao: string;
}

interface ReadOnlyFieldProps {
  icon: ElementType;
  label: string;
  value: string;
}

const emptyDetails: ProfileDetails = {
  codigoInstitucional: '',
  facultad: '',
  carrera: '',
  pao: '',
};

const ReadOnlyField = ({ icon: Icon, label, value }: ReadOnlyFieldProps) => (
  <label className="flex flex-col gap-1.5">
    <span className="text-[10px] font-extrabold uppercase tracking-widest text-gray-500">{label}</span>
    <div className="relative">
      <Icon className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
      <input
        value={value || 'Sin asignar'}
        readOnly
        className="w-full cursor-not-allowed rounded-xl border border-gray-200 bg-gray-100 py-3 pl-10 pr-4 text-[13px] font-medium text-gray-500 outline-none"
      />
    </div>
  </label>
);

export const ProfileModal = ({ isOpen, onClose }: ProfileModalProps) => {
  const user = useAuthStore(state => state.user);
  const setUser = useAuthStore(state => state.setUser);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [nombres, setNombres] = useState('');
  const [apellidos, setApellidos] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [details, setDetails] = useState<ProfileDetails>(emptyDetails);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useExclusiveModal('profile', isOpen, onClose);

  useEffect(() => {
    if (!isOpen || !user) return;

    // Se dejan vacíos y los llena la consulta: el nombre completo del store no se puede
    // partir sin adivinar dónde termina el nombre y empieza el apellido.
    setNombres('');
    setApellidos('');
    setPhotoFile(null);
    setPhotoPreview(user.avatar);
    setError('');
    setDetails({
      codigoInstitucional: '',
      facultad: user.facultadNombre || '',
      carrera: user.carreraNombre || '',
      pao: user.pao != null ? String(user.pao) : '',
    });

    let active = true;
    setLoadingDetails(true);
    void (async () => {
      const { data, error: profileError } = await supabase
        .from('usuarios')
        .select('codigo_institucional, facultad_nombre, carrera_nombre, pao, nombres, apellidos')
        .eq('id', user.id)
        .maybeSingle();

      if (!active) return;
      if (data) {
        setNombres(data.nombres || '');
        setApellidos(data.apellidos || '');
        setDetails({
          codigoInstitucional: data.codigo_institucional || '',
          facultad: data.facultad_nombre || user.facultadNombre || '',
          carrera: data.carrera_nombre || user.carreraNombre || '',
          pao: data.pao != null ? String(data.pao) : user.pao != null ? String(user.pao) : '',
        });
      }
      if (profileError) setError('No se pudieron cargar todos los datos del perfil.');
      setLoadingDetails(false);
    })();

    return () => {
      active = false;
    };
  }, [isOpen, user?.id]);

  if (!isOpen || !user) return null;

  const institutionalFields: ReadOnlyFieldProps[] =
    user.role === 'student'
      ? [
          { icon: Building2, label: 'Facultad', value: details.facultad },
          { icon: GraduationCap, label: 'Carrera', value: details.carrera },
          { icon: ShieldCheck, label: 'Código institucional', value: details.codigoInstitucional },
          { icon: BookOpen, label: 'PAO', value: details.pao ? `PAO ${details.pao}` : '' },
        ]
      : user.role === 'tecnico'
        ? [
            { icon: Building2, label: 'Facultad', value: details.facultad },
            { icon: GraduationCap, label: 'Carrera', value: details.carrera },
          ]
        // Administrador: sin asignación académica que mostrar.
        : [];

  const handlePhoto = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Selecciona una imagen válida.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('La imagen no puede superar los 5 MB.');
      return;
    }

    setPhotoFile(file);
    setError('');
    const reader = new FileReader();
    reader.onload = () => setPhotoPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    // `nombre` no se teclea: se compone, para que no pueda quedar en un orden distinto del
    // que muestran los dos campos ni desincronizarse de ellos.
    const cleanName = componerNombreCompleto(nombres, apellidos);
    if (!nombres.trim() || !apellidos.trim()) {
      setError('Ingresa tus nombres y tus apellidos.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      let avatarUrl = user.avatar;
      if (photoFile) {
        avatarUrl = await uploadImage(photoFile, `avatares/${user.id}`);
        if (!avatarUrl) throw new Error('No se pudo subir la fotografía.');
      }

      const { error: profileError } = await supabase
        .from('usuarios')
        .update({
          nombre: cleanName,
          nombres: nombres.trim(),
          apellidos: apellidos.trim(),
          avatar_url: avatarUrl,
        })
        .eq('id', user.id);
      if (profileError) throw profileError;

      const { error: authError } = await supabase.auth.updateUser({
        data: { nombre: cleanName, nombres: nombres.trim(), apellidos: apellidos.trim() },
      });
      if (authError) throw authError;

      setUser({ ...user, nombre: cleanName, avatar: avatarUrl });
      onClose();
      Swal.fire({
        icon: 'success',
        title: 'Perfil actualizado',
        text: 'Tus cambios se guardaron correctamente.',
        timer: 1600,
        showConfirmButton: false,
      });
    } catch (saveError: any) {
      setError(saveError?.message || 'No se pudo actualizar el perfil.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm" onClick={saving ? undefined : onClose} />
      <div className="relative flex max-h-[92vh] w-full max-w-[520px] flex-col overflow-hidden rounded-3xl border border-white/60 bg-white shadow-2xl animate-scale-in">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5">
          <div>
            <h3 className="text-[19px] font-extrabold tracking-tight text-gray-900">Mi perfil</h3>
            <p className="mt-0.5 text-[11px] font-medium text-gray-500">Información correspondiente a tu cuenta.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-50 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="overflow-y-auto px-6 py-5 custom-scrollbar">
          <div className="mb-5 flex flex-col items-center">
            <div className="relative">
              <Avatar nombre={componerNombreCompleto(nombres, apellidos) || user.nombre} src={photoPreview} className="h-24 w-24 text-2xl" />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-[#0f172a] text-white shadow-lg transition-transform hover:scale-105"
                title="Cambiar fotografía"
              >
                <Camera className="h-4 w-4" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={event => handlePhoto(event.target.files?.[0])}
              />
            </div>
            <p className="mt-3 text-[13px] font-bold text-gray-900">{ETIQUETA_ROL[user.role]}</p>
            <p className="text-[10px] font-medium text-gray-400">PNG, JPG o WEBP · máximo 5 MB</p>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-gray-500">Nombres</span>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    value={nombres}
                    onChange={event => setNombres(enMayusculas(event.target.value))}
                    placeholder="Ej. JUAN CARLOS"
                    className="w-full rounded-xl border border-gray-200 bg-gray-50/60 py-3 pl-10 pr-4 text-[13px] font-semibold text-gray-900 outline-none transition-colors focus:border-indigo-400 focus:bg-white"
                  />
                </div>
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-gray-500">Apellidos</span>
                <input
                  value={apellidos}
                  onChange={event => setApellidos(enMayusculas(event.target.value))}
                  placeholder="Ej. PÉREZ MORENO"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50/60 py-3 px-4 text-[13px] font-semibold text-gray-900 outline-none transition-colors focus:border-indigo-400 focus:bg-white"
                />
              </label>
            </div>

            <ReadOnlyField icon={Mail} label="Correo electrónico" value={user.email || 'Sin correo asociado'} />
            <ReadOnlyField icon={ShieldCheck} label="Tipo / Rol" value={ETIQUETA_ROL[user.role]} />
          </div>

          {institutionalFields.length > 0 && (
            <div className="mt-5">
              <p className="mb-2 text-[10px] font-extrabold uppercase tracking-widest text-gray-500">Datos institucionales</p>
              {loadingDetails ? (
                <div className="h-20 animate-pulse rounded-xl bg-gray-100" />
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {institutionalFields.map(field => (
                    <ReadOnlyField key={field.label} {...field} />
                  ))}
                </div>
              )}
              <p className="mt-2 text-[9px] font-medium text-gray-400">
                La asignación académica se administra desde Gestión de Usuarios.
              </p>
            </div>
          )}

          {error && (
            <p className="mt-4 rounded-xl border border-red-100 bg-red-50 px-3.5 py-2.5 text-[11px] font-semibold text-red-600">
              {error}
            </p>
          )}
        </div>

        <div className="flex justify-end gap-3 border-t border-gray-100 bg-gray-50/50 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-full px-5 py-2.5 text-[12px] font-bold text-gray-600 transition-colors hover:bg-gray-100 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex min-w-[145px] items-center justify-center gap-2 rounded-full bg-[#0f172a] px-6 py-2.5 text-[12px] font-bold text-white shadow-lg transition-colors hover:bg-black disabled:cursor-wait disabled:opacity-60"
          >
            {saving && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />}
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  );
};
