import { expect, test } from '@playwright/test'
import { deskSpill, lampLevel, roomPresence } from '../src/landing/timeline'
import { goToProgress, openLanding } from './helpers'

type Room = { presence: number; lamp: number; spill: number }

test('the study room mounts around the laptop and follows the timeline', async ({ page }) => {
  await openLanding(page)
  for (const p of [0, 0.03, 0.05, 0.5, 0.92, 1]) {
    const snap = await goToProgress(page, p)
    expect(snap.laptop, `laptop at p=${p}`).toBeTruthy()
    // snap.p is itself rounded to 1e-5, so recomputing from it can differ in the fifth decimal.
    const room = snap.room as Room
    expect(room.presence, `p=${p}`).toBeCloseTo(roomPresence(snap.p), 4)
    expect(room.lamp, `p=${p}`).toBeCloseTo(lampLevel(snap.p), 4)
    expect(room.spill, `p=${p}`).toBeCloseTo(deskSpill(snap.p), 4)
  }
})

test('reverse scroll returns the room to the same state', async ({ page }) => {
  await openLanding(page)
  const points = [0, 0.04, 0.115, 0.5, 0.95]
  const forward = []
  for (const p of points) forward.push((await goToProgress(page, p)).room)
  const backward = []
  for (const p of [...points].reverse()) backward.push((await goToProgress(page, p)).room)
  expect(backward.reverse()).toEqual(forward)
})

test('the 2D fallback does not build the room', async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 1024 })
  await page.goto('/?nexus-debug')
  await expect(page.locator('.fallback')).toBeVisible()
  await expect(page.locator('canvas')).toHaveCount(0)
})
