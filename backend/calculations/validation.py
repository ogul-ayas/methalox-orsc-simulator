from backend.models.engine_state import WarningItem

def validate_engine_state(config, components, power, preburner, margins):
    warnings=[]
    def warn(code,message,ids,severity='error'):
        warnings.append(WarningItem(code=code,severity=severity,message=message,components=ids))
    if not 0.6<=config.throttle<=1:
        warn('throttle_range','Requested throttle is outside the illustrative model range (60–100%).',[], 'warning')
    if not 2.5<=config.mixture_ratio<=4.5:
        warn('mixture_range','Mixture ratio is outside the calibrated illustrative performance range (2.5–4.5).',['chamber'],'warning')
    for fluid,margin in margins.items():
        if margin<0:
            warn('injector_'+fluid,'Injector inlet pressure is below the chamber-pressure margin: '+fluid+'. Selected turbopump outlet pressure may be insufficient.',[fluid+'_injector',fluid+'_pump',fluid+'_main_line']+(['cooling'] if fluid=='fuel' else []))
    for c in components:
        if c.kind=='valve' and c.fluid!='purge' and (c.inlet_bar-c.outlet_bar>max(2,c.inlet_bar*0.25) or c.opening_percent==0):
            warn('restriction_'+c.id,'Requested valve flow causes an excessive illustrative pressure drop: '+c.name+'.',[c.id])
        if min(c.inlet_bar,c.outlet_bar)<0:
            warn('pressure_'+c.id,'Requested flow produces a negative absolute pressure at '+c.name+'. No hydraulic solution exists.',[c.id])
    if power['margin_kw']<0:
        warn('power_balance','Estimated turbine power is below estimated pump-power demand.',['turbine','shaft','lox_pump','fuel_pump','pb_lox_boost','pb_fuel_boost'])
    if preburner['of']<=4:
        warn('not_oxygen_rich','Preburner mixture is not oxygen-rich (requires O/F > 4).',['preburner','pb_fuel_valve','pb_lox_valve'])
    if preburner['temperature_k']>1400:
        warn('preburner_temperature','Preburner temperature exceeds the 1,400 K illustrative screening limit; material compatibility is not established.',['preburner','turbine'])
    if preburner['pressure_bar']<=config.chamber_pressure_bar*config.throttle+config.injector_pressure_drop_bar*config.throttle**2+2:
        warn('turbine_pressure','Preburner pressure is insufficient to expand through the turbine and enter the chamber.',['preburner','turbine','hot_injector'])
    if config.preburner_boost_bar < max(config.lox_pump_outlet_bar,config.fuel_pump_outlet_bar):
        warn('boost_pressure','Preburner boost target is below a main-pump outlet; this booster-only model cannot regulate pressure down.',['pb_lox_boost','pb_fuel_boost'])
    if warnings:
        invalid_ids={i for w in warnings if w.severity=='error' for i in w.components}
        for c in components: c.invalid=c.id in invalid_ids
    warnings.append(WarningItem(code='illustrative',severity='info',message='Configuration is illustrative and not a validated engine design.'))
    return warnings
