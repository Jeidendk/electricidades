import React, { useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { AppRouter } from './router';
import { useAuthStore } from './store/authStore';
import { esErrorDeVersionVieja, recargarUnaVez } from './lib/recargaPorDespliegue';
import './index.css';

// Vite avisa por su cuenta cuando falla la precarga de un módulo. Suele ser el mismo caso:
// la pestaña quedó con la versión anterior tras un despliegue.
window.addEventListener('vite:preloadError', (evento) => {
  if (recargarUnaVez()) evento.preventDefault();
});

/**
 * Pantalla de error. Distingue el caso frecuente —la pestaña quedó con una versión vieja tras
 * un despliegue— del error de verdad, porque la salida es distinta: el primero se arregla
 * recargando y el segundo hay que reportarlo.
 *
 * Antes esto pintaba el stack crudo en rojo sobre la página en blanco, que al usuario no le
 * dice nada y parece que el sistema se rompió del todo.
 */
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { error: Error | null }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    // Última red: si llegó hasta aquí siendo un chunk viejo, recargar una sola vez.
    if (esErrorDeVersionVieja(error)) recargarUnaVez();
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    const esVersionVieja = esErrorDeVersionVieja(error);

    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: 'system-ui, sans-serif', background: '#f4f7fb' }}>
        <div style={{ maxWidth: 460, width: '100%', background: '#fff', borderRadius: 20, padding: 32, boxShadow: '0 20px 50px rgba(0,0,0,.08)', textAlign: 'center' }}>
          <h1 style={{ fontSize: 19, fontWeight: 800, color: '#111827', margin: '0 0 8px' }}>
            {esVersionVieja ? 'Hay una versión nueva del sistema' : 'Algo salió mal'}
          </h1>
          <p style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.6, margin: '0 0 20px' }}>
            {esVersionVieja
              ? 'Tu pestaña estaba abierta desde antes de la última actualización. Recarga para continuar; no se pierde nada de lo guardado.'
              : 'No se pudo mostrar esta pantalla. Recarga la página; si vuelve a ocurrir, avisa al administrador con el detalle de abajo.'}
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{ background: '#B00020', color: '#fff', border: 0, borderRadius: 12, padding: '12px 28px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
          >
            Recargar
          </button>
          {!esVersionVieja && (
            <details style={{ marginTop: 20, textAlign: 'left' }}>
              <summary style={{ fontSize: 11, color: '#9ca3af', cursor: 'pointer' }}>Detalle técnico</summary>
              <pre style={{ fontSize: 10, color: '#6b7280', whiteSpace: 'pre-wrap', wordBreak: 'break-word', marginTop: 8 }}>
                {error.message}
              </pre>
            </details>
          )}
        </div>
      </div>
    );
  }
}

/** Inicializa el listener de Supabase Auth una sola vez al arrancar la app */
function AuthInit({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const unsubscribe = useAuthStore.getState().initAuth();
    return unsubscribe;
  }, []);
  return <>{children}</>;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <AuthInit>
      <AppRouter />
    </AuthInit>
  </ErrorBoundary>,
)
