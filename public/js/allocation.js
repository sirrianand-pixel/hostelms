/**
 * HostelMS - Room Allocation Controller
 */
const API = '/api/allocations';
let allAllocations = [];

// Set today's date as default
function initDateInput() {
    const dateInput = document.getElementById('allocated_on');
    if (dateInput && !dateInput.value) {
        dateInput.value = new Date().toISOString().split('T')[0];
    }
}

// Modal controls
function openAllocateModal() {
    initDateInput();
    loadDropdownData();
    const modal = document.getElementById('allocateModal');
    if (modal) modal.classList.add('active');
}

function closeAllocateModal() {
    const modal = document.getElementById('allocateModal');
    if (modal) modal.classList.remove('active');
}

// Load dropdowns for unallocated students and available rooms
async function loadDropdownData() {
    try {
        const [studentsRes, roomsRes] = await Promise.all([
            fetch('/api/students/unallocated'),
            fetch('/api/rooms/available')
        ]);

        if (studentsRes.ok) {
            const students = await studentsRes.json();
            const studentSelect = document.getElementById('student_id');
            if (studentSelect) {
                if (students.length === 0) {
                    studentSelect.innerHTML = '<option value="">No unallocated students available</option>';
                } else {
                    studentSelect.innerHTML = `<option value="">-- Choose Student (${students.length} available) --</option>` +
                        students.map(s => `
                            <option value="${s.student_id}">
                                ${escapeHtml(s.name)} (${escapeHtml(s.roll_number)}) - ${escapeHtml(s.department || 'General')}
                            </option>
                        `).join('');
                }
            }
        }

        if (roomsRes.ok) {
            const rooms = await roomsRes.json();
            const roomSelect = document.getElementById('room_id');
            if (roomSelect) {
                if (rooms.length === 0) {
                    roomSelect.innerHTML = '<option value="">No rooms with open capacity</option>';
                } else {
                    roomSelect.innerHTML = `<option value="">-- Choose Room (${rooms.length} available) --</option>` +
                        rooms.map(r => `
                            <option value="${r.room_id}">
                                Room ${escapeHtml(r.room_number)} (${escapeHtml(r.room_type || 'Sharing')}) - ${r.available_beds} bed(s) free [Floor ${r.floor || 0}]
                            </option>
                        `).join('');
                }
            }
        }
    } catch (err) {
        console.error('Error loading allocation dropdowns:', err);
        showToast('Failed to load candidate students or rooms', 'danger');
    }
}

// Load all allocation records
async function loadAllocations() {
    try {
        const response = await fetch(API);
        if (!response.ok) throw new Error('Failed to load allocations');
        
        allAllocations = await response.json();
        applyFilters();
    } catch (err) {
        console.error(err);
        showToast('Error loading allocations: ' + err.message, 'danger');
        const list = document.getElementById('allocationList');
        if (list) {
            list.innerHTML = `<tr><td colspan="9" style="text-align: center; color: var(--danger); padding: 2.5rem;">Failed to load allocation records. Please check database connection.</td></tr>`;
        }
    }
}

// Render allocations table
function renderAllocations(allocations) {
    const list = document.getElementById('allocationList');
    const badge = document.getElementById('allocCountBadge');
    if (badge) badge.textContent = `${allocations.length} Record${allocations.length === 1 ? '' : 's'}`;

    if (!list) return;

    if (allocations.length === 0) {
        list.innerHTML = `
            <tr>
                <td colspan="9">
                    <div class="empty-state">
                        <svg class="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                        </svg>
                        <h3>No Allocation Records Found</h3>
                        <p>No room assignment records match your filter criteria.</p>
                        <button type="button" class="btn btn-primary btn-sm" onclick="openAllocateModal()">+ Allocate Room</button>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    list.innerHTML = allocations.map(a => {
        const isActive = a.status === 'Active';
        const initials = getInitials(a.student_name);
        const avatarBg = getAvatarColor(a.student_name);

        return `
            <tr>
                <td><span class="font-mono" style="font-weight: 700;">#${a.allocation_id}</span></td>
                <td>
                    <div class="student-cell">
                        <div class="student-avatar" style="background: ${avatarBg}">${initials}</div>
                        <div>
                            <div class="student-meta-name">${escapeHtml(a.student_name)}</div>
                            <div class="student-meta-sub">${a.phone ? `📞 ${escapeHtml(a.phone)}` : ''}</div>
                        </div>
                    </div>
                </td>
                <td><span class="font-mono" style="font-weight: 600;">${escapeHtml(a.roll_number)}</span></td>
                <td><strong>${escapeHtml(a.department || 'General')}</strong></td>
                <td>
                    <div style="font-weight: 800; color: var(--text-main);">
                        Room ${escapeHtml(a.room_number)}
                    </div>
                    <span style="font-size: 0.725rem; color: var(--text-muted);">${a.floor !== null ? `Floor ${a.floor}` : ''}</span>
                </td>
                <td>${escapeHtml(a.room_type || 'Standard')}</td>
                <td><span class="font-mono" style="font-size: 0.85rem;">${a.allocated_on || '-'}</span></td>
                <td>
                    <span class="badge ${isActive ? 'badge-success' : 'badge-secondary'}">
                        <span class="badge-dot"></span>
                        ${escapeHtml(a.status)}
                    </span>
                </td>
                <td>
                    <div class="actions-cell">
                        ${isActive ? `
                            <button class="btn btn-warning btn-sm" onclick="vacateAllocation(${a.allocation_id})" title="Vacate Room">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
                                <span>Vacate</span>
                            </button>
                        ` : ''}
                        <button class="btn btn-danger btn-sm" onclick="deleteAllocation(${a.allocation_id})" title="Delete Record">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                            <span>Delete</span>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// Add allocation submit
document.getElementById('allocationForm')?.addEventListener('submit', async function(e) {
    e.preventDefault();

    const student_id = document.getElementById('student_id').value;
    const room_id = document.getElementById('room_id').value;
    const allocated_on = document.getElementById('allocated_on').value;

    if (!student_id || !room_id) {
        showToast('Please select both a student and an available room.', 'warning');
        return;
    }

    try {
        const response = await fetch(API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                student_id: parseInt(student_id),
                room_id: parseInt(room_id),
                allocated_on
            })
        });

        const result = await response.json();

        if (!response.ok) {
            showToast(result.message || 'Error allocating room.', 'danger');
            return;
        }

        showToast(result.message, 'success');
        this.reset();
        closeAllocateModal();
        loadAllocations();
    } catch (err) {
        console.error(err);
        showToast('Network error while allocating room.', 'danger');
    }
});

// Vacate room with custom confirm
async function vacateAllocation(id) {
    const alloc = allAllocations.find(a => a.allocation_id === id);
    const desc = alloc ? `student "${alloc.student_name}" from Room ${alloc.room_number}` : 'this student from their room';

    const confirmed = await showConfirm({
        title: 'Check-out & Vacate Room?',
        message: `Are you sure you want to vacate ${desc}? This will mark their allocation as Completed and immediately release the bed capacity.`,
        confirmText: 'Confirm Vacate',
        isDanger: false
    });

    if (!confirmed) return;

    try {
        const response = await fetch(`${API}/${id}/vacate`, {
            method: 'PUT'
        });

        const result = await response.json();

        if (!response.ok) {
            showToast(result.message || 'Error vacating room.', 'danger');
            return;
        }

        showToast(result.message, 'success');
        loadAllocations();
    } catch (err) {
        console.error(err);
        showToast('Network error while vacating room.', 'danger');
    }
}

// Delete allocation
async function deleteAllocation(id) {
    const confirmed = await showConfirm({
        title: 'Delete Allocation Record?',
        message: 'Are you sure you want to permanently delete this allocation record from the ledger? This action cannot be undone.',
        confirmText: 'Delete Record',
        isDanger: true
    });

    if (!confirmed) return;

    try {
        const response = await fetch(`${API}/${id}`, {
            method: 'DELETE'
        });

        const result = await response.json();

        if (!response.ok) {
            showToast(result.message || 'Error deleting allocation record.', 'danger');
            return;
        }

        showToast(result.message, 'success');
        loadAllocations();
    } catch (err) {
        console.error(err);
        showToast('Network error while deleting allocation record.', 'danger');
    }
}

// Filters
function applyFilters() {
    const statusVal = document.getElementById('allocationStatusFilter')?.value || 'ALL';
    const searchVal = (document.getElementById('searchAllocationInput')?.value || '').toLowerCase().trim();

    const filtered = allAllocations.filter(a => {
        const matchesStatus = statusVal === 'ALL' || a.status === statusVal;
        const matchesSearch = !searchVal || 
            (a.student_name && a.student_name.toLowerCase().includes(searchVal)) ||
            (a.roll_number && a.roll_number.toLowerCase().includes(searchVal)) ||
            (a.room_number && a.room_number.toLowerCase().includes(searchVal)) ||
            (a.department && a.department.toLowerCase().includes(searchVal));

        return matchesStatus && matchesSearch;
    });

    renderAllocations(filtered);
}

document.getElementById('allocationStatusFilter')?.addEventListener('change', applyFilters);
document.getElementById('searchAllocationInput')?.addEventListener('input', applyFilters);

// Export CSV
function exportAllocationsCSV() {
    if (allAllocations.length === 0) return showToast('No allocation records to export', 'warning');

    const headers = ['Allocation ID', 'Student Name', 'Roll Number', 'Department', 'Phone', 'Room Number', 'Room Type', 'Floor', 'Allocated Date', 'Status'];
    const rows = allAllocations.map(a => [
        a.allocation_id,
        a.student_name,
        a.roll_number,
        a.department || '',
        a.phone || '',
        a.room_number,
        a.room_type || '',
        a.floor ?? '',
        a.allocated_on || '',
        a.status
    ]);

    exportToCSV(`hostel_allocations_${new Date().toISOString().split('T')[0]}.csv`, headers, rows);
}

// Initial load
initDateInput();
loadAllocations();
