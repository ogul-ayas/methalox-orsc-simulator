import { Component, format } from '../api/engine';
import { X, MousePointer2 } from 'lucide-react';
export function Inspection({
  component,
  onClose,
  beginner = false,
  compact = false,
}: {
  component: Component;
  onClose?: () => void;
  beginner?: boolean;
  compact?: boolean;
}) {
  const c = component;
  return (
    <section
      className={'inspection ' + (compact ? 'compact' : '')}
      data-testid={compact ? 'hover-tooltip' : 'component-inspector'}
    >
      <div className="eyebrow">
        <MousePointer2 size={13} />{' '}
        {compact ? 'COMPONENT PREVIEW' : 'SELECTED COMPONENT'}
        {onClose && (
          <button aria-label="Close inspection" onClick={onClose}>
            <X size={15} />
          </button>
        )}
      </div>
      <h3>{c.name}</h3>
      <p>{c.function}</p>
      <span className={'fluid-tag ' + c.fluid}>
        {
          (
            {
              lox: 'Liquid oxygen',
              fuel: 'Methane',
              heated: 'Heated methane',
              hot: 'Oxygen-rich gas',
              combustion: 'Combustion gas',
              purge: 'Inert purge gas',
              hardware: 'Mechanical / ignition',
            } as Record<string, string>
          )[c.fluid]
        }
      </span>
      {!beginner && (
        <div className="inspect-grid">
          <span>
            Inlet pressure<b>~{format(c.inlet_bar)} bar</b>
          </span>
          <span>
            Outlet pressure<b>~{format(c.outlet_bar)} bar</b>
          </span>
          <span>
            Δp (out − in)<b>{format(c.delta_p_bar)} bar</b>
          </span>
          <span>
            Temperature<b>~{format(c.temperature_k, 0)} K</b>
          </span>
          <span>
            Mass flow<b>{format(c.mass_flow, 2)} kg/s</b>
          </span>
          {c.opening_percent !== null && (
            <span>
              Valve opening<b>{format(c.opening_percent, 0)}%</b>
            </span>
          )}
          {c.power_kw !== null && (
            <span>
              Shaft power<b>~{format(c.power_kw, 0)} kW</b>
            </span>
          )}
        </div>
      )}
      {c.invalid && (
        <p className="error-text">
          This branch is infeasible at the requested design point.
        </p>
      )}
      <small>{c.note}</small>
    </section>
  );
}
