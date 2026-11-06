
const complaintList = document.getElementById('complaintList');

async function loadComplaints() {
    try {
        const response = await fetch('/api/my-complaints');

        if (!response.ok) {
            throw new Error('Unable to load complaints');
        }

        const complaints = await response.json();

        if (complaints.length === 0) {
            complaintList.innerHTML = `
                <div class="empty-message">
                    <h3>No complaints yet</h3>
                    <p>You haven't submitted any complaints.</p>
                    <a href="/complaints/new">Submit your first complaint</a>
                </div>
            `;
            return;
        }

        complaintList.innerHTML = complaints.map(item => `
            <article class="complaint-card">
                <h3>${escapeHTML(item.subject)}</h3>
                <p><strong>Complaint ID:</strong> ${item.complaint_id}</p>
                <p><strong>Category:</strong> ${escapeHTML(item.category)}</p>
                <p><strong>Description:</strong> ${escapeHTML(item.description)}</p>

                <div class="complaint-meta">
                    <span>Date: ${formatDate(item.complaint_date)}</span>
                    <span class="status">${escapeHTML(item.status)}</span>
                </div>
            </article>
        `).join('');

    } catch (error) {
        complaintList.textContent =
            'Unable to load complaints. Please refresh the page.';
        console.error(error);
    }
}

function escapeHTML(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    })[char]);
}

function formatDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Not available';

    return date.toLocaleDateString('en-IN');
}

loadComplaints();
