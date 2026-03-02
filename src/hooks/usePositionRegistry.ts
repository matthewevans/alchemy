import { useRef, useLayoutEffect } from 'react';
import { registerPosition, unregisterPosition } from '@game/animationStore';

export function usePositionRegistry(id: string | null): React.RefObject<HTMLDivElement | null> {
  const ref = useRef<HTMLDivElement | null>(null);
  // Unique token per mount — prevents AnimatePresence exit cleanup
  // from removing a position that a newly-mounted sibling registered.
  const tokenRef = useRef<object>({});

  useLayoutEffect(() => {
    if (!id || !ref.current) return;

    const element = ref.current;
    const token = tokenRef.current;

    const updatePosition = () => {
      const rect = element.getBoundingClientRect();
      registerPosition(id, {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
      }, token);
    };

    updatePosition();

    const observer = new ResizeObserver(updatePosition);
    observer.observe(element);

    return () => {
      observer.disconnect();
      unregisterPosition(id, token);
    };
  }, [id]);

  return ref;
}
