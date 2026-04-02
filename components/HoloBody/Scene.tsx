"use client";
import { useRef, useMemo, useEffect, useCallback } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import {
  EffectComposer,
  Bloom,
  ChromaticAberration,
  Vignette,
} from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import * as THREE from "three";
import { HOTSPOTS, DEFAULT_FLAGGED } from "./hotspots";
import type { Hotspot } from "./types";

const BODY_SPECS = [
  {
    geo: () => new THREE.SphereGeometry(0.21, 16, 12),
    pos: [0, 1.07, 0] as [number, number, number],
    rz: 0,
  },
  {
    geo: () => new THREE.CylinderGeometry(0.08, 0.1, 0.18, 8),
    pos: [0, 0.87, 0] as [number, number, number],
    rz: 0,
  },
  {
    geo: () => new THREE.CylinderGeometry(0.28, 0.24, 0.55, 12),
    pos: [0, 0.52, 0] as [number, number, number],
    rz: 0,
  },
  {
    geo: () => new THREE.CylinderGeometry(0.22, 0.2, 0.38, 12),
    pos: [0, 0.12, 0] as [number, number, number],
    rz: 0,
  },
  {
    geo: () => new THREE.CylinderGeometry(0.22, 0.18, 0.22, 10),
    pos: [0, -0.14, 0] as [number, number, number],
    rz: 0,
  },
  {
    geo: () => new THREE.CylinderGeometry(0.075, 0.065, 0.52, 8),
    pos: [-0.4, 0.6, 0] as [number, number, number],
    rz: 0.28,
  },
  {
    geo: () => new THREE.CylinderGeometry(0.075, 0.065, 0.52, 8),
    pos: [0.4, 0.6, 0] as [number, number, number],
    rz: -0.28,
  },
  {
    geo: () => new THREE.CylinderGeometry(0.055, 0.045, 0.46, 8),
    pos: [-0.52, 0.25, 0] as [number, number, number],
    rz: 0.18,
  },
  {
    geo: () => new THREE.CylinderGeometry(0.055, 0.045, 0.46, 8),
    pos: [0.52, 0.25, 0] as [number, number, number],
    rz: -0.18,
  },
  {
    geo: () => new THREE.CylinderGeometry(0.11, 0.09, 0.52, 10),
    pos: [-0.14, -0.44, 0] as [number, number, number],
    rz: 0.04,
  },
  {
    geo: () => new THREE.CylinderGeometry(0.11, 0.09, 0.52, 10),
    pos: [0.14, -0.44, 0] as [number, number, number],
    rz: -0.04,
  },
  {
    geo: () => new THREE.CylinderGeometry(0.08, 0.065, 0.48, 10),
    pos: [-0.14, -0.92, 0] as [number, number, number],
    rz: 0.02,
  },
  {
    geo: () => new THREE.CylinderGeometry(0.08, 0.065, 0.48, 10),
    pos: [0.14, -0.92, 0] as [number, number, number],
    rz: -0.02,
  },
];

// ── Hotspot Node ──────────────────────────────────────────────────────────────
function HotspotNode({
  hotspot,
  index,
  isFlagged,
  reduceMotion,
  onHover,
  onClick,
}: {
  hotspot: Hotspot;
  index: number;
  isFlagged: boolean;
  reduceMotion: boolean;
  onHover: (id: string | null) => void;
  onClick: (h: Hotspot, pos: { x: number; y: number }) => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const matRef = useRef<THREE.MeshBasicMaterial>(null!);
  const { gl, camera } = useThree();
  const lastFlicker = useRef(0);
  const phase = index * 0.73;
  // Detect touch vs pointer device once on mount
  const isTouchDevice = useRef(
    typeof window !== "undefined"
      ? window.matchMedia("(pointer: coarse)").matches
      : false,
  );

  useFrame((state) => {
    if (!meshRef.current || !matRef.current || reduceMotion) return;
    const t = state.clock.elapsedTime;
    if (isFlagged) {
      if (t - lastFlicker.current > 0.12) {
        matRef.current.opacity = 0.4 + Math.random() * 0.6;
        lastFlicker.current = t;
      }
    } else {
      const s = Math.sin(t * 2.6 + phase) * 0.18 + 1.0;
      meshRef.current.scale.setScalar(s);
      matRef.current.opacity = 0.7 + Math.sin(t * 2.6 + phase) * 0.3;
    }
  });

  const handleClick = useCallback(
    (e: THREE.Event) => {
      (e as unknown as { stopPropagation: () => void }).stopPropagation();
      const vec = new THREE.Vector3(...hotspot.pos);
      vec.project(camera);
      onClick(hotspot, {
        x: (vec.x * 0.5 + 0.5) * gl.domElement.clientWidth,
        y: (-vec.y * 0.5 + 0.5) * gl.domElement.clientHeight,
      });
    },
    [camera, gl, hotspot, onClick],
  );

  return (
    <mesh
      ref={meshRef}
      position={hotspot.pos}
      onPointerOver={() => {
        document.body.style.cursor = "pointer";
        onHover(hotspot.id);
      }}
      onPointerOut={() => {
        document.body.style.cursor = "auto";
        onHover(null);
      }}
      onClick={isTouchDevice.current ? undefined : handleClick}
      onPointerDown={isTouchDevice.current ? handleClick : undefined}
    >
      <sphereGeometry args={[0.038, 8, 6]} />
      <meshBasicMaterial
        ref={matRef}
        color={isFlagged ? 0xffb800 : 0x00d4ff}
        transparent
        opacity={0.85}
        depthWrite={false}
      />
    </mesh>
  );
}

// ── Main Scene ────────────────────────────────────────────────────────────────
export default function Scene({
  flaggedOrgans = DEFAULT_FLAGGED,
  reduceMotion = false,
  onHotspotClick,
  onHotspotHover,
}: {
  flaggedOrgans: string[];
  reduceMotion: boolean;
  onHotspotClick: (h: Hotspot, pos: { x: number; y: number }) => void;
  onHotspotHover: (id: string | null) => void;
}) {
  const bodyRef = useRef<THREE.Group>(null!);
  const scanRef = useRef(-0.1);
  const scanMeshRef = useRef<THREE.Mesh>(null!);
  const frameCount = useRef(0);
  const lastSecond = useRef(Date.now());

  // ── ALL materials in useMemo — never recreate on render ──────────────────
  const mats = useMemo(
    () => ({
      fill: new THREE.MeshBasicMaterial({
        color: 0x00d4ff,
        transparent: true,
        opacity: 0.04,
        depthWrite: false,
      }),
      edge: new THREE.LineBasicMaterial({
        color: 0x00d4ff,
        transparent: true,
        opacity: 0.55,
      }),
      scan: new THREE.MeshBasicMaterial({
        color: 0x00d4ff,
        transparent: true,
        opacity: 0.22,
        depthWrite: false,
      }),
      point: new THREE.PointsMaterial({
        size: 0.007,
        color: 0x00d4ff,
        transparent: true,
        opacity: 0.22,
        sizeAttenuation: true,
      }),
    }),
    [],
  );

  // ── Body geometries in useMemo ─────────────────────────────────────────────
  const bodyParts = useMemo(
    () =>
      BODY_SPECS.map((s) => {
        const geo = s.geo();
        const edgeGeo = new THREE.EdgesGeometry(geo, 15);
        return { geo, edgeGeo, pos: s.pos, rz: s.rz };
      }),
    [],
  );

  // ── Particles in useMemo ────────────────────────────────────────────────────
  const particlePositions = useMemo(() => {
    const arr = new Float32Array(120 * 3);
    for (let i = 0; i < 120; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 1.5 + Math.random() * 0.9;
      arr[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      arr[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      arr[i * 3 + 2] = r * Math.cos(phi);
    }
    return arr;
  }, []);

  // ── Dispose all on unmount ─────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      Object.values(mats).forEach((m) => m.dispose());
      bodyParts.forEach(({ geo, edgeGeo }) => {
        geo.dispose();
        edgeGeo.dispose();
      });
    };
  }, [mats, bodyParts]);

  useFrame((_, delta) => {
    // FPS monitoring
    frameCount.current++;
    const now = Date.now();
    if (now - lastSecond.current > 2000) {
      const fps = frameCount.current / 2;
      if (fps < 30 && mats.point.size > 0.003) {
        mats.point.size = 0.003; // reduce particle quality on low-fps devices
      }
      frameCount.current = 0;
      lastSecond.current = now;
    }

    if (!bodyRef.current || reduceMotion) return;
    bodyRef.current.rotation.y += 0.003 * delta * 60;

    scanRef.current += delta / 4.0;
    if (scanRef.current > 1) scanRef.current = -0.1;
    if (scanMeshRef.current) {
      scanMeshRef.current.position.y = scanRef.current * 2.4 - 1.0;
    }
  });

  return (
    <>
      <ambientLight intensity={0.1} />

      <group ref={bodyRef}>
        {bodyParts.map(({ geo, edgeGeo, pos, rz }, i) => (
          <group key={i} position={pos} rotation={[0, 0, rz]}>
            <mesh geometry={geo} material={mats.fill} />
            <lineSegments geometry={edgeGeo} material={mats.edge} />
          </group>
        ))}
        {!reduceMotion && (
          <mesh ref={scanMeshRef} material={mats.scan}>
            <planeGeometry args={[1.2, 0.008]} />
          </mesh>
        )}
      </group>

      {HOTSPOTS.map((h, i) => (
        <HotspotNode
          key={h.id}
          hotspot={h}
          index={i}
          isFlagged={flaggedOrgans.includes(h.id)}
          reduceMotion={reduceMotion}
          onHover={onHotspotHover}
          onClick={onHotspotClick}
        />
      ))}

      <points>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[particlePositions, 3]}
          />
        </bufferGeometry>
        <primitive object={mats.point} attach="material" />
      </points>

      <EffectComposer>
        <Bloom
          intensity={0.85}
          luminanceThreshold={0.12}
          luminanceSmoothing={0.35}
          blendFunction={BlendFunction.ADD}
        />
        <ChromaticAberration
          offset={new THREE.Vector2(0.0004, 0.0003)}
          blendFunction={BlendFunction.NORMAL}
        />
        <Vignette
          darkness={0.62}
          offset={0.4}
          blendFunction={BlendFunction.NORMAL}
        />
      </EffectComposer>
    </>
  );
}
