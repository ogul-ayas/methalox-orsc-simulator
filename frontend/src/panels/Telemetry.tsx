import { State, format } from '../api/engine';
import { Activity, CheckCircle2, TriangleAlert } from 'lucide-react';
export function Telemetry({
  state,
  beginner,
}: {
  state: State;
  beginner: boolean;
}) {
  const t = state.telemetry;
  const rows: [string, string, string, number?][] = [
    ['Chamber pressure', 'chamber_pressure_bar', 'bar'],
    ['Specific impulse', 'isp_s', 's'],
    ['Total mass flow', 'total_mass_flow', 'kg/s', 2],
    ['LOX mass flow', 'lox_mass_flow', 'kg/s', 2],
    ['Methane mass flow', 'fuel_mass_flow', 'kg/s', 2],
    ['O/F ratio', 'mixture_ratio', '', 2],
    ['LOX pump outlet', 'lox_pump_outlet_bar', 'bar'],
    ['Fuel pump outlet', 'fuel_pump_outlet_bar', 'bar'],
  ];
  return (
    <>
      <div className="panel-heading">
        <Activity size={16} />
        <h2>Live Engine Telemetry</h2>
        <i className="status-dot" />
      </div>
      <div className="telemetry-body">
        <div className="section-label">ESTIMATED VACUUM THRUST</div>
        <div className="thrust" data-testid="thrust">
          {format(Number(t.thrust_kn), 1)}
          <span>kN</span>
        </div>
        <div className="thrust-track">
          <div style={{ width: Math.min(100, state.phase.load * 100) + '%' }} />
        </div>
        <div className="rating">
          {format(state.config.target_thrust_kn, 0)} kN design target ·{' '}
          {format(Number(t.throttle) * 100, 0)}% throttle
        </div>
        {!state.feasible && (
          <p className="error-text">
            Requested point only — not an achievable thrust prediction.
          </p>
        )}
        <dl className="metrics">
          {rows
            .slice(0, beginner ? 3 : undefined)
            .map(([label, key, unit, d]) => (
              <div key={key}>
                <dt>{label}</dt>
                <dd data-testid={key}>
                  {format(Number(t[key]), d ?? 1)} <small>{unit}</small>
                </dd>
              </div>
            ))}
        </dl>
        <div className="system-status">
          <div>
            <span>TURBINE</span>
            <b>{t.turbine_state}</b>
          </div>
          <div>
            <span>PREBURNER</span>
            <b>{t.preburner_state}</b>
          </div>
          <div>
            <span>IGNITION</span>
            <b>{t.ignition_state}</b>
          </div>
        </div>
        {!beginner && (
          <div className="power-balance">
            <div className="section-label">DESIGN SHAFT-POWER CHECK</div>
            <div>
              <span>Available capacity</span>
              <b>{format(state.design.available_kw, 0)} kW</b>
            </div>
            <div>
              <span>Pump demand</span>
              <b>{format(state.design.demand_kw, 0)} kW</b>
            </div>
            <div
              className={state.design.margin_kw < 0 ? 'error-text' : 'positive'}
            >
              <span>Reserve</span>
              <b>{format(state.design.margin_kw, 0)} kW</b>
            </div>
          </div>
        )}
        <div className={'validity ' + (state.feasible ? 'good' : 'bad')}>
          {state.feasible ? (
            <CheckCircle2 size={16} />
          ) : (
            <TriangleAlert size={16} />
          )}
          <div>
            <b>
              {state.feasible
                ? 'Simplified checks passed'
                : 'Design point not feasible'}
            </b>
            <small>
              {state.feasible
                ? 'Pressure margins and shaft power checked.'
                : 'Review the highlighted branches and warnings.'}
            </small>
          </div>
        </div>
      </div>
    </>
  );
}
