import { useEffect, useState } from 'react'

export interface Capabilities {
  viewportWidth: number
  webgl: boolean
  reducedMotion: boolean
}

export const MIN_3D_WIDTH = 768

/** 3D is enabled only on viewports ≥ 768px, with WebGL, and without prefers-reduced-motion. */
export const is3DEligible = (c: Capabilities): boolean =>
  c.viewportWidth >= MIN_3D_WIDTH && c.webgl && !c.reducedMotion

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

export function readCapabilities(): Capabilities {
  return {
    viewportWidth: window.innerWidth,
    webgl: hasWebGL(),
    reducedMotion: window.matchMedia(REDUCED_MOTION).matches,
  }
}

export function use3DEligible(): boolean {
  const [eligible, setEligible] = useState(() => is3DEligible(readCapabilities()))
  useEffect(() => {
    const queries = [window.matchMedia(REDUCED_MOTION), window.matchMedia(WIDE)]
    const update = () => setEligible(is3DEligible(readCapabilities()))
    queries.forEach((q) => q.addEventListener('change', update))
    return () => queries.forEach((q) => q.removeEventListener('change', update))
  }, [])
  return eligible
}
