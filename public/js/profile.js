
async function loadProfile() {
    try {
        const response = await fetch('/api/profile');

        if (!response.ok) {
            throw new Error('Unable to fetch profile');
        }

        const user = await response.json();

        document.getElementById('profileName').textContent = user.name;
        document.getElementById('profileEmail').textContent = user.email;

        document.getElementById('detailName').textContent = user.name;
        document.getElementById('detailEmail').textContent = user.email;
        document.getElementById('detailPhone').textContent = user.phone;

    } catch (error) {
        console.error('Profile loading error:', error);

        document.getElementById('profileName').textContent = 'Unable to load';
        document.getElementById('profileEmail').textContent = 'Please refresh the page';

        document.getElementById('detailName').textContent = 'Unavailable';
        document.getElementById('detailEmail').textContent = 'Unavailable';
        document.getElementById('detailPhone').textContent = 'Unavailable';
    }
}

loadProfile();
