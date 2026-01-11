const API_URL = 'http://localhost:3000/api';
let token = localStorage.getItem('token');
let user = JSON.parse(localStorage.getItem('user') || '{}');
let occupancyChart = null;
let violationsChart = null;

// Check authentication
if (!token || user.role !== 'admin') {
    window.location.href = 'index.html';
}

document.getElementById('userEmail').textContent = user.email;

// Download Daily Report function
function downloadDailyReport() {
    // Generate report data
    const reportData = {
        date: new Date().toLocaleDateString(),
        totalRevenue: document.getElementById('totalRevenue').textContent,
        activeViolations: document.getElementById('activeViolations').textContent,
        vehicleCount: document.getElementById('vehicleCount').textContent,
        pendingApps: document.getElementById('pendingApps').textContent
    };

    // Create downloadable content
    const content = `MCD Daily Report - ${reportData.date}\n\n` +
        `Total Revenue: ${reportData.totalRevenue}\n` +
        `Active Violations: ${reportData.activeViolations}\n` +
        `Vehicle Count: ${reportData.vehicleCount}\n` +
        `Pending Applications: ${reportData.pendingApps}\n`;

    // Create and trigger download
    const blob = new Blob([content], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `MCD_Daily_Report_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
}

// Zone filter function
function filterZone(zone) {
    // Remove active class from all buttons
    document.querySelectorAll('.zone-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    // Add active class to clicked button
    if (event && event.target) {
        event.target.classList.add('active');
    }

    // Map URLs for different Delhi zones
    const zoneMapUrls = {
        'all': 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d224346.48129763652!2d76.87677984999999!3d28.52758485!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x390cfd5b347eb62d%3A0x52c2b7494e204dce!2sNew%20Delhi%2C%20Delhi!5e0!3m2!1sen!2sin!4v1234567890123!5m2!1sen!2sin',
        'north': 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d112065.9!2d77.1025!3d28.7041!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x390d047309fff32f%3A0xde6b1d1bb3b7e0a8!2sNorth%20Delhi%2C%20Delhi!5e0!3m2!1sen!2sin!4v1234567890124!5m2!1sen!2sin',
        'south': 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d112173.5!2d77.2090!3d28.5355!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x390ce3e564c2f2a5%3A0x7e6267e54a0c1e8!2sSouth%20Delhi%2C%20Delhi!5e0!3m2!1sen!2sin!4v1234567890125!5m2!1sen!2sin',
        'central': 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d112095.2!2d77.2090!3d28.6139!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x390cfd37b5f3bfe1%3A0x7e6267e54a0c1e9!2sCentral%20Delhi%2C%20Delhi!5e0!3m2!1sen!2sin!4v1234567890126!5m2!1sen!2sin',
        'west': 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d112134.8!2d77.0688!3d28.6692!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x390d03a4a0000001%3A0x7e6267e54a0c1ea!2sWest%20Delhi%2C%20Delhi!5e0!3m2!1sen!2sin!4v1234567890127!5m2!1sen!2sin',
        'east': 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d112115.3!2d77.2773!3d28.6692!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x390cfce26ec085ef%3A0x441e32f4fa5002a!2sEast%20Delhi%2C%20Delhi!5e0!3m2!1sen!2sin!4v1234567890128!5m2!1sen!2sin'
    };

    // Zone information data
    const zoneInfo = {
        'all': { name: 'All Delhi', lots: '25+', capacity: '5000+' },
        'north': { name: 'North Delhi', lots: '6', capacity: '1200' },
        'south': { name: 'South Delhi', lots: '7', capacity: '1400' },
        'central': { name: 'Central Delhi', lots: '5', capacity: '1000' },
        'west': { name: 'West Delhi', lots: '4', capacity: '800' },
        'east': { name: 'East Delhi', lots: '3', capacity: '600' }
    };

    // Show loading indicator
    const mapIframe = document.getElementById('delhiMap');
    const loadingIndicator = document.getElementById('mapLoadingIndicator');
    const zoneInfoDiv = document.getElementById('zoneInfo');

    if (mapIframe && loadingIndicator) {
        loadingIndicator.style.display = 'block';
        mapIframe.style.display = 'none';

        // Update map source
        setTimeout(() => {
            mapIframe.src = zoneMapUrls[zone] || zoneMapUrls['all'];

            // Hide loading and show map after a short delay
            setTimeout(() => {
                loadingIndicator.style.display = 'none';
                mapIframe.style.display = 'block';
            }, 800);
        }, 300);
    }

    // Update zone information display
    if (zoneInfoDiv && zoneInfo[zone]) {
        document.getElementById('zoneNameDisplay').textContent = zoneInfo[zone].name;
        document.getElementById('zoneParkingLots').textContent = zoneInfo[zone].lots;
        document.getElementById('zoneTotalCapacity').textContent = zoneInfo[zone].capacity + ' vehicles';

        // Show zone info for specific zones, hide for 'all'
        zoneInfoDiv.style.display = zone === 'all' ? 'none' : 'block';
    }

    console.log('Filtering by zone:', zone);
}

// Navigation function
function setActiveNav(element) {
    // Remove active class from all nav items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    // Add active class to clicked item
    element.classList.add('active');

    // Smooth scroll to section
    const targetId = element.getAttribute('href');
    const targetSection = document.querySelector(targetId);
    if (targetSection) {
        targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    return false;
}


// Load dashboard data
loadDashboard();
loadCharts();
loadDashboardStats();

// Auto-refresh every 15 seconds
setInterval(loadDashboard, 15000);
setInterval(loadDashboardStats, 30000);

async function loadDashboardStats() {
    try {
        const response = await fetch(`${API_URL}/stats/dashboard`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const result = await response.json();
        if (result.success) {
            const { totalRevenue, activeViolations, vehicleCount, pendingApps } = result.data;

            // Update stat boxes
            const revenueEl = document.getElementById('totalRevenue');
            const violationsEl = document.getElementById('activeViolations');
            const vehicleEl = document.getElementById('vehicleCount');
            const appsEl = document.getElementById('pendingApps');

            if (revenueEl) revenueEl.textContent = `₹${totalRevenue.toLocaleString()}`;
            if (violationsEl) violationsEl.textContent = activeViolations;
            if (vehicleEl) vehicleEl.textContent = vehicleCount;
            if (appsEl) appsEl.textContent = pendingApps;
        }
    } catch (error) {
        console.error('Error loading dashboard stats:', error);
    }
}

async function loadDashboard() {
    try {
        const response = await fetch(`${API_URL}/parking/admin/dashboard`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const result = await response.json();
        if (result.success) {
            const { parkingLots, recentViolations } = result.data;

            // Display parking lots
            displayParkingLots(parkingLots);

            // Display violations
            displayViolations(recentViolations);
        }
    } catch (error) {
        console.error('Error loading dashboard:', error);
    }
}

let allParkingLots = [];
let currentFilter = 'all';

function displayParkingLots(lots) {
    allParkingLots = lots;
    filterParkingLots(currentFilter);
}

function filterParkingLots(filter) {
    currentFilter = filter;

    // Update button styles
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.style.background = 'white';
        btn.style.color = btn.id === 'filterLive' ? '#28a745' : btn.id === 'filterOffline' ? '#6c757d' : '#1a5490';
    });

    const activeBtn = document.getElementById(filter === 'all' ? 'filterAll' : filter === 'live' ? 'filterLive' : 'filterOffline');
    if (activeBtn) {
        activeBtn.style.background = filter === 'live' ? '#28a745' : filter === 'offline' ? '#6c757d' : '#1a5490';
        activeBtn.style.color = 'white';
    }

    // Filter lots based on shift status (for now, we'll use a simple heuristic)
    let filteredLots = allParkingLots;
    if (filter === 'live') {
        // Consider lots with recent activity as "live"
        filteredLots = allParkingLots.filter(lot => lot.currentOccupancy > 0 || lot.utilizationPercent > 0);
    } else if (filter === 'offline') {
        filteredLots = allParkingLots.filter(lot => lot.currentOccupancy === 0 && lot.utilizationPercent === 0);
    }

    const html = filteredLots.map(lot => {
        const statusClass = lot.isViolating ? 'lot-violating' :
            lot.utilizationPercent >= 90 ? 'lot-warning' : 'lot-normal';

        const isLive = lot.currentOccupancy > 0 || lot.utilizationPercent > 0;
        const statusBadge = isLive ?
            '<span style="background: #28a745; color: white; padding: 4px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 600;">🟢 LIVE</span>' :
            '<span style="background: #6c757d; color: white; padding: 4px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 600;">⚫ OFFLINE</span>';

        return `
            <div class="parking-lot-card ${statusClass}" onclick="openContractorDetails('${lot.parkingLotId}')" style="cursor: pointer; transition: transform 0.2s, box-shadow 0.2s;" onmouseover="this.style.transform='translateY(-4px)'; this.style.boxShadow='0 6px 20px rgba(0,0,0,0.15)';" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 8px rgba(0,0,0,0.1)';">
                <div class="lot-header" style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px;">
                    <div>
                        <h4 style="margin: 0 0 4px 0;">${lot.parkingLotName}</h4>
                        <span class="lot-id" style="font-size: 0.8rem; color: #666;">${lot.parkingLotId}</span>
                    </div>
                    ${statusBadge}
                </div>
                <div class="lot-occupancy">
                    <div class="occupancy-bar" style="background: #e0e0e0; height: 8px; border-radius: 4px; overflow: hidden; margin-bottom: 8px;">
                        <div class="occupancy-fill" style="width: ${Math.min(lot.utilizationPercent, 100)}%; height: 100%; background: ${lot.isViolating ? '#dc3545' : lot.utilizationPercent >= 90 ? '#ffc107' : '#28a745'}; transition: width 0.3s;"></div>
                    </div>
                    <div class="occupancy-text" style="display: flex; justify-content: space-between; font-size: 0.9rem;">
                        <span><strong>${lot.currentOccupancy}</strong> / ${lot.maxCapacity}</span>
                        <span><strong>${lot.utilizationPercent}%</strong></span>
                    </div>
                </div>
                ${lot.isViolating ? '<div class="lot-alert" style="margin-top: 10px; padding: 8px; background: #fff3cd; border-left: 4px solid #ffc107; border-radius: 4px; font-size: 0.85rem; color: #856404;">⚠️ Over Capacity</div>' : ''}
                <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #e0e0e0; font-size: 0.85rem; color: #666;">
                    Click to view contractor details
                </div>
            </div>
        `;
    }).join('');

    document.getElementById('parkingLotsGrid').innerHTML = html || '<p class="text-muted">No parking lots found</p>';
}

async function openContractorDetails(parkingLotId) {
    try {
        // Find contractor by parking lot ID
        const response = await fetch(`${API_URL}/contractors`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const result = await response.json();
        if (result.success) {
            const contractor = result.contractors.find(c => c.parkingLotId === parkingLotId);
            if (contractor) {
                // Redirect to contractor management page with the contractor selected
                window.location.href = `contractor-management.html?id=${contractor._id}`;
            }
        }
    } catch (error) {
        console.error('Error opening contractor details:', error);
        alert('Failed to load contractor details');
    }
}

function displayViolations(violations) {
    const html = violations.slice(0, 15).map(v => {
        const time = new Date(v.timestamp).toLocaleString();
        return `
            <div class="violation-item">
                <span class="violation-time">${time}</span>
                <span class="violation-lot">${v.parkingLotName}</span>
                <span class="violation-details">${v.currentOccupancy}/${v.maxCapacity} (+${v.violationAmount})</span>
            </div>
        `;
    }).join('');

    document.getElementById('violationsList').innerHTML = html || '<p class="text-muted">No recent violations</p>';
}

async function loadCharts() {
    try {
        const response = await fetch(`${API_URL}/parking/admin/charts?days=7`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const result = await response.json();
        if (result.success) {
            createOccupancyChart(result.data.occupancyData);
            createViolationsChart(result.data.violationsOverTime);
        }
    } catch (error) {
        console.error('Error loading charts:', error);
    }
}

function createOccupancyChart(data) {
    const ctx = document.getElementById('occupancyChart').getContext('2d');

    if (occupancyChart) {
        occupancyChart.destroy();
    }

    occupancyChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.map(d => d.parkingLotName),
            datasets: [
                {
                    label: 'Current Occupancy',
                    data: data.map(d => d.currentOccupancy),
                    backgroundColor: 'rgba(54, 162, 235, 0.7)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1
                },
                {
                    label: 'Max Capacity',
                    data: data.map(d => d.maxCapacity),
                    backgroundColor: 'rgba(255, 99, 132, 0.7)',
                    borderColor: 'rgba(255, 99, 132, 1)',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

function createViolationsChart(data) {
    const ctx = document.getElementById('violationsChart').getContext('2d');

    if (violationsChart) {
        violationsChart.destroy();
    }

    violationsChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.map(d => d._id),
            datasets: [{
                label: 'Violations',
                data: data.map(d => d.count),
                borderColor: 'rgba(255, 99, 132, 1)',
                backgroundColor: 'rgba(255, 99, 132, 0.2)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

async function generateAIReport() {
    const btn = document.getElementById('aiReportBtn');
    const reportDiv = document.getElementById('aiReport');

    btn.disabled = true;
    btn.textContent = 'Generating Report...';
    reportDiv.style.display = 'block';
    reportDiv.innerHTML = '<div class="ai-loading">🤖 Analyzing parking data with AI...</div>';

    try {
        const response = await fetch(`${API_URL}/parking/admin/ai-report`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        const result = await response.json();

        if (result.success) {
            reportDiv.innerHTML = `<div class="ai-content">${result.data.report.replace(/\n/g, '<br>')}</div>`;
        } else {
            reportDiv.innerHTML = `<div class="ai-error">Error: ${result.message}</div>`;
        }
    } catch (error) {
        reportDiv.innerHTML = '<div class="ai-error">Failed to generate report. Check if AI API key is configured.</div>';
    } finally {
        btn.disabled = false;
        btn.textContent = '🤖 Generate AI Compliance Report';
    }
}

async function askAI() {
    const query = document.getElementById('aiQuery').value.trim();
    const btn = document.getElementById('aiQueryBtn');
    const answerDiv = document.getElementById('aiAnswer');

    if (!query) return;

    btn.disabled = true;
    btn.textContent = 'Thinking...';
    answerDiv.style.display = 'block';
    answerDiv.innerHTML = '<div class="ai-loading">🤖 Processing your query...</div>';

    try {
        const response = await fetch(`${API_URL}/parking/admin/ai-query`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ query })
        });

        const result = await response.json();

        if (result.success) {
            answerDiv.innerHTML = `<div class="ai-content"><strong>Q:</strong> ${query}<br><br><strong>A:</strong> ${result.data.answer}</div>`;
        } else {
            answerDiv.innerHTML = `<div class="ai-error">Error: ${result.message}</div>`;
        }
    } catch (error) {
        answerDiv.innerHTML = '<div class="ai-error">Failed to process query. Check if AI API key is configured.</div>';
    } finally {
        btn.disabled = false;
        btn.textContent = 'Ask AI';
    }
}

// Allow Enter key for AI query
document.getElementById('aiQuery').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') askAI();
});

// Verify cryptographic integrity
async function verifyIntegrity() {
    const btn = document.getElementById('verifyBtn');
    const statusDiv = document.getElementById('integrityStatus');

    btn.disabled = true;
    btn.textContent = 'Verifying...';
    statusDiv.innerHTML = '<div class="integrity-loading">🔍 Verifying cryptographic hash chain...</div>';

    try {
        const response = await fetch(`${API_URL}/parking/admin/verify-integrity`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const result = await response.json();

        if (result.success) {
            const { chainIntegrity, timestampAnomalies, gaps, totalEntries } = result.data;

            if (chainIntegrity.valid && timestampAnomalies.length === 0 && gaps.length === 0) {
                statusDiv.innerHTML = `
                    <div class="integrity-verified">
                        <div class="integrity-icon">✓</div>
                        <div class="integrity-details">
                            <h3>Data Integrity Verified</h3>
                            <p>All ${totalEntries} entries validated. Hash chain intact.</p>
                            <p class="text-muted">No tampering detected. Cryptographically secure.</p>
                        </div>
                    </div>
                `;
            } else {
                let issues = [];
                if (!chainIntegrity.valid) issues.push(`Chain broken at entry #${chainIntegrity.brokenAt}`);
                if (timestampAnomalies.length > 0) issues.push(`${timestampAnomalies.length} timestamp anomalies`);
                if (gaps.length > 0) issues.push(`${gaps.length} chain gaps`);

                statusDiv.innerHTML = `
                    <div class="integrity-tampered">
                        <div class="integrity-icon">⚠️</div>
                        <div class="integrity-details">
                            <h3>Tampering Detected</h3>
                            <p><strong>Issues Found:</strong> ${issues.join(', ')}</p>
                            <p class="text-muted">Immediate investigation required.</p>
                        </div>
                    </div>
                `;
            }
        } else {
            statusDiv.innerHTML = '<div class="integrity-error">Failed to verify integrity</div>';
        }
    } catch (error) {
        statusDiv.innerHTML = '<div class="integrity-error">Verification failed. Check connection.</div>';
    } finally {
        btn.disabled = false;
        btn.textContent = 'Verify Now';
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
    window.location.href = 'index.html';
}
