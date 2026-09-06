def calculate_pump_outlet_pressure(inlet_bar, rise_bar, speed_load=1):
    return inlet_bar + rise_bar * speed_load

def calculate_pump_power(mass_flow, density, pressure_rise_bar, efficiency):
    return max(0, pressure_rise_bar) * 1e5 * mass_flow / density / efficiency / 1000
