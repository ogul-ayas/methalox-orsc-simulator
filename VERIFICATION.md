# Verification record

Verified locally on Windows on 6 September 2026. This record concerns software behavior and the stated simplified-model invariants, not the validity of a real rocket-engine design.

## Automated checks

- `python -m pytest backend/tests -q`: **16 passed**.
- `npm run build`: **passed**, including strict TypeScript checking and the Vite production build.
- Frontend sources formatted with the scaffold's installed formatter.
- Local single-process launch through `python app.py`: `/` and `/api/health` responded successfully; the 3D app fetched its configuration and calculated state from Python.
- The six pump shaft-power contributions sum to the model demand. Preburner exhaust mass returns to the chamber once. Default main liquid injectors have 120 bar inlet / 100 bar outlet after the explicit residual-head metering stages.
- Invalid configurations remain JSON-finite and flagged. Tests cover a closed valve, restrictive valve, insufficient cooling/injector margin, low turbine efficiency and combinations of low/high throttle, chamber pressure and valve opening.

The test stack reports two third-party deprecation warnings (Starlette/httpx and AnyIO). They do not fail the checks. The development browser also reported a Three.js Clock deprecation warning from the 3D dependency stack; no application JavaScript error was observed during the checked interactions.

## Browser interaction checks

| Check | Observed result |
|---|---|
| 3D initialization | Canvas rendered with tanks, connected lines, boosters, main pumps, shaft, preburner, cooling jacket, chamber/nozzle and purge supply; readiness marker true. |
| Mouse orbit | Drag changed the engine's orientation. |
| Mouse zoom | Wheel scrolling over the scene changed the view scale. |
| Mouse pan | Pan-camera toggle followed by dragging translated the engine view. |
| Camera reset | Restored the full-engine overview. |
| Hover and click | Clicking the LOX tank selected it; hover and persistent panels showed its function, liquid-oxygen identity, ~4 bar pressure and ~90 K temperature. |
| Engineering / Beginner | Beginner mode removed detailed component numbers; Engineering restored full inspection. |
| Design inputs | At steady state, Pc = 130 bar produced 130 bar telemetry and infeasible injector-margin warnings. Restoring Pc = 100 bar cleared the errors. |
| Throttle | Applying 60% produced 60 kN thrust, 60 bar chamber pressure and ~17.03 kg/s total flow. |
| Nominal point | ~100 kN, 100 bar, ~359.3 s Isp and ~28.38 kg/s total flow. |
| Main LOX injector | Component picker showed ~120 bar inlet, ~100 bar outlet, −20 bar signed pressure change and ~16.45 kg/s direct-main-branch flow. The remaining LOX returns through the hot-gas route. |
| Exploded view | Main assemblies separated and connecting routes remained drawn. |
| Transparent / isolate | Transparent view and methane isolation showed the selected route; the named flow button changed its selected state. |
| Camera follow | Follow methane displayed a bright moving route tracer and changed the camera target; reset exited follow. |
| Pause | Timeline value remained fixed at 1.2601 s across separate reads while paused in Purge; thrust stayed zero. |
| Timeline scrub | Stage buttons moved to the selected phase; the slider is keyboard operable. |
| Speeds | 0.5×, 1× and 2× options were available; selecting 2× updated the control. |
| Startup progression | Automatic playback showed Purge → Pump spin-up → Preburner ignition → Main-chamber ignition → Ramp → Steady state, with thrust rising to 100 kN. |
| Shutdown progression | From shutdown, observed 50 kN at its midpoint, then 0 kN in post-shutdown purge and 0 kN at Safe / complete. |
| Responsive layout | Three-column engineering layout checked at 1600×1000; stacked scene-first layout checked at 390×844 and the default narrow app panel. |

Long sequence observation was split across bounded browser checks; shutdown was also replayed separately. The Python tests verify phase ordering and igniter gates for every stage. The startup timeline remains prescribed interpolation rather than a conservation-resolved transient model.

## Deliberate limitations

The application is local and educational. Geometry is schematic, the steady state is a requested design-point calculation, and infeasible requests are not converted into an achieved operating point. No engine test procedure, production-engine replication, manufacturing dimensions, validated chemistry, fluid phase model, pump map, cavitation check, thermal/structural analysis, CFD or flight qualification is provided. See README.md and the in-app Equations and Model limitations panels.
