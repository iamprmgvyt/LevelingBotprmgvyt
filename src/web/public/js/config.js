document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('general-config-form');
    const statusElement = document.getElementById('general-status');

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const guildId = form.getAttribute('data-guild-id');
            const formData = new FormData(form);
            const data = Object.fromEntries(formData.entries());

            // Display loading status
            statusElement.textContent = 'Saving configuration...';
            statusElement.style.color = '#3498db'; // Blue color for loading

            try {
                const response = await fetch(`/dashboard/${guildId}/update`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(data),
                });

                const result = await response.json();

                if (response.ok && result.success) {
                    statusElement.textContent = '✅ Configuration updated successfully!';
                    statusElement.style.color = '#2ecc77'; // Green color for success
                } else {
                    const errorMessage = result.message || 'An unknown error occurred on the server.';
                    statusElement.textContent = `❌ Error: ${errorMessage}`;
                    statusElement.style.color = '#e74c3c'; // Red color for error
                }
            } catch (error) {
                console.error('Fetch error:', error);
                statusElement.textContent = '❌ Network error or server connection failed.';
                statusElement.style.color = '#e74c3c';
            }

            // Clear status after a few seconds
            setTimeout(() => {
                statusElement.textContent = '';
            }, 5000);
        });
    }
});