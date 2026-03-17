// ===== CHART.JS DEFAULTS =====
Chart.defaults.color = '#a0aec0';
Chart.defaults.borderColor = 'rgba(255, 255, 255, 0.06)';
Chart.defaults.font.family = "'Inter', sans-serif";
Chart.defaults.font.size = 13;
Chart.defaults.plugins.legend.labels.usePointStyle = true;
Chart.defaults.plugins.legend.labels.padding = 15;

var MODEL_COLORS = {
    logistic_regression: '#667eea',
    random_forest: '#43e97b',
    svm: '#f5576c',
    knn: '#fda085',
    xgboost_model: '#4facfe'
};

var MODEL_ORDER = ['logistic_regression', 'random_forest', 'svm', 'knn', 'xgboost_model'];

var metricsData = {};
var featureData = {};
var rocData = {};
var charts = {};

// ===== SAFE DOM HELPERS =====
function createEl(tag, className, text) {
    var el = document.createElement(tag);
    if (className) el.className = className;
    if (text !== undefined) el.textContent = text;
    return el;
}

// ===== INIT =====
async function init() {
    var results = await Promise.all([
        fetch('/api/model-metrics').then(function(r) { return r.json(); }),
        fetch('/api/feature-importance').then(function(r) { return r.json(); }),
        fetch('/api/roc-data').then(function(r) { return r.json(); })
    ]);

    metricsData = results[0];
    featureData = results[1];
    rocData = results[2];

    renderMetricCards();
    renderComparisonChart();
    renderROCChart();
    renderRadarChart();
    renderFeatureChart('random_forest');
    renderConfusionMatrix('logistic_regression');
    renderMetricsTable();

    document.getElementById('fiModelSelect').addEventListener('change', function() {
        renderFeatureChart(this.value);
    });
    document.getElementById('cmModelSelect').addEventListener('change', function() {
        renderConfusionMatrix(this.value);
    });
}

// ===== METRIC CARDS =====
function renderMetricCards() {
    var container = document.getElementById('metricCards');
    container.textContent = '';

    var bestKey = '';
    var bestAuc = 0;
    MODEL_ORDER.forEach(function(key) {
        if (metricsData[key] && metricsData[key].auc > bestAuc) {
            bestAuc = metricsData[key].auc;
            bestKey = key;
        }
    });

    MODEL_ORDER.forEach(function(key, i) {
        var m = metricsData[key];
        if (!m) return;
        var acc = m.accuracy;
        var pct = acc * 100;
        var circumference = 2 * Math.PI * 33;
        var offset = circumference * (1 - acc);
        var color = MODEL_COLORS[key];

        var card = createEl('div', 'metric-card');
        card.style.animationDelay = (i * 0.1) + 's';

        if (key === bestKey) {
            card.appendChild(createEl('div', 'best-badge', 'Best'));
        }

        card.appendChild(createEl('div', 'model-name', m.name));

        var ring = createEl('div', 'accuracy-ring');
        var svgNS = 'http://www.w3.org/2000/svg';
        var svg = document.createElementNS(svgNS, 'svg');
        svg.setAttribute('width', '80');
        svg.setAttribute('height', '80');
        svg.setAttribute('viewBox', '0 0 80 80');

        var bgCircle = document.createElementNS(svgNS, 'circle');
        bgCircle.setAttribute('cx', '40');
        bgCircle.setAttribute('cy', '40');
        bgCircle.setAttribute('r', '33');
        bgCircle.setAttribute('fill', 'none');
        bgCircle.setAttribute('stroke', 'rgba(255,255,255,0.05)');
        bgCircle.setAttribute('stroke-width', '6');
        svg.appendChild(bgCircle);

        var fgCircle = document.createElementNS(svgNS, 'circle');
        fgCircle.setAttribute('cx', '40');
        fgCircle.setAttribute('cy', '40');
        fgCircle.setAttribute('r', '33');
        fgCircle.setAttribute('fill', 'none');
        fgCircle.setAttribute('stroke', color);
        fgCircle.setAttribute('stroke-width', '6');
        fgCircle.setAttribute('stroke-dasharray', String(circumference));
        fgCircle.setAttribute('stroke-dashoffset', String(offset));
        fgCircle.setAttribute('stroke-linecap', 'round');
        fgCircle.style.transition = 'stroke-dashoffset 1.5s ease';
        svg.appendChild(fgCircle);
        ring.appendChild(svg);

        var valDiv = createEl('div', 'accuracy-value', pct.toFixed(1) + '%');
        valDiv.style.color = color;
        ring.appendChild(valDiv);
        card.appendChild(ring);

        container.appendChild(card);
    });
}

// ===== COMPARISON BAR CHART =====
function renderComparisonChart() {
    var ctx = document.getElementById('comparisonChart').getContext('2d');
    var metricKeys = ['accuracy', 'precision', 'recall', 'f1'];
    var datasets = MODEL_ORDER.map(function(key) {
        var m = metricsData[key];
        if (!m) return null;
        return {
            label: m.name,
            data: metricKeys.map(function(mk) { return m[mk]; }),
            backgroundColor: MODEL_COLORS[key] + 'CC',
            borderColor: MODEL_COLORS[key],
            borderWidth: 1,
            borderRadius: 4
        };
    }).filter(Boolean);

    charts.comparison = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Accuracy', 'Precision', 'Recall', 'F1 Score'],
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: false, min: 0.5, max: 1.0, grid: { color: 'rgba(255,255,255,0.04)' } },
                x: { grid: { display: false } }
            },
            plugins: { legend: { position: 'bottom' } }
        }
    });
}

// ===== ROC CHART =====
function renderROCChart() {
    var ctx = document.getElementById('rocChart').getContext('2d');
    var datasets = MODEL_ORDER.map(function(key) {
        var r = rocData[key];
        if (!r) return null;
        return {
            label: r.name + ' (AUC: ' + r.auc.toFixed(3) + ')',
            data: r.fpr.map(function(fpr, i) { return { x: fpr, y: r.tpr[i] }; }),
            borderColor: MODEL_COLORS[key],
            backgroundColor: MODEL_COLORS[key] + '10',
            fill: true,
            tension: 0.4,
            pointRadius: 0,
            borderWidth: 2
        };
    }).filter(Boolean);

    datasets.push({
        label: 'Random (AUC: 0.500)',
        data: [{ x: 0, y: 0 }, { x: 1, y: 1 }],
        borderColor: 'rgba(255,255,255,0.15)',
        borderDash: [5, 5],
        pointRadius: 0,
        borderWidth: 1,
        fill: false
    });

    charts.roc = new Chart(ctx, {
        type: 'scatter',
        data: { datasets: datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            showLine: true,
            scales: {
                x: { title: { display: true, text: 'False Positive Rate' }, min: 0, max: 1, grid: { color: 'rgba(255,255,255,0.04)' } },
                y: { title: { display: true, text: 'True Positive Rate' }, min: 0, max: 1, grid: { color: 'rgba(255,255,255,0.04)' } }
            },
            plugins: { legend: { position: 'bottom' } }
        }
    });
}

// ===== RADAR CHART =====
function renderRadarChart() {
    var ctx = document.getElementById('radarChart').getContext('2d');
    var metricKeys = ['accuracy', 'precision', 'recall', 'f1', 'auc'];
    var labels = ['Accuracy', 'Precision', 'Recall', 'F1', 'AUC'];

    var datasets = MODEL_ORDER.map(function(key) {
        var m = metricsData[key];
        if (!m) return null;
        return {
            label: m.name,
            data: metricKeys.map(function(mk) { return m[mk]; }),
            borderColor: MODEL_COLORS[key],
            backgroundColor: MODEL_COLORS[key] + '15',
            pointBackgroundColor: MODEL_COLORS[key],
            pointRadius: 3,
            borderWidth: 2
        };
    }).filter(Boolean);

    charts.radar = new Chart(ctx, {
        type: 'radar',
        data: { labels: labels, datasets: datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                r: {
                    min: 0.5,
                    max: 1.0,
                    ticks: { stepSize: 0.1, backdropColor: 'transparent' },
                    grid: { color: 'rgba(255,255,255,0.06)' },
                    angleLines: { color: 'rgba(255,255,255,0.06)' },
                    pointLabels: { font: { size: 12 } }
                }
            },
            plugins: { legend: { position: 'bottom' } }
        }
    });
}

// ===== FEATURE IMPORTANCE =====
function renderFeatureChart(modelKey) {
    var ctx = document.getElementById('featureChart').getContext('2d');
    var fi = featureData[modelKey];
    if (!fi) return;

    var pairs = fi.features.map(function(f, i) {
        return { feature: f, importance: fi.importances[i] };
    });
    pairs.sort(function(a, b) { return a.importance - b.importance; });

    if (charts.feature) charts.feature.destroy();

    charts.feature = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: pairs.map(function(p) { return p.feature; }),
            datasets: [{
                label: 'Importance',
                data: pairs.map(function(p) { return p.importance; }),
                backgroundColor: pairs.map(function(_, i) {
                    var t = i / (pairs.length - 1);
                    return 'rgba(102, 126, 234, ' + (0.3 + t * 0.7) + ')';
                }),
                borderColor: '#667eea',
                borderWidth: 1,
                borderRadius: 4
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { grid: { color: 'rgba(255,255,255,0.04)' } },
                y: { grid: { display: false } }
            },
            plugins: { legend: { display: false } }
        }
    });
}

// ===== CONFUSION MATRIX =====
function renderConfusionMatrix(modelKey) {
    var container = document.getElementById('confusionMatrix');
    container.textContent = '';
    var m = metricsData[modelKey];
    if (!m || !m.confusion_matrix) return;

    var cm = m.confusion_matrix;
    var tn = cm[0][0], fp = cm[0][1], fn = cm[1][0], tp = cm[1][1];
    var total = tn + fp + fn + tp;

    // Empty corner
    container.appendChild(createEl('div', 'cm-label', ''));

    // Column headers
    container.appendChild(createEl('div', 'cm-label', 'Pred: No'));
    container.appendChild(createEl('div', 'cm-label', 'Pred: Yes'));

    // Row 1: Actual No
    container.appendChild(createEl('div', 'cm-label', 'Actual: No'));

    var tnCell = createEl('div', 'cm-cell', String(tn));
    tnCell.style.background = 'rgba(67, 233, 123, ' + (tn / total) + ')';
    var tnLabel = createEl('span', 'cm-sublabel', 'True Neg');
    tnCell.appendChild(tnLabel);
    container.appendChild(tnCell);

    var fpCell = createEl('div', 'cm-cell', String(fp));
    fpCell.style.background = 'rgba(245, 87, 108, ' + (fp / total) + ')';
    var fpLabel = createEl('span', 'cm-sublabel', 'False Pos');
    fpCell.appendChild(fpLabel);
    container.appendChild(fpCell);

    // Row 2: Actual Yes
    container.appendChild(createEl('div', 'cm-label', 'Actual: Yes'));

    var fnCell = createEl('div', 'cm-cell', String(fn));
    fnCell.style.background = 'rgba(245, 87, 108, ' + (fn / total) + ')';
    var fnLabel = createEl('span', 'cm-sublabel', 'False Neg');
    fnCell.appendChild(fnLabel);
    container.appendChild(fnCell);

    var tpCell = createEl('div', 'cm-cell', String(tp));
    tpCell.style.background = 'rgba(67, 233, 123, ' + (tp / total) + ')';
    var tpLabel = createEl('span', 'cm-sublabel', 'True Pos');
    tpCell.appendChild(tpLabel);
    container.appendChild(tpCell);
}

// ===== METRICS TABLE =====
function renderMetricsTable() {
    var tbody = document.querySelector('#metricsTable tbody');
    tbody.textContent = '';
    var metricKeys = ['accuracy', 'precision', 'recall', 'f1', 'auc'];

    // Find best per column
    var bests = {};
    metricKeys.forEach(function(mk) {
        var best = 0;
        MODEL_ORDER.forEach(function(key) {
            if (metricsData[key] && metricsData[key][mk] > best) best = metricsData[key][mk];
        });
        bests[mk] = best;
    });

    MODEL_ORDER.forEach(function(key) {
        var m = metricsData[key];
        if (!m) return;
        var row = document.createElement('tr');

        // Model name cell with colored dot
        var nameCell = document.createElement('td');
        var dot = createEl('span', 'model-dot');
        dot.style.background = MODEL_COLORS[key];
        dot.style.display = 'inline-block';
        dot.style.width = '8px';
        dot.style.height = '8px';
        dot.style.borderRadius = '50%';
        dot.style.marginRight = '8px';
        nameCell.appendChild(dot);
        nameCell.appendChild(document.createTextNode(m.name));
        row.appendChild(nameCell);

        // Metric cells
        metricKeys.forEach(function(mk) {
            var val = m[mk];
            var td = document.createElement('td');
            td.textContent = val.toFixed(4);
            if (val === bests[mk]) td.className = 'best-value';
            row.appendChild(td);
        });

        tbody.appendChild(row);
    });
}

// ===== START =====
init();
