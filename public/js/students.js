/**
 * HostelMS - Student Management Controller
 */
const API = '/api/students';
let allStudents = [];

// Load all students
async function loadStudents() {
    try {
        const response = await fetch(API);
        if (!response.ok) throw new Error('Failed to fetch students');
        
        allStudents = await response.json();
        populateDepartmentFilter();
        applyFilters();
    } catch (err) {
        console.error(err);
        showToast('Error loading students: ' + err.message, 'danger');
        const list = document.getElementById('studentList');
        if (list) {
            list.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--danger); padding: 2.5rem;">Failed to load student directory. Please check database connection.</td></tr>`;
        }
    }
}

// Populate unique departments in dropdown
function populateDepartmentFilter() {
    const deptSelect = document.getElementById('departmentFilter');
    if (!deptSelect) return;

    const currentVal = deptSelect.value;
    const depts = new Set();
    allStudents.forEach(s => {
        if (s.department && s.department.trim()) depts.add(s.department.trim());
    });

    deptSelect.innerHTML = '<option value="ALL">All Departments</option>' + 
        Array.from(depts).sort().map(d => `<option value="${escapeHtml(d)}" ${d === currentVal ? 'selected' : ''}>${escapeHtml(d)}</option>`).join('');
}

// Render student table rows
function renderStudents(students) {
    const list = document.getElementById('studentList');
    const badge = document.getElementById('studentCountBadge');
    if (badge) badge.textContent = `${students.length} Student${students.length === 1 ? '' : 's'}`;

    if (!list) return;

    if (students.length === 0) {
        list.innerHTML = `
            <tr>
                <td colspan="8">
                    <div class="empty-state">
                        <svg class="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                        <h3>No Students Found</h3>
                        <p>No student records match your query. Click below to register new students.</p>
                        <button type="button" class="btn btn-primary btn-sm" onclick="openAddStudentModal()">+ Register Student</button>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    list.innerHTML = students.map(student => {
        const initials = getInitials(student.name);
        const avatarColor = getAvatarColor(student.name);
        const hasRoom = !!student.room_number;

        return `
            <tr>
                <td>
                    <div class="student-cell">
                        <div class="student-avatar" style="background: ${avatarColor}">${initials}</div>
                        <div>
                            <div class="student-meta-name">${escapeHtml(student.name)}</div>
                            <div class="student-meta-sub">ID: #${student.student_id}</div>
                        </div>
                    </div>
                </td>
                <td><span class="font-mono" style="font-weight: 600; font-size: 0.85rem;">${escapeHtml(student.roll_number)}</span></td>
                <td><strong>${escapeHtml(student.department || 'General')}</strong></td>
                <td>${student.year ? `Year ${student.year}` : '-'}</td>
                <td>
                    <div style="font-size: 0.825rem;">
                        ${student.phone ? `<div>📞 ${escapeHtml(student.phone)}</div>` : ''}
                        ${student.email ? `<div style="color: var(--text-muted);">✉️ ${escapeHtml(student.email)}</div>` : ''}
                        ${!student.phone && !student.email ? '<span style="color: var(--text-muted);">-</span>' : ''}
                    </div>
                </td>
                <td>
                    <span class="badge ${student.gender === 'Female' ? 'badge-info' : 'badge-secondary'}">
                        ${escapeHtml(student.gender || 'Not specified')}
                    </span>
                </td>
                <td>
                    ${hasRoom ? 
                        `<span class="badge badge-success">
                            <span class="badge-dot"></span>
                            Room ${escapeHtml(student.room_number)}
                        </span>` : 
                        `<span class="badge badge-warning">
                            <span class="badge-dot"></span>
                            Unassigned
                        </span>`
                    }
                </td>
                <td>
                    <div class="actions-cell">
                        <button class="btn btn-secondary btn-sm" onclick="editStudent(${student.student_id})" title="Edit Details">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                            <span>Edit</span>
                        </button>
                        <button class="btn btn-danger btn-sm" onclick="deleteStudent(${student.student_id})" title="Delete Record">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                            <span>Delete</span>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// Add Student Modal controls
function openAddStudentModal() {
    const modal = document.getElementById('addStudentModal');
    if (modal) modal.classList.add('active');
    document.getElementById('name')?.focus();
}

function closeAddStudentModal() {
    const modal = document.getElementById('addStudentModal');
    if (modal) modal.classList.remove('active');
}

// Add Student submission
document.getElementById('studentForm')?.addEventListener('submit', async function(e) {
    e.preventDefault();

    const student = {
        name: document.getElementById('name').value.trim(),
        roll_number: document.getElementById('roll_number').value.trim(),
        department: document.getElementById('department').value.trim(),
        year: document.getElementById('year').value || null,
        phone: document.getElementById('phone').value.trim(),
        email: document.getElementById('email').value.trim(),
        gender: document.getElementById('gender').value
    };

    try {
        const response = await fetch(API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(student)
        });

        const result = await response.json();

        if (!response.ok) {
            showToast(result.message || 'Error registering student', 'danger');
            return;
        }

        showToast(result.message, 'success');
        this.reset();
        closeAddStudentModal();
        loadStudents();
    } catch (err) {
        console.error(err);
        showToast('Network error while registering student.', 'danger');
    }
});

// Edit student details
function editStudent(id) {
    const student = allStudents.find(s => s.student_id === id);
    if (!student) return showToast('Student record not found', 'danger');

    document.getElementById('edit_student_id').value = student.student_id;
    document.getElementById('edit_name').value = student.name;
    document.getElementById('edit_roll_number').value = student.roll_number;
    document.getElementById('edit_department').value = student.department || '';
    document.getElementById('edit_year').value = student.year || '';
    document.getElementById('edit_phone').value = student.phone || '';
    document.getElementById('edit_email').value = student.email || '';
    document.getElementById('edit_gender').value = student.gender || 'Male';

    const modal = document.getElementById('editStudentModal');
    if (modal) modal.classList.add('active');
}

function closeEditModal() {
    const modal = document.getElementById('editStudentModal');
    if (modal) modal.classList.remove('active');
}

// Edit form submit
document.getElementById('editStudentForm')?.addEventListener('submit', async function(e) {
    e.preventDefault();

    const id = document.getElementById('edit_student_id').value;
    const updatedStudent = {
        name: document.getElementById('edit_name').value.trim(),
        roll_number: document.getElementById('edit_roll_number').value.trim(),
        department: document.getElementById('edit_department').value.trim(),
        year: document.getElementById('edit_year').value || null,
        phone: document.getElementById('edit_phone').value.trim(),
        email: document.getElementById('edit_email').value.trim(),
        gender: document.getElementById('edit_gender').value
    };

    try {
        const updateResponse = await fetch(`${API}/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedStudent)
        });

        const result = await updateResponse.json();

        if (!updateResponse.ok) {
            showToast(result.message || 'Error updating student', 'danger');
            return;
        }

        closeEditModal();
        showToast(result.message, 'success');
        loadStudents();
    } catch (err) {
        console.error(err);
        showToast('Network error while updating student.', 'danger');
    }
});

// Delete student with custom confirmation
async function deleteStudent(id) {
    const student = allStudents.find(s => s.student_id === id);
    const studentName = student ? student.name : 'this student';

    const confirmed = await showConfirm({
        title: 'Delete Student Record?',
        message: `Are you sure you want to permanently remove "${studentName}" from the hostel directory? This action cannot be undone.`,
        confirmText: 'Delete Student',
        isDanger: true
    });

    if (!confirmed) return;

    try {
        const response = await fetch(`${API}/${id}`, {
            method: 'DELETE'
        });

        const result = await response.json();

        if (!response.ok) {
            showToast(result.message || 'Error deleting student', 'danger');
            return;
        }

        showToast(result.message, 'success');
        loadStudents();
    } catch (err) {
        console.error(err);
        showToast('Failed to delete student.', 'danger');
    }
}

// Filter handling
function applyFilters() {
    const searchVal = (document.getElementById('searchStudentInput')?.value || '').toLowerCase().trim();
    const deptVal = document.getElementById('departmentFilter')?.value || 'ALL';
    const genderVal = document.getElementById('genderFilter')?.value || 'ALL';

    const filtered = allStudents.filter(s => {
        const matchesSearch = !searchVal || 
            (s.name && s.name.toLowerCase().includes(searchVal)) ||
            (s.roll_number && s.roll_number.toLowerCase().includes(searchVal)) ||
            (s.department && s.department.toLowerCase().includes(searchVal)) ||
            (s.phone && s.phone.includes(searchVal)) ||
            (s.email && s.email.toLowerCase().includes(searchVal)) ||
            (s.room_number && s.room_number.toLowerCase().includes(searchVal));

        const matchesDept = deptVal === 'ALL' || (s.department && s.department.trim() === deptVal);
        const matchesGender = genderVal === 'ALL' || s.gender === genderVal;

        return matchesSearch && matchesDept && matchesGender;
    });

    renderStudents(filtered);
}

document.getElementById('searchStudentInput')?.addEventListener('input', applyFilters);
document.getElementById('departmentFilter')?.addEventListener('change', applyFilters);
document.getElementById('genderFilter')?.addEventListener('change', applyFilters);

// Export CSV
function exportStudentsCSV() {
    if (allStudents.length === 0) return showToast('No students to export', 'warning');

    const headers = ['ID', 'Name', 'Roll Number', 'Department', 'Year', 'Phone', 'Email', 'Gender', 'Assigned Room'];
    const rows = allStudents.map(s => [
        s.student_id,
        s.name,
        s.roll_number,
        s.department || '',
        s.year || '',
        s.phone || '',
        s.email || '',
        s.gender || '',
        s.room_number ? `Room ${s.room_number}` : 'Unassigned'
    ]);

    exportToCSV(`hostel_students_${new Date().toISOString().split('T')[0]}.csv`, headers, rows);
}

// Initialize
loadStudents();
