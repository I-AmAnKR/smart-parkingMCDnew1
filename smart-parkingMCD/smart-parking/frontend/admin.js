const API_URL = 'http://localhost:3000/api';
let token = localStorage.getItem('token');
let user = JSON.parse(localStorage.getItem('user') || '{}');
let occupancyChart = null;
let violationsChart = null;

// Check authentication
if (!token || user.role !== 'admin') {
    window.location.href = 'login.html';
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

    // Filter parking lots by zone (to be implemented with actual data)
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

// Auto-refresh every 15 seconds
setInterval(loadDashboard, 15000);

async function loadDashboard() {
    try {
        const response = await fetch(`${API_URL}/parking/admin/dashboard`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const result = await response.json();
        if (result.success) {
            const { parkingLots, totalLots, violatingLots, recentViolations } = result.data;

            // Update stats
            document.getElementById('totalLots').textContent = totalLots;
            document.getElementById('violatingLots').textContent = violatingLots;
            document.getElementById('recentViolations').textContent = recentViolations.length;

            // Display parking lots
            displayParkingLots(parkingLots);

            // Display violations
            displayViolations(recentViolations);
        }
    } catch (error) {
        console.error('Error loading dashboard:', error);
    }
}

function displayParkingLots(lots) {
    const html = lots.map(lot => {
        const statusClass = lot.isViolating ? 'lot-violating' :
            lot.utilizationPercent >= 90 ? 'lot-warning' : 'lot-normal';

        return `
            <div class="parking-lot-card ${statusClass}">
                <div class="lot-header">
                    <h4>${lot.parkingLotName}</h4>
                    <span class="lot-id">${lot.parkingLotId}</span>
                </div>
                <div class="lot-occupancy">
                    <div class="occupancy-bar">
                        <div class="occupancy-fill" style="width: ${Math.min(lot.utilizationPercent, 100)}%"></div>
                    </div>
                    <div class="occupancy-text">
                        ${lot.currentOccupancy} / ${lot.maxCapacity} (${lot.utilizationPercent}%)
                    </div>
                </div>
                ${lot.isViolating ? '<div class="lot-alert">⚠️ Over Capacity</div>' : ''}
            </div>
        `;
    }).join('');

    document.getElementById('parkingLotsGrid').innerHTML = html || '<p class="text-muted">No parking lots found</p>';
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

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'login.html';
}
