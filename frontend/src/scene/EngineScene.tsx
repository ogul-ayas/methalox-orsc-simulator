import {
  useMemo,
  useRef,
  useEffect,
  Component as ReactComponent,
  ReactNode,
} from 'react';
import { Canvas, useFrame, useThree, ThreeEvent } from '@react-three/fiber';
import { OrbitControls, Html, Grid } from '@react-three/drei';
import * as THREE from 'three';
import { Component, State } from '../api/engine';
import { positions, routes, colors, V3, Route } from './topology';

type Props = {
  state: State;
  playing: boolean;
  speed: number;
  pan: boolean;
  view: string;
  isolate: string;
  labels: boolean;
  reset: number;
  follow: string;
  selected: string | null;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
  onReady: () => void;
};
const visibleFluid = (fluid: string, isolate: string) =>
  isolate === 'all' ||
  fluid === isolate ||
  (isolate === 'fuel' && fluid === 'heated') ||
  fluid === 'combustion' ||
  fluid === 'hardware';
function FluidLine({
  route,
  component,
  active,
  playing,
  speed,
  selected,
  onSelect,
  onHover,
}: {
  route: Route;
  component: Component;
  active: boolean;
  playing: boolean;
  speed: number;
  selected: boolean;
  onSelect: () => void;
  onHover: (over: boolean) => void;
}) {
  const curve = useMemo(
    () =>
      new THREE.CatmullRomCurve3(
        route.points.map((p) => new THREE.Vector3(...p)),
        false,
        'centripetal',
      ),
    [route],
  );
  const geometry = useMemo(() => {
    const g = new THREE.TubeGeometry(
      curve,
      route.id === 'cooling' ? 400 : 70,
      route.id === 'cooling' ? 0.035 : 0.052,
      7,
      false,
    );
    if (route.id === 'cooling') {
      const a = new Float32Array(g.attributes.position.count * 3),
        cold = new THREE.Color(colors.fuel),
        hot = new THREE.Color(colors.heated);
      for (let i = 0; i < g.attributes.position.count; i++) {
        const col = cold.clone().lerp(hot, i / g.attributes.position.count);
        a.set([col.r, col.g, col.b], i * 3);
      }
      g.setAttribute('color', new THREE.BufferAttribute(a, 3));
    }
    return g;
  }, [curve, route.id]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  const particle = useRef<THREE.InstancedMesh>(null),
    phase = useRef(0);
  const matrix = useMemo(() => new THREE.Object3D(), []);
  const n =
    component.mass_flow > 0
      ? Math.min(32, Math.max(3, Math.round(component.mass_flow * 1.4)))
      : 0;
  useFrame((_, dt) => {
    if (playing)
      phase.current +=
        dt * speed * (0.045 + 0.016 * Math.sqrt(component.mass_flow));
    if (particle.current) {
      particle.current.count = n;
      for (let i = 0; i < n; i++) {
        let u = (phase.current + i / n) % 1;
        if (route.id === 'chamber') u = u * u;
        matrix.position.copy(curve.getPointAt(u));
        matrix.quaternion.setFromUnitVectors(
          new THREE.Vector3(0, 1, 0),
          curve.getTangentAt(u),
        );
        matrix.scale.set(0.65, 1.7, 0.65);
        matrix.updateMatrix();
        particle.current.setMatrixAt(i, matrix.matrix);
      }
      particle.current.instanceMatrix.needsUpdate = true;
    }
  });
  const color = component.invalid
    ? '#ff4668'
    : colors[component.fluid] || '#aabac8';
  return (
    <group visible={active}>
      <mesh
        geometry={geometry}
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          onHover(true);
        }}
        onPointerOut={() => onHover(false)}
      >
        <meshStandardMaterial
          color={route.id === 'cooling' && !component.invalid ? 'white' : color}
          vertexColors={route.id === 'cooling' && !component.invalid}
          transparent
          opacity={selected ? 1 : 0.65}
          emissive={color}
          emissiveIntensity={selected ? 0.7 : 0.12}
          metalness={0.25}
          roughness={0.4}
        />
      </mesh>
      <instancedMesh
        ref={particle}
        args={[undefined, undefined, 32]}
        raycast={() => null}
      >
        <coneGeometry args={[0.065, 0.12, 6]} />
        <meshBasicMaterial
          color={component.invalid ? '#ff4668' : '#e9fff9'}
          toneMapped={false}
        />
      </instancedMesh>
    </group>
  );
}
function Rotor({
  radius,
  speed,
  playing,
  color,
}: {
  radius: number;
  speed: number;
  playing: boolean;
  color: string;
}) {
  const ref = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (ref.current && playing) ref.current.rotation.z += dt * speed * 7;
  });
  return (
    <group ref={ref} position={[0, 0, 0.19]}>
      {Array.from({ length: 8 }, (_, i) => (
        <group key={i} rotation={[0, 0, (i * Math.PI) / 4]}>
          <mesh position={[radius * 0.5, 0, 0]} rotation={[0, 0, 0.35]}>
            <boxGeometry args={[radius * 0.7, 0.055, 0.07]} />
            <meshStandardMaterial
              color={color}
              metalness={0.65}
              roughness={0.3}
            />
          </mesh>
        </group>
      ))}
      <mesh>
        <sphereGeometry args={[radius * 0.18, 12, 8]} />
        <meshStandardMaterial
          color="#dfedf5"
          metalness={0.9}
          roughness={0.25}
        />
      </mesh>
    </group>
  );
}
function Hardware({ c, p, props }: { c: Component; p: V3; props: Props }) {
  const kind = c.kind,
    cut = props.view === 'cutaway',
    transparent = props.view === 'transparent';
  const selected = props.selected === c.id,
    active = visibleFluid(c.fluid, props.isolate);
  const color = c.invalid ? '#ff4668' : selected ? '#d9f0ff' : colors[c.fluid];
  const casing = transparent ? 0.1 : cut ? 0.65 : 0.95;
  const material = (
    <meshStandardMaterial
      color={selected ? '#91b4c7' : '#68818e'}
      metalness={0.45}
      roughness={0.38}
      transparent
      opacity={casing}
      side={THREE.DoubleSide}
    />
  );
  const events = {
    onClick: (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation();
      props.onSelect(c.id);
    },
    onPointerOver: (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      props.onHover(c.id);
    },
    onPointerOut: () => props.onHover(null),
  };
  const nozzlePoints = useMemo(
    () =>
      [
        [1.02, -1.1],
        [0.94, -0.85],
        [0.76, -0.5],
        [0.55, -0.05],
        [0.35, 0.45],
        [0.24, 0.8],
        [0.3, 0.94],
      ].map(([x, y]) => new THREE.Vector2(x, y)),
    [],
  );
  const glow =
    c.id === 'preburner' ? props.state.phase.preburner : props.state.phase.load;
  const ignited =
    c.id === 'pb_igniter'
      ? props.state.phase.pb_igniter
      : props.state.phase.main_igniter;
  const isPump = kind === 'pump' || kind === 'turbine';
  const r = kind === 'turbine' ? 0.42 : c.id.includes('boost') ? 0.24 : 0.4;
  const labeled = [
    'lox_tank',
    'fuel_tank',
    'preburner',
    'lox_pump',
    'fuel_pump',
    'chamber',
    'nozzle',
    'purge_tank',
  ].includes(c.id);
  if (
    !active ||
    kind === 'pipe' ||
    kind === 'cooling' ||
    kind === 'shaft' ||
    kind === 'plume'
  )
    return null;
  return (
    <group position={p} visible={active} {...events}>
      {kind === 'tank' && (
        <>
          <mesh>
            <capsuleGeometry
              args={[
                c.fluid === 'purge' ? 0.27 : 0.55,
                c.fluid === 'purge' ? 0.6 : 1.12,
                8,
                24,
              ]}
            />
            {material}
          </mesh>
          <mesh scale={[0.94, 0.92, 0.94]}>
            <capsuleGeometry
              args={[
                c.fluid === 'purge' ? 0.27 : 0.55,
                c.fluid === 'purge' ? 0.6 : 1.12,
                8,
                24,
              ]}
            />
            <meshStandardMaterial
              color={color}
              transparent
              opacity={0.32}
              emissive={color}
              emissiveIntensity={0.15}
            />
          </mesh>
          {[-0.4, 0.4].map((y) => (
            <mesh key={y} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry
                args={[c.fluid === 'purge' ? 0.28 : 0.56, 0.025, 6, 28]}
              />
              <meshStandardMaterial
                color={color}
                metalness={0.6}
                roughness={0.3}
              />
            </mesh>
          ))}
        </>
      )}
      {isPump && (
        <group
          rotation={[
            0,
            c.id.endsWith('_pump') || kind === 'turbine' ? Math.PI / 2 : 0,
            0,
          ]}
        >
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[r, r, 0.36, 32, 1, true]} />
            {material}
          </mesh>
          <mesh>
            <torusGeometry args={[r, 0.045, 8, 32]} />
            <meshStandardMaterial
              color={color}
              metalness={0.65}
              roughness={0.3}
            />
          </mesh>
          <Rotor
            radius={r}
            speed={
              Number(props.state.telemetry.pump_speed_relative) * props.speed
            }
            playing={props.playing}
            color={color}
          />
        </group>
      )}
      {kind === 'valve' && (
        <>
          <mesh>
            <boxGeometry args={[0.31, 0.31, 0.31]} />
            {material}
          </mesh>
          <mesh
            position={[0, 0, 0.19]}
            rotation={[0, 0, (((c.opening_percent ?? 0) / 100) * Math.PI) / 2]}
          >
            <boxGeometry args={[0.4, 0.065, 0.07]} />
            <meshStandardMaterial
              color={color}
              emissive={color}
              emissiveIntensity={0.3}
            />
          </mesh>
          <mesh position={[0, 0.22, 0]}>
            <cylinderGeometry args={[0.035, 0.035, 0.2, 8]} />
            {material}
          </mesh>
        </>
      )}
      {kind === 'filter' && (
        <>
          <mesh>
            <cylinderGeometry args={[0.2, 0.2, 0.32, 12]} />
            {material}
          </mesh>
          {[-0.1, 0, 0.1].map((y) => (
            <mesh key={y} rotation={[Math.PI / 2, 0, 0]} position={[0, y, 0]}>
              <torusGeometry args={[0.21, 0.018, 6, 16]} />
              <meshStandardMaterial color={color} />
            </mesh>
          ))}
        </>
      )}
      {(kind === 'manifold' || kind === 'metering') && (
        <mesh>
          <boxGeometry args={[0.23, 0.18, 0.23]} />
          <meshStandardMaterial
            color={color}
            metalness={0.65}
            roughness={0.35}
          />
        </mesh>
      )}
      {kind === 'injector' &&
        (c.id === 'injector' ? (
          <group>
            <mesh>
              <cylinderGeometry args={[0.62, 0.62, 0.14, 40]} />
              {material}
            </mesh>
            {Array.from({ length: 24 }, (_, i) => {
              const a = (i * Math.PI) / 12;
              return (
                <mesh
                  key={i}
                  position={[Math.cos(a) * 0.43, -0.09, Math.sin(a) * 0.43]}
                >
                  <sphereGeometry args={[0.035, 6, 6]} />
                  <meshBasicMaterial
                    color={
                      i % 3 === 0
                        ? colors.hot
                        : i % 3 === 1
                          ? colors.lox
                          : colors.fuel
                    }
                  />
                </mesh>
              );
            })}
          </group>
        ) : (
          <mesh>
            <sphereGeometry args={[0.12, 12, 10]} />
            <meshStandardMaterial color={color} />
          </mesh>
        ))}
      {(kind === 'chamber' || kind === 'preburner') && (
        <>
          <mesh rotation={[0, Math.PI / 4, 0]}>
            <cylinderGeometry
              args={[
                kind === 'chamber' ? 0.58 : 0.28,
                kind === 'chamber' ? 0.58 : 0.28,
                kind === 'chamber' ? 1.1 : 0.75,
                36,
                1,
                true,
                0,
                cut ? Math.PI * 1.4 : Math.PI * 2,
              ]}
            />
            {material}
          </mesh>
          {[-0.5, 0.5].map((y) => (
            <mesh
              key={y}
              position={[0, y * (kind === 'chamber' ? 1 : 0.65), 0]}
              rotation={[Math.PI / 2, 0, 0]}
            >
              <torusGeometry
                args={[kind === 'chamber' ? 0.59 : 0.29, 0.035, 8, 32]}
              />
              <meshStandardMaterial
                color="#6a808c"
                metalness={0.8}
                roughness={0.3}
              />
            </mesh>
          ))}
          {glow > 0 && (
            <mesh
              scale={[
                kind === 'chamber' ? 0.48 : 0.23,
                kind === 'chamber' ? 0.55 : 0.34,
                kind === 'chamber' ? 0.48 : 0.23,
              ]}
            >
              <sphereGeometry args={[1, 20, 16]} />
              <meshBasicMaterial
                color={color}
                transparent
                opacity={0.35 + glow * 0.3}
                toneMapped={false}
              />
            </mesh>
          )}
        </>
      )}
      {kind === 'throat' && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.27, 0.045, 8, 32]} />
          <meshStandardMaterial color={color} metalness={0.6} roughness={0.4} />
        </mesh>
      )}
      {kind === 'nozzle' && (
        <>
          <mesh rotation={[0, Math.PI / 4, 0]}>
            <latheGeometry
              args={[nozzlePoints, 48, 0, cut ? Math.PI * 1.4 : Math.PI * 2]}
            />
            {material}
          </mesh>
          <mesh position={[0, -1.1, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[1.02, 0.035, 8, 40]} />
            <meshStandardMaterial
              color="#8298a0"
              metalness={0.9}
              roughness={0.25}
            />
          </mesh>
        </>
      )}
      {kind === 'igniter' && (
        <mesh>
          <sphereGeometry args={[ignited ? 0.12 : 0.065, 12, 8]} />
          <meshBasicMaterial
            color={ignited ? '#fff19b' : '#7d8890'}
            toneMapped={false}
          />
        </mesh>
      )}
      {props.labels && labeled && (
        <Html
          center
          position={[
            c.id === 'lox_pump' ? -0.45 : c.id === 'fuel_pump' ? 0.45 : 0,
            kind === 'tank' ? 1.05 : kind === 'nozzle' ? -0.1 : 0.5,
            0.3,
          ]}
          zIndexRange={[2, 0]}
          style={{ pointerEvents: 'none' }}
        >
          <span className={'scene-label ' + c.fluid}>{c.name}</span>
        </Html>
      )}
    </group>
  );
}
function Shaft({ p, props }: { p: Record<string, V3>; props: Props }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (ref.current && props.playing)
      ref.current.rotation.x +=
        dt *
        Number(props.state.telemetry.pump_speed_relative) *
        props.speed *
        5;
  });
  const c = props.state.components.find((c) => c.id === 'shaft')!;
  return (
    <group
      position={p.shaft}
      onClick={(e) => {
        e.stopPropagation();
        props.onSelect('shaft');
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        props.onHover('shaft');
      }}
      onPointerOut={() => props.onHover(null)}
    >
      <group ref={ref}>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry
            args={[0.065, 0.065, p.fuel_pump[0] - p.lox_pump[0], 10]}
          />
          <meshStandardMaterial
            color={c.invalid ? '#ff4668' : '#a7b5bf'}
            metalness={0.8}
            roughness={0.3}
          />
        </mesh>
        <mesh position={[0, 0.07, 0]}>
          <boxGeometry args={[p.fuel_pump[0] - p.lox_pump[0], 0.025, 0.035]} />
          <meshStandardMaterial color="#536773" />
        </mesh>
      </group>
    </group>
  );
}
function Plume({ props, p }: { props: Props; p: V3 }) {
  const ref = useRef<THREE.Group>(null),
    t = useRef(0),
    load = props.state.phase.load * props.state.config.throttle;
  useFrame((_, dt) => {
    if (props.playing) t.current += dt * props.speed;
    if (ref.current)
      ref.current.scale.set(1, load * (1 + 0.03 * Math.sin(t.current * 20)), 1);
  });
  return (
    <group
      position={[0, p[1] - 1.1, 0]}
      ref={ref}
      visible={load > 0}
      onClick={(e) => {
        e.stopPropagation();
        props.onSelect('plume');
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        props.onHover('plume');
      }}
      onPointerOut={() => props.onHover(null)}
    >
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[0, -1 - i * 0.1, 0]}>
          <cylinderGeometry
            args={[0.88 - i * 0.15, 0.12, 2 + i * 0.2, 32, 1, true]}
          />
          <meshBasicMaterial
            color={i === 2 ? '#fff0c0' : i === 1 ? '#ffb657' : '#ff6741'}
            transparent
            opacity={0.11 + i * 0.05}
            side={THREE.DoubleSide}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  );
}
function World(props: Props) {
  const p = useMemo(() => positions(props.view === 'exploded'), [props.view]);
  const paths = useMemo(() => routes(p), [p]);
  const controls = useRef<any>(null),
    { camera, gl } = useThree();
  const index = useMemo(
    () => Object.fromEntries(props.state.components.map((c) => [c.id, c])),
    [props.state.components],
  );
  useEffect(() => {
    camera.position.set(8, 4, 16);
    controls.current?.target.set(0, 0.5, 0);
    controls.current?.update();
  }, [props.reset, camera]);
  useEffect(() => {
    gl.domElement.setAttribute('data-scene-ready', 'true');
    props.onReady();
  }, [gl]);
  const followTime = useRef(0);
  const followPaths = useMemo(() => {
    const ids =
      props.follow === 'lox'
        ? [
            'lox_tank',
            'lox_filter',
            'lox_feed_line',
            'lox_booster',
            'lox_pump',
            'lox_main_line',
            'lox_injector',
            'chamber',
          ]
        : props.follow === 'fuel'
          ? [
              'fuel_tank',
              'fuel_filter',
              'fuel_feed_line',
              'fuel_booster',
              'fuel_pump',
              'fuel_main_line',
              'cooling',
              'heated_line',
              'fuel_injector',
              'chamber',
            ]
          : ['hot_line', 'turbine_exhaust', 'hot_injector', 'chamber'];
    return ids
      .map((id) => paths.find((r) => r.id === id))
      .filter(Boolean)
      .map(
        (r) =>
          new THREE.CatmullRomCurve3(
            r!.points.map((p) => new THREE.Vector3(...p)),
          ),
      );
  }, [props.follow, paths]);
  const follower = useRef<THREE.Mesh>(null);
  useEffect(() => {
    followTime.current = 0;
  }, [props.follow]);
  useFrame((_, dt) => {
    if (props.follow === 'none') return;
    followTime.current += dt * 0.32 * props.speed;
    const i = Math.floor(followTime.current) % followPaths.length,
      u = followTime.current % 1,
      target = followPaths[i].getPointAt(u);
    follower.current?.position.copy(target);
    if (controls.current) {
      controls.current.target.lerp(target, 0.05);
      camera.position.lerp(
        target.clone().add(new THREE.Vector3(4, 2, 6)),
        0.025,
      );
      controls.current.update();
    }
  });
  return (
    <>
      <ambientLight intensity={1.5} />
      <directionalLight position={[4, 7, 7]} intensity={3.5} color="#e7f2ff" />
      <directionalLight
        position={[-5, 1, -4]}
        intensity={2.5}
        color="#66a8d0"
      />
      <pointLight
        position={[0, -1, 2]}
        intensity={props.state.phase.load * 8}
        color="#ff7944"
      />
      <Grid
        position={[0, -6.3, 0]}
        args={[18, 18]}
        cellSize={1}
        sectionSize={5}
        cellColor="#243443"
        sectionColor="#354c5d"
        fadeDistance={24}
        infiniteGrid
      />
      {paths.map(
        (route, i) =>
          index[route.id] && (
            <FluidLine
              key={route.id + i}
              route={route}
              component={index[route.id]}
              active={
                visibleFluid(index[route.id].fluid, props.isolate) &&
                (route.id !== 'chamber' || index[route.id].mass_flow > 0)
              }
              playing={props.playing}
              speed={props.speed}
              selected={props.selected === route.id}
              onSelect={() => props.onSelect(route.id)}
              onHover={(over) => props.onHover(over ? route.id : null)}
            />
          ),
      )}
      {props.state.components.map(
        (c) =>
          p[c.id] && <Hardware key={c.id} c={c} p={p[c.id]} props={props} />,
      )}
      <Shaft p={p} props={props} />
      <Plume props={props} p={p.nozzle} />
      <mesh ref={follower} visible={props.follow !== 'none'}>
        <sphereGeometry args={[0.15, 12, 8]} />
        <meshBasicMaterial color="#ffffff" toneMapped={false} />
      </mesh>
      <OrbitControls
        ref={controls}
        mouseButtons={{
          LEFT: props.pan ? THREE.MOUSE.PAN : THREE.MOUSE.ROTATE,
          MIDDLE: THREE.MOUSE.DOLLY,
          RIGHT: THREE.MOUSE.PAN,
        }}
        makeDefault
        enableDamping
        dampingFactor={0.1}
        minDistance={3}
        maxDistance={35}
        enablePan
        enableZoom
        enableRotate
        enabled={props.follow === 'none'}
      />
    </>
  );
}
class SceneBoundary extends ReactComponent<
  { children: ReactNode },
  { error: boolean }
> {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  render() {
    return this.state.error ? (
      <div className="scene-error">
        3D rendering is unavailable. Enable hardware acceleration and reload.
        Engineering inputs and telemetry remain available.
      </div>
    ) : (
      this.props.children
    );
  }
}
export default function EngineScene(props: Props) {
  return (
    <SceneBoundary>
      <Canvas
        camera={{ position: [8, 4, 16], fov: 42, near: 0.1, far: 150 }}
        dpr={[1, 1.6]}
        gl={{ antialias: true, alpha: true }}
      >
        <World {...props} />
      </Canvas>
    </SceneBoundary>
  );
}
