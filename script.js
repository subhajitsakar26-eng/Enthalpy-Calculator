// Constants
const maxDataPoints = 50;

// Data storage
let enthalpyData = [];
let temperatureDataPoints = [];
let pressureDataPoints = [];
let timeLabels = [];
let chart = null;

// DOM elements
const form = document.getElementById('enthalpyForm');
const tempInput = document.getElementById('temperature');
const pressInput = document.getElementById('pressure');
const chartCanvas = document.getElementById('enthalpyChart');
const noDataMessage = document.getElementById('noDataMessage');
const currentEnthalpyEl = document.getElementById('currentEnthalpy');
const dataPointsEl = document.getElementById('dataPoints');
const avgEnthalpyEl = document.getElementById('avgEnthalpy');
const notification = document.getElementById('notification');
const tempError = document.getElementById('tempError');
const pressError = document.getElementById('pressError');

// Temperature-dependent cp for better accuracy
function cpDryAir(T) {
    const a = 1003.5;
    const b = 0.1;
    const c = -0.00002;
    return a + b * T + c * T * T;
}

function calculateEnthalpy(T) {
    return cpDryAir(T) * T;
}

// Chart initialization
function initChart() {
    const ctx = chartCanvas.getContext('2d');
    chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: timeLabels,
            datasets: [{
                label: 'Enthalpy (J/kg)',
                data: enthalpyData,
                borderColor: '#007bff',
                backgroundColor: 'rgba(0, 123, 255, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.3,
                pointRadius: 5
            }]
        },
        options: {
            responsive: true,
            scales: {
                x: {
                    title: { display: true, text: 'Time' },
                    ticks: {
                        maxTicksLimit: 10
                    }
                },
                y: {
                    title: { display: true, text: 'Enthalpy (J/kg)' },
                    ticks: {
                        callback: val => (val / 1000).toFixed(0) + 'k'
                    }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        title: ctx => 'Time: ' + ctx[0].label,
                        label: ctx => {
                            const i = ctx.dataIndex;
                            return [
                                `Enthalpy: ${(ctx.parsed.y / 1000).toFixed(2)} kJ/kg`,
                                `Temp: ${temperatureDataPoints[i]} K`,
                                `Press: ${pressureDataPoints[i].toLocaleString()} Pa`
                            ];
                        }
                    }
                }
            }
        }
    });
}

// Chart update
function updateChart(temp, pressure) {
    const enthalpy = calculateEnthalpy(temp);
    const timestamp = new Date().toLocaleTimeString();

    enthalpyData.push(enthalpy);
    temperatureDataPoints.push(temp);
    pressureDataPoints.push(pressure);
    timeLabels.push(timestamp);

    // Trim data
    if (enthalpyData.length > maxDataPoints) {
        enthalpyData.shift();
        temperatureDataPoints.shift();
        pressureDataPoints.shift();
        timeLabels.shift();
    }

    // Show chart
    chartCanvas.style.display = 'block';
    noDataMessage.style.display = 'none';

    if (!chart) {
        initChart();
    } else {
        chart.data.labels = [...timeLabels];
        chart.data.datasets[0].data = [...enthalpyData];
        chart.update();
    }

    updateStats();
}

// Update statistics panel
function updateStats() {
    const latest = enthalpyData[enthalpyData.length - 1];
    const avg = enthalpyData.reduce((a, b) => a + b, 0) / enthalpyData.length;

    currentEnthalpyEl.textContent = (latest / 1000).toFixed(2);
    avgEnthalpyEl.textContent = (avg / 1000).toFixed(2);
    dataPointsEl.textContent = enthalpyData.length;
}

// Input validation
function validateInput(value) {
    return !(isNaN(value) || value <= 0);
}

// Notification
function showNotification(message, type = 'success') {
    notification.textContent = message;
    notification.className = `notification ${type}`;
    notification.classList.add('show');

    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

// Form submission handler
form.addEventListener('submit', function (e) {
    e.preventDefault();

    const temp = parseFloat(tempInput.value);
    const press = parseFloat(pressInput.value);

    let isValid = true;

    if (!validateInput(temp)) {
        tempError.style.display = 'block';
        isValid = false;
    } else {
        tempError.style.display = 'none';
    }

    if (!validateInput(press)) {
        pressError.style.display = 'block';
        isValid = false;
    } else {
        pressError.style.display = 'none';
    }

    if (isValid) {
        updateChart(temp, press);
        const enth = calculateEnthalpy(temp);
        showNotification(`Enthalpy: ${(enth / 1000).toFixed(2)} kJ/kg`);
    } else {
        showNotification('Fix input errors', 'error');
    }
});

// Reset function
function resetForm() {
    form.reset();
    tempError.style.display = 'none';
    pressError.style.display = 'none';

    enthalpyData = [];
    temperatureDataPoints = [];
    pressureDataPoints = [];
    timeLabels = [];

    if (chart) {
        chart.destroy();
        chart = null;
    }

    chartCanvas.style.display = 'none';
    noDataMessage.style.display = 'flex';

    currentEnthalpyEl.textContent = '-';
    avgEnthalpyEl.textContent = '-';
    dataPointsEl.textContent = '0';

    showNotification('Form and data reset');
}

// Theme toggle
function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);

    // Optional: update chart styling if needed
}
