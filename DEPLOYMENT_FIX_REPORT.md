# Deployment Fix Report: Render Python & Dependency Compatibility

This report summarizes the diagnostics, root cause, changes made, and verification results to resolve the failed Render deployment for the `model-evaluation-dashboard` backend.

---

## 1. Root Cause of the Render Failure

* **Default Python Environment**: In the absence of a defined Python runtime version, Render defaulted to using a pre-release or unsupported version, specifically `cpython-314` (Python 3.14).
* **Missing Prebuilt Wheels**: There are no prebuilt binary wheels of `pandas==2.2.2` (and several other compiled dependencies) compatible with Python 3.14 on PyPI.
* **Compilation failure**: Because wheels were unavailable, pip attempted to compile pandas from source using Cython and Ninja. The Cython/C compilation step failed with a compilation error (`ninja: build stopped: subcommand failed`), resulting in `metadata-generation-failed` and a failed build.

---

## 2. Solutions Implemented

### Python Version Selected
We locked the Python version to **`Python 3.11.9`** using:
1. **`.python-version` (Repository Root)**: Contains `3.11.9` (Render's officially supported configuration file).
2. **`backend/.python-version` (Backend Root)**: Contains `3.11.9` (For root-level configurations where the service root dir is `backend`).

Note: `runtime.txt` files were removed because Render does not support them and completely ignores them. Furthermore, because this web service was set up manually in the Render dashboard (and not deployed via a Blueprint), Render ignores `render.yaml` environment variables. By using `.python-version` files, Render will detect the version directly from our repository files on manual checkout.

### Dependency Versions Selected
We pinned stable dependency versions in `backend/requirements.txt`. Most importantly, we pinned `numpy==1.26.4` (the final stable 1.x version of NumPy) instead of `numpy<2.0.0` to ensure stable dependency resolution. 

Pinned list:
* `fastapi==0.111.0`
* `uvicorn==0.30.1`
* `sqlalchemy==2.0.31`
* `pandas==2.2.2`
* `scikit-learn==1.5.0`
* `pydantic==2.7.4`
* `python-multipart==0.0.9`
* `numpy==1.26.4`

These versions are fully compatible with Python 3.11, meaning **prebuilt wheels are fetched from PyPI**, avoiding any compiler/source-compilation steps.

### Render Configuration & SQLite Persistence
* Configured a persistent disk mount in `render.yaml` named `sqlite-storage` mounted at `/data` with a size of `1 GB` (used by `database.py` in production).

---

## 3. Files Changed

* **[DELETE] [runtime.txt](file:///c:/Users/bhava/OneDrive/Desktop/sfcollab/model-evaluation-dashboard/runtime.txt)**: Removed obsolete Heroku-style runtime configuration file.
* **[DELETE] [backend/runtime.txt](file:///c:/Users/bhava/OneDrive/Desktop/sfcollab/model-evaluation-dashboard/backend/runtime.txt)**: Removed obsolete Heroku-style runtime configuration file.
* **[NEW] [.python-version](file:///c:/Users/bhava/OneDrive/Desktop/sfcollab/model-evaluation-dashboard/.python-version)**: Root Python version configuration file (officially supported by Render).
* **[NEW] [backend/.python-version](file:///c:/Users/bhava/OneDrive/Desktop/sfcollab/model-evaluation-dashboard/backend/.python-version)**: Backend-specific Python version configuration file (officially supported by Render).
* **[MODIFY] [backend/requirements.txt](file:///c:/Users/bhava/OneDrive/Desktop/sfcollab/model-evaluation-dashboard/backend/requirements.txt)**: Pinned NumPy version for compatibility.
* **[MODIFY] [render.yaml](file:///c:/Users/bhava/OneDrive/Desktop/sfcollab/model-evaluation-dashboard/render.yaml)**: Configured python version env variable and sqlite persistent storage disk.
* **[MODIFY] [backend/test_backend.py](file:///c:/Users/bhava/OneDrive/Desktop/sfcollab/model-evaluation-dashboard/backend/test_backend.py)**: Fixed uvicorn background process pipe blocking on Windows and increased boot sleep duration to ensure test stability.

---

## 4. Local Tests Performed

1. **Direct Backend Test Execution**:
   Ran `python backend/test_backend.py`. Output log:
   ```text
   Generating synthetic binary classification dataset...
   Dataset saved to: test_dataset.csv

   --- Testing Evaluation Module directly ---
   Accuracy:  0.9000
   ...
   Direct module test passed!

   --- Testing API endpoints ---
   Starting FastAPI backend server in background...
   Testing GET /models...
   Response: 200 ['Logistic Regression', 'Random Forest', 'SVM', 'Gradient Boosting']
   Testing POST /evaluate...
   Response status: 200
   Evaluation successful. Accuracy: 1.0
   Testing GET /history...
   Runs in history: 30
   Testing GET /metrics...
   Metrics summary:
     Total Runs: 30
     Best Accuracy: 1.0
     Model distribution: {'Random Forest': 9, 'Logistic Regression': 21}

   All API endpoint tests passed!
   Stopping backend server...
   Cleaned up temporary test dataset.
   ```
2. **SQLite History Storage Validation**:
   Successfully verified that `history.db` stores evaluation run metadata across runs, and correctly pulls run histories.
3. **Test Dataset Isolation**:
   Confirmed that when evaluating a dataset with the target column `approved`, `frozen_test_dataset.csv` is loaded and used strictly as the unseen test set (in `backend/main.py`).
4. **Frontend Production Build**:
   Ran `npm.cmd run build` inside the `frontend/` directory. The build completed with zero errors in `29.66s`, outputting `dist/index.html` and assets.

---

## 5. Expected Render Build Behavior & Manual Steps

### Expected Behavior on Redeployment
With these changes, when you trigger a manual redeploy in Render:
1. Render will identify the Python version as `3.11.9` from the `.python-version` files.
2. It will boot a Python 3.11.9 virtual environment.
3. When running `pip install -r requirements.txt`, pip will find prebuilt wheels for `pandas==2.2.2`, `numpy==1.26.4`, and `scikit-learn==1.5.0` matching Python 3.11.
4. Pip will download and install these prebuilt wheels in seconds without triggering C/Cython compilation.
5. The build will succeed, and the web service will start.

### Manual Steps in Render Dashboard
1. Go to the Render Dashboard, select **model-evaluation-backend**.
2. Click **Manual Deploy** -> **Clear Cache and Deploy** to ensure a clean rebuild.
3. If using a Render Paid plan (required for persistent disks), ensure the disk `sqlite-storage` is showing as attached in the **Disks** section. If using the Free plan, note that disk mounting is ignored, and database history will reset upon service restarts/redeployments.

---

## 6. Frontend Deployment to Vercel

### Configuration Setup
* The React components in `History.jsx` and `Evaluate.jsx` pull the API URL from `import.meta.env.VITE_API_URL` dynamically.
* We created `frontend/.env` and updated `frontend/.env.example` to point to the production backend URL:
  ```env
  VITE_API_URL=https://model-evaluation-backend.onrender.com
  ```

### Local Build Validation
Running `npm.cmd run build` inside `frontend/` succeeds and builds the production bundle into `dist/`.

### Exact Vercel Deployment Settings
When importing this repository into Vercel, configure the following settings:
1. **Framework Preset**: Select `Vite` (Vercel should auto-detect this).
2. **Root Directory**: Set this to `frontend`.
3. **Build Command**: `npm run build` (or keep the default `vite build`).
4. **Output Directory**: `dist` (or keep default).
5. **Environment Variables**:
   * **Key**: `VITE_API_URL`
   * **Value**: `https://model-evaluation-backend.onrender.com`
   *(Vite embeds variables starting with `VITE_` during build time, so setting this environment variable in the Vercel project settings is mandatory).*

