/**
 * Smart Expense Tracker - Dashboard Logic (Multi-user)
 */
import Auth from './auth.js';

// --- Auth Guard ---
Auth.checkAuth();
const currentUser = Auth.getCurrentUser();
if (!currentUser) {
    // Stop execution if not authenticated (redirecting)
    throw new Error('Unauthorized'); 
}

// Update UI with User Info
document.addEventListener('DOMContentLoaded', () => {
    const welcomeMsg = document.getElementById('welcome-msg');
    const userAvatar = document.getElementById('user-avatar');
    const logoutBtn = document.getElementById('logout-btn');
    const navLinks = document.querySelectorAll('.sidebar-nav a');

    if (welcomeMsg) welcomeMsg.innerText = `Welcome, ${currentUser.name}!`;
    if (userAvatar) userAvatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.name)}&background=6366f1&color=fff`;
    if (logoutBtn) logoutBtn.addEventListener('click', () => Auth.logout());

    // Placeholder for other nav links
    navLinks.forEach(link => {
        if (link.getAttribute('href') === '#') {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                alert('This feature is coming soon!');
            });
        }
    });

    initChart();
});

// --- State Management ---
// Use user-specific keys for persistence
const STORAGE_KEY = `transactions_${currentUser.id}`;
let transactions = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
let budgetLimit = parseFloat(localStorage.getItem(`budgetLimit_${currentUser.id}`)) || 1000;
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

// Mobile Sidebar Elements
const sidebar = document.querySelector('.sidebar');
const openSidebarBtn = document.getElementById('open-sidebar');
const closeSidebarBtn = document.getElementById('close-sidebar');

// --- Chart Initialization ---
let categoryChart;

function initChart() {
    const ctx = document.getElementById('category-chart').getContext('2d');
    categoryChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Food', 'Travel', 'Bills', 'Shopping', 'Other'],
            datasets: [{
                data: [0, 0, 0, 0, 0],
                backgroundColor: ['#6366f1', '#10b981', '#ef4444', '#f59e0b', '#ec4899'],
                borderWidth: 0,
                hoverOffset: 12
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: isDarkMode ? '#94a3b8' : '#64748b',
                        padding: 20,
                        usePointStyle: true,
                        font: { family: 'Inter', size: 12 }
                    }
                }
            },
            cutout: '75%'
        }
    });
}

// --- Functions ---

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
    saveData();
    updateUI();
    form.reset();
    setDefaultDate();
}

// Global scope for onclick attribute in HTML
window.deleteTransaction = (id) => {
    transactions = transactions.filter(t => t.id !== id);
    saveData();
    updateUI();
};

function updateUI() {
    transactionList.innerHTML = '';
    
    if (transactions.length === 0) {
        noTransactions.classList.remove('hidden');
    } else {
        noTransactions.classList.add('hidden');
        
        const sorted = [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date));
        
        sorted.forEach(t => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>
                    <div class="date-cell">${t.date}</div>
                    <div class="desc-cell"><strong>${t.description}</strong></div>
                </td>
                <td><span class="badge">${t.category}</span></td>
                <td class="${t.type === 'income' ? 'text-success' : 'text-danger'}">
                    <strong>${t.type === 'income' ? '+' : '-'}$${t.amount.toLocaleString(undefined, {minimumFractionDigits: 2})}</strong>
                </td>
                <td style="text-align: right;">
                    <button class="btn-delete" title="Delete" onclick="deleteTransaction(${t.id})">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </td>
            `;
            transactionList.appendChild(row);
        });
    }

    // Totals
    const income = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const balance = income - expense;

    balanceDisplay.innerText = `$${balance.toLocaleString(undefined, {minimumFractionDigits: 2})}`;
    incomeDisplay.innerText = `$${income.toLocaleString(undefined, {minimumFractionDigits: 2})}`;
    expenseDisplay.innerText = `$${expense.toLocaleString(undefined, {minimumFractionDigits: 2})}`;

    updateMonthlyBudget(expense);
    updateChart();
}

function updateMonthlyBudget(totalExpense) {
    const now = new Date();
    const monthlyItems = transactions.filter(t => {
        const d = new Date(t.date);
        return t.type === 'expense' && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const monthlyTotal = monthlyItems.reduce((s, t) => s + t.amount, 0);

    monthlyExpenseText.innerText = `Spent: $${monthlyTotal.toLocaleString(undefined, {minimumFractionDigits: 2})}`;
    
    const percent = Math.min((monthlyTotal / budgetLimit) * 100, 100);
    budgetProgress.style.width = `${percent}%`;
    
    if (percent > 90) budgetProgress.style.backgroundColor = 'var(--danger)';
    else if (percent > 70) budgetProgress.style.backgroundColor = 'var(--warning)';
    else budgetProgress.style.backgroundColor = 'var(--primary)';

    budgetAlert.classList.toggle('hidden', monthlyTotal <= budgetLimit);
}

function updateChart() {
    const expenses = transactions.filter(t => t.type === 'expense');
    const categories = ['Food', 'Travel', 'Bills', 'Shopping', 'Other'];
    const data = categories.map(cat => {
        return expenses.filter(t => t.category === cat).reduce((s, t) => s + t.amount, 0);
    });

    categoryChart.data.datasets[0].data = data;
    categoryChart.update();
}

function saveData() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
}

function setDefaultDate() {
    dateInput.value = new Date().toISOString().split('T')[0];
}

function toggleDarkMode() {
    isDarkMode = !isDarkMode;
    document.body.classList.toggle('dark-mode', isDarkMode);
    localStorage.setItem('darkMode', isDarkMode);
    
    categoryChart.options.plugins.legend.labels.color = isDarkMode ? '#94a3b8' : '#64748b';
    categoryChart.update();
    
    themeToggle.innerHTML = isDarkMode ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
}

function exportCSV() {
    if (transactions.length === 0) return alert('Nothing to export');
    const headers = ['Date', 'Description', 'Category', 'Type', 'Amount'];
    const rows = transactions.map(t => [t.date, t.description, t.category, t.type, t.amount]);
    const csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + rows.map(e => e.join(",")).join("\n");
    const link = document.createElement("a");
    link.href = encodeURI(csvContent);
    link.download = `expense_report_${currentUser.name.replace(/\s+/g, '_')}.csv`;
    link.click();
}

// --- Event Listeners ---
form.addEventListener('submit', addTransaction);
themeToggle.addEventListener('click', toggleDarkMode);
exportBtn.addEventListener('click', exportCSV);

budgetLimitInput.addEventListener('change', (e) => {
    budgetLimit = parseFloat(e.target.value) || 1000;
    localStorage.setItem(`budgetLimit_${currentUser.id}`, budgetLimit);
    updateUI();
});

// Sidebar Controls
if (openSidebarBtn) openSidebarBtn.addEventListener('click', () => sidebar.classList.add('open'));
if (closeSidebarBtn) closeSidebarBtn.addEventListener('click', () => sidebar.classList.remove('open'));

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    // Note: initChart is now called in the top-level DOMContentLoaded
    setDefaultDate();
    if (budgetLimitInput) budgetLimitInput.value = budgetLimit;
    
    if (isDarkMode) {
        document.body.classList.add('dark-mode');
        if (themeToggle) themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
    }
    
    updateUI();
});
