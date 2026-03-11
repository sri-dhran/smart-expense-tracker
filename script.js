/**
 * Smart Expense Tracker - Core Logic
 */

// --- State Management ---
const STORAGE_KEY = 'transactions';
let transactions = [];
try {
    transactions = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
} catch (e) {
    console.error('Error parsing transactions from localStorage', e);
    transactions = [];
}
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
const clearAllBtn = document.getElementById('clear-all-btn');

// Mobile Sidebar Elements
const sidebar = document.querySelector('.sidebar');
const openSidebarBtn = document.getElementById('open-sidebar');
const closeSidebarBtn = document.getElementById('close-sidebar');

// --- Chart Initialization ---
let categoryChart;

function initChart() {
    const ctx = document.getElementById('category-chart').getContext('2d');
    
    // Global Defaults for styling
    Chart.defaults.font.family = "'Inter', sans-serif";
    Chart.defaults.color = isDarkMode ? '#94a3b8' : '#64748b';
    
    categoryChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Food', 'Travel', 'Bills', 'Shopping', 'Other'],
            datasets: [{
                data: [0, 0, 0, 0, 0],
                backgroundColor: [
                    '#6366f1', // Primary
                    '#10b981', // Success
                    '#f59e0b', // Warning
                    '#ef4444', // Danger
                    '#ec4899'  // Accent
                ],
                borderWidth: isDarkMode ? 2 : 0,
                borderColor: isDarkMode ? '#1e293b' : '#ffffff',
                hoverOffset: 15
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 25,
                        usePointStyle: true,
                        pointStyle: 'circle',
                        font: { size: 12, weight: '500' }
                    }
                },
                tooltip: {
                    backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
                    titleColor: isDarkMode ? '#f8fafc' : '#1e293b',
                    bodyColor: isDarkMode ? '#94a3b8' : '#64748b',
                    borderColor: 'var(--border)',
                    borderWidth: 1,
                    padding: 12,
                    boxPadding: 4,
                    usePointStyle: true
                }
            },
            cutout: '70%'
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

    if (isNaN(transaction.amount) || transaction.amount <= 0) {
        alert('Please enter a valid amount greater than zero.');
        return;
    }

    transactions.push(transaction);
    saveData();
    updateUI();
    setDefaultDate();
}

function clearAllTransactions() {
    if (transactions.length === 0) return;
    
    if (confirm('Are you sure you want to delete all transactions? This action cannot be undone.')) {
        transactions = [];
        saveData();
        updateUI();
    }
}

// Deletion handled via event delegation below

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
                    <button class="btn-delete" title="Delete" data-id="${t.id}">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </td>
            `;
            transactionList.appendChild(row);
        });
    }

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

    if (monthlyTotal > budgetLimit) {
        budgetAlert.classList.remove('hidden');
        budgetAlert.style.display = 'flex'; // Explicitly show
    } else {
        budgetAlert.classList.add('hidden');
        budgetAlert.style.display = 'none'; // Explicitly hide
    }
}

function updateChart() {
    const expenses = transactions.filter(t => t.type === 'expense');
    const categories = ['Food', 'Travel', 'Bills', 'Shopping', 'Other'];
    const data = categories.map(cat => {
        return expenses.filter(t => t.category === cat).reduce((s, t) => s + t.amount, 0);
    });

    if (categoryChart) {
        categoryChart.data.datasets[0].data = data;
        categoryChart.update();
    }
}

function saveData() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
}

function setDefaultDate() {
    if (dateInput) {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        dateInput.value = `${year}-${month}-${day}`;
    }
}

function toggleDarkMode() {
    isDarkMode = !isDarkMode;
    document.body.classList.toggle('dark-mode', isDarkMode);
    localStorage.setItem('darkMode', isDarkMode);
    
    if (categoryChart) {
        // Update global defaults for future charts (if any)
        Chart.defaults.color = isDarkMode ? '#94a3b8' : '#64748b';
        
        // Update specialized options
        categoryChart.options.plugins.legend.labels.color = isDarkMode ? '#94a3b8' : '#64748b';
        categoryChart.data.datasets[0].borderColor = isDarkMode ? '#1e293b' : '#ffffff';
        categoryChart.data.datasets[0].borderWidth = isDarkMode ? 2 : 0;
        
        // Update tooltips
        categoryChart.options.plugins.tooltip.backgroundColor = isDarkMode ? '#1e293b' : '#ffffff';
        categoryChart.options.plugins.tooltip.titleColor = isDarkMode ? '#f8fafc' : '#1e293b';
        categoryChart.options.plugins.tooltip.bodyColor = isDarkMode ? '#94a3b8' : '#64748b';
        
        categoryChart.update();
    }
    
    themeToggle.innerHTML = isDarkMode ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
}

function exportCSV() {
    if (transactions.length === 0) return alert('Nothing to export');
    
    const headers = ['Date', 'Description', 'Category', 'Type', 'Amount'];
    
    // Properly escape CSV fields that might contain commas or quotes
    const escapeField = (field) => {
        const stringified = String(field);
        if (stringified.includes(',') || stringified.includes('"') || stringified.includes('\n')) {
            return `"${stringified.replace(/"/g, '""')}"`;
        }
        return stringified;
    };

    const rows = transactions.map(t => [
        escapeField(t.date), 
        escapeField(t.description), 
        escapeField(t.category), 
        escapeField(t.type), 
        escapeField(t.amount)
    ]);
    
    const csvContent = "data:text/csv;charset=utf-8," 
        + headers.join(",") + "\n" 
        + rows.map(e => e.join(",")).join("\n");
        
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `expense_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link); // Required for FF
    link.click();
    document.body.removeChild(link);
}

// --- Event Listeners ---
if (form) form.addEventListener('submit', addTransaction);
if (themeToggle) themeToggle.addEventListener('click', toggleDarkMode);
if (exportBtn) exportBtn.addEventListener('click', exportCSV);
if (clearAllBtn) clearAllBtn.addEventListener('click', clearAllTransactions);

if (budgetLimitInput) {
    budgetLimitInput.addEventListener('change', (e) => {
        budgetLimit = parseFloat(e.target.value) || 1000;
        localStorage.setItem('budgetLimit', budgetLimit);
        updateUI();
    });
}

const navLinks = document.querySelectorAll('.sidebar-nav a');
const navSections = document.querySelectorAll('.nav-section');

// Navigation Logic
function handleNavigation(e) {
    e.preventDefault();
    
    const targetId = e.currentTarget.getAttribute('data-target');
    if (!targetId) return;

    // 1. Remove active class from all links
    navLinks.forEach(link => link.parentElement.classList.remove('active'));
    
    // 2. Add active class to clicked link
    e.currentTarget.parentElement.classList.add('active');

    // 3. Hide all sections
    navSections.forEach(section => {
        section.classList.remove('active');
    });

    // 4. Show target section
    const targetSection = document.getElementById(targetId);
    if (targetSection) {
        targetSection.classList.add('active');
    }

    // 5. Close sidebar on mobile after navigation
    if (window.innerWidth <= 768) {
        sidebar.classList.remove('open');
    }
}

navLinks.forEach(link => {
    link.addEventListener('click', handleNavigation);
});

// Sidebar Controls
if (openSidebarBtn) openSidebarBtn.addEventListener('click', () => sidebar.classList.add('open'));
if (closeSidebarBtn) closeSidebarBtn.addEventListener('click', () => sidebar.classList.remove('open'));

// Event Delegation for Transaction List
if (transactionList) {
    transactionList.addEventListener('click', (e) => {
        const deleteBtn = e.target.closest('.btn-delete');
        if (deleteBtn) {
            const id = parseInt(deleteBtn.dataset.id);
            transactions = transactions.filter(t => t.id !== id);
            saveData();
            updateUI();
        }
    });
}

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    initChart();
    setDefaultDate();
    if (budgetLimitInput) budgetLimitInput.value = budgetLimit;
    
    if (isDarkMode) {
        document.body.classList.add('dark-mode');
        if (themeToggle) themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
    }
    
    updateUI();
});
