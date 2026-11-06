fetch('/api/user')
    .then(response => response.json())
    .then(user => {
        document.getElementById('welcomeName').textContent = user.name;
    })
    .catch(error => console.error('User loading error:', error));async function loadDashboardStats() {
    try {
        const response = await fetch('/api/dashboard-stats');

        if (!response.ok) {
            throw new Error('Unable to load dashboard statistics');
        }

        const stats = await response.json();

        document.getElementById('totalComplaints').textContent =
            stats.total;

        document.getElementById('pendingComplaints').textContent =
            stats.pending;

        document.getElementById('resolvedComplaints').textContent =
            stats.resolved;

    } catch (error) {
        console.error('Dashboard error:', error);
    }
}

loadDashboardStats();