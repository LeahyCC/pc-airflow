# UI spec

What the user sees and does, screen by screen. Features are in [features.md](features.md), the numbers behind the results are in [scene.md](scene.md).

## Layout (desktop, 1024 px and wider)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ PC Airflow     [ Build A ▾ ] [ + Compare ]                 [ Share ] [ ? ]   │
├──────────────┬──────────────────────────────────────────┬────────────────────┤
│ 1 Case       │                                          │ CPU      71 °C     │
│ 2 Fans       │                                          │ GPU      68 °C     │
│ 3 Hardware   │              3D view                     │ Case air 31 °C     │
│ 4 Load       │                                          │ Pressure positive  │
│ 5 Room       │                                          │ Noise    ~32 dB    │
│              │                                          │                    │
│ (open        │                                          │ ⚠ GPU is breathing │
│  section's   │                                          │   warm air (+9 °C) │
│  controls)   │  [ Slice: side ▾ ]  [ Streaks ✓ ]        │                    │
│              │  ▓▓▓▓▓▓▓▓░░░░ settling 60%               │ Shows which layout │
│              │                                          │ is better, not     │
│              │                                          │ exact temps.       │
└──────────────┴──────────────────────────────────────────┴────────────────────┘
```

- **Left:** the five sections as an accordion, one open at a time. They follow the order you build a PC.
- **Middle:** the 3D view. Drag to rotate, scroll to zoom, right-drag to pan.
- **Right:** results. Numbers are greyed out with "settling…" until the run settles.

## First load

1. If the browser has no WebGPU: a full-page message, "PC Airflow needs WebGPU. It works in Chrome, Edge and Safari 26 or newer, and Firefox on Windows." Plus a still image of an example result, so the visit isn't wasted. Nothing else loads.
2. If the link has `#b=`: open that build (see "Opening a shared link").
3. Otherwise open the **default build** and start running straight away, so there's something moving within seconds:
   - generic mid tower, 3 × 120 front intake, 1 × 120 rear exhaust, all at 60%
   - mid-range CPU, single tower cooler (push), 300 W open-air GPU
   - load preset gaming, room 22 °C

The last build is also kept in `localStorage` (in try/catch) and offered as "Continue where you left off".

## Sections

**1 Case.** A list of cases, generic sizes first and then real ones (v2), each with a small outline picture. Picking one keeps the fans whose mount ids still exist and drops the rest, saying "2 fans didn't fit and were removed".

**2 Fans.** Every mount and slot as a list:

```
 Front   slot 1  [ Standard 120 ▾ ]  [ Intake ⇄ ]  speed ━━━●━━ 60%   [ × ]
         slot 2  [ Standard 120 ▾ ]  [ Intake ⇄ ]  speed ━━━●━━ 60%   [ × ]
         slot 3  [ + add fan ]
 Top     slot 1  [ + add fan ]
 Rear    slot 1  [ Standard 120 ▾ ]  [ Exhaust ⇄ ] speed ━━━●━━ 60%   [ × ]
 Filters  front ✓  top ✓
 Panels   front [ mesh ▾ ]  left [ glass ▾ ] …
```

The same slots are clickable in the 3D view: empty slots show as dashed outlines, clicking one adds a fan and opens it in the list. Fans show an arrow for their direction. "Set all to …" applies one speed to every case fan.

**3 Hardware.** CPU, cooler (and its fan model, push/pull, speed), GPU. Each is a searchable dropdown, generic options first. Each shows its key numbers ("300 W, open-air, 3 fans").

**4 Load.** Preset buttons (Idle, Browsing, Gaming, Rendering, Stress) and one main slider. "Advanced" shows separate CPU and GPU sliders. Below them: "CPU 85 W, GPU 280 W" so the user sees what the load means.

**5 Room.** Room temperature slider (10 to 40 °C, default 22). Placement (desk, floor, carpet, near a wall) in v2.

## Running

- Every change re-runs. Speed, load and room changes update live without restarting. Geometry changes (case, fan added or removed, hardware) restart.
- While a slider or drag is moving, use the preview grid. 500 ms after the last change, switch to normal quality.
- The progress bar under the view shows "settling 60%". Results fill in as soon as they settle.
- If the engine flags itself unstable, retry once at a smaller time step. If it fails again, say "This build made the simulation unstable" and keep the last good results.

## 3D view

- The case as a see-through outline with solid parts (board, GPU, cooler, PSU, shroud) drawn simply, as boxes.
- **Heat slice:** a flat plane through the case coloured by temperature, from room temperature (dark) to hottest (bright), using a colour-blind-safe scale (inferno or viridis, never rainbow). A drop-down picks side, front or top, and a slider moves it through the case. A colour legend with °C labels sits beside it.
- **Streaks:** a few thousand short lines that drift with the air, coloured by speed. Can be turned off.
- Hovering a part shows its name and temperature.

## Compare

```
 [ Build A ▾ ] [ Build B ▾ ]   compare ✓
┌──────────── A ────────────┬──────────── B ────────────┐
│        3D view            │        3D view            │  cameras move together
├───────────────────────────┴───────────────────────────┤
│ CPU  71 → 69 °C  (B 2 °C cooler)                      │
│ GPU  68 → 62 °C  (B 6 °C cooler)                      │
│ Noise 32 → 34 dB (B louder)                           │
└───────────────────────────────────────────────────────┘
```

- **+ Compare** copies the current build to B and opens compare. Edits apply to whichever build is selected in the top bar.
- Results under 1 °C apart read "about the same".
- A and B run one after the other (scene.md, "Compare").
- Up to 4 builds in the dropdown. Each can be renamed.

## Share

**Share** copies the link and says "Link copied". In compare mode the link holds both builds. Export an A vs B image is v2 (task T21).

**Opening a shared link:** the build opens read-only with a banner, "Shared build. Edit a copy", and starts running. "Edit a copy" makes it the user's own.

## Phones and small screens

Under 1024 px: no editing. The 3D view fills the screen, the results sit underneath, and a note says "Open on a computer to edit". This is mainly so shared links work on phones.

## Accessibility

- Every control is reachable by keyboard, in a sensible order, with visible focus.
- Every slider shows its value as text.
- Results and warnings are text, not only colour.
- The 3D view has a text summary next to it (the results panel) so nothing depends on seeing it.
