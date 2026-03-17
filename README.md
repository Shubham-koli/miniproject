# Diabetes Prediction System using Machine Learning

A web-based application that predicts the risk of diabetes using medical parameters. The system uses 5 machine learning models trained on the **Pima Indians Diabetes Dataset** and provides predictions through an interactive web interface with visualizations.

## Features

- **Multi-Model Ensemble Prediction** — Logistic Regression, Random Forest, SVM, KNN, XGBoost
- **Animated Risk Gauge** — Canvas-based gauge with real-time needle animation
- **Model Comparison Dashboard** — Bar charts, ROC curves, radar chart, confusion matrix
- **Data Insights** — Feature distributions, correlation heatmap, class balance analysis
- **Health Recommendations** — Contextual suggestions based on prediction results
- **Responsive Design** — Dark glassmorphism theme, works on desktop and mobile

## Tech Stack

- **Backend:** Python 3, Flask
- **ML:** scikit-learn, XGBoost, imbalanced-learn (SMOTE)
- **Frontend:** HTML5, CSS3, JavaScript, Chart.js
- **Dataset:** Pima Indians Diabetes Database (768 samples, 8 features)

## Requirements

- Python 3.7 or higher
- pip (Python package manager)

### Python Libraries

| Library | Version | Purpose |
|---------|---------|---------|
| Flask | 3.0.0 | Web framework |
| pandas | 2.1.4 | Data manipulation |
| numpy | 1.26.2 | Numerical operations |
| scikit-learn | 1.3.2 | ML algorithms & evaluation |
| xgboost | 2.0.3 | Gradient boosting model |
| imbalanced-learn | 0.11.0 | SMOTE for class balancing |
| joblib | 1.3.2 | Model serialization |

## How to Run

### 1. Clone the repository

```bash
git clone https://github.com/Shubham-koli/miniproject.git
cd miniproject
```

### 2. Install dependencies

```bash
pip install -r requirements.txt
```

### 3. Train the models

```bash
python train_model.py
```

This will:
- Load and preprocess the dataset (median imputation, feature scaling, SMOTE)
- Train all 5 models with tuned hyperparameters
- Evaluate models and print a metrics table
- Save trained models and scaler to the `models/` directory

> **Note:** Pre-trained models are already included in the `models/` folder. You can skip this step if you want to run the app directly.

### 4. Start the web server

```bash
python app.py
```

### 5. Open in browser

```
http://127.0.0.1:5000
```

## Project Structure

```
miniproject/
├── app.py                  # Flask application (routes & API endpoints)
├── train_model.py          # ML training pipeline
├── requirements.txt        # Python dependencies
├── diabetes.csv            # Pima Indians Diabetes Dataset
├── models/                 # Trained model artifacts
│   ├── logistic_regression.joblib
│   ├── random_forest.joblib
│   ├── svm.joblib
│   ├── knn.joblib
│   ├── xgboost_model.joblib
│   ├── scaler.joblib
│   └── model_metrics.json
├── static/
│   ├── css/style.css       # Stylesheet (dark glassmorphism theme)
│   └── js/
│       ├── main.js         # Prediction page logic & risk gauge
│       ├── dashboard.js    # Dashboard charts
│       └── insights.js     # Data insights & heatmap
└── templates/
    ├── base.html           # Base layout (nav, footer)
    ├── index.html          # Prediction page
    ├── dashboard.html      # Model comparison dashboard
    ├── insights.html       # Dataset exploration
    └── about.html          # Project documentation
```

## Pages

| Page | URL | Description |
|------|-----|-------------|
| Predict | `/` | Enter health parameters and get diabetes risk prediction |
| Dashboard | `/dashboard` | Compare model performance with interactive charts |
| Insights | `/insights` | Explore dataset statistics and correlations |
| About | `/about` | Project methodology, tech stack, and references |

## References

- [Pima Indians Diabetes Dataset – Kaggle](https://www.kaggle.com/datasets/uciml/pima-indians-diabetes-database)
- [UCI Machine Learning Repository](https://archive.ics.uci.edu/ml/datasets/Pima+Indians+Diabetes)
- [scikit-learn Documentation](https://scikit-learn.org/stable/)
- [Flask Documentation](https://flask.palletsprojects.com/)
- [XGBoost Documentation](https://xgboost.readthedocs.io/)
- [Chart.js Documentation](https://www.chartjs.org/docs/)
