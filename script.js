/**
 * Smart Expense Tracker - Core Logic
 */

// --- State Management ---
let transactions = JSON.parse(localStorage.getItem('transactions')) || [];
let budgetLimit = parseFloat(localStorage.getItem('budgetLimit')) || 1000;
let isDarkMode = localStorage.getItem('darkMode') === 'true';

// --- DOM Elements ---
const form = document.getElementById('exp-form');
const descriptionInput = document.getElementById('description');
const amountInput = document.getElementById('amount');
const typeSelect = document.getElementById('type');
const categorySelect = document.getElementById('category');
const dateInput = document.getElementById('date');

const balanceDisplay = document.getElementById('total-balance');
const incomeDisplay = document.getElementById('total-income');
const expenseDisplay = document.getElementById('total-expense');
const transactionList = document.getElementById('transaction-list');
const noTransactions = document.getElementById('no-transactions');

const budgetLimitInput = document.getElementById('budget-limit');
const monthlyExpenseText = document.getElementById('monthly-expense-text');
const budgetProgress = document.getElementById('budget-progress');
const budgetAlert = document.getElementById('budget-alert');

const themeToggle = document.getElementById('theme-toggle');
const exportBtn = document.getElementById('export-btn');

// --- Chart Initialization ---
let categoryChart;

function initChart() {
    const ctx = document.getElementById('category-chart').getContext('2d');
    categoryChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: [],
            datasets: [{
                data: [],
                backgroundColor: [
                    '#6366f1', // Primary
                    '#10b981', // Success
                    '#ef4444', // Danger
                    '#f59e0b', // Warning
                    '#ec4899'  // Pink
                ],
                borderWidth: 0,
                hoverOffset: 10
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: isDarkMode ? '#f8fafc' : '#1e293b',
                        padding: 20,
                        font: { family: 'Inter', size: 12 }
                    }
                }
            },
            cutout: '70%'
        }
    });
}

// --- Functions ---

// 1. Add Transaction
function addTransaction(e) {
    e.preventDefault();

    const transaction = {
        id: Date.now(),
        description: descriptionInput.value,
        amount: parseFloat(amountInput.value),
        type: typeSelect.value,
        category: categorySelect.value,
        date: dateInput.value
    };

    transactions.push(transaction);
    updateLocalStorage();
    updateUI();
    form.reset();
    setTodayDate();
}

// 2. Delete Transaction
function deleteTransaction(id) {
    transactions = transactions.filter(t => t.id !== id);
    updateLocalStorage();
    updateUI();
}

// 3. Update UI
function updateUI() {
    // History Table
    transactionList.innerHTML = '';
    
    if (transactions.length === 0) {
        noTransactions.classList.remove('hidden');
    } else {
        noTransactions.classList.add('hidden');
        
        // Sort by date (descending)
        const sortedTransactions = [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date));
        
        sortedTransactions.forEach(t => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${t.date}</td>
                <td>${t.description}</td>
                <td><span class="badge">${t.category}</span></td>
                <td class="${t.type === 'income' ? 'text-success' : 'text-danger'}">
                    ${t.type === 'income' ? '+' : '-'}$${t.amount.toLocaleString(undefined, {minimumFractionDigits: 2})}
                </td>
                <td>
                    <button class="btn-delete" onclick="deleteTransaction(${t.id})">
                        <i class="fas fa-trash-can"></i>
                    </button>
                </td>
            `;
            transactionList.appendChild(row);
        });
    }

    // Calculations
    const totalIncome = transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);

    const totalExpense = transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);

    const balance = totalIncome - totalExpense;

    // View Updates
    balanceDisplay.innerText = `$${balance.toLocaleString(undefined, {minimumFractionDigits: 2})}`;
    incomeDisplay.innerText = `$${totalIncome.toLocaleString(undefined, {minimumFractionDigits: 2})}`;
    expenseDisplay.innerText = `$${totalExpense.toLocaleString(undefined, {minimumFractionDigits: 2})}`;

    updateMonthlySummary(totalExpense);
    updateChart();
}

// 4. Monthly Summary & Budget
function updateMonthlySummary(totalExpense) {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const monthlyExpense = transactions
        .filter(t => {
            const d = new Date(t.date);
            return t.type === 'expense' && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        })
        .reduce((sum, t) => sum + t.amount, 0);

    monthlyExpenseText.innerText = `Monthly Expense: $${monthlyExpense.toLocaleString(undefined, {minimumFractionDigits: 2})}`;
    
    // Progress Bar
    const percent = Math.min((monthlyExpense / budgetLimit) * 100, 100);
    budgetProgress.style.width = `${percent}%`;
    
    if (percent > 90) budgetProgress.style.backgroundColor = 'var(--danger)';
    else if (percent > 70) budgetProgress.style.backgroundColor = 'var(--warning)';
    else budgetProgress.style.backgroundColor = 'var(--primary)';

    // Alert
    if (monthlyExpense > budgetLimit) {
        budgetAlert.classList.remove('hidden');
    } else {
        budgetAlert.classList.add('hidden');
    }
}

// 5. Update Chart
function updateChart() {
    const expenses = transactions.filter(t => t.type === 'expense');
    const categories = ['Food', 'Travel', 'Bills', 'Shopping', 'Other'];
    const data = categories.map(cat => {
        return expenses
            .filter(t => t.category === cat)
            .reduce((sum, t) => sum + t.amount, 0);
    });

    categoryChart.data.labels = categories;
    categoryChart.data.datasets[0].data = data;
    categoryChart.update();
}

// 6. Export to CSV
function exportToCSV() {
    if (transactions.length === 0) return alert('No data to export');

    const headers = ['Date', 'Description', 'Category', 'Type', 'Amount'];
    const rows = transactions.map(t => [t.date, t.description, t.category, t.type, t.amount]);
    
    let csvContent = "data:text/csv;charset=utf-8," 
        + headers.join(",") + "\n"
        + rows.map(e => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "smart_expense_report.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// 7. Dark Mode
function toggleDarkMode() {
    isDarkMode = !isDarkMode;
    document.body.classList.toggle('dark-mode', isDarkMode);
    localStorage.setItem('darkMode', isDarkMode);
    
    // Update Chart Legend Colors
    categoryChart.options.plugins.legend.labels.color = isDarkMode ? '#f8fafc' : '#1e293b';
    categoryChart.update();
    
    themeToggle.innerHTML = isDarkMode ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
}

// 8. Storage
function updateLocalStorage() {
    localStorage.setItem('transactions', JSON.stringify(transactions));
}

function setTodayDate() {
    const today = new Date().toISOString().split('T')[0];
    dateInput.value = today;
}

// --- Event Listeners ---
form.addEventListener('submit', addTransaction);
exportBtn.addEventListener('click', exportToCSV);
themeToggle.addEventListener('click', toggleDarkMode);

budgetLimitInput.addEventListener('change', (e) => {
    budgetLimit = parseFloat(e.target.value) || 1000;
    localStorage.setItem('budgetLimit', budgetLimit);
    updateUI();
});

// --- Init ---
document.addEventListener('DOMContentLoaded', () => {
    initChart();
    setTodayDate();
    budgetLimitInput.value = budgetLimit;
    
    if (isDarkMode) {
        document.body.classList.add('dark-mode');
        themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
    }

    updateUI();
});
