// contractor-management.js
// Contractor Management Page - Real API Integration

const API_URL = 'https://smart-parking-mcd-b.onrender.com/api';
let token = localStorage.getItem('token');
let user = JSON.parse(localStorage.getItem('user') || '{}');

if (!token || user.role !== 'admin') {
    window.location.href = 'index.html';
}

document.getElementById('userEmail').textContent = user.email;

let currentContractorId = null;

// Load contractors on page load
loadContractors();

async function loadContractors() {
    try {
        const response = await fetch(`${API_URL}/contractors`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();
        if (data.success) {
            displayContractors(data.contractors);
        } else {
            console.error('Failed to load contractors:', data.message);
        }
    } catch (error) {
        console.error('Error loading contractors:', error);
        document.getElementById('contractorsGrid').innerHTML =
            '<p class="text-muted">Error loading contractors. Please try again.</p>';
    }
}

function displayContractors(contractors) {
    const grid = document.getElementById('contractorsGrid');

    if (contractors.length === 0) {
        grid.innerHTML = '<p class="text-muted">No contractors found.</p>';
        return;
    }

    const html = contractors.map(contractor => {
        const utilization = Math.round((contractor.currentOccupancy / contractor.maxCapacity) * 100);
        const statusClass = `status-${contractor.status}`;
        const warningClass = contractor.warnings > 2 ? 'high-warnings' : '';

        return `
            <div class="contractor-card ${warningClass}">
                <div class="contractor-header">
                    <div>
                        <h3>${contractor.parkingLotName}</h3>
                        <p class="contractor-email">${contractor.email}</p>
                    </div>
                    <span class="contractor-status ${statusClass}">${contractor.status.toUpperCase()}</span>
                </div>
                
                <div class="contractor-stats">
                    <div class="stat-item">
                        <span class="stat-label">Occupancy</span>
                        <span class="stat-value">${contractor.currentOccupancy}/${contractor.maxCapacity}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Utilization</span>
                        <span class="stat-value">${utilization}%</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Violations (30d)</span>
                        <span class="stat-value ${contractor.violationCount > 0 ? 'text-danger' : ''}">${contractor.violationCount}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Warnings</span>
                        <span class="stat-value ${contractor.warnings > 0 ? 'text-warning' : ''}">${contractor.warnings}</span>
                    </div>
                </div>
                
                <div class="contractor-actions">
                    <button onclick="viewDetails('${contractor._id}')" class="btn btn-sm btn-primary">View Details</button>
                    <button onclick="editContractor('${contractor._id}')" class="btn btn-sm btn-secondary">Edit</button>
                    <button onclick="openActionModal('${contractor._id}')" class="btn btn-sm btn-warning">Take Action</button>
                </div>
            </div>
        `;
    }).join('');

    grid.innerHTML = html;
}

async function viewDetails(contractorId) {
    try {
        const response = await fetch(`${API_URL}/contractors/${contractorId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();
        if (!data.success) {
            alert('Failed to load contractor details');
            return;
        }

        const contractor = data.contractor;
        const stats = data.stats;
        const logs = data.logs;
        const violations = data.violations;
        const activityByDate = data.activityByDate;

        const html = `
            <div class="detail-section">
                <h3>Basic Information</h3>
                <div class="detail-grid">
                    <div class="detail-item">
                        <strong>Email:</strong>
                        <span>${contractor.email}</span>
                    </div>
                    <div class="detail-item">
                        <strong>Parking Lot:</strong>
                        <span>${contractor.parkingLotName}</span>
                    </div>
                    <div class="detail-item">
                        <strong>Lot ID:</strong>
                        <span>${contractor.parkingLotId}</span>
                    </div>
                    <div class="detail-item">
                        <strong>Max Capacity:</strong>
                        <span>${contractor.maxCapacity}</span>
                    </div>
                    <div class="detail-item">
                        <strong>Current Occupancy:</strong>
                        <span>${stats.currentOccupancy}</span>
                    </div>
                    <div class="detail-item">
                        <strong>Status:</strong>
                        <span class="contractor-status status-${contractor.status}">${contractor.status.toUpperCase()}</span>
                    </div>
                    <div class="detail-item">
                        <strong>Warnings:</strong>
                        <span class="${contractor.warnings > 0 ? 'text-warning' : ''}">${contractor.warnings}</span>
                    </div>
                    <div class="detail-item">
                        <strong>Joined:</strong>
                        <span>${new Date(contractor.createdAt).toLocaleDateString()}</span>
                    </div>
                </div>
            </div>

            <div class="detail-section">
                <h3>Statistics</h3>
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-number">${stats.totalViolations}</div>
                        <div class="stat-label">Total Violations</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number">${stats.recentActivity}</div>
                        <div class="stat-label">Recent Activities (7d)</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number">${stats.utilizationRate}%</div>
                        <div class="stat-label">Utilization Rate</div>
                    </div>
                </div>
            </div>

            <div class="detail-section">
                <h3>Activity Chart (Last 7 Days)</h3>
                <canvas id="activityChart" style="max-height: 300px;"></canvas>
            </div>

            <div class="detail-section">
                <h3>Recent Violations (${violations.length})</h3>
                <div class="violations-list">
                    ${violations.length > 0 ? violations.map(v => `
                        <div class="violation-item">
                            <span>${new Date(v.timestamp).toLocaleString()}</span>
                            <span class="text-danger">Capacity exceeded</span>
                            <span>${v.currentOccupancy}/${v.maxCapacity}</span>
                        </div>
                    `).join('') : '<p class="text-muted">No violations found.</p>'}
                </div>
            </div>

            <div class="detail-section">
                <h3>Recent Activity (Last 50)</h3>
                <div class="activity-list">
                    ${logs.map(log => `
                        <div class="activity-item ${log.isViolation ? 'violation' : ''}">
                            <span>${new Date(log.timestamp).toLocaleString()}</span>
                            <span>${log.action === 'entry' ? '➕ Entry' : '➖ Exit'}</span>
                            <span>${log.currentOccupancy}/${log.maxCapacity}</span>
                            ${log.isViolation ? '<span class="text-danger">⚠️ VIOLATION</span>' : ''}
                        </div>
                    `).join('')}
                </div>
            </div>

            ${contractor.notes && contractor.notes.length > 0 ? `
                <div class="detail-section">
                    <h3>Admin Actions & Notes</h3>
                    ${contractor.notes.slice().reverse().map(note => `
                        <div style="background: white; padding: 15px; border-radius: 6px; margin-bottom: 10px; border-left: 4px solid #ffa500;">
                            <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                                <strong style="color: #1a5490;">${note.type.toUpperCase()}</strong>
                                <span style="color: #666; font-size: 0.85rem;">${new Date(note.timestamp).toLocaleString()}</span>
                            </div>
                            <p style="margin: 5px 0;">${note.message}</p>
                            <p style="margin: 5px 0; font-style: italic; color: #666;"><em>Reason: ${note.reason}</em></p>
                            <p style="margin: 5px 0; font-size: 0.85rem; color: #888;">By: ${note.performedBy}</p>
                        </div>
                    `).join('')}
                </div>
            ` : ''}
        `;

        document.getElementById('detailsBody').innerHTML = html;
        document.getElementById('detailsModal').style.display = 'block';

        // Create activity chart
        createActivityChart(activityByDate);
    } catch (error) {
        console.error('Error loading details:', error);
        alert('Error loading contractor details');
    }
}

function createActivityChart(activityByDate) {
    const ctx = document.getElementById('activityChart');
    if (!ctx) return;

    const dates = Object.keys(activityByDate).sort();
    const entries = dates.map(date => activityByDate[date].entries);
    const exits = dates.map(date => activityByDate[date].exits);

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: dates.map(d => new Date(d).toLocaleDateString()),
            datasets: [
                {
                    label: 'Entries',
                    data: entries,
                    borderColor: '#28a745',
                    backgroundColor: 'rgba(40, 167, 69, 0.1)',
                    tension: 0.4
                },
                {
                    label: 'Exits',
                    data: exits,
                    borderColor: '#ffa500',
                    backgroundColor: 'rgba(255, 165, 0, 0.1)',
                    tension: 0.4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'top',
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

async function editContractor(contractorId) {
    try {
        const response = await fetch(`${API_URL}/contractors/${contractorId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();
        if (!data.success) {
            alert('Failed to load contractor');
            return;
        }

        const contractor = data.contractor;
        currentContractorId = contractorId;

        document.getElementById('editLotName').value = contractor.parkingLotName;
        document.getElementById('editCapacity').value = contractor.maxCapacity;
        document.getElementById('editStatus').value = contractor.status;

        document.getElementById('editModal').style.display = 'block';
    } catch (error) {
        console.error('Error loading contractor for edit:', error);
        alert('Error loading contractor');
    }
}

async function saveEdit(event) {
    event.preventDefault();

    const parkingLotName = document.getElementById('editLotName').value;
    const maxCapacity = parseInt(document.getElementById('editCapacity').value);
    const status = document.getElementById('editStatus').value;

    try {
        const response = await fetch(`${API_URL}/contractors/${currentContractorId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ parkingLotName, maxCapacity, status })
        });

        const data = await response.json();
        if (data.success) {
            alert('Contractor updated successfully!');
            closeEditModal();
            loadContractors();
        } else {
            alert('Failed to update contractor: ' + data.message);
        }
    } catch (error) {
        console.error('Error updating contractor:', error);
        alert('Error updating contractor');
    }
}

function openActionModal(contractorId) {
    currentContractorId = contractorId;
    document.getElementById('actionForm').reset();
    document.getElementById('durationGroup').style.display = 'none';
    document.getElementById('actionModal').style.display = 'block';
}

function toggleDuration() {
    const actionType = document.getElementById('actionType').value;
    document.getElementById('durationGroup').style.display = actionType === 'suspend' ? 'block' : 'none';
}

async function takeAction(event) {
    event.preventDefault();

    const actionType = document.getElementById('actionType').value;
    const reason = document.getElementById('actionReason').value;
    const duration = document.getElementById('actionDuration').value;

    try {
        const response = await fetch(`${API_URL}/contractors/${currentContractorId}/action`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ actionType, reason, duration })
        });

        const data = await response.json();
        if (data.success) {
            alert(data.message);
            closeActionModal();
            loadContractors();
        } else {
            alert('Failed to take action: ' + data.message);
        }
    } catch (error) {
        console.error('Error taking action:', error);
        alert('Error taking action');
    }
}

function closeDetailsModal() {
    document.getElementById('detailsModal').style.display = 'none';
}

function closeEditModal() {
    document.getElementById('editModal').style.display = 'none';
    currentContractorId = null;
}

function closeActionModal() {
    document.getElementById('actionModal').style.display = 'none';
    currentContractorId = null;
}

// Close modals when clicking outside
window.onclick = function (event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
    }
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'index.html';
}
