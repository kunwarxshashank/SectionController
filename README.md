Here is the updated **README.md** with Python requirements installation included:

---

```markdown
# 🚄 SectionController

A multi-service setup consisting of a **Next.js frontend**, **Node.js backend**, and a **FastAPI (Python) server**.

---

## 📦 Project Structure

```

SectionController
├── frontend (Next.js)
├── backend (Node.js)
└── pyserver (FastAPI)

````

---

## ⚡ Start Frontend (Next.js)

```bash
cd SectionController
npm run dev
````

Frontend runs at: **[http://localhost:3000](http://localhost:3000)**

---

## 🔧 Start Backend (Node.js)

```bash
cd SectionController/backend
node index.js
```

Backend runs at: **[http://localhost:5000](http://localhost:5000)**

---

## 🐍 Start Python Server (FastAPI)

### Install Python dependencies

```bash
cd SectionController/pyserver
pip install -r requirements.txt
```

### Start the server

```bash
uvicorn server:app --reload
```

Python API runs at: **[http://127.0.0.1:8000](http://127.0.0.1:8000)**

ORJSON data endpoint:
👉 **[http://127.0.0.1:8000/api/orengine](http://127.0.0.1:8000/api/orengine)**

---

## ✔️ Notes

* Install Node.js, Python, and dependencies before starting services.
* Each service runs on a different port and can run simultaneously.
* Make sure virtual environment is activated before installing Python packages (optional but recommended).

---

Made with ❤️ for multi-service development.

```

---


