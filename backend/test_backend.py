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

def test_api_endpoints(filename):
    print("\n--- Testing API endpoints ---")
    import subprocess
    import sys
    
    # Setup virtual environment or use current system python to start server
    print("Starting FastAPI backend server in background...")
    proc = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "main:app", "--host", "127.0.0.1", "--port", "8000"],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE
    )
    
    # Wait for server to boot
    time.sleep(3)
    
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
