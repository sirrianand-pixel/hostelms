/**
 * HostelMS Professional UI Core Library
 * Common UI components, Toast notification engine, Modal manager, CSV Exporter
 */

// Toast Notification Engine
function showToast(message, type = 'success', title = '') {
    let container = document.getElementById('toastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toastContainer';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast-item toast-${type}`;

    let iconSvg = '';
    if (type === 'success') {
        iconSvg = `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`;
        if (!title) title = 'Success';
    } else if (type === 'danger' || type === 'error') {
        iconSvg = `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`;
        if (!title) title = 'Error';
    } else if (type === 'warning') {
        iconSvg = `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>`;
        if (!title) title = 'Warning';
    } else {
        iconSvg = `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`;
        if (!title) title = 'Notification';
    }

    toast.innerHTML = `
        <div class="toast-content">
            ${iconSvg}
            <div class="toast-text">
                <strong class="toast-title">${escapeHtml(title)}</strong>
                <p class="toast-message">${escapeHtml(message)}</p>
            </div>
        </div>
        <button class="toast-close" onclick="this.closest('.toast-item').remove()">&times;</button>
        <div class="toast-progress"></div>
    `;

    container.appendChild(toast);

    // Auto dismiss after 3.8s
    setTimeout(() => {
        toast.classList.add('toast-fadeout');
        setTimeout(() => toast.remove(), 300);
    }, 3800);
}

// Global Custom Confirmation Modal
let confirmCallback = null;
function showConfirm({ title = 'Confirm Action', message = 'Are you sure you want to proceed?', confirmText = 'Confirm', isDanger = true }) {
    return new Promise((resolve) => {
        let modal = document.getElementById('globalConfirmModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'globalConfirmModal';
            modal.className = 'modal-backdrop';
            modal.innerHTML = `
                <div class="modal-card modal-confirm-card">
                    <div class="confirm-icon-wrap" id="confirmIconWrap">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                    </div>
                    <h3 class="modal-title" id="confirmTitle">Confirm Action</h3>
                    <p class="modal-desc" id="confirmMessage">Are you sure you want to proceed?</p>
                    <div class="modal-actions">
                        <button type="button" class="btn btn-secondary" id="confirmCancelBtn">Cancel</button>
                        <button type="button" class="btn btn-danger" id="confirmActionBtn">Confirm</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);

            document.getElementById('confirmCancelBtn').addEventListener('click', () => {
                modal.classList.remove('active');
                if (confirmCallback) confirmCallback(false);
            });

            document.getElementById('confirmActionBtn').addEventListener('click', () => {
                modal.classList.remove('active');
                if (confirmCallback) confirmCallback(true);
            });

            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.remove('active');
                    if (confirmCallback) confirmCallback(false);
                }
            });
        }

        document.getElementById('confirmTitle').textContent = title;
        document.getElementById('confirmMessage').textContent = message;
        const actionBtn = document.getElementById('confirmActionBtn');
        actionBtn.textContent = confirmText;
        actionBtn.className = isDanger ? 'btn btn-danger' : 'btn btn-primary';

        const iconWrap = document.getElementById('confirmIconWrap');
        iconWrap.className = isDanger ? 'confirm-icon-wrap danger' : 'confirm-icon-wrap primary';

        confirmCallback = resolve;
        modal.classList.add('active');
    });
}

// CSV Export Utility
function exportToCSV(filename, headers, rows) {
    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += headers.map(h => `"${h.replace(/"/g, '""')}"`).join(',') + '\r\n';

    rows.forEach(row => {
        csvContent += row.map(val => `"${String(val ?? '').replace(/"/g, '""')}"`).join(',') + '\r\n';
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast(`Exported ${rows.length} rows to ${filename}`, 'success', 'Export Complete');
}

// Mobile sidebar toggle
function setupMobileMenu() {
    const toggleBtn = document.getElementById('menuToggleBtn');
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('sidebarOverlay');

    if (toggleBtn && sidebar) {
        toggleBtn.addEventListener('click', () => {
            sidebar.classList.toggle('active');
            if (overlay) overlay.classList.toggle('active');
        });
    }

    if (overlay && sidebar) {
        overlay.addEventListener('click', () => {
            sidebar.classList.remove('active');
            overlay.classList.remove('active');
        });
    }
}

// Live date/time clock in topbar
function updateLiveClock() {
    const clockEl = document.getElementById('topbarClock');
    if (!clockEl) return;
    const now = new Date();
    const options = { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    clockEl.textContent = now.toLocaleDateString('en-US', options);
}

// String escape helper
function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// Generate color/initials for student avatar
function getInitials(name) {
    if (!name) return 'S';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getAvatarColor(name) {
    const colors = [
        ['#4f46e5', '#818cf8'], // indigo
        ['#0284c7', '#38bdf8'], // sky
        ['#059669', '#34d399'], // emerald
        ['#d97706', '#fbbf24'], // amber
        ['#7c3aed', '#a78bfa'], // violet
        ['#db2777', '#f472b6'], // pink
        ['#0d9488', '#2dd4bf']  // teal
    ];
    let hash = 0;
    for (let i = 0; i < (name || '').length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const idx = Math.abs(hash) % colors.length;
    return `linear-gradient(135deg, ${colors[idx][0]}, ${colors[idx][1]})`;
}

// Close modals with Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal-backdrop.active, .modal-overlay.active').forEach(m => m.classList.remove('active'));
    }
});

// Auto-run common setup on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
    setupMobileMenu();
    updateLiveClock();
    setInterval(updateLiveClock, 30000);
});
