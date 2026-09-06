# Interactive Methalox Oxygen-Rich Staged-Combustion Rocket Engine

A complete local Python + React/TypeScript application for tracing propellants from tanks to thrust. FastAPI owns input definitions, validation, all engineering calculations, component states and the educational sequence. Three.js / React Three Fiber renders the state, with orbit/pan/zoom, click/hover inspection, cutaway, exploded and transparent views, isolated flows and a moving camera-follow tracer.

**Illustrative engineering model — not a validated or qualified engine design.**

## Quick start on this computer

Dependencies are already installed in `.venv` and `frontend/node_modules`, and the built frontend is in `frontend/dist`. From this directory:

```powershell
.\.venv\Scripts\python.exe app.py
```

Open **http://127.0.0.1:8000**. Alternatively double-click `run.cmd`. Keep the terminal open; Ctrl+C stops the server. If an existing instance is already using port 8000, use that instance or stop it before starting another. `PORT` can select a different port.

## First-time setup on another computer

Requirements: Python 3.11 or newer (tested with Python 3.12), Node.js 22.13 or newer, npm, and a modern WebGL2-capable browser with hardware acceleration. No account, API key, paid service or Internet connection is needed after installation. Package installation requires Internet access.

Windows PowerShell:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r backend/requirements.txt
cd frontend
npm ci
npm run build
cd ..
.\.venv\Scripts\python.exe app.py
```

macOS / Linux:

```bash
python3 -m venv .venv
.venv/bin/python -m pip install -r backend/requirements.txt
cd frontend
npm ci
npm run build
cd ..
.venv/bin/python app.py
```

Once the environment is activated, `python app.py` serves both the static frontend and the REST API. A lock snapshot of the tested Python environment is in `backend/requirements.lock.txt`; use it in place of `requirements.txt` for those exact versions. The frontend has an npm lockfile.

The Sites React scaffold was adapted to a Vite static client so the application can run locally through a single Python server. A Cloudflare JavaScript worker cannot host this Python calculation service. The app has not been published to a hosted service.

## Development (two terminals)

From the project root, backend:

```powershell
.\.venv\Scripts\python.exe -m uvicorn backend.app:app --reload --host 127.0.0.1 --port 8000
```

Frontend:

```powershell
cd frontend
npm run dev
```

Open **http://127.0.0.1:5173**. Vite proxies `/api` to Python on port 8000 and updates the frontend as files change. Rebuild with `npm run build` before returning to single-process `python app.py`. If the 3D view cannot initialize, the interface reports that hardware acceleration is needed; the calculation controls remain available.

## Explore the engine

1. Press **Start** to run the 35-second educational demonstration. Use **Pause**, **Reset**, the scrubber, or a stage button to revisit a moment. Speeds are 0.5×, 1× and 2×. The demonstration includes a finite steady-state dwell and then shuts down automatically.
2. Click **Steady state** to inspect a settled design point. Set the throttle and press **Apply Changes**. The slider intentionally covers the nominal 60–100% range; broader schema-accepted throttle values can be explored through YAML or the API and produce range warnings.
3. Drag with the left mouse button to rotate through 360°, scroll to zoom, and right-drag (or Shift + left-drag) to pan. The hand-shaped **Pan camera** toggle also changes left-drag to panning. **Reset camera** exits follow/pan mode and restores the overview. Touch supports orbit and two-finger zoom/pan through OrbitControls.
4. Hover a component or pipe for its description and current illustrative pressure, temperature, flow and pressure change. Click to keep its details in the right panel. The component picker and glossary offer keyboard-accessible inspection of every component.
5. Select **Cutaway**, **Solid casing**, **Exploded view**, or **Flow-path / transparent**. Exploded coordinates remain connected by rerouted lines. Toggle labels or isolate a flow using the named colour legend.
6. Choose **Follow LOX**, **Follow methane**, or **Follow hot gas** to move the camera with a bright tracer. Follow is a route tour and can run while the physical timeline is paused. Turn Follow off to resume manual camera control.
7. **Beginner mode** keeps core telemetry and concise component descriptions. **Engineering mode** exposes pressure, flow, temperature and shaft-power details. Equations, assumptions, glossary, limitations and all validation results are expandable below the timeline.

Flow particle counts and speeds respond to Python mass flow; rotor speed uses a Python-provided relative speed indicator. The indicative RPM animation has no dimensional RPM claim. Valve indicators reflect the Python-requested opening. Igniters operate briefly during the corresponding ignition phase and are off at steady state. Invalid requested states remain inspectable; associated branches are highlighted in pink/red and thrust is explicitly labelled as a requested, unachievable point.

## Default design and topology

| Quantity | Nominal result |
|---|---:|
| Vacuum thrust | ~100 kN |
| Chamber pressure | ~100 bar |
| O/F | 3.4 |
| Vacuum Isp | ~359 s |
| Total flow | ~28.4 kg/s |
| LOX / methane flow | ~21.9 / 6.45 kg/s |
| Main LOX / methane pump outlet | ~145 / 150 bar |
| Required main injector drop | ~20 bar |
| Cooling loss | ~12 bar |
| Main combustion temperature | ~3,450 K |
| Preburner O/F / temperature | ~34 / 970 K |
| Preburner pressure | ~359 bar |
| Total pump shaft demand | ~829 kW |
| Available turbine shaft capacity | ~1,366 kW |

The requested layout combines a **minority LOX preburner branch** with a **main oxidizer bypass**. A small preburner branch at roughly the main injector pressure cannot provide adequate turbine expansion while returning exhaust to a 100 bar chamber. This implementation therefore adds **two visible preburner branch boosters** after the main manifolds, raising only the nominal 25% LOX branch and 2.5% methane branch toward 370 bar. Their power demand is included. The common shaft drives both main pumps and assumed auxiliary gearing for the four booster pumps. Auxiliary gearing and the external startup drive are conceptual, not designed mechanisms.

All preburner mass passes through the turbine and rejoins the main chamber through the hot-gas injector. It is included exactly once in total chamber flow. A governor extracts only the required pump shaft work when turbine capacity exceeds demand; the capacity reserve is not additional extracted power. This is a deliberately illustrative **partial-flow ORSC** arrangement, not a reconstruction of a production engine. It should not be confused with the common ORSC arrangement that routes most or all LOX through the preburner.

Positive feed head remaining above the required injector inlet pressure is assigned to a visible **injector metering stage** on each liquid branch. The nominal main injector inlets are therefore ~120 bar, giving the required ~20 bar drop to the chamber. The metering-stage actuator position is not solved. The reported design pressure margin is the reserve upstream of that metering stage.

## Edit parameters

Edit **`backend/data/engine_config.yaml`** in a text editor. Every configuration field also appears in the Design Inputs panel (throttle is the main slider). Parameters include chamber pressure, thrust, mixture ratio, densities, tank pressures, pipe dimensions, valve Kv/openings, filter loss, booster/main-pump heads, efficiencies, preburner split/boost, cooling and injector losses, expansion ratio and all timeline durations.

The API reads YAML on **Reset to nominal** and `/api/config`; restart is not required for YAML input changes. In-app **Apply Changes** changes only the current browser session; it never writes over the YAML file. Reset reloads the file baseline, which is the nominal point unless you edited it. An omitted YAML key takes its documented Pydantic default. Unknown fields, nonfinite numbers and values outside structural bounds are rejected. The file can be modified without editing frontend code because the input panel is generated from the Python JSON schema.

Examples:

```yaml
chamber_pressure_bar: 100   # full-throttle absolute chamber pressure
mixture_ratio: 3.4         # total O2 / CH4 from the tanks
throttle: 0.8              # actual requested Pc and flow scale with this fraction
lox_pump_outlet_bar: 145   # nominal full-speed target at fully open reference suction
fuel_pump_outlet_bar: 150
lox_valve_kv: 180          # m³/h water at one bar pressure drop
lox_valve_opening: 100     # percent, linear effective-Kv approximation
cooling_pressure_drop_bar: 12
```

Raising chamber pressure reduces available injector margins. Closing a valve raises its loss and lowers the delivered main-pump outlet because pump head is prescribed rather than a perfect outlet-pressure regulator. Increasing cooling loss reduces methane injector inlet pressure. Reducing turbine efficiency can produce a shaft-power deficit. The app **does not solve a new achieved flow** after a restriction: it retains and flags the requested point so the inconsistency remains visible.

## Calculation modules and equations

```text
app.py                         Single-process launcher
backend/app.py                 FastAPI routes, YAML loading, static hosting
backend/models/engine_config.py Input validation and UI metadata
backend/models/engine_state.py  API response models
backend/calculations/
  engine.py                    Network assembly, component states and orchestration
  flow.py                      Thrust-based flow sizing, O/F split and Darcy line loss
  valves.py                    Metric Kv/opening liquid loss
  pumps.py                     Pressure rise and shaft power
  cooling.py                   Pressure loss and prescribed heat pickup
  preburner.py                 Lumped energy estimate and turbine expansion capacity
  performance.py               Constant-gamma vacuum nozzle and c-star fit
  timeline.py                  Teaching phases and prescribed state interpolation
  validation.py                Pressure, power and model-range warnings
backend/tests/test_engine.py   Model invariants, failure cases and API checks
frontend/src/api/engine.ts     Typed API calls; no independent physics calculation
frontend/src/scene/            Geometry, routes, camera, particles and rotors
frontend/src/panels/           Inputs, telemetry and component inspection
frontend/src/components/       Reusable controls
frontend/src/styles/           Dashboard layout and responsive styling
```

All pressures are **absolute bar**, mass flows **kg/s**, temperatures **K**, power **kW**, density **kg/m³**, diameters **mm**, length **m**. Δp in inspection is **outlet minus inlet**; a pump rise is positive and a line loss is negative. Display rounding is separate from full-precision calculations.

- `O/F = ṁLOX / ṁCH4`
- `F = ṁtotal × Isp × g0`, with `g0 = 9.80665 m/s²`.
- `Ppump = Δp × (ṁ/ρ) / ηpump`, including every booster.
- `Δpvalve[bar] = (Q[m³/h] / (Kv × opening_fraction))² × ρ/1000`.
- `Δppipe = f(L/D)ρv²/2`, using fixed Darcy `f = 0.018`.
- Filter, cooling and required injector losses scale with squared flow relative to full-design flow.
- Main-pump reference head is calculated at the fully open rated-flow suction condition. Head then scales with throttle; this is a prescribed law, not a real pump map.
- `Isp = c* × Cf,vac × 0.97 / g0`; the exit Mach is found from the isentropic supersonic area-ratio relation with γ=1.22. `c* = 1940 × max(0.65, 1−0.025(O/F−3.4)²)` m/s is an illustrative fit. The throat is resized for each full-design thrust and Pc. The same geometry is retained while throttling.
- The preburner uses a 50 MJ/kg methane heating value, 90% heat release, stoichiometric limit O/F=4, and an effective cp of 1500 J/kg/K. The constant cp lumps dilution and phase-change effects; it is not a species/phase calculation. Turbine γ=1.30, configurable isentropic efficiency and 0.97 shaft efficiency.
- Cooling temperature uses prescribed heat pickup `Tfuel = 112 + 280 × throttle K`; it does not solve conjugate heat transfer or supercritical fluid properties.
- Timeline values are prescribed interpolations around the requested steady point. In particular, pre-ignition feed accumulation, venting and energy closure are **not solved**; transient component flows and chamber telemetry must not be interpreted as a conservation-resolved startup simulation.

These formulas are visible in **Equations and assumptions**. The scalar design sizing is purposeful: target thrust is an input used to select flow and throat area, not an independently predicted performance measurement.

## REST interface

- `GET /api/health`: readiness.
- `GET /api/config`: YAML values and Python-generated field metadata.
- `GET /api/nominal`: baseline idle state.
- `POST /api/calculate`: `{ "config": { ... }, "time_s": 20 }` returns validated requested design, live interpolated telemetry, all component states, timeline, equations, assumptions and warnings.
- `/docs`: FastAPI interactive documentation.

Structural invalidity gives HTTP 422. A mathematically evaluable but physically inconsistent operating point returns HTTP 200 with `feasible: false` and errors linked to component IDs. Out-of-guidance conditions may be warnings rather than hard errors. A closed valve at nonzero requested flow has no hydraulic solution; a finite 1,000,000 bar loss sentinel is flagged to keep JSON finite and the scene inspectable.

## Extend the network

To add a valve, pipe, sensor or branch:

1. Add any inputs to `EngineConfig` with bounds, unit, group and description; add nominal values to YAML. The in-app editor uses this schema automatically.
2. Compute the new component state in `calculations/engine.py` using the appropriate module. Give it a unique stable ID, function, fluid, inlet/outlet pressure, temperature and mass flow. A sensor can be a `manifold`-style point with zero assigned pressure loss.
3. For a new branch, explicitly split the upstream mass, carry its losses forward, include additional pump demand, and account for its destination. Do not duplicate returned preburner flow at the chamber.
4. Add a node coordinate or route to `frontend/src/scene/topology.ts`. The existing renderer covers the common component kinds. Extend `Hardware` for a new geometry kind if needed. Hover, selection and glossary entries use the backend component state.
5. Add component-linked warning checks and meaningful conservation/head/power tests. Update the path explanation and assumptions.

## Replace simplified physics

Keep stable function interfaces and SI/bar conversion boundaries. Suitable later replacements include:

- **Cantera / NASA CEA:** replace chamber temperature, c-star, gamma and preburner composition/enthalpy with validated equilibrium or kinetics results. Preserve actual species and total mass/energy when returning turbine exhaust.
- **Cryogenic property library:** replace constant liquid density and heat capacity using a tested property adapter for pressure/temperature/phase. Avoid making browser-side property estimates.
- **Pump/turbine maps:** replace prescribed heads and expansion capacity with interpolation over measured speed/flow maps, including off-design efficiency, shaft speed, torque and cavitation constraints.
- **Transient solver:** replace `timeline_state` and interpolation with integrated conservation equations, volumes, valve actuators, rotor inertia, starter work, transport delay, ignition and stability models. SciPy integrators may then be appropriate; they are not needed for the present algebraic model.
- **Thermal/structural analysis:** replace prescribed cooling pickup with channel/liner models, material limits, two-way wall heat flux and real-fluid phase behavior.

The frontend should continue consuming the same validated Python state or a versioned extension of it; do not reimplement engineering equations in JavaScript.

## Verification

```powershell
.\.venv\Scripts\python.exe -m pytest backend/tests -q
cd frontend
npm run build
```

Tests cover nominal values, steady mass conservation, all six pump power contributions, quadratic losses, valve closure, downstream restriction effects, cooling and injector margins, low turbine power, throttle, nozzle sizing, every timeline phase, igniter gating, YAML/schema parity, finite invalid states and API/file isolation. Browser verification is recorded in `VERIFICATION.md`.

## Limits and appropriate use

This app is for explanation, code exploration and qualitative sensitivity studies. It is **not** a real-engine design, manufacturing drawing, test procedure, operating sequence, flight model or safety-analysis tool. It lacks measured valve characteristics, NPSH/cavitation, pump and turbine maps, detailed line and injector design, combustion stability, real-gas cryogenic properties, chemistry/kinetics, oxygen compatibility, thermal/structural models, coupled startup/shutdown dynamics, CFD and experimental validation. A passed check means only that the implemented necessary conditions passed. It does not establish real-engine feasibility or safety.

Source geometry is schematic and unscaled; exhaust visuals are artistic indicators of the calculated operating state. The vacuum nozzle model does not address atmospheric flow separation. Local access is loopback-only by default; the application is not configured as a public multiuser service.

## Background references

- [NASA Glenn — Rocket thrust](https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/rocket-thrust/): mass flow, exhaust velocity and pressure contributions to thrust.
- [NASA Glenn — Specific impulse](https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/specific-impulse/): thrust related to propellant weight flow.
- [NASA NTRS — Liquid rocket engine technology, chapter 12](https://ntrs.nasa.gov/api/citations/20160008869/downloads/20160008869.pdf): staged-combustion cycles and rich preburner dilution.

These references support the general relationships and cycle concepts. They do not validate this app's chosen numerical fits, geometry, default design or transient animation.
