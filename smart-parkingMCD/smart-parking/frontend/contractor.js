const API_URL = 'http://localhost:5000/api';
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
loadContractorStats();

// Auto-refresh every 10 seconds
setInterval(() => {
    loadStatus();
    loadRecentLogs();
    loadContractorStats();
}, 10000);

// Load contractor statistics
async function loadContractorStats() {
    try {
        const { parkingLotId } = user;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Get today's logs
        const response = await fetch(`${API_URL}/parking/logs`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const result = await response.json();
        if (result.success) {
            const logs = result.data;

            // Filter today's logs
            const todayLogs = logs.filter(log => new Date(log.timestamp) >= today);

            // Count entries and exits
            const entries = todayLogs.filter(log => log.action === 'entry').length;
            const exits = todayLogs.filter(log => log.action === 'exit').length;

            // Get current occupancy from latest log
            const latestLog = logs[0];
            const currentOccupancy = latestLog ? latestLog.currentOccupancy : 0;

            // Update stat boxes
            document.getElementById('todayEntries').textContent = entries;
            document.getElementById('todayExits').textContent = exits;
            document.getElementById('currentOccupancyStat').textContent = currentOccupancy;
        }
    } catch (error) {
        console.error('Error loading contractor stats:', error);
    }
}


// ========== SHIFT TIMER FUNCTIONALITY ==========
let shiftStartTime = null;
let shiftEndTime = null;
let timerInterval = null;
let currentShiftType = 'morning'; // 'morning' or 'night'

// Shift schedules
const SHIFT_SCHEDULES = {
    morning: {
        start: '9:00 AM',
        end: '5:00 PM',
        icon: '☀️'
    },
    night: {
        start: '5:00 PM',
        end: '11:00 PM',
        icon: '🌙'
    }
};

function selectShift(shiftType) {
    // Don't allow changing shift if one is already active
    if (shiftStartTime && !shiftEndTime) {
        alert('Please end the current shift before selecting a different shift type.');
        return;
    }

    currentShiftType = shiftType;
    localStorage.setItem('currentShiftType', shiftType);

    // Update button styles
    const morningBtn = document.getElementById('morningShiftBtn');
    const nightBtn = document.getElementById('nightShiftBtn');

    if (shiftType === 'morning') {
        morningBtn.style.background = 'rgba(255,255,255,0.2)';
        morningBtn.style.border = '2px solid white';
        nightBtn.style.background = 'rgba(255,255,255,0.1)';
        nightBtn.style.border = '2px solid rgba(255,255,255,0.3)';
    } else {
        nightBtn.style.background = 'rgba(255,255,255,0.2)';
        nightBtn.style.border = '2px solid white';
        morningBtn.style.background = 'rgba(255,255,255,0.1)';
        morningBtn.style.border = '2px solid rgba(255,255,255,0.3)';
    }

    // Update scheduled times
    updateScheduledTimes();
}

function updateScheduledTimes() {
    const schedule = SHIFT_SCHEDULES[currentShiftType];
    document.getElementById('scheduledStart').textContent = `Scheduled: ${schedule.start}`;
    document.getElementById('scheduledEnd').textContent = `Scheduled: ${schedule.end}`;
}


function initializeShiftTimer() {
    // Load saved shift type
    const savedShiftType = localStorage.getItem('currentShiftType');
    if (savedShiftType) {
        currentShiftType = savedShiftType;
        selectShift(currentShiftType);
    } else {
        updateScheduledTimes();
    }

    // Load saved shift data from localStorage
    const savedShiftStart = localStorage.getItem('shiftStartTime');
    const savedShiftEnd = localStorage.getItem('shiftEndTime');

    if (savedShiftStart) {
        shiftStartTime = new Date(savedShiftStart);
        updateShiftDisplay();

        if (!savedShiftEnd) {
            // Shift is still active
            startTimer();
            const statusElement = document.getElementById('shiftStatus');
            statusElement.textContent = 'Active';
            statusElement.style.color = '#28a745';
            document.getElementById('startShiftBtn').disabled = true;
            document.getElementById('startShiftBtn').style.opacity = '0.5';
            document.getElementById('endShiftBtn').disabled = false;
            document.getElementById('endShiftBtn').style.opacity = '1';
        } else {
            // Shift has ended
            shiftEndTime = new Date(savedShiftEnd);
            updateShiftDisplay();
        }
    }
}

function startShift() {
    shiftStartTime = new Date();
    shiftEndTime = null;

    // Save to localStorage
    localStorage.setItem('shiftStartTime', shiftStartTime.toISOString());
    localStorage.removeItem('shiftEndTime');

    // Update UI
    const statusElement = document.getElementById('shiftStatus');
    statusElement.textContent = 'Active';
    statusElement.style.color = '#28a745';
    document.getElementById('startShiftBtn').disabled = true;
    document.getElementById('startShiftBtn').style.opacity = '0.5';
    document.getElementById('endShiftBtn').disabled = false;
    document.getElementById('endShiftBtn').style.opacity = '1';

    updateShiftDisplay();
    startTimer();

    console.log('✅ Shift started at:', shiftStartTime.toLocaleTimeString());
}

function endShift() {
    if (!shiftStartTime) return;

    shiftEndTime = new Date();

    // Save to localStorage
    localStorage.setItem('shiftEndTime', shiftEndTime.toISOString());

    // Stop timer
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }

    // Update UI
    const statusElement = document.getElementById('shiftStatus');
    statusElement.textContent = 'Ended';
    statusElement.style.color = '#dc3545';
    document.getElementById('endShiftBtn').disabled = true;
    document.getElementById('endShiftBtn').style.opacity = '0.5';

    updateShiftDisplay();

    console.log('✅ Shift ended at:', shiftEndTime.toLocaleTimeString());

    // Show summary
    const duration = shiftEndTime - shiftStartTime;
    const hours = Math.floor(duration / (1000 * 60 * 60));
    const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));
    alert(`Shift Completed!\n\nDuration: ${hours}h ${minutes}m\nStart: ${shiftStartTime.toLocaleTimeString()}\nEnd: ${shiftEndTime.toLocaleTimeString()}`);
}

function startTimer() {
    // Clear any existing timer
    if (timerInterval) {
        clearInterval(timerInterval);
    }

    // Update immediately
    updateTimeElapsed();

    // Update every second
    timerInterval = setInterval(updateTimeElapsed, 1000);
}

function updateTimeElapsed() {
    if (!shiftStartTime) return;

    const now = shiftEndTime || new Date();
    const elapsed = now - shiftStartTime;

    const hours = Math.floor(elapsed / (1000 * 60 * 60));
    const minutes = Math.floor((elapsed % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((elapsed % (1000 * 60)) / 1000);

    const timeString = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    document.getElementById('timeElapsed').textContent = timeString;
}

function updateShiftDisplay() {
    if (shiftStartTime) {
        document.getElementById('shiftStartTime').textContent = shiftStartTime.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    if (shiftEndTime) {
        document.getElementById('shiftEndTime').textContent = shiftEndTime.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });
    } else {
        document.getElementById('shiftEndTime').textContent = '--:--';
    }

    updateTimeElapsed();
}

// Initialize shift timer after all functions are defined
initializeShiftTimer();

// ========== END SHIFT TIMER FUNCTIONALITY ==========


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
    const vehicleType = document.getElementById('vehicleType').value;
    const vehicleNumber = document.getElementById('vehicleNumber').value.trim();

    if (!vehicleNumber) {
        actionMessage.style.background = '#fff3cd';
        actionMessage.style.color = '#856404';
        actionMessage.style.border = '1px solid #ffc107';
        actionMessage.textContent = 'Please enter vehicle number';
        actionMessage.style.display = 'block';
        return;
    }

    entryBtn.disabled = true;
    entryBtn.innerHTML = 'Processing...';
    actionMessage.style.display = 'none';

    try {
        const response = await fetch(`${API_URL}/parking/entry`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ vehicleType, vehicleNumber })
        });

        const result = await response.json();

        if (result.success) {
            actionMessage.style.background = '#d4edda';
            actionMessage.style.color = '#155724';
            actionMessage.style.border = '1px solid #c3e6cb';
            actionMessage.textContent = `Vehicle ${vehicleNumber} entry logged successfully`;

            if (result.data.isViolation) {
                actionMessage.style.background = '#fff3cd';
                actionMessage.style.color = '#856404';
                actionMessage.style.border = '1px solid #ffc107';
                actionMessage.textContent = `WARNING: Capacity exceeded by ${result.data.violationAmount} vehicles!`;
            }

            // Clear form
            document.getElementById('vehicleNumber').value = '';
        } else {
            actionMessage.style.background = '#f8d7da';
            actionMessage.style.color = '#721c24';
            actionMessage.style.border = '1px solid #f5c6cb';
            actionMessage.textContent = result.message;
        }

        actionMessage.style.display = 'block';
        loadStatus();
        loadRecentLogs();
    } catch (error) {
        actionMessage.style.background = '#f8d7da';
        actionMessage.style.color = '#721c24';
        actionMessage.style.border = '1px solid #f5c6cb';
        actionMessage.textContent = 'Failed to log entry';
        actionMessage.style.display = 'block';
    } finally {
        entryBtn.disabled = false;
        entryBtn.innerHTML = `
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 5V19M5 12H19" stroke="white" stroke-width="2.5" stroke-linecap="round"/>
            </svg>
            Vehicle Entry
        `;
    }
}

async function logExit() {
    const exitBtn = document.getElementById('exitBtn');
    const actionMessage = document.getElementById('actionMessage');
    const vehicleNumber = document.getElementById('vehicleNumber').value.trim();

    exitBtn.disabled = true;
    exitBtn.innerHTML = 'Processing...';
    actionMessage.style.display = 'none';

    try {
        const response = await fetch(`${API_URL}/parking/exit`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ vehicleNumber })
        });

        const result = await response.json();

        if (result.success) {
            actionMessage.style.background = '#d4edda';
            actionMessage.style.color = '#155724';
            actionMessage.style.border = '1px solid #c3e6cb';

            let message = 'Vehicle exit logged successfully';
            if (result.data.fee > 0) {
                message += ` | Fee: ₹${result.data.fee} | Duration: ${result.data.duration} mins`;
            }
            actionMessage.textContent = message;

            // Clear form
            document.getElementById('vehicleNumber').value = '';
        } else {
            actionMessage.style.background = '#f8d7da';
            actionMessage.style.color = '#721c24';
            actionMessage.style.border = '1px solid #f5c6cb';
            actionMessage.textContent = result.message;
        }

        actionMessage.style.display = 'block';
        loadStatus();
        loadRecentLogs();
    } catch (error) {
        actionMessage.style.background = '#f8d7da';
        actionMessage.style.color = '#721c24';
        actionMessage.style.border = '1px solid #f5c6cb';
        actionMessage.textContent = 'Failed to log exit';
        actionMessage.style.display = 'block';
    } finally {
        exitBtn.disabled = false;
        exitBtn.innerHTML = `
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M5 12H19" stroke="white" stroke-width="2.5" stroke-linecap="round"/>
            </svg>
            Vehicle Exit
        `;
    }
}


// Notifications functionality
let notificationsOpen = false;

async function loadNotifications() {
    try {
        const response = await fetch(`${API_URL}/notifications`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const data = await response.json();
        if (data.success) {
            displayNotifications(data.notifications);
            updateNotificationBadge(data.unreadCount);

            // Show alert for critical notifications
            const unreadCritical = data.notifications.filter(n => !n.read && (n.type === 'warning' || n.type === 'error'));
            if (unreadCritical.length > 0 && !sessionStorage.getItem('notificationAlertShown')) {
                const notif = unreadCritical[0];
                alert(`${notif.title}\n\n${notif.message}`);
                sessionStorage.setItem('notificationAlertShown', 'true');
            }
        }
    } catch (error) {
        console.error('Error loading notifications:', error);
    }
}

function displayNotifications(notifications) {
    const list = document.getElementById('notificationsList');

    if (notifications.length === 0) {
        list.innerHTML = '<p style="text-align: center; color: #666; padding: 20px;">No notifications</p>';
        return;
    }

    const html = notifications.map(notif => {
        const typeColors = {
            'warning': '#ffa500',
            'error': '#dc3545',
            'success': '#28a745',
            'info': '#17a2b8'
        };
        const color = typeColors[notif.type] || '#1a5490';

        return `
            <div onclick="markNotificationRead('${notif._id}')" style="padding: 12px; border-bottom: 1px solid #f0f0f0; cursor: pointer; ${!notif.read ? 'background: #f8f9fa;' : ''}" onmouseover="this.style.background='#f0f0f0'" onmouseout="this.style.background='${!notif.read ? '#f8f9fa' : 'white'}'">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 6px;">
                    <strong style="color: ${color}; font-size: 0.9rem;">${notif.title}</strong>
                    <span style="font-size: 0.75rem; color: #888;">${new Date(notif.createdAt).toLocaleDateString()}</span>
                </div>
                <p style="margin: 0; font-size: 0.85rem; color: #555;">${notif.message}</p>
                ${!notif.read ? '<div style="margin-top: 4px;"><span style="font-size: 0.7rem; color: #1a5490; font-weight: 600;">● NEW</span></div>' : ''}
            </div>
        `;
    }).join('');

    list.innerHTML = html;
}

function updateNotificationBadge(count) {
    const badge = document.getElementById('notificationBadge');
    if (count > 0) {
        badge.textContent = count > 99 ? '99+' : count;
        badge.style.display = 'flex';
    } else {
        badge.style.display = 'none';
    }
}

function toggleNotifications() {
    const dropdown = document.getElementById('notificationsDropdown');
    notificationsOpen = !notificationsOpen;
    dropdown.style.display = notificationsOpen ? 'block' : 'none';

    if (notificationsOpen) {
        loadNotifications();
    }
}

async function markNotificationRead(notifId) {
    try {
        await fetch(`${API_URL}/notifications/${notifId}/read`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        loadNotifications();
    } catch (error) {
        console.error('Error marking notification as read:', error);
    }
}

async function markAllRead() {
    try {
        await fetch(`${API_URL}/notifications/read-all`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        loadNotifications();
    } catch (error) {
        console.error('Error marking all as read:', error);
    }
}

// Close notifications when clicking outside
document.addEventListener('click', (e) => {
    const wrapper = document.querySelector('.notifications-wrapper');
    if (wrapper && !wrapper.contains(e.target) && notificationsOpen) {
        toggleNotifications();
    }
});

// Poll for new notifications every 30 seconds
setInterval(loadNotifications, 30000);
loadNotifications();

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'login.html';
}
