// ================================
// Gmail Collector - API Client Version
// ================================

// API Base URL - change this when deployed
const API_BASE = window.location.origin;

// Constants
const DEADLINE = new Date('2026-01-31T12:00:00+07:00');

// ORDER STATUS - set to true to close submissions
const ORDER_CLOSED = true;

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
// API Functions
// ================================
async function fetchSubmissions() {
    const response = await fetch(`${API_BASE}/api/submissions`);
    return await response.json();
}

async function fetchStats() {
    const response = await fetch(`${API_BASE}/api/stats`);
    return await response.json();
}

async function addSubmission(data) {
    const response = await fetch(`${API_BASE}/api/submissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    return await response.json();
}

async function togglePaid(id) {
    const response = await fetch(`${API_BASE}/api/submissions/${id}/toggle-paid`, {
        method: 'PATCH'
    });
    return await response.json();
}

async function deleteSubmission(id) {
    const response = await fetch(`${API_BASE}/api/submissions/${id}`, {
        method: 'DELETE'
    });
    return await response.json();
}

async function clearAllData() {
    const response = await fetch(`${API_BASE}/api/submissions`, {
        method: 'DELETE'
    });
    return await response.json();
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
// Update Home Stats
// ================================
async function updateHomeStats() {
    // Base numbers for social proof
    const BASE_ACCOUNTS = 1500;
    const BASE_CONTRIBUTORS = 50;

    try {
        const stats = await fetchStats();
        const totalAccountsEl = document.getElementById('total-accounts');
        const totalContributorsEl = document.getElementById('total-contributors');

        if (totalAccountsEl) {
            totalAccountsEl.textContent = stats.totalAccounts + BASE_ACCOUNTS;
        }
        if (totalContributorsEl) {
            totalContributorsEl.textContent = stats.totalContributors + BASE_CONTRIBUTORS;
        }
    } catch (error) {
        console.error('Failed to fetch stats:', error);
    }
}

// ================================
// Form Handling (Submit Page)
// ================================
function initSubmitForm() {
    const form = document.getElementById('submit-form');
    if (!form) return;

    form.addEventListener('submit', async function (e) {
        e.preventDefault();

        const submitBtn = form.querySelector('.submit-btn');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Menyimpan...';

        const name = document.getElementById('name').value.trim();
        const email = document.getElementById('email').value.trim();
        const wallet = document.getElementById('wallet').value.trim();

        // Clear errors
        clearErrors();

        try {
            const result = await addSubmission({ name, email, wallet });

            if (result.error) {
                if (result.error.includes('gmail')) {
                    showError('email', result.error);
                } else if (result.error.includes('Email')) {
                    showError('email', result.error);
                } else {
                    showToast(result.error, 'error');
                }
                submitBtn.disabled = false;
                submitBtn.textContent = 'Setor Akun 🚀';
                return;
            }

            // Show success
            document.getElementById('submit-form').style.display = 'none';
            document.querySelector('.success-message').classList.add('show');
            showToast('Akun berhasil disetor! 🎉');

        } catch (error) {
            showToast('Gagal menyimpan data. Coba lagi.', 'error');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Setor Akun 🚀';
        }
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
async function initAdminPage() {
    const tableBody = document.getElementById('submissions-table');
    if (!tableBody) return;

    await renderSubmissions();
    await updateAdminStats();

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
        clearBtn.addEventListener('click', async function () {
            if (confirm('Yakin ingin menghapus semua data? Aksi ini tidak bisa dibatalkan.')) {
                await clearAllData();
                await renderSubmissions();
                await updateAdminStats();
                showToast('Semua data berhasil dihapus');
            }
        });
    }

    // Export button
    const exportBtn = document.getElementById('export-data');
    if (exportBtn) {
        exportBtn.addEventListener('click', exportToCSV);
    }

    // Refresh button
    const refreshBtn = document.getElementById('refresh-data');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', async function () {
            await renderSubmissions();
            await updateAdminStats();
            showToast('Data berhasil diperbarui');
        });
    }
}

async function renderSubmissions(searchQuery = '') {
    const tableBody = document.getElementById('submissions-table');
    if (!tableBody) return;

    try {
        let submissions = await fetchSubmissions();

        // Filter by search
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            submissions = submissions.filter(s =>
                s.name.toLowerCase().includes(query) ||
                s.email.toLowerCase().includes(query) ||
                s.wallet.toLowerCase().includes(query)
            );
        }

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
    } catch (error) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6">
                    <div class="empty-state">
                        <div class="empty-state-icon">⚠️</div>
                        <p>Gagal memuat data. Pastikan server berjalan.</p>
                    </div>
                </td>
            </tr>
        `;
    }
}

async function updateAdminStats() {
    try {
        const stats = await fetchStats();

        document.getElementById('stat-total').textContent = stats.totalAccounts;
        document.getElementById('stat-paid').textContent = stats.paidCount;
        document.getElementById('stat-unpaid').textContent = stats.unpaidCount;
        document.getElementById('stat-payout').textContent = formatRupiah(stats.totalPayout);
    } catch (error) {
        console.error('Failed to fetch stats:', error);
    }
}

async function handleTogglePaid(id) {
    try {
        const result = await togglePaid(id);
        if (result.success) {
            await renderSubmissions(document.getElementById('search-box')?.value || '');
            await updateAdminStats();
            showToast(result.message);
        }
    } catch (error) {
        showToast('Gagal update status', 'error');
    }
}

async function handleDelete(id) {
    if (confirm('Yakin ingin menghapus submission ini?')) {
        try {
            await deleteSubmission(id);
            await renderSubmissions(document.getElementById('search-box')?.value || '');
            await updateAdminStats();
            showToast('Submission berhasil dihapus');
        } catch (error) {
            showToast('Gagal menghapus data', 'error');
        }
    }
}

async function exportToCSV() {
    try {
        const submissions = await fetchSubmissions();
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
            new Date(s.created_at).toLocaleString('id-ID')
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
    } catch (error) {
        showToast('Gagal export data', 'error');
    }
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
