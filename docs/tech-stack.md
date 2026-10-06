# PC Airflow: tech stack

Decided: everything runs in the user's browser, on their own graphics card. No server, no accounts, no running costs. Licence is MIT.

## The whole thing in one picture

```
 ┌─────────────────────────── browser ───────────────────────────┐
 │                                                               │
 │  React panels          build (one plain object)               │
 │  case, fans, parts ──► { case, fans, parts, load, room } ──┐  │
 │  load slider             │                                 │  │
 │                          ▼                                 │  │
 │                 share link (in the URL)                    │  │
 │                                                            ▼  │
 │  ┌──────── engine (runs on the GPU, WebGPU) ──────────────────┐│
 │  │ 1. turn the build into a 3D grid of little cubes          ││
 │  │ 2. move the air       (lattice Boltzmann, WGSL)           ││
 │  │ 3. move the heat      (heat rides the air)                ││
 │  │ 4. work out part temps from the air around them           ││
 │  └────────────────────────────┬──────────────────────────────┘│
 │                               ▼                                │
 │  Three.js view: heat slice, airflow streaks, temps panel       │
 └────────────────────────────────────────────────────────────────┘

 data/*.json  cases, fans, CPUs, GPUs, coolers (anyone can add one by PR)
```

## The stack

| Job         | Pick                                             | Why                                                                                                             |
| ----------- | ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| Language    | TypeScript, strict, no `any`                     | Same as Colin's other repos                                                                                     |
| Build tool  | Vite                                             | Fast, same as flylo                                                                                             |
| UI          | React + Tailwind                                 | Same as flylo-portal                                                                                            |
| 3D view     | Three.js (WebGPU renderer) via react-three-fiber | Most used 3D library on the web. It can share the GPU with the engine, so results never leave the graphics card |
| Engine      | Hand-written WGSL compute shaders                | The physics is the product, so we own it. No library does this in the browser                                   |
| App state   | Zustand                                          | Tiny, and the build stays one plain object that's easy to save and share                                        |
| Data checks | Zod                                              | Same as flylo. Checks every community-added case or fan file                                                    |
| Share links | Built-in browser compression, no library         | Build to text, compressed into the link                                                                         |
| Tests       | Vitest, plus the `webgpu` npm package            | Runs the real GPU shaders in Node, so physics tests run in CI                                                   |
| Formatting  | Prettier + ESLint                                | House rule                                                                                                      |
| Hosting     | GitHub Pages                                     | Free, lives with the repo                                                                                       |

`npm run check` runs types, lint, format check and tests, the same as flylo.

## The physics engine

This is the part that has to be right. Plain-words version first, then the details.

**Plain words:** we split the inside of the case into small cubes, about 5 mm each. Every cube knows how fast the air in it is moving and how hot it is. Many times a second, each cube passes air and heat to its neighbours. Fans push air, walls block it, mesh slows it down, and hot parts warm the air passing them. Run it until things settle, then read the temperatures.

**Details:**

| Piece                                   | Method                                                                                                    | Notes                                                                                                                                                                 |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Air                                     | Lattice Boltzmann, D3Q19, with a turbulence model (Smagorinsky)                                           | Every cube only talks to its neighbours, which suits a GPU perfectly. Already proven at 60fps in the browser by other projects. Fine for the slow airflow inside a PC |
| Heat in air                             | Finite-volume heat transport, using the air speeds from the step above                                    | Counts heat in and out exactly, so "heat in = heat out" can be tested. More robust than a second lattice when air is fast and heat spreads slowly                     |
| Hot air rising                          | Boussinesq buoyancy force                                                                                 | Matters most at idle with slow fans                                                                                                                                   |
| Fans                                    | "Actuator disk": a thin slab that pushes air, with force set by the fan curve                             | Fan curve from spec sheet (max airflow, max pressure). Fan speed scales it using the standard fan laws                                                                |
| Mesh, filters, heatsink fins, radiators | Porous blocks that slow the air                                                                           | Too small to model fin by fin at 5 mm. This is the standard trick in electronics cooling tools                                                                        |
| Case walls, GPU board, PSU shroud       | Solid cubes the air bounces off                                                                           |                                                                                                                                                                       |
| CPU and GPU temps                       | Heat goes into the air at the cooler's fins. Part temp = air temp at the fins + watts × cooler resistance | Avoids simulating minutes of metal heating up. Cooler resistance changes with how much air passes through                                                             |

**Speed check:** a mid tower plus the room air around it is about 1 million cubes at 5 mm. Air swaps out of a case in about 2 seconds, and settling takes a few swaps, so roughly 40,000 small steps. Expect well under a minute on a mid-range gaming GPU. While you drag things around, the 10 mm preview grid has 8 times fewer cubes and twice the step size, so it settles in a few seconds. Exact numbers are in [engine.md](engine.md).

## Proving the physics is right

"Real world" is only true if we test it. Each of these is an automated test with a known right answer. The full list with pass marks is in [engine.md](engine.md), "Benchmarks".

| Test                       | Checks                         | Compared to                     |
| -------------------------- | ------------------------------ | ------------------------------- |
| Air between two plates     | basic airflow                  | exact maths answer              |
| Air through a square duct  | airflow with corners           | exact maths answer              |
| Box heated on one side     | hot air rising                 | de Vahl Davis 1983 benchmark    |
| Heat in = heat out         | no heat lost or made up        | sum of part watts               |
| Fan pushing through a mesh | fan lands at the right airflow | fan curve meets mesh resistance |

Later: run a few builds through OpenFOAM once, offline, and compare. Then compare against real measured temps from users (feature 17).

## Code layout

```
 data/          cases, fans, cpus, gpus, coolers as JSON
 src/
   build/       the rules: turns a build into the grid, load into watts
   engine/      WGSL shaders and the code that runs them. No React, no Three
   view/        Three.js scene: case, slice, streaks
   ui/          React panels
   app/         the run loop that connects them
   lib/         small generic helpers (maths, colour map, compression)
 tests/physics  the benchmark tests above
```

The engine knows nothing about PCs. It only knows cubes, fans, heat sources and porous blocks. The `build/` layer holds all the PC knowledge. That keeps the physics testable on its own.

## Risks

| Risk                                                                       | Plan                                                                                                                    |
| -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| About 1 in 4 browsers has no WebGPU (mostly old Android and Linux Firefox) | Show a clear message listing browsers that work. Desktop gamers on Chrome, Edge or Safari are covered                   |
| react-three-fiber with the WebGPU renderer is newer than the WebGL path    | If it fights us, drop to plain Three.js inside one React component                                                      |
| GitHub's CI machines have no graphics card                                 | The `webgpu` package can fall back to a software GPU. If that's too slow, physics tests run locally before each release |
| Heatsinks as porous blocks are an estimate                                 | Tune against the OpenFOAM runs and user temps. Say so in the app                                                        |

## Not using, and why

| Option                                  | Why not                                                                                                        |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Server running OpenFOAM                 | Costs money per run, and needs a backend. Kept as an offline checking tool only                                |
| FluidX3D                                | Free only for non-commercial use, needs OpenCL, doesn't run in browsers                                        |
| Physics-informed AI models              | Need thousands of real simulations to train, and they're wrong in ways that are hard to spot. Maybe much later |
| WebGL instead of WebGPU                 | No proper compute shaders, so it'd be much slower and hackier                                                  |
| Physics libraries like Rapier or Cannon | They do solid objects bumping into each other, not air                                                         |
