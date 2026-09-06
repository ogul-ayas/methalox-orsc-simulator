export type Config = Record<string, number>;
export type Parameter = {
  title: string;
  description: string;
  unit: string;
  group: string;
  minimum: number;
  maximum: number;
  step: number;
};
export type Component = {
  id: string;
  name: string;
  function: string;
  fluid: string;
  kind: string;
  inlet_bar: number;
  outlet_bar: number;
  delta_p_bar: number;
  temperature_k: number;
  mass_flow: number;
  opening_percent: number | null;
  power_kw: number | null;
  invalid: boolean;
  note: string;
};
export type Phase = {
  id: string;
  name: string;
  description: string;
  why: string;
  start: number;
  end: number;
  time: number;
  load: number;
  pump: number;
  preburner: number;
  purge: boolean;
  pb_igniter: boolean;
  main_igniter: boolean;
};
export type State = {
  feasible: boolean;
  config: Config;
  telemetry: Record<string, number | string>;
  design: Record<string, number>;
  phase: Phase;
  timeline: Phase[];
  duration: number;
  components: Component[];
  warnings: {
    code: string;
    severity: string;
    message: string;
    components: string[];
  }[];
  equations: { title: string; equation: string; note: string }[];
  limitations: string[];
};
export async function fetchConfig(): Promise<{
  config: Config;
  schema: Record<string, Parameter>;
}> {
  const response = await fetch('/api/config');
  if (!response.ok) throw new Error('Unable to load Python configuration.');
  return response.json();
}
export async function calculate(
  config: Config,
  time_s: number,
  signal?: AbortSignal,
): Promise<State> {
  const response = await fetch('/api/calculate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ config, time_s }),
    signal,
  });
  if (!response.ok) {
    const body = (await response.json()) as {
      detail?: { loc: string[]; msg: string }[];
    };
    throw new Error(
      Array.isArray(body.detail)
        ? body.detail
            .map((d) => d.loc.slice(1).join('.') + ': ' + d.msg)
            .join('; ')
        : 'Calculation failed.',
    );
  }
  return response.json();
}
export const format = (n: number, d = 1) =>
  Number.isFinite(n)
    ? n.toLocaleString('en-US', {
        maximumFractionDigits: d,
        minimumFractionDigits: d,
      })
    : '—';
