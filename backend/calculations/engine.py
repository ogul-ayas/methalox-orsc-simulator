"""Steady requested operating point plus a deliberately prescribed educational timeline.

No solver silently repairs an infeasible input. Requested flows remain visible,
but the design and performance are marked infeasible when head/power is missing.
"""
import numpy as np
from backend.models.engine_config import EngineConfig
from backend.models.engine_state import ComponentState, EngineState
from .flow import calculate_mass_flow, calculate_oxidizer_and_fuel_split, calculate_pipe_pressure_drop
from .valves import calculate_valve_pressure_drop
from .pumps import calculate_pump_outlet_pressure, calculate_pump_power
from .cooling import calculate_cooling_channel_state
from .preburner import calculate_preburner_state, calculate_turbine_power_balance
from .performance import calculate_chamber_performance, calculate_thrust, calculate_injector_pressure_margin
from .validation import validate_engine_state
from .timeline import timeline_state

EQUATIONS = [
 dict(title='Mixture and mass conservation',equation='O/F = ṁ_LOX / ṁ_CH₄; ṁ_total = ṁ_LOX + ṁ_CH₄',note='All preburner mass returns to the main chamber through the turbine. It is counted once.'),
 dict(title='Vacuum thrust and sizing',equation='F = ṁ × Isp × g₀; Isp = c* × Cf,vac × 0.97 / g₀',note='g₀ = 9.80665 m/s². Constant γ = 1.22 nozzle expansion; c* = 1940 × max(0.65, 1 − 0.025(O/F − 3.4)²) m/s. At each Apply the throat is resized to Ftarget / (Pc × Cf × 0.97). Flow scales linearly with throttle.'),
 dict(title='Liquid valves',equation='Δp [bar] = (Q [m³/h] / (Kv × opening))² × ρ / 1000',note='Opening is a fraction. Linear Kv/opening is illustrative. A closed valve at nonzero requested flow has no solution; a flagged finite sentinel represents its loss.'),
 dict(title='Pipes, filters and cooling',equation='Δp_pipe = f (L/D) ρv²/2; Δp ∝ ṁ²',note='Darcy f = 0.018. Equivalent line length is split equally before and after each main pump. Filter, cooling and required injector losses are referenced to full-design branch flow.'),
 dict(title='Pumps',equation='P_shaft = Δp × (ṁ / ρ) / η_pump',note='Main pumps use a fixed prescribed head at each throttle, referenced to nominal fully open suction. Restrictions therefore lower downstream pressure. All low-pressure and preburner branch boosters are included; no pump maps.'),
 dict(title='Preburner and turbine',equation='Tpb = 110 + 0.90 × min(ṁf, ṁo/4) × 50 MJ/kg / (ṁpb × cp); Pavailable = ṁpb cp Tpb [1 − (Pout/Pin)^((γ−1)/γ)] ηt × 0.97',note='Effective cp = 1500 J/kg/K and γ = 1.30; 10 bar preburner-injector loss at rated flow. Preburner branch boosters are needed because only 25% of LOX enters this illustrative partial-flow cycle. A governor extracts only demanded shaft power; excess is available capacity.'),
 dict(title='Cooling and chamber temperature',equation='Tfuel,out = 112 + 280 × throttle K; Q̇cool = ṁfuel × 3.5 kJ/kg/K × ΔT',note='Prescribed heat pickup, without boiling or a real-fluid model. Chamber temperature = max(2200, 3450 − 100(O/F − 3.4)²) K.'),
 dict(title='Injector margin',equation='Margin = Pinlet − Pc − Δprequired',note='Positive residual head is assigned to illustrative metering. Negative margin means the requested point is infeasible; outputs are requested values, not achieved predictions.'),
 dict(title='Animation and startup',equation='Displayed transient = prescribed phase interpolation × requested steady state',note='The timeline is a teaching animation, not a coupled transient solver. Spin-up assumes an external starter. Pre-ignition storage, venting and energy closure are not calculated. Durations are not an engine procedure.'),
]
LIMITATIONS = ['Real valve flow characteristics and cavitation / NPSH analysis','Experimental pump maps and turbine maps','Detailed line losses and injector design','Combustion stability, chemical equilibrium and kinetics','Real-gas cryogenic properties and phase change','Thermal, structural and oxygen compatibility analysis','Full transient startup / shutdown dynamics, accumulation and venting','CFD, experimental validation and instrument uncertainty','Schematic geometry: no dimensions for manufacture; vacuum performance only; no ambient separation model']

def calculate_engine(config: EngineConfig, time_s: float=0) -> EngineState:
    c=config; q=c.throttle; pc=c.chamber_pressure_bar*q
    perf=calculate_chamber_performance(c.mixture_ratio,c.expansion_ratio)
    rated_total=calculate_mass_flow(c.target_thrust_kn,perf['isp_s'])
    flow=calculate_oxidizer_and_fuel_split(rated_total*q,c.mixture_ratio,c.preburner_lox_fraction,c.preburner_fuel_fraction)
    required=c.injector_pressure_drop_bar*q*q
    components=[]
    def add(id,name,function,fluid,kind,pin,pout,temp,mass,**kw):
        component=ComponentState(id=id,name=name,function=function,fluid=fluid,kind=kind,inlet_bar=pin,outlet_bar=pout,temperature_k=temp,mass_flow=mass,delta_p_bar=pout-pin,**kw)
        components.append(component)
        return component
    feeds={}; demand=0; margins={}
    for fluid,title,density,temp in [('lox','LOX',c.lox_density,90),('fuel','Methane',c.fuel_density,112)]:
        mass=flow[fluid]; tank=getattr(c,fluid+'_tank_pressure_bar')
        kv=getattr(c,fluid+'_valve_kv'); opening=getattr(c,fluid+'_valve_opening')
        pipe=calculate_pipe_pressure_drop(mass,density,getattr(c,fluid+'_pipe_diameter_mm'),getattr(c,fluid+'_pipe_length_m')/2)
        valve=calculate_valve_pressure_drop(mass,density,kv,opening)
        filter_drop=c.filter_loss_bar*q*q
        add(fluid+'_tank',title+' tank','Stores the liquid propellant and supplies positive feed pressure.',fluid,'tank',tank,tank,temp,mass)
        p=tank-filter_drop
        add(fluid+'_filter',title+' outlet filter','Traps illustrative particulate contamination before the valve.',fluid,'filter',tank,p,temp,mass)
        add(fluid+'_valve','Main '+title+' valve','Isolates or admits propellant. Loss depends on Kv and opening.',fluid,'valve',p,p-valve,temp,mass,opening_percent=opening)
        p-=valve
        add(fluid+'_feed_line',title+' feed line','Carries liquid from the main valve to the booster.',fluid,'pipe',p,p-pipe,temp,mass)
        p-=pipe
        efficiency=getattr(c,fluid+'_pump_efficiency')
        boost=c.booster_rise_bar*q
        power=calculate_pump_power(mass,density,boost,efficiency); demand+=power
        add(fluid+'_booster',title+' booster pump','Adds low-pressure feed head; common-shaft auxiliary drive is assumed.',fluid,'pump',p,p+boost,temp,mass,power_kw=power)
        p+=boost
        # Establish a full-design reference head once per configuration, at 100% valve opening.
        fullmass=mass/q
        ref_suction=tank-c.filter_loss_bar-calculate_valve_pressure_drop(fullmass,density,kv,100)-pipe/q**2+c.booster_rise_bar
        rise=max(0,getattr(c,fluid+'_pump_outlet_bar')-ref_suction)*q
        out=calculate_pump_outlet_pressure(p,rise)
        power=calculate_pump_power(mass,density,rise,efficiency); demand+=power
        add(fluid+'_pump','Main '+title+' turbopump','Common shaft drives the impeller to raise liquid pressure.',fluid,'pump',p,out,temp,mass,power_kw=power)
        add(fluid+'_manifold','High-pressure '+title+' manifold','Splits the main flow from the separately boosted preburner branch.',fluid,'manifold',out,out,temp,mass)
        main=flow['main_'+fluid]
        pipe=calculate_pipe_pressure_drop(main,density,getattr(c,fluid+'_pipe_diameter_mm'),getattr(c,fluid+'_pipe_length_m')/2)
        add(fluid+'_main_line',title+' main delivery line','Main branch to '+('the oxidizer injector.' if fluid=='lox' else 'the nozzle-end cooling inlet.'),fluid,'pipe',out,out-pipe,temp,main)
        downstream=out-pipe
        if fluid=='fuel':
            cooling=calculate_cooling_channel_state(downstream,main,main/q,c.cooling_pressure_drop_bar,q)
            add('cooling','Regenerative cooling channels','Methane travels from the nozzle toward the chamber, absorbing prescribed wall heat.',fluid,'cooling',downstream,cooling['outlet_bar'],cooling['temperature_k'],main,note='Inlet 112 K; outlet temperature shown. Prescribed heat pickup, not a phase-change calculation.')
            downstream=cooling['outlet_bar']; temp=cooling['temperature_k']
            add('cooling_manifold','Cooling outlet manifold','Collects heated methane and routes it into the fuel injector.','heated','manifold',downstream,downstream,temp,main)
            add('heated_line','Heated methane return','Completes the cooling path to the main fuel injector.','heated','pipe',downstream,downstream,temp,main)
        margins[fluid]=calculate_injector_pressure_margin(downstream,pc,required)
        metered=min(downstream,pc+required)
        add(fluid+'_trim_valve',title+' injector metering stage','Assigns positive residual feed head to a lumped metering stage; actuator position is not solved.',fluid if fluid=='lox' else 'heated','metering',downstream,metered,temp,main)
        add(fluid+'_injector','Main '+title+' injector','Introduces the main branch across the required injector drop, if sufficient feed pressure is available.',fluid if fluid=='lox' else 'heated','injector',metered,pc,temp,main)
        # Only branch mass is raised to the additional preburner pressure.
        pbmass=flow['pb_'+fluid]
        pbout=out+max(0,c.preburner_boost_bar-getattr(c,fluid+'_pump_outlet_bar'))*q
        pbpower=calculate_pump_power(pbmass,density,pbout-out,efficiency); demand+=pbpower
        add('pb_'+fluid+'_boost','Preburner '+title+' branch booster','Boosts only the small preburner branch; its shaft demand is included.',fluid,'pump',out,pbout,90 if fluid=='lox' else 112,pbmass,power_kw=pbpower)
        pbkv=c.preburner_lox_valve_kv if fluid=='lox' else c.preburner_valve_kv
        pbopening=c.preburner_lox_valve_opening if fluid=='lox' else c.preburner_valve_opening
        pbdrop=calculate_valve_pressure_drop(pbmass,density,pbkv,pbopening)
        add('pb_'+fluid+'_valve','Preburner '+title+' control valve','Controls the branch admitted to the oxygen-rich preburner.',fluid,'valve',pbout,pbout-pbdrop,90 if fluid=='lox' else 112,pbmass,opening_percent=pbopening)
        add('pb_'+fluid+'_line',title+' preburner branch','Carries the pressure-boosted minority branch to the preburner injector.',fluid,'pipe',pbout-pbdrop,pbout-pbdrop,90 if fluid=='lox' else 112,pbmass)
        feeds[fluid]=dict(pump_outlet=out,pb_inlet=pbout-pbdrop)
    pbpressure=min(feeds['lox']['pb_inlet'],feeds['fuel']['pb_inlet'])-10*q*q
    pb=calculate_preburner_state(flow['pb_lox'],flow['pb_fuel'],pbpressure)
    exhaust=pc+required+2*q*q
    power=calculate_turbine_power_balance(pb,exhaust,c.turbine_efficiency,demand)
    add('preburner','Oxygen-rich preburner','A small fuel flow releases energy into excess oxygen; all gas proceeds to the turbine.','hot','preburner',min(feeds['lox']['pb_inlet'],feeds['fuel']['pb_inlet']),pbpressure,pb['temperature_k'],pb['mass_flow'])
    add('hot_line','Preburner hot-gas duct','Carries oxygen-rich gas to the turbine.','hot','pipe',pbpressure,pbpressure,pb['temperature_k'],pb['mass_flow'])
    add('turbine','Common-shaft turbine','Extracts gas enthalpy to drive both main pumps and auxiliary boosters.','hot','turbine',pbpressure,exhaust,power['exhaust_temperature_k'],pb['mass_flow'],power_kw=power['delivered_kw'])
    add('shaft','Common shaft','Transmits turbine torque to both main pumps; schematic auxiliary gearing supplies boosters.','hardware','shaft',0,0,293,0,power_kw=demand)
    add('turbine_exhaust','Turbine exhaust return','Returns all preburner gas to the main injector; nothing is dumped overboard.','hot','pipe',exhaust,exhaust-2*q*q,power['exhaust_temperature_k'],pb['mass_flow'])
    add('hot_injector','Hot-gas injector','Admits oxygen-rich turbine exhaust into the main chamber.','hot','injector',exhaust-2*q*q,pc,power['exhaust_temperature_k'],pb['mass_flow'])
    add('injector','Combined injector face','Main LOX, heated methane and turbine exhaust meet at separate passages.','combustion','injector',min(feeds['lox']['pump_outlet'],next(x.inlet_bar for x in components if x.id=='fuel_injector')),pc,perf['chamber_temperature_k'],flow['total'])
    add('chamber','Main combustion chamber','Remaining oxygen and methane react; the total includes the returned preburner mass once.','combustion','chamber',pc,pc,perf['chamber_temperature_k'],flow['total'])
    add('throat','Nozzle throat','The illustrative choked section reaches Mach 1.','combustion','throat',pc,pc*(2/2.22)**(1.22/.22),perf['chamber_temperature_k']*2/2.22,flow['total'])
    add('nozzle','Expansion nozzle','Gas expands and accelerates; the calculated exit state assumes vacuum operation.','combustion','nozzle',pc*(2/2.22)**(1.22/.22),pc*perf['exit_pressure_ratio'],perf['chamber_temperature_k']/(1+.22*perf['exit_mach']**2/2),flow['total'])
    add('plume','Vacuum exhaust plume','Shows exhaust leaving the nozzle. Visual shape is illustrative.','combustion','plume',pc*perf['exit_pressure_ratio'],0,700,flow['total'])
    for id,name,kind in [('purge_tank','Inert purge supply','tank'),('purge_valve','Purge isolation valve','valve'),('purge_line','Purge distribution lines','pipe')]:
        add(id,name,'Provides separate inert line/chamber conditioning; purge regulator is prescribed.','purge',kind,5,1,293,0.05,**({'opening_percent':100} if kind=='valve' else {}))
    for id,name in [('pb_igniter','Preburner igniter'),('main_igniter','Main-chamber igniter')]:
        add(id,name,'Brief ignition source during the lighting phase; inactive at steady state.','hardware','igniter',1,1,293,0)
    warnings=validate_engine_state(c,components,power,pb,margins)
    feasible=not any(w.severity=='error' for w in warnings)
    thrust=calculate_thrust(flow['total'],perf['isp_s'])
    design=dict(thrust_kn=thrust,isp_s=perf['isp_s'],chamber_pressure_bar=pc,**flow,**power,preburner_temperature_k=pb['temperature_k'],preburner_of=pb['of'],preburner_pressure_bar=pbpressure,lox_injector_margin_bar=margins['lox'],fuel_injector_margin_bar=margins['fuel'],throat_area_m2=c.target_thrust_kn*1000/(c.chamber_pressure_bar*1e5*perf['cf']*0.97),exit_mach=perf['exit_mach'],lox_pump_outlet_bar=feeds['lox']['pump_outlet'],fuel_pump_outlet_bar=feeds['fuel']['pump_outlet'])
    phase,timeline,duration=timeline_state(c,time_s)
    load=phase['load']; pbfactor=phase['preburner']; pump=phase['pump']
    for comp in components:
        ispb=comp.id.startswith('pb_') or comp.id in ('preburner','hot_line','turbine','turbine_exhaust','hot_injector')
        factor=pbfactor if ispb else load
        if comp.fluid=='purge': factor=float(phase['purge'])
        if comp.id.endswith(('_tank','_filter','_valve','_feed_line','_booster','_pump','_manifold')) and comp.fluid in ('lox','fuel') and not comp.id.startswith('pb_'):
            f=comp.fluid
            factor=(flow['main_'+f]*load+flow['pb_'+f]*pbfactor)/flow[f]
        comp.mass_flow*=factor
        if comp.kind!='tank' and comp.fluid!='purge' and comp.fluid!='hardware':
            pressure_factor=pump if comp.kind in ('pump','manifold') else max(load,pbfactor)
            reference=getattr(c,comp.fluid+'_tank_pressure_bar') if comp.fluid in ('lox','fuel') and comp.id not in ('fuel_injector','lox_injector') else 1
            comp.inlet_bar=reference+(comp.inlet_bar-reference)*pressure_factor
            comp.outlet_bar=reference+(comp.outlet_bar-reference)*pressure_factor
        comp.delta_p_bar=comp.outlet_bar-comp.inlet_bar
        if comp.opening_percent is not None: comp.opening_percent*=min(1,factor)
        if comp.power_kw is not None: comp.power_kw*=pump*max(factor,load) if comp.id!='shaft' else pump*load
        if comp.temperature_k>300: comp.temperature_k=293+(comp.temperature_k-293)*min(1,factor)
    telemetry=dict(thrust_kn=thrust*load,isp_s=perf['isp_s'] if load else 0,chamber_pressure_bar=1+(pc-1)*load,total_mass_flow=flow['total']*load,lox_mass_flow=flow['lox']*load,fuel_mass_flow=flow['fuel']*load,mixture_ratio=c.mixture_ratio,throttle=c.throttle,lox_pump_outlet_bar=next(x.outlet_bar for x in components if x.id=='lox_pump'),fuel_pump_outlet_bar=next(x.outlet_bar for x in components if x.id=='fuel_pump'),turbine_state='Turbine driven' if pbfactor>0 else 'External starter' if pump else 'Stopped',preburner_state='Producing oxygen-rich gas' if pbfactor else 'Inactive',ignition_state='Preburner igniter' if phase['pb_igniter'] else 'Main igniter' if phase['main_igniter'] else 'Igniters off',pump_speed_relative=pump*np.sqrt(q),**{k:power[k]*load for k in ('available_kw','demand_kw','margin_kw')})
    return EngineState(feasible=feasible,config=c.model_dump(),telemetry=telemetry,design=design,phase=phase,timeline=timeline,duration=duration,components=components,warnings=warnings,equations=EQUATIONS,limitations=LIMITATIONS)

