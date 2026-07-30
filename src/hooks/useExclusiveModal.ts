import { useEffect, useLayoutEffect, useRef } from 'react';

const MODAL_OPEN_EVENT = 'espoch:modal-open';

interface ModalEventDetail {
  id: string;
}

/**
 * Coordina modales que viven en componentes distintos.
 * Al abrir uno, cualquier otro modal registrado se cierra.
 */
export const useExclusiveModal = (
  id: string,
  isOpen: boolean,
  onClose: () => void,
) => {
  const isOpenRef = useRef(isOpen);
  const onCloseRef = useRef(onClose);
  const idRef = useRef(id);
  isOpenRef.current = isOpen;
  onCloseRef.current = onClose;
  idRef.current = id;

  useEffect(() => {
    // El listener lee el id ACTUAL vía ref (no una copia capturada). Así, cuando el
    // propio modal cambia de id al abrirse (p.ej. "Editar" → "Nueva"), no interpreta
    // su propio evento de apertura como el de otro modal y no se cierra a sí mismo.
    const handleModalOpen = (event: Event) => {
      const openedModalId = (event as CustomEvent<ModalEventDetail>).detail?.id;
      if (isOpenRef.current && openedModalId && openedModalId !== idRef.current) {
        onCloseRef.current();
      }
    };

    window.addEventListener(MODAL_OPEN_EVENT, handleModalOpen);
    return () => window.removeEventListener(MODAL_OPEN_EVENT, handleModalOpen);
  }, []);

  useLayoutEffect(() => {
    if (!isOpen) return;
    window.dispatchEvent(
      new CustomEvent<ModalEventDetail>(MODAL_OPEN_EVENT, {
        detail: { id },
      }),
    );
  }, [id, isOpen]);
};
