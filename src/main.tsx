import React, { useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { AppRouter } from './router';
import { useAuthStore } from './store/authStore';
import './index.css';

window.addEventListener('error', (e) => {
  document.body.innerHTML = '<div style="padding: 20px; background: #fee; color: red; font-family: monospace; z-index: 99999; position: relative;"><h1>Runtime Error</h1><pre>' + e.error?.stack + '</pre></div>';
});

class ErrorBoundary extends React.Component<any, any> {
  constructor(props: any) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error: any) { return { hasError: true, error }; }
  render() {
    if (this.state.hasError) return <div style={{padding: '20px', color: 'red', zIndex: 9999, position: 'relative'}}><h1>React Error</h1><pre>{this.state.error?.stack}</pre></div>;
    return this.props.children;
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
