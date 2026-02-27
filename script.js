let loanChartInstance = null;

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

// Update the display for the range slider
function updateTermDisplay() {
    const term = document.getElementById('loan-term').value;
    document.getElementById('term-display').textContent = `${term} months`;
}

// Calculate the loan details
function calculateLoan() {
    const priceInput = document.getElementById('car-price').value;
    const downPaymentInput = document.getElementById('down-payment').value;
    const termValue = parseInt(document.getElementById('loan-term').value);
    const rateInput = document.getElementById('interest-rate').value;

    const price = parseFloat(priceInput) || 0;
    const downPayment = parseFloat(downPaymentInput) || 0;
    const annualRate = parseFloat(rateInput) || 0;

    const principal = Math.max(0, price - downPayment);
    const monthlyRate = (annualRate / 100) / 12;
    const numberOfPayments = termValue;

    let monthlyPayment = 0;
    let totalInterest = 0;
    let totalCost = 0;

    if (monthlyRate === 0) {
        monthlyPayment = principal / numberOfPayments;
        totalInterest = 0;
        totalCost = principal;
    } else if (principal > 0 && numberOfPayments > 0) {
        const x = Math.pow(1 + monthlyRate, numberOfPayments);
        monthlyPayment = (principal * x * monthlyRate) / (x - 1);
        totalCost = monthlyPayment * numberOfPayments;
        totalInterest = totalCost - principal;
    }

    // Handle NaN or infinity when inputs are missing
    if (!isFinite(monthlyPayment) || isNaN(monthlyPayment)) {
        monthlyPayment = 0;
        totalInterest = 0;
        totalCost = 0;
    }

    // Update the DOM Elements
    document.getElementById('monthly-payment').textContent = formatCurrency(monthlyPayment);
    document.getElementById('total-principal').textContent = formatCurrency(principal);
    document.getElementById('total-interest').textContent = formatCurrency(totalInterest);
    document.getElementById('total-cost').textContent = formatCurrency(totalCost);

    // Update the Chart
    updateChart(principal, totalInterest);
}

// Update or initialize the Chart.js pie chart
function updateChart(principal, totalInterest) {
    const ctx = document.getElementById('loanChart').getContext('2d');

    // Gradient for Principal - Trusting Blue
    const gradientPrincipal = ctx.createLinearGradient(0, 0, 0, 400);
    gradientPrincipal.addColorStop(0, '#2563eb');
    gradientPrincipal.addColorStop(1, '#60a5fa');

    // Gradient for Interest - Energetic Coral/Pink
    const gradientInterest = ctx.createLinearGradient(0, 0, 0, 400);
    gradientInterest.addColorStop(0, '#ec4899');
    gradientInterest.addColorStop(1, '#f472b6');

    const data = {
        labels: ['Total Principal', 'Total Interest'],
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
                        color: '#0f172a',
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
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    titleColor: '#0f172a',
                    bodyColor: '#475569',
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

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    updateTermDisplay();
    calculateLoan();
});
