// Steam Table Data for Superheated Steam (Temperature in °C, Enthalpy in kJ/kg)
// Pressure levels in kg/cm²G (gauge pressure)
const steamTableData = {
    // 10 kg/cm²G
    10: {
        temperatures: [200, 250, 300, 350, 400, 450, 500, 550, 600],
        enthalpies: [2827.4, 2957.2, 3051.2, 3157.7, 3264.5, 3373.7, 3486.8, 3603.4, 3723.4]
    },
    // 20 kg/cm²G
    20: {
        temperatures: [212, 250, 300, 350, 400, 450, 500, 550, 600],
        enthalpies: [2799.5, 2902.5, 3023.5, 3137.0, 3248.4, 3360.8, 3475.2, 3592.2, 3712.0]
    },
    // 30 kg/cm²G
    30: {
        temperatures: [234, 250, 300, 350, 400, 450, 500, 550, 600],
        enthalpies: [2803.4, 2855.8, 2993.5, 3115.3, 3231.6, 3346.8, 3462.8, 3580.4, 3700.1]
    },
    // 50 kg/cm²G
    50: {
        temperatures: [264, 300, 350, 400, 450, 500, 550, 600],
        enthalpies: [2794.3, 2924.5, 3064.2, 3196.7, 3317.2, 3436.7, 3556.8, 3678.2]
    },
    // 90 kg/cm²G
    90: {
        temperatures: [303, 350, 400, 450, 500, 550, 600],
        enthalpies: [2724.7, 2957.2, 3138.3, 3279.6, 3410.3, 3486.0, 3612.8]
    }
};

// Chart instance
let enthalpyChart = null;
let dataPoints = [];

// Theme management
let isDarkTheme = false;

function toggleTheme() {
    isDarkTheme = !isDarkTheme;
    document.body.classList.toggle('dark-theme', isDarkTheme);
    
    // Update chart colors if chart exists
    if (enthalpyChart) {
        updateChartTheme();
    }
}

function updateChartTheme() {
    const textColor = isDarkTheme ? '#e0e0e0' : '#666';
    const gridColor = isDarkTheme ? '#404040' : '#e0e0e0';
    
    enthalpyChart.options.scales.x.ticks.color = textColor;
    enthalpyChart.options.scales.y.ticks.color = textColor;
    enthalpyChart.options.scales.x.grid.color = gridColor;
    enthalpyChart.options.scales.y.grid.color = gridColor;
    enthalpyChart.options.plugins.legend.labels.color = textColor;
    
    enthalpyChart.update();
}

// Linear interpolation function
function linearInterpolate(x, x1, x2, y1, y2) {
    if (x1 === x2) return y1;
    return y1 + ((x - x1) / (x2 - x1)) * (y2 - y1);
}

// Find closest pressure level in steam table
function findClosestPressure(targetPressure) {
    const availablePressures = Object.keys(steamTableData).map(Number);
    let closest = availablePressures[0];
    let minDiff = Math.abs(targetPressure - closest);
    
    for (let pressure of availablePressures) {
        const diff = Math.abs(targetPressure - pressure);
        if (diff < minDiff) {
            minDiff = diff;
            closest = pressure;
        }
    }
    
    return closest;
}

// Calculate enthalpy using linear interpolation
function calculateEnthalpy(temperature, pressure) {
    // Find the closest pressure level
    const closestPressure = findClosestPressure(pressure);
    const data = steamTableData[closestPressure];
    
    const temps = data.temperatures;
    const enthalpies = data.enthalpies;
    
    // Check if temperature is within range
    if (temperature < temps[0] || temperature > temps[temps.length - 1]) {
        throw new Error(`Temperature ${temperature}°C is outside the range for ${closestPressure} kg/cm²G (${temps[0]}°C - ${temps[temps.length - 1]}°C)`);
    }
    
    // Find the two temperatures that bracket our target
    let i = 0;
    while (i < temps.length - 1 && temps[i + 1] <= temperature) {
        i++;
    }
    
    // If exact match found
    if (temps[i] === temperature) {
        return {
            enthalpy: enthalpies[i],
            pressureUsed: closestPressure,
            method: 'exact'
        };
    }
    
    // Linear interpolation between two points
    const T1 = temps[i];
    const T2 = temps[i + 1];
    const h1 = enthalpies[i];
    const h2 = enthalpies[i + 1];
    
    // Apply the formula: h = h1 + ((T - T1) / (T2 - T1)) * (h2 - h1)
    const enthalpy = linearInterpolate(temperature, T1, T2, h1, h2);
    
    return {
        enthalpy: enthalpy,
        pressureUsed: closestPressure,
        method: 'interpolated',
        interpolationData: { T1, T2, h1, h2 }
    };
}

// Form validation
function validateInputs(temp, press) {
    const errors = [];
    
    if (isNaN(temp) || temp < 0) {
        errors.push('Temperature must be a positive number');
        document.getElementById('tempError').style.display = 'block';
    } else {
        document.getElementById('tempError').style.display = 'none';
    }
    
    if (isNaN(press) || press < 0) {
        errors.push('Pressure must be a positive number');
        document.getElementById('pressError').style.display = 'block';
    } else {
        document.getElementById('pressError').style.display = 'none';
    }
    
    return errors;
}

// Show notification
function showNotification(message, type = 'success') {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.className = `notification ${type} show`;
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

// Update statistics
function updateStats() {
    const dataPointsElement = document.getElementById('dataPoints');
    const avgEnthalpyElement = document.getElementById('avgEnthalpy');
    
    dataPointsElement.textContent = dataPoints.length;
    
    if (dataPoints.length > 0) {
        const avgEnthalpy = dataPoints.reduce((sum, point) => sum + point.enthalpy, 0) / dataPoints.length;
        avgEnthalpyElement.textContent = avgEnthalpy.toFixed(2);
    } else {
        avgEnthalpyElement.textContent = '-';
    }
}

// Initialize or update chart
function initializeChart() {
    const ctx = document.getElementById('enthalpyChart').getContext('2d');
    const noDataMessage = document.getElementById('noDataMessage');
    const canvas = document.getElementById('enthalpyChart');
    
    if (dataPoints.length === 0) {
        noDataMessage.style.display = 'flex';
        canvas.style.display = 'none';
        return;
    }
    
    noDataMessage.style.display = 'none';
    canvas.style.display = 'block';
    
    const chartData = {
        labels: dataPoints.map((point, index) => `Point ${index + 1}`),
        datasets: [{
            label: 'Enthalpy (kJ/kg)',
            data: dataPoints.map(point => point.enthalpy),
            backgroundColor: 'rgba(52, 152, 219, 0.2)',
            borderColor: 'rgba(52, 152, 219, 1)',
            borderWidth: 2,
            fill: true,
            tension: 0.4
        }]
    };
    
    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                labels: {
                    color: isDarkTheme ? '#e0e0e0' : '#666'
                }
            },
            tooltip: {
                callbacks: {
                    afterBody: function(context) {
                        const index = context[0].dataIndex;
                        const point = dataPoints[index];
                        return [
                            `Temperature: ${point.temperature}°C`,
                            `Pressure: ${point.pressure} kg/cm²G`,
                            `Pressure Used: ${point.pressureUsed} kg/cm²G`
                        ];
                    }
                }
            }
        },
        scales: {
            x: {
                ticks: {
                    color: isDarkTheme ? '#e0e0e0' : '#666'
                },
                grid: {
                    color: isDarkTheme ? '#404040' : '#e0e0e0'
                }
            },
            y: {
                ticks: {
                    color: isDarkTheme ? '#e0e0e0' : '#666'
                },
                grid: {
                    color: isDarkTheme ? '#404040' : '#e0e0e0'
                },
                title: {
                    display: true,
                    text: 'Enthalpy (kJ/kg)',
                    color: isDarkTheme ? '#e0e0e0' : '#666'
                }
            }
        }
    };
    
    if (enthalpyChart) {
        enthalpyChart.destroy();
    }
    
    enthalpyChart = new Chart(ctx, {
        type: 'line',
        data: chartData,
        options: chartOptions
    });
}

// Reset form
function resetForm() {
    document.getElementById('enthalpyForm').reset();
    document.getElementById('currentEnthalpy').textContent = '-';
    document.getElementById('tempError').style.display = 'none';
    document.getElementById('pressError').style.display = 'none';
    
    dataPoints = [];
    updateStats();
    initializeChart();
    
    showNotification('Form reset successfully', 'info');
}

// Form submission handler
document.getElementById('enthalpyForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const temperature = parseFloat(document.getElementById('temperature').value);
    const pressure = parseFloat(document.getElementById('pressure').value);
    
    // Validate inputs
    const errors = validateInputs(temperature, pressure);
    if (errors.length > 0) {
        showNotification(errors.join('. '), 'error');
        return;
    }
    
    try {
        // Calculate enthalpy
        const result = calculateEnthalpy(temperature, pressure);
        
        // Update current enthalpy display
        document.getElementById('currentEnthalpy').textContent = result.enthalpy.toFixed(2);
        
        // Add to data points
        dataPoints.push({
            temperature: temperature,
            pressure: pressure,
            pressureUsed: result.pressureUsed,
            enthalpy: result.enthalpy,
            method: result.method
        });
        
        // Update stats and chart
        updateStats();
        initializeChart();
        
        // Show success notification
        let message = `Enthalpy calculated: ${result.enthalpy.toFixed(2)} kJ/kg`;
        if (result.pressureUsed !== pressure) {
            message += ` (using closest pressure: ${result.pressureUsed} kg/cm²G)`;
        }
        showNotification(message, 'success');
        
    } catch (error) {
        showNotification(error.message, 'error');
        console.error('Calculation error:', error);
    }
});

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    initializeChart();
    updateStats();
});
