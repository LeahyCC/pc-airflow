import { z } from 'zod'

import { caseSpec, coolerSpec, cpuSpec, fanSpec, gpuSpec } from './schema'

/*
 * Loads every JSON file in data/ at build time and checks it against the
 * schema. A bad file fails loudly with its path, so a broken community PR
 * can't ship.
 */

function loadAll<T extends z.ZodType>(
  files: Record<string, unknown>,
  schema: T,
): Map<string, z.infer<T>> {
  const out = new Map<string, z.infer<T>>()
  for (const [path, raw] of Object.entries(files)) {
    const parsed = schema.safeParse(raw)
    if (!parsed.success) {
      throw new Error(`${path} is invalid:\n${z.prettifyError(parsed.error)}`)
    }
    const item = parsed.data as { id: string }
    if (out.has(item.id)) throw new Error(`${path}: duplicate id "${item.id}"`)
    if (!path.endsWith(`/${item.id}.json`)) {
      throw new Error(`${path}: file name must match id "${item.id}"`)
    }
    out.set(item.id, parsed.data)
  }
  return out
}

export const cases = loadAll(
  import.meta.glob('../../data/cases/*.json', { eager: true, import: 'default' }),
  caseSpec,
)
export const fans = loadAll(
  import.meta.glob('../../data/fans/*.json', { eager: true, import: 'default' }),
  fanSpec,
)
export const cpus = loadAll(
  import.meta.glob('../../data/cpus/*.json', { eager: true, import: 'default' }),
  cpuSpec,
)
export const coolers = loadAll(
  import.meta.glob('../../data/coolers/*.json', { eager: true, import: 'default' }),
  coolerSpec,
)
export const gpus = loadAll(
  import.meta.glob('../../data/gpus/*.json', { eager: true, import: 'default' }),
  gpuSpec,
)
