import pandas as pd
import numpy as np
import json
import os
import warnings
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.svm import SVC
from sklearn.neighbors import KNeighborsClassifier
from xgboost import XGBClassifier
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score,
    f1_score, roc_auc_score, roc_curve, confusion_matrix
)
from imblearn.over_sampling import SMOTE

warnings.filterwarnings('ignore')


def load_and_preprocess():
    print("=" * 60)
    print("  DIABETES PREDICTION MODEL TRAINING")
    print("=" * 60)

    df = pd.read_csv('diabetes.csv')
    print(f"\nDataset loaded: {df.shape[0]} rows, {df.shape[1]} columns")
    print(f"Class distribution: {dict(df['Outcome'].value_counts())}")

    # Replace 0s with NaN for columns where 0 is not biologically possible
    zero_columns = ['Glucose', 'BloodPressure', 'SkinThickness', 'Insulin', 'BMI']
    zero_counts = (df[zero_columns] == 0).sum()
    print(f"\nZero values (treated as missing):")
    for col in zero_columns:
        print(f"  {col}: {zero_counts[col]} ({zero_counts[col]/len(df)*100:.1f}%)")

    df[zero_columns] = df[zero_columns].replace(0, np.nan)
    df[zero_columns] = df[zero_columns].fillna(df[zero_columns].median())

    # Split features and target
    X = df.drop('Outcome', axis=1)
    y = df['Outcome']

    # Train/test split
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    print(f"\nTrain set: {X_train.shape[0]} samples")
    print(f"Test set: {X_test.shape[0]} samples")

    # Feature scaling
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    # SMOTE for class imbalance
    smote = SMOTE(random_state=42)
    X_train_resampled, y_train_resampled = smote.fit_resample(X_train_scaled, y_train)
    print(f"After SMOTE: {len(y_train_resampled)} training samples")
    print(f"  Class 0: {sum(y_train_resampled == 0)}, Class 1: {sum(y_train_resampled == 1)}")

    return X_train_resampled, X_test_scaled, y_train_resampled, y_test, scaler, X.columns.tolist()


def train_models(X_train, X_test, y_train, y_test, feature_names):
    models = {
        'logistic_regression': LogisticRegression(
            C=0.5, max_iter=1000, random_state=42
        ),
        'random_forest': RandomForestClassifier(
            n_estimators=200, max_depth=8, min_samples_split=5,
            min_samples_leaf=2, random_state=42
        ),
        'svm': SVC(
            kernel='rbf', C=1.0, gamma='scale',
            probability=True, random_state=42
        ),
        'knn': KNeighborsClassifier(
            n_neighbors=11, weights='distance', metric='minkowski'
        ),
        'xgboost_model': XGBClassifier(
            n_estimators=200, max_depth=5, learning_rate=0.1,
            subsample=0.8, colsample_bytree=0.8,
            use_label_encoder=False, eval_metric='logloss', random_state=42
        )
    }

    display_names = {
        'logistic_regression': 'Logistic Regression',
        'random_forest': 'Random Forest',
        'svm': 'SVM',
        'knn': 'KNN',
        'xgboost_model': 'XGBoost'
    }

    all_metrics = {}

    print("\n" + "=" * 60)
    print("  TRAINING & EVALUATION RESULTS")
    print("=" * 60)
    print(f"\n{'Model':<22} {'Accuracy':>10} {'Precision':>10} {'Recall':>10} {'F1':>10} {'AUC':>10}")
    print("-" * 72)

    for name, model in models.items():
        # Train
        model.fit(X_train, y_train)

        # Predict
        y_pred = model.predict(X_test)
        y_prob = model.predict_proba(X_test)[:, 1]

        # Metrics
        acc = accuracy_score(y_test, y_pred)
        prec = precision_score(y_test, y_pred)
        rec = recall_score(y_test, y_pred)
        f1 = f1_score(y_test, y_pred)
        auc = roc_auc_score(y_test, y_prob)

        # ROC curve data
        fpr, tpr, _ = roc_curve(y_test, y_prob)
        cm = confusion_matrix(y_test, y_pred)

        # Feature importance (for tree-based models)
        feature_importance = None
        if hasattr(model, 'feature_importances_'):
            feature_importance = model.feature_importances_.tolist()

        all_metrics[name] = {
            'name': display_names[name],
            'accuracy': round(acc, 4),
            'precision': round(prec, 4),
            'recall': round(rec, 4),
            'f1': round(f1, 4),
            'auc': round(auc, 4),
            'roc': {
                'fpr': [round(x, 4) for x in fpr.tolist()],
                'tpr': [round(x, 4) for x in tpr.tolist()]
            },
            'confusion_matrix': cm.tolist(),
            'feature_importance': feature_importance
        }

        print(f"  {display_names[name]:<20} {acc:>10.4f} {prec:>10.4f} {rec:>10.4f} {f1:>10.4f} {auc:>10.4f}")

        # Save model
        import joblib
        os.makedirs('models', exist_ok=True)
        joblib.dump(model, f'models/{name}.joblib')

    # Add feature names to metrics
    all_metrics['feature_names'] = feature_names

    return models, all_metrics


def save_artifacts(scaler, metrics):
    import joblib
    os.makedirs('models', exist_ok=True)

    # Save scaler
    joblib.dump(scaler, 'models/scaler.joblib')

    # Save metrics
    with open('models/model_metrics.json', 'w') as f:
        json.dump(metrics, f, indent=2)

    print("\n" + "=" * 60)
    print("  ARTIFACTS SAVED")
    print("=" * 60)
    print("  models/logistic_regression.joblib")
    print("  models/random_forest.joblib")
    print("  models/svm.joblib")
    print("  models/knn.joblib")
    print("  models/xgboost_model.joblib")
    print("  models/scaler.joblib")
    print("  models/model_metrics.json")

    # Find best model
    model_keys = [k for k in metrics if k != 'feature_names']
    best = max(model_keys, key=lambda k: metrics[k]['auc'])
    print(f"\n  Best model (by AUC): {metrics[best]['name']} ({metrics[best]['auc']:.4f})")
    print("=" * 60)


if __name__ == '__main__':
    X_train, X_test, y_train, y_test, scaler, feature_names = load_and_preprocess()
    models, metrics = train_models(X_train, X_test, y_train, y_test, feature_names)
    save_artifacts(scaler, metrics)
    print("\nTraining complete! Run 'python app.py' to start the web server.\n")
