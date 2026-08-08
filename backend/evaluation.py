import time
import json
from typing import Optional
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.metrics import roc_auc_score, roc_curve
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.svm import SVC

# Supported Models mapping
MODELS = {
    "Logistic Regression": LogisticRegression(max_iter=1000, random_state=42),
    "Random Forest": RandomForestClassifier(random_state=42),
    "SVM": SVC(probability=True, random_state=42),
    "Gradient Boosting": GradientBoostingClassifier(random_state=42),
}

def get_supported_models():
    return list(MODELS.keys())

# =====================================================================
# MANUAL METRIC IMPLEMENTATIONS
# =====================================================================

def calculate_classification_metrics_manual(y_true, y_pred, classes):
    """
    Manually calculates Accuracy, Precision, Recall, F1 Score, and per-class reports
    without using sklearn.metrics wrappers.
    """
    y_true = np.array(y_true)
    y_pred = np.array(y_pred)
    total = len(y_true)
    num_classes = len(classes)
    
    # 1. Accuracy: correct predictions / total predictions
    correct = np.sum(y_true == y_pred)
    accuracy = float(correct / total) if total > 0 else 0.0

    class_metrics = {}
    report = {}

    for idx, cls in enumerate(classes):
        # tp: True Positives (actual == positive, predicted == positive)
        tp = int(np.sum((y_true == idx) & (y_pred == idx)))
        # fp: False Positives (actual == negative, predicted == positive)
        fp = int(np.sum((y_true != idx) & (y_pred == idx)))
        # fn: False Negatives (actual == positive, predicted == negative)
        fn = int(np.sum((y_true == idx) & (y_pred != idx)))
        # tn: True Negatives (actual == negative, predicted == negative)
        tn = int(np.sum((y_true != idx) & (y_pred != idx)))
        
        precision = float(tp / (tp + fp)) if (tp + fp) > 0 else 0.0
        recall = float(tp / (tp + fn)) if (tp + fn) > 0 else 0.0
        f1_score = float(2 * precision * recall / (precision + recall)) if (precision + recall) > 0 else 0.0
        support = int(np.sum(y_true == idx))
        
        class_metrics[idx] = {
            "precision": precision,
            "recall": recall,
            "f1-score": f1_score,
            "support": support
        }
        
        # Classification report formatting using class string name
        report[str(cls)] = {
            "precision": precision,
            "recall": recall,
            "f1-score": f1_score,
            "support": support
        }
    
    # Aggregate Metrics
    # Macro Average: mean of per-class metrics
    macro_prec = float(np.mean([m["precision"] for m in class_metrics.values()]))
    macro_rec = float(np.mean([m["recall"] for m in class_metrics.values()]))
    macro_f1 = float(np.mean([m["f1-score"] for m in class_metrics.values()]))
    
    report["macro avg"] = {
        "precision": macro_prec,
        "recall": macro_rec,
        "f1-score": macro_f1,
        "support": total
    }

    # Weighted Average: sum of metrics weighted by class support / total
    weighted_prec = float(sum(m["precision"] * m["support"] for m in class_metrics.values()) / total) if total > 0 else 0.0
    weighted_rec = float(sum(m["recall"] * m["support"] for m in class_metrics.values()) / total) if total > 0 else 0.0
    weighted_f1 = float(sum(m["f1-score"] * m["support"] for m in class_metrics.values()) / total) if total > 0 else 0.0
    
    report["weighted avg"] = {
        "precision": weighted_prec,
        "recall": weighted_rec,
        "f1-score": weighted_f1,
        "support": total
    }
    
    report["accuracy"] = accuracy
    
    # For global scores displayed in the KPI cards:
    # Always report macro averages globally for scientific rigor (Task 13 compliance)
    global_prec = macro_prec
    global_recall = macro_rec
    global_f1 = macro_f1
        
    return accuracy, global_prec, global_recall, global_f1, report

def calculate_confusion_matrix_manual(y_true, y_pred, num_classes):
    """
    Manually calculates the confusion matrix (2D array of actual vs predicted).
    """
    y_true = np.array(y_true)
    y_pred = np.array(y_pred)
    
    cm = np.zeros((num_classes, num_classes), dtype=int)
    for actual_idx in range(num_classes):
        for pred_idx in range(num_classes):
            cm[actual_idx, pred_idx] = np.sum((y_true == actual_idx) & (y_pred == pred_idx))
            
    return cm.tolist()

# =====================================================================

def evaluate_classifier(df: pd.DataFrame, target_column: str, model_name: str, test_df: Optional[pd.DataFrame] = None):
    """
    Cleans the dataframe, trains the model on df (training set), and evaluates metrics on test_df.
    If test_df is not provided, df is split 80/20 into train/test.
    """
    if target_column not in df.columns:
        raise ValueError(f"Target column '{target_column}' not found in the dataset.")
        
    start_time = time.time()
    
    # 1. Clean and separate features and target
    # Drop rows with nulls in target column
    df = df.dropna(subset=[target_column])
    
    y = df[target_column].copy()
    X = df.drop(columns=[target_column]).copy()
    
    # Label encode target column
    target_encoder = LabelEncoder()
    y_encoded = target_encoder.fit_transform(y)
    classes = [str(c) for c in target_encoder.classes_]
    num_classes = len(classes)
    
    # Determine train/test splits
    if test_df is not None:
        # Check target column is present in test_df
        if target_column not in test_df.columns:
            raise ValueError(f"Target column '{target_column}' not found in test dataset.")
            
        test_df = test_df.dropna(subset=[target_column])
        y_test_raw = test_df[target_column].copy()
        X_test_raw = test_df.drop(columns=[target_column]).copy()
        
        # Transform test target
        y_test_encoded = target_encoder.transform(y_test_raw)
        
        X_train = X.copy()
        X_test = X_test_raw.copy()
        y_train = y_encoded
        y_test = y_test_encoded
    else:
        # 2. Split dataset (80/20 train/test)
        stratify_y = y_encoded if (min(np.bincount(y_encoded)) >= 2) else None
        
        X_train, X_test, y_train, y_test = train_test_split(
            X, y_encoded, test_size=0.20, random_state=42, stratify=stratify_y
        )
    
    # Preprocess features: Impute missing data, encode, and scale avoiding train/test leakage
    X_train = X_train.copy()
    X_test = X_test.copy()
    
    numerical_cols = X_train.select_dtypes(include=[np.number]).columns.tolist()
    categorical_cols = X_train.select_dtypes(exclude=[np.number]).columns.tolist()
    
    # Impute numerical columns using median computed ONLY from X_train
    for col in numerical_cols:
        median_val = X_train[col].median()
        if pd.isna(median_val):
            median_val = 0.0
        X_train[col] = X_train[col].fillna(median_val)
        if col in X_test.columns:
            X_test[col] = X_test[col].fillna(median_val)
            
    # Impute categorical columns with "Missing"
    for col in categorical_cols:
        X_train[col] = X_train[col].fillna("Missing")
        if col in X_test.columns:
            X_test[col] = X_test[col].fillna("Missing")
            
    # One-hot encode categorical features and align columns
    if categorical_cols:
        X_train = pd.get_dummies(X_train, columns=categorical_cols, drop_first=True)
        X_test = pd.get_dummies(X_test, columns=categorical_cols, drop_first=True)
        # Reindex X_test columns to match X_train columns exactly (filling missing columns with 0)
        X_test = X_test.reindex(columns=X_train.columns, fill_value=0)
    
    # Scale features using StandardScaler fitted ONLY on X_train
    final_cols = X_train.columns.tolist()
    if final_cols:
        scaler = StandardScaler()
        X_train_scaled = scaler.fit_transform(X_train)
        
        # Ensure test columns align exactly to the training columns
        X_test = X_test.reindex(columns=final_cols, fill_value=0)
        X_test_scaled = scaler.transform(X_test)
        
        X_train = pd.DataFrame(X_train_scaled, columns=final_cols)
        X_test = pd.DataFrame(X_test_scaled, columns=final_cols)
    
    # 3. Model setup & training
    if model_name not in MODELS:
        raise ValueError(f"Model '{model_name}' is not supported. Supported models: {list(MODELS.keys())}")
        
    # Get a fresh instance of the model to avoid state leaking
    if model_name == "Logistic Regression":
        clf = LogisticRegression(max_iter=1000, random_state=42)
    elif model_name == "Random Forest":
        clf = RandomForestClassifier(random_state=42)
    elif model_name == "SVM":
        clf = SVC(probability=True, random_state=42)
    elif model_name == "Gradient Boosting":
        clf = GradientBoostingClassifier(random_state=42)
    else:
        clf = RandomForestClassifier(random_state=42)
        
    clf.fit(X_train, y_train)
    
    # 4. Predictions
    y_pred = clf.predict(X_test)
    y_prob = None
    if hasattr(clf, "predict_proba"):
        y_prob = clf.predict_proba(X_test)
        
    # 5. Calculate Metrics manually
    accuracy, precision, recall, f1, report = calculate_classification_metrics_manual(
        y_test, y_pred, classes
    )
        
    # Calculate ROC-AUC
    roc_auc = None
    roc_curve_data = []
    
    if y_prob is not None:
        try:
            if num_classes == 2:
                # Class 1 probability
                roc_auc = float(roc_auc_score(y_test, y_prob[:, 1]))
                fpr, tpr, _ = roc_curve(y_test, y_prob[:, 1])
                
                # Downsample ROC curve data to ~50 points for charts
                step = max(1, len(fpr) // 50)
                for i in range(0, len(fpr), step):
                    roc_curve_data.append({"fpr": float(fpr[i]), "tpr": float(tpr[i])})
                # Always append the last point (1.0, 1.0)
                if len(roc_curve_data) == 0 or roc_curve_data[-1] != {"fpr": 1.0, "tpr": 1.0}:
                    roc_curve_data.append({"fpr": 1.0, "tpr": 1.0})
            else:
                # Multi-class ROC AUC OVR
                roc_auc = float(roc_auc_score(y_test, y_prob, multi_class="ovr", average="weighted"))
                # ROC curve for multiclass: return average ROC or class 0.
                # For simplicity, calculate average ROC coordinates across classes
                all_fprs = np.linspace(0, 1, 50)
                mean_tpr = np.zeros_like(all_fprs)
                for class_idx in range(num_classes):
                    y_test_bin = (y_test == class_idx).astype(int)
                    if len(np.unique(y_test_bin)) > 1:
                        fpr, tpr, _ = roc_curve(y_test_bin, y_prob[:, class_idx])
                        mean_tpr += np.interp(all_fprs, fpr, tpr)
                mean_tpr /= num_classes
                for fpr_val, tpr_val in zip(all_fprs, mean_tpr):
                    roc_curve_data.append({"fpr": float(fpr_val), "tpr": float(tpr_val)})
        except Exception:
            roc_auc = None
            
    # 6. Confusion Matrix manually
    cm_list = calculate_confusion_matrix_manual(y_test, y_pred, num_classes)
            
    run_time = time.time() - start_time
    
    return {
        "accuracy": accuracy,
        "precision": precision,
        "recall": recall,
        "f1_score": f1,
        "roc_auc": roc_auc,
        "confusion_matrix": cm_list,
        "classification_report": report,
        "classes": classes,
        "roc_curve_data": roc_curve_data,
        "run_time_seconds": float(run_time),
    }
