import { useRef, useLayoutEffect } from 'react';
import { useAnimationStore } from '@game/animationStore';

export function usePositionRegistry(id: string | null): React.RefObject<HTMLDivElement | null> {
  const ref = useRef<HTMLDivElement | null>(null);
  const registerPosition = useAnimationStore((s) => s.registerPosition);
  const unregisterPosition = useAnimationStore((s) => s.unregisterPosition);

  useLayoutEffect(() => {
    if (!id || !ref.current) return;

    const element = ref.current;

    const updatePosition = () => {
      const rect = element.getBoundingClientRect();
      registerPosition(id, {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
      });
    };

    updatePosition();

    const observer = new ResizeObserver(updatePosition);
    observer.observe(element);

    return () => {
      observer.disconnect();
      unregisterPosition(id);
    };
  }, [id, registerPosition, unregisterPosition]);

  return ref;
}
