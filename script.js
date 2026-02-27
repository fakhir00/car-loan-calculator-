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

    // Auto-update quick terms buttons visually
    document.querySelectorAll('.term-btn').forEach(btn => btn.classList.remove('active'));
    if (term == 36) document.querySelector('.term-btn[onclick="setTerm(36)"]').classList.add('active');
    if (term == 60) document.querySelector('.term-btn[onclick="setTerm(60)"]').classList.add('active');
    if (term == 72) document.querySelector('.term-btn[onclick="setTerm(72)"]').classList.add('active');
}

// Handler for custom Quick Terms
function setTerm(months) {
    document.getElementById('loan-term').value = months;
    updateTermDisplay();
    calculateLoan();
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

    // Gradient for Principal (Cyan Glow)
    const gradientPrincipal = ctx.createLinearGradient(0, 0, 0, 400);
    gradientPrincipal.addColorStop(0, '#00F2FE');
    gradientPrincipal.addColorStop(1, '#4FACFE');

    // Gradient for Interest (Magenta Pulse)
    const gradientInterest = ctx.createLinearGradient(0, 0, 0, 400);
    gradientInterest.addColorStop(0, '#D946EF');
    gradientInterest.addColorStop(1, '#6F3A6E');

    const data = {
        labels: ['Total Principal', 'Total Interest'],
        datasets: [{
            data: [principal, totalInterest],
            backgroundColor: [gradientPrincipal, gradientInterest],
            borderWidth: 0,
            hoverOffset: 25 // Increased for Antigravity hover effect
        }]
    };

    const config = {
        type: 'doughnut',
        data: data,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '80%', // Thinner ring for futuristic look
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: '#E2E8F0',
                        font: {
                            family: "'Inter', sans-serif",
                            size: 12,
                            letterSpacing: '0.1em'
                        },
                        padding: 30,
                        usePointStyle: true,
                        pointStyle: 'circle'
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(9, 10, 15, 0.9)',
                    titleFont: { family: "'Montserrat', sans-serif", size: 13 },
                    bodyFont: { family: "'Space Mono', monospace", size: 14 },
                    padding: 16,
                    cornerRadius: 12,
                    borderColor: 'rgba(0, 242, 254, 0.3)',
                    borderWidth: 1,
                    displayColors: false,
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
