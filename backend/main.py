import io
import json
import datetime
from typing import List, Dict, Any, Optional
from fastapi import FastAPI, Depends, File, UploadFile, Form, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from database import init_db, get_db, EvaluationRun
from evaluation import evaluate_classifier, get_supported_models
import pandas as pd

app = FastAPI(
    title="Model Evaluation API",
    description="Backend API for evaluating machine learning classifiers and storing execution history.",
    version="1.0.0",
)

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup_event():
    init_db()

@app.get("/models", response_model=List[str], summary="Get available classification models")
def list_models():
    """
    Returns a list of all machine learning models supported by the evaluation harness.
    """
    return get_supported_models()

@app.post("/evaluate", summary="Evaluate a model on a dataset")
async def evaluate(
    file: UploadFile = File(...),
    model_name: str = Form(...),
    target_column: str = Form(...),
    db: Session = Depends(get_db)
):
    """
    Accepts an uploaded CSV dataset, trains the selected model, calculates
    evaluation metrics, saves the evaluation metadata in history, and returns results.
    """
    # Validate file extension
    if not file.filename.endswith('.csv'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file format. Please upload a CSV file."
        )

    # Read CSV contents
    try:
        contents = await file.read()
        df = pd.read_csv(io.BytesIO(contents))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error reading CSV file: {str(e)}"
        )

    # Check if dataset is empty
    if df.empty:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The uploaded CSV file is empty."
        )

    # Check target column
    if target_column not in df.columns:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Target column '{target_column}' does not exist in the dataset. Available columns: {list(df.columns)}"
        )

    # Execute training and evaluation
    try:
        import os
        test_df = None
        if target_column == "approved":
            base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            frozen_path = os.path.join(base_dir, "frozen_test_dataset.csv")
            if os.path.exists(frozen_path):
                test_df = pd.read_csv(frozen_path)
                
        results = evaluate_classifier(df, target_column, model_name, test_df=test_df)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Evaluation failed: {str(e)}"
        )

    # Save to database
    try:
        run = EvaluationRun(
            dataset_name=file.filename,
            model_name=model_name,
            target_column=target_column,
            evaluated_at=datetime.datetime.utcnow(),
            accuracy=results["accuracy"],
            precision=results["precision"],
            recall=results["recall"],
            f1_score=results["f1_score"],
            roc_auc=results["roc_auc"],
            confusion_matrix=json.dumps(results["confusion_matrix"]),
            classification_report=json.dumps(results["classification_report"]),
            run_time_seconds=results["run_time_seconds"]
        )
        db.add(run)
        db.commit()
        db.refresh(run)
        
        # Include database run id in results
        results["id"] = run.id
        results["dataset_name"] = file.filename
        results["model_name"] = model_name
        results["evaluated_at"] = run.evaluated_at.isoformat()
    except Exception as e:
        db.rollback()
        # Even if DB save fails, we should still return results, but flag a warning
        results["db_save_error"] = f"Failed to save history: {str(e)}"

    return results

@app.get("/history", summary="Get previous evaluation runs")
def get_history(db: Session = Depends(get_db)):
    """
    Retrieves all past model evaluation runs from the SQLite database sorted by evaluation date.
    """
    runs = db.query(EvaluationRun).order_by(EvaluationRun.evaluated_at.desc()).all()
    history = []
    for r in runs:
        try:
            cm = json.loads(r.confusion_matrix)
        except Exception:
            cm = []
        try:
            rep = json.loads(r.classification_report)
        except Exception:
            rep = {}
            
        history.append({
            "id": r.id,
            "dataset_name": r.dataset_name,
            "model_name": r.model_name,
            "target_column": r.target_column,
            "evaluated_at": r.evaluated_at.isoformat(),
            "accuracy": r.accuracy,
            "precision": r.precision,
            "recall": r.recall,
            "f1_score": r.f1_score,
            "roc_auc": r.roc_auc,
            "confusion_matrix": cm,
            "classification_report": rep,
            "run_time_seconds": r.run_time_seconds,
        })
    return history

@app.get("/metrics", summary="Get global aggregated evaluation metrics")
def get_metrics(db: Session = Depends(get_db)):
    """
    Aggregates run statistics across all previous runs to compute summary charts, average metrics,
    counts, and identifies the best-performing models.
    """
    runs = db.query(EvaluationRun).all()
    total_runs = len(runs)
    
    if total_runs == 0:
        return {
            "total_runs": 0,
            "average_accuracy": 0,
            "average_precision": 0,
            "average_recall": 0,
            "average_f1": 0,
            "best_accuracy": 0,
            "best_model": "N/A",
            "model_distribution": {},
            "performance_by_model": []
        }
        
    avg_accuracy = sum(r.accuracy for r in runs) / total_runs
    avg_precision = sum(r.precision for r in runs) / total_runs
    avg_recall = sum(r.recall for r in runs) / total_runs
    avg_f1 = sum(r.f1_score for r in runs) / total_runs
    
    best_run = max(runs, key=lambda r: r.accuracy)
    
    # Calculate distributions & model-specific averages
    model_counts = {}
    model_sums = {}
    for r in runs:
        model_counts[r.model_name] = model_counts.get(r.model_name, 0) + 1
        
        if r.model_name not in model_sums:
            model_sums[r.model_name] = {"accuracy": 0.0, "precision": 0.0, "recall": 0.0, "f1": 0.0, "count": 0}
        model_sums[r.model_name]["accuracy"] += r.accuracy
        model_sums[r.model_name]["precision"] += r.precision
        model_sums[r.model_name]["recall"] += r.recall
        model_sums[r.model_name]["f1"] += r.f1_score
        model_sums[r.model_name]["count"] += 1
        
    perf_by_model = []
    for model, data in model_sums.items():
        count = data["count"]
        perf_by_model.append({
            "model_name": model,
            "accuracy": data["accuracy"] / count,
            "precision": data["precision"] / count,
            "recall": data["recall"] / count,
            "f1_score": data["f1"] / count,
            "count": count
        })
        
    return {
        "total_runs": total_runs,
        "average_accuracy": avg_accuracy,
        "average_precision": avg_precision,
        "average_recall": avg_recall,
        "average_f1": avg_f1,
        "best_accuracy": best_run.accuracy,
        "best_model": best_run.model_name,
        "model_distribution": model_counts,
        "performance_by_model": perf_by_model
    }

@app.get("/api/dataset", summary="Get default dataset metadata and info")
def get_dataset_info():
    """
    Returns metadata about the default loan training dataset.
    """
    import os
    base_dir = os.path.dirname(os.path.abspath(__file__))
    dataset_path = os.path.join(base_dir, "data", "loan_training_data.csv")
    
    if not os.path.exists(dataset_path):
        parent_dir = os.path.dirname(base_dir)
        dataset_path = os.path.join(parent_dir, "loan_training_data.csv")
        
    if not os.path.exists(dataset_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Default dataset loan_training_data.csv not found."
        )
        
    try:
        df = pd.read_csv(dataset_path)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error reading dataset: {str(e)}"
        )
        
    # Check dataset structure
    target = "approved"
    if target not in df.columns:
        target = df.columns[-1]
        
    features = [col for col in df.columns if col != target]
    
    # Class distribution
    class_dist = {str(k): int(v) for k, v in df[target].value_counts().to_dict().items()}
    
    # Missing values
    missing_count = int(df.isnull().sum().sum())
    missing_by_col = {col: int(val) for col, val in df.isnull().sum().to_dict().items()}
    
    # Data types
    dtypes = {col: str(dtype) for col, dtype in df.dtypes.items()}
    
    total_records = len(df)
    train_samples = int(total_records * 0.8)
    test_samples = total_records - train_samples
    
    return {
        "dataset_name": "loan_training_data.csv",
        "records": total_records,
        "features": features,
        "features_count": len(features),
        "target": target,
        "classes_count": len(df[target].unique()),
        "classes": [str(c) for c in df[target].unique()],
        "train_samples": train_samples,
        "test_samples": test_samples,
        "class_distribution": class_dist,
        "missing_values": {
            "total": missing_count,
            "columns": missing_by_col
        },
        "data_types": dtypes
    }

@app.get("/api/models", response_model=List[str], summary="Get available models")
def get_api_models():
    """
    Returns a list of all machine learning models supported by the evaluation harness.
    """
    return get_supported_models()

@app.get("/api/evaluation", summary="Train and evaluate all four models on the default dataset")
def evaluate_all_models(db: Session = Depends(get_db)):
    """
    Trains and evaluates Logistic Regression, Random Forest, SVM, and Gradient Boosting
    on the default loan dataset. Automatically records them to evaluation history if not already present.
    """
    import os
    base_dir = os.path.dirname(os.path.abspath(__file__))
    dataset_path = os.path.join(base_dir, "data", "loan_training_data.csv")
    
    if not os.path.exists(dataset_path):
        parent_dir = os.path.dirname(base_dir)
        dataset_path = os.path.join(parent_dir, "loan_training_data.csv")
        
    if not os.path.exists(dataset_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Default dataset loan_training_data.csv not found."
        )
        
    try:
        df = pd.read_csv(dataset_path)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error reading dataset: {str(e)}"
        )
        
    target = "approved"
    if target not in df.columns:
        target = df.columns[-1]
        
    models_to_train = get_supported_models()
    results = {}
    
    for model_name in models_to_train:
        try:
            res = evaluate_classifier(df, target, model_name)
            results[model_name] = res
            
            # Save to database run history ONLY if we don't have a very recent run in database
            # to avoid cluttering history with duplicate page load runs.
            recent_run = db.query(EvaluationRun).filter(
                EvaluationRun.dataset_name == "loan_training_data.csv",
                EvaluationRun.model_name == model_name,
                EvaluationRun.target_column == target
            ).order_by(EvaluationRun.evaluated_at.desc()).first()
            
            # If no run exists, or it's older than 10 minutes, save it
            should_save = True
            if recent_run:
                time_diff = datetime.datetime.utcnow() - recent_run.evaluated_at
                if time_diff.total_seconds() < 600:
                    should_save = False
                    results[model_name]["id"] = recent_run.id
                    results[model_name]["dataset_name"] = "loan_training_data.csv"
                    results[model_name]["evaluated_at"] = recent_run.evaluated_at.isoformat()
            
            if should_save:
                run = EvaluationRun(
                    dataset_name="loan_training_data.csv",
                    model_name=model_name,
                    target_column=target,
                    evaluated_at=datetime.datetime.utcnow(),
                    accuracy=res["accuracy"],
                    precision=res["precision"],
                    recall=res["recall"],
                    f1_score=res["f1_score"],
                    roc_auc=res["roc_auc"],
                    confusion_matrix=json.dumps(res["confusion_matrix"]),
                    classification_report=json.dumps(res["classification_report"]),
                    run_time_seconds=res["run_time_seconds"]
                )
                db.add(run)
                db.commit()
                db.refresh(run)
                
                results[model_name]["id"] = run.id
                results[model_name]["dataset_name"] = "loan_training_data.csv"
                results[model_name]["evaluated_at"] = run.evaluated_at.isoformat()
                
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Evaluation failed for {model_name}: {str(e)}"
            )
            
    # Determine best model based on F1-score (or Accuracy if they are equal, F1-score is preferred here)
    best_model = None
    best_score = -1.0
    for name, res in results.items():
        score = res["f1_score"]
        if score > best_score:
            best_score = score
            best_model = name
            
    return {
        "models": results,
        "best_model": {
            "model_name": best_model,
            "score": best_score,
            "metric": "F1-score"
        }
    }

@app.get("/api/evaluation/{model_name}", summary="Get evaluation details for a specific model")
def get_model_evaluation(model_name: str, db: Session = Depends(get_db)):
    """
    Returns the evaluation results for a single classifier model on the default dataset.
    """
    if model_name not in get_supported_models():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Model '{model_name}' not found. Available models: {get_supported_models()}"
        )
        
    import os
    base_dir = os.path.dirname(os.path.abspath(__file__))
    dataset_path = os.path.join(base_dir, "data", "loan_training_data.csv")
    
    if not os.path.exists(dataset_path):
        parent_dir = os.path.dirname(base_dir)
        dataset_path = os.path.join(parent_dir, "loan_training_data.csv")
        
    if not os.path.exists(dataset_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Default dataset loan_training_data.csv not found."
        )
        
    try:
        df = pd.read_csv(dataset_path)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error reading dataset: {str(e)}"
        )
        
    target = "approved"
    if target not in df.columns:
        target = df.columns[-1]
        
    try:
        res = evaluate_classifier(df, target, model_name)
        res["dataset_name"] = "loan_training_data.csv"
        return res
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Evaluation failed: {str(e)}"
        )

