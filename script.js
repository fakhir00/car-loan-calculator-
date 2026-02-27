let loanChartInstance = null;
let amortizationChartInstance = null;
let currentMode = 'standard';

// Initialize formatting function
const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2
    }).format(amount);
};

// Auto format numbers as they are typed
const inputs = document.querySelectorAll('input[type="number"]');
inputs.forEach(input => {
    input.addEventListener('focus', function () {
        if (this.value === '0') this.value = '';
    });
});

// Calculate the loan details based on the active mode
function triggerCalculation() {
    if (currentMode === 'standard') {
        calculateLoan();
    } else {
        calculateAffordability();
    }
}

// Update the displays for the range sliders
function updateTermDisplay() {
    const term = document.getElementById('loan-term').value;
    document.getElementById('term-display').textContent = `${term} months`;
}

function updateAffordTermDisplay() {
    const term = document.getElementById('afford-term').value;
    document.getElementById('afford-term-display').textContent = `${term} months`;
}

// Mode Switching (Standard vs Affordability)
function switchMode(mode) {
    currentMode = mode;

    // Update Tabs
    document.getElementById('tab-standard').classList.toggle('active', mode === 'standard');
    document.getElementById('tab-affordability').classList.toggle('active', mode === 'affordability');

    // Toggle input visibility
    document.getElementById('standard-inputs').classList.toggle('hidden', mode !== 'standard');
    document.getElementById('affordability-inputs').classList.toggle('hidden', mode !== 'affordability');

    // Update Results Header
    document.getElementById('result-title').textContent = mode === 'standard' ? "Your Base Prediction" : "Your Max Affordability";
    document.getElementById('main-result-label').textContent = mode === 'standard' ? "Estimated Monthly Payment" : "Max Vehicle Price";

    // Reconfigure cards based on mode
    if (mode === 'affordability') {
        document.getElementById('card-1-label').textContent = "Max Loan Amount";
        document.getElementById('biweekly-note').classList.add('hidden');
        document.getElementById('tco-note').classList.add('hidden');
        document.getElementById('early-payoff-results').classList.add('hidden');
    } else {
        document.getElementById('card-1-label').textContent = "Total Principal";
    }

    triggerCalculation();
}

// Standard Core Calculation
function calculateLoan() {
    const priceInput = document.getElementById('car-price').value;
    const downPaymentInput = document.getElementById('down-payment').value;
    const termValue = parseInt(document.getElementById('loan-term').value);
    const rateInput = document.getElementById('interest-rate').value;
    const isBiWeekly = document.getElementById('bi-weekly').checked;
    const extraPaymentInput = document.getElementById('early-payoff').value;

    const tcoInsurance = parseFloat(document.getElementById('tco-insurance').value) || 0;
    const tcoFuel = parseFloat(document.getElementById('tco-fuel').value) || 0;
    const tcoMaint = parseFloat(document.getElementById('tco-maint').value) || 0;

    const price = parseFloat(priceInput) || 0;
    const downPayment = parseFloat(downPaymentInput) || 0;
    let annualRate = parseFloat(rateInput) || 0;
    const extraPayment = parseFloat(extraPaymentInput) || 0;

    const originalPrincipal = Math.max(0, price - downPayment);
    const monthlyRate = (annualRate / 100) / 12;
    const numberOfPayments = termValue;

    let baseMonthlyPayment = 0;

    // Calculate standard base monthly payment
    if (monthlyRate === 0) {
        baseMonthlyPayment = originalPrincipal / numberOfPayments;
    } else if (originalPrincipal > 0 && numberOfPayments > 0) {
        const x = Math.pow(1 + monthlyRate, numberOfPayments);
        baseMonthlyPayment = (originalPrincipal * x * monthlyRate) / (x - 1);
    }

    let actualMonthlyPayment = baseMonthlyPayment + extraPayment;
    let totalInterest = 0;
    let totalCost = 0;
    let monthsToPayoff = 0;

    // Arrays for Amortization Chart
    let labelsAmortization = [];
    let dataBalance = [];

    // Simulate Amortization for Early Payoff and Charting
    if (originalPrincipal > 0 && actualMonthlyPayment > 0 && baseMonthlyPayment > 0) {
        let balance = originalPrincipal;
        while (balance > 0 && monthsToPayoff < 1200) { // arbitrary cap to prevent infinite loop
            const interestForMonth = balance * monthlyRate;
            totalInterest += interestForMonth;
            const principalForMonth = actualMonthlyPayment - interestForMonth;

            // if payment is higher than what's needed to clear balance
            if (balance - principalForMonth <= 0) {
                balance = 0;
            } else {
                balance -= principalForMonth;
            }
            monthsToPayoff++;

            // Push values for charting every 6 months to keep it clean, or the final month
            if (monthsToPayoff % 6 === 0 || balance === 0) {
                labelsAmortization.push(`Month ${monthsToPayoff}`);
                dataBalance.push(balance);
            }
        }
    } else {
        monthsToPayoff = numberOfPayments;
        // Default flat line if no real inputs
        labelsAmortization = ['Month 0', `Month ${numberOfPayments}`];
        dataBalance = [originalPrincipal, 0];
    }

    // Bi-Weekly Adjustments (Simplified: assume half payment made every 2 weeks = 26 payments/year)
    // Here we just display the bi-weekly amount to the user
    let biWeeklyDisplay = baseMonthlyPayment / 2;

    // Total Cost Calculations
    let standardTotalInterest = (baseMonthlyPayment * numberOfPayments) - originalPrincipal;
    if (standardTotalInterest < 0 || isNaN(standardTotalInterest)) standardTotalInterest = 0;

    let interestSaved = Math.max(0, standardTotalInterest - totalInterest);
    let monthsSaved = Math.max(0, numberOfPayments - monthsToPayoff);
    totalCost = originalPrincipal + totalInterest;

    // Handle NaN or infinity
    if (!isFinite(baseMonthlyPayment) || isNaN(baseMonthlyPayment)) {
        baseMonthlyPayment = 0; totalInterest = 0; totalCost = 0; monthsToPayoff = 0; interestSaved = 0; monthsSaved = 0;
    }

    // --- Update Standard DOM Elements ---
    document.getElementById('main-result-value').textContent = formatCurrency(baseMonthlyPayment);
    document.getElementById('card-1-val').textContent = formatCurrency(originalPrincipal);
    document.getElementById('card-2-val').textContent = formatCurrency(totalInterest);
    document.getElementById('card-3-val').textContent = formatCurrency(totalCost);

    // Bi-Weekly Note
    if (isBiWeekly && baseMonthlyPayment > 0) {
        document.getElementById('biweekly-amount').textContent = formatCurrency(biWeeklyDisplay);
        document.getElementById('biweekly-note').classList.remove('hidden');
    } else {
        document.getElementById('biweekly-note').classList.add('hidden');
    }

    // TCO Note
    let totalMonthlyTCO = baseMonthlyPayment + tcoInsurance + tcoFuel + tcoMaint;
    if ((tcoInsurance || tcoFuel || tcoMaint) && baseMonthlyPayment > 0) {
        document.getElementById('tco-amount').textContent = formatCurrency(totalMonthlyTCO);
        document.getElementById('tco-note').classList.remove('hidden');
    } else {
        document.getElementById('tco-note').classList.add('hidden');
    }

    // Early Payoff Banner
    if (extraPayment > 0 && baseMonthlyPayment > 0) {
        document.getElementById('extra-pmt-display').textContent = formatCurrency(extraPayment);
        document.getElementById('interest-saved-display').textContent = formatCurrency(interestSaved);
        document.getElementById('months-saved-display').textContent = monthsSaved;
        document.getElementById('early-payoff-results').classList.remove('hidden');
    } else {
        document.getElementById('early-payoff-results').classList.add('hidden');
    }

    // Update the Charts
    updateChart(originalPrincipal, totalInterest);

    // Check if Amortization chart canvas exists in current view
    const amortCtx = document.getElementById('amortizationChart');
    if (amortCtx) {
        updateAmortizationChart(labelsAmortization, dataBalance);
    }
}

// Affordability Reverse Calculation
function calculateAffordability() {
    const budgetInput = document.getElementById('target-budget').value;
    const downPaymentInput = document.getElementById('afford-down-payment').value;
    const termValue = parseInt(document.getElementById('afford-term').value);
    const rateInput = document.getElementById('afford-rate').value;

    const budget = parseFloat(budgetInput) || 0;
    const downPayment = parseFloat(downPaymentInput) || 0;
    const annualRate = parseFloat(rateInput) || 0;

    const monthlyRate = (annualRate / 100) / 12;
    const numberOfPayments = termValue;

    let maxLoanAmount = 0;

    // Reverse Math: PV = PMT * ((1 - (1 + r)^-n) / r)
    if (monthlyRate === 0) {
        maxLoanAmount = budget * numberOfPayments;
    } else if (budget > 0 && numberOfPayments > 0) {
        const x = Math.pow(1 + monthlyRate, -numberOfPayments);
        maxLoanAmount = budget * ((1 - x) / monthlyRate);
    }

    const maxVehiclePrice = maxLoanAmount + downPayment;
    const totalInterest = (budget * numberOfPayments) - maxLoanAmount;
    const totalCost = maxVehiclePrice + totalInterest;

    // --- Update Affordability DOM Elements ---
    document.getElementById('main-result-value').textContent = formatCurrency(maxVehiclePrice);
    document.getElementById('card-1-val').textContent = formatCurrency(maxLoanAmount);
    document.getElementById('card-2-val').textContent = formatCurrency(totalInterest > 0 ? totalInterest : 0);
    document.getElementById('card-3-val').textContent = formatCurrency(totalCost > 0 ? totalCost : 0);

    // Update the Chart
    updateChart(maxLoanAmount, totalInterest > 0 ? totalInterest : 0);
}

// Update or initialize the Chart.js pie chart
function updateChart(principal, totalInterest) {
    const ctx = document.getElementById('loanChart').getContext('2d');

    // Check Theme for Legend Colors
    const isDark = document.body.getAttribute('data-theme') === 'dark';
    const legendColor = isDark ? '#f8fafc' : '#0f172a';
    const tooltipBg = isDark ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)';
    const tooltipText = isDark ? '#f8fafc' : '#0f172a';
    const tooltipBody = isDark ? '#94a3b8' : '#475569';

    // Gradient for Principal - Trusting Blue
    const gradientPrincipal = ctx.createLinearGradient(0, 0, 0, 400);
    gradientPrincipal.addColorStop(0, '#2563eb');
    gradientPrincipal.addColorStop(1, '#60a5fa');

    // Gradient for Interest - Energetic Coral/Pink
    const gradientInterest = ctx.createLinearGradient(0, 0, 0, 400);
    gradientInterest.addColorStop(0, '#ec4899');
    gradientInterest.addColorStop(1, '#f472b6');

    const data = {
        labels: currentMode === 'standard' ? ['Total Principal', 'Total Interest'] : ['Max Loan Amount', 'Total Interest'],
        datasets: [{
            data: [principal, totalInterest],
            backgroundColor: [gradientPrincipal, gradientInterest],
            borderWidth: 0,
            hoverOffset: 10
        }]
    };

    const config = {
        type: 'doughnut',
        data: data,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '75%',
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        color: legendColor,
                        font: {
                            family: "'Outfit', sans-serif",
                            size: 13,
                            weight: '500'
                        },
                        padding: 20,
                        usePointStyle: true,
                        pointStyle: 'circle'
                    }
                },
                tooltip: {
                    backgroundColor: tooltipBg,
                    titleColor: tooltipText,
                    bodyColor: tooltipBody,
                    borderColor: 'rgba(0,0,0,0.1)',
                    borderWidth: 1,
                    titleFont: { family: "'Outfit', sans-serif", size: 13, weight: 'bold' },
                    bodyFont: { family: "'Outfit', sans-serif", size: 14, weight: '500' },
                    padding: 12,
                    cornerRadius: 8,
                    displayColors: true,
                    callbacks: {
                        label: function (context) {
                            return context.label + ': ' + formatCurrency(context.raw);
                        }
                    }
                }
            }
        }
    };

    // Prevent legend overlapping on very small screens
    if (window.innerWidth < 400) {
        config.options.plugins.legend.display = false;
    }

    if (loanChartInstance) {
        loanChartInstance.data = data;
        loanChartInstance.options.plugins.tooltip = config.options.plugins.tooltip;
        loanChartInstance.options.plugins.legend = config.options.plugins.legend;
        loanChartInstance.update();
    } else {
        loanChartInstance = new Chart(ctx, config);
    }
}

// Update or initialize the Amortization Line Chart
function updateAmortizationChart(labels, balances) {
    const ctx = document.getElementById('amortizationChart').getContext('2d');

    // Check Theme for Legend Colors
    const isDark = document.body.getAttribute('data-theme') === 'dark';
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)';
    const textColor = isDark ? '#94a3b8' : '#475569';
    const tooltipBg = isDark ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)';
    const tooltipText = isDark ? '#f8fafc' : '#0f172a';

    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, 'rgba(37, 99, 235, 0.5)'); // Blue mostly opaque
    gradient.addColorStop(1, 'rgba(37, 99, 235, 0.0)'); // Blue transparent

    const data = {
        labels: labels,
        datasets: [{
            label: 'Remaining Balance',
            data: balances,
            borderColor: '#2563eb',
            backgroundColor: gradient,
            borderWidth: 3,
            fill: true,
            pointBackgroundColor: '#ec4899',
            pointBorderColor: '#ffffff',
            pointBorderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 6,
            tension: 0.4
        }]
    };

    const config = {
        type: 'line',
        data: data,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: tooltipBg,
                    titleColor: tooltipText,
                    bodyColor: textColor,
                    borderColor: 'rgba(0,0,0,0.1)',
                    borderWidth: 1,
                    titleFont: { family: "'Outfit', sans-serif", size: 13, weight: 'bold' },
                    bodyFont: { family: "'Outfit', sans-serif", size: 14, weight: '500' },
                    padding: 12,
                    cornerRadius: 8,
                    callbacks: {
                        label: function (context) {
                            return 'Balance: ' + formatCurrency(context.raw);
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false, drawBorder: false },
                    ticks: { color: textColor, font: { family: "'Outfit', sans-serif" } }
                },
                y: {
                    grid: { color: gridColor, drawBorder: false },
                    ticks: {
                        color: textColor,
                        font: { family: "'Outfit', sans-serif" },
                        callback: function (value) {
                            return '$' + (value / 1000) + 'k'; // simplify y axis labels
                        }
                    }
                }
            }
        }
    };

    if (amortizationChartInstance) {
        amortizationChartInstance.data = data;
        amortizationChartInstance.options.scales.x.ticks.color = textColor;
        amortizationChartInstance.options.scales.y.ticks.color = textColor;
        amortizationChartInstance.options.scales.y.grid.color = gridColor;
        amortizationChartInstance.options.plugins.tooltip = config.options.plugins.tooltip;
        amortizationChartInstance.update();
    } else {
        amortizationChartInstance = new Chart(ctx, config);
    }
}

// --- Accessibility & UI Controls ---

function toggleTheme() {
    const body = document.body;
    const currentTheme = body.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

    body.setAttribute('data-theme', newTheme);
    localStorage.setItem('drivePredictTheme', newTheme);

    // Update icon
    const icon = document.getElementById('theme-icon');
    icon.className = newTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';

    // Update chart colors
    triggerCalculation();
}

function scaleText(factor) {
    document.documentElement.style.setProperty('--scale-factor', factor);
    localStorage.setItem('drivePredictScale', factor);

    // Trigger small reflow/recalculate to fix any chart resize issues
    setTimeout(() => { triggerCalculation(); }, 50);
}

// --- Export Controls ---

function copySummary() {
    const val = document.getElementById('main-result-value').textContent;
    const p1 = document.getElementById('card-1-val').textContent;
    const i = document.getElementById('card-2-val').textContent;

    let text = `DrivePredict Car Loan Summary:\n`;
    if (currentMode === 'standard') {
        text += `Estimated Monthly Payment: ${val}\nTotal Principal: ${p1}\nTotal Interest: ${i}`;
    } else {
        text += `Max Vehicle Affordability: ${val}\nMax Loan Amount: ${p1}\nEstimated Interest: ${i}`;
    }

    navigator.clipboard.writeText(text).then(() => {
        alert("Summary copied to clipboard!");
    });
}

function shareLink() {
    alert("In a production environment, this would generate a unique encoded URL to share your specific loan parameters!");
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    // Load Accessibility Preferences
    const savedTheme = localStorage.getItem('drivePredictTheme') || 'light';
    document.body.setAttribute('data-theme', savedTheme);
    document.getElementById('theme-icon').className = savedTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';

    const savedScale = localStorage.getItem('drivePredictScale') || 1;
    document.documentElement.style.setProperty('--scale-factor', savedScale);

    // Initial calculations
    updateTermDisplay();
    updateAffordTermDisplay();
    triggerCalculation();
});
