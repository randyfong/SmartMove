import os
import json
from pathlib import Path
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from dotenv import load_dotenv

from agent_core import RelocationAgent, GitTraceLogger, run_git_command

# Load initial environment variables
ENV_PATH = Path(__file__).parent / ".env"
load_dotenv(dotenv_path=ENV_PATH)

app = FastAPI(title="SmartMove: Relocation Agent & Booking Engine API")

# Add CORS support
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request & Response Schemas
class SettingsSaveRequest(BaseModel):
    geminiApiKey: str
    apifyApiToken: str
    scalekitMockMode: bool

class AgentRunRequest(BaseModel):
    city: str
    budget: float
    requireLaundry: bool
    requireGym: bool
    maxCommute: float

class ApproveRequest(BaseModel):
    listingId: str
    email: str
    name: str

# Endpoints
@app.post("/api/settings/save")
def save_settings(req: SettingsSaveRequest):
    """
    Saves new credentials to the local .env file and reloads process variables.
    """
    try:
        env_content = (
            f"GEMINI_API_KEY={req.geminiApiKey.strip()}\n"
            f"APIFY_API_TOKEN={req.apifyApiToken.strip()}\n"
            f"SCALEKIT_MOCK_MODE={str(req.scalekitMockMode).lower()}\n"
        )
        with open(ENV_PATH, "w", encoding="utf-8") as f:
            f.write(env_content)
        
        # Update current process variables
        os.environ["GEMINI_API_KEY"] = req.geminiApiKey.strip()
        os.environ["APIFY_API_TOKEN"] = req.apifyApiToken.strip()
        os.environ["SCALEKIT_MOCK_MODE"] = str(req.scalekitMockMode).lower()
        
        return {"success": True, "message": "Settings updated and saved to .env successfully!"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save settings: {str(e)}")

@app.get("/api/settings/status")
def get_settings_status():
    """
    Checks which integrations are currently active.
    """
    gemini_key = os.getenv("GEMINI_API_KEY", "").strip()
    apify_token = os.getenv("APIFY_API_TOKEN", "").strip()
    scalekit_mock = os.getenv("SCALEKIT_MOCK_MODE", "true").lower() == "true"
    
    return {
        "geminiApiKeyConfigured": bool(gemini_key),
        "apifyApiTokenConfigured": bool(apify_token),
        "scalekitMockMode": scalekit_mock,
        "active_models": {
            "gemini": "gemini-2.5-flash" if gemini_key else "High-Fidelity Internal Offline Mock Engine",
            "apify": "Apify Realtime Scraper API" if apify_token else "High-Fidelity Listing Seed Database"
        }
    }

@app.post("/api/agent/run")
def run_agent(req: AgentRunRequest):
    """
    Triggers the relocation pipeline. Runs listings audit and logs checkpoints to Git.
    """
    try:
        # Load latest environment settings
        load_dotenv(dotenv_path=ENV_PATH, override=True)
        gemini_key = os.getenv("GEMINI_API_KEY", "").strip()
        apify_token = os.getenv("APIFY_API_TOKEN", "").strip()
        
        logger = GitTraceLogger(workspace_path=Path(__file__).parent.absolute())
        agent = RelocationAgent(
            gemini_api_key=gemini_key, 
            apify_token=apify_token, 
            trace_logger=logger
        )
        
        requirements = {
            "city": req.city,
            "budget": req.budget,
            "requireLaundry": req.requireLaundry,
            "requireGym": req.requireGym,
            "maxCommute": req.maxCommute
        }
        
        pipeline_results = agent.run_pipeline(requirements)
        return pipeline_results
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Agent pipeline failed: {str(e)}")

@app.post("/api/agent/approve")
def approve_booking(req: ApproveRequest):
    """
    Simulates Scalekit Google/Outlook calendar authorization and secures holds.
    """
    try:
        # Mock Scalekit / Calendar Booking Outreach
        success_message = f"SmartMove Relocation outreach successfully generated for {req.name}."
        
        # Schedule slot 3 days from now
        from datetime import datetime, timedelta
        visit_time = datetime.now() + timedelta(days=3)
        visit_start = visit_time.replace(hour=14, minute=0, second=0, microsecond=0)
        visit_end = visit_start + timedelta(minutes=45)
        
        return {
            "success": True,
            "message": "Outreach completed and calendar slot reserved!",
            "details": success_message,
            "calendar_event": {
                "summary": f"SmartMove Relocation: Apartment Visit (ID: {req.listingId})",
                "start": visit_start.isoformat(),
                "end": visit_end.isoformat(),
                "recipient": req.email,
                "status": "HOLD_SECURED"
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Booking simulation failed: {str(e)}")

@app.get("/api/agent/checkpoints")
def get_checkpoints():
    """
    Pulls git-native checkpoints to trace agent logic live in the UI.
    """
    try:
        workspace_path = Path(__file__).parent.absolute()
        checkpoints_dir = workspace_path / ".entire" / "checkpoints"
        if not checkpoints_dir.exists():
            return []
            
        checkpoints = []
        files = sorted(checkpoints_dir.glob("checkpoint_*.json"))
        
        for f in files:
            try:
                with open(f, "r", encoding="utf-8") as file:
                    checkpoint_data = json.load(file)
                
                # Retrieve git commit details for each checkpoint file!
                commit_hash = None
                commit_date = None
                commit_msg = None
                
                rel_path = str(f.relative_to(workspace_path))
                git_info = run_git_command(
                    ["git", "log", "-n", "1", "--format=%H|%ad|%s", "--", rel_path], 
                    cwd=workspace_path
                )
                
                if git_info:
                    parts = git_info.split("|")
                    if len(parts) >= 3:
                        commit_hash = parts[0]
                        commit_date = parts[1]
                        commit_msg = parts[2]
                
                checkpoints.append({
                    "filename": f.name,
                    "run_id": checkpoint_data.get("run_id"),
                    "step": checkpoint_data.get("step"),
                    "step_name": checkpoint_data.get("step_name"),
                    "timestamp": checkpoint_data.get("timestamp"),
                    "data": checkpoint_data.get("data"),
                    "git_commit": commit_hash,
                    "git_date": commit_date,
                    "git_message": commit_msg
                })
            except Exception as file_error:
                print(f"Error loading checkpoint file {f.name}: {file_error}")
                
        # Sort checkpoints by run_id and step to ensure chronological order
        checkpoints.sort(key=lambda x: (x.get("run_id", ""), x.get("step", 0)))
        return checkpoints
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch checkpoints: {str(e)}")

# Mount static public files (only if the directory exists)
public_path = Path(__file__).parent / "public"
public_path.mkdir(exist_ok=True)

app.mount("/public", StaticFiles(directory=public_path), name="public")

@app.get("/")
def serve_index():
    index_file = public_path / "index.html"
    if not index_file.exists():
        # Temporary placeholder until UI is constructed
        with open(index_file, "w", encoding="utf-8") as f:
            f.write("<html><body><h1>SmartMove Frontend Dashboard Placeholder</h1></body></html>")
    return FileResponse(index_file)
