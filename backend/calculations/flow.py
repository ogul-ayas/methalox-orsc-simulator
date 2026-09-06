from math import pi

G0 = 9.80665

def calculate_mass_flow(target_thrust_kn, isp_s, throttle=1):
    return target_thrust_kn * 1000 / (isp_s * G0) * throttle

def calculate_oxidizer_and_fuel_split(total, of, lox_fraction, fuel_fraction):
    fuel = total / (1 + of)
    lox = total - fuel
    return dict(total=total, lox=lox, fuel=fuel, pb_lox=lox * lox_fraction,
                pb_fuel=fuel * fuel_fraction, main_lox=lox * (1-lox_fraction),
                main_fuel=fuel * (1-fuel_fraction))

def calculate_pipe_pressure_drop(mass_flow, density, diameter_mm, length_m, friction_factor=0.018):
    diameter = diameter_mm / 1000
    velocity = mass_flow / density / (pi * diameter**2 / 4)
    return friction_factor * length_m / diameter * density * velocity**2 / 2 / 1e5
