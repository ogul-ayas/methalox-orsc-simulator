import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Focus,
  Hand,
  Layers3,
  BookOpen,
  ChevronRight,
  TriangleAlert,
  Orbit,
  ArrowRight,
  Check,
  Info,
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Choice, Range } from './components/Controls';
import {
  calculate,
  fetchConfig,
  Config,
  Parameter,
  State,
  format,
} from './api/engine';
import { DesignInputs } from './panels/DesignInputs';
import { Telemetry } from './panels/Telemetry';
import { Inspection } from './panels/Inspection';
import EngineScene from './scene/EngineScene';
import { flowExplanation, colors } from './scene/topology';

export default function App() {
  const [schema, setSchema] = useState<Record<string, Parameter>>({}),
    [draft, setDraft] = useState<Config>({}),
    [applied, setApplied] = useState<Config | null>(null),
    [state, setState] = useState<State | null>(null);
  const [time, setTime] = useState(0),
    [playing, setPlaying] = useState(false),
    [speed, setSpeed] = useState(1),
    [mode, setMode] = useState('engineering');
  const [pan, setPan] = useState(false);
  const [view, setView] = useState('cutaway'),
    [isolate, setIsolate] = useState('all'),
    [labels, setLabels] = useState(true),
    [follow, setFollow] = useState('none'),
    [cameraReset, setCameraReset] = useState(0);
  const [selected, setSelected] = useState<string | null>(null),
    [hovered, setHovered] = useState<string | null>(null),
    [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [busy, setBusy] = useState(false),
    [ready, setReady] = useState(false);
  const duration = useRef(100),
    requestId = useRef(0),
    isApply = useRef(false);
  const loadNominal = useCallback(async () => {
    try {
      setBusy(true);
      const r = await fetchConfig();
      setSchema(r.schema);
      setDraft(r.config);
      setApplied(r.config);
      setTime(0);
      setPlaying(false);
      setError('');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }, []);
  useEffect(() => {
    void loadNominal();
  }, [loadNominal]);
  useEffect(() => {
    if (!applied) return;
    const controller = new AbortController(),
      id = ++requestId.current;
    calculate(applied, time, controller.signal)
      .then((s) => {
        if (id !== requestId.current) return;
        setState(s);
        duration.current = s.duration;
        setError('');
        setBusy(false);
        if (isApply.current) {
          setNotice('Model recalculated from updated design inputs.');
          isApply.current = false;
        }
      })
      .catch((e) => {
        if (e.name !== 'AbortError') {
          setError(e.message);
          setPlaying(false);
          setBusy(false);
        }
      });
    return () => controller.abort();
  }, [applied, time]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(''), 4500);
    return () => clearTimeout(timer);
  }, [notice]);
  useEffect(() => {
    if (!playing) return;
    let previous = performance.now();
    const timer = setInterval(() => {
      const now = performance.now(),
        dt = Math.min(0.5, (now - previous) / 1000);
      previous = now;
      setTime((t) => {
        const next = Math.min(duration.current, t + dt * speed);
        if (next >= duration.current) setPlaying(false);
        return next;
      });
    }, 140);
    return () => clearInterval(timer);
  }, [playing, speed]);
  const apply = () => {
    isApply.current = true;
    setBusy(true);
    setApplied({ ...draft });
  };
  const scrub = (t: number) => {
    setPlaying(false);
    setTime(t);
    setHovered(null);
  };
  const beginner = mode === 'beginner';
  const component = state?.components.find((c) => c.id === selected),
    hover = state?.components.find((c) => c.id === hovered);
  useEffect(() => {
    if (selected)
      document
        .querySelector('.right-panel')
        ?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [selected]);
  const onReady = useCallback(() => setReady(true), []);
  const errors = state?.warnings.filter((w) => w.severity !== 'info') || [];
  return (
    <main className="app">
      <header className="topbar">
        <div className="brand">
          <div className="brand-icon">
            <Orbit size={22} />
          </div>
          <span>
            PROPULSION LAB <b>/ ORSC–100</b>
          </span>
        </div>
        <div className="top-status">
          <span className="status-dot" /> LOCAL ENGINEERING MODEL{' '}
          <span className="version">v1.0</span>
        </div>
      </header>
      <div className="title-row">
        <div>
          <h1>
            Interactive Methalox Oxygen-Rich Staged-Combustion Rocket Engine
          </h1>
          <p>
            Follow propellants from tank to thrust — inspect valves, pumps,
            cooling, combustion and pressure losses.
          </p>
        </div>
        <Choice
          label="Learning mode"
          value={mode}
          onChange={setMode}
          options={[
            ['beginner', 'Beginner mode'],
            ['engineering', 'Engineering mode'],
          ]}
        />
      </div>
      {error && (
        <div className="error-banner" role="alert">
          <TriangleAlert size={18} />
          <span>
            {error}{' '}
            {state
              ? 'The last successful state is retained.'
              : 'Start the Python backend, then reload.'}
          </span>
          <button onClick={() => void loadNominal()}>Retry</button>
        </div>
      )}
      {notice && (
        <div className="toast" role="status">
          <Check size={16} />
          {notice}
        </div>
      )}
      {!state ? (
        <div className="loading">
          <Orbit size={36} />
          <h2>Loading the engine model</h2>
          <p>Connecting to the local Python calculation engine…</p>
        </div>
      ) : (
        <>
          <div className="workspace">
            <DesignInputs
              draft={draft}
              setDraft={setDraft}
              schema={schema}
              apply={apply}
              reset={() => void loadNominal()}
              busy={busy}
              dirty={JSON.stringify(draft) !== JSON.stringify(applied)}
              beginner={beginner}
            />
            <section
              className="viewport panel"
              aria-label="Interactive 3D engine"
            >
              <div className="scene-toolbar">
                <div>
                  <Layers3 size={15} />
                  <span>ENGINE ASSEMBLY</span>
                </div>
                <div className="view-controls">
                  <Choice
                    label="View mode"
                    value={view}
                    onChange={setView}
                    options={[
                      ['cutaway', 'Cutaway'],
                      ['solid', 'Solid casing'],
                      ['exploded', 'Exploded view'],
                      ['transparent', 'Flow-path / transparent'],
                    ]}
                  />
                  <button
                    title="Pan camera: toggle, then drag"
                    aria-label="Pan camera"
                    aria-pressed={pan}
                    onClick={() => {
                      setPan((v) => !v);
                      setFollow('none');
                    }}
                    style={{ color: pan ? '#cee9ad' : undefined }}
                  >
                    <Hand size={16} />
                  </button>
                  <button
                    title="Reset camera"
                    aria-label="Reset camera"
                    onClick={() => {
                      setFollow('none');
                      setPan(false);
                      setCameraReset((v) => v + 1);
                    }}
                  >
                    <Focus size={17} />
                  </button>
                </div>
              </div>
              <div
                className="scene-canvas"
                data-testid="scene"
                data-ready={ready}
              >
                <div className="scene-corner">
                  <span className="eyebrow">O₂ / CH₄ · PARTIAL-FLOW ORSC</span>
                  <span className="phase-chip">
                    <i className={playing ? 'status-dot' : 'idle-dot'} />
                    {state.phase.name}
                  </span>
                </div>
                <EngineScene
                  state={state}
                  playing={playing}
                  speed={speed}
                  pan={pan}
                  view={view}
                  isolate={isolate}
                  labels={labels}
                  reset={cameraReset}
                  follow={follow}
                  selected={selected}
                  onSelect={setSelected}
                  onHover={setHovered}
                  onReady={onReady}
                />
                {hover && (
                  <div className="hover-card">
                    <Inspection component={hover} beginner={beginner} compact />
                  </div>
                )}
                <div className="scene-bottom">
                  <span>
                    Drag to orbit · Scroll to zoom · Right-drag to pan
                  </span>
                  <label>
                    <Switch
                      checked={labels}
                      onCheckedChange={setLabels}
                      aria-label="Component labels"
                      size="sm"
                    />{' '}
                    Labels
                  </label>
                </div>
              </div>
              <div className="flow-controls">
                <span className="eyebrow">TRACE FLOW</span>
                <div className="flow-options">
                  {[
                    ['all', 'All'],
                    ['lox', 'LOX'],
                    ['fuel', 'CH₄'],
                    ['hot', 'Hot gas'],
                    ['purge', 'Purge'],
                  ].map(([id, name]) => (
                    <button
                      key={id}
                      className={isolate === id ? 'active' : ''}
                      onClick={() => {
                        setIsolate(id);
                        if (follow !== 'none')
                          setFollow(
                            id === 'all' || id === 'purge' ? 'none' : id,
                          );
                      }}
                      aria-pressed={isolate === id}
                    >
                      {id !== 'all' && <i style={{ background: colors[id] }} />}
                      {name}
                    </button>
                  ))}
                </div>
                <Choice
                  label="Follow propellant"
                  value={follow}
                  onChange={(v) => {
                    setFollow(v);
                    if (v !== 'none') setIsolate(v);
                  }}
                  options={[
                    ['none', 'Follow: off'],
                    ['lox', 'Follow LOX'],
                    ['fuel', 'Follow methane'],
                    ['hot', 'Follow hot gas'],
                  ]}
                />
              </div>
            </section>
            <aside className="right-panel panel">
              {component && (
                <Inspection
                  component={component}
                  beginner={beginner}
                  onClose={() => setSelected(null)}
                />
              )}
              <Telemetry state={state} beginner={beginner} />
              <div className="component-picker">
                <Choice
                  label="Inspect a component"
                  value={selected || ''}
                  onChange={setSelected}
                  options={[
                    ['', 'Inspect a component…'],
                    ...state.components.map(
                      (c) => [c.id, c.name] as [string, string],
                    ),
                  ]}
                />
              </div>
            </aside>
          </div>
          {errors.length > 0 && (
            <div className="validation-strip" role="alert">
              <TriangleAlert size={18} />
              <div>
                <b>
                  {state.feasible
                    ? 'Outside model guidance'
                    : 'Requested design point is not feasible'}{' '}
                  · {errors.length} finding{errors.length !== 1 ? 's' : ''}
                </b>
                <p>{errors[0].message}</p>
                <a href="#warnings">
                  Review validation results <ArrowRight size={13} />
                </a>
              </div>
            </div>
          )}
          <section className="timeline panel">
            <div className="timeline-head">
              <div>
                <span className="eyebrow">OPERATING SEQUENCE</span>
                <h2 data-testid="phase">{state.phase.name}</h2>
              </div>
              <div className="transport">
                <button
                  className="primary play-button"
                  onClick={() => {
                    if (time >= state.duration) setTime(0);
                    setPlaying((v) => !v);
                  }}
                >
                  {playing ? <Pause size={16} /> : <Play size={16} />}{' '}
                  {playing ? 'Pause' : time === 0 ? 'Start' : 'Play'}
                </button>
                <button
                  aria-label="Reset simulation"
                  title="Reset simulation"
                  onClick={() => {
                    scrub(0);
                    setFollow('none');
                  }}
                >
                  <RotateCcw size={16} />
                </button>
                <Choice
                  label="Simulation speed"
                  value={String(speed)}
                  onChange={(v) => setSpeed(Number(v))}
                  options={[
                    ['0.5', '0.5×'],
                    ['1', '1×'],
                    ['2', '2×'],
                  ]}
                />
                <span className="timecode">
                  {format(time, 1)}{' '}
                  <small>/ {format(state.duration, 0)} s</small>
                </span>
              </div>
            </div>
            <div className="phase-steps">
              {state.timeline.map((phase, i) => (
                <button
                  key={phase.id}
                  className={
                    state.phase.id === phase.id
                      ? 'current'
                      : time >= phase.end
                        ? 'complete'
                        : ''
                  }
                  onClick={() =>
                    scrub(phase.start + (phase.end - phase.start) * 0.5)
                  }
                  title={phase.description}
                >
                  <span>{String(i + 1).padStart(2, '0')}</span>
                  {phase.name
                    .replace('Safe / ', '')
                    .replace(' ignition', '')
                    .replace('Ramp to nominal thrust', 'Ramp')
                    .replace('Controlled ', '')
                    .replace('Post-shutdown ', 'Post-')}
                </button>
              ))}
            </div>
            <Range
              label="Timeline scrubber"
              min={0}
              max={state.duration}
              value={time}
              step={0.1}
              onChange={scrub}
            />
            <div className="stage-explanation">
              <p>{state.phase.description}</p>
              <details>
                <summary>
                  <Info size={14} /> Why is this step necessary?
                </summary>
                <p>{state.phase.why}</p>
              </details>
            </div>
          </section>
          <section className="engineering-reference">
            <div className="reference-heading">
              <BookOpen size={17} />
              <h2>Understand the engine</h2>
              <span>Follow the physics behind the animation.</span>
            </div>
            <details>
              <summary>
                Flow path explanation
                <ChevronRight size={17} />
              </summary>
              <div className="flow-text">
                {Object.entries(flowExplanation).map(([id, text]) => (
                  <article key={id}>
                    <h3 style={{ color: colors[id] }}>
                      {id === 'lox'
                        ? '01 · Liquid oxygen'
                        : id === 'fuel'
                          ? '02 · Methane & cooling'
                          : id === 'hot'
                            ? '03 · Turbine power & gas return'
                            : '04 · Separate inert purge'}
                    </h3>
                    <p>{text}</p>
                  </article>
                ))}
                <p>
                  Both preburner branches use additional pressure boosters.
                  Their power demand is included in the common-shaft balance.
                  The main oxidizer branch bypasses the preburner. This
                  illustrative partial-flow topology is not a reproduction of a
                  specific production engine.
                </p>
              </div>
            </details>
            <details>
              <summary>
                Equations and assumptions
                <ChevronRight size={17} />
              </summary>
              <div className="equations">
                {state.equations.map((e) => (
                  <article key={e.title}>
                    <h3>{e.title}</h3>
                    <code>{e.equation}</code>
                    <p>{e.note}</p>
                  </article>
                ))}
                <p>
                  Fundamental relationships:{' '}
                  <a
                    href="https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/rocket-thrust/"
                    target="_blank"
                    rel="noreferrer"
                  >
                    NASA — Rocket thrust
                  </a>{' '}
                  ·{' '}
                  <a
                    href="https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/specific-impulse/"
                    target="_blank"
                    rel="noreferrer"
                  >
                    NASA — Specific impulse
                  </a>
                  . Numerical fits and component assumptions are illustrative
                  choices, not NASA performance data.
                </p>
              </div>
            </details>
            <details>
              <summary>
                Component glossary
                <ChevronRight size={17} />
              </summary>
              <div className="glossary">
                {state.components.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      setSelected(c.id);
                      document
                        .querySelector('.workspace')
                        ?.scrollIntoView({ behavior: 'smooth' });
                    }}
                  >
                    <b>{c.name}</b>
                    <span>{c.function}</span>
                    <ChevronRight size={14} />
                  </button>
                ))}
              </div>
            </details>
            <details>
              <summary>
                Model limitations
                <ChevronRight size={17} />
              </summary>
              <div className="limitations">
                <p>
                  The steady model checks requested flow, pressure and power
                  consistency. Startup and shutdown use prescribed
                  interpolation, not a physical transient solver. Real-engine
                  predictions additionally require:
                </p>
                <ul>
                  {state.limitations.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
                <p>
                  Never use this application as an engine design, manufacturing,
                  operating, test-procedure or safety-analysis tool.
                </p>
              </div>
            </details>
            <details id="warnings" open={errors.length > 0}>
              <summary>
                Warnings and validation results{' '}
                <span className="warning-count">{errors.length} findings</span>
                <ChevronRight size={17} />
              </summary>
              <div className="warnings-list">
                {state.warnings.map((w) => (
                  <div key={w.code} className={w.severity}>
                    <b>{w.severity.toUpperCase()}</b>
                    <p>{w.message}</p>
                    {w.components.length > 0 && (
                      <button
                        onClick={() => {
                          setSelected(w.components[0]);
                          document
                            .querySelector('.workspace')
                            ?.scrollIntoView({ behavior: 'smooth' });
                        }}
                      >
                        Inspect branch <ArrowRight size={13} />
                      </button>
                    )}
                  </div>
                ))}
                <p>
                  These are necessary checks within a simplified model, not
                  proof of a physically realizable engine.
                </p>
              </div>
            </details>
          </section>
        </>
      )}
      <footer>
        <span>
          Illustrative engineering model — not a validated or qualified engine
          design.
        </span>
        <span>SI UNITS · VACUUM PERFORMANCE · SCHEMATIC GEOMETRY</span>
      </footer>
    </main>
  );
}
