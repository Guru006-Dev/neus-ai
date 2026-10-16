import { Html } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useEffect, useLayoutEffect, useMemo, useRef, type RefObject } from 'react'
import * as THREE from 'three'
import { registerReporter } from '../debug'
import { ScreenContent } from '../screen/ScreenContent'
import { convergeStages, screenMix, screenOn, smoothstep, type ScreenFrame } from '../timeline'
import {
  LID_CLOSED,
  LID_ORIGIN,
  SCREEN_CENTER_Y,
  SCREEN_DISTANCE_FACTOR,
  SCREEN_H,
  SCREEN_PX_H,
  SCREEN_PX_W,
  SCREEN_W,
} from './constants'
import { BASE, KEYBOARD_WELL, KEYS, LID, TRACKPAD, baseTopAt, lidRotation } from './laptop-layout'

const SCREEN_OFF = new THREE.Color('#050607')
const SCREEN_ON = new THREE.Color('#0b0d0f')
const BEVEL = 0.012
/** The deck tilts with the base's taper, so keys and trackpad follow its surface. */
const DECK_TILT = Math.asin((BASE.backHeight - BASE.frontHeight) / BASE.depth)

function roundedRect(w: number, h: number, r: number): THREE.Shape {
  const x = -w / 2
  const y = -h / 2
  const s = new THREE.Shape()
  s.moveTo(x + r, y)
  s.lineTo(x + w - r, y)
  s.quadraticCurveTo(x + w, y, x + w, y + r)
  s.lineTo(x + w, y + h - r)
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  s.lineTo(x + r, y + h)
  s.quadraticCurveTo(x, y + h, x, y + h - r)
  s.lineTo(x, y + r)
  s.quadraticCurveTo(x, y, x + r, y)
  return s
}

const extrude = (shape: THREE.Shape, depth: number) =>
  new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelSize: BEVEL,
    bevelThickness: BEVEL,
    bevelSegments: 2,
    curveSegments: 8,
  })

/** The base: a rounded-corner slab, extruded upward and tapered slightly toward the front edge. */
function baseGeometry(): THREE.BufferGeometry {
  const g = extrude(
    roundedRect(BASE.width - 2 * BEVEL, BASE.depth - 2 * BEVEL, BASE.cornerRadius),
    BASE.backHeight - 2 * BEVEL,
  )
  g.rotateX(-Math.PI / 2)
  g.computeBoundingBox()
  const b = g.boundingBox!
  g.translate(0, -b.min.y, (BASE.backZ + BASE.frontZ) / 2 - (b.min.z + b.max.z) / 2)
  const pos = g.getAttribute('position') as THREE.BufferAttribute
  for (let i = 0; i < pos.count; i++) pos.setY(i, pos.getY(i) * (baseTopAt(pos.getZ(i)) / BASE.backHeight))
  g.computeVertexNormals()
  return g
}

/** The lid shell, in the lid's frame: display face at z = 0, back at -thickness. */
function lidGeometry(): THREE.BufferGeometry {
  const height = LID.top - LID.bottom
  const g = extrude(roundedRect(LID.width - 2 * BEVEL, height - 2 * BEVEL, LID.cornerRadius), LID.thickness - 2 * BEVEL)
  g.computeBoundingBox()
  const b = g.boundingBox!
  g.translate(0, LID.bottom - b.min.y, -b.max.z)
  return g
}

function bezelGeometry(): THREE.BufferGeometry {
  const i = LID.bezelInset
  return new THREE.ShapeGeometry(roundedRect(LID.width - 2 * i, LID.top - LID.bottom - 2 * i, LID.cornerRadius - i), 8)
}

/** Every key in one instanced draw call, sitting in the deck's frame. */
function Keys({ material }: { material: THREE.Material }) {
  const ref = useRef<THREE.InstancedMesh>(null)
  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    const m = new THREE.Matrix4()
    const q = new THREE.Quaternion()
    KEYS.forEach((k, i) => {
      const h = k.top - (baseTopAt(k.z) - 0.003)
      m.compose(new THREE.Vector3(k.x, -0.003 + h / 2, k.z - BASE.backZ), q, new THREE.Vector3(k.w, h, k.d))
      mesh.setMatrixAt(i, m)
    })
    mesh.instanceMatrix.needsUpdate = true
  }, [])
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, KEYS.length]} material={material}>
      <boxGeometry args={[1, 1, 1]} />
    </instancedMesh>
  )
}

/** A thin unbranded aluminium laptop: the stage for the run, not the product. */
export function Laptop({
  progressRef,
  frame,
  portal,
}: {
  progressRef: RefObject<number>
  frame: ScreenFrame
  portal: RefObject<HTMLElement | null>
}) {
  const lid = useRef<THREE.Group>(null)
  const glow = useRef<THREE.PointLight>(null)
  const screenWrap = useRef<HTMLDivElement>(null)
  const lastOpacity = useRef('')
  const lastMix = useRef('')

  const mats = useMemo(
    () => ({
      body: new THREE.MeshStandardMaterial({ color: '#4f555c', metalness: 0.6, roughness: 0.55 }),
      well: new THREE.MeshStandardMaterial({ color: '#0d0f11', roughness: 0.95 }),
      keys: new THREE.MeshStandardMaterial({ color: '#16181b', metalness: 0.1, roughness: 0.8 }),
      pad: new THREE.MeshStandardMaterial({ color: '#4a5057', metalness: 0.5, roughness: 0.32 }),
      padEdge: new THREE.MeshStandardMaterial({ color: '#25292d', metalness: 0.3, roughness: 0.6 }),
      hinge: new THREE.MeshStandardMaterial({ color: '#1c1f23', metalness: 0.5, roughness: 0.5 }),
      bezel: new THREE.MeshStandardMaterial({ color: '#050607', roughness: 0.85 }),
      screen: new THREE.MeshBasicMaterial({ color: SCREEN_OFF.clone(), toneMapped: false }),
    }),
    [],
  )
  const geo = useMemo(
    () => ({
      base: baseGeometry(),
      lid: lidGeometry(),
      bezel: bezelGeometry(),
      well: new THREE.ShapeGeometry(roundedRect(KEYBOARD_WELL.width, KEYBOARD_WELL.depth, 0.04), 6),
      pad: new THREE.ShapeGeometry(roundedRect(TRACKPAD.width, TRACKPAD.depth, TRACKPAD.radius), 8),
      padEdge: new THREE.ShapeGeometry(roundedRect(TRACKPAD.width + 0.016, TRACKPAD.depth + 0.016, TRACKPAD.radius + 0.008), 8),
    }),
    [],
  )
  useEffect(
    () => () => {
      Object.values(mats).forEach((m) => m.dispose())
      Object.values(geo).forEach((g) => g.dispose())
    },
    [mats, geo],
  )

  useFrame((state) => {
    const p = progressRef.current
    if (lid.current) lid.current.rotation.x = lidRotation(p)
    const stages = convergeStages(p)
    const on = screenOn(p) * stages.screen
    if (glow.current) glow.current.intensity = 1.4 * on
    mats.screen.color.lerpColors(SCREEN_OFF, SCREEN_ON, on)
    // The screen HTML is a DOM layer above the canvas; it is gone before the lines start forming the N.
    const content = screenOn(p) * (1 - smoothstep(stages.tags))
    const wrap = screenWrap.current
    if (!wrap) {
      state.invalidate() // the Html portal mounts asynchronously; render again once it exists
      return
    }
    const opacity = content.toFixed(3)
    if (opacity !== lastOpacity.current) {
      wrap.style.opacity = opacity
      lastOpacity.current = opacity
    }
    const mix = screenMix(p).toFixed(3)
    if (mix !== lastMix.current) {
      wrap.style.setProperty('--mix', mix)
      lastMix.current = mix
    }
  })

  useEffect(
    () =>
      registerReporter('laptop', () => ({
        lid: lid.current?.rotation.x ?? null,
        glow: glow.current?.intensity ?? null,
        screen: screenWrap.current?.style.opacity ?? null,
        mix: screenWrap.current?.style.getPropertyValue('--mix') ?? null,
      })),
    [],
  )

  const flat: [number, number, number] = [-Math.PI / 2, 0, 0]
  return (
    <group>
      <mesh geometry={geo.base} material={mats.body} castShadow />
      <group position={[0, BASE.backHeight, BASE.backZ]} rotation={[DECK_TILT, 0, 0]}>
        <mesh geometry={geo.well} material={mats.well} position={[0, 0.0004, KEYBOARD_WELL.z - BASE.backZ]} rotation={flat} />
        <Keys material={mats.keys} />
        <mesh geometry={geo.padEdge} material={mats.padEdge} position={[0, 0.0004, TRACKPAD.z - BASE.backZ]} rotation={flat} />
        <mesh geometry={geo.pad} material={mats.pad} position={[0, 0.0008, TRACKPAD.z - BASE.backZ]} rotation={flat} />
      </group>
      <mesh position={LID_ORIGIN} rotation={[0, 0, Math.PI / 2]} material={mats.hinge}>
        <cylinderGeometry args={[0.042, 0.042, BASE.width * 0.8, 20]} />
      </mesh>
      <group ref={lid} position={LID_ORIGIN} rotation={[LID_CLOSED, 0, 0]}>
        <mesh geometry={geo.lid} material={mats.body} castShadow />
        <mesh geometry={geo.bezel} material={mats.bezel} position={[0, (LID.top + LID.bottom) / 2, 0.0008]} />
        <mesh position={[0, SCREEN_CENTER_Y, 0.002]} material={mats.screen}>
          <planeGeometry args={[SCREEN_W, SCREEN_H]} />
        </mesh>
        <pointLight ref={glow} position={[0, SCREEN_CENTER_Y, 0.9]} distance={4} decay={2} color="#dfe6ea" intensity={0} />
        <Html
          portal={portal as RefObject<HTMLElement>}
          transform
          distanceFactor={SCREEN_DISTANCE_FACTOR}
          position={[0, SCREEN_CENTER_Y, 0.004]}
          zIndexRange={[10, 0]}
          style={{ width: SCREEN_PX_W, height: SCREEN_PX_H, pointerEvents: 'none' }}
        >
          <div ref={screenWrap} className="screen-frame" style={{ width: SCREEN_PX_W, height: SCREEN_PX_H, opacity: 0 }}>
            <ScreenContent view={frame.view} progress={frame.progress} outgoing={frame.outgoing} />
          </div>
        </Html>
      </group>
    </group>
  )
}
