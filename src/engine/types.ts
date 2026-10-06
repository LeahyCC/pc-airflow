/*
 * The contract between the build layer and the physics engine.
 * docs/engine.md has the maths behind every field.
 *
 * The engine knows nothing about PCs. It sees a box of cubic cells, some of
 * them solid, plus fans, porous blocks and heat sources. Everything here is
 * SI (metres, seconds, pascals, watts, kelvin or °C) and cell indices.
 * The build layer (`src/build/`) does all PC-specific conversion.
 */

/** Cell index on the grid: [i, j, k] along x, y, z. */
export type Cell = readonly [number, number, number]

/** Axis-aligned box of cells, `min` inclusive, `max` exclusive. */
export interface CellBox {
  min: Cell
  max: Cell
}

export type Axis = 'x' | 'y' | 'z'
/** +1 pushes air towards the positive end of the axis, -1 the other way. */
export type AxisSign = 1 | -1

/** What each cell is. Stored as one byte per cell on the GPU. */
export const CellType = {
  /** Air inside or around the case. */
  Air: 0,
  /** Air touches it and stops (no-slip). */
  Solid: 1,
  /** Outer edge of the domain: room air at rest at room temperature. */
  Open: 2,
} as const
export type CellType = (typeof CellType)[keyof typeof CellType]

/** A fan as a thin slab of cells that pushes air. */
export interface FanSource {
  id: string
  /** Centre of the fan disk, in cells (can be fractional). */
  centre: readonly [number, number, number]
  axis: Axis
  sign: AxisSign
  diameterM: number
  /** Hub diameter as a fraction of the fan diameter. The hub pushes no air. */
  hubRatio: number
  /** Fan curve at full speed: flow (m³/s) against pressure rise (Pa), flow ascending. */
  curve: readonly { flowM3s: number; pressurePa: number }[]
  /** 0 to 1. 0 means stopped: the fan becomes a porous block. */
  speed: number
}

/** A block that slows air down: mesh panel, filter, heatsink fins, radiator. */
export interface PorousRegion {
  id: string
  box: CellBox
  /**
   * Pressure-loss coefficient K per metre of block depth, along each axis.
   * Pressure drop over depth L at speed u is K·L·½ρu². A very large value on
   * an axis blocks flow that way (fins only let air through along channels).
   */
  lossPerM: { x: number; y: number; z: number }
}

/** Heat put into the air, spread evenly over a box. */
export interface HeatSource {
  id: string
  box: CellBox
  watts: number
}

/** A box we want measurements from (a heatsink's inlet face, a vent). */
export interface Probe {
  id: string
  box: CellBox
  /** For flow measurement through the box, the face normal. */
  axis?: Axis
}

export interface SimScene {
  /** Number of cells along x, y, z. */
  size: readonly [number, number, number]
  /** Edge length of one cubic cell in metres. */
  cellM: number
  /** One CellType per cell, x fastest, then y, then z: index = i + nx·(j + ny·k). */
  cells: Uint8Array
  fans: readonly FanSource[]
  porous: readonly PorousRegion[]
  heat: readonly HeatSource[]
  probes: readonly Probe[]
  roomC: number
  /** Benchmark tests only. The app never sets this. See docs/engine.md, "Test options". */
  test?: SimTestOptions
}

export interface SimTestOptions {
  /** Wrap around on these axes instead of hitting the domain edge. */
  periodic?: { x?: boolean; y?: boolean; z?: boolean }
  /** Uniform push on all air, m/s². Drives flow in pipe tests. */
  bodyForceMs2?: readonly [number, number, number]
  /** Fix the time step instead of deriving it from the 5 m/s reference speed. */
  dtS?: number
  /** Turn the turbulence model off for laminar benchmarks. Default true. */
  smagorinsky?: boolean
  /** Hold these cells at a fixed temperature (heated and cooled walls). */
  fixedTemperature?: readonly { box: CellBox; c: number }[]
}

export interface ProbeReading {
  id: string
  /** Mean air temperature in the box, °C. */
  meanC: number
  /** Volume flow through the box along its axis, m³/s, signed. Only if the probe has an axis. */
  flowM3s?: number
  /** Mean air speed in the box, m/s. */
  meanSpeedMs: number
}

export interface FanReading {
  id: string
  /** Flow through the fan, m³/s, positive in the fan's push direction. */
  flowM3s: number
  /** Pressure the fan is making at that flow, Pa. */
  pressurePa: number
}

export interface SimReadings {
  /** Simulated time so far, seconds. */
  simTimeS: number
  steps: number
  /** True once readings stopped changing (docs/engine.md, "When it has settled"). */
  settled: boolean
  /** 0 to 1, a best guess for a progress bar. */
  progress: number
  probes: ProbeReading[]
  fans: FanReading[]
  /** Heat carried out through the open boundary, W. Should equal total heat in once settled. */
  heatOutW: number
}

/** GPU textures the view samples directly. Never copied back to the CPU. */
export interface SimFields {
  /** rgba16float 3D texture, one texel per cell: xyz = velocity m/s, w = temperature °C. */
  velocityTemperature: GPUTexture
}

export interface Engine {
  /** Load a scene. Replaces the old one and starts from still air at room temperature. */
  load(scene: SimScene): void
  /** Change fan speeds or heat without restarting, so sliders feel live. */
  update(changes: { fanSpeeds?: Record<string, number>; heatWatts?: Record<string, number> }): void
  /** Advance the simulation. Call once per animation frame. */
  step(steps: number): void
  /** Copy readings back from the GPU. Async, call a few times a second at most. */
  read(): Promise<SimReadings>
  /** Write the current fields into the shared textures for the view. */
  fields(): SimFields
  dispose(): void
}

export type EngineQuality = 'preview' | 'normal'

/** Cell size per quality. */
export const CELL_M: Record<EngineQuality, number> = {
  preview: 0.01,
  normal: 0.005,
}
