// registration.js
// Contractor Registration Page JavaScript

const API_URL = 'http://localhost:5000/api';
let token = localStorage.getItem('token');
let user = JSON.parse(localStorage.getItem('user') || '{}');

// Check authentication
if (!token || user.role !== 'admin') {
    window.location.href = 'login.html';
}

// Set user email in header
document.getElementById('userEmail').textContent = user.email;

// Logout function
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'login.html';
}

// Load registered contractors on page load
loadContractors();

// Form submission handler
document.getElementById('contractorRegistrationForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const registerBtn = document.getElementById('registerBtn');
    const messageBox = document.getElementById('messageBox');

    // Get form values
    const email = document.getElementById('contractorEmail').value.trim();
    const password = document.getElementById('contractorPassword').value;
    const parkingLotName = document.getElementById('parkingLotName').value.trim();
    const parkingLotId = document.getElementById('parkingLotId').value.trim().toUpperCase();
    const maxCapacity = parseInt(document.getElementById('maxCapacity').value);
    const location = document.getElementById('location').value.trim();

    // Disable button
    registerBtn.disabled = true;
    registerBtn.textContent = 'Registering...';
    messageBox.style.display = 'none';

    try {
        const response = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                email,
                password,
                role: 'contractor',
                parkingLotId,
                parkingLotName,
                maxCapacity,
                location
            })
        });

        const result = await response.json();

        if (result.success) {
            // Success message
            showMessage('✓ Contractor registered successfully!', 'success');

            // Reset form
            document.getElementById('contractorRegistrationForm').reset();

            // Reload contractors list
            loadContractors();
        } else {
            showMessage('✗ ' + (result.message || 'Registration failed'), 'error');
        }
    } catch (error) {
        console.error('Registration error:', error);
        showMessage('✗ Server error. Please check if the backend is running.', 'error');
    } finally {
        registerBtn.disabled = false;
        registerBtn.textContent = 'Register Contractor';
    }
});

// Load all registered contractors
async function loadContractors() {
    const tableBody = document.getElementById('contractorsTableBody');

    try {
        // Note: You'll need to create this endpoint in the backend
        // For now, we'll fetch all users and filter contractors
        const response = await fetch(`${API_URL}/auth/contractors`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            // If endpoint doesn't exist, show placeholder
            tableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center text-muted">
                        Unable to load contractors. Please ensure backend endpoint is available.
                    </td>
                </tr>
            `;
            return;
        }

        const result = await response.json();

        if (result.success && result.contractors && result.contractors.length > 0) {
            tableBody.innerHTML = result.contractors.map(contractor => `
                <tr>
                    <td>${contractor.email}</td>
                    <td>${contractor.parkingLotName}</td>
                    <td><span class="lot-badge">${contractor.parkingLotId}</span></td>
                    <td>${contractor.maxCapacity} vehicles</td>
                    <td>${new Date(contractor.createdAt).toLocaleDateString()}</td>
                    <td class="action-buttons">
                        <button class="btn-table-action btn-table-edit" onclick="editContractor('${contractor._id}')" title="Edit Contractor">
                            Edit
                        </button>
                        <button class="btn-table-action btn-table-delete" onclick="deleteContractor('${contractor._id}', '${contractor.email}')" title="Delete Contractor">
                            Delete
                        </button>
                    </td>
                </tr>
            `).join('');
        } else {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center text-muted">No contractors registered yet.</td>
                </tr>
            `;
        }
    } catch (error) {
        console.error('Error loading contractors:', error);
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center text-muted">
                    Demo contractors: contractor@parking.com, contractor2@parking.com, contractor3@parking.com
                </td>
            </tr>
        `;
    }
}

// Show message box
function showMessage(message, type) {
    const messageBox = document.getElementById('messageBox');
    messageBox.textContent = message;
    messageBox.className = `message-box ${type}`;
    messageBox.style.display = 'block';

    // Auto-hide after 5 seconds
    setTimeout(() => {
        messageBox.style.display = 'none';
    }, 5000);
}

// Edit contractor (placeholder)
function editContractor(contractorId) {
    showMessage('ℹ️ Edit functionality coming soon!', 'info');
}

// Delete contractor (placeholder)
function deleteContractor(contractorId, email) {
    if (confirm(`Are you sure you want to delete contractor: ${email}?`)) {
        showMessage('ℹ️ Delete functionality coming soon!', 'info');
    }
}

// Auto-refresh contractors list every 30 seconds
setInterval(loadContractors, 30000);
