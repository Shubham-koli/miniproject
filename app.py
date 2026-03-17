from flask import Flask, render_template, request, jsonify
import pandas as pd
import numpy as np
import joblib
import json
import os

app = Flask(__name__)

# Global state
MODELS = {}
SCALER = None
METRICS = {}
DATA = None
FEATURE_NAMES = [
    'Pregnancies', 'Glucose', 'BloodPressure', 'SkinThickness',
    'Insulin', 'BMI', 'DiabetesPedigreeFunction', 'Age'
]
MODEL_KEYS = ['logistic_regression', 'random_forest', 'svm', 'knn', 'xgboost_model']
DISPLAY_NAMES = {
    'logistic_regression': 'Logistic Regression',
    'random_forest': 'Random Forest',
    'svm': 'SVM',
    'knn': 'KNN',
    'xgboost_model': 'XGBoost'
}
WEIGHTS = {
    'logistic_regression': 0.20,
    'random_forest': 0.25,
    'svm': 0.15,
    'knn': 0.10,
    'xgboost_model': 0.30
}


def load_models():
    global MODELS, SCALER, METRICS, DATA
    model_dir = 'models'

    for name in MODEL_KEYS:
        path = os.path.join(model_dir, f'{name}.joblib')
        if os.path.exists(path):
            MODELS[name] = joblib.load(path)

    scaler_path = os.path.join(model_dir, 'scaler.joblib')
    if os.path.exists(scaler_path):
        SCALER = joblib.load(scaler_path)

    metrics_path = os.path.join(model_dir, 'model_metrics.json')
    if os.path.exists(metrics_path):
        with open(metrics_path, 'r') as f:
            METRICS = json.load(f)

    if os.path.exists('diabetes.csv'):
        DATA = pd.read_csv('diabetes.csv')

    print(f"Loaded {len(MODELS)} models")


def generate_recommendations(risk_level, values):
    recommendations = []

    if risk_level == 'High':
        recommendations.append('Consult an endocrinologist for comprehensive evaluation')
        recommendations.append('Monitor blood glucose levels daily')
    elif risk_level == 'Medium':
        recommendations.append('Schedule a check-up with your healthcare provider')
        recommendations.append('Monitor blood glucose levels weekly')
    else:
        recommendations.append('Continue regular annual health check-ups')

    if values.get('BMI', 0) > 30:
        recommendations.append('Focus on weight management through balanced diet and exercise')
    elif values.get('BMI', 0) > 25:
        recommendations.append('Maintain a healthy weight with regular physical activity')

    if values.get('Glucose', 0) > 140:
        recommendations.append('Reduce refined carbohydrate and sugar intake')
    elif values.get('Glucose', 0) > 100:
        recommendations.append('Be mindful of glycemic index in food choices')

    if values.get('BloodPressure', 0) > 90:
        recommendations.append('Monitor blood pressure regularly and reduce sodium intake')

    if values.get('Age', 0) > 45:
        recommendations.append('Increase frequency of diabetes screening tests')

    recommendations.append('Engage in at least 150 minutes of moderate exercise weekly')
    recommendations.append('Stay hydrated and maintain a balanced, fiber-rich diet')

    return recommendations[:6]


# Page routes
@app.route('/')
def index():
    return render_template('index.html')


@app.route('/dashboard')
def dashboard():
    return render_template('dashboard.html')


@app.route('/insights')
def insights():
    return render_template('insights.html')


@app.route('/about')
def about():
    return render_template('about.html')


# API routes
@app.route('/api/predict', methods=['POST'])
def predict():
    try:
        data = request.get_json()

        values = []
        for f in FEATURE_NAMES:
            if f not in data:
                return jsonify({'error': f'Missing field: {f}'}), 400
            try:
                values.append(float(data[f]))
            except (ValueError, TypeError):
                return jsonify({'error': f'Invalid value for {f}'}), 400

        input_array = np.array(values).reshape(1, -1)
        input_scaled = SCALER.transform(input_array)

        predictions = {}
        weighted_sum = 0
        weight_total = 0

        for name in MODEL_KEYS:
            if name not in MODELS:
                continue
            model = MODELS[name]
            pred = int(model.predict(input_scaled)[0])
            prob = float(model.predict_proba(input_scaled)[0][1])
            predictions[name] = {
                'prediction': pred,
                'probability': round(prob, 4),
                'name': DISPLAY_NAMES[name]
            }
            weighted_sum += prob * WEIGHTS[name]
            weight_total += WEIGHTS[name]

        ensemble_prob = weighted_sum / weight_total if weight_total > 0 else 0

        if ensemble_prob < 0.35:
            risk_level = 'Low'
        elif ensemble_prob < 0.65:
            risk_level = 'Medium'
        else:
            risk_level = 'High'

        # Dominant factors
        if DATA is not None:
            feature_means = DATA[FEATURE_NAMES].mean().values
            feature_stds = DATA[FEATURE_NAMES].std().values
            deviations = np.abs(np.array(values) - feature_means) / (feature_stds + 1e-8)
            top_indices = np.argsort(deviations)[-3:][::-1]
            dominant_factors = [FEATURE_NAMES[i] for i in top_indices]
        else:
            dominant_factors = ['Glucose', 'BMI', 'Age']

        recommendations = generate_recommendations(
            risk_level, dict(zip(FEATURE_NAMES, values))
        )

        return jsonify({
            'predictions': predictions,
            'ensemble_probability': round(ensemble_prob, 4),
            'risk_level': risk_level,
            'risk_score': round(ensemble_prob * 100, 1),
            'recommendations': recommendations,
            'dominant_factors': dominant_factors
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/model-metrics')
def model_metrics():
    metrics = {}
    for key in MODEL_KEYS:
        if key in METRICS:
            metrics[key] = METRICS[key]
    return jsonify(metrics)


@app.route('/api/feature-importance')
def feature_importance():
    result = {}
    for key in ['random_forest', 'xgboost_model']:
        if key in METRICS and METRICS[key].get('feature_importance'):
            result[key] = {
                'name': DISPLAY_NAMES[key],
                'features': FEATURE_NAMES,
                'importances': METRICS[key]['feature_importance']
            }
    return jsonify(result)


@app.route('/api/dataset-stats')
def dataset_stats():
    if DATA is None:
        return jsonify({'error': 'Dataset not loaded'}), 500

    df = DATA.copy()

    # Basic stats
    stats = {}
    for col in df.columns:
        stats[col] = {
            'mean': round(float(df[col].mean()), 2),
            'std': round(float(df[col].std()), 2),
            'min': round(float(df[col].min()), 2),
            'max': round(float(df[col].max()), 2),
            'median': round(float(df[col].median()), 2)
        }

    # Correlation matrix
    corr = df.corr().round(3).values.tolist()
    corr_labels = df.columns.tolist()

    # Class balance
    class_counts = df['Outcome'].value_counts().to_dict()
    class_balance = {
        'non_diabetic': int(class_counts.get(0, 0)),
        'diabetic': int(class_counts.get(1, 0)),
        'total': len(df)
    }

    # Distributions (histogram data for each feature)
    distributions = {}
    for col in FEATURE_NAMES:
        diabetic = df[df['Outcome'] == 1][col].values
        non_diabetic = df[df['Outcome'] == 0][col].values
        bins = np.linspace(float(df[col].min()), float(df[col].max()), 16)

        d_hist, _ = np.histogram(diabetic, bins=bins)
        nd_hist, _ = np.histogram(non_diabetic, bins=bins)

        distributions[col] = {
            'bins': [round(float(b), 2) for b in bins],
            'diabetic': d_hist.tolist(),
            'non_diabetic': nd_hist.tolist()
        }

    # Zero value percentages
    zero_cols = ['Glucose', 'BloodPressure', 'SkinThickness', 'Insulin', 'BMI']
    zero_percentages = {}
    for col in zero_cols:
        pct = round(float((df[col] == 0).sum() / len(df) * 100), 1)
        zero_percentages[col] = pct

    return jsonify({
        'stats': stats,
        'correlation': {'matrix': corr, 'labels': corr_labels},
        'class_balance': class_balance,
        'distributions': distributions,
        'zero_percentages': zero_percentages
    })


@app.route('/api/roc-data')
def roc_data():
    result = {}
    for key in MODEL_KEYS:
        if key in METRICS and 'roc' in METRICS[key]:
            result[key] = {
                'name': DISPLAY_NAMES[key],
                'fpr': METRICS[key]['roc']['fpr'],
                'tpr': METRICS[key]['roc']['tpr'],
                'auc': METRICS[key]['auc']
            }
    return jsonify(result)


if __name__ == '__main__':
    load_models()
    app.run(debug=True, port=5000)
