import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

function NodeLattice() {
  const group = useRef<THREE.Group>(null);
  const innerGroup = useRef<THREE.Group>(null);

  const nodePositions = useMemo(() => {
    const pts: [number, number, number][] = [];
    const octa = new THREE.OctahedronGeometry(1.6, 0);
    const pos = octa.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      pts.push([pos.getX(i), pos.getY(i), pos.getZ(i)]);
    }
    return pts;
  }, []);

  useFrame((_, delta) => {
    if (group.current) group.current.rotation.y += delta * 0.18;
    if (innerGroup.current) {
      innerGroup.current.rotation.x += delta * 0.12;
      innerGroup.current.rotation.z -= delta * 0.09;
    }
  });

  return (
    <group ref={group}>
      {/* Outer wireframe polytope — the pipeline "node" motif */}
      <mesh>
        <octahedronGeometry args={[1.6, 0]} />
        <meshBasicMaterial color="#0E76FF" wireframe transparent opacity={0.85} />
      </mesh>
      <mesh>
        <octahedronGeometry args={[1.6, 0]} />
        <meshBasicMaterial color="#F3F3F3" wireframe transparent opacity={0.08} />
      </mesh>

      {/* Small node markers at each vertex */}
      {nodePositions.map((p, i) => (
        <mesh key={i} position={p}>
          <sphereGeometry args={[0.035, 8, 8]} />
          <meshBasicMaterial color="#F3F3F3" transparent opacity={0.9} />
        </mesh>
      ))}

      {/* Inner counter-rotating tetrahedron — depth/complexity cue */}
      <group ref={innerGroup}>
        <mesh scale={0.62}>
          <tetrahedronGeometry args={[1.4, 0]} />
          <meshBasicMaterial color="#0E76FF" wireframe transparent opacity={0.5} />
        </mesh>
      </group>
    </group>
  );
}

export default function HeroScene({ size = 1 }: { size?: number }) {
  return (
    <div style={{ width: '100%', height: '100%', minHeight: 320 }}>
      <Canvas
        camera={{ position: [0, 0, 5 / size], fov: 42 }}
        gl={{ alpha: true, antialias: true }}
        style={{ background: 'transparent' }}
      >
        <ambientLight intensity={0.6} />
        <NodeLattice />
      </Canvas>
    </div>
  );
}
