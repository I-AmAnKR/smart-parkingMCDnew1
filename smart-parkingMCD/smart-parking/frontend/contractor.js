const API_URL = 'http://localhost:3000/api';
let token = localStorage.getItem('token');
let user = JSON.parse(localStorage.getItem('user') || '{}');

// Check authentication
if (!token || user.role !== 'contractor') {
    window.location.href = 'login.html';
}

// Initialize page
document.getElementById('userEmail').textContent = user.email;
document.getElementById('parkingLotName').textContent = user.parkingLotName || 'Parking Lot';
document.getElementById('maxCapacity').textContent = user.maxCapacity || 0;

// Load initial status
loadStatus();
loadRecentLogs();

// Auto-refresh every 10 seconds
setInterval(() => {
    loadStatus();
    loadRecentLogs();
}, 10000);

// Navigation function
function setActiveNav(element) {
    // Remove active class from all nav items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    // Add active class to clicked item
    element.classList.add('active');
}

async function loadStatus() {
    try {
        const response = await fetch(`${API_URL}/parking/status`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const result = await response.json();
        if (result.success) {
            const { currentOccupancy, maxCapacity, isOverCapacity, utilizationPercent } = result.data;

            document.getElementById('currentOccupancy').textContent = currentOccupancy;

            // Update status badge
            const statusBadge = document.getElementById('statusBadge');
            if (isOverCapacity) {
                statusBadge.className = 'status-badge status-violation';
                statusBadge.textContent = `⚠️ OVER CAPACITY (${utilizationPercent}%)`;
            } else if (utilizationPercent >= 90) {
                statusBadge.className = 'status-badge status-warning';
                statusBadge.textContent = `Near Capacity (${utilizationPercent}%)`;
            } else {
                statusBadge.className = 'status-badge status-normal';
                statusBadge.textContent = `Normal Operation (${utilizationPercent}%)`;
            }
        }
    } catch (error) {
        console.error('Error loading status:', error);
    }
}

async function loadRecentLogs() {
    try {
        const response = await fetch(`${API_URL}/parking/logs`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const result = await response.json();
        if (result.success && result.data.length > 0) {
            const logsHtml = result.data.slice(0, 10).map(log => {
                const time = new Date(log.timestamp).toLocaleString();
                const actionClass = log.action === 'entry' ? 'log-entry' : 'log-exit';
                const violationClass = log.isViolation ? 'log-violation' : '';

                return `
                    <div class="log-item ${actionClass} ${violationClass}">
                        <span class="log-time">${time}</span>
                        <span class="log-action">${log.action === 'entry' ? '➕ Entry' : '➖ Exit'}</span>
                        <span class="log-occupancy">${log.currentOccupancy}/${log.maxCapacity}</span>
                        ${log.isViolation ? '<span class="log-flag">⚠️ VIOLATION</span>' : ''}
                    </div>
                `;
            }).join('');

            document.getElementById('recentLogs').innerHTML = logsHtml;
        } else {
            document.getElementById('recentLogs').innerHTML = '<p class="text-muted">No activity yet</p>';
        }
    } catch (error) {
        console.error('Error loading logs:', error);
    }
}

async function logEntry() {
    const entryBtn = document.getElementById('entryBtn');
    const actionMessage = document.getElementById('actionMessage');

    entryBtn.disabled = true;
    entryBtn.textContent = 'Processing...';
    actionMessage.style.display = 'none';

    try {
        const response = await fetch(`${API_URL}/parking/entry`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        const result = await response.json();

        if (result.success) {
            actionMessage.className = 'action-message success';
            actionMessage.textContent = '✓ Vehicle entry logged successfully';

            if (result.data.isViolation) {
                actionMessage.className = 'action-message warning';
                actionMessage.textContent = `⚠️ WARNING: Capacity exceeded by ${result.data.violationAmount} vehicles!`;
            }
        } else {
            actionMessage.className = 'action-message error';
            actionMessage.textContent = '✗ ' + result.message;
        }

        actionMessage.style.display = 'block';
        loadStatus();
        loadRecentLogs();
    } catch (error) {
        actionMessage.className = 'action-message error';
        actionMessage.textContent = '✗ Failed to log entry';
        actionMessage.style.display = 'block';
    } finally {
        entryBtn.disabled = false;
        entryBtn.textContent = '➕ Vehicle Entry';
    }
}

async function logExit() {
    const exitBtn = document.getElementById('exitBtn');
    const actionMessage = document.getElementById('actionMessage');

    exitBtn.disabled = true;
    exitBtn.textContent = 'Processing...';
    actionMessage.style.display = 'none';

    try {
        const response = await fetch(`${API_URL}/parking/exit`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        const result = await response.json();

        if (result.success) {
            actionMessage.className = 'action-message success';
            actionMessage.textContent = '✓ Vehicle exit logged successfully';
        } else {
            actionMessage.className = 'action-message error';
            actionMessage.textContent = '✗ ' + result.message;
        }

        actionMessage.style.display = 'block';
        loadStatus();
        loadRecentLogs();
    } catch (error) {
        actionMessage.className = 'action-message error';
        actionMessage.textContent = '✗ Failed to log exit';
        actionMessage.style.display = 'block';
    } finally {
        exitBtn.disabled = false;
        exitBtn.textContent = '➖ Vehicle Exit';
    }
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'login.html';
}
