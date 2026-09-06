from math import sqrt
from .flow import G0

def calculate_chamber_performance(of, expansion_ratio):
    """Constant-gamma isentropic vacuum nozzle; illustrative c-star / temperature fits."""
    gamma = 1.22
    low, high = 1.0001, 15.0
    def area_ratio(m):
        return (1/m)*((2/(gamma+1))*(1+(gamma-1)*m*m/2))**((gamma+1)/(2*(gamma-1)))
    for _ in range(70):
        mid = (low+high)/2
        if area_ratio(mid) < expansion_ratio: low=mid
        else: high=mid
    mach = (low+high)/2
    pe_pc = (1+(gamma-1)*mach*mach/2)**(-gamma/(gamma-1))
    cf = sqrt(2*gamma**2/(gamma-1)*(2/(gamma+1))**((gamma+1)/(gamma-1))*(1-pe_pc**((gamma-1)/gamma))) + pe_pc*expansion_ratio
    cstar = 1940 * max(0.65,1-0.025*(of-3.4)**2)
    isp = cstar*cf*0.97/G0
    return dict(isp_s=isp, cstar_m_s=cstar, cf=cf, exit_mach=mach, exit_pressure_ratio=pe_pc,
                chamber_temperature_k=max(2200,3450-100*(of-3.4)**2), nozzle_efficiency=0.97)

def calculate_thrust(total_mass_flow, isp_s):
    return total_mass_flow*isp_s*G0/1000

def calculate_injector_pressure_margin(inlet_bar, chamber_bar, required_drop_bar):
    return inlet_bar-chamber_bar-required_drop_bar
