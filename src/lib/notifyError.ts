// Aviso estándar cuando una operación de guardado/borrado falla en un store.
// Antes estos errores morían en console.error y el admin creía que la operación
// se había completado (bug repetido en facultades, inventario y sellos).
export const notifyStoreError = (context: string, err: any) => {
  console.error(context, err);
  import('sweetalert2').then(S => S.default.fire({
    icon: 'error',
    title: 'No se pudo completar la operación',
    text: err?.message || 'Error desconocido.',
    confirmButtonColor: '#b00000',
  }));
};
