import { useState, useMemo, useEffect } from 'react';
import {
  Users as UsersIcon, Plus, Edit2, Trash2,
  AlertTriangle, ShieldCheck, UserCheck, GraduationCap,
  BookOpen, X, ArrowUpDown, RotateCcw, Download, ImageIcon
} from 'lucide-react';
import { SearchInput } from '../../../components/ui/SearchInput';
import { FilterDropdown } from '../../../components/ui/FilterDropdown';
import { useUsuariosStore } from '../../../store/usuariosStore';
import { useFacultadesStore } from '../../../store/facultadesStore';
import { useAuthStore } from '../../../store/authStore';
import { EmptyState } from '../../../components/ui/EmptyState';
import { uploadImage } from '../../../lib/upload';
import { TITULOS_ACADEMICOS, componerNombreCompleto, enMayusculas } from '../data/docentesData';
import { normalizarTexto } from '../../../lib/texto';
import { supabase } from '../../../lib/supabase';
import { useExclusiveModal } from '../../../hooks/useExclusiveModal';

// Constantes para formularios (dropdowns)
const ROLES = ['Administrador', 'Estudiante', 'Tecnico', 'Docente'];

export const Usuarios = () => {
  const { items, fetchUsuarios, addUsuario, updateUsuario, removeUsuario } = useUsuariosStore();
  const facultades = useFacultadesStore(s => s.facultades);
  const carreras = useFacultadesStore(s => s.carreras);
  const fetchFacultades = useFacultadesStore(s => s.fetchAll);
  const [rolesDb, setRolesDb] = useState<{ id: number; nombre: string }[]>([]);

  // Técnico: solo gestiona el catálogo de DOCENTES (no ve admin/estudiante/técnico).
  const authUser = useAuthStore(s => s.user);
  const soloDocentes = authUser?.role === 'tecnico';

  useEffect(() => {
    fetchUsuarios();
    fetchFacultades();
    // Roles reales desde la BD (en vez de la lista hardcodeada).
    supabase.from('roles').select('id, nombre').order('id').then(({ data }) => {
      if (data) setRolesDb(data as { id: number; nombre: string }[]);
    });
  }, []);

  // Opciones de dropdowns desde la BD; caen a las constantes solo si aún no cargan.
  const rolNombres = rolesDb.length
    ? Array.from(new Set([...rolesDb.map(r => r.nombre), 'Docente']))
    : ROLES;
  // Mapear campos de Supabase al formato del componente
  const usuarios = useMemo(() => items.map((u: any) => {
    const rol = u.roles?.nombre || 'Sin rol';
    const esDocente = rol === 'Docente';
    const nombreFacultad = u.facultad_nombre || u.departamento || '';
    const facultad = facultades.find((item: any) =>
      item.nombre === nombreFacultad || item.siglas === nombreFacultad,
    );
    const carrera = carreras.find((item: any) =>
      item.nombre === u.carrera_nombre &&
      (!facultad || item.id_facultad === facultad.id),
    );
    return {
      id: u.id,
      tipoRegistro: esDocente ? 'docente' as const : 'usuario' as const,
      nombre: u.nombre,
      titulo: u.titulo || '',
      apellidos: u.apellidos || '',
      nombres: u.nombres || '',
      email: esDocente ? '' : u.email || '',
      rol,
      estado: u.estado,
      departamento: nombreFacultad,
      codigo: u.codigo_institucional || '',
      facultad: nombreFacultad,
      facultadId: facultad?.id || '',
      carrera: u.carrera_nombre || '',
      carreraId: carrera?.id || '',
      pao: u.pao ?? null,
      ultimaConexion: esDocente
        ? 'Sin cuenta'
        : u.ultima_conexion
          ? new Date(u.ultima_conexion).toLocaleString('es-EC')
          : 'Sin registro',
      avatar: u.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.nombre)}&background=${esDocente ? '7e22ce' : '475569'}&color=fff`,
    };
  }), [items, facultades, carreras]);


  // KPIs
  const kpis = useMemo(() => ({
    totalUsuarios: usuarios.length,
    activos: usuarios.filter(u => u.estado === 'activo').length,
    estudiantes: usuarios.filter(u => u.rol === 'Estudiante').length,
    docentes: usuarios.filter(u => u.rol === 'Docente').length
  }), [usuarios]);

  const [searchQuery, setSearchQuery] = useState('');
  
  // Table state
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [sortCol, setSortCol] = useState('');
  const [sortAsc, setSortAsc] = useState(true);

  // Filters
  const [filterRol, setFilterRol] = useState(soloDocentes ? 'Docente' : 'Administrador');
  const [filterEstado, setFilterEstado] = useState('');

  // Modals
  const [modalType, setModalType] = useState<null | 'create' | 'edit' | 'delete' | 'bulkDelete'>(null);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Form
  const defaultFormValues = {
    nombre: '', email: '', rol: 'Estudiante', departamento: 'FIE', estado: 'activo', avatar_url: '', fotoFile: null as File | null,
    codigo: '', facultadId: '', carreraId: '', pao: '',
    titulo: '', apellidos: '', nombres: '',
  };
  const [formValues, setFormValues] = useState(defaultFormValues);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useExclusiveModal('usuarios', modalType !== null, () => setModalType(null));

  // Cascada facultad → carrera → PAO para el modal de creación (igual que el registro).
  const carrerasDeFacultad = carreras.filter((c: any) => c.id_facultad === formValues.facultadId);
  const numPaosForm = (carreras.find((c: any) => c.id === formValues.carreraId) as any)?.semestres ?? 0;



  const filteredData = useMemo(() => {
    let result = [...usuarios];
    if (filterRol) result = result.filter(u => u.rol === filterRol);
    if (filterEstado) result = result.filter(u => u.estado === filterEstado);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(u => 
        u.nombre.toLowerCase().includes(q) || 
        u.email.toLowerCase().includes(q) ||
        u.departamento.toLowerCase().includes(q)
      );
    }
    if (sortCol) {
      result.sort((a: any, b: any) => {
        let va = a[sortCol];
        let vb = b[sortCol];
        return sortAsc ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1);
      });
    }
    return result;
  }, [usuarios, searchQuery, filterRol, filterEstado, sortCol, sortAsc]);

  const handleSort = (col: string) => {
    if (sortCol === col) setSortAsc(!sortAsc);
    else { setSortCol(col); setSortAsc(true); }
  };

  /**
   * Docente ya registrado con el mismo nombre completo. Compara **normalizando** (sin tildes,
   * sin mayúsculas, espacios colapsados): "PEREZ GOMEZ ANA" y "Pérez  Gómez Ana" son la misma
   * persona. Se limita al rol Docente —un estudiante homónimo no debe bloquear un alta— y
   * `idAExcluir` evita que un docente choque consigo mismo al editarlo.
   */
  const buscarDocenteDuplicado = (nombreCompleto: string, idAExcluir?: string) =>
    items.find(
      (usuario: any) =>
        usuario.rol === 'Docente' &&
        usuario.id !== idAExcluir &&
        normalizarTexto(usuario.nombre) === normalizarTexto(nombreCompleto),
    );

  /** Cierto cuando la base rechazó el guardado por el índice de nombre de docente repetido. */
  const esNombreDocenteRepetido = (error: any) =>
    error?.code === '23505' ||
    String(error?.message || '').includes('usuarios_docente_nombre_unico');

  const MENSAJE_DOCENTE_REPETIDO =
    'Otro administrador acaba de registrar un docente con ese mismo nombre. Recarga la lista para verlo.';

  const avisarDuplicado = async (duplicado: any) => {
    const S = (await import('sweetalert2')).default;
    S.fire({
      icon: 'warning',
      title: 'Docente ya registrado',
      text: `Ya existe un docente llamado "${duplicado.nombre}". Revisa la lista: si es la misma persona, edítalo en vez de crearlo otra vez.`,
      confirmButtonColor: '#B00020',
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    // Los docentes capturan apellidos y nombres por separado; `nombre` se compone a partir de
    // ellos para conservar un único nombre completo canónico (el que leen horarios y avatares).
    const guardandoDocente = formValues.rol === 'Docente';
    const nombreAGuardar = guardandoDocente
      ? componerNombreCompleto(formValues.nombres, formValues.apellidos)
      : formValues.nombre.trim();

    if (modalType === 'create') {
      const S = (await import('sweetalert2')).default;
      if (formValues.rol === 'Docente') {
        const nombre = nombreAGuardar;
        const duplicado = buscarDocenteDuplicado(nombre);
        if (duplicado) {
          await avisarDuplicado(duplicado);
          return;
        }

        setIsSubmitting(true);
        try {
          if (!formValues.facultadId) {
            S.fire({
              icon: 'warning',
              title: 'Facultad requerida',
              text: 'Selecciona la facultad a la que pertenece el docente.',
              confirmButtonColor: '#B00020',
            });
            setIsSubmitting(false);
            return;
          }
          const rolDocente = rolesDb.find((rol) => rol.nombre.toLocaleLowerCase('es') === 'docente');
          if (!rolDocente) {
            S.fire({
              icon: 'warning',
              title: 'Rol Docente no disponible',
              text: 'Ejecuta la migración 0012 para crear el rol Docente.',
              confirmButtonColor: '#B00020',
            });
            setIsSubmitting(false);
            return;
          }
          const facultad: any = facultades.find((item: any) => item.id === formValues.facultadId);
          const nombreFacultad = facultad?.siglas || facultad?.nombre || '';
          const id = crypto.randomUUID();
          await addUsuario({
            id,
            nombre,
            titulo: formValues.titulo || null,
            apellidos: formValues.apellidos.trim() || null,
            nombres: formValues.nombres.trim() || null,
            email: null,
            id_rol: rolDocente.id,
            estado: formValues.estado,
            departamento: nombreFacultad,
            facultad_nombre: nombreFacultad,
          });
          setModalType(null);
          setFormValues(defaultFormValues);
          S.fire({
            icon: 'success',
            title: 'Docente registrado',
            text: 'Ya está disponible para seleccionarlo en Horarios. No se creó una cuenta de acceso.',
            confirmButtonColor: '#B00020',
          });
        } catch (error: any) {
          const faltaMigracionDocentes =
            error?.code === '23503' &&
            String(error?.message || '').includes('usuarios_id_fkey');

          S.fire({
            icon: 'error',
            title: 'No se pudo registrar',
            text: faltaMigracionDocentes
              ? 'La base de datos todavía exige una cuenta de acceso. Aplica la migración 0013_docentes_sin_auth.sql e inténtalo nuevamente.'
              : esNombreDocenteRepetido(error)
                ? MENSAJE_DOCENTE_REPETIDO
                : error?.message || 'Ocurrió un error al guardar el docente.',
            confirmButtonColor: '#B00020',
          });
        } finally {
          setIsSubmitting(false);
        }
        return;
      }

      const email = formValues.email.trim();
      if (!email) {
        S.fire({ icon: 'warning', title: 'Correo requerido', text: 'Ingresa el correo institucional del nuevo usuario.', confirmButtonColor: '#B00020' });
        return;
      }
      setIsSubmitting(true);
      // Metadata según el rol; el usuario la sincroniza a su fila al iniciar sesión
      // (authStore.syncPerfilOnLogin). Estudiante: facultad+carrera+PAO+código.
      // Técnico: facultad+carrera. Admin: nada académico.
      const fac: any = facultades.find((f: any) => f.id === formValues.facultadId);
      const car: any = carreras.find((c: any) => c.id === formValues.carreraId);
      const meta: Record<string, any> = { nombre: nombreAGuardar, rol: formValues.rol };
      if (formValues.rol === 'Estudiante' || formValues.rol === 'Tecnico') {
        if (fac) { meta.facultad_nombre = fac.siglas || fac.nombre; meta.departamento = fac.siglas || fac.nombre; }
        if (car) meta.carrera_nombre = car.nombre;
      }
      if (formValues.rol === 'Estudiante') {
        if (formValues.codigo.trim()) meta.codigo_institucional = formValues.codigo.trim();
        if (formValues.pao) meta.pao = formValues.pao;
      }
      // No generamos contraseña: se crea la cuenta y se envía un enlace de un solo uso
      // al correo para que el propio usuario establezca su contraseña (/set-password).
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
          emailRedirectTo: `${import.meta.env.VITE_SITE_URL || window.location.origin}/set-password`,
          data: meta,
        },
      });
      setIsSubmitting(false);
      if (error) {
        console.error('signInWithOtp error:', error);
        const e = error as any;
        const msg = e?.message || e?.error_description || e?.msg || '';
        const detail = (msg && msg !== '{}') ? msg : `Error del servidor (status ${e?.status ?? '?'}, code ${e?.code ?? '?'}). Suele ser un fallo del trigger de la BD al crear la fila.`;
        S.fire({ icon: 'error', title: 'No se pudo enviar la invitación', text: detail, confirmButtonColor: '#B00020' });
        return;
      }
      S.fire({
        icon: 'success',
        title: 'Invitación enviada',
        html: `Se envió un enlace de un solo uso a <b>${email}</b>.<br>El usuario podrá establecer su contraseña e ingresar.<br><br><span style="font-size:12px;color:#6b7280">Cuando confirme aparecerá en la lista y podrás asignarle su rol.</span>`,
        confirmButtonColor: '#B00020',
      });
      setModalType(null);
      fetchUsuarios();
    } else if (modalType === 'edit' && selectedUser) {
      if (selectedUser.tipoRegistro === 'docente') {
        const duplicado = buscarDocenteDuplicado(nombreAGuardar, selectedUser.id);
        if (duplicado) {
          await avisarDuplicado(duplicado);
          return;
        }

        const S = (await import('sweetalert2')).default;
        setIsSubmitting(true);
        try {
          const facultad: any = facultades.find((item: any) => item.id === formValues.facultadId);
          const nombreFacultad = facultad?.siglas || facultad?.nombre || '';
          await updateUsuario(selectedUser.id, {
            nombre: nombreAGuardar,
            titulo: formValues.titulo || null,
            apellidos: formValues.apellidos.trim() || null,
            nombres: formValues.nombres.trim() || null,
            departamento: nombreFacultad,
            facultad_nombre: nombreFacultad,
            estado: formValues.estado,
          } as any);
          setModalType(null);
          setSelectedUser(null);
          S.fire({
            icon: 'success',
            title: 'Docente actualizado',
            text: 'El nuevo nombre se reflejará también en sus horarios.',
            confirmButtonColor: '#B00020',
          });
        } catch (error: any) {
          S.fire({
            icon: 'error',
            title: 'No se pudo actualizar',
            text: esNombreDocenteRepetido(error)
              ? MENSAJE_DOCENTE_REPETIDO
              : error?.message || 'Ocurrió un error al actualizar el docente.',
            confirmButtonColor: '#B00020',
          });
        } finally {
          setIsSubmitting(false);
        }
        return;
      }

      const S = (await import('sweetalert2')).default;
      setIsSubmitting(true);
      try {
        let finalAvatarUrl = formValues.avatar_url;

        if (formValues.fotoFile) {
          const uploadedUrl = await uploadImage(formValues.fotoFile, 'avatares');
          if (uploadedUrl) finalAvatarUrl = uploadedUrl;
        }

        const facultad = facultades.find((item: any) => item.id === formValues.facultadId);
        const carrera = carreras.find((item: any) => item.id === formValues.carreraId);
        const nombreFacultad = facultad?.siglas || facultad?.nombre || '';
        const tieneAsignacionAcademica =
          formValues.rol === 'Estudiante' || formValues.rol === 'Tecnico';

        const patch: any = {
          nombre: nombreAGuardar,
          estado: formValues.estado as any,
          departamento: tieneAsignacionAcademica ? nombreFacultad : '',
          facultad_nombre: tieneAsignacionAcademica ? nombreFacultad || null : null,
          carrera_nombre: tieneAsignacionAcademica ? carrera?.nombre || null : null,
          codigo_institucional:
            formValues.rol === 'Estudiante' ? formValues.codigo.trim() || null : null,
          pao:
            formValues.rol === 'Estudiante' && formValues.pao
              ? formValues.pao
              : null,
        };

        const { data: rolData, error: rolError } = await supabase
          .from('roles')
          .select('id')
          .eq('nombre', formValues.rol)
          .single();
        if (rolError) throw rolError;
        patch.id_rol = rolData.id;

        if (finalAvatarUrl && !finalAvatarUrl.startsWith('blob:')) {
          patch.avatar_url = finalAvatarUrl;
        }

        await updateUsuario(selectedUser.id, patch);
        await fetchUsuarios();
        setModalType(null);
        setSelectedUser(null);
        S.fire({
          icon: 'success',
          title: 'Usuario actualizado',
          text: 'Los datos y la asignación académica se guardaron correctamente.',
          timer: 1600,
          showConfirmButton: false,
        });
      } catch (error: any) {
        S.fire({
          icon: 'error',
          title: 'No se pudo actualizar',
          text: error?.message || 'Ocurrió un error al actualizar el usuario.',
          confirmButtonColor: '#B00020',
        });
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleDelete = async () => {
    if (selectedUser) {
      const S = (await import('sweetalert2')).default;
      try {
        await removeUsuario(selectedUser.id);
        await fetchUsuarios();
        setModalType(null);
        setSelectedUser(null);
      } catch (error: any) {
        S.fire({
          icon: 'error',
          title: 'No se puede eliminar',
          text: selectedUser.tipoRegistro === 'docente'
            ? 'Este docente está utilizado en uno o más horarios. Puedes marcarlo como inactivo.'
            : error?.message || 'No se pudo eliminar el usuario.',
          confirmButtonColor: '#B00020',
        });
      }
    }
  };

  const pageData = filteredData.slice((currentPage - 1) * perPage, currentPage * perPage);

  // Columnas visibles según el rol filtrado (no todos los roles usan todos los campos).
  // Sin filtro (o al ver todos) se muestran todas.
  /**
   * Rol con el que abre el formulario de alta: el mismo que se está listando. Si la pantalla
   * muestra docentes, "Nuevo" crea un docente. Sin filtro cae al rol por defecto.
   */
  const rolParaAlta = soloDocentes ? 'Docente' : (filterRol || defaultFormValues.rol);

  const showCarrera = !filterRol || filterRol === 'Estudiante' || filterRol === 'Tecnico';
  const showPao = !filterRol || filterRol === 'Estudiante';
  const showCodigo = !filterRol || filterRol === 'Estudiante';
  const gridCols = ['40px', '1.4fr', '1fr', showCarrera ? '1.1fr' : null, showPao ? '0.6fr' : null, showCodigo ? '0.9fr' : null, '0.8fr', '1fr', '90px'].filter(Boolean).join(' ');
  const tableMinW = 820 + (showCarrera ? 170 : 0) + (showPao ? 80 : 0) + (showCodigo ? 150 : 0);

  const toggleSelect = (id: string) =>
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const toggleSelectAll = () => {
    const allSelected = pageData.length > 0 && pageData.every(u => selectedIds.includes(u.id));
    setSelectedIds(allSelected ? [] : pageData.map(u => u.id));
  };
  const handleBulkDelete = async () => {
    const seleccionados = usuarios.filter((usuario) => selectedIds.includes(usuario.id));
    for (const registro of seleccionados) {
      await removeUsuario(registro.id);
    }
    await fetchUsuarios();
    setSelectedIds([]);
    setModalType(null);
  };

  const exportCsv = () => {
    const rows = selectedIds.length > 0 ? usuarios.filter(u => selectedIds.includes(u.id)) : filteredData;
    const head = ['ID', 'Nombre', 'Email', 'Rol', 'Estado', 'Departamento', 'Código', 'Facultad', 'Carrera', 'PAO', 'Última conexión'];
    const body = rows.map(u => [u.id, u.nombre, u.email, u.rol, u.estado, u.departamento, u.codigo, u.facultad, u.carrera, u.pao ?? '', u.ultimaConexion]);
    const csv = [head, ...body].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'usuarios.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const getRolBadge = (rol: string) => {
    switch (rol) {
      case 'Administrador': return <span className="bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-md text-[10px] font-bold border border-indigo-200/50 flex items-center gap-1.5 w-max"><ShieldCheck className="w-3 h-3"/> {rol}</span>;
      case 'Docente': return <span className="bg-purple-50 text-purple-700 px-2.5 py-1 rounded-md text-[10px] font-bold border border-purple-200/50 flex items-center gap-1.5 w-max"><BookOpen className="w-3 h-3"/> {rol}</span>;
      case 'Estudiante': return <span className="bg-blue-50 text-blue-700 px-2.5 py-1 rounded-md text-[10px] font-bold border border-blue-200/50 flex items-center gap-1.5 w-max"><GraduationCap className="w-3 h-3"/> {rol}</span>;
      default: return <span className="bg-gray-100 text-gray-700 px-2.5 py-1 rounded-md text-[10px] font-bold border border-gray-200/50 flex items-center gap-1.5 w-max"><UsersIcon className="w-3 h-3"/> {rol}</span>;
    }
  };

  const getEstadoBadge = (estado: string) => {
    if (estado === 'activo') return <span className="bg-emerald-50 text-emerald-600 px-2.5 py-1 rounded-full text-[10px] font-bold border border-emerald-200/50 flex items-center gap-1.5 w-max"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div> Activo</span>;
    return <span className="bg-red-50 text-red-600 px-2.5 py-1 rounded-full text-[10px] font-bold border border-red-200/50 flex items-center gap-1.5 w-max"><div className="w-1.5 h-1.5 rounded-full bg-red-500"></div> Inactivo</span>;
  };

  const editandoDocente = modalType === 'edit' && selectedUser?.tipoRegistro === 'docente';
  const esDocenteForm = (modalType === 'create' && formValues.rol === 'Docente') || editandoDocente;

  return (
    <div className="flex flex-col h-screen bg-[#f4f7fb]">
      {/* HERO SECTION */}
      <div className="w-full min-h-[120px] bg-[#1a1f26] relative flex items-center px-6 lg:px-12 shrink-0 overflow-hidden shadow-sm py-5 border-b border-gray-800">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=2000&auto=format&fit=crop')] bg-cover bg-center opacity-[0.25]"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-[#1a1f26] via-[#1a1f26]/90 to-[#1a1f26]/80"></div>
        
        <div className="relative z-10 w-full flex justify-between items-center flex-wrap gap-4">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 shrink-0 rounded-[14px] bg-[#b00000] flex items-center justify-center text-white shadow-lg">
              <UsersIcon className="w-7 h-7" strokeWidth={2} />
            </div>
            <div className="flex flex-col">
              <h2 className="text-[28px] md:text-[34px] font-bold text-white tracking-tight leading-none mb-1.5">
                {soloDocentes ? 'Gestión de Docentes' : 'Gestión de Usuarios y Docentes'}
              </h2>
              <p className="text-[13px] text-gray-400 font-medium">{soloDocentes ? 'Catálogo de docentes para horarios (varias carreras y materias).' : 'Administración de cuentas y del catálogo docente.'}</p>
            </div>
          </div>
          <div className="flex items-center gap-6 bg-[#212730] rounded-xl px-6 py-3 border border-white/5 shadow-inner hidden md:flex">
            <div className="flex items-center gap-3">
              <UsersIcon className="w-6 h-6 text-gray-400" strokeWidth={1.5} />
              <div className="flex flex-col">
                <span className="text-[15px] font-bold text-white leading-tight">{kpis.totalUsuarios}</span>
                <span className="text-[10px] font-medium text-gray-400 leading-none">Registros</span>
              </div>
            </div>
            <div className="w-px h-8 bg-white/10 mx-1"></div>
            <div className="flex items-center gap-3">
              <UserCheck className="w-6 h-6 text-gray-400" strokeWidth={1.5} />
              <div className="flex flex-col">
                <span className="text-[15px] font-bold text-white leading-tight">{kpis.activos}</span>
                <span className="text-[10px] font-medium text-gray-400 leading-none">Activos</span>
              </div>
            </div>
            <div className="w-px h-8 bg-white/10 mx-1"></div>
            <div className="flex items-center gap-3">
              <GraduationCap className="w-6 h-6 text-gray-400" strokeWidth={1.5} />
              <div className="flex flex-col">
                <span className="text-[15px] font-bold text-white leading-tight">{kpis.estudiantes}</span>
                <span className="text-[10px] font-medium text-gray-400 leading-none">Estudiantes</span>
              </div>
            </div>
            <div className="w-px h-8 bg-white/10 mx-1"></div>
            <div className="flex items-center gap-3">
              <BookOpen className="w-6 h-6 text-gray-400" strokeWidth={1.5} />
              <div className="flex flex-col">
                <span className="text-[15px] font-bold text-white leading-tight">{kpis.docentes}</span>
                <span className="text-[10px] font-medium text-gray-400 leading-none">Docentes</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col p-6 md:p-8 min-h-0 relative bg-[#f4f7fb]/90 backdrop-blur-xl h-full animate-fade-in">


      {/* CONTENT */}
      <div className="bg-white/95 backdrop-blur-xl rounded-[20px] shadow-sm border border-gray-200/60 p-6 flex flex-col relative overflow-hidden flex-1 min-h-0">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-espoch-yellow via-orange-400 to-espoch-red opacity-90"></div>
        
        {/* CONTROLS */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-6 shrink-0 mt-2">
          <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
            <SearchInput
              value={searchQuery}
              onChange={(v) => { setSearchQuery(v); setCurrentPage(1); }}
              placeholder="Buscar usuario o docente..."
              className="w-full sm:w-[260px] shrink-0"
            />
            {!soloDocentes && (
              <div className="flex items-center gap-1.5 flex-wrap">
                {rolNombres.map(r => {
                  const active = filterRol === r;
                  return (
                    <button
                      key={r}
                      onClick={() => { setFilterRol(active ? '' : r); setCurrentPage(1); }}
                      className={`text-[12px] font-bold rounded-full py-2 px-4 border transition-all shadow-sm whitespace-nowrap ${active ? 'bg-[#0f172a] text-white border-transparent' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:text-gray-900'}`}
                      title={active ? 'Quitar filtro' : `Ver solo ${r}`}
                    >
                      {r}
                    </button>
                  );
                })}
              </div>
            )}
            <FilterDropdown
              label="Estado"
              value={filterEstado || 'todos'}
              options={[
                { key: 'todos', label: 'Todos' },
                { key: 'activo', label: 'Activo' },
                { key: 'inactivo', label: 'Inactivo' },
              ]}
              onChange={(k) => { setFilterEstado(k === 'todos' ? '' : k); setCurrentPage(1); }}
            />
            {(filterRol || filterEstado || searchQuery) && (
              <button
                onClick={() => { setSearchQuery(''); setFilterRol(soloDocentes ? 'Docente' : ''); setFilterEstado(''); setCurrentPage(1); }}
                className="flex items-center gap-1.5 text-[12px] text-gray-500 font-medium hover:text-gray-700 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Limpiar filtros
              </button>
            )}
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {selectedIds.length > 0 && (
              <button onClick={() => setModalType('bulkDelete')} className="flex items-center gap-2 px-5 py-2.5 rounded-full border border-red-200 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 transition-colors">
                <Trash2 className="w-3.5 h-3.5" /> Eliminar ({selectedIds.length})
              </button>
            )}
            <button onClick={exportCsv} className="flex items-center gap-2 px-5 py-2.5 rounded-full border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50 transition-colors">
              <Download className="w-3.5 h-3.5" /> Exportar{selectedIds.length > 0 ? ` (${selectedIds.length})` : ''}
            </button>
            <button onClick={() => { setFormValues({ ...defaultFormValues, rol: rolParaAlta }); setModalType('create'); }} className="bg-[#0f172a] hover:bg-black text-white font-bold text-xs px-6 py-2.5 rounded-full flex items-center gap-2 shadow-lg transition-all border border-gray-800">
              <Plus className="w-3.5 h-3.5" /> {soloDocentes ? 'Nuevo docente' : 'Nuevo registro'}
            </button>
          </div>
        </div>

        {/* TABLE */}
        <div className="w-full overflow-auto flex-1 flex flex-col min-h-0 relative custom-scrollbar border border-gray-100 rounded-xl">
          <div className="grid gap-4 px-4 pb-3 border-b border-gray-100 text-[9px] font-extrabold text-gray-500 uppercase tracking-widest sticky top-0 bg-white z-10 shrink-0 pt-3" style={{ gridTemplateColumns: gridCols, minWidth: tableMinW }}>
            <div className="flex items-center justify-center"><input type="checkbox" checked={pageData.length > 0 && pageData.every(u => selectedIds.includes(u.id))} onChange={toggleSelectAll} className="w-3.5 h-3.5 rounded border-gray-300 accent-espoch-yellow cursor-pointer" /></div>
            <div className="flex items-center gap-1.5 cursor-pointer hover:text-gray-700" onClick={() => handleSort('nombre')}>USUARIO / DOCENTE <ArrowUpDown className="w-3 h-3" /></div>
            <div className="flex items-center gap-1.5 cursor-pointer hover:text-gray-700" onClick={() => handleSort('rol')}>ROL / DEPARTAMENTO <ArrowUpDown className="w-3 h-3" /></div>
            {showCarrera && <div className="flex items-center gap-1.5 cursor-pointer hover:text-gray-700" onClick={() => handleSort('carrera')}>CARRERA <ArrowUpDown className="w-3 h-3" /></div>}
            {showPao && <div className="flex items-center gap-1.5 cursor-pointer hover:text-gray-700" onClick={() => handleSort('pao')}>PAO <ArrowUpDown className="w-3 h-3" /></div>}
            {showCodigo && <div className="flex items-center gap-1.5 cursor-pointer hover:text-gray-700" onClick={() => handleSort('codigo')}>CÓDIGO <ArrowUpDown className="w-3 h-3" /></div>}
            <div className="flex items-center gap-1.5 cursor-pointer hover:text-gray-700" onClick={() => handleSort('estado')}>ESTADO <ArrowUpDown className="w-3 h-3" /></div>
            <div className="flex items-center gap-1.5 cursor-pointer hover:text-gray-700" onClick={() => handleSort('ultimaConexion')}>ÚLTIMA CONEXIÓN <ArrowUpDown className="w-3 h-3" /></div>
            <div className="text-right">ACCIONES</div>
          </div>
          
          <div className="flex flex-col" style={{ minWidth: tableMinW }}>
            {pageData.map((u, i) => (
              <div key={u.id} className={`grid gap-4 px-4 py-3 border-b border-gray-50 transition-colors items-center animate-fade-in ${selectedIds.includes(u.id) ? 'bg-blue-50/40' : 'hover:bg-gray-50/50'}`} style={{ gridTemplateColumns: gridCols, animationDelay: `${i * 30}ms` }}>
                  <div className="flex items-center justify-center"><input type="checkbox" checked={selectedIds.includes(u.id)} onChange={() => toggleSelect(u.id)} className="w-3.5 h-3.5 rounded border-gray-300 accent-espoch-yellow cursor-pointer" /></div>
                  <div className="flex items-center gap-3 min-w-0">
                      <img src={u.avatar} className="w-9 h-9 rounded-full bg-gray-100 object-cover shrink-0" />
                      <div className="flex flex-col min-w-0">
                          <span className="text-xs font-bold text-gray-900 truncate">{u.nombre}</span>
                          <span className="text-[10px] text-gray-500 truncate">
                            {u.tipoRegistro === 'docente' ? 'Sin cuenta de acceso' : u.email}
                          </span>
                      </div>
                  </div>
                  <div className="flex flex-col min-w-0 gap-1 w-max">
                      {getRolBadge(u.rol)}
                      <span className="text-[10px] font-semibold text-gray-500 truncate pl-1">{u.departamento}</span>
                  </div>
                  {showCarrera && <div className="min-w-0"><span className="text-[11px] font-semibold text-gray-700 truncate block" title={u.carrera}>{u.carrera || '—'}</span></div>}
                  {showPao && <div className="min-w-0">{u.pao ? <span className="text-[10px] font-bold text-gray-600 bg-gray-100 px-2 py-0.5 rounded-md w-max">PAO {u.pao}</span> : <span className="text-gray-300 text-[11px]">—</span>}</div>}
                  {showCodigo && <div className="min-w-0"><span className="text-[11px] font-mono text-gray-500 truncate block">{u.codigo || '—'}</span></div>}
                  <div className="flex flex-col gap-1 w-max">{getEstadoBadge(u.estado)}</div>
                  <div className="text-[11px] font-semibold text-gray-600">{u.ultimaConexion}</div>
                  <div className="flex justify-end gap-1">
                      <button onClick={() => { setSelectedUser(u); setFormValues({ nombre: u.nombre, titulo: u.titulo || '', apellidos: u.apellidos || '', nombres: u.nombres || '', email: u.email, rol: u.rol, departamento: u.departamento, estado: u.estado, avatar_url: u.avatar, fotoFile: null, codigo: u.codigo || '', facultadId: u.facultadId || '', carreraId: u.carreraId || '', pao: u.pao ? String(u.pao) : '' }); setModalType('edit'); }} className="w-7 h-7 flex items-center justify-center rounded-md bg-indigo-50 text-indigo-500 hover:bg-indigo-100 transition-colors" title="Editar"><Edit2 className="w-3.5 h-3.5" /></button>
                      <button onClick={() => { setSelectedUser(u); setModalType('delete'); }} className="w-7 h-7 flex items-center justify-center rounded-md bg-red-50 text-red-500 hover:bg-red-100 transition-colors" title="Eliminar"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
              </div>
            ))}
            {filteredData.length === 0 && (
              <EmptyState
                icon={UsersIcon}
                title={usuarios.length === 0 ? 'Sin usuarios ni docentes registrados' : 'Sin resultados con estos filtros'}
                secondaryLabel={usuarios.length > 0 ? 'Limpiar filtros' : undefined}
                onSecondary={usuarios.length > 0 ? () => { setSearchQuery(''); setFilterRol(soloDocentes ? 'Docente' : ''); setFilterEstado(''); setCurrentPage(1); } : undefined}
                className="py-12"
              />
            )}
          </div>
        </div>
        
        {/* PAGINATION */}
        <div className="flex flex-col md:flex-row justify-between items-center mt-4 gap-4 shrink-0">
          <div className="flex items-center gap-4 text-[11px] font-bold">
              <span className="bg-gray-100 text-gray-600 px-3 py-1.5 rounded-full flex items-center gap-1.5 tracking-wider">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full"></span> 
                  {(currentPage - 1) * perPage + 1}-{Math.min(currentPage * perPage, filteredData.length)} de {filteredData.length}
              </span>
              <div className="flex items-center gap-2 text-[11px] font-bold text-gray-500">
                  <span>Filas:</span>
                  <select value={perPage} onChange={(e) => { setPerPage(Number(e.target.value)); setCurrentPage(1); }} className="bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 outline-none cursor-pointer hover:bg-gray-100">
                      <option value={5}>5</option>
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                  </select>
              </div>
          </div>
          <div className="flex items-center gap-1">
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className={`w-8 h-8 flex items-center justify-center rounded-lg ${currentPage === 1 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:bg-gray-100'}`}><span className="text-[10px]">◀</span></button>
              {Array.from({ length: Math.ceil(filteredData.length / perPage) }).map((_, i) => (
                <button key={i} onClick={() => setCurrentPage(i + 1)} className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold ${currentPage === i + 1 ? 'bg-espoch-red text-white shadow-md' : 'text-gray-500 hover:bg-gray-100'}`}>{i + 1}</button>
              ))}
              <button onClick={() => setCurrentPage(p => Math.min(Math.ceil(filteredData.length / perPage), p + 1))} disabled={currentPage === Math.ceil(filteredData.length / perPage)} className={`w-8 h-8 flex items-center justify-center rounded-lg ${currentPage === Math.ceil(filteredData.length / perPage) ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:bg-gray-100'}`}><span className="text-[10px]">▶</span></button>
          </div>
        </div>
      </div>

      {/* MODALS */}
      {modalType && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 backdrop-blur-[4px] p-4 animate-fade-in">
          {(modalType === 'create' || modalType === 'edit') && (
            <div className="bg-white rounded-3xl w-full max-w-[500px] max-h-[92vh] overflow-y-auto custom-scrollbar relative animate-scale-in flex flex-col p-8 shadow-2xl">
              <button onClick={() => setModalType(null)} className="absolute top-5 right-5 text-gray-400 hover:text-gray-600 transition-colors bg-gray-50 p-2 rounded-full hover:bg-gray-100"><X className="w-4 h-4"/></button>
              <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
                    {modalType === 'create' ? <Plus className="w-6 h-6"/> : <Edit2 className="w-5 h-5"/>}
                  </div>
                  <div>
                    <h3 className="text-[18px] font-extrabold text-gray-900 tracking-tight">
                      {modalType === 'create'
                        ? esDocenteForm ? 'Registrar Docente' : 'Crear Nuevo Usuario'
                        : editandoDocente ? 'Editar Docente' : 'Editar Usuario'}
                    </h3>
                    <p className="text-[12px] font-medium text-gray-500">
                      {esDocenteForm
                        ? 'Registro interno para asignarlo en Horarios, sin crear una cuenta.'
                        : modalType === 'create'
                          ? 'Complete los datos para registrar un usuario.'
                          : 'Modifique la información del usuario.'}
                    </p>
                  </div>
              </div>
              
              <form onSubmit={handleSave} className="flex flex-col gap-4">
                  {modalType === 'edit' && !editandoDocente && (
                    <div className="flex flex-col gap-1.5 items-center mb-2">
                        <label className="text-[10px] font-extrabold text-gray-500 uppercase tracking-widest w-full">Avatar</label>
                        <div 
                          className="w-20 h-20 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden cursor-pointer relative group hover:border-blue-500 transition-colors"
                          onClick={() => document.getElementById('usr-foto-input')?.click()}
                        >
                          {formValues.avatar_url ? (
                            <img src={formValues.avatar_url} className="w-full h-full object-cover" alt="Avatar" />
                          ) : (
                            <ImageIcon className="w-8 h-8 text-gray-400 group-hover:text-blue-500 transition-colors" />
                          )}
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="text-[9px] font-bold text-white text-center">Cambiar<br/>Foto</span>
                          </div>
                          <input type="file" id="usr-foto-input" accept="image/*" className="hidden" onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              const file = e.target.files[0];
                              setFormValues({...formValues, avatar_url: URL.createObjectURL(file), fotoFile: file});
                            }
                          }} />
                        </div>
                    </div>
                  )}
                  {esDocenteForm ? (
                    /* Dos campos rotulados en vez de uno: es lo que evita que cada persona
                       escriba el nombre en un orden distinto. Se pasan a mayúsculas al teclear. */
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-[130px_1fr] gap-4">
                          <div className="flex flex-col gap-1.5">
                              <label className="text-[10px] font-extrabold text-gray-500 uppercase tracking-widest">Título</label>
                              <select value={formValues.titulo} onChange={e => setFormValues({...formValues, titulo: e.target.value})} className="bg-gray-50/50 text-[13px] text-gray-900 rounded-xl py-3 px-4 outline-none border border-gray-200 focus:border-blue-500 focus:bg-white font-medium cursor-pointer w-full transition-all">
                                  <option value="">Sin título</option>
                                  {TITULOS_ACADEMICOS.map(titulo => <option key={titulo} value={titulo}>{titulo}</option>)}
                              </select>
                          </div>
                          <div className="flex flex-col gap-1.5">
                              <label className="text-[10px] font-extrabold text-gray-500 uppercase tracking-widest">Nombres</label>
                              <input required value={formValues.nombres} onChange={e => setFormValues({...formValues, nombres: enMayusculas(e.target.value)})} placeholder="Ej. ORLANDO DAVID" className="bg-gray-50/50 text-[13px] text-gray-900 rounded-xl py-3 px-4 outline-none border border-gray-200 focus:border-blue-500 focus:bg-white font-medium w-full transition-all" />
                          </div>
                      </div>
                      <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-extrabold text-gray-500 uppercase tracking-widest">Apellidos</label>
                          <input required value={formValues.apellidos} onChange={e => setFormValues({...formValues, apellidos: enMayusculas(e.target.value)})} placeholder="Ej. MAZON MORENO" className="bg-gray-50/50 text-[13px] text-gray-900 rounded-xl py-3 px-4 outline-none border border-gray-200 focus:border-blue-500 focus:bg-white font-medium w-full transition-all" />
                          <p className="text-[10px] font-medium text-gray-400">
                            Se guardará como <b>{componerNombreCompleto(formValues.nombres, formValues.apellidos) || 'NOMBRES APELLIDOS'}</b>.
                          </p>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-extrabold text-gray-500 uppercase tracking-widest">Nombre Completo</label>
                        <input required value={formValues.nombre} onChange={e => setFormValues({...formValues, nombre: e.target.value})} placeholder="Ej. Juan Pérez" className="bg-gray-50/50 text-[13px] text-gray-900 rounded-xl py-3 px-4 outline-none border border-gray-200 focus:border-blue-500 focus:bg-white font-medium w-full transition-all" />
                    </div>
                  )}
                  {!esDocenteForm && (
                    <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-extrabold text-gray-500 uppercase tracking-widest">Correo Electrónico</label>
                        <input
                          required
                          type="email"
                          value={formValues.email}
                          readOnly={modalType === 'edit'}
                          onChange={e => setFormValues({...formValues, email: e.target.value})}
                          placeholder="usuario@espoch.edu.ec"
                          className={`text-[13px] rounded-xl py-3 px-4 outline-none border border-gray-200 font-medium w-full transition-all ${
                            modalType === 'edit'
                              ? 'cursor-not-allowed bg-gray-100 text-gray-500'
                              : 'bg-gray-50/50 text-gray-900 focus:border-blue-500 focus:bg-white'
                          }`}
                        />
                        {modalType === 'edit' && (
                          <span className="text-[9px] font-medium text-gray-400">
                            El correo pertenece a la cuenta de acceso y no se cambia desde este formulario.
                          </span>
                        )}
                    </div>
                  )}

                  <div className="flex flex-col gap-1.5">
                      <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-extrabold text-gray-500 uppercase tracking-widest">Tipo / Rol</label>
                          <select
                            value={formValues.rol}
                            onChange={e => {
                              const rol = e.target.value;
                              const requiereCarrera = rol === 'Estudiante' || rol === 'Tecnico';
                              setFormValues({
                                ...formValues,
                                rol,
                                email: rol === 'Docente' ? '' : formValues.email,
                                facultadId: requiereCarrera ? formValues.facultadId : '',
                                carreraId: requiereCarrera ? formValues.carreraId : '',
                                codigo: rol === 'Estudiante' ? formValues.codigo : '',
                                pao: rol === 'Estudiante' ? formValues.pao : '',
                              });
                            }}
                            disabled={editandoDocente}
                            className="bg-gray-50/50 text-[13px] text-gray-900 rounded-xl py-3 px-4 outline-none border border-gray-200 focus:border-blue-500 focus:bg-white font-medium cursor-pointer w-full transition-all disabled:cursor-not-allowed disabled:opacity-70"
                          >
                              {(modalType === 'edit' && !editandoDocente
                                ? rolNombres.filter(r => r !== 'Docente' || formValues.rol === 'Docente')
                                : rolNombres
                              ).map(r => <option key={r} value={r}>{r}</option>)}
                          </select>
                      </div>
                  </div>

                  {esDocenteForm && (
                    <>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-extrabold text-gray-500 uppercase tracking-widest">Facultad</label>
                        <select
                          required
                          value={formValues.facultadId}
                          onChange={e => setFormValues({...formValues, facultadId: e.target.value})}
                          className="bg-gray-50/50 text-[13px] text-gray-900 rounded-xl py-3 px-4 outline-none border border-gray-200 focus:border-blue-500 focus:bg-white font-medium cursor-pointer w-full transition-all"
                        >
                          <option value="">Seleccione facultad</option>
                          {facultades.map((facultad: any) => (
                            <option key={facultad.id} value={facultad.id}>{facultad.siglas || facultad.nombre}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex items-start gap-2.5 rounded-xl border border-purple-100 bg-purple-50/70 px-3.5 py-3">
                        <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-purple-600" />
                        <p className="text-[11px] font-medium leading-relaxed text-purple-800">
                          Este docente podrá seleccionarse y reutilizarse en cualquier horario. Por ahora no tendrá correo, contraseña ni acceso al sistema.
                        </p>
                      </div>
                    </>
                  )}

                  {/* Facultad + Carrera — al crear o editar Estudiante/Técnico. */}
                  {(formValues.rol === 'Estudiante' || formValues.rol === 'Tecnico') && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-extrabold text-gray-500 uppercase tracking-widest">Facultad</label>
                            <select value={formValues.facultadId} onChange={e => setFormValues({...formValues, facultadId: e.target.value, carreraId: '', pao: ''})} className="bg-gray-50/50 text-[13px] text-gray-900 rounded-xl py-3 px-4 outline-none border border-gray-200 focus:border-blue-500 focus:bg-white font-medium cursor-pointer w-full transition-all">
                                <option value="">Seleccione</option>
                                {facultades.map((f: any) => <option key={f.id} value={f.id}>{f.siglas || f.nombre}</option>)}
                            </select>
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-extrabold text-gray-500 uppercase tracking-widest">Carrera</label>
                            <select disabled={!formValues.facultadId} value={formValues.carreraId} onChange={e => setFormValues({...formValues, carreraId: e.target.value, pao: ''})} className="bg-gray-50/50 text-[13px] text-gray-900 rounded-xl py-3 px-4 outline-none border border-gray-200 focus:border-blue-500 focus:bg-white font-medium cursor-pointer w-full transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                                <option value="">{formValues.facultadId ? 'Seleccione' : 'Elija facultad'}</option>
                                {carrerasDeFacultad.map((c: any) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                            </select>
                        </div>
                    </div>
                  )}

                  {/* Código + PAO — al crear o editar un Estudiante. */}
                  {formValues.rol === 'Estudiante' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-extrabold text-gray-500 uppercase tracking-widest">Código Institucional</label>
                            <input value={formValues.codigo} onChange={e => setFormValues({...formValues, codigo: e.target.value})} placeholder="Ej. 123456" className="bg-gray-50/50 text-[13px] text-gray-900 rounded-xl py-3 px-4 outline-none border border-gray-200 focus:border-blue-500 focus:bg-white font-medium w-full transition-all" />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-extrabold text-gray-500 uppercase tracking-widest">PAO</label>
                            <select disabled={!formValues.carreraId || numPaosForm === 0} value={formValues.pao} onChange={e => setFormValues({...formValues, pao: e.target.value})} className="bg-gray-50/50 text-[13px] text-gray-900 rounded-xl py-3 px-4 outline-none border border-gray-200 focus:border-blue-500 focus:bg-white font-medium cursor-pointer w-full transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                                <option value="">{!formValues.carreraId ? 'Elija carrera' : numPaosForm === 0 ? 'Sin PAO' : 'Seleccione'}</option>
                                {Array.from({ length: numPaosForm }, (_, i) => i + 1).map(n => <option key={n} value={String(n)}>PAO {n}</option>)}
                            </select>
                        </div>
                    </div>
                  )}

                  <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-extrabold text-gray-500 uppercase tracking-widest">Estado</label>
                      <div className="flex gap-4 mt-1">
                          <label onClick={() => setFormValues({ ...formValues, estado: 'activo' })} className="flex items-center gap-2 cursor-pointer group">
                              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${formValues.estado === 'activo' ? 'border-blue-600 bg-blue-600' : 'border-gray-300 group-hover:border-blue-400'}`}>
                                  {formValues.estado === 'activo' && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
                              </div>
                              <span className="text-[13px] font-bold text-gray-700">Activo</span>
                          </label>
                          <label onClick={() => setFormValues({ ...formValues, estado: 'inactivo' })} className="flex items-center gap-2 cursor-pointer group">
                              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${formValues.estado === 'inactivo' ? 'border-red-600 bg-red-600' : 'border-gray-300 group-hover:border-red-400'}`}>
                                  {formValues.estado === 'inactivo' && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
                              </div>
                              <span className="text-[13px] font-bold text-gray-700">Inactivo</span>
                          </label>
                      </div>
                  </div>

                  <div className="flex gap-3 mt-4 justify-end">
                      <button type="button" onClick={() => setModalType(null)} disabled={isSubmitting} className="px-5 py-2.5 rounded-full text-xs font-bold text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-50">Cancelar</button>
                      <button type="submit" disabled={isSubmitting} className="bg-[#0f172a] hover:bg-black text-white px-6 py-2.5 rounded-full text-xs font-bold shadow-lg transition-all border border-gray-800 disabled:opacity-50 flex items-center gap-2">
                        {isSubmitting ? <span className="animate-spin inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full"></span> : null}
                        {modalType === 'create'
                          ? esDocenteForm ? 'Registrar Docente' : 'Registrar Usuario'
                          : 'Guardar Cambios'}
                      </button>
                  </div>
              </form>
            </div>
          )}

          {modalType === 'delete' && selectedUser && (
            <div className="bg-white rounded-3xl p-[32px] shadow-[0_25px_60px_rgba(0,0,0,0.3)] w-full max-w-[420px] relative animate-scale-in text-center py-8">
              <div className="w-14 h-14 rounded-2xl bg-amber-100 flex items-center justify-center mx-auto mb-5">
                <AlertTriangle className="w-7 h-7 text-amber-500" />
              </div>
              <h3 className="text-[18px] font-extrabold text-gray-900 mb-2">
                Eliminar {selectedUser.tipoRegistro === 'docente' ? 'Docente' : 'Usuario'}
              </h3>
              <p className="text-[13px] text-gray-500 mb-7 leading-relaxed">
                ¿Está seguro que desea eliminar a <b className="text-gray-800">{selectedUser.nombre}</b>?
                {selectedUser.tipoRegistro === 'docente'
                  ? ' Si ya está asignado en un horario, el sistema no permitirá eliminarlo.'
                  : ' Perderá acceso inmediato al sistema.'}
              </p>
              <div className="flex gap-3 justify-center">
                <button onClick={() => setModalType(null)} className="flex-1 py-3 rounded-xl border border-gray-200 bg-white font-bold text-[13px] text-gray-700 hover:bg-gray-50 transition-colors">Cancelar</button>
                <button onClick={handleDelete} className="flex-1 py-3 rounded-xl border border-transparent bg-espoch-red hover:bg-espoch-darkred text-white font-bold text-[13px] shadow-[0_0_12px_rgba(176,0,0,0.4)] transition-colors">Eliminar</button>
              </div>
            </div>
          )}

          {modalType === 'bulkDelete' && (
            <div className="bg-white rounded-3xl p-[32px] shadow-[0_25px_60px_rgba(0,0,0,0.3)] w-full max-w-[420px] relative animate-scale-in text-center py-8">
              <div className="w-14 h-14 rounded-2xl bg-amber-100 flex items-center justify-center mx-auto mb-5">
                <AlertTriangle className="w-7 h-7 text-amber-500" />
              </div>
              <h3 className="text-[18px] font-extrabold text-gray-900 mb-2">Eliminar {selectedIds.length} registros</h3>
              <p className="text-[13px] text-gray-500 mb-7 leading-relaxed">
                ¿Está seguro que desea eliminar <b className="text-gray-800">{selectedIds.length}</b> registro{selectedIds.length > 1 ? 's' : ''} seleccionado{selectedIds.length > 1 ? 's' : ''}?
              </p>
              <div className="flex gap-3 justify-center">
                <button onClick={() => setModalType(null)} className="flex-1 py-3 rounded-xl border border-gray-200 bg-white font-bold text-[13px] text-gray-700 hover:bg-gray-50 transition-colors">Cancelar</button>
                <button onClick={handleBulkDelete} className="flex-1 py-3 rounded-xl border border-transparent bg-espoch-red hover:bg-espoch-darkred text-white font-bold text-[13px] shadow-[0_0_12px_rgba(176,0,0,0.4)] transition-colors">Eliminar</button>
              </div>
            </div>
          )}
        </div>
      )}
      </div>
    </div>
  );
};

export default Usuarios;
