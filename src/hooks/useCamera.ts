import { useRef, useCallback } from 'react';

export function useCamera() {
  const rotXRef = useRef(0);       // current rotation X
  const rotYRef = useRef(0);       // current rotation Y
  const targetXRef = useRef(0);    // target rotation X
  const targetYRef = useRef(0);    // target rotation Y
  const zoomRef = useRef(180);     // current zoom
  const targetZoomRef = useRef(180);
  const autoRotateRef = useRef(true);
  const draggingRef = useRef(false);
  const lastXRef = useRef(0);
  const lastYRef = useRef(0);

  const startDrag = useCallback((x: number, y: number) => {
    draggingRef.current = true;
    autoRotateRef.current = false;
    lastXRef.current = x;
    lastYRef.current = y;
  }, []);

  const updateDrag = useCallback((x: number, y: number, sensitivity = 0.003) => {
    if (!draggingRef.current) return;
    targetYRef.current += (x - lastXRef.current) * sensitivity;
    targetXRef.current += (y - lastYRef.current) * sensitivity;
    targetXRef.current = Math.max(-1.4, Math.min(1.4, targetXRef.current));
    lastXRef.current = x;
    lastYRef.current = y;
  }, []);

  const endDrag = useCallback(() => {
    draggingRef.current = false;
  }, []);

  const setZoom = useCallback((delta: number) => {
    targetZoomRef.current += delta;
    targetZoomRef.current = Math.max(25, Math.min(350, targetZoomRef.current));
  }, []);

  const reset = useCallback(() => {
    targetXRef.current = 0;
    targetYRef.current = 0;
    targetZoomRef.current = 180;
    autoRotateRef.current = true;
  }, []);

  const update = useCallback(() => {
    if (autoRotateRef.current) {
      targetYRef.current += 0.0006;
    }
    rotXRef.current += (targetXRef.current - rotXRef.current) * 0.06;
    rotYRef.current += (targetYRef.current - rotYRef.current) * 0.06;
    zoomRef.current += (targetZoomRef.current - zoomRef.current) * 0.06;
  }, []);

  return {
    rotXRef,
    rotYRef,
    zoomRef,
    targetXRef,
    targetYRef,
    targetZoomRef,
    autoRotateRef,
    draggingRef,
    startDrag,
    updateDrag,
    endDrag,
    setZoom,
    reset,
    update,
  };
}
