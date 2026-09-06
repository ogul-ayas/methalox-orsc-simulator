from pathlib import Path
import yaml
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field, ConfigDict
from backend.models.engine_config import EngineConfig
from backend.models.engine_state import EngineState
from backend.calculations.engine import calculate_engine

ROOT=Path(__file__).resolve().parents[1]
CONFIG_PATH=ROOT/'backend/data/engine_config.yaml'
app=FastAPI(title='Methalox Engine Learning Lab',version='1.0.0')
app.add_middleware(CORSMiddleware,allow_origins=['http://localhost:5173','http://127.0.0.1:5173'],allow_methods=['GET','POST'],allow_headers=['Content-Type'])

def load_config():
    return EngineConfig.model_validate(yaml.safe_load(CONFIG_PATH.read_text(encoding='utf-8')) or {})

class CalculateRequest(BaseModel):
    model_config=ConfigDict(extra='forbid',allow_inf_nan=False)
    config: EngineConfig
    time_s: float=Field(0,ge=0,le=10000)

@app.get('/api/health')
def health(): return {'status':'ok'}

@app.get('/api/config')
def config():
    return {'config':load_config().model_dump(),'schema':EngineConfig.model_json_schema()['properties']}

@app.post('/api/calculate',response_model=EngineState)
def calculate(request:CalculateRequest):
    return calculate_engine(request.config,request.time_s)

@app.get('/api/nominal',response_model=EngineState)
def nominal(): return calculate_engine(load_config())

if (ROOT/'frontend/dist/index.html').exists():
    app.mount('/',StaticFiles(directory=ROOT/'frontend/dist',html=True),name='frontend')
