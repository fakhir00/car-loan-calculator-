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
        document.getElementById('inputs-wrapper').classList.remove('compare-mode');
        document.getElementById('scenario-b-inputs').classList.add('hidden');
        document.getElementById('scenario-a-badge').classList.add('hidden');
    } else if (mode === 'compare') {
        document.getElementById('inputs-wrapper').classList.add('compare-mode');
        document.getElementById('scenario-b-inputs').classList.remove('hidden');
        document.getElementById('scenario-a-badge').classList.remove('hidden');
        document.getElementById('card-1-label').textContent = "Total Principal";
        document.getElementById('result-title').textContent = "Scenario A vs Scenario B";
    } else {
        document.getElementById('card-1-label').textContent = "Total Principal";
        document.getElementById('inputs-wrapper').classList.remove('compare-mode');
        document.getElementById('scenario-b-inputs').classList.add('hidden');
        document.getElementById('scenario-a-badge').classList.add('hidden');
    }

    triggerCalculation();
}

function updateTermBDisplay() {
    const term = document.getElementById('loan-term-b').value;
    document.getElementById('term-display-b').textContent = `${term} months`;
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

    // New Fee Inputs
    const salesTaxRate = parseFloat(document.getElementById('sales-tax').value) || 0;
    const titleFees = parseFloat(document.getElementById('title-fees').value) || 0;
    const dealerFees = parseFloat(document.getElementById('dealer-fees').value) || 0;

    const price = parseFloat(priceInput) || 0;
    const downPayment = parseFloat(downPaymentInput) || 0;
    let annualRate = parseFloat(rateInput) || 0;
    const extraPayment = parseFloat(extraPaymentInput) || 0;

    // Calculate True Out-The-Door (OTD) Principal
    const taxAmount = price * (salesTaxRate / 100);
    const totalFees = titleFees + dealerFees;
    const originalPrincipal = Math.max(0, (price + taxAmount + totalFees) - downPayment);

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
    let resultValue = formatCurrency(baseMonthlyPayment);
    if (currentMode === 'compare') {
        const pmB = simulateLoan(
            parseFloat(document.getElementById('car-price-b').value) || 0,
            parseFloat(document.getElementById('down-payment-b').value) || 0,
            parseFloat(document.getElementById('interest-rate-b').value) || 0,
            parseInt(document.getElementById('loan-term-b').value)
        );
        resultValue = `${formatCurrency(baseMonthlyPayment)} vs ${formatCurrency(pmB.pmt)}`;

        document.getElementById('card-1-val').textContent = `${formatCurrency(originalPrincipal)} vs ${formatCurrency(pmB.principal)}`;
        document.getElementById('card-2-val').textContent = `${formatCurrency(totalInterest)} vs ${formatCurrency(pmB.interest)}`;
        document.getElementById('card-3-val').textContent = `${formatCurrency(totalCost)} vs ${formatCurrency(pmB.cost)}`;

        updateChart(originalPrincipal, totalInterest, pmB.principal, pmB.interest);
        if (document.getElementById('amortizationChart')) {
            updateAmortizationChartCompare(labelsAmortization, dataBalance, pmB.labels, pmB.balances);
        }
    } else {
        document.getElementById('card-1-val').textContent = formatCurrency(originalPrincipal);
        document.getElementById('card-2-val').textContent = formatCurrency(totalInterest);
        document.getElementById('card-3-val').textContent = formatCurrency(totalCost);

        // Update the Charts
        updateChart(originalPrincipal, totalInterest);
        if (document.getElementById('amortizationChart')) {
            updateAmortizationChart(labelsAmortization, dataBalance);
        }
    }
    document.getElementById('main-result-value').textContent = resultValue;

    // Bi-Weekly Note (Scenario A Only for simplicity)
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

    // Hide Deal Rating
    updateDealRating(0, 0, 0);

    // --- Update Affordability DOM Elements ---
    document.getElementById('main-result-value').textContent = formatCurrency(maxVehiclePrice);
    document.getElementById('card-1-val').textContent = formatCurrency(maxLoanAmount);
    document.getElementById('card-2-val').textContent = formatCurrency(totalInterest > 0 ? totalInterest : 0);
    document.getElementById('card-3-val').textContent = formatCurrency(totalCost > 0 ? totalCost : 0);

    // Update the Chart
    updateChart(maxLoanAmount, totalInterest > 0 ? totalInterest : 0);
}

// Background simulation for Scenario B
function simulateLoan(price, downPayment, annualRate, termValue) {
    // Grab Scenario B fees
    const salesTaxRateB = parseFloat(document.getElementById('sales-tax-b').value) || 0;
    const titleFeesB = parseFloat(document.getElementById('title-fees-b').value) || 0;
    const dealerFeesB = parseFloat(document.getElementById('dealer-fees-b').value) || 0;

    const taxAmountB = price * (salesTaxRateB / 100);
    const totalFeesB = titleFeesB + dealerFeesB;
    const originalPrincipal = Math.max(0, (price + taxAmountB + totalFeesB) - downPayment);

    const monthlyRate = (annualRate / 100) / 12;
    const numberOfPayments = termValue;

    let pmt = 0;
    if (monthlyRate === 0) {
        pmt = originalPrincipal / numberOfPayments;
    } else if (originalPrincipal > 0 && numberOfPayments > 0) {
        const x = Math.pow(1 + monthlyRate, numberOfPayments);
        pmt = (originalPrincipal * x * monthlyRate) / (x - 1);
    }

    if (!isFinite(pmt) || isNaN(pmt)) pmt = 0;

    let totalCost = pmt * numberOfPayments;
    let totalInterest = totalCost - originalPrincipal;

    let labels = [];
    let balances = [];

    if (originalPrincipal > 0 && pmt > 0) {
        let balance = originalPrincipal;
        for (let i = 1; i <= numberOfPayments; i++) {
            const interestForMonth = balance * monthlyRate;
            const principalForMonth = pmt - interestForMonth;
            balance -= principalForMonth;
            if (balance < 0) balance = 0;

            if (i % 6 === 0 || i === numberOfPayments) {
                labels.push(`Month ${i}`);
                balances.push(balance);
            }
        }
    } else {
        labels = ['Month 0', `Month ${numberOfPayments}`];
        balances = [originalPrincipal, 0];
    }

    return { pmt, principal: originalPrincipal, interest: totalInterest, cost: totalCost, labels, balances };
}

// Update or initialize the Chart.js pie chart
function updateChart(principal, totalInterest, principalB = null, interestB = null) {
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

    // Scenario B Gradients
    const gradientPrinB = ctx.createLinearGradient(0, 0, 0, 400);
    gradientPrinB.addColorStop(0, '#10b981'); // Emerald Green
    gradientPrinB.addColorStop(1, '#34d399');

    const gradientIntB = ctx.createLinearGradient(0, 0, 0, 400);
    gradientIntB.addColorStop(0, '#f59e0b'); // Amber
    gradientIntB.addColorStop(1, '#fbbf24');

    let datasets = [{
        data: [principal, totalInterest],
        backgroundColor: [gradientPrincipal, gradientInterest],
        borderWidth: 0,
        hoverOffset: 10
    }];

    if (principalB !== null && interestB !== null) {
        datasets.push({
            data: [principalB, interestB],
            backgroundColor: [gradientPrinB, gradientIntB],
            borderWidth: 0,
            hoverOffset: 10
        });
    }

    const data = {
        labels: currentMode === 'standard' ? ['Total Principal', 'Total Interest'] :
            (currentMode === 'compare' ? ['Principal', 'Interest'] : ['Max Loan Amount', 'Total Interest']),
        datasets: datasets
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

// Compare Mode Amortization Line Chart
function updateAmortizationChartCompare(labelsA, balancesA, labelsB, balancesB) {
    const ctx = document.getElementById('amortizationChart').getContext('2d');

    // Check Theme
    const isDark = document.body.getAttribute('data-theme') === 'dark';
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)';
    const textColor = isDark ? '#94a3b8' : '#475569';
    const tooltipBg = isDark ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)';
    const tooltipText = isDark ? '#f8fafc' : '#0f172a';

    // Build unified labels set based on longest array
    let combinedLabels = labelsA.length >= labelsB.length ? labelsA : labelsB;

    // Pad the shorter dataset with the last known balance (0) to match length
    let finalBalancesA = [...balancesA];
    let finalBalancesB = [...balancesB];

    while (finalBalancesA.length < combinedLabels.length) { finalBalancesA.push(0); }
    while (finalBalancesB.length < combinedLabels.length) { finalBalancesB.push(0); }

    const gradientA = ctx.createLinearGradient(0, 0, 0, 400);
    gradientA.addColorStop(0, 'rgba(37, 99, 235, 0.3)');
    gradientA.addColorStop(1, 'rgba(37, 99, 235, 0.0)');

    const gradientB = ctx.createLinearGradient(0, 0, 0, 400);
    gradientB.addColorStop(0, 'rgba(16, 185, 129, 0.3)');
    gradientB.addColorStop(1, 'rgba(16, 185, 129, 0.0)');

    const data = {
        labels: combinedLabels,
        datasets: [
            {
                label: 'Scenario A Balance',
                data: finalBalancesA,
                borderColor: '#2563eb',
                backgroundColor: gradientA,
                borderWidth: 3,
                fill: true,
                pointBackgroundColor: '#ec4899',
                pointBorderColor: '#ffffff',
                pointBorderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 6,
                tension: 0.4
            },
            {
                label: 'Scenario B Balance',
                data: finalBalancesB,
                borderColor: '#10b981',
                backgroundColor: gradientB,
                borderWidth: 3,
                fill: true,
                pointBackgroundColor: '#f59e0b',
                pointBorderColor: '#ffffff',
                pointBorderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 6,
                tension: 0.4
            }
        ]
    };

    const config = {
        type: 'line',
        data: data,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: {
                    display: true,
                    labels: { color: textColor, font: { family: "'Outfit', sans-serif" } }
                },
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
                            return context.dataset.label.replace(' Balance', '') + ': ' + formatCurrency(context.raw);
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
                        callback: function (value) { return '$' + (value / 1000) + 'k'; }
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
        amortizationChartInstance.options.plugins.legend = config.options.plugins.legend;
        amortizationChartInstance.update();
    } else {
        amortizationChartInstance = new Chart(ctx, config);
    }
}

// --- Deal Rating Engine ---
function updateDealRating(rate, term, principal, targetPrice) {
    const container = document.getElementById('deal-rating-container');
    const icon = document.getElementById('deal-rating-icon');
    const text = document.getElementById('deal-rating-text');

    if (currentMode === 'affordability' || principal <= 0) {
        container.classList.add('hidden');
        return;
    }

    container.classList.remove('hidden', 'rating-excellent', 'rating-good', 'rating-fair', 'rating-poor');

    // Baseline Heuristics
    // Excellent: Rate < 4%, Term <= 48m
    // Good: Rate < 7%, Term <= 60m
    // Fair: Rate < 10%, Term <= 72m
    // Poor: Rate >= 10% OR Term > 72m

    if (rate >= 10 || term > 72) {
        container.classList.add('rating-poor');
        icon.className = 'fas fa-exclamation-triangle';
        text.textContent = 'High Cost Setup';
    } else if (rate < 4 && term <= 48) {
        container.classList.add('rating-excellent');
        icon.className = 'fas fa-crown';
        text.textContent = 'Excellent Deal';
    } else if (rate < 7 && term <= 60) {
        container.classList.add('rating-good');
        icon.className = 'fas fa-check-circle';
        text.textContent = 'Solid Setup';
    } else {
        container.classList.add('rating-fair');
        icon.className = 'fas fa-info-circle';
        text.textContent = 'Fair Deal';
    }
}

// --- Deal Rating Engine ---
function updateDealRating(rate, term, principal) {
    const container = document.getElementById('deal-rating-container');
    const icon = document.getElementById('deal-rating-icon');
    const text = document.getElementById('deal-rating-text');

    // Hide rating in alternative modes or if inputs are invalid
    if (currentMode === 'affordability' || principal <= 0 || !container) {
        if (container) container.classList.add('hidden');
        return;
    }

    container.classList.remove('hidden', 'rating-excellent', 'rating-good', 'rating-fair', 'rating-poor');

    // Heuristic Rules
    if (rate >= 10 || term >= 84) {
        container.classList.add('rating-poor');
        icon.className = 'fas fa-exclamation-triangle';
        text.textContent = 'High Cost Setup';
    } else if (rate <= 4.5 && term <= 48) {
        container.classList.add('rating-excellent');
        icon.className = 'fas fa-crown';
        text.textContent = 'Excellent Terms';
    } else if (rate <= 7.5 && term <= 60) {
        container.classList.add('rating-good');
        icon.className = 'fas fa-check-circle';
        text.textContent = 'Solid Setup';
    } else {
        container.classList.add('rating-fair');
        icon.className = 'fas fa-info-circle';
        text.textContent = 'Fair Deal';
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
