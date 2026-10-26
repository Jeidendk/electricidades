import { useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { useThemeStore, applyTheme } from '../store/themeStore';
import { useAuthStore, esRolAutoridad } from '../store/authStore';
import { useUiPrefsStore } from '../store/uiPrefsStore';
import type { Rol } from '../store/authStore';
import { esErrorDeVersionVieja, olvidarRecarga, recargarUnaVez } from '../lib/recargaPorDespliegue';
import { ASISTENTE_VISIBLE } from '../lib/asistente/disponibilidad';

/**
 * `lazy()` que sobrevive a un despliegue nuevo.
 */
const cargarPagina = <T,>(importar: () => Promise<T>): Promise<T> =>
  importar()
    .then((modulo) => {
      olvidarRecarga();
      return modulo;
    })
    .catch(async (error) => {
      try {
        return await importar();
      } catch (segundoError) {
        if (esErrorDeVersionVieja(segundoError) && recargarUnaVez()) {
          return new Promise<T>(() => {});
        }
        throw error;
      }
    });

// Code-splitting por ruta
const Login = lazy(() => cargarPagina(() => import('../modules/auth/pages/Login').then(m => ({ default: m.Login }))));
const SetPassword = lazy(() => cargarPagina(() => import('../modules/auth/pages/SetPassword').then(m => ({ default: m.SetPassword }))));
const StudentLayout = lazy(() => cargarPagina(() => import('../modules/student/layout/StudentLayout').then(m => ({ default: m.StudentLayout }))));
const CatalogoEquipos = lazy(() => cargarPagina(() => import('../modules/student/pages/CatalogoEquipos').then(m => ({ default: m.CatalogoEquipos }))));
const MisSolicitudes = lazy(() => cargarPagina(() => import('../modules/student/pages/MisSolicitudes').then(m => ({ default: m.MisSolicitudes }))));
const MapaEstudiantil = lazy(() => cargarPagina(() => import('../modules/student/pages/MapaEstudiantil').then(m => ({ default: m.MapaEstudiantil }))));
const HorariosEstudiante = lazy(() => cargarPagina(() => import('../modules/student/pages/HorariosEstudiante').then(m => ({ default: m.HorariosEstudiante }))));
const RecursosEstudiante = lazy(() => cargarPagina(() => import('../modules/student/pages/RecursosEstudiante').then(m => ({ default: m.RecursosEstudiante }))));
const ModelosOficio = lazy(() => cargarPagina(() => import('../modules/student/pages/ModelosOficio').then(m => ({ default: m.ModelosOficio }))));
const MisTramites = lazy(() => cargarPagina(() => import('../modules/student/pages/MisTramites').then(m => ({ default: m.MisTramites }))));
const AdminLayout = lazy(() => cargarPagina(() => import('../modules/admin/layout/AdminLayout').then(m => ({ default: m.AdminLayout }))));
const TecnicoLayout = lazy(() => cargarPagina(() => import('../modules/tecnico/layout/TecnicoLayout').then(m => ({ default: m.TecnicoLayout }))));
const TecnicoDashboard = lazy(() => cargarPagina(() => import('../modules/tecnico/pages/TecnicoDashboard').then(m => ({ default: m.TecnicoDashboard }))));
const AutoridadDashboard = lazy(() => cargarPagina(() => import('../modules/autoridad/pages/AutoridadDashboard').then(m => ({ default: m.AutoridadDashboard }))));
const AutoridadLayout = lazy(() => cargarPagina(() => import('../modules/autoridad/layout/AutoridadLayout').then(m => ({ default: m.AutoridadLayout }))));
const AdministrativoLayout = lazy(() => cargarPagina(() => import('../modules/administrativo/layout/AdministrativoLayout').then(m => ({ default: m.AdministrativoLayout }))));
const DocenteLayout = lazy(() => cargarPagina(() => import('../modules/docente/layout/DocenteLayout').then(m => ({ default: m.DocenteLayout }))));
const DocenteDashboard = lazy(() => cargarPagina(() => import('../modules/docente/pages/DocenteDashboard').then(m => ({ default: m.DocenteDashboard }))));
const Dashboard = lazy(() => cargarPagina(() => import('../modules/admin/pages/Dashboard').then(m => ({ default: m.Dashboard }))));
const Solicitudes = lazy(() => cargarPagina(() => import('../modules/admin/pages/Solicitudes').then(m => ({ default: m.Solicitudes }))));
const Formatos = lazy(() => cargarPagina(() => import('../modules/admin/pages/Formatos').then(m => ({ default: m.Formatos }))));
const Asistente = lazy(() => cargarPagina(() => import('../modules/admin/pages/Asistente').then(m => ({ default: m.Asistente }))));
const Mantenimiento = lazy(() => cargarPagina(() => import('../modules/admin/pages/Mantenimiento').then(m => ({ default: m.Mantenimiento }))));
const Prestamos = lazy(() => cargarPagina(() => import('../modules/admin/pages/Prestamos').then(m => ({ default: m.Prestamos }))));
const Infraestructura = lazy(() => cargarPagina(() => import('../modules/admin/pages/Infraestructura').then(m => ({ default: m.Infraestructura }))));
const Activos = lazy(() => cargarPagina(() => import('../modules/admin/pages/Activos').then(m => ({ default: m.Activos }))));
const Tramites = lazy(() => cargarPagina(() => import('../modules/admin/pages/Tramites').then(m => ({ default: m.Tramites }))));
const Usuarios = lazy(() => cargarPagina(() => import('../modules/admin/pages/Usuarios').then(m => ({ default: m.Usuarios }))));
const Reportes = lazy(() => cargarPagina(() => import('../modules/admin/pages/Reportes').then(m => ({ default: m.Reportes }))));
const Monitoreo = lazy(() => cargarPagina(() => import('../modules/admin/pages/Monitoreo').then(m => ({ default: m.Monitoreo }))));
const Horarios = lazy(() => cargarPagina(() => import('../modules/admin/pages/Horarios').then(m => ({ default: m.Horarios }))));
const Recursos = lazy(() => cargarPagina(() => import('../modules/admin/pages/Recursos').then(m => ({ default: m.Recursos }))));
const Asignaciones = lazy(() => cargarPagina(() => import('../modules/admin/pages/Asignaciones').then(m => ({ default: m.Asignaciones }))));
const EstructuraAcademica = lazy(() => cargarPagina(() => import('../modules/admin/pages/EstructuraAcademica').then(m => ({ default: m.EstructuraAcademica }))));

const RequireAuth = ({ allowedRoles }: { allowedRoles?: Rol[] }) => {
  const user = useAuthStore((s) => s.user);
  const loading = useAuthStore((s) => s.loading);

  if (loading) {
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

  if (allowedRoles && user.role !== 'admin' && !allowedRoles.includes(user.role)) {
    if (user.role === 'tecnico') return <Navigate to="/tecnico" replace />;
    if (user.role === 'docente') return <Navigate to="/docente" replace />;
    if (esRolAutoridad(user.role)) return <Navigate to="/autoridad" replace />;
    if (user.role === 'administrativo') return <Navigate to="/administrativo" replace />;
    return <Navigate to="/student" replace />;
  }

  return <Outlet />;
};

const homeFor = (role: Rol) =>
  role === 'admin' ? '/admin'
    : role === 'tecnico' ? '/tecnico/dashboard'
    : role === 'docente' ? '/docente/dashboard'
    : role === 'administrativo' ? '/administrativo/dashboard'
    : esRolAutoridad(role) ? '/autoridad/dashboard'
    : '/student';

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
    const lastPath = useUiPrefsStore.getState().lastPath;
    const target = user.role === 'tecnico'
      ? '/tecnico/dashboard'
      : user.role === 'docente'
        ? '/docente/dashboard'
        : user.role === 'administrativo'
          ? '/administrativo/dashboard'
        // Las autoridades van siempre a su panel: `lastPath` puede apuntar a una ruta de admin
        // de una sesión anterior en el mismo navegador, y ahí el guard las rebotaría.
        : esRolAutoridad(user.role)
          ? '/autoridad/dashboard'
          : lastPath && lastPath !== '/login' && lastPath !== '/'
            ? lastPath
            : homeFor(user.role);
    return <Navigate to={target} replace />;
  }

  return <Outlet />;
};

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
        <Route element={<PublicRoute />}>
          <Route path="/login" element={<Login />} />
        </Route>
        <Route path="/" element={<Navigate to="/login" replace />} />

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
            <Route path="oficios" element={<ModelosOficio />} />
            <Route path="tramites" element={<MisTramites />} />
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
            {ASISTENTE_VISIBLE && <Route path="asistente" element={<Asistente />} />}
            <Route path="activos" element={<Activos />} />
            <Route path="inventario" element={<Navigate to="/admin/activos" replace />} />
            <Route path="mantenimiento" element={<Navigate to="/admin/activos?tab=mantenimiento" replace />} />
            <Route path="prestamos" element={<Prestamos />} />
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
            {/* Solo admin: la RLS de `auditoria` ya lo exige, esto evita además mostrar la
                pantalla vacía a un técnico que llegue por la URL. */}
            <Route path="monitoreo" element={<Monitoreo />} />
            <Route path="auditoria" element={<Navigate to="/admin/monitoreo" replace />} />
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
            <Route index element={<Navigate to="/tecnico/dashboard" replace />} />
            <Route path="dashboard" element={<TecnicoDashboard />} />
            <Route path="solicitudes" element={<Solicitudes />} />
            <Route path="prestamos" element={<Prestamos />} />
            <Route path="horarios" element={<Horarios />} />
            <Route path="mantenimiento" element={<Mantenimiento />} />
            <Route path="asignaciones" element={<Asignaciones />} />
            <Route path="infraestructura" element={<Navigate to="/tecnico/dashboard" replace />} />
            <Route path="edificios" element={<Navigate to="/tecnico/dashboard" replace />} />
            <Route path="espacios" element={<Navigate to="/tecnico/dashboard" replace />} />
            <Route path="aulas" element={<Navigate to="/tecnico/dashboard" replace />} />
            <Route path="laboratorios" element={<Navigate to="/tecnico/dashboard" replace />} />
            <Route path="estructura-academica" element={<EstructuraAcademica />} />
            <Route path="academico" element={<Navigate to="/tecnico/estructura-academica" replace />} />
            <Route path="usuarios" element={<Usuarios />} />
            <Route path="recursos" element={<Recursos />} />
            <Route path="formatos" element={<Formatos />} />
            {/* El técnico no tiene asistente. Se redirige en vez de borrar la ruta: un marcador
                viejo caería en el catch-all y terminaría en el login. */}
            <Route path="asistente" element={<Navigate to="/tecnico/dashboard" replace />} />
            <Route path="reportes" element={<Reportes />} />
          </Route>
        </Route>

        {/* ── Rutas del Docente ── */}
        <Route element={<RequireAuth allowedRoles={['docente']} />}>
          <Route path="/docente" element={<DocenteLayout />}>
            <Route index element={<Navigate to="/docente/dashboard" replace />} />
            <Route path="dashboard" element={<DocenteDashboard />} />
            <Route path="horarios" element={<Horarios />} />
            <Route path="estructura-academica" element={<EstructuraAcademica />} />
            <Route path="academico" element={<Navigate to="/docente/estructura-academica" replace />} />
            <Route path="solicitudes" element={<Navigate to="/docente/dashboard" replace />} />
            <Route path="prestamos" element={<Navigate to="/docente/dashboard" replace />} />
            <Route path="recursos" element={<Navigate to="/docente/dashboard" replace />} />
            <Route path="formatos" element={<Navigate to="/docente/dashboard" replace />} />
            {ASISTENTE_VISIBLE && <Route path="asistente" element={<Asistente />} />}
            <Route path="reportes" element={<Reportes />} />
          </Route>
        </Route>

        {/* ── Rutas de Autoridad (Decano, Subdecano, Coordinador) ──
            Solo consulta: las cuatro pantallas son las mismas de admin, pero el layout les pasa
            `soloLectura` por el contexto del Outlet. Que no puedan escribir lo garantiza la RLS
            de la migración 0052, no estas rutas. */}
        <Route element={<RequireAuth allowedRoles={['decano', 'subdecano', 'coordinador']} />}>
          <Route path="/autoridad" element={<AutoridadLayout />}>
            <Route index element={<Navigate to="/autoridad/dashboard" replace />} />
            <Route path="dashboard" element={<AutoridadDashboard />} />
            <Route path="horarios" element={<Horarios />} />
            <Route path="infraestructura" element={<Infraestructura />} />
            <Route path="estructura-academica" element={<EstructuraAcademica />} />
            <Route path="academico" element={<Navigate to="/autoridad/estructura-academica" replace />} />
            <Route path="reportes" element={<Reportes />} />
          </Route>
        </Route>

        {/* ── Rutas del Administrativo ── */}
        <Route element={<RequireAuth allowedRoles={['administrativo']} />}>
          <Route path="/administrativo" element={<AdministrativoLayout />}>
            <Route index element={<Navigate to="/administrativo/dashboard" replace />} />
            <Route path="dashboard" element={<AutoridadDashboard />} />
            <Route path="horarios" element={<Horarios />} />
            <Route path="infraestructura" element={<Infraestructura />} />
            <Route path="estructura-academica" element={<EstructuraAcademica />} />
            <Route path="academico" element={<Navigate to="/administrativo/estructura-academica" replace />} />
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
