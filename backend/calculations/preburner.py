def calculate_preburner_state(lox_flow, fuel_flow, inlet_bar):
    mass = lox_flow + fuel_flow
    # Effective cp includes a lumped dilution/phase-change allowance. No chemistry solver.
    cp = 1500.0
    burned_fuel = min(fuel_flow, lox_flow/4)
    temperature = 110 + burned_fuel*50e6*0.90/max(mass*cp, 1e-9)
    return dict(mass_flow=mass, of=lox_flow/max(fuel_flow,1e-9), temperature_k=temperature,
                pressure_bar=inlet_bar, cp=cp, gamma=1.30)

def calculate_turbine_power_balance(preburner, exhaust_bar, efficiency, pump_demand_kw):
    pin = preburner['pressure_bar']
    ratio = min(1.0, max(0.0001, exhaust_bar/max(pin,0.001)))
    available = preburner['mass_flow']*preburner['cp']*preburner['temperature_k']*(1-ratio**((preburner['gamma']-1)/preburner['gamma']))*efficiency*0.97/1000
    delivered = min(available, pump_demand_kw)
    return dict(available_kw=available, demand_kw=pump_demand_kw, margin_kw=available-pump_demand_kw,
                delivered_kw=delivered, exhaust_temperature_k=preburner['temperature_k']-delivered*1000/max(preburner['mass_flow']*preburner['cp']*0.97,1e-9))
