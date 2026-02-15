import { useRef, useCallback } from 'react';
import * as THREE from 'three';

export function useRaycast(camera: THREE.PerspectiveCamera | null, points: THREE.Points | null) {
  const raycasterRef = useRef(new THREE.Raycaster());
  const mouseRef = useRef(new THREE.Vector2());
  const hoveredRef = useRef(-1);

  // set threshold for point detection
  raycasterRef.current.params.Points!.threshold = 3;

  const update = useCallback((clientX: number, clientY: number): number => {
    if (!camera || !points) return -1;

    mouseRef.current.x = (clientX / window.innerWidth) * 2 - 1;
    mouseRef.current.y = -(clientY / window.innerHeight) * 2 + 1;

    raycasterRef.current.setFromCamera(mouseRef.current, camera);
    const intersects = raycasterRef.current.intersectObject(points);

    if (intersects.length > 0) {
      hoveredRef.current = intersects[0].index ?? -1;
    } else {
      hoveredRef.current = -1;
    }

    return hoveredRef.current;
  }, [camera, points]);

  const projectToWorld = useCallback((clientX: number, clientY: number, atZ: number): THREE.Vector3 | null => {
    if (!camera) return null;
    const v = new THREE.Vector3(
      (clientX / window.innerWidth) * 2 - 1,
      -(clientY / window.innerHeight) * 2 + 1,
      0.5
    );
    v.unproject(camera);
    const dir = v.sub(camera.position).normalize();
    const t = (atZ - camera.position.z) / dir.z;
    return new THREE.Vector3(
      camera.position.x + dir.x * t,
      camera.position.y + dir.y * t,
      atZ
    );
  }, [camera]);

  return {
    hoveredRef,
    update,
    projectToWorld,
    raycasterRef,
  };
}
