// data-integrity.js
// Data Integrity Status Page JavaScript

const API_URL = 'http://localhost:3000/api';
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

// Verify Integrity Function
async function verifyIntegrity() {
    const verifyBtn = document.getElementById('verifyBtn');
    const statusDiv = document.getElementById('integrityStatus');

    verifyBtn.disabled = true;
    verifyBtn.textContent = 'Verifying...';
    statusDiv.innerHTML = '<div class="integrity-loading">🔍 Verifying cryptographic integrity...</div>';

    try {
        const response = await fetch(`${API_URL}/parking/verify-integrity`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const result = await response.json();

        if (result.success && result.isValid) {
            // Data is valid
            statusDiv.innerHTML = `
                <div class="integrity-verified">
                    <div class="integrity-icon">✅</div>
                    <div class="integrity-details">
                        <h3>Data Integrity Verified</h3>
                        <p><strong>Status:</strong> All parking logs are cryptographically valid</p>
                        <p><strong>Total Logs Verified:</strong> ${result.totalLogs || 0}</p>
                        <p><strong>Chain Status:</strong> Unbroken</p>
                        <p><strong>Last Verified:</strong> ${new Date().toLocaleString()}</p>
                    </div>
                </div>
            `;
            showMessage('✓ Data integrity verification successful!', 'success');
        } else {
            // Data has been tampered
            statusDiv.innerHTML = `
                <div class="integrity-tampered">
                    <div class="integrity-icon">❌</div>
                    <div class="integrity-details">
                        <h3>Data Integrity Compromised</h3>
                        <p><strong>Status:</strong> Tampering detected in parking logs</p>
                        <p><strong>Issues Found:</strong> ${result.errors ? result.errors.length : 0}</p>
                        <p><strong>Action Required:</strong> Immediate investigation needed</p>
                        ${result.errors ? `<p><strong>Details:</strong> ${result.errors.join(', ')}</p>` : ''}
                    </div>
                </div>
            `;
            showMessage('✗ Data integrity verification failed! Tampering detected.', 'error');
        }
    } catch (error) {
        console.error('Integrity verification error:', error);
        statusDiv.innerHTML = `
            <div class="integrity-error">
                <p>⚠️ Error verifying data integrity</p>
                <p>Please check if the backend server is running and try again.</p>
            </div>
        `;
        showMessage('✗ Server error. Please check if the backend is running.', 'error');
    } finally {
        verifyBtn.disabled = false;
        verifyBtn.textContent = 'Verify Now';
    }
}

// Show message box
function showMessage(message, type) {
    const messageBox = document.getElementById('messageBox');
    messageBox.textContent = message;
    messageBox.className = `message-box ${type}`;
    messageBox.style.display = 'block';

    // Scroll to top to show message
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Auto-hide after 5 seconds
    setTimeout(() => {
        messageBox.style.display = 'none';
    }, 5000);
}
