/**
 * HostelMS - Room Management Controller
 */
const API = '/api/rooms';
let allRooms = [];
let currentView = 'table'; // 'table' or 'grid'

// Load all rooms
async function loadRooms() {
    try {
        const response = await fetch(API);
        if (!response.ok) throw new Error('Failed to load rooms');
        
        allRooms = await response.json();
        populateFloorFilter();
        applyFilters();
    } catch (err) {
        console.error(err);
        showToast('Error loading rooms: ' + err.message, 'danger');
        const list = document.getElementById('roomList');
        if (list) {
            list.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--danger); padding: 2.5rem;">Failed to load room inventory. Please check database connection.</td></tr>`;
        }
    }
}

// Switch between Table and Visual Grid view
function switchView(view) {
    currentView = view;
    const tableBtn = document.getElementById('viewTableBtn');
    const gridBtn = document.getElementById('viewGridBtn');
    const tableContainer = document.getElementById('tableViewContainer');
    const gridContainer = document.getElementById('gridViewContainer');

    if (view === 'table') {
        tableBtn.classList.add('active');
        gridBtn.classList.remove('active');
        tableContainer.style.display = 'block';
        gridContainer.style.display = 'none';
    } else {
        gridBtn.classList.add('active');
        tableBtn.classList.remove('active');
        tableContainer.style.display = 'none';
        gridContainer.style.display = 'block';
    }
    applyFilters();
}

// Populate floor filter
function populateFloorFilter() {
    const floorSelect = document.getElementById('floorFilter');
    if (!floorSelect) return;

    const currentVal = floorSelect.value;
    const floors = new Set();
    allRooms.forEach(r => {
        if (r.floor !== null && r.floor !== undefined) floors.add(r.floor);
    });

    floorSelect.innerHTML = '<option value="ALL">All Floors</option>' +
        Array.from(floors).sort((a,b) => a-b).map(f => `<option value="${f}" ${String(f) === currentVal ? 'selected' : ''}>Floor ${f}</option>`).join('');
}

// Render Rooms (both views)
function renderRooms(rooms) {
    const badge = document.getElementById('roomCountBadge');
    if (badge) badge.textContent = `${rooms.length} Room${rooms.length === 1 ? '' : 's'}`;

    renderTableView(rooms);
    renderGridView(rooms);
}

// Render Table View
function renderTableView(rooms) {
    const list = document.getElementById('roomList');
    if (!list) return;

    if (rooms.length === 0) {
        list.innerHTML = `
            <tr>
                <td colspan="8">
                    <div class="empty-state">
                        <svg class="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                        </svg>
                        <h3>No Rooms Found</h3>
                        <p>No rooms match your filter criteria. Click below to add new rooms.</p>
                        <button type="button" class="btn btn-primary btn-sm" onclick="openAddRoomModal()">+ Add Room</button>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    list.innerHTML = rooms.map(room => {
        const occupancy = room.current_occupancy || 0;
        const capacity = room.capacity || 1;
        const availableBeds = Math.max(0, capacity - occupancy);
        const percentage = Math.min(100, Math.round((occupancy / capacity) * 100));

        let badgeClass = 'badge-success';
        if (room.status === 'Full') badgeClass = 'badge-danger';
        else if (room.status === 'Maintenance') badgeClass = 'badge-warning';

        return `
            <tr>
                <td>
                    <div style="font-weight: 800; font-size: 1rem; color: var(--text-main);">
                        Room ${escapeHtml(room.room_number)}
                    </div>
                    <span style="font-size: 0.725rem; color: var(--text-muted);">ID: #${room.room_id}</span>
                </td>
                <td><strong>${escapeHtml(room.room_type || 'Standard')}</strong></td>
                <td>${room.floor !== null && room.floor !== undefined ? `Floor ${room.floor}` : '<span style="color:var(--text-muted)">Ground</span>'}</td>
                <td>
                    <div class="occupancy-container">
                        <div class="occupancy-bar">
                            <div class="occupancy-fill ${occupancy >= capacity ? 'full' : ''}" style="width: ${percentage}%;"></div>
                        </div>
                        <span class="font-mono" style="font-weight: 700; font-size: 0.85rem;">${occupancy}/${capacity}</span>
                    </div>
                </td>
                <td>
                    <span class="badge ${availableBeds > 0 ? 'badge-success' : 'badge-danger'}">
                        <span class="badge-dot"></span>
                        ${availableBeds} ${availableBeds === 1 ? 'bed free' : 'beds free'}
                    </span>
                </td>
                <td>
                    ${room.occupants ? 
                        `<div style="font-size: 0.825rem; font-weight: 600; color: var(--text-main);">
                            👤 ${escapeHtml(room.occupants)}
                        </div>` : 
                        `<span style="color: var(--text-muted); font-size: 0.825rem;">Empty room</span>`
                    }
                </td>
                <td>
                    <span class="badge ${badgeClass}">
                        <span class="badge-dot"></span>
                        ${escapeHtml(room.status)}
                    </span>
                </td>
                <td>
                    <div class="actions-cell">
                        <button class="btn btn-secondary btn-sm" onclick="editRoom(${room.room_id})" title="Edit Room">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                            <span>Edit</span>
                        </button>
                        <button class="btn btn-danger btn-sm" onclick="deleteRoom(${room.room_id})" title="Delete Room">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                            <span>Delete</span>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// Render Visual Grid Matrix View
function renderGridView(rooms) {
    const grid = document.getElementById('roomGrid');
    if (!grid) return;

    if (rooms.length === 0) {
        grid.innerHTML = `<div class="empty-state" style="grid-column: 1 / -1;"><h3>No Rooms Found</h3></div>`;
        return;
    }

    grid.innerHTML = rooms.map(room => {
        const occupancy = room.current_occupancy || 0;
        const capacity = room.capacity || 1;
        const availableBeds = Math.max(0, capacity - occupancy);

        let badgeClass = 'badge-success';
        if (room.status === 'Full') badgeClass = 'badge-danger';
        else if (room.status === 'Maintenance') badgeClass = 'badge-warning';

        // Render bed icons
        let bedIconsHtml = '';
        for (let i = 0; i < capacity; i++) {
            if (i < occupancy) {
                bedIconsHtml += `<div class="bed-icon occupied" title="Occupied Bed">🛏️</div>`;
            } else {
                bedIconsHtml += `<div class="bed-icon free" title="Available Bed">🛏️</div>`;
            }
        }

        return `
            <div class="room-card">
                <div>
                    <div class="room-card-header">
                        <div>
                            <div class="room-number-title">Room ${escapeHtml(room.room_number)}</div>
                            <span class="room-type-tag">${escapeHtml(room.room_type || 'Standard')} &bull; Floor ${room.floor || 0}</span>
                        </div>
                        <span class="badge ${badgeClass}">
                            <span class="badge-dot"></span>
                            ${escapeHtml(room.status)}
                        </span>
                    </div>

                    <div class="bed-slots-row">
                        <span style="font-size: 0.775rem; font-weight: 700; color: var(--text-muted);">BEDS:</span>
                        ${bedIconsHtml}
                        <span class="font-mono" style="margin-left: auto; font-size: 0.8rem; font-weight: 700;">
                            ${occupancy}/${capacity}
                        </span>
                    </div>

                    <div class="room-occupants-list">
                        <strong>Occupants:</strong> ${room.occupants ? escapeHtml(room.occupants) : 'None (Room Empty)'}
                    </div>
                </div>

                <div class="room-card-footer">
                    <div>
                        ${availableBeds > 0 && room.status !== 'Maintenance' ? `
                            <a href="allocation.html" class="btn btn-primary btn-sm" title="Allocate a student to this room">
                                + Allocate Bed
                            </a>
                        ` : `
                            <span style="font-size: 0.775rem; color: var(--text-muted); font-weight: 600;">No Vacancy</span>
                        `}
                    </div>
                    <div class="actions-cell">
                        <button class="btn btn-secondary btn-sm" onclick="editRoom(${room.room_id})">✏️</button>
                        <button class="btn btn-danger btn-sm" onclick="deleteRoom(${room.room_id})">🗑️</button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Modal controls
function openAddRoomModal() {
    const modal = document.getElementById('addRoomModal');
    if (modal) modal.classList.add('active');
    document.getElementById('room_number')?.focus();
}

function closeAddRoomModal() {
    const modal = document.getElementById('addRoomModal');
    if (modal) modal.classList.remove('active');
}

// Add Room form submission
document.getElementById('roomForm')?.addEventListener('submit', async function(e) {
    e.preventDefault();

    const room = {
        room_number: document.getElementById('room_number').value.trim(),
        room_type: document.getElementById('room_type').value,
        capacity: parseInt(document.getElementById('capacity').value),
        floor: document.getElementById('floor').value ? parseInt(document.getElementById('floor').value) : null,
        status: document.getElementById('status').value
    };

    try {
        const response = await fetch(API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(room)
        });

        const result = await response.json();

        if (!response.ok) {
            showToast(result.message || 'Error adding room', 'danger');
            return;
        }

        showToast(result.message, 'success');
        this.reset();
        document.getElementById('capacity').value = '2';
        document.getElementById('floor').value = '1';
        closeAddRoomModal();
        loadRooms();
    } catch (err) {
        console.error(err);
        showToast('Network error while adding room.', 'danger');
    }
});

// Edit room modal open
function editRoom(id) {
    const room = allRooms.find(r => r.room_id === id);
    if (!room) return showToast('Room not found', 'danger');

    document.getElementById('edit_room_id').value = room.room_id;
    document.getElementById('edit_room_number').value = room.room_number;
    document.getElementById('edit_room_type').value = room.room_type || 'Single Sharing';
    document.getElementById('edit_capacity').value = room.capacity;
    document.getElementById('edit_floor').value = room.floor !== null && room.floor !== undefined ? room.floor : '';
    document.getElementById('edit_status').value = room.status || 'Available';

    const modal = document.getElementById('editRoomModal');
    if (modal) modal.classList.add('active');
}

function closeEditRoomModal() {
    const modal = document.getElementById('editRoomModal');
    if (modal) modal.classList.remove('active');
}

// Edit room form submit
document.getElementById('editRoomForm')?.addEventListener('submit', async function(e) {
    e.preventDefault();

    const id = document.getElementById('edit_room_id').value;
    const updatedRoom = {
        room_number: document.getElementById('edit_room_number').value.trim(),
        room_type: document.getElementById('edit_room_type').value,
        capacity: parseInt(document.getElementById('edit_capacity').value),
        floor: document.getElementById('edit_floor').value ? parseInt(document.getElementById('edit_floor').value) : null,
        status: document.getElementById('edit_status').value
    };

    try {
        const response = await fetch(`${API}/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedRoom)
        });

        const result = await response.json();

        if (!response.ok) {
            showToast(result.message || 'Error updating room', 'danger');
            return;
        }

        closeEditRoomModal();
        showToast(result.message, 'success');
        loadRooms();
    } catch (err) {
        console.error(err);
        showToast('Network error while updating room.', 'danger');
    }
});

// Delete room with custom confirmation
async function deleteRoom(id) {
    const room = allRooms.find(r => r.room_id === id);
    const roomNum = room ? room.room_number : id;

    const confirmed = await showConfirm({
        title: 'Delete Room Configuration?',
        message: `Are you sure you want to permanently delete Room ${roomNum}? Note that rooms with active student residents cannot be deleted.`,
        confirmText: 'Delete Room',
        isDanger: true
    });

    if (!confirmed) return;

    try {
        const response = await fetch(`${API}/${id}`, {
            method: 'DELETE'
        });

        const result = await response.json();

        if (!response.ok) {
            showToast(result.message || 'Error deleting room', 'danger');
            return;
        }

        showToast(result.message, 'success');
        loadRooms();
    } catch (err) {
        console.error(err);
        showToast('Network error while deleting room.', 'danger');
    }
}

// Filter logic
function applyFilters() {
    const statusVal = document.getElementById('statusFilter')?.value || 'ALL';
    const floorVal = document.getElementById('floorFilter')?.value || 'ALL';
    const searchVal = (document.getElementById('searchRoomInput')?.value || '').toLowerCase().trim();

    const filtered = allRooms.filter(r => {
        const matchesStatus = statusVal === 'ALL' || r.status === statusVal;
        const matchesFloor = floorVal === 'ALL' || String(r.floor) === floorVal;
        const matchesSearch = !searchVal || 
            (r.room_number && r.room_number.toLowerCase().includes(searchVal)) ||
            (r.room_type && r.room_type.toLowerCase().includes(searchVal)) ||
            (r.occupants && r.occupants.toLowerCase().includes(searchVal));

        return matchesStatus && matchesFloor && matchesSearch;
    });

    renderRooms(filtered);
}

document.getElementById('statusFilter')?.addEventListener('change', applyFilters);
document.getElementById('floorFilter')?.addEventListener('change', applyFilters);
document.getElementById('searchRoomInput')?.addEventListener('input', applyFilters);

// Export CSV
function exportRoomsCSV() {
    if (allRooms.length === 0) return showToast('No rooms to export', 'warning');

    const headers = ['Room ID', 'Room Number', 'Type', 'Floor', 'Capacity', 'Occupancy', 'Available Beds', 'Occupants', 'Status'];
    const rows = allRooms.map(r => [
        r.room_id,
        r.room_number,
        r.room_type || '',
        r.floor ?? '',
        r.capacity,
        r.current_occupancy || 0,
        Math.max(0, r.capacity - (r.current_occupancy || 0)),
        r.occupants || 'None',
        r.status
    ]);

    exportToCSV(`hostel_rooms_${new Date().toISOString().split('T')[0]}.csv`, headers, rows);
}

// Initial load
loadRooms();
