// data-integrity.js
// Data Integrity Status Page JavaScript

const API_URL = 'https://smart-parking-mcd-b.onrender.com/api';
let token = localStorage.getItem('token');
let user = JSON.parse(localStorage.getItem('user') || '{}');

// Check authentication
if (!token || user.role !== 'admin') {
    window.location.href = 'index.html';
}

// Set user email in header
document.getElementById('userEmail').textContent = user.email;

// Logout function
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'index.html';
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
            const errors = result.errors || [];
            const affectedLots = [...new Set(errors.map(e => e.parkingLotName))];
            const errorsByLot = {};

            // Group errors by parking lot
            errors.forEach(error => {
                if (!errorsByLot[error.parkingLotName]) {
                    errorsByLot[error.parkingLotName] = [];
                }
                errorsByLot[error.parkingLotName].push(error);
            });

            const lotDetailsHtml = Object.entries(errorsByLot).map(([lotName, errors]) => `
                <div style="margin: 10px 0; padding: 10px; background: #fff3cd; border-left: 4px solid #dc3545; border-radius: 4px;">
                    <strong>🏢 ${lotName}</strong>
                    <ul style="margin: 5px 0; padding-left: 20px;">
                        ${errors.map(e => `<li>${e.issue}</li>`).join('')}
                    </ul>
                </div>
            `).join('');

            statusDiv.innerHTML = `
                <div class="integrity-tampered">
                    <div class="integrity-icon">❌</div>
                    <div class="integrity-details">
                        <h3>Data Integrity Compromised</h3>
                        <p><strong>Status:</strong> Tampering detected in parking logs</p>
                        <p><strong>Affected Parking Lots:</strong> ${affectedLots.join(', ')}</p>
                        <p><strong>Total Issues Found:</strong> ${result.errors.length}</p>
                        <p><strong>Action Required:</strong> Immediate investigation needed</p>
                        <div style="margin-top: 15px;">
                            <h4 style="margin-bottom: 10px;">Details by Parking Lot:</h4>
                            ${lotDetailsHtml}
                        </div>
                    </div>
                </div>
            `;
            showMessage(`✗ Data integrity violation! ${affectedLots.length} parking lot(s) affected. Admin has been notified.`, 'error');
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
