import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// Limpia el DOM montado entre tests.
afterEach(() => cleanup());

// Mock global del cliente Supabase: los tests no deben tocar la red real.
// Cada test puede sobrescribir métodos concretos con vi.spyOn si lo necesita.
vi.mock('../lib/supabase', () => {
  const chain: any = {
    select: () => chain,
    insert: () => chain,
    update: () => chain,
    delete: () => chain,
    eq: () => chain,
    order: () => chain,
    single: () => Promise.resolve({ data: null, error: null }),
    then: (resolve: any) => resolve({ data: [], error: null }),
  };
  return {
    supabase: {
      from: () => chain,
      auth: {
        getSession: () => Promise.resolve({ data: { session: null }, error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
        signInWithPassword: () => Promise.resolve({ data: { session: null }, error: null }),
        signOut: () => Promise.resolve({ error: null }),
        mfa: {
          listFactors: () => Promise.resolve({ data: { totp: [] }, error: null }),
        },
      },
    },
  };
});
