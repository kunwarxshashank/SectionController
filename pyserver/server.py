from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import requests
from orengine import get_train_priorities

app = FastAPI()

# Configure CORS to allow all origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allow all methods (GET, POST, etc.)
    allow_headers=["*"],  # Allow all headers
)


def fetch_section_data(section_id):
    """Fetch section data from the API endpoint"""
    url = f"http://localhost:5000/api/section/{section_id}/display"
    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        raise Exception(f"Failed to fetch data from API: {str(e)}")


@app.get("/api/orengine")
def priority_api(sectionid: str = Query(None, description="Section ID to fetch data for")):
    try:
        # Fetch section data if sectionid is provided
        if sectionid:
            section_data = fetch_section_data(sectionid)
        else:
            section_data = None
        
        # Get train priorities from OR engine
        data = get_train_priorities(section_data)
        return JSONResponse(data)
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)

@app.get("/")
def home():
    return {"message": "Train Priority API is running!"}
