import { useEffect, useMemo } from 'react'
import * as THREE from 'three'

/** A small seeded noise canvas: cheap plaster and wood grain without texture downloads. */
function noiseTexture(kind: 'plaster' | 'grain'): THREE.CanvasTexture {
  const size = 128
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  let seed = kind === 'plaster' ? 7 : 13
  const rand = () => {
    seed = (seed * 16807) % 2147483647
    return seed / 2147483647
  }
  const img = ctx.createImageData(size, size)
  for (let y = 0; y < size; y++) {
    const band = kind === 'grain' ? 0.06 * Math.sin(y * 0.45 + Math.sin(y * 0.07) * 4) : 0
    for (let x = 0; x < size; x++) {
      const v = Math.round(255 * Math.min(1, Math.max(0, 0.93 + band + (rand() - 0.5) * 0.08)))
      const i = (y * size + x) * 4
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v
      img.data[i + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)
  const tex = new THREE.CanvasTexture(canvas)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

/** A soft dark ellipse: a baked contact shadow, so objects sit on the desk without real-time shadows. */
function contactShadowTexture(): THREE.CanvasTexture {
  const size = 128
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const g = ctx.createRadialGradient(size / 2, size / 2, size * 0.18, size / 2, size / 2, size / 2)
  g.addColorStop(0, 'rgba(0,0,0,0.6)')
  g.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  return new THREE.CanvasTexture(canvas)
}

const std = (color: string, roughness: number, metalness = 0, map?: THREE.Texture) =>
  new THREE.MeshStandardMaterial({ color, roughness, metalness, map: map ?? null })

export type RoomMaterials = ReturnType<typeof createRoomMaterials>

function createRoomMaterials() {
  const plaster = noiseTexture('plaster')
  plaster.repeat.set(6, 6)
  const grain = noiseTexture('grain')
  grain.repeat.set(1, 3)
  const shadow = contactShadowTexture()
  const lit = {
    wall: std('#2a2623', 0.95, 0, plaster),
    desk: std('#33281f', 0.96, 0, grain),
    deskDark: std('#1f1b18', 0.85),
    shelf: std('#352b23', 0.8, 0, grain),
    frame: std('#36322d', 0.7),
    metal: std('#25282b', 0.42, 0.35),
    ceramic: std('#6f6a62', 0.6),
    holder: std('#2c3035', 0.6, 0.2),
    paper: std('#827c73', 0.92),
    cover: std('#2e3237', 0.8),
    book: std('#b3b3b3', 0.85),
  }
  const glass = new THREE.MeshStandardMaterial({ color: '#0b1118', emissive: '#1b2734', roughness: 0.25, metalness: 0.1 })
  const bulb = new THREE.MeshBasicMaterial({ color: '#ffdcae', toneMapped: false })
  const contact = new THREE.MeshBasicMaterial({ map: shadow, transparent: true, depthWrite: false })
  const base = Object.fromEntries(Object.entries(lit).map(([k, m]) => [k, m.color.clone()])) as Record<keyof typeof lit, THREE.Color>
  return { ...lit, glass, bulb, contact, base, textures: [plaster, grain, shadow] }
}

/** Scales every lit room surface by `presence`, so the room recedes without touching the laptop. */
export function applyPresence(m: RoomMaterials, presence: number) {
  for (const key of Object.keys(m.base) as (keyof RoomMaterials['base'])[]) {
    m[key].color.copy(m.base[key]).multiplyScalar(presence)
  }
  m.glass.emissiveIntensity = 0.5 + 0.5 * presence
}

export function useRoomMaterials(): RoomMaterials {
  const m = useMemo(() => createRoomMaterials(), [])
  useEffect(
    () => () => {
      for (const v of Object.values(m)) if (v instanceof THREE.Material) v.dispose()
      m.textures.forEach((t) => t.dispose())
    },
    [m],
  )
  return m
}
