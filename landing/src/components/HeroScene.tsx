import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/** Crisp edge-line wireframe (no diagonal clutter) + a faint translucent fill for material weight. */
function EdgeShape({
  geometry, color, fillOpacity = 0.05, lineOpacity = 0.9, scale = 1,
}: { geometry: THREE.BufferGeometry; color: string; fillOpacity?: number; lineOpacity?: number; scale?: number }) {
  const edges = useMemo(() => new THREE.EdgesGeometry(geometry, 1), [geometry]);
  return (
    <group scale={scale}>
      <lineSegments geometry={edges}>
        <lineBasicMaterial color={color} transparent opacity={lineOpacity} />
      </lineSegments>
      <mesh geometry={geometry}>
        <meshStandardMaterial color={color} transparent opacity={fillOpacity} metalness={0.4} roughness={0.35} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

/** A dashed callout line from a surface point out to a small square marker, echoing technical-annotation lines. */
function Callout({ from, dir, length }: { from: THREE.Vector3; dir: THREE.Vector3; length: number }) {
  const to = useMemo(() => from.clone().add(dir.clone().normalize().multiplyScalar(length)), [from, dir, length]);
  const line = useMemo(() => {
    const geo = new THREE.BufferGeometry().setFromPoints([from, to]);
    const mat = new THREE.LineDashedMaterial({ color: '#F3F3F3', transparent: true, opacity: 0.35, dashSize: 0.045, gapSize: 0.035 });
    const l = new THREE.Line(geo, mat);
    l.computeLineDistances();
    return l;
  }, [from, to]);
  return (
    <group>
      <primitive object={line} />
      <mesh position={to}>
        <boxGeometry args={[0.05, 0.05, 0.002]} />
        <meshBasicMaterial color="#F3F3F3" transparent opacity={0.7} />
      </mesh>
    </group>
  );
}

function NodeLattice() {
  const group = useRef<THREE.Group>(null);
  const innerGroup = useRef<THREE.Group>(null);

  const icosaGeo = useMemo(() => new THREE.IcosahedronGeometry(1.55, 0), []);
  const octaGeo = useMemo(() => new THREE.OctahedronGeometry(1.9, 0), []);
  const tetraGeo = useMemo(() => new THREE.TetrahedronGeometry(1.35, 0), []);

  const vertexPoints = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    const pos = icosaGeo.attributes.position;
    const seen = new Set<string>();
    for (let i = 0; i < pos.count; i++) {
      const v = new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i));
      const key = v.toArray().map(n => n.toFixed(2)).join(',');
      if (!seen.has(key)) { seen.add(key); pts.push(v); }
    }
    return pts;
  }, [icosaGeo]);

  const callouts = useMemo(() => {
    return vertexPoints.filter((_, i) => i % 3 === 0).slice(0, 5).map(v => ({
      from: v, dir: v.clone().normalize(), length: 0.5 + Math.random() * 0.4,
    }));
  }, [vertexPoints]);

  useFrame((_, delta) => {
    if (group.current) group.current.rotation.y += delta * 0.16;
    if (innerGroup.current) {
      innerGroup.current.rotation.x += delta * 0.11;
      innerGroup.current.rotation.z -= delta * 0.08;
    }
  });

  return (
    <group ref={group}>
      <EdgeShape geometry={icosaGeo} color="#0E76FF" fillOpacity={0.06} lineOpacity={0.95} />
      <EdgeShape geometry={octaGeo} color="#F3F3F3" fillOpacity={0} lineOpacity={0.1} />

      {vertexPoints.map((p, i) => (
        <mesh key={i} position={p}>
          <boxGeometry args={[0.045, 0.045, 0.045]} />
          <meshStandardMaterial color="#F3F3F3" metalness={0.6} roughness={0.3} />
        </mesh>
      ))}

      {callouts.map((c, i) => <Callout key={i} {...c} />)}

      <group ref={innerGroup}>
        <EdgeShape geometry={tetraGeo} color="#0E76FF" scale={0.6} fillOpacity={0.08} lineOpacity={0.55} />
      </group>
    </group>
  );
}

export default function HeroScene({ size = 1 }: { size?: number }) {
  return (
    <div style={{
      width: '100%', height: '100%', minHeight: 320, position: 'relative',
      background: 'radial-gradient(ellipse 60% 55% at 55% 45%, rgba(14,118,255,0.16), transparent 70%)',
    }}>
      <Canvas
        camera={{ position: [0, 0, 5 / size], fov: 42 }}
        gl={{ alpha: true, antialias: true }}
        style={{ background: 'transparent' }}
      >
        <ambientLight intensity={0.5} />
        <directionalLight position={[3, 4, 5]} intensity={1.1} color="#F3F3F3" />
        <pointLight position={[-3, -2, 2]} intensity={0.8} color="#0E76FF" />
        <NodeLattice />
      </Canvas>
    </div>
  );
}
