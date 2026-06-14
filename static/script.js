const charts = {};

const COLORS = {
    primary: '#2563eb',
    secondary: '#7c3aed',
    accent: '#ec4899',
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
    info: '#06b6d4',
    purple: '#8b5cf6',
    teal: '#14b8a6',
    rose: '#f43f5e',
    slate: '#64748b'
};

const PALETTE = [
    COLORS.primary,
    COLORS.secondary,
    COLORS.accent,
    COLORS.info,
    COLORS.warning,
    COLORS.success,
    COLORS.rose,
    COLORS.teal,
    COLORS.purple,
    COLORS.slate
];

Chart.defaults.font.family = "'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
Chart.defaults.color = '#475569';
Chart.defaults.scale.grid.color = '#e2e8f0';

function destroyChart(id) {
    if (charts[id]) {
        charts[id].destroy();
        delete charts[id];
    }
}

async function fetchJSON(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    return res.json();
}

function showError(containerId, message) {
    const el = document.getElementById(containerId);
    if (el) el.innerHTML = `<div class="loading" style="color:${COLORS.danger}">${message}</div>`;
}

// ============== TOAST NOTIFICATIONS ==============

function showToast(message, type = 'info', duration = 5000) {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <div class="toast-icon">${toastIcon(type)}</div>
        <div class="toast-message">${message}</div>
        <button class="toast-close" aria-label="Close">&times;</button>
    `;

    toast.querySelector('.toast-close').addEventListener('click', () => {
        toast.classList.add('toast-exit');
        setTimeout(() => toast.remove(), 300);
    });

    container.appendChild(toast);

    requestAnimationFrame(() => {
        toast.classList.add('toast-visible');
    });

    setTimeout(() => {
        if (toast.parentElement) {
            toast.classList.add('toast-exit');
            setTimeout(() => toast.remove(), 300);
        }
    }, duration);
}

function toastIcon(type) {
    const icons = {
        success: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>',
        error: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
        warning: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
        info: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
    };
    return icons[type] || icons.info;
}

// ============== UPLOAD HANDLING ==============

function setupUpload() {
    const uploadSection = document.getElementById('uploadSection');
    const fileInput = document.getElementById('fileInput');
    const validationResult = document.getElementById('validationResult');

    if (!uploadSection || !fileInput) return;

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        uploadSection.addEventListener(eventName, preventDefaults, false);
    });

    ['dragenter', 'dragover'].forEach(eventName => {
        uploadSection.addEventListener(eventName, () => uploadSection.classList.add('drag-active'), false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        uploadSection.addEventListener(eventName, () => uploadSection.classList.remove('drag-active'), false);
    });

    uploadSection.addEventListener('drop', handleDrop, false);
    fileInput.addEventListener('change', handleFiles, false);
}

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    if (files.length) uploadFile(files[0]);
}

function handleFiles(e) {
    const files = e.target.files;
    if (files.length) uploadFile(files[0]);
}

async function uploadFile(file) {
    const progressEl = document.getElementById('uploadProgress');
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    const validationResult = document.getElementById('validationResult');

    validationResult.innerHTML = '';
    progressEl.hidden = false;
    progressFill.style.width = '0%';
    progressText.textContent = 'Uploading...';

    const formData = new FormData();
    formData.append('file', file);

    try {
        const xhr = new XMLHttpRequest();
        await new Promise((resolve, reject) => {
            xhr.upload.addEventListener('progress', (e) => {
                if (e.lengthComputable) {
                    const pct = Math.round((e.loaded / e.total) * 100);
                    progressFill.style.width = `${pct}%`;
                }
            });

            xhr.addEventListener('load', () => {
                progressFill.style.width = '100%';
                resolve(xhr);
            });
            xhr.addEventListener('error', () => reject(new Error('Upload failed')));
            xhr.addEventListener('abort', () => reject(new Error('Upload aborted')));

            xhr.open('POST', '/api/upload');
            xhr.send(formData);
        });

        const result = JSON.parse(xhr.responseText);

        if (result.success) {
            progressText.textContent = 'Upload complete';
            showToast(`Upload successful! Loaded ${result.total_wheel_records || 0} records.`, 'success');
            renderValidationResult(result);
            await loadDashboard();
        } else {
            progressText.textContent = 'Upload failed';
            showToast(result.errors?.[0] || 'Upload failed', 'error');
            renderValidationResult(result);
        }
    } catch (error) {
        progressText.textContent = 'Upload failed';
        showToast(error.message || 'Upload failed', 'error');
    } finally {
        setTimeout(() => {
            progressEl.hidden = true;
            progressFill.style.width = '0%';
        }, 1500);
        document.getElementById('fileInput').value = '';
    }
}

function renderValidationResult(result) {
    const el = document.getElementById('validationResult');
    if (!el) return;

    if (!result || (!result.errors?.length && !result.warnings?.length && !result.stats)) {
        el.innerHTML = '';
        return;
    }

    let html = '<div class="validation-box">';

    if (result.errors && result.errors.length) {
        html += `<div class="validation-section validation-errors"><strong>Errors</strong><ul>${result.errors.map(e => `<li>${e}</li>`).join('')}</ul></div>`;
    }

    if (result.warnings && result.warnings.length) {
        html += `<div class="validation-section validation-warnings"><strong>Warnings</strong><ul>${result.warnings.map(w => `<li>${w}</li>`).join('')}</ul></div>`;
    }

    if (result.stats) {
        html += '<div class="validation-section validation-stats"><strong>File Stats</strong><div class="stats-groups">';

        if (result.stats.wheel_replacement) {
            const s = result.stats.wheel_replacement;
            html += '<div class="stats-group"><div class="stats-group-title">Wheel Replacement</div><div class="stats-tags">';
            if (s.total_rows !== undefined) html += `<span class="stat-tag">${s.total_rows} rows</span>`;
            if (s.date_range) html += `<span class="stat-tag">${s.date_range.min} → ${s.date_range.max}</span>`;
            if (s.cranes) html += `<span class="stat-tag">Cranes: ${s.cranes.join(', ')}</span>`;
            html += '</div></div>';
        }

        if (result.stats.rail_hardness) {
            const s = result.stats.rail_hardness;
            html += '<div class="stats-group"><div class="stats-group-title">Rail Hardness</div><div class="stats-tags">';
            if (s.sections !== undefined) html += `<span class="stat-tag">${s.sections} sections</span>`;
            if (s.north_avg !== undefined) html += `<span class="stat-tag">North avg: ${s.north_avg} HB</span>`;
            if (s.south_avg !== undefined) html += `<span class="stat-tag">South avg: ${s.south_avg} HB</span>`;
            html += '</div></div>';
        }

        if (result.stats.rail_replacement) {
            const s = result.stats.rail_replacement;
            html += '<div class="stats-group"><div class="stats-group-title">Rail Replacement</div><div class="stats-tags">';
            if (s.total_rows !== undefined) html += `<span class="stat-tag">${s.total_rows} rows</span>`;
            html += '</div></div>';
        }

        html += '</div></div>';
    }

    html += '</div>';
    el.innerHTML = html;
}

// ============== STATUS & INSIGHTS ==============

async function loadStatus() {
    try {
        const data = await fetchJSON('/api/status');
        const badge = document.getElementById('dataBadge');
        const footerNote = document.getElementById('footerNote');
        badge.classList.remove('real', 'mock');
        if (data.using_real_data) {
            badge.textContent = `Live Excel Data | ${data.total_wheel_records} records`;
            badge.classList.add('real');
            if (footerNote) footerNote.textContent = 'Live production data loaded from Excel';
        } else {
            badge.textContent = `Demo Mock Data | ${data.total_wheel_records} records`;
            badge.classList.add('mock');
            if (footerNote) footerNote.textContent = 'Confidential demo — mock data shown for illustration';
        }
    } catch (e) {
        console.error(e);
    }
}

function getInsightSeverity(value, high, critical) {
    if (value >= critical) return 'critical';
    if (value >= high) return 'warning';
    return 'success';
}

function renderInsights(summary, prediction, risk) {
    const total = summary.total_replacements;
    const westPct = total ? Math.round((summary.west_crane_failures / total) * 100) : 0;
    const eastPct = total ? Math.round((summary.east_crane_failures / total) * 100) : 0;
    const highRiskZones = risk.critical_zones + risk.high_risk_zones;
    const hardnessSeverity = getInsightSeverity(summary.max_hardness, 350, 400);
    const forecastSeverity = getInsightSeverity(prediction.predicted_failures_next_3mo, 10, 20);

    const html = `
        <div class="insight-card ${forecastSeverity}">
            <div class="insight-label">Failure Forecast</div>
            <div class="insight-value">${prediction.predicted_failures_next_3mo} in 3 months</div>
            <div class="insight-desc">Projected additional wheel failures based on trend and hardness risk factor of ${prediction.hardness_risk_factor}.</div>
        </div>
        <div class="insight-card ${hardnessSeverity}">
            <div class="insight-label">Rail Hardness</div>
            <div class="insight-value">${summary.max_hardness} HB max</div>
            <div class="insight-desc">Average hardness is ${prediction.avg_hardness} HB. ${summary.above_threshold_north + summary.above_threshold_south} sections exceed the 300 HB threshold.</div>
        </div>
        <div class="insight-card ${westPct > eastPct ? 'warning' : 'success'}">
            <div class="insight-label">Crane Performance</div>
            <div class="insight-value">LT West ${westPct}%</div>
            <div class="insight-desc">West crane accounts for ${westPct}% of failures versus ${eastPct}% for East, indicating uneven wear patterns.</div>
        </div>
        <div class="insight-card ${highRiskZones > 4 ? 'critical' : 'warning'}">
            <div class="insight-label">Immediate Attention</div>
            <div class="insight-value">${highRiskZones} high-risk zones</div>
            <div class="insight-desc">${risk.critical_zones} critical and ${risk.high_risk_zones} high-risk rail sections need replacement or close monitoring.</div>
        </div>
    `;
    document.getElementById('insightsContainer').innerHTML = html;
}

function renderKPIs(data) {
    const aboveTotal = data.above_threshold_north + data.above_threshold_south;
    const html = `
        <div class="stat-card">
            <div class="stat-label">Total Replacements</div>
            <div class="stat-value">${data.total_replacements}</div>
            <div class="stat-trend trend-neutral">Jan 2024 - Sep 2025</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">West Crane Failures</div>
            <div class="stat-value">${data.west_crane_failures}</div>
            <div class="stat-trend trend-up">Higher failure frequency</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">East Crane Failures</div>
            <div class="stat-value">${data.east_crane_failures}</div>
            <div class="stat-trend trend-down">Lower impact</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">Max Rail Hardness</div>
            <div class="stat-value">${data.max_hardness}</div>
            <div class="stat-trend trend-up">Exceeds 300 HB standard</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">Avg Hardness (North)</div>
            <div class="stat-value">${data.avg_hardness_north}</div>
            <div class="stat-trend trend-up">HB above threshold</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">Sections Over 300 HB</div>
            <div class="stat-value">${aboveTotal}</div>
            <div class="stat-trend trend-up">Critical zones identified</div>
        </div>
    `;
    document.getElementById('statsContainer').innerHTML = html;
}

// ============== CHARTS ==============

function renderTrendChart(data) {
    destroyChart('failureTrendChart');
    const ctx = document.getElementById('failureTrendChart').getContext('2d');
    const labels = data.monthly_trend.map(m => m.Month_str);
    const counts = data.monthly_trend.map(m => m.Count);

    const gradient = ctx.createLinearGradient(0, 0, 0, 320);
    gradient.addColorStop(0, 'rgba(37, 99, 235, 0.35)');
    gradient.addColorStop(1, 'rgba(37, 99, 235, 0.0)');

    charts.failureTrendChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Wheel Replacements',
                data: counts,
                borderColor: COLORS.primary,
                backgroundColor: gradient,
                borderWidth: 3,
                pointRadius: 4,
                pointBackgroundColor: '#ffffff',
                pointBorderColor: COLORS.primary,
                pointBorderWidth: 2,
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#1e293b',
                    padding: 12,
                    cornerRadius: 8
                }
            },
            scales: {
                y: { beginAtZero: true, title: { display: true, text: 'Replacements' } },
                x: { grid: { display: false } }
            }
        }
    });
}

function renderPositionChart(data) {
    destroyChart('positionChart');
    const labels = Object.keys(data.position_failures);
    const values = Object.values(data.position_failures);

    charts.positionChart = new Chart(document.getElementById('positionChart'), {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: values,
                backgroundColor: [COLORS.primary, COLORS.secondary, COLORS.accent, COLORS.info, COLORS.slate],
                borderWidth: 0,
                hoverOffset: 10
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '60%',
            plugins: {
                legend: { position: 'right', labels: { boxWidth: 14 } }
            }
        }
    });
}

function renderHardnessChart(data) {
    destroyChart('hardnessChart');
    const ctx = document.getElementById('hardnessChart').getContext('2d');
    const thresholdArray = data.columns.map(() => 300);

    charts.hardnessChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.columns,
            datasets: [
                {
                    label: 'North Side (HB)',
                    data: data.north_side,
                    backgroundColor: data.north_side.map(v => {
                        if (v > 400) return COLORS.danger;
                        if (v > 350) return COLORS.warning;
                        if (v > 300) return '#fde047';
                        return COLORS.primary;
                    }),
                    borderRadius: 6,
                    order: 2
                },
                {
                    label: 'South Side (HB)',
                    data: data.south_side,
                    backgroundColor: data.south_side.map(v => {
                        if (v > 400) return 'rgba(239, 68, 68, 0.65)';
                        if (v > 350) return 'rgba(245, 158, 11, 0.65)';
                        if (v > 300) return 'rgba(253, 224, 71, 0.65)';
                        return 'rgba(124, 58, 237, 0.65)';
                    }),
                    borderRadius: 6,
                    order: 3
                },
                {
                    type: 'line',
                    label: '300 HB Threshold',
                    data: thresholdArray,
                    borderColor: COLORS.danger,
                    borderWidth: 2,
                    borderDash: [6, 4],
                    pointRadius: 0,
                    fill: false,
                    order: 1,
                    tension: 0
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top' }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    min: 250,
                    title: { display: true, text: 'Hardness (HB)' }
                }
            }
        }
    });
}

function renderGauge(avgHardness) {
    destroyChart('gaugeChart');
    const ctx = document.getElementById('gaugeChart').getContext('2d');
    const max = 500;
    const pct = Math.min(avgHardness / max, 1);

    let color = COLORS.success;
    if (avgHardness > 400) color = COLORS.danger;
    else if (avgHardness > 350) color = COLORS.warning;
    else if (avgHardness > 300) color = '#fde047';

    document.getElementById('gaugeValue').textContent = Math.round(avgHardness);
    document.getElementById('gaugeValue').style.color = color;

    charts.gaugeChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Measured', 'Remaining'],
            datasets: [{
                data: [avgHardness, max - avgHardness],
                backgroundColor: [color, '#e2e8f0'],
                borderWidth: 0,
                circumference: 180,
                rotation: 270,
                cutout: '75%'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false }, tooltip: { enabled: false } }
        }
    });
}

function renderScatterChart(data) {
    destroyChart('scatterChart');
    const points = data.map(p => ({ x: p.avg_hardness, y: p.estimated_failures, section: p.section }));

    charts.scatterChart = new Chart(document.getElementById('scatterChart'), {
        type: 'scatter',
        data: {
            datasets: [{
                label: 'Sections',
                data: points,
                backgroundColor: points.map(p => {
                    if (p.x > 400) return COLORS.danger;
                    if (p.x > 350) return COLORS.warning;
                    if (p.x > 300) return '#fde047';
                    return COLORS.success;
                }),
                pointRadius: 7,
                pointHoverRadius: 10
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (ctx) => {
                            const p = data[ctx.dataIndex];
                            return `${p.section}: ${p.avg_hardness} HB, est. ${p.estimated_failures} failures`;
                        }
                    }
                }
            },
            scales: {
                x: { title: { display: true, text: 'Avg Hardness (HB)' } },
                y: { title: { display: true, text: 'Estimated Failure Risk' }, beginAtZero: true }
            }
        }
    });
}

function renderEquipmentChart(data) {
    destroyChart('equipmentChart');
    const labels = Object.keys(data.equipment_failures).slice(0, 7);
    const values = Object.values(data.equipment_failures).slice(0, 7);

    charts.equipmentChart = new Chart(document.getElementById('equipmentChart'), {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Failures',
                data: values,
                backgroundColor: PALETTE,
                borderRadius: 6
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { x: { beginAtZero: true } }
        }
    });
}

function renderCraneChart(data) {
    destroyChart('craneChart');
    const labels = Object.keys(data.by_crane);
    const values = Object.values(data.by_crane);

    charts.craneChart = new Chart(document.getElementById('craneChart'), {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                data: values,
                backgroundColor: [COLORS.primary, COLORS.secondary, COLORS.accent, COLORS.info],
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom' } }
        }
    });
}

function renderSeverityChart(data) {
    destroyChart('severityChart');
    const labels = Object.keys(data.by_severity);
    const values = Object.values(data.by_severity);

    charts.severityChart = new Chart(document.getElementById('severityChart'), {
        type: 'polarArea',
        data: {
            labels: labels,
            datasets: [{
                data: values,
                backgroundColor: [COLORS.danger, COLORS.warning, '#fde047', COLORS.success],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'right', labels: { boxWidth: 12 } } },
            scales: { r: { ticks: { display: false } } }
        }
    });
}

function renderDowChart(data) {
    destroyChart('dowChart');
    const order = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const labels = order.filter(d => data.by_day_of_week[d] !== undefined);
    const values = labels.map(d => data.by_day_of_week[d]);

    charts.dowChart = new Chart(document.getElementById('dowChart'), {
        type: 'bar',
        data: {
            labels: labels.map(d => d.slice(0, 3)),
            datasets: [{
                label: 'Failures',
                data: values,
                backgroundColor: COLORS.info,
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true } }
        }
    });
}

function renderForecastChart(prediction) {
    destroyChart('forecastChart');
    const labels = prediction.future_predictions.map(p => `Month ${p.month_index}`);
    const linear = prediction.future_predictions.map(p => p.linear);
    const poly = prediction.future_predictions.map(p => p.polynomial);

    charts.forecastChart = new Chart(document.getElementById('forecastChart'), {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Linear Trend',
                    data: linear,
                    borderColor: COLORS.info,
                    backgroundColor: 'rgba(6, 182, 212, 0.1)',
                    borderWidth: 2,
                    borderDash: [6, 4],
                    tension: 0,
                    pointRadius: 4,
                    fill: false
                },
                {
                    label: 'Polynomial + Hardness Risk',
                    data: poly,
                    borderColor: COLORS.danger,
                    backgroundColor: 'rgba(239, 68, 68, 0.12)',
                    borderWidth: 3,
                    tension: 0.4,
                    pointRadius: 5,
                    fill: true
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top' },
                tooltip: { mode: 'index', intersect: false }
            },
            scales: {
                y: { beginAtZero: true, title: { display: true, text: 'Predicted Additional Failures' } }
            }
        }
    });
}

function renderPredictionPanel(prediction) {
    const html = `
        <div class="chart-title">Predictive Analytics & Recommendations</div>
        <div class="prediction-grid">
            <div class="prediction-item">
                <div class="prediction-label">Current Failures (Cumulative)</div>
                <div class="prediction-value">${prediction.current_failures}</div>
            </div>
            <div class="prediction-item">
                <div class="prediction-label">Predicted Next 3 Months</div>
                <div class="prediction-value" style="color:${prediction.predicted_failures_next_3mo > 10 ? '#fca5a5' : '#bbf7d0'}">${prediction.predicted_failures_next_3mo}</div>
            </div>
            <div class="prediction-item">
                <div class="prediction-label">Predicted Next 6 Months</div>
                <div class="prediction-value" style="color:${prediction.predicted_failures_next_6mo > 20 ? '#fca5a5' : '#bbf7d0'}">${prediction.predicted_failures_next_6mo}</div>
            </div>
            <div class="prediction-item">
                <div class="prediction-label">Monthly Failure Rate</div>
                <div class="prediction-value">${prediction.monthly_failure_rate}</div>
            </div>
            <div class="prediction-item">
                <div class="prediction-label">Avg Hardness</div>
                <div class="prediction-value">${prediction.avg_hardness} HB</div>
            </div>
            <div class="prediction-item">
                <div class="prediction-label">Hardness Risk Factor</div>
                <div class="prediction-value">${prediction.hardness_risk_factor}</div>
            </div>
        </div>
        <div class="recommendation-box">
            <strong>Risk Assessment:</strong> Average hardness is ${prediction.avg_hardness} HB (standard threshold: 300 HB).<br>
            <strong>Hardness Risk Factor:</strong> ${prediction.hardness_risk_factor} — higher values indicate accelerated wheel wear.<br>
            <strong>Recommended Action:</strong> ${prediction.recommendation}
        </div>
    `;
    document.getElementById('predictionPanel').innerHTML = html;
}

function renderHardnessTable(hardness) {
    let html = '<table><thead><tr><th>Section</th><th>North Side (HB)</th><th>South Side (HB)</th><th>North Status</th><th>South Status</th></tr></thead><tbody>';
    for (let i = 0; i < hardness.columns.length; i++) {
        const north = hardness.north_side[i];
        const south = hardness.south_side[i];
        const nClass = getHardnessClass(north);
        const sClass = getHardnessClass(south);
        const nRisk = getRiskLabel(north);
        const sRisk = getRiskLabel(south);
        html += `<tr>
            <td><strong>${hardness.columns[i]}</strong></td>
            <td class="${nClass}">${north ?? '-'}</td>
            <td class="${sClass}">${south ?? '-'}</td>
            <td><span class="risk-badge ${nRisk.toLowerCase()}">${nRisk}</span></td>
            <td><span class="risk-badge ${sRisk.toLowerCase()}">${sRisk}</span></td>
        </tr>`;
    }
    html += '</tbody></table>';
    document.getElementById('hardnessTableContainer').innerHTML = html;
}

function getHardnessClass(value) {
    if (value === null || value === undefined) return '';
    if (value > 400) return 'hardness-critical';
    if (value > 350) return 'hardness-high';
    if (value > 300) return 'hardness-medium';
    return 'hardness-normal';
}

function getRiskLabel(value) {
    if (value === null || value === undefined) return 'Unknown';
    if (value > 400) return 'Critical';
    if (value > 350) return 'High';
    if (value > 300) return 'Medium';
    return 'Normal';
}

function renderRiskZones(riskData) {
    const html = `
        <div class="risk-grid">
            ${riskData.risk_zones.slice(0, 16).map(zone => `
                <div class="risk-item risk-${zone.risk.toLowerCase()}">
                    <strong>${zone.section}</strong>
                    <div>Hardness: ${zone.hardness} HB</div>
                    <div>Risk: <span class="risk-badge ${zone.risk.toLowerCase()}">${zone.risk}</span></div>
                    <small>${zone.recommended_action}</small>
                </div>
            `).join('')}
        </div>
        <div style="margin-top: 22px; padding: 18px; background: #f8fafc; border-radius: 12px; border-left: 4px solid #2563eb;">
            <strong>Summary:</strong> ${riskData.critical_zones} Critical | ${riskData.high_risk_zones} High | ${riskData.medium_risk_zones} Medium | ${riskData.normal_zones} Normal<br>
            <strong>Max Hardness:</strong> ${riskData.max_hardness} HB | <strong>Average:</strong> ${riskData.avg_hardness} HB<br>
            <strong>Recommended Action:</strong> ${riskData.recommendation}
        </div>
    `;
    document.getElementById('riskContainer').innerHTML = html;
}

function renderReplacementLog(data) {
    if (!data.records || data.records.length === 0) {
        document.getElementById('replacementContainer').innerHTML = '<p class="loading">No rail replacement records available.</p>';
        return;
    }
    const html = `
        <div class="timeline">
            ${data.records.map(r => `
                <div class="timeline-item">
                    <div class="timeline-date">${r.Date || r.date || 'N/A'}</div>
                    <div class="timeline-content">
                        <div class="timeline-title">${r.Section || r.section || 'Unknown section'} — ${r.Side || r.side || 'N/A'} side</div>
                        <div class="timeline-meta">${r.Qty_Pieces || r.qty_pieces || 0} pieces replaced | Reason: ${r.Reason || r.reason || 'Not specified'}</div>
                    </div>
                </div>
            `).join('')}
        </div>
        <div style="margin-top: 18px; padding: 14px; background: #f8fafc; border-radius: 10px; font-size: 14px;">
            <strong>Total Replacement Events:</strong> ${data.total_events} | <strong>Total Pieces Replaced:</strong> ${data.total_pieces}
        </div>
    `;
    document.getElementById('replacementContainer').innerHTML = html;
}

async function updateForecast(months) {
    try {
        const prediction = await fetchJSON(`/api/predict/${months}`);
        renderPredictionPanel(prediction);
        renderForecastChart(prediction);
        const forecastValue = document.getElementById('forecastValue');
        if (forecastValue) forecastValue.textContent = `${months} month${months === 1 ? '' : 's'}`;
    } catch (error) {
        console.error('Forecast update error:', error);
    }
}

function setupControls() {
    const slider = document.getElementById('forecastSlider');
    const refreshBtn = document.getElementById('refreshBtn');

    if (slider) {
        slider.addEventListener('input', (e) => {
            const months = parseInt(e.target.value, 10);
            const forecastValue = document.getElementById('forecastValue');
            if (forecastValue) forecastValue.textContent = `${months} month${months === 1 ? '' : 's'}`;
        });
        slider.addEventListener('change', (e) => {
            updateForecast(parseInt(e.target.value, 10));
        });
    }

    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            refreshBtn.classList.add('spinning');
            refreshBtn.textContent = 'Refreshing...';
            loadDashboard().then(() => {
                refreshBtn.classList.remove('spinning');
                refreshBtn.innerHTML = `
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/></svg>
                    Refresh Data
                `;
            }).catch(() => {
                refreshBtn.classList.remove('spinning');
                refreshBtn.innerHTML = `
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/></svg>
                    Refresh Data
                `;
            });
        });
    }
}

async function loadDashboard() {
    try {
        await loadStatus();

        const [summary, hardness, analysis, distribution, risk, prediction, scatter, replacement] = await Promise.all([
            fetchJSON('/api/summary'),
            fetchJSON('/api/hardness-data'),
            fetchJSON('/api/wheel-failure-analysis'),
            fetchJSON('/api/failure-distribution'),
            fetchJSON('/api/hardness-correlation'),
            fetchJSON('/api/predict/6'),
            fetchJSON('/api/scatter-hardness-failures'),
            fetchJSON('/api/rail-replacement')
        ]);

        renderInsights(summary, prediction, risk);
        renderKPIs(summary);
        renderPredictionPanel(prediction);
        renderTrendChart(summary);
        renderPositionChart(analysis);
        renderHardnessChart(hardness);
        renderGauge(risk.avg_hardness);
        renderScatterChart(scatter);
        renderEquipmentChart(analysis);
        renderCraneChart(distribution);
        renderSeverityChart(distribution);
        renderDowChart(distribution);
        renderForecastChart(prediction);
        renderHardnessTable(hardness);
        renderRiskZones(risk);
        renderReplacementLog(replacement);

        const slider = document.getElementById('forecastSlider');
        if (slider) {
            const forecastValue = document.getElementById('forecastValue');
            if (forecastValue) forecastValue.textContent = `${slider.value} months`;
        }

    } catch (error) {
        console.error('Dashboard load error:', error);
        showError('statsContainer', 'Error loading dashboard. Ensure the Flask server is running.');
        showToast('Error loading dashboard data', 'error');
    }
}

setupUpload();
setupControls();
loadDashboard();
