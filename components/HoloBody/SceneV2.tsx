"use client";
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface SceneProps {
  flaggedOrgans: string[];
  prefersReduced: boolean;
}

export function SceneV2({ flaggedOrgans, prefersReduced }: SceneProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (prefersReduced) return;
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.3;
    }
  });

  const fillMat = useMemo(
    () =>
      new THREE.MeshPhongMaterial({
        color: 0x050a1f,
        transparent: true,
        opacity: 0.7,
        depthWrite: false,
      }),
    [],
  );

  const edgeMat = useMemo(
    () => new THREE.LineBasicMaterial({ color: 0x00d4ff, linewidth: 1 }),
    [],
  );

  useEffect(() => {
    return () => {
      fillMat.dispose();
      edgeMat.dispose();
    };
  }, [fillMat, edgeMat]);

  // Placeholder — replace with mesh JSX using flaggedOrgans highlights
  void flaggedOrgans;

  return (
    <>
      <ambientLight intensity={0.3} />
      <pointLight position={[5, 5, 5]} intensity={0.5} />
      <mesh ref={meshRef}>
        <sphereGeometry args={[1.2, 32, 32]} />
        <primitive object={fillMat} attach="material" />
      </mesh>
    </>
  );
}
