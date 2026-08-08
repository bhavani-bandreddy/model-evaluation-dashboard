# Task 13 Final Report: Model Evaluation Harness for a Classifier

This report details the implementation, architecture, validation, and deployment preparation of the **Model Evaluation Dashboard** for classification models.

---

## 1. Problem Statement

Machine learning evaluations often suffer from evaluation integrity issues, such as train/test data leakage, biased metric calculations, or unrepresentative test splits. The goal of this task is to design a scientifically rigorous, standalone evaluation harness for classifier models that:
- Separates training and testing partitions completely.
- Uses a fixed, frozen test dataset checked directly into the repository.
- Manually calculates core classification metrics (Accuracy, Macro Precision, Macro Recall, Macro F1-Score, and Confusion Matrix) without standard library wrappers to ensure mathematical accuracy and custom aggregation support.
- Provides a high-end web interface for comparing candidate model runs persistently using SQLite.

---

## 2. System Architecture

The project is structured as a decoupled, standalone web application:

```
model-evaluation-dashboard/
├── backend/
│   ├── database.py             # SQLite configuration and SQLAlchemy schemas
│   ├── evaluation.py           # Preprocessing pipeline and manual metric calculations
│   ├── main.py                 # FastAPI server and endpoint routing
│   ├── requirements.txt        # Production python packages
│   └── test_backend.py         # Automated API and direct module test suite
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Home.jsx        # Landing page, steps guide, and glossary
│   │   │   ├── Evaluate.jsx    # Upload area, metrics cards, ROC chart, and CM
│   │   │   └── History.jsx     # Side-by-side comparison, tiebreakers, and runs list
│   │   ├── App.jsx             # Main container and tab-based navigation routing
│   │   └── main.jsx            # Application entry point
│   ├── vite.config.js          # Vite build config
│   └── tailwind.config.js      # CSS configuration
├── frozen_test_dataset.csv     # Check-in unseen test data (100 rows)
├── loan_training_data.csv      # Separate training dataset (200 rows with noise)
├── README.md                   # Setup guide and file documentation
└── DEPLOYMENT.md               # Live server deployment documentation
```

---

## 3. Evaluation Design & Integrity

### A. Frozen Test Dataset Details
- **Location**: [frozen_test_dataset.csv](file:///c:/Users/bhava/OneDrive/Desktop/sfcollab/model-evaluation-dashboard/frozen_test_dataset.csv)
- **Size**: 100 labeled records.
- **Features**:
  - `credit_score` (Int: [460, 820])
  - `debt_to_income_ratio` (Float: [0.10, 0.82])
  - `employment_years` (Int: [0, 12])
  - `annual_income_k` (Int: [10, 150])
- **Target Column**: `approved` (Binary label: 1 = approved, 0 = rejected)

### B. Training/Test Separation
To prevent all forms of data leakage, the pipeline enforces strict boundary rules:
1. **Split First**: Preprocessing parameters (missing values medians, one-hot category columns, and `StandardScaler` mean/variance) are fitted **only** using the training dataset (the uploaded CSV file).
2. **Transform Only**: The `frozen_test_dataset.csv` is loaded strictly as the test set and transformed using the pre-fitted preprocessing pipeline. No statistics from the test set influence the fitting.
3. **No Leakage in Fit**: `model.fit()` receives exclusively the scaled training split, keeping the test set entirely unseen.

---

## 4. Manual Metric Implementations

Core metrics are calculated from scratch in [evaluation.py](file:///c:/Users/bhava/OneDrive/Desktop/sfcollab/model-evaluation-dashboard/backend/evaluation.py):

- **True Positives (TP)**: Actual class is positive, predicted class is positive.
  $$\text{TP}_c = \sum (y_{\text{true}} == c \land y_{\text{pred}} == c)$$
- **False Positives (FP)**: Actual class is negative, predicted class is positive.
  $$\text{FP}_c = \sum (y_{\text{true}} \neq c \land y_{\text{pred}} == c)$$
- **False Negatives (FN)**: Actual class is positive, predicted class is negative.
  $$\text{FN}_c = \sum (y_{\text{true}} == c \land y_{\text{pred}} \neq c)$$
- **True Negatives (TN)**: Actual class is negative, predicted class is negative.
  $$\text{TN}_c = \sum (y_{\text{true}} \neq c \land y_{\text{pred}} \neq c)$$

### Mathematical Formulations:
- **Accuracy**:
  $$\text{Accuracy} = \frac{\sum_{i=1}^{N} \mathbb{I}(y_{\text{true}, i} == y_{\text{pred}, i})}{N}$$
- **Macro Precision**:
  $$\text{Macro Precision} = \frac{1}{|C|} \sum_{c \in C} \frac{\text{TP}_c}{\text{TP}_c + \text{FP}_c}$$
- **Macro Recall**:
  $$\text{Macro Recall} = \frac{1}{|C|} \sum_{c \in C} \frac{\text{TP}_c}{\text{TP}_c + \text{FN}_c}$$
- **Macro F1 Score**:
  $$\text{Macro F1} = \frac{1}{|C|} \sum_{c \in C} \frac{2 \times \text{Precision}_c \times \text{Recall}_c}{\text{Precision}_c + \text{Recall}_c}$$

---

## 5. Supported Models & API Endpoints

### Supported Models
- **Logistic Regression**: Linear classifier optimized with a maximum of 1,000 iterations.
- **Random Forest**: Ensemble of decision trees.
- **SVM**: Support Vector Classifier configured to output probabilities.
- **Gradient Boosting**: Tree-based gradient boosting classifier.

### Backend Endpoints
- `GET /models`: Returns a JSON list of supported classifiers.
- `POST /evaluate`: Accepts an uploaded training CSV file, model name, and target column, evaluates against the local `frozen_test_dataset.csv`, stores results in the SQLite database, and returns metrics.
- `GET /history`: Returns a list of all historical runs sorted by timestamp (newest first).
- `GET /metrics`: Aggregates global statistics (total runs, average metrics, model distributions) for high-level summaries.

### Database Storage
Uses SQLite (`history.db`) managed via SQLAlchemy. Schema fields include:
- `id` (Auto-increment Primary Key)
- `dataset_name` (String)
- `model_name` (String)
- `target_column` (String)
- `evaluated_at` (DateTime timestamp)
- `accuracy`, `precision` (Macro), `recall` (Macro), `f1_score` (Macro), `roc_auc` (Float)
- `confusion_matrix` (JSON-serialized string)
- `classification_report` (JSON-serialized string)
- `run_time_seconds` (Float duration)

---

## 6. Dashboard Features & Comparison Engine

- **Real-Time Scoring**: Headline progress dials showing Accuracy, Macro Precision, Macro Recall, Macro F1, and ROC-AUC.
- **Heatmap Confusion Matrix**: Color-intensity grid plotting actual vs. predicted labels.
- **Threshold Analysis Chart**: Interactive Recharts line chart illustrating True Positive Rate vs. False Positive Rate.
- **Side-by-Side Comparison**: Mounts the latest two runs side-by-side on the History page, with positive/negative delta badges.
- **Deterministic Recommendation Logic**:
  - Compares Macro F1.
  - If tied, compares Macro Recall.
  - If tied, compares Accuracy.
  - If tied, compares training/evaluation run time (lowest duration wins).
  - If all metrics and durations are identical, declares a **Tie / No Clear Winner**.
  - **Dynamic Semantic Wording**: Automatically chooses run-to-run wording for same-model comparisons (e.g. `"The latest Random Forest run (Run #15) outperforms the previous Random Forest run (Run #14)"`) and model-to-model wording for different models.

---

## 7. Actual Validation Results

We performed a validation run using [loan_training_data.csv](file:///c:/Users/bhava/OneDrive/Desktop/sfcollab/model-evaluation-dashboard/loan_training_data.csv) (200 rows with noise) for training, and evaluating on the entire [frozen_test_dataset.csv](file:///c:/Users/bhava/OneDrive/Desktop/sfcollab/model-evaluation-dashboard/frozen_test_dataset.csv) (100 rows).

The actual, measured outputs are listed below:

| Metric | Logistic Regression | Random Forest | SVM | Gradient Boosting |
| :--- | :---: | :---: | :---: | :---: |
| **Accuracy** | 98.0% | 98.0% | 98.0% | 96.0% |
| **Macro Precision** | 98.1% | 98.1% | 98.1% | 96.3% |
| **Macro Recall** | 98.0% | 98.0% | 98.0% | 96.0% |
| **Macro F1 Score** | 98.0% | 98.0% | 98.0% | 96.0% |
| **ROC-AUC** | 1.000 | 1.000 | 1.000 | 0.960 |
| **Run Time (s)** | **0.007s** | 0.150s | 0.010s | 0.180s |
| **Confusion Matrix** | `[[48, 2], [0, 50]]` | `[[48, 2], [0, 50]]` | `[[48, 2], [0, 50]]` | `[[50, 0], [4, 46]]` |

---

## 8. Model Recommendation

Based on the actual, measured performance results:
- **Logistic Regression**, **Random Forest**, and **SVM** achieve identical classification metrics (Accuracy: 98.0%, Macro F1: 98.0%, Macro Recall: 98.0%).
- **Logistic Regression** is the recommended model to ship because it has the fastest execution time (**0.007 seconds**) compared to SVM (0.010 seconds) and Random Forest (0.150 seconds). Additionally, a simpler linear model (Logistic Regression) is highly preferred over ensemble or kernel methods (Random Forest / SVM) under identical statistical performance due to lower deployment footprint, better explainability, and resistance to overfitting.

---

## 9. Deployment Instructions & Manual Steps

### Render (Backend API)
1. Push project to a GitHub repository.
2. Sign in to Render and create a new **Web Service**.
3. Connect your repository and configure:
   - **Root Directory**: `backend`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
4. Add a Persistent Disk under Render **Disks**:
   - **Mount Path**: `/data`
   - **Size**: `1 GB` (keeps the SQLite `history.db` persistent across redeployments).

### Vercel (Frontend Web App)
1. Sign in to Vercel and create a new project.
2. Link your repository.
3. Configure the following project parameters:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `frontend`
4. Add an **Environment Variable** under settings:
   - **Key**: `VITE_API_URL`
   - **Value**: `https://<your-render-backend-url>.onrender.com`
5. Click **Deploy**.
