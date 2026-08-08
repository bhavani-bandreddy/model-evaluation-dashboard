# Deployment Guide

Follow these instructions to deploy the Model Evaluation Dashboard.

---

## 1. Backend Deployment (FastAPI to Render)

### Preparation
1. Create a Render account at [render.com](https://render.com/).
2. Push your project folder to a GitHub repository.

### Web Service Deployment
1. On your Render dashboard, click **New** -> **Web Service**.
2. Connect your GitHub repository.
3. Configure the following service parameters:
   * **Name**: `model-evaluation-backend`
   * **Environment**: `Python`
   * **Root Directory**: `backend`
   * **Build Command**: `pip install -r requirements.txt`
   * **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
   * **Instance Type**: `Free`
4. Click **Deploy Web Service**.

### Persistent Database Storage (SQLite)
Since SQLite is a file-based database, redeploying on Render resets the files unless you attach a persistent disk:
1. Scroll down to the **Disks** section in Render.
2. Click **Add Disk**:
   * **Name**: `sqlite-storage`
   * **Mount Path**: `/data`
   * **Size**: `1 GB`
3. In your `database.py` file, adjust the database path to write inside the mount directory if running in production:
   ```python
   # Example production-safe path mapping
   import os
   DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///./history.db")
   if os.path.exists("/data"):
       DATABASE_URL = "sqlite:////data/history.db"
   ```

---

## 2. Frontend Deployment (React to Vercel)

### Preparation
1. Create a Vercel account at [vercel.com](https://vercel.com/).
2. Install Vercel CLI locally (`npm i -g vercel`) or deploy via Vercel GitHub integration.

### Environment Variable Mapping
Make sure to point your axios requests on the frontend to the production URL of your backend.
1. Create a `.env` file in the frontend directory:
   ```env
   VITE_API_URL=https://model-evaluation-backend.onrender.com
   ```
2. Adjust your axios base calls in `Evaluate.jsx` and `History.jsx` to dynamically load the URL:
   ```javascript
   const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
   ```

### Vercel Deployment Configuration
Add a `vercel.json` file in the frontend directory to handle client routing:
```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

### Steps to Deploy
1. **GitHub integration (Recommended)**:
   * Import the project on Vercel.
   * Set **Framework Preset** to `Vite`.
   * Set **Root Directory** to `frontend`.
   * Add Environment Variable: `VITE_API_URL` matching your Render URL.
   * Click **Deploy**.
2. **CLI Deploy**:
   ```bash
   cd frontend
   vercel --prod
   ```
