# Scene and results spec

The PC knowledge. This is the service layer in `src/build/`: it turns a `BuildSpec` into a `SimScene` for the engine ([engine.md](engine.md)), and turns engine readings into the numbers and warnings the user sees. All the PC rules live here and nowhere else.

```
 BuildSpec + data files
        │
        ▼
 src/build/scene.ts    build → SimScene      (geometry, fans, porous, heat, probes)
        │
        ▼
 engine (GPU)          SimScene → SimReadings
        │
        ▼
 src/build/results.ts  readings → Results    (part temps, pressure, noise, warnings)
```

Every number below marked _estimate_ is a starting guess to tune later against OpenFOAM runs and user-measured temps (TODO tasks T23 and T24).

## Coordinates

Same as the data files: millimetres, seen from the front. `x` left to right, `y` bottom to top, `z` front to back. Origin is the case's bottom-left-front inside corner. Cell `(i, j, k)` covers `[i·dx, (i+1)·dx)` and so on, after shifting by the outside margin.

Round every box to whole cells. A box smaller than one cell along an axis still gets one cell.

## The domain

```
   side view (x hidden)                 Open  = still room air
  ┌───────────── Open ─────────────┐    Solid = blocks air
  │                                │
  │   ┌──────── case ─────────┐    │    margin 60 mm on every side,
  │ O │                       │ O  │    except the bottom:
  │ p │                       │ p  │      bottom of domain = desk or floor (Solid),
  │ e │                       │ e  │      case sits on 20 mm feet
  │ n └───────────────────────┘ n  │
  │      feet gap 20 mm            │
  └████████ desk / floor ██████████┘
```

- Case inside size from the case file, plus 1 cell of wall on every side.
- **Margin:** 60 mm of air all round, outermost layer `Open`.
- **Floor:** the bottom layer is `Solid` (desk or floor). The case sits on 20 mm feet, as an air gap.

**Placement** (`build.placement`, v2, task T20):

| Placement   | Change                                                                                    |
| ----------- | ----------------------------------------------------------------------------------------- |
| desk, floor | as above                                                                                  |
| carpet      | fill the 20 mm feet gap with Solid, so bottom intakes are blocked                         |
| near-wall   | a Solid wall 50 mm behind the rear panel, filling the full height and width of the domain |

## Case walls and panels

Each panel is 1 cell thick, on the outside of the inside box. What the cells become depends on the panel surface (case default, overridden by `build.panels`; a missing panel is solid):

| Surface      | Cells                                                                                                                      |
| ------------ | -------------------------------------------------------------------------------------------------------------------------- |
| solid, glass | Solid                                                                                                                      |
| removed      | Air                                                                                                                        |
| mesh         | Air, porous along the panel's normal axis and the two others, `lossPerM = K / dx`, with `K = (1 / (0.62 · openArea) − 1)²` |

**Fan mount slots.** Every slot (with or without a fan) is a hole in the panel the size of the slot's fan: Air cells, porous with mesh `openArea` 0.8, even on a solid or glass panel. A slot with a filter (the mount default, overridden by `build.filters`) adds `K = 2` (_estimate_) on top.

## Fans in mounts

For each `build.fans` entry:

- **Centre:** the mount's `firstSlotCentre`, moved `slot · slotSpacing` along `slotAxis`, then moved inwards so the fan sits just inside the panel (fan thickness 25 mm).
- **Axis:** the panel's normal. **Sign:** intake points into the case, exhaust points out.
- **Diameter:** fan size × 0.95 (the frame takes the rest). **Hub ratio:** 0.35.
- **Frame:** the square of the fan's size around the disk, 25 mm deep, minus the ring, is Solid. The hub disk is Solid.
- **Curve:** the fan file's `curve`, or the standard shape from `maxFlowCfm` and `maxPressureMmH2O` (engine.md, "Fans"), converted to m³/s and Pa.
- **Speed:** `placedFan.speed`.

A fan whose size isn't in the mount's `fanSizes`, or two fans in one slot, is a build error. Show it in the UI rather than simulating.

## Motherboard

A Solid slab 2 cells thick, on the right side (high `x`), 15 mm in from the right wall (standoffs). Top edge 20 mm below the inside top, rear edge against the rear panel.

| Form factor | Size along y × z (mm) | CPU socket centre, from the board's top-rear corner (down, forwards) |
| ----------- | --------------------- | -------------------------------------------------------------------- |
| e-atx       | 330 × 305             | 75, 115                                                              |
| atx         | 305 × 244             | 75, 115                                                              |
| micro-atx   | 244 × 244             | 75, 115                                                              |
| mini-itx    | 170 × 170             | 75, 85                                                               |

The build uses the largest form factor in the case's `motherboards` list that is no bigger than ATX. Socket positions are _estimates_ of typical boards.

## CPU cooler

**Tower** (`type: tower`):

```
   top view (y hidden)           fins: porous box
      rear ▲ z                   air enters the front face and leaves the back
           │                     plates are horizontal, so air can't move along y
   ┌──────────────┐ board
   │  ┌────────┐  │
   │  │  fins  │◄─┼── fromBoard (x)
   │  └────────┘  │
   │   [ fan ]    │  push: fan on the front face, blowing +z
   └──────────────┘
```

- Fin box: centred on the socket in `y` and `z`, from `baseGap` to `baseGap + fromBoard` out from the board (towards low `x`), `across` tall in `y`, `alongAirflow` deep in `z`.
- Base: a Solid block 40 × 40 mm by `baseGap` deep on the socket.
- Fin box porosity: from `airResistance` (`Δp_ref` at `Q_ref`). The face area `A = fromBoard × across`, `u_ref = Q_ref / A`, `K = 2 · Δp_ref / (ρ0 · u_ref²)`. `lossPerM`: `z = K / alongAirflow`, `x = z`, `y = 1e6` (blocked).
- Fans: `fanCount` fans of `build.cooler.fanId`, speed `build.cooler.fanSpeed`, axis `z`, sign `+1`. `push` puts the fan on the front face, `pull` on the back face, `push-pull` both. Centred on the fin box's face.
- Heat source: the fin box, `cpuWatts`.
- Probes: `cpu-inlet` is the cell layer just in front of the fin box (axis `z`). `cpu-fins` is the fin box itself (axis `z`), for flow.

**Low-profile and top-down:** fin box flat against the board, fans on the outer face blowing towards the board (axis `x`, sign `+1`). `lossPerM`: `x = K / fromBoard`, `y` and `z` = `x` (air spreads out sideways). Inlet probe is the layer just outside the fans.

**AIO** (`type: aio`, v2, task T18): pump block is a Solid 60 × 60 × 40 mm box on the socket with no heat. The radiator is a porous box on `build.cooler.radiatorMountId`, `radiatorLength` long along the mount's `slotAxis`, the fan size wide, `radiatorThickness` deep, just inside the panel. The fans in that mount push through it. `lossPerM` along the panel normal = `K / radiatorThickness`, using `airResistance` per section times the number of sections, others blocked. Heat source: the radiator box, `cpuWatts`. Inlet probe: the cell layer on the upstream side, which depends on fan direction.

## GPU

The card hangs horizontally in the first PCIe slot, fans facing down.

```
   side view from the left (x hidden)
         front ◄────────── z ──────────► rear
   ┌──────────────── length ─────────────────┐ ◄ rear bracket at the rear panel
   │ PCB + backplate                 (Solid) │
   │ fin stack                     (porous)  │  thickness = slots × 20 mm
   │   (fan)      (fan)      (fan)           │  fans blow up into the fins
   └─────────────────────────────────────────┘
```

- Top of the card: 160 mm below the board's top edge (ATX and micro-ATX), 140 mm on mini-ITX. _Estimate._
- `x`: from the board out to `height` mm (towards low `x`). `z`: from the rear panel forwards by `length`. `y`: `slots × 20` mm thick, hanging below the top.
- PCB: the top 1 cell layer is Solid.
- Fans: `fanCount` fans, size `fanSize`, evenly spaced along the card's length, on the bottom face, axis `y`, sign `+1`. Curve from `fanMaxFlowCfm` and `fanMaxPressureMmH2O`. Speed `fanSpeedIdle + (fanSpeedMax − fanSpeedIdle) · gpuLoad`.
- Fin stack: the rest of the box, porous, `K` from `airResistance` over the bottom face area.
- Heat source: the fin stack, `gpuWatts`.
- Probes: `gpu-inlet` is the cell layer just under the fans (axis `y`), `gpu-fins` is the fin stack (axis `y`).

By cooler style:

| Style        | Fins `lossPerM`                            | Other changes                                                                                                                                 |
| ------------ | ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| open-air     | `y` and `x` = `K / thickness`, `z` blocked | Hot air leaves out the sides of the card into the case                                                                                        |
| blower       | `z` = `K / length`, `x` and `y` blocked    | One fan only, at the front end. Rear bracket: the rear panel cells behind the card become mesh with `openArea` 0.5, so heat goes out the back |
| flow-through | as open-air                                | The front-most third of the card has no PCB layer, so air also passes straight up there                                                       |

## PSU

v1: bottom PSU under a shroud.

- **Shroud** (if `psu.shroud`): a Solid plate 1 cell thick at `y = shroudHeight`, full width, from the rear panel forwards to 60% of the case depth. The space under it is Air but nothing else goes there in v1.
- **PSU:** Solid box 150 × 86 × 160 mm (x × y × z), bottom-rear corner on the left side. No heat and no fan in v1.
- Top PSU and PSU fan direction are v2 (task T19).

## Room and load

- `SimScene.roomC = build.roomC`.
- Power:

  ```
  cpuWatts = cpu.idleWatts + (cpu.maxWatts − cpu.idleWatts) · load.cpu
  gpuWatts = gpu.idleWatts + (gpu.maxWatts − gpu.idleWatts) · load.gpu
  ```

- Presets set `load.cpu` and `load.gpu`. Moving either slider by hand switches the preset to `custom`:

  | Preset    | cpu  | gpu  |
  | --------- | ---- | ---- |
  | idle      | 0.05 | 0.05 |
  | browsing  | 0.15 | 0.10 |
  | gaming    | 0.50 | 0.90 |
  | rendering | 1.00 | 0.30 |
  | stress    | 1.00 | 1.00 |

- **Settling hint:** case volume (inside size) and the sum of intake fan free-air flows at their speeds go to the engine for its "3 air swaps" rule.

Changing only fan speeds, load or room temperature calls `engine.update` (or `load` for room temperature). Anything that moves geometry builds a new scene.

## Results

`src/build/results.ts` turns `SimReadings` into this:

```ts
interface Results {
  settled: boolean
  progress: number
  cpu: { c: number; inletC: number; flowCfm: number }
  gpu: { c: number; inletC: number; flowCfm: number }
  caseAirC: number // mean of a probe filling the case inside
  intakeC: number // room temperature
  exhaustC: number // flow-weighted mean over exhaust fans
  pressure: 'positive' | 'neutral' | 'negative'
  intakeCfm: number
  exhaustCfm: number
  noiseDbA: number
  warnings: Warning[]
}
```

**Part temperatures.** The cooler only knows how warm the air reaching it is and how much air goes through it:

```
R_cooler(Q) = R_ref · (Q_ref / max(Q, 0.1 · Q_ref))^0.6        R_ref, Q_ref from `thermal`
cpu.c       = cpu-inlet meanC + cpuWatts · (cpu.internalKPerW + R_cooler(cpu-fins flow))
gpu.c       = gpu-inlet meanC + gpuWatts · R_cooler(gpu-fins flow)
```

The 0.6 power is the usual forced-convection rule of thumb (_estimate_). The `0.1 · Q_ref` floor stands in for natural convection when fans are slow or stopped.

**Pressure.** Sum the measured flow through intake fans and through exhaust fans. Positive if intake > exhaust × 1.05, negative if exhaust > intake × 1.05, otherwise neutral.

**Noise.** Each fan at speed `s`: `L = noiseDbA + 50 · log10(max(s, 0.05))` (fan law: sound power goes with speed to the 5th). GPU fans use 32 dBA at full speed (_estimate_). Total: `10 · log10(Σ 10^(L / 10))`. Shown in v2 (task T22), computed from v1.

**Warnings,** plain English, at most 3, in this order:

| Rule                                                          | Message                                                           |
| ------------------------------------------------------------- | ----------------------------------------------------------------- |
| `settled` false after the engine gives up                     | "Didn't fully settle. Numbers may be off."                        |
| gpu-inlet ≥ room + 8 °C                                       | "Your GPU is breathing warm air (+N °C over room)."               |
| cpu-inlet ≥ room + 8 °C                                       | "Your CPU cooler is breathing warm air (+N °C over room)."        |
| a case fan's measured flow < 25% of `s · Q_max`, or backwards | "The [mount] fan is barely moving air. Something is fighting it." |
| pressure negative                                             | "More air out than in. Dust will get in through gaps."            |

## Compare

Compare runs two scenes. Run them one after the other on the same engine (A until settled, then B) rather than both at once, so each gets the whole GPU. Cache settled results by the build's share-link text so flipping back is instant.

Differences shown: CPU, GPU and case air temperature, noise, pressure. "B is 6 °C cooler on the GPU". Differences under 1 °C read as "about the same", since the model isn't that precise.
