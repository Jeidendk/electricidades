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
  isOpenRef.current = isOpen;
  onCloseRef.current = onClose;

  useEffect(() => {
    const handleModalOpen = (event: Event) => {
      const openedModalId = (event as CustomEvent<ModalEventDetail>).detail?.id;
      if (isOpenRef.current && openedModalId && openedModalId !== id) {
        onCloseRef.current();
      }
    };

    window.addEventListener(MODAL_OPEN_EVENT, handleModalOpen);
    return () => window.removeEventListener(MODAL_OPEN_EVENT, handleModalOpen);
  }, [id]);

  useLayoutEffect(() => {
    if (!isOpen) return;
    window.dispatchEvent(
      new CustomEvent<ModalEventDetail>(MODAL_OPEN_EVENT, {
        detail: { id },
      }),
    );
  }, [id, isOpen]);
};
