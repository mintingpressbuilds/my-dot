import { useRef, useCallback } from 'react';

export function useCamera() {
  const rotXRef = useRef(0);
  const rotYRef = useRef(0);
  const targetXRef = useRef(0);
  const targetYRef = useRef(0);
  const zoomRef = useRef(180);
  const targetZoomRef = useRef(180);
  const autoRotateRef = useRef(true);
  const draggingRef = useRef(false);
  const lastXRef = useRef(0);
  const lastYRef = useRef(0);

  // momentum
  const dragVelXRef = useRef(0);
  const dragVelYRef = useRef(0);
  const lastDragTimeRef = useRef(0);
  const dragEndTimeRef = useRef(0);

  const startDrag = useCallback((x: number, y: number) => {
    draggingRef.current = true;
    autoRotateRef.current = false;
    lastXRef.current = x;
    lastYRef.current = y;
    lastDragTimeRef.current = performance.now();
    dragVelXRef.current = 0;
    dragVelYRef.current = 0;
  }, []);

  const updateDrag = useCallback((x: number, y: number, sensitivity = 0.003) => {
    if (!draggingRef.current) return;
    const now = performance.now();
    const dt = now - lastDragTimeRef.current;
    if (dt > 0) {
      dragVelXRef.current = (x - lastXRef.current) / dt * 16;
      dragVelYRef.current = (y - lastYRef.current) / dt * 16;
    }
    lastDragTimeRef.current = now;
    targetYRef.current += (x - lastXRef.current) * sensitivity;
    targetXRef.current += (y - lastYRef.current) * sensitivity;
    targetXRef.current = Math.max(-1.4, Math.min(1.4, targetXRef.current));
    lastXRef.current = x;
    lastYRef.current = y;
  }, []);

  const endDrag = useCallback(() => {
    draggingRef.current = false;
    dragEndTimeRef.current = performance.now();
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
    dragVelXRef.current = 0;
    dragVelYRef.current = 0;
  }, []);

  const update = useCallback(() => {
    // momentum when not dragging
    if (!draggingRef.current && (Math.abs(dragVelXRef.current) > 0.0001 || Math.abs(dragVelYRef.current) > 0.0001)) {
      targetYRef.current += dragVelXRef.current * 0.003;
      targetXRef.current += dragVelYRef.current * 0.003;
      targetXRef.current = Math.max(-1.4, Math.min(1.4, targetXRef.current));
      dragVelXRef.current *= 0.96;
      dragVelYRef.current *= 0.96;
    }

    // resume auto-rotate 5 seconds after momentum dies
    if (!draggingRef.current && !autoRotateRef.current && dragEndTimeRef.current > 0) {
      if (performance.now() - dragEndTimeRef.current > 5000 &&
          Math.abs(dragVelXRef.current) < 0.0001 && Math.abs(dragVelYRef.current) < 0.0001) {
        autoRotateRef.current = true;
      }
    }

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
