// WHERE the study room's pieces sit. Pure data shared by the room components and the layout tests.
// Scale: the laptop is 3 units wide (a 32 cm laptop), so 1 unit ≈ 10.7 cm. The desk top is y = 0.

export type V3 = readonly [number, number, number]

export interface Box {
  name: string
  min: readonly number[]
  max: readonly number[]
  /** Resting on the desk top. */
  onDesk?: boolean
}

const box = (name: string, min: V3, max: V3, onDesk = false): Box => ({ name, min, max, onDesk })

/** The laptop plus the space its lid sweeps through while opening. */
export const LAPTOP_VOLUME: Box = box('laptop', [-1.45, 0, -1.5], [1.45, 2.3, 1.0])

export const WALL_Z = -3.65
export const SIDE_WALL_X = -5.4

export const DESK = {
  top: 0,
  thickness: 0.25,
  minX: -5.35,
  maxX: 5.2,
  backZ: WALL_Z,
  frontZ: 2.05,
  /** Floor level: a 75 cm desk. */
  floor: -7,
} as const

/** Drawer pedestal under the right side of the desk. */
export const PEDESTAL = { minX: 2.7, maxX: 5.0, frontZ: 1.75, backZ: -3.2 } as const

export const SHELF = { y: 3.4, thickness: 0.18, minX: -5.35, maxX: 2.4, depth: 2.0 } as const

export const WINDOW = { minX: 3.25, maxX: 5.05, minY: 1.7, maxY: 7.4, frame: 0.13 } as const

/** Muted spines: graphite, warm greys, a faded navy and a faded oxblood. */
export const BOOK_COLORS = ['#3f444b', '#5f5448', '#38444c', '#54403c', '#6d675d', '#2c3035', '#4f4a42', '#423d38'] as const

export interface BookSpec {
  x: number
  width: number
  height: number
  depth: number
  color: number
}

/** Books standing on the shelf, left to right; deterministic so the room never reshuffles. */
export const SHELF_BOOKS: readonly BookSpec[] = (() => {
  const widths = [0.34, 0.42, 0.28, 0.5, 0.36, 0.3, 0.46, 0.32, 0.38, 0.27, 0.44, 0.35]
  const heights = [2.35, 2.1, 2.55, 2.2, 2.45, 1.95, 2.3, 2.5, 2.05, 2.4, 2.25, 2.15]
  const books: BookSpec[] = []
  let x = SHELF.minX + 0.35
  widths.forEach((w, i) => {
    books.push({ x: x + w / 2, width: w, height: heights[i], depth: 1.55 + (i % 3) * 0.1, color: i % BOOK_COLORS.length })
    x += w + 0.025
  })
  return books
})()

/** A short horizontal stack at the right end of the shelf. */
export const SHELF_STACK = { x: 1.25, z: WALL_Z + 1.05, books: [0.24, 0.2, 0.26], width: 1.75, depth: 1.5 } as const

export const LAMP = {
  base: [-4.45, 0, -2.95] as V3,
  baseRadius: 0.42,
  elbow: [-4.65, 2.45, -3.35] as V3,
  head: [-3.75, 2.65, -2.35] as V3,
  /** Where the shade points: the back of the desk to the left of the laptop. */
  aim: [-2.9, 0, -1.25] as V3,
  shadeLength: 0.78,
  shadeRadius: 0.5,
} as const

export const PEN_HOLDER = { at: [-3.05, 0, -2.35] as V3, radius: 0.26, height: 0.85 } as const
export const MUG = { at: [-3.35, 0, -0.75] as V3, radius: 0.3, height: 0.72 } as const
export const NOTEBOOK = { at: [3.15, 0, 0.15] as V3, width: 1.7, depth: 2.2, thickness: 0.07, angle: -0.18 } as const
export const DESK_STACK = { at: [3.75, 0, -2.35] as V3, width: 1.85, depth: 2.4, heights: [0.22, 0.26, 0.2] } as const

const lampBox = (): Box => {
  const pts = [LAMP.base, LAMP.elbow, LAMP.head]
  const pad = LAMP.shadeRadius + 0.1
  return box(
    'lamp',
    [Math.min(...pts.map((p) => p[0])) - pad, 0, Math.min(...pts.map((p) => p[2])) - pad],
    [Math.max(...pts.map((p) => p[0])) + pad, LAMP.head[1] + pad, Math.max(...pts.map((p) => p[2])) + pad],
    true,
  )
}

const rotatedHalf = (w: number, d: number, a: number): [number, number] => [
  (Math.abs(Math.cos(a)) * w + Math.abs(Math.sin(a)) * d) / 2,
  (Math.abs(Math.sin(a)) * w + Math.abs(Math.cos(a)) * d) / 2,
]

const [nbHx, nbHz] = rotatedHalf(NOTEBOOK.width, NOTEBOOK.depth, NOTEBOOK.angle)
const stackHeight = DESK_STACK.heights.reduce((a, b) => a + b, 0)

/** Bounding boxes of every room piece near the laptop or the camera path. */
export const ROOM_PROPS: readonly Box[] = [
  box('desk top', [DESK.minX, -DESK.thickness, DESK.backZ], [DESK.maxX, 0, DESK.frontZ]),
  box('pedestal', [PEDESTAL.minX, DESK.floor, PEDESTAL.backZ], [PEDESTAL.maxX, -DESK.thickness, PEDESTAL.frontZ]),
  box('shelf', [SHELF.minX, SHELF.y, WALL_Z], [SHELF.maxX, SHELF.y + SHELF.thickness + 2.6, WALL_Z + SHELF.depth]),
  lampBox(),
  box(
    'pen holder',
    [PEN_HOLDER.at[0] - PEN_HOLDER.radius, 0, PEN_HOLDER.at[2] - PEN_HOLDER.radius],
    [PEN_HOLDER.at[0] + PEN_HOLDER.radius + 0.2, 1.55, PEN_HOLDER.at[2] + PEN_HOLDER.radius],
    true,
  ),
  box('mug', [MUG.at[0] - MUG.radius - 0.25, 0, MUG.at[2] - MUG.radius], [MUG.at[0] + MUG.radius, MUG.height, MUG.at[2] + MUG.radius], true),
  box(
    'notebook',
    [NOTEBOOK.at[0] - nbHx, 0, NOTEBOOK.at[2] - nbHz],
    [NOTEBOOK.at[0] + nbHx, NOTEBOOK.thickness + 0.12, NOTEBOOK.at[2] + nbHz],
    true,
  ),
  box(
    'desk books',
    [DESK_STACK.at[0] - DESK_STACK.width / 2 - 0.15, 0, DESK_STACK.at[2] - DESK_STACK.depth / 2 - 0.15],
    [DESK_STACK.at[0] + DESK_STACK.width / 2 + 0.15, stackHeight, DESK_STACK.at[2] + DESK_STACK.depth / 2 + 0.15],
    true,
  ),
  box('window', [WINDOW.minX, WINDOW.minY, WALL_Z], [WINDOW.maxX, WINDOW.maxY, WALL_Z + 0.2]),
]
