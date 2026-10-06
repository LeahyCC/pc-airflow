import { z } from 'zod'

/*
 * The data contract for the whole app. Every JSON file in `data/` and every
 * build (including the ones inside share links) must pass these schemas.
 * docs/data.md explains each field in plain words.
 *
 * Units: millimetres for sizes, watts for power, °C for temperature,
 * CFM and mmH2O for fan specs (that's what spec sheets use). The build layer
 * converts to SI before anything reaches the engine.
 *
 * Case coordinates (mm), seen from the front of the case:
 *   x: left → right, y: bottom → top, z: front → back. Origin is the
 *   bottom-left-front inside corner.
 */

const id = z.string().regex(/^[a-z0-9-]+$/, 'ids are lowercase-kebab-case')
const mm = z.number().positive()
const watts = z.number().nonnegative()
const fraction = z.number().min(0).max(1)
const source = z.url().optional().describe('Spec sheet or review the numbers came from')

export const fanSizeMm = z.union([
  z.literal(80),
  z.literal(92),
  z.literal(120),
  z.literal(140),
  z.literal(200),
])
export type FanSizeMm = z.infer<typeof fanSizeMm>

/** Where on the case a mount or panel sits. */
export const casePanel = z.enum(['front', 'top', 'bottom', 'rear', 'left', 'right', 'shroud'])
export type CasePanel = z.infer<typeof casePanel>

/** What a panel is made of. Mesh and filter take an open-area fraction. */
export const panelSurface = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('solid') }),
  z.object({ kind: z.literal('glass') }),
  z.object({ kind: z.literal('removed') }),
  z.object({
    kind: z.literal('mesh'),
    openArea: fraction.describe('0.7 means 70% of the panel is holes'),
  }),
])
export type PanelSurface = z.infer<typeof panelSurface>

/** A rectangle on a panel where fans can go, split into equal slots. */
export const fanMount = z.object({
  id,
  panel: casePanel,
  /** Centre of the first slot, case coordinates in mm. */
  firstSlotCentre: z.tuple([z.number(), z.number(), z.number()]),
  /** Direction slots repeat in, along the panel. */
  slotAxis: z.enum(['x', 'y', 'z']),
  slots: z.int().min(1).max(4),
  /** Centre-to-centre distance between slots, mm. */
  slotSpacing: mm,
  fanSizes: z.array(fanSizeMm).min(1),
  /** Has a dust filter fitted by default. */
  filter: z.boolean().default(false),
})
export type FanMount = z.infer<typeof fanMount>

export const formFactor = z.enum(['mini-itx', 'micro-atx', 'atx', 'e-atx'])
export type FormFactor = z.infer<typeof formFactor>

export const caseSpec = z.object({
  id,
  name: z.string(),
  generic: z.boolean().describe('true for the plain size presets, false for real products'),
  /** Inside dimensions in mm: width (x), height (y), depth (z). */
  inside: z.object({ width: mm, height: mm, depth: mm }),
  motherboards: z.array(formFactor).min(1),
  /** A panel left out is solid. */
  panels: z.partialRecord(casePanel, panelSurface),
  mounts: z.array(fanMount).min(1),
  psu: z.object({
    location: z.enum(['bottom', 'top']),
    shroud: z.boolean(),
    /** Height of the shroud in mm if there is one. */
    shroudHeight: mm.optional(),
  }),
  maxGpuLength: mm,
  maxCoolerHeight: mm,
  source,
})
export type CaseSpec = z.infer<typeof caseSpec>

/** One point on a fan curve: airflow against the pressure it can push. */
export const fanCurvePoint = z.object({
  flowCfm: z.number().nonnegative(),
  pressureMmH2O: z.number().nonnegative(),
})

export const fanSpec = z.object({
  id,
  name: z.string(),
  generic: z.boolean(),
  size: fanSizeMm,
  maxRpm: z.int().positive(),
  /** Free-air flow at max RPM. */
  maxFlowCfm: z.number().positive(),
  /** Pressure at zero flow, max RPM. */
  maxPressureMmH2O: z.number().positive(),
  /** Optional measured curve at max RPM. Without it the engine uses a standard curve shape. */
  curve: z.array(fanCurvePoint).min(3).optional(),
  /** Noise at max RPM. */
  noiseDbA: z.number().nonnegative(),
  source,
})
export type FanSpec = z.infer<typeof fanSpec>

/** How hard air finds it to pass through fins or a radiator, as one measured point. */
export const airResistance = z.object({
  pressurePa: z.number().positive(),
  atFlowCfm: z.number().positive(),
})

/** Heat path from the part to the air, as one measured point. */
export const thermalResistance = z.object({
  kelvinPerWatt: z.number().positive(),
  atFlowCfm: z.number().positive(),
})

export const cpuSpec = z.object({
  id,
  name: z.string(),
  generic: z.boolean(),
  idleWatts: watts,
  maxWatts: watts,
  /** Die to cooler base, including paste. Does not change with airflow. */
  internalKPerW: z.number().positive(),
  source,
})
export type CpuSpec = z.infer<typeof cpuSpec>

export const coolerSpec = z.discriminatedUnion('type', [
  z.object({
    type: z.enum(['tower', 'low-profile', 'top-down']),
    id,
    name: z.string(),
    generic: z.boolean(),
    /**
     * Fin block size in mm. `fromBoard` is how far the fins stick out from the
     * motherboard, `across` is the size along the board, `alongAirflow` is the
     * depth the fan pushes through. Fins start `baseGap` mm off the board.
     */
    fins: z.object({ fromBoard: mm, across: mm, alongAirflow: mm, baseGap: mm }),
    fanSize: fanSizeMm,
    fanCount: z.int().min(1).max(3),
    airResistance,
    thermal: thermalResistance,
    source,
  }),
  z.object({
    type: z.literal('aio'),
    id,
    name: z.string(),
    generic: z.boolean(),
    radiatorLength: z.union([
      z.literal(120),
      z.literal(240),
      z.literal(280),
      z.literal(360),
      z.literal(420),
    ]),
    radiatorThickness: mm,
    fanSize: fanSizeMm,
    airResistance: airResistance.describe('For one 120 mm or 140 mm section'),
    thermal: thermalResistance.describe('Whole loop, die to air'),
    source,
  }),
])
export type CoolerSpec = z.infer<typeof coolerSpec>

export const gpuSpec = z.object({
  id,
  name: z.string(),
  generic: z.boolean(),
  length: mm,
  height: mm,
  slots: z.number().min(1).max(4),
  idleWatts: watts,
  maxWatts: watts,
  /** open-air dumps heat into the case, blower out the back, flow-through partly out the top. */
  cooler: z.enum(['open-air', 'blower', 'flow-through']),
  /** The GPU's own fans. Not picked by the user, so their specs live here. */
  fanSize: z.union([z.literal(80), z.literal(92), z.literal(100), z.literal(120)]),
  fanCount: z.int().min(1).max(3),
  fanMaxFlowCfm: z.number().positive().describe('Free-air flow of one fan at full speed'),
  fanMaxPressureMmH2O: z.number().positive(),
  /** Fin stack resistance. */
  airResistance,
  thermal: thermalResistance.describe('Die to air, including the GPU’s own cooler'),
  /** GPU fan speed at idle and at full load, 0 to 1. */
  fanSpeedIdle: fraction,
  fanSpeedMax: fraction,
  source,
})
export type GpuSpec = z.infer<typeof gpuSpec>

/* ---------- the build: everything the user picks ---------- */

export const fanDirection = z.enum(['intake', 'exhaust'])
export const coolerFanMode = z.enum(['push', 'pull', 'push-pull'])

export const placedFan = z.object({
  mountId: id,
  slot: z.int().min(0),
  fanId: id,
  direction: fanDirection,
  speed: fraction,
})
export type PlacedFan = z.infer<typeof placedFan>

export const loadPreset = z.enum(['idle', 'browsing', 'gaming', 'rendering', 'stress', 'custom'])
export type LoadPreset = z.infer<typeof loadPreset>

export const placement = z.enum(['desk', 'floor', 'carpet', 'near-wall'])

export const buildSpec = z.object({
  /** Bump when the shape changes. Old share links must keep opening. */
  version: z.literal(1),
  name: z.string().max(60).default('My build'),
  caseId: id,
  /** Overrides for the case's default panels, for example a removed side panel. */
  panels: z.partialRecord(casePanel, panelSurface).default({}),
  /** Filter on or off per mount, overriding the case default. */
  filters: z.record(id, z.boolean()).default({}),
  fans: z.array(placedFan),
  cpuId: id,
  cooler: z.object({
    coolerId: id,
    fanId: id,
    fanMode: coolerFanMode.default('push'),
    fanSpeed: fraction,
    /** AIO only: which mount the radiator sits on. */
    radiatorMountId: id.optional(),
  }),
  gpuId: id,
  load: z.object({ preset: loadPreset, cpu: fraction, gpu: fraction }),
  roomC: z.number().min(10).max(40).default(22),
  placement: placement.default('desk'),
})
export type BuildSpec = z.infer<typeof buildSpec>
