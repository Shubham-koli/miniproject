// ===== SAMPLE DATA =====
const sampleData = {
    healthy: {
        Pregnancies: 1, Glucose: 85, BloodPressure: 66,
        SkinThickness: 29, Insulin: 0, BMI: 26.6,
        DiabetesPedigreeFunction: 0.351, Age: 31
    },
    atRisk: {
        Pregnancies: 6, Glucose: 148, BloodPressure: 72,
        SkinThickness: 35, Insulin: 0, BMI: 33.6,
        DiabetesPedigreeFunction: 0.627, Age: 50
    }
};

const featureLabels = {
    Pregnancies: 'Pregnancies',
    Glucose: 'Glucose',
    BloodPressure: 'Blood Pressure',
    SkinThickness: 'Skin Thickness',
    Insulin: 'Insulin',
    BMI: 'BMI',
    DiabetesPedigreeFunction: 'Diabetes Pedigree',
    Age: 'Age'
};

// ===== FORM FUNCTIONS =====
function fillSample(type) {
    const data = sampleData[type];
    Object.keys(data).forEach(key => {
        const input = document.getElementById(key);
        if (input) input.value = data[key];
    });
}

function clearForm() {
    document.getElementById('predictForm').reset();
    document.getElementById('results').style.display = 'none';
}

// ===== SAFE DOM HELPERS =====
function createEl(tag, className, textContent) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (textContent) el.textContent = textContent;
    return el;
}

function createIcon(iconClass) {
    const i = document.createElement('i');
    i.className = iconClass;
    return i;
}

// ===== FORM SUBMISSION =====
document.getElementById('predictForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    const btn = document.getElementById('predictBtn');
    btn.classList.add('btn-loading');
    btn.disabled = true;

    const fields = [
        'Pregnancies', 'Glucose', 'BloodPressure', 'SkinThickness',
        'Insulin', 'BMI', 'DiabetesPedigreeFunction', 'Age'
    ];

    const data = {};
    for (const field of fields) {
        const val = document.getElementById(field).value;
        if (val === '') {
            btn.classList.remove('btn-loading');
            btn.disabled = false;
            return;
        }
        data[field] = parseFloat(val);
    }

    try {
        const response = await fetch('/api/predict', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (result.error) {
            alert('Error: ' + result.error);
            return;
        }

        displayResults(result);
    } catch (err) {
        alert('Failed to get prediction. Is the server running?');
    } finally {
        btn.classList.remove('btn-loading');
        btn.disabled = false;
    }
});

// ===== DISPLAY RESULTS =====
function displayResults(data) {
    const resultsEl = document.getElementById('results');
    resultsEl.style.display = 'block';
    resultsEl.scrollIntoView({ behavior: 'smooth', block: 'start' });

    // Risk Gauge
    drawRiskGauge(data.risk_score);

    // Risk Badge
    const badge = document.getElementById('riskBadge');
    badge.textContent = data.risk_level + ' Risk';
    badge.className = 'risk-badge ' + data.risk_level.toLowerCase();

    // Model Votes
    const votesGrid = document.getElementById('votesGrid');
    votesGrid.textContent = '';
    const modelOrder = ['logistic_regression', 'random_forest', 'svm', 'knn', 'xgboost_model'];

    modelOrder.forEach((key, i) => {
        const pred = data.predictions[key];
        if (!pred) return;
        const isDiabetic = pred.prediction === 1;
        const colorVar = isDiabetic ? 'var(--risk-high)' : 'var(--risk-low)';

        const card = createEl('div', 'vote-card ' + (isDiabetic ? 'diabetic' : 'non-diabetic'));
        card.style.animationDelay = (i * 0.1) + 's';

        const nameDiv = createEl('div', 'model-name', pred.name);
        const resultDiv = createEl('div', 'vote-result', isDiabetic ? 'Diabetic' : 'Not Diabetic');
        resultDiv.style.color = colorVar;
        const confDiv = createEl('div', 'vote-confidence', (pred.probability * 100).toFixed(1) + '%');
        confDiv.style.color = colorVar;

        card.appendChild(nameDiv);
        card.appendChild(resultDiv);
        card.appendChild(confDiv);
        votesGrid.appendChild(card);
    });

    // Ensemble Bar
    const ensembleFill = document.getElementById('ensembleFill');
    const score = data.risk_score;
    const gradient = score < 35 ? 'var(--gradient-success)' :
                     score < 65 ? 'var(--gradient-warning)' : 'var(--gradient-danger)';
    ensembleFill.style.background = gradient;
    setTimeout(() => { ensembleFill.style.width = score + '%'; }, 100);

    const ensembleValue = document.getElementById('ensembleValue');
    ensembleValue.textContent = score.toFixed(1) + '%';
    ensembleValue.style.color = score < 35 ? 'var(--risk-low)' : score < 65 ? 'var(--risk-medium)' : 'var(--risk-high)';

    // Dominant Factors
    const factorsGrid = document.getElementById('factorsGrid');
    factorsGrid.textContent = '';
    data.dominant_factors.forEach(factor => {
        const card = createEl('div', 'factor-card');
        const iconDiv = createEl('div', 'factor-icon');
        const icon = createIcon('fas fa-exclamation-triangle');
        icon.style.color = 'var(--accent-orange)';
        iconDiv.appendChild(icon);
        const nameDiv = createEl('div', 'factor-name', featureLabels[factor] || factor);
        card.appendChild(iconDiv);
        card.appendChild(nameDiv);
        factorsGrid.appendChild(card);
    });

    // Recommendations
    const recList = document.getElementById('recommendationsList');
    recList.textContent = '';
    data.recommendations.forEach(rec => {
        const li = document.createElement('li');
        li.appendChild(createIcon('fas fa-chevron-right'));
        li.appendChild(document.createTextNode(' ' + rec));
        recList.appendChild(li);
    });
}

// ===== RISK GAUGE =====
function drawRiskGauge(score) {
    const canvas = document.getElementById('riskGauge');
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;

    canvas.width = 400 * dpr;
    canvas.height = 250 * dpr;
    canvas.style.width = '400px';
    canvas.style.height = '250px';
    ctx.scale(dpr, dpr);

    const centerX = 200;
    const centerY = 210;
    const radius = 160;
    const lineWidth = 20;

    const targetAngle = (score / 100) * Math.PI;
    const startTime = performance.now();
    const duration = 1500;

    function easeOutCubic(t) {
        return 1 - Math.pow(1 - t, 3);
    }

    function animate(now) {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const currentAngle = easeOutCubic(progress) * targetAngle;

        ctx.clearRect(0, 0, 400, 250);

        // Background arc
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, Math.PI, 2 * Math.PI);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.lineWidth = lineWidth;
        ctx.lineCap = 'round';
        ctx.stroke();

        // Colored arc segments
        var segments = [
            { start: Math.PI, end: Math.PI + Math.PI * 0.33, color: '#43e97b' },
            { start: Math.PI + Math.PI * 0.33, end: Math.PI + Math.PI * 0.66, color: '#f6d365' },
            { start: Math.PI + Math.PI * 0.66, end: 2 * Math.PI, color: '#f5576c' }
        ];

        segments.forEach(function(seg) {
            var drawEnd = Math.min(seg.end, Math.PI + currentAngle);
            if (drawEnd > seg.start) {
                ctx.beginPath();
                ctx.arc(centerX, centerY, radius, seg.start, drawEnd);
                ctx.strokeStyle = seg.color;
                ctx.lineWidth = lineWidth;
                ctx.lineCap = 'round';
                ctx.stroke();
            }
        });

        // Tick marks
        for (var i = 0; i <= 4; i++) {
            var angle = Math.PI + (i / 4) * Math.PI;
            var innerR = radius - lineWidth / 2 - 8;
            var outerR = radius - lineWidth / 2 - 18;
            var x1 = centerX + innerR * Math.cos(angle);
            var y1 = centerY + innerR * Math.sin(angle);
            var x2 = centerX + outerR * Math.cos(angle);
            var y2 = centerY + outerR * Math.sin(angle);

            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.lineWidth = 2;
            ctx.stroke();

            // Labels
            var labelR = radius - lineWidth / 2 - 30;
            var lx = centerX + labelR * Math.cos(angle);
            var ly = centerY + labelR * Math.sin(angle);
            ctx.font = '12px Inter';
            ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText((i * 25) + '%', lx, ly);
        }

        // Needle
        var needleAngle = Math.PI + currentAngle;
        var needleLen = radius - lineWidth / 2 - 5;
        var nx = centerX + needleLen * Math.cos(needleAngle);
        var ny = centerY + needleLen * Math.sin(needleAngle);

        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(nx, ny);
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.stroke();

        // Needle center dot
        ctx.beginPath();
        ctx.arc(centerX, centerY, 6, 0, 2 * Math.PI);
        ctx.fillStyle = '#fff';
        ctx.fill();

        // Score text
        var displayScore = (easeOutCubic(progress) * score).toFixed(1);
        ctx.font = "bold 42px 'Space Grotesk'";
        var scoreColor = score < 35 ? '#43e97b' : score < 65 ? '#f6d365' : '#f5576c';
        ctx.fillStyle = scoreColor;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(displayScore + '%', centerX, centerY - 40);

        ctx.font = '14px Inter';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.fillText('Risk Score', centerX, centerY - 10);

        if (progress < 1) {
            requestAnimationFrame(animate);
        }
    }

    requestAnimationFrame(animate);
}
