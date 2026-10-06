# PC Airflow: features

A free, open source web app that shows how air and heat move inside a PC case. You build a PC, set how hard it's working, and see where the hot air goes and how hot the parts get. Then you change one thing and compare.

It answers questions like "should my bottom fans be intake or exhaust?" or "is my GPU breathing its own hot air?".

Marks used below:

- **(C)** asked for by Colin
- **(S)** suggested, strike it if you don't want it
- **v1** first release, **v2** next, **later** someday

## The main flow

```
 1. pick a case ──► 2. place fans ──► 3. pick hardware ──► 4. set load
                                                              │
        ┌─────────────────────────────────────────────────────┘
        ▼
 5. watch it run ──► 6. read results ──► 7. change one thing ──► compare A vs B
                                                │
                                                └──► share link / export image
```

The sim runs live. Change anything and the picture updates within a few seconds. There's no "submit and wait" step.

## Feature list

| #   | Feature                                                  | From | When  |
| --- | -------------------------------------------------------- | ---- | ----- |
| 1   | Case: generic sizes                                      | C    | v1    |
| 1b  | Case: real models (Corsair 4000D, Lian Li O11 and so on) | C    | v2    |
| 2   | Fan size                                                 | C    | v1    |
| 2b  | Fan models with real fan curves                          | S    | v2    |
| 3   | Fan direction: intake / exhaust                          | C    | v1    |
| 3b  | Cooler and radiator fans: push / pull / push-pull        | C    | v2    |
| 4   | Load slider, idle to max                                 | C    | v1    |
| 5   | Hardware: CPU, cooler, GPU                               | C    | v1    |
| 5b  | Hardware: AIO radiators, PSU, drives                     | C    | v2    |
| 6   | Fan speed per fan                                        | S    | v1    |
| 7   | Front and side panels: mesh, glass, solid, filters       | S    | v1    |
| 8   | Results: part temps, case pressure, hot spots            | S    | v1    |
| 9   | Compare two builds side by side                          | S    | v1    |
| 10  | Share a build as a link                                  | S    | v1    |
| 11  | Room temperature                                         | S    | v1    |
| 12  | Where the case sits: desk, floor, carpet, near a wall    | S    | v2    |
| 13  | Export a comparison image                                | S    | v2    |
| 14  | Noise estimate                                           | S    | v2    |
| 15  | Fans that speed up as parts get hot                      | S    | later |
| 16  | "Find the best layout for me"                            | S    | later |
| 17  | Users submit real measured temps to check accuracy       | S    | later |

## 1. Case (C)

**v1: generic sizes.** Pick a size and get a simple box with the usual fan mounts.

| Size       | Fits motherboard  | Typical fan mounts             |
| ---------- | ----------------- | ------------------------------ |
| Mini-ITX   | ITX               | front, rear, top               |
| Micro-ATX  | mATX, ITX         | front, rear, top, bottom       |
| Mid tower  | ATX and smaller   | front, rear, top, bottom, side |
| Full tower | E-ATX and smaller | front, rear, top, bottom, side |

Each mount is a slot that takes one fan size range (for example "front: 3 × 120 or 2 × 140").

**v2: real cases.** A list of popular cases with real sizes, mount spots, panel types and PSU shroud. Each case is one data file in the repo, so anyone can add a case with a pull request. Start with about 10 popular ones.

**Later: custom case.** Type in width, height, depth and drop fan mounts where you want them.

## 2. Fans (C)

**v1:** pick a size per mount: 80, 92, 120, 140 or 200 mm. Bigger fans move more air at the same speed.

**v2 (S): real fan models.** Size alone isn't enough. Two 120 mm fans can push very different amounts of air through a mesh panel or radiator. Each fan model is a data file with its fan curve (how much air it moves against how much resistance), max RPM and noise. Generic "standard 120 mm" options stay for people who don't know their fans.

## 3. Fan direction (C)

Two different ideas, both covered:

```
 case fans                         cooler / radiator fans

  outside │ inside                   push       pull       push-pull
   ──►  [fan]  ──►   intake          [fan]►▐▐   ▐▐►[fan]   [fan]►▐▐►[fan]
   ◄──  [fan]  ◄──   exhaust               fins       fins          fins
```

- **Intake / exhaust (v1):** every case fan blows in or out. One click flips it.
- **Push / pull (v2):** for CPU tower coolers and radiators. Push blows into the fins, pull sucks through them, push-pull uses both.

## 4. Load (C)

One main slider from **idle** to **max**, plus presets:

| Preset      | CPU    | GPU    |
| ----------- | ------ | ------ |
| Idle        | low    | low    |
| Browsing    | low    | low    |
| Gaming      | medium | high   |
| Rendering   | high   | medium |
| Stress test | max    | max    |

Gaming heats the GPU most and rendering heats the CPU most, so an "advanced" toggle shows separate CPU and GPU sliders. Load turns into watts of heat using the power numbers from each part's spec sheet.

## 5. Hardware (C)

| Part         | What we need from it                                                    | When  |
| ------------ | ----------------------------------------------------------------------- | ----- |
| CPU          | max power in watts                                                      | v1    |
| CPU cooler   | type (tower, low profile, top-down, AIO), size, fan spots               | v1    |
| GPU          | length, thickness, power, cooler style (open-air, blower, flow-through) | v1    |
| Motherboard  | size, set by the case                                                   | v1    |
| AIO radiator | size (240, 280, 360) and mount spot                                     | v2    |
| PSU          | bottom or top, shroud or not, fan facing up or down                     | v2    |
| Drives, RAM  | ignored at first, they make little heat                                 | later |

Like cases and fans, every part is a data file. Users pick a real model ("RTX 4070 Ti, open-air") or a generic one ("GPU, 300 W, 3 fans, 30 cm").

GPU cooler style matters a lot. A blower GPU pushes its heat out the back of the case. An open-air GPU dumps it inside. That's often the biggest difference between two builds.

## 6. Fan speed (S, v1)

Each fan gets a speed from 0 to 100%. Without this, "3 fans at 40%" and "3 fans at 100%" look the same, and that's the most common real-world question.

## 7. Panels and filters (S, v1)

The front panel decides most of the airflow. A glass front with side vents behaves very differently from a full mesh front. Each panel can be mesh, glass, solid or removed. Each intake can have a dust filter, which slows the air a bit.

## 8. Results (S, v1)

What you see after a run:

```
 ┌────────────── 3D view ───────────────┐  ┌──── numbers ─────────┐
 │                                      │  │ CPU      71 °C       │
 │   heat colour slice (drag to move)   │  │ GPU      68 °C       │
 │   + moving streaks showing airflow   │  │ case air 31 °C       │
 │                                      │  │ pressure positive ✓  │
 │                                      │  │ noise    ~32 dB  (v2)│
 └──────────────────────────────────────┘  └──────────────────────┘
   warnings: "GPU is pulling in its own exhaust"
```

- **Temperatures:** CPU, GPU, case air, intake air and exhaust air.
- **Pressure:** positive (more in than out, less dust) or negative.
- **Hot spots:** plain-English warnings such as dead zones, recirculation, or a fan fighting another fan.
- **View:** a 3D case you can rotate, a heat colour slice you can drag through the case, and moving streaks for the air. The colour scale must work for colour-blind users, so no rainbow.

## 9. Compare (S, v1)

This is the main point of the app, and it's what made the video work. Duplicate a build, change one thing, and see both side by side with the differences called out: "B is 6 °C cooler on the GPU".

## 10. Share link (S, v1)

The whole build is saved in the page link. Paste it on Reddit and anyone can open the same build. No accounts or server needed.

## 11 to 13. Environment and export (S)

- **Room temperature (v1):** default 22 °C. Every temperature depends on it.
- **Placement (v2):** on a desk, on the floor, on carpet (blocks bottom intakes), or close to a wall (blocks the rear).
- **Export image (v2):** a ready-to-post A vs B picture like the one in the video.

## 14 to 17. Later ideas (S)

- **Noise estimate:** a rough decibel figure from fan sizes and speeds.
- **Smart fans:** fans follow a speed curve and speed up as the CPU or GPU heats up, the way real BIOS fan curves work.
- **Best layout:** the app tries every intake/exhaust combination and ranks them.
- **Reality check:** users post their real measured temps with their build link. Over time this shows how close the sim is, and it's a good fit for an open source project.

## How honest the numbers are

The app says this in the UI, in one line: **results show which layout is better, not exact temperatures**. Real temps depend on things we only estimate, like paste, dust, fan wear and the exact heatsink fins. Item 17 is how we'd earn more trust over time.

## Not doing

- Custom water loops (AIOs are fine).
- Laptops, servers and racks.
- Guaranteed exact temperatures.
- Clearance checks ("does this GPU fit"). Other sites already do this well.
- Editing builds on a phone. Opening shared links on a phone should work.

## Decided

- **Runs in the browser**, on the user's own GPU. Free to host, no server bills. See [tech-stack.md](tech-stack.md).
- **Licence:** MIT.
- **All (S) suggestions above are in.**

## Open questions

1. **Real cases for v2:** which 10 to start with?
