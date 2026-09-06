export type V3 = [number, number, number];
export const colors: Record<string, string> = {
  lox: '#4d9fff',
  fuel: '#43dfb1',
  heated: '#ffbd55',
  hot: '#ff7955',
  combustion: '#ffad62',
  purge: '#c5e3ef',
  hardware: '#94a6b6',
};
export const basePositions: Record<string, V3> = {
  lox_tank: [-2.1, 4.3, 0],
  fuel_tank: [2.1, 4.3, 0],
  lox_filter: [-2.1, 3.25, 0],
  fuel_filter: [2.1, 3.25, 0],
  lox_valve: [-2.1, 2.65, 0],
  fuel_valve: [2.1, 2.65, 0],
  lox_booster: [-2.1, 1.95, 0],
  fuel_booster: [2.1, 1.95, 0],
  lox_pump: [-2.1, 0.95, 0],
  fuel_pump: [2.1, 0.95, 0],
  lox_manifold: [-2.1, 0.25, 0],
  fuel_manifold: [2.1, 0.25, 0],
  pb_lox_boost: [-1.1, 1.8, -1.3],
  pb_fuel_boost: [1.1, 1.8, -1.3],
  pb_lox_valve: [-0.75, 2.45, -1.3],
  pb_fuel_valve: [0.75, 2.45, -1.3],
  preburner: [0, 2.65, -1.3],
  turbine: [0, 0.95, 0],
  shaft: [0, 0.95, 0],
  cooling: [0, 0, 0],
  cooling_manifold: [1.4, -0.3, 0.15],
  lox_trim_valve: [-1.1, -0.28, 0],
  fuel_trim_valve: [1.05, -0.3, 0.15],
  lox_injector: [-0.65, -0.28, 0],
  fuel_injector: [0.65, -0.28, 0.15],
  hot_injector: [0, -0.28, -0.5],
  injector: [0, -0.3, 0],
  chamber: [0, -0.94, 0],
  throat: [0, -1.6, 0],
  nozzle: [0, -2.5, 0],
  plume: [0, -4.5, 0],
  purge_tank: [3.7, 3.3, -1.4],
  purge_valve: [3.7, 2.3, -1.4],
  pb_igniter: [0.4, 2.7, -0.9],
  main_igniter: [0.65, -0.85, 0.2],
};
export function positions(exploded: boolean) {
  return Object.fromEntries(
    Object.entries(basePositions).map(([id, p]) => [
      id,
      exploded
        ? ([
            p[0] * 1.35,
            p[1] + (p[1] > 1 ? 1 : p[1] < -0.4 ? -0.5 : 0),
            p[2] * 1.5,
          ] as V3)
        : p,
    ]),
  );
}
export type Route = { id: string; points: V3[]; heated?: boolean };
export function routes(p: Record<string, V3>): Route[] {
  const result: Route[] = [];
  for (const f of ['lox', 'fuel']) {
    for (const [id, a, b] of [
      [f + '_tank', f + '_tank', f + '_filter'],
      [f + '_filter', f + '_filter', f + '_valve'],
      [f + '_feed_line', f + '_valve', f + '_booster'],
      [f + '_booster', f + '_booster', f + '_pump'],
      [f + '_pump', f + '_pump', f + '_manifold'],
    ])
      result.push({ id, points: [p[a], p[b]] });
    const s = f === 'lox' ? -1 : 1;
    result.push({
      id: 'pb_' + f + '_line',
      points: [
        p[f + '_manifold'],
        [s * 1.65, 0.25, -1.3],
        p['pb_' + f + '_boost'],
        p['pb_' + f + '_valve'],
        p.preburner,
      ],
    });
  }
  result.push({
    id: 'lox_main_line',
    points: [
      p.lox_manifold,
      [-2.7, p.lox_manifold[1], 0.2],
      [-2.7, -0.28, 0.2],
      p.lox_injector,
    ],
  });
  const cy = p.chamber[1] - basePositions.chamber[1];
  const coil: V3[] = [];
  for (let i = 0; i <= 300; i++) {
    const u = i / 300,
      y = -3.55 + 3.2 * u;
    const r = y < -1.6 ? 0.25 + (-1.6 - y) * 0.41 : 0.6;
    coil.push([
      Math.cos(u * Math.PI * 28) * r,
      y + cy,
      Math.sin(u * Math.PI * 28) * r,
    ]);
  }
  result.push({
    id: 'fuel_main_line',
    points: [
      p.fuel_manifold,
      [2.8, p.fuel_manifold[1], 0.3],
      [2.8, -3.55 + cy, 0.3],
      coil[0],
    ],
  });
  result.push({ id: 'cooling', points: coil, heated: true });
  result.push({
    id: 'heated_line',
    points: [coil[coil.length - 1], p.cooling_manifold, p.fuel_injector],
    heated: true,
  });
  result.push({
    id: 'hot_line',
    points: [p.preburner, [0, 2, -1.3], [0, 1.5, -0.4], p.turbine],
  });
  result.push({
    id: 'turbine_exhaust',
    points: [p.turbine, [0.55, 0.7, -0.8], [0.55, -0.1, -0.8], p.hot_injector],
  });
  result.push({ id: 'purge_tank', points: [p.purge_tank, p.purge_valve] });
  result.push({
    id: 'purge_line',
    points: [p.purge_valve, [3.7, 2, -2.2], [0, 2, -2.2], p.preburner],
  });
  result.push({
    id: 'purge_line',
    points: [p.purge_valve, [3.7, -0.8, -1.4], p.chamber],
  });
  for (const id of ['lox_injector', 'fuel_injector', 'hot_injector'])
    result.push({ id, points: [p[id], p.chamber] });
  result.push({
    id: 'chamber',
    points: [
      p.chamber,
      p.throat,
      [0, p.nozzle[1] - 1.1, 0],
      [0, p.plume[1] - 1.7, 0],
    ],
  });
  return result;
}
export const flowExplanation = {
  lox: 'LOX tank → filter → main valve → booster → main turbopump → high-pressure manifold → main oxidizer injector. A 25% nominal branch passes through a dedicated pressure booster and control valve to the preburner; its turbine exhaust returns to the main chamber.',
  fuel: 'Methane tank → filter → main valve → booster → main turbopump → manifold. Most methane enters the nozzle-end regenerative jacket, absorbs heat as it rises toward the chamber, and returns to the fuel injector. A small, separately boosted branch feeds the preburner.',
  hot: 'Oxygen-rich preburner → hot-gas duct → turbine → exhaust return → hot-gas injector → main chamber → nozzle. The common shaft transfers turbine work to the liquid pumps and auxiliary branch boosters.',
  purge:
    'Separate inert-gas supply → purge isolation valve / regulator → selected preburner and chamber passages. Purge flow appears only in the purge phases.',
};
