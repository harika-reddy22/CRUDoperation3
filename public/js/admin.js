
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const response = await fetch('/api/admin/stats');

        if (!response.ok) {
            throw new Error('Failed to fetch admin statistics');
        }

        const stats = await response.json();

        document.getElementById('adminTotal').textContent = stats.total;
        document.getElementById('adminPending').textContent = stats.pending;
        document.getElementById('adminReview').textContent = stats.underReview;
        document.getElementById('adminResolved').textContent = stats.resolved;

    } catch (error) {
        console.error('Dashboard statistics error:', error);
    }
});


async function loadAdminComplaints() {
    const tableBody = document.getElementById('adminComplaintsTable');

    try {
        const response = await fetch('/api/admin/complaints');

        if (!response.ok) {
            throw new Error('Unable to load complaints');
        }

        const complaints = await response.json();
        tableBody.replaceChildren();

        if (complaints.length === 0) {
            const row = document.createElement('tr');
            const cell = document.createElement('td');
            cell.colSpan = 7;
            cell.textContent = 'No complaints submitted yet.';
            cell.className = 'loading-message';
            row.appendChild(cell);
            tableBody.appendChild(row);
            return;
        }

        complaints.forEach(complaint => {
            const row = document.createElement('tr');

            const values = [
                `#${complaint.complaint_id}`,
                complaint.subject,
                `${complaint.user_name}\n${complaint.user_email}`,
                complaint.category,
                new Date(complaint.complaint_date).toLocaleDateString('en-IN')
            ];

            values.forEach(value => {
                const cell = document.createElement('td');
                cell.textContent = value || '—';
                row.appendChild(cell);
            });

            // Current status
            const statusCell = document.createElement('td');
            const badge = document.createElement('span');

            badge.className = 'status-badge ' +
                complaint.status.toLowerCase().replace(/\s+/g, '-');

            badge.textContent = complaint.status;
            statusCell.appendChild(badge);
            row.appendChild(statusCell);

            // Status update controls
            const actionCell = document.createElement('td');

            const select = document.createElement('select');
            select.className = 'status-select';

            ['Pending', 'Under Review', 'Resolved'].forEach(status => {
                const option = document.createElement('option');
                option.value = status;
                option.textContent = status;
                option.selected = status === complaint.status;
                select.appendChild(option);
            });

            const button = document.createElement('button');
            button.textContent = 'Update';
            button.className = 'status-update-btn';

            button.addEventListener('click', async () => {
                button.disabled = true;
                button.textContent = 'Saving...';

                try {
                    const updateResponse = await fetch(
                        `/api/admin/complaints/${complaint.complaint_id}/status`,
                        {
                            method: 'PUT',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                status: select.value
                            })
                        }
                    );

                    const result = await updateResponse.json();

                    if (!updateResponse.ok) {
                        throw new Error(result.message || 'Update failed');
                    }

                   showAdminMessage('Complaint status updated successfully!');

                    await loadAdminComplaints();
                    await refreshAdminStats();

                } catch (error) {
                    alert(error.message);
                    button.disabled = false;
                    button.textContent = 'Update';
                }
            });

        // View complaint details button
const viewButton = document.createElement('button');
viewButton.textContent = 'View Details';
viewButton.className = 'view-details-btn';

viewButton.addEventListener('click', () => {
    document.getElementById('detailId').textContent =
        `#${complaint.complaint_id}`;

    document.getElementById('detailSubject').textContent =
        complaint.subject;

    document.getElementById('detailCategory').textContent =
        complaint.category;

    document.getElementById('detailUser').textContent =
        complaint.user_name;

    document.getElementById('detailEmail').textContent =
        complaint.user_email;

    document.getElementById('detailDate').textContent =
        new Date(complaint.complaint_date).toLocaleDateString('en-IN');

    document.getElementById('detailStatus').textContent =
        complaint.status;

    document.getElementById('detailDescription').textContent =
        complaint.description;

    document.getElementById('complaintModal').classList.add('show');
});

actionCell.appendChild(select);
actionCell.appendChild(button);
actionCell.appendChild(viewButton);

row.appendChild(actionCell);

            tableBody.appendChild(row);
        });

    } catch (error) {
        console.error('Complaint loading error:', error);
        tableBody.innerHTML =
            '<tr><td colspan="7" class="loading-message">Unable to load complaints.</td></tr>';
    }
}


// Refresh dashboard statistics after an update
async function refreshAdminStats() {
    try {
        const response = await fetch('/api/admin/stats');

        if (!response.ok) {
            throw new Error('Unable to refresh statistics');
        }

        const stats = await response.json();

        document.getElementById('adminTotal').textContent = stats.total;
        document.getElementById('adminPending').textContent = stats.pending;
        document.getElementById('adminReview').textContent = stats.underReview;
        document.getElementById('adminResolved').textContent = stats.resolved;

    } catch (error) {
        console.error('Statistics refresh error:', error);
    }
}

loadAdminComplaints();

// Add a new department
const departmentForm = document.getElementById('departmentForm');

if (departmentForm) {
    departmentForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const message = document.getElementById('departmentMessage');
        const button = departmentForm.querySelector('button[type="submit"]');

        const departmentData = {
            department_name: document.getElementById('departmentName').value.trim(),
            contact_person: document.getElementById('contactPerson').value.trim(),
            email: document.getElementById('departmentEmail').value.trim(),
            phone: document.getElementById('departmentPhone').value.trim()
        };

        button.disabled = true;
        button.textContent = 'Saving...';
        message.textContent = '';

        try {
            const response = await fetch('/api/admin/departments', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(departmentData)
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || 'Unable to add department.');
            }

            message.style.color = '#34734B';
            message.textContent = 'Department added successfully!';

            departmentForm.reset();
            await loadDepartments();

        } catch (error) {
            message.style.color = '#B33A3A';
            message.textContent = error.message;

        } finally {
            button.disabled = false;
            button.textContent = '+ Add Department';
        }
    });
}


// Load registered departments
async function loadDepartments() {
    const departmentList = document.getElementById('departmentList');
    const departmentCount = document.getElementById('departmentCount');

    if (!departmentList) return;

    try {
        const response = await fetch('/api/admin/departments');

        if (!response.ok) {
            throw new Error('Unable to load departments.');
        }

        const departments = await response.json();

        departmentList.replaceChildren();
        departmentCount.textContent =
            `${departments.length} Department${departments.length === 1 ? '' : 's'}`;

        if (departments.length === 0) {
            const empty = document.createElement('p');
            empty.className = 'loading-message';
            empty.textContent = 'No departments added yet. Add your first department above.';
            departmentList.appendChild(empty);
            return;
        }
    
departments.forEach(department => {
    const card = document.createElement('article');
    card.className = 'department-card';

    const heading = document.createElement('h4');
    heading.textContent = department.department_name;

    const contact = document.createElement('p');
    contact.textContent = `Contact: ${department.contact_person}`;

    const email = document.createElement('p');
    email.textContent = `Email: ${department.email}`;

    const phone = document.createElement('p');
    phone.textContent = `Phone: ${department.phone}`;

    const actions = document.createElement('div');
    actions.className = 'department-actions';

    const editButton = document.createElement('button');
    editButton.textContent = 'Edit';
    editButton.className = 'department-edit-btn';

    editButton.addEventListener('click', async () => {
        const name = prompt('Department Name:', department.department_name);
        if (name === null) return;

        const person = prompt('Contact Person:', department.contact_person);
        if (person === null) return;

        const departmentEmail = prompt('Email:', department.email);
        if (departmentEmail === null) return;

        const departmentPhone = prompt('Phone:', department.phone);
        if (departmentPhone === null) return;

        try {
            const response = await fetch(
                `/api/admin/departments/${department.department_id}`,
                {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        department_name: name,
                        contact_person: person,
                        email: departmentEmail,
                        phone: departmentPhone
                    })
                }
            );

            const result = await response.json();

            if (!response.ok) throw new Error(result.message);

            alert('Department updated successfully!');
            await loadDepartments();

        } catch (error) {
            alert(error.message || 'Unable to update department.');
        }
    });

    const deleteButton = document.createElement('button');
    deleteButton.textContent = 'Delete';
    deleteButton.className = 'department-delete-btn';

    deleteButton.addEventListener('click', async () => {
        const confirmed = confirm(
            `Are you sure you want to delete ${department.department_name}?`
        );

        if (!confirmed) return;

        try {
            const response = await fetch(
                `/api/admin/departments/${department.department_id}`,
                { method: 'DELETE' }
            );

            const result = await response.json();

            if (!response.ok) throw new Error(result.message);

            alert('Department deleted successfully!');
            await loadDepartments();

        } catch (error) {
            alert(error.message || 'Unable to delete department.');
        }
    });

    actions.append(editButton, deleteButton);
    card.append(heading, contact, email, phone, actions);

    departmentList.appendChild(card);
});

        

    } catch (error) {
        console.error('Department loading error:', error);
        departmentList.textContent = 'Unable to load departments. Please refresh.';
    }
}

loadDepartments();
const complaintModal = document.getElementById('complaintModal');
const closeComplaintModal = document.getElementById('closeComplaintModal');

if (complaintModal && closeComplaintModal) {
    closeComplaintModal.addEventListener('click', () => {
        complaintModal.classList.remove('show');
    });

    complaintModal.addEventListener('click', (event) => {
        if (event.target === complaintModal) {
            complaintModal.classList.remove('show');
        }
    });
}
document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
        document.getElementById('complaintModal')
            ?.classList.remove('show');
    }
});
const complaintSearch = document.getElementById('complaintSearch');
const complaintFilter = document.getElementById('complaintFilter');

function filterComplaints() {
    const searchText = complaintSearch.value.toLowerCase().trim();
    const selectedStatus = complaintFilter.value;

    document.querySelectorAll('#adminComplaintsTable tr').forEach(row => {
        const rowText = row.textContent.toLowerCase();
        const statusCell = row.querySelector('.status-badge');

        const matchesSearch = rowText.includes(searchText);
        const matchesStatus = selectedStatus === 'All' ||
            (statusCell && statusCell.textContent.trim() === selectedStatus);

        row.style.display = matchesSearch && matchesStatus ? '' : 'none';
    });
}

complaintSearch.addEventListener('input', filterComplaints);
complaintFilter.addEventListener('change', filterComplaints);
function showAdminMessage(message) {
    let notice = document.getElementById('adminNotice');

    if (!notice) {
        notice = document.createElement('div');
        notice.id = 'adminNotice';
        notice.className = 'admin-notice';
        document.body.appendChild(notice);
    }

    notice.textContent = message;
    notice.classList.add('show');

    setTimeout(() => {
        notice.classList.remove('show');
    }, 3000);
}