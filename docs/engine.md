# Engine spec

How the physics works, exactly enough to build it. The engine lives in `src/engine/` and its contract is `src/engine/types.ts`. It knows nothing about PCs: it gets a `SimScene` (cells, fans, porous blocks, heat sources, probes) and returns readings and GPU textures. Turning a PC build into a scene is [scene.md](scene.md).

## In plain words

```
 every step (about 10,000 per simulated second):

  ┌─ air step ───────────────────────────────┐   ┌─ heat step ─────────────────────┐
  │ each cube pulls air from its neighbours  │──►│ heat moves with the air,         │
  │ walls bounce it back                     │   │ spreads a little, and parts      │
  │ fans push, mesh and fins hold back,      │   │ add their watts                  │
  │ warm air floats up                       │   │                                  │
  └──────────────────────────────────────────┘   └──────────────────────────────────┘

 every 20 steps:  measure flow through each fan, update its push from the fan curve
 every 0.25 s of sim time:  read probes back to the CPU, check if it has settled
```

## Units and scaling

Everything outside the engine is SI. Inside, the GPU works in lattice units: cell size = 1, time step = 1.

| Symbol  | Meaning                       | Value                                                    |
| ------- | ----------------------------- | -------------------------------------------------------- |
| `dx`    | cell size                     | 0.005 m (normal), 0.01 m (preview)                       |
| `U_ref` | fastest air we expect         | 5 m/s                                                    |
| `u_max` | lattice speed `U_ref` maps to | 0.1                                                      |
| `dt`    | time step                     | `u_max · dx / U_ref` = 1e-4 s (normal), 2e-4 s (preview) |

Conversions, with `ρ0` the air density:

| Quantity                 | Physical to lattice                                      |
| ------------------------ | -------------------------------------------------------- |
| speed                    | `u_lat = u · dt / dx`                                    |
| kinematic viscosity      | `ν_lat = ν · dt / dx²`                                   |
| force per volume (N/m³)  | `f_lat = f / ρ0 · dt² / dx`                              |
| pressure difference (Pa) | `Δp_lat = Δp / ρ0 · dt² / dx²` (and `p_lat = ρ_lat / 3`) |

Air properties, fixed:

| Property                        | Value               |
| ------------------------------- | ------------------- |
| density `ρ0`                    | 1.18 kg/m³          |
| kinematic viscosity `ν`         | 1.56e-5 m²/s        |
| heat capacity `cp`              | 1006 J/(kg·K)       |
| thermal diffusivity `α`         | 2.2e-5 m²/s         |
| expansion coefficient `β`       | 3.4e-3 1/K          |
| turbulent Prandtl number `Pr_t` | 0.85                |
| gravity                         | 9.81 m/s², along -y |

Unit conversions for spec sheets: 1 CFM = 4.7195e-4 m³/s, 1 mmH2O = 9.80665 Pa.

## GPU memory

| Buffer       | Per cell                                           | Notes                                                                    |
| ------------ | -------------------------------------------------- | ------------------------------------------------------------------------ |
| `fA`, `fB`   | 19 × f32 each                                      | Air populations, ping-pong. Layout `f[q·N + cell]` (structure of arrays) |
| `cellType`   | u32 (packed 4 cells per word) or u8 via bit tricks | From `SimScene.cells`                                                    |
| `region`     | u32                                                | Index into a small table of fans and porous regions, 0 = none            |
| `macro`      | vec4 f32                                           | `ux, uy, uz, ν_t` from the air step, read by the heat step               |
| `TA`, `TB`   | f32 each                                           | Temperature °C, ping-pong                                                |
| `heatRate`   | f32                                                | °C added per step, from heat sources                                     |
| view texture | rgba16float 3D                                     | `ux, uy, uz, T`, filterable, for the view                                |

Cell index: `cell = i + nx · (j + ny · k)`. A mid tower at 5 mm is about 1 million cells, so each `f` buffer is about 76 MB. On init, request the adapter's `maxStorageBufferBindingSize` and `maxBufferSize` instead of the defaults. If the scene still doesn't fit, fall back to preview quality and say so in the UI.

## Air step

Lattice Boltzmann, D3Q19, one fused kernel per step: pull-stream, then collide. Workgroup size 64 on a flat cell index.

**Velocities and weights.** The rest velocity has weight 1/3, the 6 axis neighbours 1/18 each, the 12 edge neighbours 1/36 each. Speed of sound squared is 1/3.

**Equilibrium.**

```
f_eq_q(ρ, u) = w_q · ρ · (1 + 3 (c_q·u) + 4.5 (c_q·u)² − 1.5 u·u)
```

**Streaming (pull).** For each Air cell `x` and direction `q`, read `f_q` from neighbour `x − c_q` in the previous buffer:

- neighbour is **Air**: take its `f_q`.
- neighbour is **Solid**: halfway bounce-back. Take this cell's own `f_opp(q)` from the previous buffer.
- neighbour is **Open**: take `f_eq_q(1, u_x)` where `u_x` is this cell's velocity from the last step (stored in `macro`). Open cells act as still room air at normal pressure, and air can leave through them without bouncing back.
- with `test.periodic` on an axis, wrap around.

Solid and Open cells are never updated.

**Moments.** `ρ = Σ f_q`, then velocity with the Guo force correction:

```
u = (Σ f_q c_q + F / 2) / ρ
```

`F` is the total force on the cell (fans + porous drag + buoyancy + test body force), in lattice units. Porous drag is special, see below.

**Turbulence (Smagorinsky).** At 5 mm cells, real air's viscosity gives a relaxation time a hair above 0.5, which is unstable. The turbulence model adds viscosity where the flow is sheared, computed locally:

```
τ0     = 3 ν_lat + 0.5
Π_αβ   = Σ_q c_qα c_qβ (f_q − f_eq_q)          non-equilibrium stress, 6 unique terms
Q      = sqrt(Σ_αβ Π_αβ²)
τ_eff  = (τ0 + sqrt(τ0² + 18 · √2 · Cs² · Q / ρ)) / 2        Cs = 0.16
ν_t    = (τ_eff − τ0) / 3                       stored in macro.w for the heat step
```

With `test.smagorinsky = false`, use `τ_eff = τ0`.

**Collision (BGK with Guo forcing).**

```
f_q* = f_q − (f_q − f_eq_q(ρ, u)) / τ_eff + S_q
S_q  = (1 − 1 / (2 τ_eff)) · w_q · [ 3 (c_q − u) + 9 (c_q·u) c_q ] · F
```

Write `f_q*` to the other buffer and `u, ν_t` to `macro`.

**Safety.** Clamp `|u|` to 0.25 before computing the equilibrium. If any cell's `ρ` leaves 0.8 to 1.2, flag the run as unstable (a single atomic flag, read back with the probes) and the app drops to a smaller time step.

## Buoyancy

Boussinesq: warm air gets a push upwards, the rest of the air is treated as constant density.

```
F_y (physical, per kg) = β · (T − T_room) · 9.81
F_y (lattice)          = β · (T − T_room) · 9.81 · dt² / dx
```

Uses the temperature from the previous heat step.

## Fans

A fan is a thin slab of cells that pushes air along its axis. It's called an actuator disk.

**Cells.** Every Air cell whose centre is within the fan's thickness (2 cells along the axis, centred on `centre`) and between `hubRatio · D/2` and `D/2` from the axis. The build layer makes the hub and the square frame around the disk Solid, so the engine only sees the ring.

**Flow.** Every 20 steps a reduction kernel sums the flow through the ring, averaged over its 2 layers:

```
Q = Σ (u · axis · sign) · dx² / 2        m³/s, positive in the push direction
Q_used = 0.8 · Q_used + 0.2 · Q          smooths out wobble
```

**Pressure from the fan curve.** The curve is at full speed. At speed `s`, the fan laws scale it: flow by `s`, pressure by `s²`.

```
Δp(Q, s) = s² · Δp_full(Q / s)
```

`Δp_full` is linear interpolation between the curve points. Below the first point use the first point's pressure. Past the last point, extend the last segment's slope down to a floor of `−P_max` (an overdriven fan acts as a resistance).

When a fan has no measured curve, the build layer creates one with this standard shape, from max pressure `P_max` and max flow `Q_max`, sampled at 11 points:

```
Δp_full(Q) = P_max · (1 − (Q / Q_max)²)
```

**Force.** Spread `Δp` evenly over the ring's volume:

```
force per volume = Δp / (2 · dx)    along axis · sign
lattice          = Δp / (2 · dx) / ρ0 · dt² / dx
```

**Stopped fans** (`speed = 0`) push nothing and act as a porous block with loss coefficient K = 4 over their thickness.

`update({ fanSpeeds })` changes `s` without resetting anything.

## Porous blocks

Mesh panels, filters, heatsink fins and radiators are too fine to draw in 5 mm cubes, so they slow the air down instead. The pressure drop over depth `L` at speed `u` is `K · L · ½ ρ u²`, with `K` per metre given per axis in `lossPerM`.

A large `lossPerM` (say 1e6) on an axis means "air can't go this way" (fins only let air through between the plates). Explicit drag with values that big would blow up, so it's applied implicitly, which is stable for any `K`:

```
u_bare = (Σ f_q c_q + F_other / 2) / ρ           velocity before drag
for each axis a:
  k_a   = ½ · lossPerM_a · dx · |u_bare|          dimensionless, lattice units
  u_a   = u_bare_a / (1 + k_a / 2)                velocity after drag
F_drag  = 2 ρ (u − u_bare)                        the force that gives that velocity (= −ρ k u)
F       = F_other + F_drag                        used in the collision source term
```

## Heat step

Finite volume, explicit, one kernel per step after the air step. Temperature `T` is in °C per cell. Using the flux form keeps energy exact: what leaves one cell enters its neighbour.

For each Air cell, over its 6 faces:

```
u_f   = average of the two cells' velocity along the face normal (0 if either is Solid)
T_f   = upwind face temperature, second order with a van Leer limiter
        (falls back to first-order upwind next to Solid or Open cells)
α_f   = α_lat + average of the two cells' ν_t / Pr_t,   clamped to 0.15
T_new = T − Σ_faces (u_f · T_f · n)                 advection
          + Σ_faces α_f · (T_neighbour − T)          diffusion, 0 across Solid faces
          + heatRate                                 sources
```

all in lattice units (`α_lat = α · dt / dx²`, `u` from `macro`).

- **Solid faces:** no flux. Case walls are treated as perfect insulators, so results come out slightly warm, which is the safe side.
- **Open cells:** fixed at room temperature. Air flowing in from outside is at room temperature, hot air flowing out carries its heat away.
- **Heat sources:** `heatRate = watts · dt / (ρ0 · cp · cellsInBox · dx³)` added to every Air cell in the box. `update({ heatWatts })` rewrites it without a restart.
- **Fixed temperature** (tests only): reset those cells to `c` after every step.

**Heat out**, for the energy check, summed over every face between an Air cell and an Open cell:

```
heatOutW = Σ ρ0 · cp · u_n · (T_f − T_room) · dx²         physical units, u_n outwards
```

## Probes and readback

One reduction kernel per probe box (and per fan ring) writes into a small results buffer:

- `meanC`: mean temperature over Air cells in the box
- `meanSpeedMs`: mean speed
- `flowM3s`: if the probe has an axis, flow along it averaged over the box's slices along that axis

`read()` copies the results buffer to a mapped staging buffer. Never call it more than about 4 times a second. The 3D fields never come back to the CPU; `fields()` runs a small kernel that writes `macro` and `T` into the rgba16float view texture.

## When it has settled

Every 0.25 s of simulated time, record every probe's `meanC` and every fan's flow.

- **Settled** when, over the last 1 s of sim time, no probe moved more than 0.1 °C and no fan flow moved more than 1%, and at least 3 air swaps have passed (`simTime ≥ 3 · caseVolume / total fan intake flow`, given by the build layer as a hint).
- **Progress** for the bar: `min(simTime / (3 swaps + 1 s), 0.95)` until settled, then 1.
- **Gave up** after 30 s of sim time: `settled` stays false and the app warns "didn't fully settle".

## Steps per frame

Aim for about 12 ms of GPU work per animation frame so the page stays smooth. Time each batch with `queue.onSubmittedWorkDone()` and adjust the number of steps (1 to 200) up or down. Keep each batch in one command encoder.

## Speed expectations

| Quality        | Mid tower cells | Steps to settle | Mid-range GPU    |
| -------------- | --------------- | --------------- | ---------------- |
| preview, 10 mm | ~120k           | ~20k at 2e-4 s  | a few seconds    |
| normal, 5 mm   | ~1M             | ~40k at 1e-4 s  | 20 to 60 seconds |

If normal quality is too slow in practice, the first fixes are: 16-bit storage for `f` (FluidX3D does this), and a larger time step for the heat step only.

## Test options

`SimScene.test` exists only so the benchmarks below can run on the real engine. The app never sets it.

| Option             | Effect                                                         |
| ------------------ | -------------------------------------------------------------- |
| `periodic`         | Wrap streaming and heat flux around that axis                  |
| `bodyForceMs2`     | Add this acceleration to every Air cell (converted to lattice) |
| `dtS`              | Use this time step instead of `u_max · dx / U_ref`             |
| `smagorinsky`      | `false` turns the turbulence model off                         |
| `fixedTemperature` | Hold boxes at a temperature, for heated and cooled walls       |

## Benchmarks

These run with Vitest in Node through the `webgpu` npm package (Dawn), against the same WGSL the browser uses. Each has a known right answer.

| #   | Test                | Setup                                                                                                                                                      | Pass                                                                                                                                                      |
| --- | ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| B1  | Flow between plates | 32 cells between two Solid plates, periodic in x and z, body force along x, `dtS` chosen so `τ0 = 0.8`, no turbulence model                                | Steady profile within 1% of `u(y) = g/(2ν) · y (H − y)` at its peak. `H` is the number of air cells, since bounce-back walls sit half a cell outside them |
| B2  | Square duct         | 32 × 32 duct, periodic along it, body force, no turbulence model                                                                                           | Flow within 2% of `Q = 0.4217 · a⁴ · g / (12 ν)`                                                                                                          |
| B3  | Heated cavity       | Square cavity, one wall 5 °C above room and one 5 °C below (fixed temperature), periodic and 2 cells thin in z, size and `dtS` set for Rayleigh number 1e4 | Average Nusselt number on the hot wall within 3% of 2.243 (de Vahl Davis, 1983)                                                                           |
| B4  | Fan against a mesh  | Duct with Open ends, one fan, one mesh porous block with known K                                                                                           | Fan flow within 5% of where the fan curve meets `Δp = K · ½ ρ (Q / A)²`                                                                                   |
| B5  | Heat in = heat out  | Box with Open vents, one fan, one 100 W heat source                                                                                                        | Once settled, `heatOutW` within 3% of 100 W                                                                                                               |
| B6  | Warm air rises      | Still closed box, small heater at the bottom                                                                                                               | Top layer mean temperature above bottom layer after 5 s                                                                                                   |
| B7  | Stopped fan         | B4 with fan speed 0                                                                                                                                        | Flow near 0, no instability flag                                                                                                                          |

For B3, the Nusselt number is the average over the hot wall of `−(dT/dx) · H / ΔT`, using the first cell layer next to the wall.

If Dawn can't find a GPU (GitHub's runners have none), the benchmark file skips with a clear message. Benchmarks are `npm run test:physics`, separate from `npm run check`, and must pass locally before any engine PR is merged.
