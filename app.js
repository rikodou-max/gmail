// ================================
// Gmail Collector - Main Application
// ================================

// Constants
const DEADLINE = new Date('2026-01-31T12:00:00+07:00');
const STORAGE_KEY = 'gmail_submissions';

// ================================
// Countdown Timer
// ================================
function updateCountdown() {
    const now = new Date();
    const diff = DEADLINE - now;

    if (diff <= 0) {
        document.getElementById('hours').textContent = '00';
        document.getElementById('minutes').textContent = '00';
        document.getElementById('seconds').textContent = '00';
        return;
    }

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    document.getElementById('hours').textContent = String(hours).padStart(2, '0');
    document.getElementById('minutes').textContent = String(minutes).padStart(2, '0');
    document.getElementById('seconds').textContent = String(seconds).padStart(2, '0');
}

// ================================
// Data Management
// ================================
function getSubmissions() {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
}

function saveSubmissions(submissions) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(submissions));
}

function addSubmission(submission) {
    const submissions = getSubmissions();
    submission.id = Date.now();
    submission.timestamp = new Date().toISOString();
    submission.paid = false;
    submissions.push(submission);
    saveSubmissions(submissions);
    return submission;
}

function togglePaymentStatus(id) {
    const submissions = getSubmissions();
    const index = submissions.findIndex(s => s.id === id);
    if (index !== -1) {
        submissions[index].paid = !submissions[index].paid;
        saveSubmissions(submissions);
        return submissions[index];
    }
    return null;
}

function deleteSubmission(id) {
    const submissions = getSubmissions();
    const filtered = submissions.filter(s => s.id !== id);
    saveSubmissions(filtered);
}

function clearAllSubmissions() {
    localStorage.removeItem(STORAGE_KEY);
}

// ================================
// Stats
// ================================
function getStats() {
    const submissions = getSubmissions();
    const uniqueContributors = [...new Set(submissions.map(s => s.name.toLowerCase()))];
    const paidCount = submissions.filter(s => s.paid).length;
    const unpaidCount = submissions.length - paidCount;

    return {
        totalAccounts: submissions.length,
        totalContributors: uniqueContributors.length,
        paidCount,
        unpaidCount,
        totalPayout: paidCount * 4000,
        pendingPayout: unpaidCount * 4000
    };
}

function updateHomeStats() {
    // Base numbers for social proof
    const BASE_ACCOUNTS = 1500;
    const BASE_CONTRIBUTORS = 50;

    const stats = getStats();
    const totalAccountsEl = document.getElementById('total-accounts');
    const totalContributorsEl = document.getElementById('total-contributors');

    if (totalAccountsEl) {
        totalAccountsEl.textContent = stats.totalAccounts + BASE_ACCOUNTS;
    }
    if (totalContributorsEl) {
        totalContributorsEl.textContent = stats.totalContributors + BASE_CONTRIBUTORS;
    }
}

// ================================
// Toast Notifications
// ================================
function showToast(message, type = 'success') {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <span class="toast-icon">${type === 'success' ? '✅' : '❌'}</span>
        <span class="toast-message">${message}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideIn 0.3s ease reverse';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ================================
// Form Handling (Submit Page)
// ================================
function initSubmitForm() {
    const form = document.getElementById('submit-form');
    if (!form) return;

    form.addEventListener('submit', function (e) {
        e.preventDefault();

        // Get values
        const name = document.getElementById('name').value.trim();
        const email = document.getElementById('email').value.trim();
        const wallet = document.getElementById('wallet').value.trim();

        // Validate email is Gmail
        if (!email.toLowerCase().endsWith('@gmail.com')) {
            showError('email', 'Email harus menggunakan domain @gmail.com');
            return;
        }

        // Check for duplicate email
        const submissions = getSubmissions();
        if (submissions.some(s => s.email.toLowerCase() === email.toLowerCase())) {
            showError('email', 'Email ini sudah pernah disetor sebelumnya');
            return;
        }

        // Clear errors
        clearErrors();

        // Add submission
        const submission = addSubmission({
            name,
            email,
            wallet
        });

        // Show success
        document.getElementById('submit-form').style.display = 'none';
        document.querySelector('.success-message').classList.add('show');

        showToast('Akun berhasil disetor! 🎉');
    });
}

function showError(fieldId, message) {
    const group = document.getElementById(fieldId).closest('.form-group');
    group.classList.add('has-error');
    group.querySelector('.error').textContent = message;
    group.querySelector('.error').style.display = 'block';
}

function clearErrors() {
    document.querySelectorAll('.form-group').forEach(group => {
        group.classList.remove('has-error');
        const error = group.querySelector('.error');
        if (error) error.style.display = 'none';
    });
}

// ================================
// Admin Page
// ================================
function initAdminPage() {
    const tableBody = document.getElementById('submissions-table');
    if (!tableBody) return;

    renderSubmissions();
    updateAdminStats();

    // Search functionality
    const searchBox = document.getElementById('search-box');
    if (searchBox) {
        searchBox.addEventListener('input', function () {
            renderSubmissions(this.value);
        });
    }

    // Clear all button
    const clearBtn = document.getElementById('clear-all');
    if (clearBtn) {
        clearBtn.addEventListener('click', function () {
            if (confirm('Yakin ingin menghapus semua data? Aksi ini tidak bisa dibatalkan.')) {
                clearAllSubmissions();
                renderSubmissions();
                updateAdminStats();
                showToast('Semua data berhasil dihapus');
            }
        });
    }

    // Export button
    const exportBtn = document.getElementById('export-data');
    if (exportBtn) {
        exportBtn.addEventListener('click', exportToCSV);
    }
}

function renderSubmissions(searchQuery = '') {
    const tableBody = document.getElementById('submissions-table');
    if (!tableBody) return;

    let submissions = getSubmissions();

    // Filter by search
    if (searchQuery) {
        const query = searchQuery.toLowerCase();
        submissions = submissions.filter(s =>
            s.name.toLowerCase().includes(query) ||
            s.email.toLowerCase().includes(query) ||
            s.wallet.toLowerCase().includes(query)
        );
    }

    // Sort by newest first
    submissions.sort((a, b) => b.id - a.id);

    if (submissions.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6">
                    <div class="empty-state">
                        <div class="empty-state-icon">📭</div>
                        <p>${searchQuery ? 'Tidak ada hasil yang cocok' : 'Belum ada data submission'}</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    tableBody.innerHTML = submissions.map((s, index) => `
        <tr data-id="${s.id}">
            <td>${submissions.length - index}</td>
            <td>${escapeHtml(s.name)}</td>
            <td>${escapeHtml(s.email)}</td>
            <td>${escapeHtml(s.wallet)}</td>
            <td>
                <span class="status-badge ${s.paid ? 'paid' : 'unpaid'}" onclick="handleTogglePaid(${s.id})">
                    ${s.paid ? '✓ Lunas' : 'Belum'}
                </span>
            </td>
            <td>
                <button class="delete-btn" onclick="handleDelete(${s.id})" title="Hapus">
                    🗑️
                </button>
            </td>
        </tr>
    `).join('');
}

function updateAdminStats() {
    const stats = getStats();

    document.getElementById('stat-total').textContent = stats.totalAccounts;
    document.getElementById('stat-paid').textContent = stats.paidCount;
    document.getElementById('stat-unpaid').textContent = stats.unpaidCount;
    document.getElementById('stat-payout').textContent = formatRupiah(stats.totalPayout);
}

function handleTogglePaid(id) {
    const result = togglePaymentStatus(id);
    if (result) {
        renderSubmissions(document.getElementById('search-box')?.value || '');
        updateAdminStats();
        showToast(result.paid ? 'Ditandai sebagai lunas' : 'Ditandai belum bayar');
    }
}

function handleDelete(id) {
    if (confirm('Yakin ingin menghapus submission ini?')) {
        deleteSubmission(id);
        renderSubmissions(document.getElementById('search-box')?.value || '');
        updateAdminStats();
        showToast('Submission berhasil dihapus');
    }
}

function exportToCSV() {
    const submissions = getSubmissions();
    if (submissions.length === 0) {
        showToast('Tidak ada data untuk di-export', 'error');
        return;
    }

    const headers = ['No', 'Nama', 'Email', 'E-Wallet', 'Status', 'Tanggal'];
    const rows = submissions.map((s, i) => [
        i + 1,
        s.name,
        s.email,
        s.wallet,
        s.paid ? 'Lunas' : 'Belum Bayar',
        new Date(s.timestamp).toLocaleString('id-ID')
    ]);

    const csv = [headers, ...rows]
        .map(row => row.map(cell => `"${cell}"`).join(','))
        .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `gmail_submissions_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    showToast('Data berhasil di-export! 📥');
}

// ================================
// Utility Functions
// ================================
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatRupiah(amount) {
    return 'Rp ' + amount.toLocaleString('id-ID');
}

// ================================
// Initialize
// ================================
document.addEventListener('DOMContentLoaded', function () {
    // Start countdown if elements exist
    if (document.getElementById('countdown')) {
        updateCountdown();
        setInterval(updateCountdown, 1000);
    }

    // Update home stats
    updateHomeStats();

    // Init submit form
    initSubmitForm();

    // Init admin page
    initAdminPage();
});
