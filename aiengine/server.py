from fastapi import FastAPI
from fastapi.responses import JSONResponse
from trainpriority import get_train_priorities

app = FastAPI()

@app.get("/api/train-priority")
def priority_api():
    try:
        data = get_train_priorities()
        return JSONResponse(data)
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)

@app.get("/")
def home():
    return {"message": "Train Priority API is running!"}
