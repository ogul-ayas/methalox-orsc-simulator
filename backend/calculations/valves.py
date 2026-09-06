def calculate_valve_pressure_drop(mass_flow, density, kv, opening_percent):
    """Kv = m³/h water at 1 bar; linear opening approximation.

    A shut valve has no hydraulic solution at nonzero requested flow. Return a
    finite sentinel loss and report infeasibility (JSON cannot contain infinity).
    """
    if not mass_flow:
        return 0.0
    if opening_percent <= 0:
        return 1e6
    flow_m3_h = mass_flow / density * 3600
    return (flow_m3_h / (kv * opening_percent / 100))**2 * density / 1000
