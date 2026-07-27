// Confirmación destructiva estándar (SweetAlert2). Devuelve true si el usuario confirma.
export const confirmDelete = async ({ title, text = 'Esta acción no se puede deshacer.' }: { title: string; text?: string }): Promise<boolean> => {
  const Swal = (await import('sweetalert2')).default;
  const res = await Swal.fire({
    title,
    text,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#b00000',
    confirmButtonText: 'Eliminar',
    cancelButtonText: 'Cancelar',
  });
  return res.isConfirmed;
};
