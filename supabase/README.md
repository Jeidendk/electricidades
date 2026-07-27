# Supabase — RLS y tipos

## 1. Aplicar las políticas RLS

El archivo [`migrations/0001_rls_policies.sql`](migrations/0001_rls_policies.sql) activa Row Level Security por rol en las 19 tablas. **Revísalo antes de aplicar** (ver los supuestos y el bloque `TODO verificar` al final).

```bash
# Opción A — Supabase CLI (recomendado)
supabase link --project-ref <TU_PROJECT_REF>
supabase db push

# Opción B — Panel web
# Copiar el contenido del .sql en  SQL Editor → Run
```

Tras aplicar, prueba con un usuario de cada rol que:
- el estudiante solo ve sus propias `solicitudes_equipo`/`prestamos`,
- el técnico ve las órdenes asignadas a él,
- el admin ve todo.

## 2. Regenerar los tipos TypeScript (en vez de mantenerlos a mano)

`src/lib/database.types.ts` está escrito a mano y se desincroniza del esquema. Regéneralo desde la BD real:

```bash
# Requiere CLI logueado: supabase login
supabase gen types typescript --project-id <TU_PROJECT_REF> --schema public > src/lib/database.types.ts

# Local con Docker:
# supabase gen types typescript --local > src/lib/database.types.ts
```

Luego cambia el cliente a tipado fuerte en `src/lib/supabase.ts`:

```ts
import type { Database } from './database.types';
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
```

> Hecho ya en esta iteración: se corrigió a mano el bug de `id` requerido en los `Insert`. Al regenerar con la CLI, ese y otros desajustes desaparecen solos.
