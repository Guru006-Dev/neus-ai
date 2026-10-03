import { useEffect, useState } from 'react'

export interface Capabilities {
  viewportWidth: number
  viewportHeight: number
  webgl: boolean
  reducedMotion: boolean
}

export const MIN_3D_WIDTH = 1024

/**
 * 3D only where the cinematic composition has room: landscape viewports ≥ 1024px, with WebGL and
 * without prefers-reduced-motion. Portrait tablets get the 2D story, which reads better at that shape.
 */
export const is3DEligible = (c: Capabilities): boolean =>
  c.viewportWidth >= MIN_3D_WIDTH && c.viewportWidth >= c.viewportHeight && c.webgl && !c.reducedMotion

let webglCache: boolean | null = null

export function hasWebGL(): boolean {
  if (webglCache !== null) return webglCache
  try {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl')
    webglCache = gl !== null
    gl?.getExtension('WEBGL_lose_context')?.loseContext()
  } catch {
    webglCache = false
  }
  return webglCache
}

const REDUCED_MOTION = '(prefers-reduced-motion: reduce)'
const WIDE = `(min-width: ${MIN_3D_WIDTH}px)`
const LANDSCAPE = '(orientation: landscape)'

export function readCapabilities(): Capabilities {
  return {
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
    webgl: hasWebGL(),
    reducedMotion: window.matchMedia(REDUCED_MOTION).matches,
  }
}

export function use3DEligible(): boolean {
  const [eligible, setEligible] = useState(() => is3DEligible(readCapabilities()))
  useEffect(() => {
    const queries = [REDUCED_MOTION, WIDE, LANDSCAPE].map((q) => window.matchMedia(q))
    const update = () => setEligible(is3DEligible(readCapabilities()))
    queries.forEach((q) => q.addEventListener('change', update))
    return () => queries.forEach((q) => q.removeEventListener('change', update))
  }, [])
  return eligible
}
