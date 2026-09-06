def calculate_cooling_channel_state(inlet_bar, mass_flow, design_flow, loss_bar, load=1):
    ratio = mass_flow / max(design_flow, 1e-9)
    # Prescribed heat pickup, not a heat-transfer or real-fluid phase calculation.
    temperature = 112 + 280 * load
    return dict(outlet_bar=inlet_bar-loss_bar*ratio**2, temperature_k=temperature,
                heat_kw=mass_flow*3.5*(temperature-112))
