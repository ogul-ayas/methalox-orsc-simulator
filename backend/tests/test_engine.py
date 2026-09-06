import json
import math
import pytest
import yaml
from fastapi.testclient import TestClient
from backend.app import app, load_config, CONFIG_PATH
from backend.models.engine_config import EngineConfig
from backend.calculations.engine import calculate_engine
from backend.calculations.valves import calculate_valve_pressure_drop
from backend.calculations.flow import calculate_pipe_pressure_drop

def state(**kwargs):
    return calculate_engine(load_config().model_copy(update=kwargs),20)

def component(s,id): return next(c for c in s.components if c.id==id)

def test_nominal_target_and_mass_conservation():
    s=state();d=s.design
    assert s.feasible
    assert d['thrust_kn']==pytest.approx(100)
    assert 350<d['isp_s']<365
    assert 28<d['total']<30
    assert 21<d['lox']<23 and 6<d['fuel']<7
    assert d['lox']/d['fuel']==pytest.approx(3.4)
    assert d['main_lox']+d['main_fuel']+d['pb_lox']+d['pb_fuel']==pytest.approx(d['total'])
    assert component(s,'hot_injector').mass_flow==pytest.approx(d['pb_lox']+d['pb_fuel'])
    assert component(s,'chamber').mass_flow==pytest.approx(d['total'])
    for fluid in ['lox','fuel']:
        assert -component(s,fluid+'_injector').delta_p_bar==pytest.approx(20)
        assert component(s,fluid+'_trim_valve').delta_p_bar<=0

def test_power_includes_all_six_pumps():
    s=state();pumps=[c for c in s.components if c.kind=='pump']
    assert len(pumps)==6
    assert sum(p.power_kw for p in pumps)==pytest.approx(s.design['demand_kw'])
    assert s.design['available_kw']>=s.design['demand_kw']
    assert s.design['delivered_kw']==pytest.approx(s.design['demand_kw'])

def test_losses_are_quadratic():
    assert calculate_valve_pressure_drop(20,1140,180,100)==pytest.approx(4*calculate_valve_pressure_drop(10,1140,180,100))
    assert calculate_pipe_pressure_drop(20,1140,75,2)==pytest.approx(4*calculate_pipe_pressure_drop(10,1140,75,2))

def test_valve_restriction_lowers_pump_and_injector_pressure():
    normal=state();restricted=state(lox_valve_opening=5)
    assert not restricted.feasible
    assert restricted.design['lox_pump_outlet_bar']<normal.design['lox_pump_outlet_bar']
    assert restricted.design['lox_injector_margin_bar']<normal.design['lox_injector_margin_bar']
    assert component(restricted,'lox_valve').invalid

def test_closed_valve_has_finite_flagged_output():
    s=state(fuel_valve_opening=0)
    assert not s.feasible
    assert component(s,'fuel_valve').invalid
    json.dumps(s.model_dump(),allow_nan=False)

def test_cooling_drop_changes_downstream_margin():
    a=state();b=state(cooling_pressure_drop_bar=42)
    assert component(b,'cooling').outlet_bar==pytest.approx(component(a,'cooling').outlet_bar-30)
    assert not b.feasible
    assert component(b,'cooling').invalid

def test_raising_chamber_pressure_demands_more_head():
    a=state();b=state(chamber_pressure_bar=140)
    assert b.design['lox_injector_margin_bar']==pytest.approx(a.design['lox_injector_margin_bar']-40)
    assert not b.feasible

def test_low_turbine_efficiency_is_not_silently_repaired():
    s=state(turbine_efficiency=.2)
    assert not s.feasible
    assert any(w.code=='power_balance' for w in s.warnings)

@pytest.mark.parametrize('throttle',[.6,.8,1])
def test_throttle_and_requested_thrust(throttle):
    s=state(throttle=throttle)
    assert s.feasible
    assert s.telemetry['thrust_kn']==pytest.approx(100*throttle)
    assert s.design['chamber_pressure_bar']==pytest.approx(100*throttle)

def test_nozzle_ratio_affects_isp_and_sizing():
    assert state(expansion_ratio=80).design['isp_s']>state(expansion_ratio=20).design['isp_s']

def test_all_phases_and_igniter_gates():
    c=load_config();s=calculate_engine(c)
    expected=['idle','purge','spinup','preburner','ignition','ramp','steady','shutdown','postpurge']
    assert [p['id'] for p in s.timeline]==expected
    for p in s.timeline:
        current=calculate_engine(c,(p['start']+p['end'])/2)
        assert current.phase['id']==p['id']
        assert current.phase['pb_igniter']==(p['id']=='preburner')
        assert current.phase['main_igniter']==(p['id']=='ignition')
        if p['id'] in ('idle','purge','spinup','postpurge'):
            assert current.telemetry['thrust_kn']==0
        if p['id']=='idle':
            assert all(x.mass_flow==0 for x in current.components)
            assert all(x.opening_percent==0 for x in current.components if x.kind=='valve')
        if p['id'] in ('purge','postpurge'):
            assert component(current,'purge_line').mass_flow>0
    end=calculate_engine(c,s.duration)
    assert end.telemetry['thrust_kn']==0 and end.phase['pump']==0

def test_config_and_ui_schema_cover_every_field():
    assert set(yaml.safe_load(CONFIG_PATH.read_text()))==set(EngineConfig.model_fields)
    for field in EngineConfig.model_json_schema()['properties'].values():
        assert all(key in field for key in ('title','description','unit','group','minimum','maximum','step'))

def test_api_validation_and_no_file_mutation():
    client=TestClient(app);before=CONFIG_PATH.read_bytes()
    assert client.get('/api/health').json()['status']=='ok'
    config=client.get('/api/config').json()['config'];config['throttle']=.8
    r=client.post('/api/calculate',json={'config':config,'time_s':20})
    assert r.status_code==200 and r.json()['telemetry']['thrust_kn']==pytest.approx(80)
    config['fuel_density']=0
    assert client.post('/api/calculate',json={'config':config}).status_code==422
    assert CONFIG_PATH.read_bytes()==before

def test_parameter_screening_grid_stays_json_finite():
    for pc in [20,100,250]:
        for throttle in [.05,.6,1.2]:
            for opening in [0,1,100]:
                s=state(chamber_pressure_bar=pc,throttle=throttle,lox_valve_opening=opening)
                json.dumps(s.model_dump(),allow_nan=False)
                assert math.isfinite(s.design['thrust_kn'])
