import { describe, expect, it } from 'vitest'

import { cases, coolers, cpus, fans, gpus } from './data'

describe('data files', () => {
  it('all load and pass the schema', () => {
    for (const set of [cases, fans, cpus, coolers, gpus]) expect(set.size).toBeGreaterThan(0)
  })

  it('case mounts fit inside the case', () => {
    for (const c of cases.values()) {
      const { width, height, depth } = c.inside
      for (const m of c.mounts) {
        const [x, y, z] = m.firstSlotCentre
        const axis = { x: 0, y: 1, z: 2 }[m.slotAxis]
        const last = [x, y, z]
        last[axis] = (last[axis] ?? 0) + (m.slots - 1) * m.slotSpacing
        for (const p of [m.firstSlotCentre, last]) {
          expect(p[0], `${c.id}/${m.id} x`).toBeLessThanOrEqual(width)
          expect(p[1], `${c.id}/${m.id} y`).toBeLessThanOrEqual(height)
          expect(p[2], `${c.id}/${m.id} z`).toBeLessThanOrEqual(depth)
        }
      }
    }
  })

  it('idle power is below max power', () => {
    for (const p of [...cpus.values(), ...gpus.values()]) {
      expect(p.idleWatts, p.id).toBeLessThan(p.maxWatts)
    }
  })
})
