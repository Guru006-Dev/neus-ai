import { useLayoutEffect, useRef } from 'react'
import * as THREE from 'three'
import type { RoomMaterials } from './materials'
import { BOOK_COLORS, SHELF, SHELF_BOOKS, SHELF_STACK, WALL_Z } from './layout'

const ALL_BOOKS = SHELF_BOOKS.length + SHELF_STACK.books.length

/** One wall shelf with books: a single instanced mesh for every spine. */
export function StudyShelves({ m }: { m: RoomMaterials }) {
  const books = useRef<THREE.InstancedMesh>(null)

  useLayoutEffect(() => {
    const mesh = books.current
    if (!mesh) return
    const matrix = new THREE.Matrix4()
    const color = new THREE.Color()
    const top = SHELF.y + SHELF.thickness
    SHELF_BOOKS.forEach((b, i) => {
      matrix.compose(
        new THREE.Vector3(b.x, top + b.height / 2, WALL_Z + b.depth / 2 + 0.05),
        new THREE.Quaternion(),
        new THREE.Vector3(b.width, b.height, b.depth),
      )
      mesh.setMatrixAt(i, matrix)
      mesh.setColorAt(i, color.set(BOOK_COLORS[b.color]))
    })
    let y = top
    SHELF_STACK.books.forEach((h, j) => {
      const twist = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), (j - 1) * 0.06)
      matrix.compose(
        new THREE.Vector3(SHELF_STACK.x, y + h / 2, SHELF_STACK.z),
        twist,
        new THREE.Vector3(SHELF_STACK.width - j * 0.12, h, SHELF_STACK.depth),
      )
      mesh.setMatrixAt(SHELF_BOOKS.length + j, matrix)
      mesh.setColorAt(SHELF_BOOKS.length + j, color.set(BOOK_COLORS[(j * 3 + 1) % BOOK_COLORS.length]))
      y += h
    })
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }, [])

  const width = SHELF.maxX - SHELF.minX
  const cx = (SHELF.minX + SHELF.maxX) / 2
  return (
    <group>
      <mesh position={[cx, SHELF.y + SHELF.thickness / 2, WALL_Z + SHELF.depth / 2]} material={m.shelf}>
        <boxGeometry args={[width, SHELF.thickness, SHELF.depth]} />
      </mesh>
      {[SHELF.minX + 0.9, SHELF.maxX - 0.9].map((x) => (
        <mesh key={x} position={[x, SHELF.y - 0.35, WALL_Z + 0.55]} material={m.metal}>
          <boxGeometry args={[0.1, 0.7, 1.1]} />
        </mesh>
      ))}
      <instancedMesh ref={books} args={[undefined, undefined, ALL_BOOKS]} material={m.book}>
        <boxGeometry args={[1, 1, 1]} />
      </instancedMesh>
    </group>
  )
}
