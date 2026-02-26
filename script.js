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
    input.addEventListener('focus', function() {
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
    
    // Gradient for Principal
    const gradientPrincipal = ctx.createLinearGradient(0, 0, 0, 400);
    gradientPrincipal.addColorStop(0, 'rgba(56, 189, 248, 1)');
    gradientPrincipal.addColorStop(1, 'rgba(56, 189, 248, 0.6)');

    // Gradient for Interest
    const gradientInterest = ctx.createLinearGradient(0, 0, 0, 400);
    gradientInterest.addColorStop(0, 'rgba(139, 92, 246, 1)');
    gradientInterest.addColorStop(1, 'rgba(139, 92, 246, 0.6)');

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
                        color: '#f8fafc',
                        font: {
                            family: "'Outfit', sans-serif",
                            size: 13
                        },
                        padding: 20,
                        usePointStyle: true,
                        pointStyle: 'circle'
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    titleFont: { family: "'Outfit', sans-serif", size: 13 },
                    bodyFont: { family: "'Outfit', sans-serif", size: 14 },
                    padding: 12,
                    cornerRadius: 8,
                    displayColors: false,
                    callbacks: {
                        label: function(context) {
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
