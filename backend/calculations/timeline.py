STAGES = [
 ('idle','Safe / idle','Main valves are closed. Pumps are stopped.','Establishes a reference state before the demonstration.'),
 ('purge','Purge','Pale purge gas conditions selected lines and chambers.','Inert gas removes unwanted gases. Exact purge requirements are not modeled.'),
 ('spinup','Pump spin-up','An assumed external starter begins rotating the common shaft.','Pressure must build before sustained injection; the starter energy is outside this model.'),
 ('preburner','Preburner ignition','Controlled branch flows form oxygen-rich gas. The preburner igniter is briefly active.','The turbine converts gas enthalpy into shaft work to drive the pumps.'),
 ('ignition','Main-chamber ignition','Main feed admission and the main igniter begin the chamber-lighting illustration.','Ignition establishes combustion while methane is routed through the cooling jacket.'),
 ('ramp','Ramp to nominal thrust','Feed flow, pump load and chamber pressure approach the selected operating point.','A gradual transition illustrates controlled startup without solving transient dynamics.'),
 ('steady','Steady state','Stable flow; both igniters are off. Change throttle or inspect any component.','Sustained combustion supplies turbine power; igniters need not run continuously.'),
 ('shutdown','Controlled shutdown','Main and preburner valves close in a prescribed fade; shaft rotation decays.','Controlled energy removal is illustrated. This is not an operational valve schedule.'),
 ('postpurge','Post-shutdown purge','A short inert purge follows flow decay.','Illustrates conditioning after combustion ends.'),
]

def timeline_state(config, time):
    timeline=[]
    start=0.0
    for key,name,description,why in STAGES:
        duration=config.purge_duration if key=='postpurge' else getattr(config,key+'_duration')
        timeline.append(dict(id=key,name=name,start=start,end=start+duration,description=description,why=why))
        start+=duration
    t=max(0,min(time,start))
    phase=next((p.copy() for p in timeline if t<p['end']),timeline[0].copy())
    if t>=start:
        phase.update(name='Safe / complete',start=start,end=start,description='Demonstration complete. All propellant flow has stopped.',why='Reset or scrub to revisit a stage.')
    u=(t-phase['start'])/max(phase['end']-phase['start'],0.001)
    key=phase['id']
    load={'idle':0,'purge':0,'spinup':0,'preburner':0,'ignition':0.15*u,'ramp':0.15+0.85*u,'steady':1,'shutdown':1-u,'postpurge':0}[key]
    pump={'idle':0,'purge':0,'spinup':0.2*u,'preburner':0.2+0.15*u,'ignition':0.35,'ramp':0.35+0.65*u,'steady':1,'shutdown':1-u,'postpurge':0}[key]
    pb={'idle':0,'purge':0,'spinup':0,'preburner':0.15*u,'ignition':0.15,'ramp':load,'steady':1,'shutdown':max(0,1-u*1.2),'postpurge':0}[key]
    phase.update(time=t,load=load,pump=pump,preburner=pb,purge=key in ('purge','postpurge'),pb_igniter=key=='preburner' and u<0.65,main_igniter=key=='ignition' and u<0.65)
    return phase,timeline,start
