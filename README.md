# Model Evaluation Dashboard

A professional, standalone machine learning classifier evaluation dashboard built using **React (Vite + Tailwind CSS)** on the frontend, **FastAPI (Python)** on the backend, and **SQLite** for historical run persistence. 

This project is completely decoupled and independent of any other repository structures.

---

## Technical Audits & Code Locations

### 1. Manual Metric Calculations (No sklearn.metrics wrappers)
Accuracy, Precision, Recall, and F1-Score are manually calculated in python and numpy.
* **Code File**: [backend/evaluation.py](file:///c:/Users/bhava/OneDrive/Desktop/sfcollab/model-evaluation-dashboard/backend/evaluation.py)
* **Mathematical Methods**:
  * `calculate_classification_metrics_manual`: Manually calculates true positives ($TP$), false positives ($FP$), false negatives ($FN$), and true negatives ($TN$) per class to compute metrics and assemble macro/weighted averages.
  * `calculate_confusion_matrix_manual`: Iterates over classes and values to populate the 2D confusion matrix array.

### 2. Frozen Test Dataset (100 Labeled Examples)
A frozen credit approval classifier challenge dataset containing 100 rows is checked directly into the repository.
* **Dataset File**: [frozen_test_dataset.csv](file:///c:/Users/bhava/OneDrive/Desktop/sfcollab/model-evaluation-dashboard/frozen_test_dataset.csv)
* **Features**: `credit_score`, `debt_to_income_ratio`, `employment_years`, `annual_income_k`
* **Target Label**: `approved` (binary: 0 or 1)

---

## Core Features

1. **Home / Landing Page**: High-end landing interface with interactive glossary, metrics definitions, and detailed step-by-step pipeline architectures.
2. **Evaluation Dashboard**:
   - Drag-and-drop CSV uploader with local records preview.
   - Dropdown options to dynamically configure target classification label and model versions (Logistic Regression, Random Forest, SVM, and Gradient Boosting).
   - Real-time training and scoring visualizers.
   - Comprehensive performance metrics (Accuracy, Precision, Recall, F1, ROC-AUC) with colored progress indicators.
   - Custom CSS-grid Heatmap Confusion Matrix.
   - Line Chart plotting True Positive Rate (TPR) vs False Positive Rate (FPR) for threshold evaluations.
   - Table illustrating per-class metrics breakdowns.
3. **Comparison & History**:
   - Stores all runs persistently in SQLite database tables.
   - Pulls and displays the latest two evaluation runs side-by-side.
   - Flags positive/negative deltas for metrics.
   - **Recommended Model to Ship**: Displays automated recommendation decisions detailing *why* the model should be shipped based on F1-scores, accuracy rates, and error rate distributions.

---

## Setup & Running Locally

### Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Start the FastAPI server:
   ```bash
   uvicorn main:app --reload --host 127.0.0.1 --port 8000
   ```
   * Access Swagger documentation at `http://127.0.0.1:8000/docs`.

### Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install packages:
   ```bash
   npm install
   ```
3. Start Vite dev server:
   ```bash
   npm run dev
   ```
   * Access the dashboard at `http://localhost:5173/`.
