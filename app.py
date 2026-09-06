"""After installing dependencies and building the frontend: python app.py."""
import os
import uvicorn
from pathlib import Path

if __name__=='__main__':
    if not (Path(__file__).parent/'frontend/dist/index.html').exists():
        raise SystemExit('Build the frontend first: cd frontend, npm install, npm run build. See README.md.')
    uvicorn.run('backend.app:app',host='127.0.0.1',port=int(os.environ.get('PORT','8000')))
