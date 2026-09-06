import { Config, Parameter, format } from '../api/engine';
import { Range } from '../components/Controls';
import { RotateCcw, ArrowUpRight, SlidersHorizontal } from 'lucide-react';
export function DesignInputs({
  draft,
  setDraft,
  schema,
  apply,
  reset,
  busy,
  dirty,
  beginner,
}: {
  draft: Config;
  setDraft: (v: Config) => void;
  schema: Record<string, Parameter>;
  apply: () => void;
  reset: () => void;
  busy: boolean;
  dirty: boolean;
  beginner: boolean;
}) {
  const groups = [...new Set(Object.values(schema).map((p) => p.group))];
  return (
    <aside className="design panel">
      <div className="panel-heading">
        <SlidersHorizontal size={16} />
        <h2>Design Inputs</h2>
        <span>01</span>
      </div>
      <div className="design-scroll">
        <div className="throttle-block">
          <div className="section-label">
            THROTTLE{' '}
            <b>
              {format(draft.throttle * 100, 0)}
              <small>%</small>
            </b>
          </div>
          <Range
            label="Throttle"
            value={draft.throttle}
            min={0.6}
            max={1}
            step={0.01}
            onChange={(v) => setDraft({ ...draft, throttle: v })}
          />
          <div className="range-labels">
            <span>60% · min. nominal</span>
            <span>100%</span>
          </div>
        </div>
        {groups.map((group, i) => (
          <details
            className="input-group"
            key={group}
            open={i === 0 ? true : undefined}
          >
            <summary>
              {group}
              <span>+</span>
            </summary>
            <div>
              {Object.entries(schema)
                .filter(([key, p]) => p.group === group && key !== 'throttle')
                .map(([key, p]) => (
                  <label
                    key={key}
                    className="input-field"
                    title={p.description}
                  >
                    <span>{p.title}</span>
                    <div>
                      <input
                        aria-label={p.title}
                        type="number"
                        value={Number.isFinite(draft[key]) ? draft[key] : ''}
                        min={p.minimum}
                        max={p.maximum}
                        step={p.step}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            [key]:
                              e.target.value === ''
                                ? NaN
                                : Number(e.target.value),
                          })
                        }
                      />
                      <small>{p.unit}</small>
                    </div>
                    {!beginner && (
                      <small className="input-hint">
                        {p.minimum}–{p.maximum} {p.unit} · {p.description}
                      </small>
                    )}
                  </label>
                ))}
            </div>
          </details>
        ))}
      </div>
      <div className="apply-area">
        <button
          className="primary"
          onClick={apply}
          disabled={
            busy || Object.values(draft).some((v) => !Number.isFinite(v))
          }
        >
          {busy ? 'Recalculating…' : 'Apply Changes'}
          <ArrowUpRight size={16} />
        </button>
        <button className="text-button" onClick={reset}>
          <RotateCcw size={13} /> Reset to nominal
        </button>
        <small>
          {dirty ? 'Unapplied changes' : 'Parameters synchronized with Python'}
        </small>
      </div>
    </aside>
  );
}
