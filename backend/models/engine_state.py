from pydantic import BaseModel, Field

class WarningItem(BaseModel):
    code: str
    severity: str
    message: str
    components: list[str] = Field(default_factory=list)

class ComponentState(BaseModel):
    id: str
    name: str
    function: str
    fluid: str
    kind: str
    inlet_bar: float
    outlet_bar: float
    temperature_k: float
    mass_flow: float
    delta_p_bar: float = 0
    opening_percent: float | None = None
    power_kw: float | None = None
    invalid: bool = False
    note: str = 'Illustrative estimates; component geometry is schematic.'

class EngineState(BaseModel):
    feasible: bool
    config: dict
    telemetry: dict
    design: dict
    phase: dict
    timeline: list[dict]
    duration: float
    components: list[ComponentState]
    warnings: list[WarningItem]
    equations: list[dict]
    limitations: list[str]
