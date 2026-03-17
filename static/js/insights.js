// ===== CHART.JS DEFAULTS =====
Chart.defaults.color = '#a0aec0';
Chart.defaults.borderColor = 'rgba(255, 255, 255, 0.06)';
Chart.defaults.font.family = "'Inter', sans-serif";
Chart.defaults.font.size = 13;
Chart.defaults.plugins.legend.labels.usePointStyle = true;
Chart.defaults.plugins.legend.labels.padding = 15;

var statsData = {};

// ===== INIT =====
async function init() {
    var res = await fetch('/api/dataset-stats');
    statsData = await res.json();

    renderOverviewCards();
    renderClassChart();
    renderZeroChart();
    renderDistributions();
    renderHeatmap();
}

// ===== COUNT-UP ANIMATION =====
function animateCount(el, target, duration) {
    duration = duration || 1000;
    var start = performance.now();
    function update(now) {
        var progress = Math.min((now - start) / duration, 1);
        var value = Math.floor(progress * target);
        el.textContent = value;
        if (progress < 1) requestAnimationFrame(update);
        else el.textContent = target;
    }
    requestAnimationFrame(update);
}

// ===== OVERVIEW CARDS =====
function renderOverviewCards() {
    var cb = statsData.class_balance;
    animateCount(document.getElementById('totalSamples'), cb.total);
    animateCount(document.getElementById('diabeticCount'), cb.diabetic);
    animateCount(document.getElementById('nonDiabeticCount'), cb.non_diabetic);
}

// ===== CLASS DISTRIBUTION =====
function renderClassChart() {
    var ctx = document.getElementById('classChart').getContext('2d');
    var cb = statsData.class_balance;

    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Non-Diabetic', 'Diabetic'],
            datasets: [{
                data: [cb.non_diabetic, cb.diabetic],
                backgroundColor: ['rgba(56, 249, 215, 0.7)', 'rgba(245, 87, 108, 0.7)'],
                borderColor: ['#38f9d7', '#f5576c'],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '70%',
            plugins: {
                legend: { position: 'bottom' },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            var pct = ((context.raw / cb.total) * 100).toFixed(1);
                            return context.label + ': ' + context.raw + ' (' + pct + '%)';
                        }
                    }
                }
            }
        }
    });
}

// ===== ZERO VALUES CHART =====
function renderZeroChart() {
    var ctx = document.getElementById('zeroChart').getContext('2d');
    var zp = statsData.zero_percentages;
    var labels = Object.keys(zp);
    var values = Object.values(zp);

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Zero Values (%)',
                data: values,
                backgroundColor: values.map(function(v) {
                    if (v > 30) return 'rgba(245, 87, 108, 0.6)';
                    if (v > 10) return 'rgba(246, 211, 101, 0.6)';
                    return 'rgba(67, 233, 123, 0.6)';
                }),
                borderColor: values.map(function(v) {
                    if (v > 30) return '#f5576c';
                    if (v > 10) return '#f6d365';
                    return '#43e97b';
                }),
                borderWidth: 1,
                borderRadius: 4
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { title: { display: true, text: 'Percentage (%)' }, grid: { color: 'rgba(255,255,255,0.04)' } },
                y: { grid: { display: false } }
            },
            plugins: { legend: { display: false } }
        }
    });
}

// ===== FEATURE DISTRIBUTIONS =====
function renderDistributions() {
    var grid = document.getElementById('distributionGrid');
    grid.textContent = '';
    var features = Object.keys(statsData.distributions);

    features.forEach(function(feature) {
        var dist = statsData.distributions[feature];
        var wrapper = document.createElement('div');
        wrapper.className = 'dist-chart-wrapper';

        var title = document.createElement('h4');
        title.textContent = feature;
        wrapper.appendChild(title);

        var canvasEl = document.createElement('canvas');
        wrapper.appendChild(canvasEl);
        grid.appendChild(wrapper);

        var binLabels = dist.bins.slice(0, -1).map(function(b, i) {
            return b.toFixed(0) + '-' + dist.bins[i + 1].toFixed(0);
        });

        new Chart(canvasEl.getContext('2d'), {
            type: 'bar',
            data: {
                labels: binLabels,
                datasets: [
                    {
                        label: 'Non-Diabetic',
                        data: dist.non_diabetic,
                        backgroundColor: 'rgba(56, 249, 215, 0.5)',
                        borderColor: '#38f9d7',
                        borderWidth: 1
                    },
                    {
                        label: 'Diabetic',
                        data: dist.diabetic,
                        backgroundColor: 'rgba(245, 87, 108, 0.5)',
                        borderColor: '#f5576c',
                        borderWidth: 1
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: { display: false, stacked: true },
                    y: { display: false, stacked: true }
                },
                plugins: {
                    legend: { display: false },
                    tooltip: { mode: 'index', intersect: false }
                }
            }
        });
    });
}

// ===== CORRELATION HEATMAP =====
function renderHeatmap() {
    var canvas = document.getElementById('heatmapCanvas');
    var ctx = canvas.getContext('2d');
    var dpr = window.devicePixelRatio || 1;

    var corr = statsData.correlation;
    var matrix = corr.matrix;
    var labels = corr.labels;
    var n = labels.length;

    var labelSpace = 120;
    var cellSize = 52;
    var totalSize = labelSpace + n * cellSize;

    canvas.width = totalSize * dpr;
    canvas.height = totalSize * dpr;
    canvas.style.width = totalSize + 'px';
    canvas.style.height = totalSize + 'px';
    ctx.scale(dpr, dpr);

    function getColor(val) {
        if (val >= 0) {
            var t = val;
            var r = Math.floor(26 + (245 - 26) * t);
            var g = Math.floor(31 + (87 - 31) * t);
            var b = Math.floor(54 + (108 - 54) * t);
            return 'rgb(' + r + ', ' + g + ', ' + b + ')';
        } else {
            var t2 = -val;
            var r2 = Math.floor(26 + (79 - 26) * t2);
            var g2 = Math.floor(31 + (172 - 31) * t2);
            var b2 = Math.floor(54 + (254 - 54) * t2);
            return 'rgb(' + r2 + ', ' + g2 + ', ' + b2 + ')';
        }
    }

    // Draw cells
    for (var i = 0; i < n; i++) {
        for (var j = 0; j < n; j++) {
            var val = matrix[i][j];
            var x = labelSpace + j * cellSize;
            var y = labelSpace + i * cellSize;

            ctx.fillStyle = getColor(val);
            ctx.fillRect(x, y, cellSize - 2, cellSize - 2);

            ctx.font = '10px Inter';
            ctx.fillStyle = Math.abs(val) > 0.3 ? '#fff' : '#a0aec0';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(val.toFixed(2), x + cellSize / 2 - 1, y + cellSize / 2 - 1);
        }
    }

    // Row labels
    ctx.font = '11px Inter';
    ctx.fillStyle = '#a0aec0';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (var ri = 0; ri < n; ri++) {
        var ry = labelSpace + ri * cellSize + cellSize / 2;
        ctx.fillText(labels[ri], labelSpace - 8, ry);
    }

    // Column labels (rotated)
    ctx.textAlign = 'left';
    for (var ci = 0; ci < n; ci++) {
        var cx = labelSpace + ci * cellSize + cellSize / 2;
        ctx.save();
        ctx.translate(cx, labelSpace - 8);
        ctx.rotate(-Math.PI / 4);
        ctx.fillText(labels[ci], 0, 0);
        ctx.restore();
    }
}

// ===== START =====
init();
