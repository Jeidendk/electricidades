/**
 * Si el asistente se muestra o no.
 *
 * La fase 1 construyó la pantalla, pero no hay motor que responda: publicarla en producción
 * ofrecería a la facultad una función que todavía no hace su trabajo. Queda visible solo
 * mientras se desarrolla, y se abre cuando el motor exista quitando esta condición.
 *
 * `import.meta.env.DEV` es true con `npm run dev` y false en el paquete que despliega Vercel,
 * así que la pantalla no llega a producción ni siquiera escribiendo su URL: la ruta tampoco
 * se registra.
 */
export const ASISTENTE_VISIBLE = import.meta.env.DEV;
