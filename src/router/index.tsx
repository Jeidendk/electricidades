import { useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { useThemeStore, applyTheme } from '../store/themeStore';
import { useAuthStore } from '../store/authStore';
import { useUiPrefsStore } from '../store/uiPrefsStore';
import type { Rol } from '../store/authStore';

// Code-splitting por ruta: cada página/layout carga en su propio chunk bajo demanda.
// Las páginas se exportan con nombre, por eso se mapea { default: m.Nombre }.
const Login = lazy(() => import('../modules/auth/pages/Login').then(m => ({ default: m.Login })));
const SetPassword = lazy(() => import('../modules/auth/pages/SetPassword').then(m => ({ default: m.SetPassword })));
const StudentLayout = lazy(() => import('../modules/student/layout/StudentLayout').then(m => ({ default: m.StudentLayout })));
const CatalogoEquipos = lazy(() => import('../modules/student/pages/CatalogoEquipos').then(m => ({ default: m.CatalogoEquipos })));
const MisSolicitudes = lazy(() => import('../modules/student/pages/MisSolicitudes').then(m => ({ default: m.MisSolicitudes })));
const MapaEstudiantil = lazy(() => import('../modules/student/pages/MapaEstudiantil').then(m => ({ default: m.MapaEstudiantil })));
const HorariosEstudiante = lazy(() => import('../modules/student/pages/HorariosEstudiante').then(m => ({ default: m.HorariosEstudiante })));
const RecursosEstudiante = lazy(() => import('../modules/student/pages/RecursosEstudiante').then(m => ({ default: m.RecursosEstudiante })));
const AdminLayout = lazy(() => import('../modules/admin/layout/AdminLayout').then(m => ({ default: m.AdminLayout })));
const TecnicoLayout = lazy(() => import('../modules/tecnico/layout/TecnicoLayout').then(m => ({ default: m.TecnicoLayout })));
const Dashboard = lazy(() => import('../modules/admin/pages/Dashboard').then(m => ({ default: m.Dashboard })));
const Solicitudes = lazy(() => import('../modules/admin/pages/Solicitudes').then(m => ({ default: m.Solicitudes })));
const Formatos = lazy(() => import('../modules/admin/pages/Formatos').then(m => ({ default: m.Formatos })));
const Mantenimiento = lazy(() => import('../modules/admin/pages/Mantenimiento').then(m => ({ default: m.Mantenimiento })));
const Prestamos = lazy(() => import('../modules/admin/pages/Prestamos').then(m => ({ default: m.Prestamos })));
const Infraestructura = lazy(() => import('../modules/admin/pages/Infraestructura').then(m => ({ default: m.Infraestructura })));
const Activos = lazy(() => import('../modules/admin/pages/Activos').then(m => ({ default: m.Activos })));
const Tramites = lazy(() => import('../modules/admin/pages/Tramites').then(m => ({ default: m.Tramites })));
const Usuarios = lazy(() => import('../modules/admin/pages/Usuarios').then(m => ({ default: m.Usuarios })));
const Reportes = lazy(() => import('../modules/admin/pages/Reportes').then(m => ({ default: m.Reportes })));
const Horarios = lazy(() => import('../modules/admin/pages/Horarios').then(m => ({ default: m.Horarios })));
const Recursos = lazy(() => import('../modules/admin/pages/Recursos').then(m => ({ default: m.Recursos })));
const Asignaciones = lazy(() => import('../modules/admin/pages/Asignaciones').then(m => ({ default: m.Asignaciones })));
const EstructuraAcademica = lazy(() => import('../modules/admin/pages/EstructuraAcademica').then(m => ({ default: m.EstructuraAcademica })));

// ---------------------------------------------------------------------------
// Guardia de ruta: requiere sesión activa. Si aún está cargando, muestra nada.
// ---------------------------------------------------------------------------
const RequireAuth = ({ allowedRoles }: { allowedRoles?: Rol[] }) => {
  const user = useAuthStore((s) => s.user);
  const loading = useAuthStore((s) => s.loading);

  if (loading) {
    // Pantalla de carga mínima mientras Supabase restaura la sesión
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f4f7fb]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-espoch-red border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-gray-500 font-semibold">Cargando sesión...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // El admin es superusuario: puede entrar a cualquier vista (admin/técnico/estudiante)
  // para inspeccionar todas las interfaces. El resto se limita a su rol.
  if (allowedRoles && user.role !== 'admin' && !allowedRoles.includes(user.role)) {
    if (user.role === 'tecnico') return <Navigate to="/tecnico" replace />;
    return <Navigate to="/student" replace />;
  }

  return <Outlet />;
};

// Ruta inicial por rol.
const homeFor = (role: Rol) =>
  role === 'admin' ? '/admin' : role === 'tecnico' ? '/tecnico/horarios' : '/student';

// ---------------------------------------------------------------------------
// Ruta pública: si el usuario ya tiene sesión, redirige a su dashboard
// ---------------------------------------------------------------------------
const PublicRoute = () => {
  const user = useAuthStore((s) => s.user);
  const loading = useAuthStore((s) => s.loading);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f4f7fb]">
        <div className="w-10 h-10 border-4 border-espoch-red border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (user) {
    // Restaura la última ruta visitada si existe y es coherente; si no, el home del rol.
    const lastPath = useUiPrefsStore.getState().lastPath;
    const target = user.role === 'tecnico'
      ? '/tecnico/horarios'
      : lastPath && lastPath !== '/login' && lastPath !== '/'
        ? lastPath
        : homeFor(user.role);
    return <Navigate to={target} replace />;
  }

  return <Outlet />;
};

// Recuerda la ruta actual (autenticada) para restaurarla al recargar/reabrir la app.
const RouteMemory = () => {
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  useEffect(() => {
    if (user && location.pathname !== '/login' && location.pathname !== '/') {
      useUiPrefsStore.getState().setLastPath(location.pathname);
    }
  }, [location.pathname, user]);
  return null;
};

// ---------------------------------------------------------------------------
export const AppRouter = () => {
  const dark = useThemeStore((s) => s.dark);
  useEffect(() => { applyTheme(dark); }, [dark]);

  const Fallback = (
    <div className="min-h-screen flex items-center justify-center bg-[#f4f7fb]">
      <div className="w-10 h-10 border-4 border-espoch-red border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <BrowserRouter>
      <RouteMemory />
      <Suspense fallback={Fallback}>
      <Routes>
        {/* Rutas Públicas / Auth — redirigen automáticamente si hay sesión */}
        <Route element={<PublicRoute />}>
          <Route path="/login" element={<Login />} />
        </Route>
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* Establecer contraseña — destino del enlace de invitación de un solo uso.
            Sin guardia: la sesión la aporta el propio enlace mágico de Supabase. */}
        <Route path="/set-password" element={<SetPassword />} />

        {/* ── Rutas del Estudiante ── */}
        <Route element={<RequireAuth allowedRoles={['student', 'admin', 'tecnico']} />}>
          <Route path="/student" element={<StudentLayout />}>
            <Route index element={<Navigate to="/student/catalog" replace />} />
            <Route path="catalog" element={<CatalogoEquipos />} />
            <Route path="requests" element={<MisSolicitudes />} />
            <Route path="map" element={<MapaEstudiantil />} />
            <Route path="horarios" element={<HorariosEstudiante />} />
            <Route path="recursos" element={<RecursosEstudiante />} />
          </Route>
        </Route>

        {/* ── Rutas del Administrador ── */}
        <Route element={<RequireAuth allowedRoles={['admin']} />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="tramites" element={<Tramites />} />
            <Route path="solicitudes" element={<Navigate to="/admin/tramites" replace />} />
            <Route path="formatos" element={<Formatos />} />
            <Route path="activos" element={<Activos />} />
            <Route path="inventario" element={<Navigate to="/admin/activos" replace />} />
            <Route path="mantenimiento" element={<Navigate to="/admin/activos?tab=mantenimiento" replace />} />
            <Route path="prestamos" element={<Navigate to="/admin/tramites?tab=prestamos" replace />} />
            {/* Rutas antiguas → redirigen al centro de activos unificado */}
            <Route path="herramientas" element={<Navigate to="/admin/activos" replace />} />
            <Route path="equipos" element={<Navigate to="/admin/activos" replace />} />
            <Route path="mobiliario" element={<Navigate to="/admin/activos" replace />} />
            <Route path="tecnologico" element={<Navigate to="/admin/activos" replace />} />
            <Route path="infraestructura" element={<Infraestructura />} />
            <Route path="edificios" element={<Navigate to="/admin/infraestructura" replace />} />
            <Route path="espacios" element={<Navigate to="/admin/infraestructura" replace />} />
            <Route path="aulas" element={<Navigate to="/admin/infraestructura" replace />} />
            <Route path="laboratorios" element={<Navigate to="/admin/infraestructura" replace />} />
            <Route path="usuarios" element={<Usuarios />} />
            <Route path="reportes" element={<Reportes />} />
            <Route path="horarios" element={<Horarios />} />
            <Route path="recursos" element={<Recursos />} />
            <Route path="asignaciones" element={<Navigate to="/admin/activos?tab=asignaciones" replace />} />
            <Route path="estructura-academica" element={<EstructuraAcademica />} />
            <Route path="academico" element={<Navigate to="/admin/estructura-academica" replace />} />
            <Route path="facultades" element={<Navigate to="/admin/estructura-academica" replace />} />
          </Route>
        </Route>

        {/* ── Rutas del Técnico ── */}
        <Route element={<RequireAuth allowedRoles={['tecnico']} />}>
          <Route path="/tecnico" element={<TecnicoLayout />}>
            <Route index element={<Navigate to="/tecnico/horarios" replace />} />
            <Route path="dashboard" element={<Navigate to="/tecnico/horarios" replace />} />
            <Route path="solicitudes" element={<Solicitudes />} />
            <Route path="prestamos" element={<Prestamos />} />
            <Route path="horarios" element={<Horarios />} />
            <Route path="mantenimiento" element={<Mantenimiento />} />
            <Route path="asignaciones" element={<Asignaciones />} />
            <Route path="estructura-academica" element={<EstructuraAcademica />} />
            <Route path="academico" element={<Navigate to="/tecnico/estructura-academica" replace />} />
            <Route path="usuarios" element={<Usuarios />} />
            <Route path="recursos" element={<Recursos />} />
            <Route path="formatos" element={<Formatos />} />
            <Route path="reportes" element={<Reportes />} />
          </Route>
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
      </Suspense>
    </BrowserRouter>
  );
};
