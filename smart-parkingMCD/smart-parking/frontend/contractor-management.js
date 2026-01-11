// Mock data for demonstration
let contractors = [
    {
        id: 1,
        email: 'contractor1@parking.com',
        parkingLotName: 'Connaught Place Parking',
        parkingLotId: 'CP-001',
        maxCapacity: 150,
        currentOccupancy: 142,
        violationCount: 5,
        warnings: 1,
        status: 'active',
        createdAt: '2025-12-01',
        recentActivity: 247,
        notes: [
            {
                type: 'warning',
                reason: 'Exceeded capacity multiple times',
                message: 'Warning issued. Total warnings: 1',
                timestamp: '2026-01-05T10:30:00',
                performedBy: 'admin@mcd.gov.in'
            }
        ]
    },
    {
        id: 2,
        email: 'contractor2@parking.com',
        parkingLotName: 'Karol Bagh Parking Zone',
        parkingLotId: 'KB-002',
        maxCapacity: 200,
        currentOccupancy: 185,
        violationCount: 2,
        warnings: 0,
        status: 'active',
        createdAt: '2025-11-15',
        recentActivity: 312,
        notes: []
    },
    {
        id: 3,
        email: 'contractor3@parking.com',
        parkingLotName: 'Nehru Place Complex',
        parkingLotId: 'NP-003',
        maxCapacity: 180,
        currentOccupancy: 195,
        violationCount: 12,
        warnings: 3,
        status: 'suspended',
        createdAt: '2025-10-20',
        recentActivity: 156,
        suspendedUntil: '2026-01-20',
        notes: [
            {
                type: 'warning',
                reason: 'Capacity violations',
                message: 'Warning issued. Total warnings: 1',
                timestamp: '2025-12-10T14:20:00',
                performedBy: 'admin@mcd.gov.in'
            },
            {
                type: 'warning',
                reason: 'Repeated violations',
                message: 'Warning issued. Total warnings: 2',
                timestamp: '2025-12-20T09:15:00',
                performedBy: 'admin@mcd.gov.in'
            },
            {
                type: 'suspend',
                reason: 'Multiple capacity violations despite warnings',
                message: 'Suspended for 10 days',
                timestamp: '2026-01-10T11:00:00',
                performedBy: 'admin@mcd.gov.in'
            }
        ]
    },
    {
        id: 4,
        email: 'contractor4@parking.com',
        parkingLotName: 'Saket Metro Parking',
        parkingLotId: 'SM-004',
        maxCapacity: 120,
        currentOccupancy: 98,
        violationCount: 0,
        warnings: 0,
        status: 'active',
        createdAt: '2025-12-10',
        recentActivity: 189,
        notes: []
    },
    {
        id: 5,
        email: 'contractor5@parking.com',
        parkingLotName: 'Rajiv Chowk Underground',
        parkingLotId: 'RC-005',
        maxCapacity: 250,
        currentOccupancy: 230,
        violationCount: 1,
        warnings: 0,
        status: 'active',
        createdAt: '2025-11-01',
        recentActivity: 421,
        notes: []
    }
];

// Generate mock activity logs
function generateMockActivity(contractorId, count = 50) {
    const activities = [];
    const contractor = contractors.find(c => c.id === contractorId);
    if (!contractor) return [];

    for (let i = 0; i < count; i++) {
        const isEntry = Math.random() > 0.5;
        const timestamp = new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000);
        const occupancy = Math.floor(Math.random() * (contractor.maxCapacity + 20));
        const isViolation = occupancy > contractor.maxCapacity;

        activities.push({
            action: isEntry ? 'entry' : 'exit',
            timestamp: timestamp.toISOString(),
            currentOccupancy: occupancy,
            maxCapacity: contractor.maxCapacity,
            isViolation
        });
    }

    return activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

// Generate mock violations
function generateMockViolations(contractorId, count) {
    const violations = [];
    const contractor = contractors.find(c => c.id === contractorId);
    if (!contractor) return [];

    for (let i = 0; i < count; i++) {
        const timestamp = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000);
        const overcapacity = Math.floor(Math.random() * 20) + 1;

        violations.push({
            timestamp: timestamp.toISOString(),
            currentOccupancy: contractor.maxCapacity + overcapacity,
            maxCapacity: contractor.maxCapacity,
            violationAmount: overcapacity
        });
    }

    return violations.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

// Authentication check
let token = localStorage.getItem('token');
let user = JSON.parse(localStorage.getItem('user') || '{}');

if (!token || user.role !== 'admin') {
    window.location.href = 'login.html';
}

document.getElementById('userEmail').textContent = user.email;

// Current contractor being edited/actioned
let currentContractorId = null;

// Load contractors on page load
loadContractors();

function loadContractors() {
    displayContractors(contractors);
}

function displayContractors(contractorsList) {
    const grid = document.getElementById('contractorsGrid');

    if (contractorsList.length === 0) {
        grid.innerHTML = '<p class="text-muted">No contractors found.</p>';
        return;
    }

    const html = contractorsList.map(contractor => {
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
                    <button onclick="viewDetails(${contractor.id})" class="btn btn-sm btn-primary">View Details</button>
                    <button onclick="editContractor(${contractor.id})" class="btn btn-sm btn-secondary">Edit</button>
                    <button onclick="openActionModal(${contractor.id})" class="btn btn-sm btn-warning">Take Action</button>
                </div>
            </div>
        `;
    }).join('');

    grid.innerHTML = html;
}

function viewDetails(contractorId) {
    const contractor = contractors.find(c => c.id === contractorId);
    if (!contractor) return;

    const activities = generateMockActivity(contractorId, 50);
    const violations = generateMockViolations(contractorId, contractor.violationCount);
    const utilization = Math.round((contractor.currentOccupancy / contractor.maxCapacity) * 100);

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
                    <span>${contractor.currentOccupancy}</span>
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
                    <div class="stat-number">${contractor.violationCount}</div>
                    <div class="stat-label">Total Violations</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${contractor.recentActivity}</div>
                    <div class="stat-label">Recent Activities</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${utilization}%</div>
                    <div class="stat-label">Avg Utilization</div>
                </div>
            </div>
        </div>

        <div class="detail-section">
            <h3>Recent Violations (${violations.length})</h3>
            <div class="violations-list">
                ${violations.length > 0 ? violations.map(v => `
                    <div class="violation-item">
                        <span>${new Date(v.timestamp).toLocaleString()}</span>
                        <span class="text-danger">+${v.violationAmount} over capacity</span>
                        <span>${v.currentOccupancy}/${v.maxCapacity}</span>
                    </div>
                `).join('') : '<p class="text-muted">No violations found.</p>'}
            </div>
        </div>

        <div class="detail-section">
            <h3>Recent Activity (Last 50)</h3>
            <div class="activity-list">
                ${activities.map(log => `
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
}

function editContractor(contractorId) {
    const contractor = contractors.find(c => c.id === contractorId);
    if (!contractor) return;

    currentContractorId = contractorId;
    document.getElementById('editLotName').value = contractor.parkingLotName;
    document.getElementById('editCapacity').value = contractor.maxCapacity;
    document.getElementById('editStatus').value = contractor.status;

    document.getElementById('editModal').style.display = 'block';
}

function saveEdit(event) {
    event.preventDefault();

    const contractor = contractors.find(c => c.id === currentContractorId);
    if (!contractor) return;

    contractor.parkingLotName = document.getElementById('editLotName').value;
    contractor.maxCapacity = parseInt(document.getElementById('editCapacity').value);
    contractor.status = document.getElementById('editStatus').value;

    alert('Contractor updated successfully!');
    closeEditModal();
    loadContractors();
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

function takeAction(event) {
    event.preventDefault();

    const contractor = contractors.find(c => c.id === currentContractorId);
    if (!contractor) return;

    const actionType = document.getElementById('actionType').value;
    const reason = document.getElementById('actionReason').value;
    const duration = document.getElementById('actionDuration').value;

    const action = {
        type: actionType,
        reason,
        timestamp: new Date().toISOString(),
        performedBy: user.email
    };

    switch (actionType) {
        case 'warning':
            contractor.warnings += 1;
            action.message = `Warning issued. Total warnings: ${contractor.warnings}`;
            break;
        case 'suspend':
            contractor.status = 'suspended';
            if (duration) {
                const suspendDate = new Date();
                suspendDate.setDate(suspendDate.getDate() + parseInt(duration));
                contractor.suspendedUntil = suspendDate.toISOString();
                action.message = `Suspended for ${duration} days`;
            } else {
                action.message = 'Suspended indefinitely';
            }
            break;
        case 'activate':
            contractor.status = 'active';
            contractor.suspendedUntil = null;
            action.message = 'Account activated';
            break;
        case 'reset':
            contractor.warnings = 0;
            action.message = 'Warnings reset to 0';
            break;
    }

    if (!contractor.notes) contractor.notes = [];
    contractor.notes.push(action);

    alert(action.message);
    closeActionModal();
    loadContractors();
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
    window.location.href = 'login.html';
}
