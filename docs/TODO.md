# TODO

The work queue. Each task is written so a fresh session can pick it up with no handoff: read `AGENTS.md` for how to claim one, then the specs it names, then the task.

Sizes are rough days of focused work. A `todo` stays open until its **Done when** passes.

## v1: first public release

| ID  | Task                                   | Size | Needs                | Status |
| --- | -------------------------------------- | ---- | -------------------- | ------ |
| T1  | Generic data set                       | 0.5  | none                 | todo   |
| T2  | Share link encode and decode           | 0.5  | none                 | todo   |
| T3  | Build service and app state            | 1    | T1                   | todo   |
| T4  | Engine: air step and first benchmarks  | 3    | none                 | todo   |
| T5  | Engine: heat and buoyancy              | 2    | T4                   | todo   |
| T6  | Engine: fans and porous blocks         | 2    | T4                   | todo   |
| T7  | Engine: probes, settling, live updates | 1.5  | T5, T6               | todo   |
| T8  | Build to scene                         | 2    | T1, T3               | todo   |
| T9  | Results: temps, pressure, warnings     | 1    | T8                   | todo   |
| T10 | 3D view                                | 3    | T7, T8               | todo   |
| T11 | UI shell and sections                  | 2.5  | T3                   | todo   |
| T12 | Wire it all together                   | 1.5  | T7, T8, T9, T10, T11 | todo   |
| T13 | Compare A vs B                         | 1.5  | T12                  | todo   |
| T14 | Share button and shared links          | 0.5  | T2, T12              | todo   |
| T15 | First public release                   | 0.5  | T13, T14             | todo   |

## v2

| ID  | Task                        | Size | Needs      | Status |
| --- | --------------------------- | ---- | ---------- | ------ |
| T16 | Real cases                  | 2    | T15, Colin | todo   |
| T17 | Real fan models             | 1    | T15        | todo   |
| T18 | AIO radiators and push/pull | 1.5  | T15        | todo   |
| T19 | PSU options                 | 1    | T15        | todo   |
| T20 | Where the case sits         | 0.5  | T15        | todo   |
| T21 | Export a comparison image   | 1    | T15        | todo   |
| T22 | Show the noise estimate     | 0.25 | T15        | todo   |

## Later

| ID  | Task                                  | Size | Needs | Status |
| --- | ------------------------------------- | ---- | ----- | ------ |
| T23 | Check against OpenFOAM and tune       | 3    | T15   | todo   |
| T24 | Users report real temps               | 1    | T15   | todo   |
| T25 | Fans that speed up when parts get hot | 1.5  | T15   | todo   |
| T26 | Find the best layout                  | 2    | T15   | todo   |
| T27 | Engine speed-ups                      | 2    | T15   | todo   |

---

## T1 · Generic data set

**Touches:** `data/**`, `docs/features.md` (case table)

**Why.** v1 runs on generic parts only. The repo has one of each as a sample.

**Do.** Add these files, following [data.md](data.md). Mount centres: centre each row on its panel, fans just inside the panel, and keep clear of the PSU and shroud.

Cases:

| id                   | inside w × h × d | mounts                                                                                  | panels                                                   | PSU                   |
| -------------------- | ---------------- | --------------------------------------------------------------------------------------- | -------------------------------------------------------- | --------------------- |
| `generic-mini-itx`   | 200 × 320 × 360  | front 2 × 120, top 2 × 120, rear 1 × 120                                                | front mesh 0.65, top mesh 0.6, rear mesh 0.5, left glass | bottom, no shroud     |
| `generic-micro-atx`  | 210 × 400 × 400  | front 3 × 120, top 2 × 120, rear 1 × 120, bottom 2 × 120 (front half, clear of the PSU) | as mini-itx                                              | bottom, no shroud     |
| `generic-mid-tower`  | exists           |                                                                                         |                                                          |                       |
| `generic-full-tower` | 240 × 540 × 500  | front 3 × 140, top 3 × 140, rear 1 × 140                                                | front mesh 0.7, top mesh 0.6, rear mesh 0.5, left glass  | bottom, shroud 100 mm |

Fans (`generic-80` and so on): 80 mm 2500 rpm 30 CFM 1.8 mmH2O 28 dBA · 92 mm 2200 rpm 40 CFM 2.0 mmH2O 28 dBA · 140 mm 1500 rpm 75 CFM 1.8 mmH2O 30 dBA · 200 mm 800 rpm 100 CFM 1.0 mmH2O 26 dBA.

CPUs: `generic-65w` (idle 15, max 88, internal 0.15) · `generic-170w` (idle 30, max 230, internal 0.12) · `generic-253w` (idle 30, max 253, internal 0.12).

Coolers:

| id                       | type        | fins fromBoard, across, alongAirflow, baseGap | fans    | airResistance  | thermal           |
| ------------------------ | ----------- | --------------------------------------------- | ------- | -------------- | ----------------- |
| `generic-dual-tower-140` | tower       | 130, 140, 110, 30                             | 2 × 140 | 35 Pa @ 60 CFM | 0.10 K/W @ 60 CFM |
| `generic-low-profile-92` | low-profile | 30, 95, 95, 10                                | 1 × 92  | 15 Pa @ 30 CFM | 0.35 K/W @ 30 CFM |
| `generic-top-down-120`   | top-down    | 45, 120, 120, 30                              | 1 × 120 | 15 Pa @ 50 CFM | 0.22 K/W @ 50 CFM |

GPUs:

| id                          | size l × h, slots | watts idle / max | cooler       | fans    | fan CFM, mmH2O | airResistance  | thermal    | fan speed idle / max |
| --------------------------- | ----------------- | ---------------- | ------------ | ------- | -------------- | -------------- | ---------- | -------------------- |
| `generic-blower-200w`       | 267 × 111, 2      | 15 / 200         | blower       | 1 × 80  | 25, 6.0        | 40 Pa @ 20 CFM | 0.20 @ 20  | 0.3 / 0.8            |
| `generic-open-air-220w`     | 250 × 115, 2      | 15 / 220         | open-air     | 2 × 92  | 35, 2.5        | 20 Pa @ 45 CFM | 0.14 @ 60  | 0.3 / 0.65           |
| `generic-open-air-450w`     | 340 × 140, 3.5    | 25 / 450         | open-air     | 3 × 100 | 45, 3.0        | 25 Pa @ 90 CFM | 0.08 @ 120 | 0.3 / 0.7            |
| `generic-flow-through-300w` | 305 × 112, 2      | 20 / 300         | flow-through | 2 × 100 | 45, 3.0        | 25 Pa @ 70 CFM | 0.12 @ 80  | 0.3 / 0.7            |

All numbers are estimates for typical parts. Make the case table in `docs/features.md` match the mounts above.

**Done when.** `npm run check` passes with every file loaded, and the case table in features.md matches the data.

## T2 · Share link encode and decode

**Touches:** `src/build/share.ts`, `src/build/share.test.ts`

**Why.** Builds travel as links ([data.md](data.md), "Share links").

**Do.**

- `encodeBuilds(builds: BuildSpec[]): Promise<string>` and `decodeBuilds(text: string): Promise<DecodeResult>`. More than one build is for compare links.
- `DecodeResult` is either the builds or a reason: `corrupt`, `too-new`, `unknown-ids` (with the ids). Use the data maps from `src/build/data.ts` for the id check.
- A `migrations` table keyed by version, empty for now, with a comment on how to add one.
- `CompressionStream('deflate-raw')` and base64url. No library.

**Done when.** Tests cover: round trip of 1 and 2 builds, corrupt text, a version 99 build, an unknown fan id. A typical build encodes to under 400 characters.

## T3 · Build service and app state

**Touches:** `src/build/defaults.ts`, `src/build/load.ts`, `src/build/validate.ts`, `src/ui/store.ts`, tests next to each

**Why.** Everything else needs a current build to work on.

**Do.**

- `defaults.ts`: the default build from [ui.md](ui.md), "First load".
- `load.ts`: preset table and watts from [scene.md](scene.md), "Room and load". `setPreset`, `setLoad` (switches to `custom`), `cpuWatts`, `gpuWatts`.
- `validate.ts`: checks the data files can't catch. Fan size fits the mount, one fan per slot, slot index in range, every id exists, cooler fan size matches the cooler. Returns a list of plain-English problems.
- `store.ts` (Zustand): up to 4 named builds, which one is selected, compare on or off, which two are compared. Actions for every edit the UI needs (pick case, add, remove and flip fans, set speeds, pick parts, set load, set room). Changing case keeps fans whose mount ids still exist and reports how many were dropped. Save to `localStorage` in try/catch.

**Done when.** Unit tests cover presets, watts, each validation rule, and case switching dropping fans.

## T4 · Engine: air step and first benchmarks

**Touches:** `src/engine/**`, `tests/physics/**`, `package.json`, `vite.config.ts`

**Why.** The core of the app. [engine.md](engine.md) is the spec, follow it exactly. If something in it looks wrong, raise it in the PR before changing course.

**Do.**

- `src/engine/units.ts`: the conversions table, with tests.
- `src/engine/gpu.ts`: get an adapter and device, asking for the adapter's max buffer limits.
- Air buffers, the fused D3Q19 kernel (pull streaming, Solid bounce-back, Open boundary, periodic test option, Guo forcing with a uniform test body force, Smagorinsky, BGK), the instability flag.
- `npm i -D webgpu` and a Vitest project `physics` (Node, `tests/physics/**`), run by `npm run test:physics`. It skips with a clear message if no GPU adapter is found.
- A small test helper that builds a `SimScene` from a few boxes.
- Benchmarks B1 and B2.
- Try it in GitHub Actions: if Dawn finds a software adapter and B1 runs in under 5 minutes, add `test:physics` to CI. Otherwise note it in the PR.

**Done when.** B1 and B2 pass locally. `npm run check` passes. The PR says whether CI can run the benchmarks.

## T5 · Engine: heat and buoyancy

**Touches:** `src/engine/**`, `tests/physics/**`

**Why.** Temperatures are the point. engine.md "Heat step" and "Buoyancy".

**Do.** Temperature buffers, the finite-volume heat kernel (van Leer limited upwind, diffusion with `ν_t / Pr_t`), heat sources, the Open boundary at room temperature, `fixedTemperature`, Boussinesq buoyancy, the `heatOutW` sum. Benchmarks B3 and B6.

**Done when.** B3 and B6 pass, and B1 and B2 still pass.

## T6 · Engine: fans and porous blocks

**Touches:** `src/engine/**`, `tests/physics/**`

**Why.** Fans drive everything. Mesh, filters and fins hold the air back. engine.md "Fans" and "Porous blocks".

**Do.** The `region` table, the fan ring force, the every-20-steps flow reduction with smoothing, fan curve lookup with the fan laws, stopped fans as porous, implicit porous drag. A pure helper for the standard curve shape (build uses it too). Benchmarks B4, B5, B7.

**Done when.** B4, B5 and B7 pass, and earlier benchmarks still pass.

## T7 · Engine: probes, settling, live updates

**Touches:** `src/engine/**`, `tests/physics/**`

**Why.** The app needs numbers back, a progress bar, and sliders that don't restart the run.

**Do.** Probe and fan reductions into one results buffer, `read()` through a staging buffer, the settling rules and progress, giving up at 30 s, adaptive steps per frame, the rgba16float view texture in `fields()`, `update()` for fan speeds and watts. One `createEngine(device): Engine` that implements `src/engine/types.ts`.

**Done when.** A physics test runs B5's scene through the public `Engine` interface until `settled` is true, then changes the heater to 200 W with `update()` and settles again at about double the temperature rise.

## T8 · Build to scene

**Touches:** `src/build/scene.ts`, `src/build/scene.test.ts`

**Why.** Turns a PC into cells. [scene.md](scene.md) is the spec, all sections except AIO (T18), PSU options (T19) and placement other than desk (T20).

**Do.** `buildScene(build, quality): SimScene` plus the settling hint. Domain, walls, panels, mount holes and filters, fans with frames and hubs, motherboard, tower, low-profile and top-down coolers, GPUs in all three styles, bottom PSU and shroud, heat sources, probes (`cpu-inlet`, `cpu-fins`, `gpu-inlet`, `gpu-fins`, `case-air`, plus one per fan).

**Done when.** Tests on the default build check: grid size, every fan's centre and axis, the cooler and GPU boxes, probe boxes inside the domain, no part overlapping another solid part, and that heat source watts match `load.ts`. A debug helper prints a 2D slice of cell types as text, for eyeballing.

## T9 · Results: temps, pressure, warnings

**Touches:** `src/build/results.ts`, `src/build/results.test.ts`

**Why.** Turns raw readings into what the user reads. scene.md "Results".

**Do.** `computeResults(build, readings): Results` with part temps, pressure, noise and warnings exactly as specified.

**Done when.** Tests with hand-made readings cover each warning, the pressure thresholds, the noise sum, and the airflow floor in the cooler formula.

## T10 · 3D view

**Touches:** `src/view/**`, `package.json`

**Why.** The picture is what people share. [ui.md](ui.md) "3D view".

**Do.**

- First a half-day spike: react-three-fiber with Three.js's WebGPU renderer, on the **same GPUDevice** as the engine, sampling the engine's 3D texture. If R3F fights the shared device, use plain Three.js in one React component and say why in the PR.
- Case outline, parts as simple boxes, fans with direction arrows, empty slots as dashed clickable outlines (an `onSlotClick` callback).
- Heat slice: side, front or top, moved by a slider, inferno colour map baked in, legend in °C.
- Streaks: a few thousand particles moved by the velocity texture in a compute pass, coloured by speed, can be turned off.
- Hover shows part name and temperature.

**Done when.** The default build shows a moving slice and streaks at 60 fps on a mid-range laptop, with the engine running.

## T11 · UI shell and sections

**Touches:** `src/ui/**`, `index.html`

**Why.** [ui.md](ui.md): layout, sections 1 to 5, results panel, first-load screens, small screens, accessibility.

**Do.** Everything in ui.md except the 3D view itself (T10, use a placeholder box), compare (T13) and share (T14). Read and write the store from T3. Show validation problems from `validate.ts` inline.

**Done when.** Every control in ui.md sections 1 to 5 edits the store, with a keyboard-only pass through all of them. The no-WebGPU page and the small-screen layout work.

## T12 · Wire it all together

**Touches:** `src/ui/**`, `src/app/**` (new, the run loop)

**Why.** Connect store, scene, engine, results and view.

**Do.** A run loop that: rebuilds the scene on geometry changes, calls `update()` on speed, load and room changes, uses preview quality while dragging and normal quality 500 ms after the last change, steps the engine every frame, reads back 4 times a second, feeds results to the panel and fields to the view. Instability: retry once at half the time step, then show the message from ui.md and keep the last good results.

**Done when.** Open the app, change any control, and the view and numbers react. Flipping the rear fan from exhaust to intake makes the case hotter.

## T13 · Compare A vs B

**Touches:** `src/ui/**`, `src/app/**`

**Do.** ui.md "Compare" and scene.md "Compare": copy to B, two views with linked cameras, run one after the other, cache settled results by share-link text, difference lines with the 1 °C "about the same" rule.

**Done when.** The video's comparison works: default build vs the same build with the bottom-front fan removed shows a difference line for each part.

## T14 · Share button and shared links

**Touches:** `src/ui/**`, `src/app/**`

**Do.** ui.md "Share" and "First load": copy link, open `#b=` links read-only with the "Edit a copy" banner, fall back to the default build with a one-line reason on a bad link, "Continue where you left off".

**Done when.** A link copied in compare mode opens the same two builds in a fresh private window.

## T15 · First public release

**Touches:** `README.md`, `.github/workflows/**`

**Do.** Colin turns on GitHub Pages (Settings → Pages → Source: GitHub Actions). Check the deploy works. Test on Chrome, Safari 26 and Firefox on Windows. Add a screenshot or short GIF to the README.

**Done when.** https://leahycc.github.io/pc-airflow/ runs the default build in all three browsers.

## T16 · Real cases

**Needs Colin:** the list of about 10 cases to start with.

**Do.** One data file per case with a `source`. Add a mount `excludes` field to the schema for "3 × 120 or 2 × 140" pairs and enforce it in `validate.ts` and the fan list UI. Case picker shows generic first, then real ones by brand.

## T17 · Real fan models

**Do.** About 10 popular fans with measured curves where the maker publishes them. Fan dropdowns group by size.

## T18 · AIO radiators and push/pull

**Do.** scene.md "AIO". Radiator mount picker in the cooler section. Push, pull and push-pull for tower coolers and radiators in the UI. Generic AIO data: 240, 280, 360.

## T19 · PSU options

**Do.** Top PSU, no shroud, PSU fan facing up (pulls case air) or down (pulls from under the case). PSU gives off 8% of total watts as heat (_estimate_).

## T20 · Where the case sits

**Do.** scene.md "Placement" and the Room section control.

## T21 · Export a comparison image

**Do.** One PNG with A and B side by side, their slices, the difference lines and the app's URL. Sized for Reddit.

## T22 · Show the noise estimate

**Do.** Show `noiseDbA` in results and compare, marked "rough".

## T23 · Check against OpenFOAM and tune

**Do.** Run 3 builds (default, no front fans, blower GPU) in OpenFOAM `chtMultiRegionFoam` or `buoyantSimpleFoam` offline. Compare temperatures at the probes. Tune the _estimates_ in scene.md. Write the results up in `docs/validation.md`.

## T24 · Users report real temps

**Do.** A GitHub issue template: build link, measured CPU and GPU temps, room temperature, load, how measured. A page listing reports next to the sim's numbers. No server.

## T25 · Fans that speed up when parts get hot

**Do.** Per-fan curve (temperature to speed) following CPU or GPU temp, like a BIOS curve. Solve by re-running: settle, update speeds, settle again, until speeds stop changing.

## T26 · Find the best layout

**Do.** Try every intake/exhaust combination of the placed fans (at most 2^8), using preview quality, rank by the hottest part, show the top 3.

## T27 · Engine speed-ups

**Do.** 16-bit storage for the air populations, and a larger time step for the heat step only. Benchmarks must still pass.
