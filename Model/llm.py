import requests

res = requests.post(
    "http://localhost:11434/api/generate",
    json={
        "model": "qwen2.5:3b",
        "prompt": "if two train about to enter in same platform, but they don't have loop lines what key factors should we consider to prioratize train ",
        "stream": False
    }
)

print(res.json()["response"])
