# Data spec

Every case, fan, CPU, cooler and GPU is one JSON file in `data/`. Anyone can add one with a pull request. The exact rules are the Zod schemas in [`src/build/schema.ts`](../src/build/schema.ts); this page explains them in plain words.

```
 data/
   cases/     generic-mid-tower.json, corsair-4000d-airflow.json, …
   fans/      generic-120.json, arctic-p12.json, …
   cpus/      generic-125w.json, ryzen-7-7800x3d.json, …
   coolers/   generic-tower-120.json, …
   gpus/      generic-open-air-300w.json, …
```

## Rules for every file

- The file name is the `id` plus `.json`. Ids are lowercase with dashes: `corsair-4000d-airflow`.
- `generic: true` for the plain presets, `false` for real products.
- Real products need a `source` link to the spec sheet or a review with the numbers. No source, no merge.
- Units: millimetres, watts, °C, CFM and mmH2O (what spec sheets use). The app converts.
- `npm run check` loads every file and fails with the file path if anything is wrong.

## Case

Coordinates are millimetres inside the case, seen from the front: `x` left to right, `y` bottom to top, `z` front to back. Origin is the bottom-left-front inside corner. The motherboard goes on the right (high `x`).

| Field                             | Meaning                                                                                                                     |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `inside`                          | Inside width (x), height (y), depth (z)                                                                                     |
| `motherboards`                    | Board sizes it takes                                                                                                        |
| `panels`                          | Surface of each side: `solid`, `glass`, `removed` or `mesh` with `openArea` (0.7 = 70% holes). Leave one out and it's solid |
| `mounts`                          | Places fans can go, below                                                                                                   |
| `psu`                             | `bottom` or `top`, whether there's a shroud and how tall it is                                                              |
| `maxGpuLength`, `maxCoolerHeight` | From the spec sheet. Not used for checks yet                                                                                |

**Mounts.** A mount is a row of equal fan slots on one panel.

| Field                              | Meaning                                                       |
| ---------------------------------- | ------------------------------------------------------------- |
| `id`                               | Unique in this case: `front`, `top`, `rear`, `bottom`, `side` |
| `panel`                            | Which panel it's on                                           |
| `firstSlotCentre`                  | Centre of the first slot, `[x, y, z]` mm                      |
| `slotAxis`, `slots`, `slotSpacing` | Slots repeat along this axis, this many times, this far apart |
| `fanSizes`                         | Fan sizes that fit                                            |
| `filter`                           | Dust filter fitted as standard                                |

If a mount takes 3 × 120 mm **or** 2 × 140 mm, add two mounts (`front-120`, `front-140`). The UI only lets one of a pair hold fans (task T16 covers this).

## Fan

| Field              | Meaning                                                                                                                  |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| `size`             | 80, 92, 120, 140 or 200 mm                                                                                               |
| `maxRpm`           | Top speed                                                                                                                |
| `maxFlowCfm`       | Airflow with nothing in the way, at top speed                                                                            |
| `maxPressureMmH2O` | Static pressure at top speed with the air blocked                                                                        |
| `curve`            | Optional measured points `{ flowCfm, pressureMmH2O }` at top speed. Without one, the standard shape in engine.md is used |
| `noiseDbA`         | Noise at top speed                                                                                                       |

## CPU

| Field           | Meaning                                                                                                                                            |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `idleWatts`     | Power at idle. Reviews measure this                                                                                                                |
| `maxWatts`      | Power at full all-core load (the package power limit, PPT or PL2)                                                                                  |
| `internalKPerW` | °C per watt from the hot spot to the cooler base, paste included. 0.15 is typical; chips with a lot of heat in a small area (Ryzen X3D) run higher |

## Cooler

`type` is `tower`, `low-profile`, `top-down` or `aio`.

Air coolers:

| Field                 | Meaning                                                             |
| --------------------- | ------------------------------------------------------------------- |
| `fins.fromBoard`      | How far the fin block sticks out from the motherboard               |
| `fins.across`         | Size of the fin block along the board                               |
| `fins.alongAirflow`   | Depth the fan pushes through                                        |
| `fins.baseGap`        | Gap from the board to where the fins start (heat pipes)             |
| `fanSize`, `fanCount` | Fans it comes with. The user picks the fan model                    |
| `airResistance`       | How hard it is to push air through: `pressurePa` at `atFlowCfm`     |
| `thermal`             | °C per watt from cooler base to air, `kelvinPerWatt` at `atFlowCfm` |

AIOs replace `fins` with `radiatorLength` (120 to 420), `radiatorThickness`, and `airResistance` per fan section. `thermal` covers the whole loop.

Most coolers don't publish `airResistance` or `thermal`. Use the generic values for the same size class and say so in the PR.

## GPU

| Field                                                         | Meaning                                                                                                |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `length`, `height`, `slots`                                   | Card size. `slots` can be 2.5                                                                          |
| `idleWatts`, `maxWatts`                                       | Power at idle and the board power limit (TBP)                                                          |
| `cooler`                                                      | `open-air` (heat into the case), `blower` (out the back), `flow-through` (part blows straight through) |
| `fanSize`, `fanCount`, `fanMaxFlowCfm`, `fanMaxPressureMmH2O` | The card's own fans. Guess from a similar-sized case fan if unknown                                    |
| `airResistance`, `thermal`                                    | As for coolers, for the card's fin stack                                                               |
| `fanSpeedIdle`, `fanSpeedMax`                                 | GPU fan speed at idle and at full load, 0 to 1                                                         |

## Builds

A build is what the user picked. It's the `buildSpec` schema, and it's what goes into a share link. It only refers to data by id, so a link stays small.

`version` must go up whenever the build shape changes. Old links must still open: add a migration from the old version in `src/build/share.ts` (task T2).

## Share links

```
 https://leahycc.github.io/pc-airflow/#b=<data>
 <data> = base64url( deflate-raw( JSON of the build ) )
```

Use the browser's built-in `CompressionStream('deflate-raw')`, no library. If the link is bad, a newer version than the app knows, or names data ids that don't exist, open the default build and say why in one line.
