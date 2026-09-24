import { Html, RoundedBox } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useEffect, useLayoutEffect, useMemo, useRef, type RefObject } from 'react'
import * as THREE from 'three'
import { registerReporter } from '../debug'
import { ScreenContent } from '../screen/ScreenContent'
import { clamp01, convergeProgress, lidOpen, screenOn, smoothstep, type ScreenFrame } from '../timeline'
import {
  LID_CLOSED,
  LID_OPEN,
  LID_ORIGIN,
  SCREEN_CENTER_Y,
  SCREEN_DISTANCE_FACTOR,
  SCREEN_H,
  SCREEN_PX_H,
  SCREEN_PX_W,
  SCREEN_W,
} from './constants'

const KEY_COLS = 14
const KEY_ROWS = 5
const KEY_PITCH = 0.19
const SCREEN_OFF = new THREE.Color('#050607')
const SCREEN_ON = new THREE.Color('#0b0d0f')

function Keyboard({ material }: { material: THREE.Material }) {
  const ref = useRef<THREE.InstancedMesh>(null)
  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    const m = new THREE.Matrix4()
    let i = 0
    for (let r = 0; r < KEY_ROWS; r++) {
      for (let c = 0; c < KEY_COLS; c++) {
        m.makeTranslation((c - (KEY_COLS - 1) / 2) * KEY_PITCH, 0.106, -0.72 + r * KEY_PITCH)
        mesh.setMatrixAt(i++, m)
      }
    }
    mesh.instanceMatrix.needsUpdate = true
  }, [])
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, KEY_COLS * KEY_ROWS]} material={material}>
      <boxGeometry args={[0.165, 0.012, 0.165]} />
    </instancedMesh>
  )
}

/** A simple custom laptop: the stage for the run, not the product. */
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

  const mats = useMemo(
    () => ({
      body: new THREE.MeshStandardMaterial({ color: '#2b3036', metalness: 0.55, roughness: 0.42 }),
      keys: new THREE.MeshStandardMaterial({ color: '#15181b', metalness: 0.2, roughness: 0.75 }),
      pad: new THREE.MeshStandardMaterial({ color: '#23272c', metalness: 0.4, roughness: 0.5 }),
      screen: new THREE.MeshBasicMaterial({ color: SCREEN_OFF.clone() }),
    }),
    [],
  )
  useEffect(() => () => Object.values(mats).forEach((m) => m.dispose()), [mats])

  useFrame((state) => {
    const p = progressRef.current
    if (lid.current) lid.current.rotation.x = THREE.MathUtils.lerp(LID_CLOSED, LID_OPEN, smoothstep(lidOpen(p)))
    const c = convergeProgress(p)
    const on = screenOn(p) * (1 - 0.7 * c)
    if (glow.current) glow.current.intensity = 1.4 * on
    mats.screen.color.lerpColors(SCREEN_OFF, SCREEN_ON, on)
    // The screen HTML is a DOM layer above the canvas; it must be fully gone before the N draws over it.
    const content = screenOn(p) * (1 - smoothstep(clamp01(c / 0.5)))
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
  })

  useEffect(
    () =>
      registerReporter('laptop', () => ({
        lid: lid.current?.rotation.x ?? null,
        glow: glow.current?.intensity ?? null,
        screen: screenWrap.current?.style.opacity ?? null,
      })),
    [],
  )

  return (
    <group>
      <RoundedBox args={[3, 0.1, 2.1]} radius={0.045} smoothness={4} position={[0, 0.05, 0]} material={mats.body} />
      <Keyboard material={mats.keys} />
      <mesh position={[0, 0.101, 0.6]} material={mats.pad}>
        <boxGeometry args={[0.95, 0.004, 0.55]} />
      </mesh>
      <mesh position={LID_ORIGIN} rotation={[0, 0, Math.PI / 2]} material={mats.body}>
        <cylinderGeometry args={[0.04, 0.04, 2.7, 24]} />
      </mesh>
      <group ref={lid} position={LID_ORIGIN} rotation={[LID_CLOSED, 0, 0]}>
        <RoundedBox args={[3, 2, 0.06]} radius={0.04} smoothness={4} position={[0, 1, -0.03]} material={mats.body} />
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
            <ScreenContent view={frame.view} progress={frame.progress} />
          </div>
        </Html>
      </group>
    </group>
  )
}
