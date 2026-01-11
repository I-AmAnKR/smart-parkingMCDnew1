// Sensor Audit System - Car-to-Ticket Mismatch Detection

// Check authentication
let token = localStorage.getItem('token');
let user = JSON.parse(localStorage.getItem('user') || '{}');

if (!token || user.role !== 'contractor') {
    window.location.href = 'index.html';
}

// Check if attendance is marked for today
function checkTodayAttendance() {
    const attendanceRecords = JSON.parse(localStorage.getItem('attendanceRecords') || '[]');
    const userEmail = user.email;

    // Get today's date (start of day)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if there's an attendance record for today
    const todayAttendance = attendanceRecords.find(record => {
        const recordDate = new Date(record.timestamp);
        recordDate.setHours(0, 0, 0, 0);
        return record.staffEmail === userEmail && recordDate.getTime() === today.getTime();
    });

    return todayAttendance;
}

// Enforce attendance check
const hasAttendance = checkTodayAttendance();
if (!hasAttendance) {
    showAttendanceRequiredModal();
    throw new Error('Attendance required'); // Stop execution
}

// Initialize page
document.getElementById('userEmail').textContent = user.email || 'contractor@parking.com';

// Mock data for sensor audit
let sensorData = {
    todaySensorCount: 0,
    todayTicketCount: 0,
    hourlyData: [],
    fraudAlerts: [],
    activityLog: []
};

// Initialize mock data
function initializeMockData() {
    // Generate mock hourly data for today (9 AM to 5 PM)
    const hours = ['9 AM', '10 AM', '11 AM', '12 PM', '1 PM', '2 PM', '3 PM', '4 PM', '5 PM'];
    sensorData.hourlyData = hours.map((hour, index) => {
        const sensorCount = Math.floor(Math.random() * 15) + 5; // 5-20 vehicles
        const ticketCount = Math.floor(sensorCount * (0.7 + Math.random() * 0.3)); // 70-100% of sensor count
        const mismatch = sensorCount - ticketCount;

        return {
            hour: hour,
            sensorCount: sensorCount,
            ticketCount: ticketCount,
            mismatch: mismatch,
            timestamp: new Date(new Date().setHours(9 + index, 0, 0, 0))
        };
    });

    // Calculate totals
    sensorData.todaySensorCount = sensorData.hourlyData.reduce((sum, h) => sum + h.sensorCount, 0);
    sensorData.todayTicketCount = sensorData.hourlyData.reduce((sum, h) => sum + h.ticketCount, 0);

    // Generate fraud alerts for hours with significant mismatch
    sensorData.fraudAlerts = sensorData.hourlyData
        .filter(h => h.mismatch >= 5)
        .map(h => ({
            id: `ALERT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            hour: h.hour,
            sensorCount: h.sensorCount,
            ticketCount: h.ticketCount,
            mismatch: h.mismatch,
            severity: h.mismatch >= 10 ? 'high' : h.mismatch >= 7 ? 'medium' : 'low',
            timestamp: h.timestamp,
            status: 'active'
        }));

    // Generate activity log (last 20 entries)
    const now = new Date();
    for (let i = 0; i < 20; i++) {
        const minutesAgo = i * 15; // Every 15 minutes
        const timestamp = new Date(now.getTime() - minutesAgo * 60000);
        const sensorDetected = Math.random() > 0.3; // 70% chance of sensor detection
        const ticketGenerated = sensorDetected && Math.random() > 0.2; // 80% chance of ticket if sensor detected

        sensorData.activityLog.push({
            timestamp: timestamp,
            sensorDetected: sensorDetected,
            ticketGenerated: ticketGenerated,
            vehicleNumber: sensorDetected ? `DL-01-${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${String.fromCharCode(65 + Math.floor(Math.random() * 26))}-${Math.floor(Math.random() * 9000) + 1000}` : null,
            mismatch: sensorDetected && !ticketGenerated
        });
    }

    // Save to localStorage
    localStorage.setItem('sensorAuditData', JSON.stringify(sensorData));
}

// Load or initialize data
function loadAuditData() {
    const savedData = localStorage.getItem('sensorAuditData');
    if (savedData) {
        sensorData = JSON.parse(savedData);
    } else {
        initializeMockData();
    }
    updateDashboard();
}

// Update dashboard with current data
function updateDashboard() {
    // Update stats
    document.getElementById('sensorCount').textContent = sensorData.todaySensorCount;
    document.getElementById('ticketCount').textContent = sensorData.todayTicketCount;
    const mismatch = sensorData.todaySensorCount - sensorData.todayTicketCount;
    document.getElementById('mismatchCount').textContent = mismatch;

    // Update audit status
    updateAuditStatus(mismatch);

    // Update hourly chart
    updateHourlyChart();

    // Update fraud alerts
    updateFraudAlerts();

    // Update activity log
    updateActivityLog();
}

// Update audit status based on mismatch
function updateAuditStatus(mismatch) {
    const statusDiv = document.getElementById('auditStatus');
    const statusText = document.getElementById('statusText');
    const statusDetail = document.getElementById('statusDetail');

    if (mismatch === 0) {
        statusDiv.className = 'audit-status safe';
        statusText.textContent = 'System Integrity: NORMAL ✓';
        statusDetail.textContent = 'Perfect match! Sensor count equals ticket records.';
    } else if (mismatch <= 5) {
        statusDiv.className = 'audit-status warning';
        statusText.textContent = 'System Integrity: MINOR VARIANCE';
        statusDetail.textContent = `${mismatch} vehicle(s) unaccounted. Within acceptable range.`;
    } else {
        statusDiv.className = 'audit-status alert';
        statusText.textContent = 'System Integrity: FRAUD ALERT ⚠️';
        statusDetail.textContent = `${mismatch} vehicle(s) unaccounted! Immediate investigation required.`;
    }
}

// Update hourly comparison chart
function updateHourlyChart() {
    const chartContainer = document.getElementById('hourlyChart');
    chartContainer.innerHTML = '';

    const maxValue = Math.max(...sensorData.hourlyData.map(h => Math.max(h.sensorCount, h.ticketCount)));

    sensorData.hourlyData.forEach(hourData => {
        // Create bar group container
        const barGroup = document.createElement('div');
        barGroup.style.display = 'flex';
        barGroup.style.flexDirection = 'column';
        barGroup.style.alignItems = 'center';
        barGroup.style.gap = '5px';
        barGroup.style.position = 'relative';
        barGroup.style.height = '100%';

        // Sensor bar
        const sensorBar = document.createElement('div');
        const sensorHeight = (hourData.sensorCount / maxValue) * 180;
        sensorBar.className = 'bar';
        sensorBar.style.height = `${sensorHeight}px`;
        sensorBar.style.background = 'linear-gradient(to top, #3498db, #5dade2)';
        sensorBar.style.width = '30px';
        sensorBar.style.marginTop = `${200 - sensorHeight}px`;

        const sensorValue = document.createElement('div');
        sensorValue.className = 'bar-value';
        sensorValue.textContent = hourData.sensorCount;
        sensorValue.style.color = '#3498db';
        sensorBar.appendChild(sensorValue);

        // Ticket bar
        const ticketBar = document.createElement('div');
        const ticketHeight = (hourData.ticketCount / maxValue) * 180;
        ticketBar.className = 'bar';
        ticketBar.style.height = `${ticketHeight}px`;
        ticketBar.style.background = 'linear-gradient(to top, #2ecc71, #58d68d)';
        ticketBar.style.width = '30px';
        ticketBar.style.marginTop = `${200 - ticketHeight}px`;

        const ticketValue = document.createElement('div');
        ticketValue.className = 'bar-value';
        ticketValue.textContent = hourData.ticketCount;
        ticketValue.style.color = '#2ecc71';
        ticketBar.appendChild(ticketValue);

        // Hour label
        const label = document.createElement('div');
        label.className = 'bar-label';
        label.textContent = hourData.hour;
        label.style.marginTop = '10px';

        // Combine bars
        const barsContainer = document.createElement('div');
        barsContainer.style.display = 'flex';
        barsContainer.style.gap = '5px';
        barsContainer.style.alignItems = 'flex-end';
        barsContainer.style.height = '200px';
        barsContainer.appendChild(sensorBar);
        barsContainer.appendChild(ticketBar);

        barGroup.appendChild(barsContainer);
        barGroup.appendChild(label);

        chartContainer.appendChild(barGroup);
    });
}

// Update fraud alerts
function updateFraudAlerts() {
    const alertsContainer = document.getElementById('fraudAlerts');

    if (sensorData.fraudAlerts.length === 0) {
        alertsContainer.innerHTML = `
            <div style="text-align: center; padding: 30px; background: #d4edda; border-radius: 8px; color: #155724;">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="margin-bottom: 10px;">
                    <path d="M12 2L3 7V11C3 16.55 6.84 21.74 12 23C17.16 21.74 21 16.55 21 11V7L12 2Z" fill="#28a745"/>
                    <path d="M10 17L6 13L7.41 11.59L10 14.17L16.59 7.58L18 9L10 17Z" fill="white"/>
                </svg>
                <h4 style="margin: 10px 0; color: #155724;">No Fraud Alerts Today! ✓</h4>
                <p style="margin: 0; font-size: 0.9rem;">All sensor counts match ticket records. System integrity maintained.</p>
            </div>
        `;
        return;
    }

    const alertsHTML = sensorData.fraudAlerts.map(alert => {
        const severityColor = alert.severity === 'high' ? '#c0392b' : alert.severity === 'medium' ? '#e67e22' : '#f39c12';
        const severityText = alert.severity.toUpperCase();

        return `
            <div class="fraud-alert-card" style="background: linear-gradient(135deg, ${severityColor} 0%, ${severityColor}dd 100%);">
                <div style="display: flex; justify-content: space-between; align-items: start;">
                    <div style="flex: 1;">
                        <h4>🚨 FRAUD ALERT - ${alert.hour}</h4>
                        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-top: 10px;">
                            <div>
                                <div style="font-size: 0.8rem; opacity: 0.9;">Sensor Count</div>
                                <div style="font-size: 1.5rem; font-weight: 700;">${alert.sensorCount}</div>
                            </div>
                            <div>
                                <div style="font-size: 0.8rem; opacity: 0.9;">Tickets Generated</div>
                                <div style="font-size: 1.5rem; font-weight: 700;">${alert.ticketCount}</div>
                            </div>
                            <div>
                                <div style="font-size: 0.8rem; opacity: 0.9;">Unaccounted</div>
                                <div style="font-size: 1.5rem; font-weight: 700;">⚠️ ${alert.mismatch}</div>
                            </div>
                        </div>
                    </div>
                    <div style="background: rgba(255,255,255,0.2); padding: 8px 12px; border-radius: 6px; font-size: 0.75rem; font-weight: 700;">
                        ${severityText} SEVERITY
                    </div>
                </div>
                <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid rgba(255,255,255,0.3); font-size: 0.85rem;">
                    <strong>Alert ID:</strong> ${alert.id} | <strong>Time:</strong> ${new Date(alert.timestamp).toLocaleTimeString()}
                </div>
            </div>
        `;
    }).join('');

    alertsContainer.innerHTML = alertsHTML;
}

// Update activity log
function updateActivityLog() {
    const logContainer = document.getElementById('sensorLog');

    const logsHTML = sensorData.activityLog.map((log, index) => {
        const isMismatch = log.mismatch;
        const timestamp = new Date(log.timestamp).toLocaleTimeString();

        return `
            <div class="sensor-log-item ${isMismatch ? 'mismatch' : ''}">
                <div class="log-grid">
                    <div>
                        <strong style="color: #1a5490; font-size: 0.85rem;">Time</strong>
                        <p style="margin: 2px 0 0 0; font-size: 0.8rem; color: #666;">${timestamp}</p>
                    </div>
                    <div>
                        <strong style="color: #1a5490; font-size: 0.85rem;">Sensor</strong>
                        <p style="margin: 2px 0 0 0; font-size: 0.8rem; color: ${log.sensorDetected ? '#28a745' : '#999'}; font-weight: 600;">
                            ${log.sensorDetected ? '✓ Detected' : '- No Entry'}
                        </p>
                    </div>
                    <div>
                        <strong style="color: #1a5490; font-size: 0.85rem;">Ticket</strong>
                        <p style="margin: 2px 0 0 0; font-size: 0.8rem; color: ${log.ticketGenerated ? '#28a745' : '#e74c3c'}; font-weight: 600;">
                            ${log.ticketGenerated ? '✓ Generated' : (log.sensorDetected ? '✗ Missing' : '-')}
                        </p>
                    </div>
                    <div>
                        <strong style="color: #1a5490; font-size: 0.85rem;">Status</strong>
                        <p style="margin: 2px 0 0 0; font-size: 0.8rem; color: ${isMismatch ? '#e74c3c' : '#28a745'}; font-weight: 700;">
                            ${isMismatch ? '⚠️ MISMATCH' : '✓ OK'}
                        </p>
                    </div>
                </div>
                ${log.vehicleNumber ? `<div style="margin-top: 5px; font-size: 0.75rem; color: #999;">Vehicle: ${log.vehicleNumber}</div>` : ''}
            </div>
        `;
    }).join('');

    logContainer.innerHTML = logsHTML;
}

// Refresh audit data (simulate new sensor readings)
function refreshAuditData() {
    // Add some randomness to simulate real-time updates
    const lastHour = sensorData.hourlyData[sensorData.hourlyData.length - 1];
    if (lastHour) {
        // Randomly add 1-3 to sensor count
        lastHour.sensorCount += Math.floor(Math.random() * 3) + 1;
        // Randomly add 0-2 to ticket count (simulating potential fraud)
        lastHour.ticketCount += Math.floor(Math.random() * 3);
        lastHour.mismatch = lastHour.sensorCount - lastHour.ticketCount;
    }

    // Recalculate totals
    sensorData.todaySensorCount = sensorData.hourlyData.reduce((sum, h) => sum + h.sensorCount, 0);
    sensorData.todayTicketCount = sensorData.hourlyData.reduce((sum, h) => sum + h.ticketCount, 0);

    // Check for new fraud alerts
    const newAlerts = sensorData.hourlyData
        .filter(h => h.mismatch >= 5)
        .filter(h => !sensorData.fraudAlerts.find(a => a.hour === h.hour));

    newAlerts.forEach(h => {
        sensorData.fraudAlerts.push({
            id: `ALERT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            hour: h.hour,
            sensorCount: h.sensorCount,
            ticketCount: h.ticketCount,
            mismatch: h.mismatch,
            severity: h.mismatch >= 10 ? 'high' : h.mismatch >= 7 ? 'medium' : 'low',
            timestamp: h.timestamp,
            status: 'active'
        });
    });

    // Save updated data
    localStorage.setItem('sensorAuditData', JSON.stringify(sensorData));

    // Update dashboard
    updateDashboard();

    // Show notification
    alert('✅ Audit data refreshed!\n\nSensor Count: ' + sensorData.todaySensorCount + '\nTicket Count: ' + sensorData.todayTicketCount + '\nMismatch: ' + (sensorData.todaySensorCount - sensorData.todayTicketCount));
}

// Logout function
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'index.html';
}

// Initialize on page load
loadAuditData();

// Auto-refresh every 30 seconds
setInterval(() => {
    // Simulate new sensor reading
    const now = new Date();
    const currentHour = now.getHours();

    if (currentHour >= 9 && currentHour <= 17) {
        const hourIndex = currentHour - 9;
        if (sensorData.hourlyData[hourIndex]) {
            // Small chance of new entry
            if (Math.random() > 0.7) {
                sensorData.hourlyData[hourIndex].sensorCount++;
                if (Math.random() > 0.2) { // 80% chance of ticket
                    sensorData.hourlyData[hourIndex].ticketCount++;
                }
                sensorData.hourlyData[hourIndex].mismatch =
                    sensorData.hourlyData[hourIndex].sensorCount -
                    sensorData.hourlyData[hourIndex].ticketCount;

                updateDashboard();
            }
        }
    }
}, 30000);

