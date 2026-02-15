'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import * as THREE from 'three';
import { generateDots, type DotData } from '@/lib/data';
import { dotVertexShader, dotFragmentShader } from '@/lib/shaders';
import { usePhysics } from '@/hooks/usePhysics';
import { useCamera } from '@/hooks/useCamera';
import DotTooltip from './DotTooltip';

export default function Galaxy() {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const pointsRef = useRef<THREE.Points | null>(null);
  const geometryRef = useRef<THREE.BufferGeometry | null>(null);
  const lineSegRef = useRef<THREE.LineSegments | null>(null);
  const clockRef = useRef(new THREE.Clock());
  const grabIndexRef = useRef(-1);
  const hoveredIndexRef = useRef(-1);
  const isDraggingRef = useRef(false);
  const raycasterRef = useRef(new THREE.Raycaster());
  const mouseVecRef = useRef(new THREE.Vector2());
  const tapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchDist0Ref = useRef(0);
  const frameRef = useRef(0);

  const [dotCount, setDotCount] = useState(0);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; name: string; line: string; color: string } | null>(null);
  const [selectedDot, setSelectedDot] = useState<DotData | null>(null);

  const physics = usePhysics();
  const cam = useCamera();

  // set raycaster threshold
  raycasterRef.current.params.Points!.threshold = 3;

  const buildLines = useCallback(() => {
    const scene = sceneRef.current;
    const dots = physics.dotsRef.current;
    if (!scene) return;

    // remove old lines
    if (lineSegRef.current) {
      scene.remove(lineSegRef.current);
      lineSegRef.current.geometry.dispose();
    }

    const positions: number[] = [];
    const colors: number[] = [];

    dots.forEach((d) => {
      d.friends.forEach((fi) => {
        if (fi >= dots.length) return;
        const f = dots[fi];
        positions.push(d.px, d.py, d.pz, f.px, f.py, f.pz);
        const c1 = new THREE.Color(d.color);
        const c2 = new THREE.Color(f.color);
        colors.push(c1.r, c1.g, c1.b, c2.r, c2.g, c2.b);
      });
    });

    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    lineGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    const lineMat = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.06,
    });

    lineSegRef.current = new THREE.LineSegments(lineGeo, lineMat);
    scene.add(lineSegRef.current);
  }, [physics.dotsRef]);

  const updateLines = useCallback(() => {
    if (!lineSegRef.current) return;
    const dots = physics.dotsRef.current;
    const arr = lineSegRef.current.geometry.attributes.position.array as Float32Array;
    let idx = 0;
    dots.forEach((d) => {
      d.friends.forEach((fi) => {
        if (fi >= dots.length) return;
        const f = dots[fi];
        arr[idx++] = d.px; arr[idx++] = d.py; arr[idx++] = d.pz;
        arr[idx++] = f.px; arr[idx++] = f.py; arr[idx++] = f.pz;
      });
    });
    lineSegRef.current.geometry.attributes.position.needsUpdate = true;
  }, [physics.dotsRef]);

  const updateRaycast = useCallback((clientX: number, clientY: number): number => {
    const camera = cameraRef.current;
    const points = pointsRef.current;
    if (!camera || !points) return -1;

    mouseVecRef.current.x = (clientX / window.innerWidth) * 2 - 1;
    mouseVecRef.current.y = -(clientY / window.innerHeight) * 2 + 1;

    raycasterRef.current.setFromCamera(mouseVecRef.current, camera);
    const hits = raycasterRef.current.intersectObject(points);

    if (hits.length > 0 && grabIndexRef.current < 0) {
      const idx = hits[0].index ?? -1;
      if (idx >= 0 && idx < physics.dotsRef.current.length) {
        hoveredIndexRef.current = idx;
        return idx;
      }
    }
    hoveredIndexRef.current = -1;
    return -1;
  }, [physics.dotsRef]);

  const projectToWorld = useCallback((clientX: number, clientY: number, atZ: number) => {
    const camera = cameraRef.current;
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
  }, []);

  // initialize scene
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // camera
    const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 1200);
    camera.position.set(0, 0, 180);
    cameraRef.current = camera;

    // renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x030305);
    rendererRef.current = renderer;
    container.appendChild(renderer.domElement);
    const canvas = renderer.domElement;
    canvas.style.cursor = 'grab';

    // background stars
    const starPositions = new Float32Array(4000 * 3);
    for (let i = 0; i < starPositions.length; i++) {
      starPositions[i] = (Math.random() - 0.5) * 800;
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({
      color: 0x222233,
      size: 0.25,
      sizeAttenuation: true,
    })));

    // generate dots
    const dots = generateDots(250);
    physics.setDots(dots);

    // dot buffers
    const N = dots.length;
    const positions = new Float32Array(N * 3);
    const colors = new Float32Array(N * 3);
    const sizes = new Float32Array(N);

    for (let i = 0; i < N; i++) {
      positions[i * 3] = dots[i].px;
      positions[i * 3 + 1] = dots[i].py;
      positions[i * 3 + 2] = dots[i].pz;
      const c = new THREE.Color(dots[i].color);
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
      sizes[i] = 2.8 + Math.random() * 1.8;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geometryRef.current = geo;

    const mat = new THREE.ShaderMaterial({
      vertexShader: dotVertexShader,
      fragmentShader: dotFragmentShader,
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const points = new THREE.Points(geo, mat);
    pointsRef.current = points;
    scene.add(points);

    // build connection lines
    buildLines();

    // animate count
    let count = 0;
    const countUp = () => {
      if (count < dots.length) {
        count = Math.min(count + 4, dots.length);
        setDotCount(count);
        requestAnimationFrame(countUp);
      }
    };
    setTimeout(countUp, 600);

    // animation loop
    const loop = () => {
      frameRef.current = requestAnimationFrame(loop);
      const t = clockRef.current.getElapsedTime();

      // update camera
      cam.update();
      const z = cam.zoomRef.current;
      const rx = cam.rotXRef.current;
      const ry = cam.rotYRef.current;
      camera.position.x = z * Math.sin(ry) * Math.cos(rx);
      camera.position.y = z * Math.sin(rx);
      camera.position.z = z * Math.cos(ry) * Math.cos(rx);
      camera.lookAt(0, 0, 0);

      // update physics
      physics.step();

      // sync buffers
      const posArr = geo.attributes.position.array as Float32Array;
      const sizeArr = geo.attributes.size.array as Float32Array;
      const currentDots = physics.dotsRef.current;
      for (let i = 0; i < currentDots.length && i * 3 + 2 < posArr.length; i++) {
        posArr[i * 3] = currentDots[i].px;
        posArr[i * 3 + 1] = currentDots[i].py;
        posArr[i * 3 + 2] = currentDots[i].pz;
        sizeArr[i] = 2.8 + Math.sin(t * 0.7 + i * 1.1) * 0.5;
        if (i === grabIndexRef.current) sizeArr[i] = 5.0;
      }
      geo.attributes.position.needsUpdate = true;
      geo.attributes.size.needsUpdate = true;

      updateLines();
      renderer.render(scene, camera);
    };
    loop();

    // resize handler
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    // --- MOUSE EVENTS ---
    const onMouseDown = (e: MouseEvent) => {
      const idx = updateRaycast(e.clientX, e.clientY);
      if (idx >= 0) {
        grabIndexRef.current = idx;
        physics.grabDot(idx);
        canvas.style.cursor = 'grabbing';
        return;
      }
      isDraggingRef.current = true;
      cam.startDrag(e.clientX, e.clientY);
      canvas.style.cursor = 'grabbing';
    };

    const onMouseMove = (e: MouseEvent) => {
      if (grabIndexRef.current >= 0) {
        const d = physics.dotsRef.current[grabIndexRef.current];
        const worldPos = projectToWorld(e.clientX, e.clientY, d.pz);
        if (worldPos) {
          physics.moveDot(grabIndexRef.current, worldPos.x, worldPos.y, worldPos.z);
        }
        setTooltip(null);
        return;
      }
      if (isDraggingRef.current) {
        cam.updateDrag(e.clientX, e.clientY);
        return;
      }
      const idx = updateRaycast(e.clientX, e.clientY);
      if (idx >= 0) {
        const d = physics.dotsRef.current[idx];
        setTooltip({ x: e.clientX + 18, y: e.clientY - 10, name: d.name, line: d.line, color: d.color });
        canvas.style.cursor = 'pointer';
      } else {
        setTooltip(null);
        canvas.style.cursor = isDraggingRef.current ? 'grabbing' : 'grab';
      }
    };

    const onMouseUp = () => {
      if (grabIndexRef.current >= 0) {
        physics.releaseDot(grabIndexRef.current);
        grabIndexRef.current = -1;
        canvas.style.cursor = 'grab';
        return;
      }
      isDraggingRef.current = false;
      cam.endDrag();
      canvas.style.cursor = 'grab';
    };

    const onClick = (e: MouseEvent) => {
      if (isDraggingRef.current) return;
      const idx = updateRaycast(e.clientX, e.clientY);
      if (idx >= 0) {
        setSelectedDot({ ...physics.dotsRef.current[idx] });
      }
    };

    const onDblClick = (e: MouseEvent) => {
      if (physics.gravityRef.current) {
        physics.setGravityPoint(null);
        return;
      }
      const v = new THREE.Vector3(
        (e.clientX / window.innerWidth) * 2 - 1,
        -(e.clientY / window.innerHeight) * 2 + 1,
        0.5
      );
      v.unproject(camera);
      v.sub(camera.position).normalize();
      const t = -camera.position.z / v.z;
      physics.setGravityPoint({
        x: camera.position.x + v.x * t,
        y: camera.position.y + v.y * t,
        z: 0,
      });
    };

    const onWheel = (e: WheelEvent) => {
      cam.setZoom(e.deltaY * 0.1);
    };

    // --- TOUCH EVENTS ---
    const onTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      if (e.touches.length === 1) {
        const tx = e.touches[0].clientX;
        const ty = e.touches[0].clientY;
        const idx = updateRaycast(tx, ty);
        if (idx >= 0) {
          grabIndexRef.current = idx;
          physics.grabDot(idx);
          return;
        }
        isDraggingRef.current = true;
        cam.startDrag(tx, ty);
        // double-tap scatter
        if (tapTimerRef.current) {
          clearTimeout(tapTimerRef.current);
          tapTimerRef.current = null;
          physics.scatter();
        } else {
          tapTimerRef.current = setTimeout(() => { tapTimerRef.current = null; }, 300);
        }
      } else if (e.touches.length === 2) {
        isDraggingRef.current = false;
        touchDist0Ref.current = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      if (e.touches.length === 1) {
        const tx = e.touches[0].clientX;
        const ty = e.touches[0].clientY;
        if (grabIndexRef.current >= 0) {
          const d = physics.dotsRef.current[grabIndexRef.current];
          const worldPos = projectToWorld(tx, ty, d.pz);
          if (worldPos) {
            physics.moveDot(grabIndexRef.current, worldPos.x, worldPos.y, worldPos.z);
          }
          return;
        }
        if (isDraggingRef.current) {
          cam.updateDrag(tx, ty, 0.004);
        }
      } else if (e.touches.length === 2) {
        const d = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        cam.setZoom((touchDist0Ref.current - d) * 0.2);
        touchDist0Ref.current = d;
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      if (grabIndexRef.current >= 0) {
        physics.releaseDot(grabIndexRef.current);
        grabIndexRef.current = -1;
      }
      isDraggingRef.current = false;
      cam.endDrag();
    };

    // --- KEYBOARD ---
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'INPUT') return;
      if (e.code === 'Space') {
        e.preventDefault();
        physics.scatter();
      }
      if (e.code === 'KeyR') {
        physics.resetAll();
        cam.reset();
      }
      if (e.code === 'Escape') {
        physics.setGravityPoint(null);
        setSelectedDot(null);
      }
    };

    canvas.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('click', onClick);
    canvas.addEventListener('dblclick', onDblClick);
    canvas.addEventListener('wheel', onWheel, { passive: true });
    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    canvas.addEventListener('touchend', onTouchEnd, { passive: false });
    document.addEventListener('keydown', onKeyDown);

    return () => {
      cancelAnimationFrame(frameRef.current);
      canvas.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      canvas.removeEventListener('click', onClick);
      canvas.removeEventListener('dblclick', onDblClick);
      canvas.removeEventListener('wheel', onWheel);
      canvas.removeEventListener('touchstart', onTouchStart);
      canvas.removeEventListener('touchmove', onTouchMove);
      canvas.removeEventListener('touchend', onTouchEnd);
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogoClick = useCallback(() => {
    physics.resetAll();
    cam.reset();
    setSelectedDot(null);
  }, [physics, cam]);

  return (
    <>
      <div ref={containerRef} className="fixed inset-0 z-[1]" style={{ touchAction: 'none' }} />

      {/* Logo */}
      <div
        className="fixed top-7 left-7 z-20 cursor-pointer max-sm:top-4 max-sm:left-4"
        onClick={handleLogoClick}
      >
        <span className="font-serif text-[22px] max-sm:text-[18px] italic text-white/60 tracking-tight">
          my dot<span className="text-[#55556a] not-italic font-extralight">.</span>
        </span>
      </div>

      {/* Dot count */}
      <div className="fixed top-8 right-7 z-20 text-[10px] max-sm:top-5 max-sm:right-4 max-sm:text-[9px] tracking-[2px] text-[#55556a] font-light text-right leading-relaxed">
        <span className="text-[#d0d0dd] font-normal">{dotCount}</span> dots
      </div>

      {/* Hint text */}
      <div className="fixed bottom-[100px] max-sm:bottom-[76px] left-1/2 -translate-x-1/2 z-[15] text-[11px] max-sm:text-[9px] text-[#55556a] tracking-[1.5px] font-light text-center pointer-events-none animate-fadeHint">
        drag to orbit · scroll to zoom · click a dot · spacebar to scatter
      </div>

      {/* Tooltip */}
      <DotTooltip tooltip={tooltip} />

      {/* Selected dot card preview - placeholder for Phase 2 */}
      {selectedDot && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-[rgba(3,3,5,0.88)] backdrop-blur-[40px]"
          onClick={() => setSelectedDot(null)}
        >
          <div
            className="w-[min(380px,88vw)] bg-[#0a0a10] border border-[#1a1a24] rounded-3xl p-10 max-sm:p-7 relative animate-slideUp"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="absolute top-4 right-5 text-lg text-[#55556a] hover:text-[#d0d0dd] bg-transparent border-none cursor-pointer font-sans"
              onClick={() => setSelectedDot(null)}
            >
              ×
            </button>
            <div className="font-serif text-[38px] max-sm:text-[30px] italic text-white tracking-tight mb-2">
              {selectedDot.name}
            </div>
            <div className="text-sm text-white/45 font-light leading-relaxed mb-auto max-w-[280px]">
              {selectedDot.line}
            </div>
            <div className="flex justify-between mt-5 pt-3.5 border-t border-white/5">
              <div className="text-[9px] tracking-[2px] uppercase text-white/15 font-light">
                {selectedDot.vibe}
              </div>
              <div className="font-serif italic text-[11px] text-white/12">
                my dot.
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
