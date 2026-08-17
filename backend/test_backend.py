import os
import time
import requests
import pandas as pd
import numpy as np
from database import init_db, SessionLocal, EvaluationRun
from evaluation import evaluate_classifier

def generate_synthetic_data(filename="test_dataset.csv"):
    print("Generating synthetic binary classification dataset...")
    np.random.seed(42)
    n_samples = 100
    
    # Generate random features
    x1 = np.random.normal(0, 1, n_samples)
    x2 = np.random.normal(2, 1.5, n_samples)
    categorical = np.random.choice(["High", "Medium", "Low"], size=n_samples)
    
    # Generate binary label correlated with x1 and x2
    prob = 1 / (1 + np.exp(-(x1 + x2 - 1)))
    y = (prob > 0.5).astype(int)
    
    df = pd.DataFrame({
        "feature_1": x1,
        "feature_2": x2,
        "feature_3_categorical": categorical,
        "target": y
    })
    
    df.to_csv(filename, index=False)
    print(f"Dataset saved to: {filename}")
    return filename

def test_evaluation_module(filename):
    print("\n--- Testing Evaluation Module directly ---")
    df = pd.read_csv(filename)
    results = evaluate_classifier(df, target_column="target", model_name="Random Forest")
    
    print(f"Accuracy:  {results['accuracy']:.4f}")
    print(f"Precision: {results['precision']:.4f}")
    print(f"Recall:    {results['recall']:.4f}")
    print(f"F1 Score:  {results['f1_score']:.4f}")
    print(f"ROC AUC:   {results['roc_auc']:.4f}")
    print("Confusion Matrix:")
    print(np.array(results["confusion_matrix"]))
    print("Classes detected:", results["classes"])
    print("ROC curve points count:", len(results["roc_curve_data"]))
    print("Run time (seconds):", results["run_time_seconds"])
    assert results["accuracy"] >= 0.0
    print("Direct module test passed!")

def test_new_api_endpoints(base_url):
    print("\n--- Testing New API endpoints ---")
    
    # 1. Test /api/dataset
    print("Testing GET /api/dataset...")
    res = requests.get(f"{base_url}/api/dataset")
    print("Response status:", res.status_code)
    assert res.status_code == 200
    data = res.json()
    assert data["dataset_name"] == "loan_training_data.csv"
    assert data["records"] == 200
    assert data["target"] == "approved"
    assert len(data["features"]) == 4
    assert data["classes_count"] == 2
    assert data["train_samples"] == 160
    assert data["test_samples"] == 40
    print("GET /api/dataset passed!")
    
    # 2. Test /api/models
    print("Testing GET /api/models...")
    res = requests.get(f"{base_url}/api/models")
    assert res.status_code == 200
    models = res.json()
    assert len(models) == 4
    assert "Logistic Regression" in models
    assert "Random Forest" in models
    assert "SVM" in models
    assert "Gradient Boosting" in models
    print("GET /api/models passed!")
    
    # 3. Test /api/evaluation
    print("Testing GET /api/evaluation...")
    res = requests.get(f"{base_url}/api/evaluation")
    assert res.status_code == 200
    eval_res = res.json()
    assert "models" in eval_res
    assert "best_model" in eval_res
    
    # Verify all 4 models are present and have correct keys
    for m in ["Logistic Regression", "Random Forest", "SVM", "Gradient Boosting"]:
        assert m in eval_res["models"]
        model_data = eval_res["models"][m]
        assert "accuracy" in model_data
        assert "precision" in model_data
        assert "recall" in model_data
        assert "f1_score" in model_data
        assert "roc_auc" in model_data
        assert "confusion_matrix" in model_data
        assert "classification_report" in model_data
        assert len(model_data["confusion_matrix"]) == 2  # binary classification
        print(f"  Model {m} verified: Accuracy = {model_data['accuracy']:.4f}, F1 = {model_data['f1_score']:.4f}")
        
    print("GET /api/evaluation passed!")
    
    # 4. Test /api/evaluation/{model_name}
    print("Testing GET /api/evaluation/SVM...")
    res = requests.get(f"{base_url}/api/evaluation/SVM")
    assert res.status_code == 200
    svm_data = res.json()
    assert "accuracy" in svm_data
    assert "confusion_matrix" in svm_data
    assert "classification_report" in svm_data
    print("GET /api/evaluation/{model_name} passed!")

def test_api_endpoints(filename):
    print("\n--- Testing API endpoints ---")
    import subprocess
    import sys
    
    # Setup virtual environment or use current system python to start server
    print("Starting FastAPI backend server in background...")
    proc = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "main:app", "--host", "127.0.0.1", "--port", "8000"],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        cwd=os.path.dirname(os.path.abspath(__file__))
    )
    
    # Wait for server to boot
    time.sleep(5)
    
    base_url = "http://127.0.0.1:8000"
    
    try:
        # Test 1: GET /models
        print("Testing GET /models...")
        res = requests.get(f"{base_url}/models")
        print("Response:", res.status_code, res.json())
        assert res.status_code == 200
        assert "Random Forest" in res.json()
        
        # Test 2: POST /evaluate
        print("Testing POST /evaluate...")
        with open(filename, "rb") as f:
            files = {"file": (filename, f, "text/csv")}
            data = {"model_name": "Logistic Regression", "target_column": "target"}
            res = requests.post(f"{base_url}/evaluate", files=files, data=data)
            
        print("Response status:", res.status_code)
        if res.status_code == 200:
            eval_res = res.json()
            print("Evaluation successful. Accuracy:", eval_res["accuracy"])
            assert "confusion_matrix" in eval_res
        else:
            print("Error response:", res.text)
            assert False, "Evaluation POST failed"
            
        # Test 3: GET /history
        print("Testing GET /history...")
        res = requests.get(f"{base_url}/history")
        history = res.json()
        print(f"Runs in history: {len(history)}")
        assert res.status_code == 200
        assert len(history) > 0
        
        # Test 4: GET /metrics
        print("Testing GET /metrics...")
        res = requests.get(f"{base_url}/metrics")
        metrics = res.json()
        print("Metrics summary:")
        print(f"  Total Runs: {metrics['total_runs']}")
        print(f"  Best Accuracy: {metrics['best_accuracy']}")
        print(f"  Model distribution: {metrics['model_distribution']}")
        assert res.status_code == 200
        assert metrics["total_runs"] > 0
        
        # Test 5: New API endpoints
        test_new_api_endpoints(base_url)
        
        print("\nAll API endpoint tests passed!")
        
    finally:
        # Terminate backend process
        print("Stopping backend server...")
        proc.terminate()
        proc.wait()
        
if __name__ == "__main__":
    csv_file = generate_synthetic_data()
    try:
        test_evaluation_module(csv_file)
        test_api_endpoints(csv_file)
    finally:
        # Clean up test dataset
        if os.path.exists(csv_file):
            os.remove(csv_file)
            print("Cleaned up temporary test dataset.")
        # Clean up database file for tests if needed, or keep it
        if os.path.exists("history.db"):
            # keep or delete. Let's delete to start fresh
            os.remove("history.db")
            print("Cleaned up temporary SQLite database file history.db.")
