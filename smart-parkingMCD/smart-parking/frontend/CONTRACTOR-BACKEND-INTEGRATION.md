# Contractor Management - Backend Integration Guide

## Current Status
✅ **Frontend Complete** - Fully functional UI with mock data  
⏳ **Backend Integration** - Pending (follow this guide when ready)

---

## Overview

The contractor management page currently uses **mock/sample data** for demonstration. This guide will help you connect it to real backend APIs when ready.

---

## Required Backend API Endpoints

You'll need to create these endpoints in your backend:

### 1. **GET /api/parking/admin/contractors**
Get all contractors with their statistics.

**Response Format:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "contractor_id",
      "email": "contractor@example.com",
      "parkingLotName": "Parking Lot Name",
      "parkingLotId": "LOT-001",
      "maxCapacity": 150,
      "currentOccupancy": 142,
      "utilizationPercent": 95,
      "violationCount": 5,
      "recentActivity": 247,
      "warnings": 1,
      "status": "active",
      "createdAt": "2025-12-01T00:00:00Z"
    }
  ]
}
```

### 2. **GET /api/parking/admin/contractors/:id**
Get detailed information about a specific contractor.

**Response Format:**
```json
{
  "success": true,
  "data": {
    "contractor": {
      "_id": "contractor_id",
      "email": "contractor@example.com",
      "parkingLotId": "LOT-001",
      "parkingLotName": "Parking Lot Name",
      "maxCapacity": 150,
      "status": "active",
      "warnings": 1,
      "createdAt": "2025-12-01T00:00:00Z",
      "notes": [
        {
          "type": "warning",
          "reason": "Exceeded capacity",
          "message": "Warning issued. Total warnings: 1",
          "timestamp": "2026-01-05T10:30:00Z",
          "performedBy": "admin@mcd.gov.in"
        }
      ]
    },
    "currentOccupancy": 142,
    "recentActivity": [
      {
        "action": "entry",
        "timestamp": "2026-01-11T10:00:00Z",
        "currentOccupancy": 142,
        "maxCapacity": 150,
        "isViolation": false
      }
    ],
    "violations": [
      {
        "timestamp": "2026-01-10T15:30:00Z",
        "currentOccupancy": 155,
        "maxCapacity": 150,
        "violationAmount": 5
      }
    ],
    "stats": {
      "totalViolations": 5,
      "totalActivity": 247,
      "avgOccupancy": 135
    }
  }
}
```

### 3. **PUT /api/parking/admin/contractors/:id**
Update contractor information.

**Request Body:**
```json
{
  "parkingLotName": "Updated Parking Lot Name",
  "maxCapacity": 200,
  "status": "active"
}
```

**Response Format:**
```json
{
  "success": true,
  "message": "Contractor updated successfully.",
  "data": {
    "_id": "contractor_id",
    "email": "contractor@example.com",
    "parkingLotName": "Updated Parking Lot Name",
    "maxCapacity": 200,
    "status": "active"
  }
}
```

### 4. **POST /api/parking/admin/contractors/:id/action**
Take administrative action against a contractor.

**Request Body:**
```json
{
  "actionType": "warning",  // or "suspend", "activate", "reset"
  "reason": "Exceeded capacity multiple times",
  "duration": 10  // optional, only for suspend action (in days)
}
```

**Response Format:**
```json
{
  "success": true,
  "message": "Warning issued. Total warnings: 2",
  "data": {
    "contractor": {
      "_id": "contractor_id",
      "email": "contractor@example.com",
      "status": "active",
      "warnings": 2
    },
    "action": {
      "type": "warning",
      "reason": "Exceeded capacity multiple times",
      "message": "Warning issued. Total warnings: 2",
      "timestamp": "2026-01-11T12:00:00Z",
      "performedBy": "admin@mcd.gov.in"
    }
  }
}
```

---

## Frontend Code Changes

### File: `contractor-management.js`

#### Step 1: Add API URL Configuration
At the top of the file, add:
```javascript
const API_URL = 'http://localhost:3000/api';
```

#### Step 2: Replace `loadContractors()` Function

**Current (Mock Data):**
```javascript
function loadContractors() {
    displayContractors(contractors);
}
```

**Replace with (Real API):**
```javascript
async function loadContractors() {
    try {
        const response = await fetch(`${API_URL}/parking/admin/contractors`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const result = await response.json();
        if (result.success) {
            contractors = result.data; // Update global contractors array
            displayContractors(result.data);
        } else {
            document.getElementById('contractorsGrid').innerHTML = 
                '<p class="text-muted">Failed to load contractors.</p>';
        }
    } catch (error) {
        console.error('Error loading contractors:', error);
        document.getElementById('contractorsGrid').innerHTML = 
            '<p class="text-muted">Error loading contractors. Please try again.</p>';
    }
}
```

#### Step 3: Replace `viewDetails()` Function

**Current (Mock Data):**
```javascript
function viewDetails(contractorId) {
    const contractor = contractors.find(c => c.id === contractorId);
    // ... uses generateMockActivity and generateMockViolations
}
```

**Replace with (Real API):**
```javascript
async function viewDetails(contractorId) {
    try {
        const response = await fetch(`${API_URL}/parking/admin/contractors/${contractorId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const result = await response.json();
        if (!result.success) {
            alert('Failed to load contractor details.');
            return;
        }

        const { contractor, currentOccupancy, recentActivity, violations, stats } = result.data;
        const utilization = Math.round((currentOccupancy / contractor.maxCapacity) * 100);

        const html = `
            <div class="detail-section">
                <h3>Basic Information</h3>
                <div class="detail-grid">
                    <div class="detail-item">
                        <strong>Email:</strong>
                        <span>${contractor.email}</span>
                    </div>
                    <!-- ... rest of the details ... -->
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
                        <div class="stat-number">${stats.totalActivity}</div>
                        <div class="stat-label">Recent Activities</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number">${stats.avgOccupancy}</div>
                        <div class="stat-label">Avg Occupancy</div>
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
                    ${recentActivity.map(log => `
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
    } catch (error) {
        console.error('Error loading contractor details:', error);
        alert('Error loading contractor details.');
    }
}
```

#### Step 4: Replace `saveEdit()` Function

**Current (Mock Data):**
```javascript
function saveEdit(event) {
    event.preventDefault();
    const contractor = contractors.find(c => c.id === currentContractorId);
    contractor.parkingLotName = document.getElementById('editLotName').value;
    // ... updates local data
}
```

**Replace with (Real API):**
```javascript
async function saveEdit(event) {
    event.preventDefault();

    const data = {
        parkingLotName: document.getElementById('editLotName').value,
        maxCapacity: parseInt(document.getElementById('editCapacity').value),
        status: document.getElementById('editStatus').value
    };

    try {
        const response = await fetch(`${API_URL}/parking/admin/contractors/${currentContractorId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();
        if (result.success) {
            alert('Contractor updated successfully!');
            closeEditModal();
            loadContractors(); // Reload the list
        } else {
            alert('Failed to update contractor: ' + result.message);
        }
    } catch (error) {
        console.error('Error updating contractor:', error);
        alert('Error updating contractor.');
    }
}
```

#### Step 5: Replace `takeAction()` Function

**Current (Mock Data):**
```javascript
function takeAction(event) {
    event.preventDefault();
    const contractor = contractors.find(c => c.id === currentContractorId);
    // ... updates local data
}
```

**Replace with (Real API):**
```javascript
async function takeAction(event) {
    event.preventDefault();

    const data = {
        actionType: document.getElementById('actionType').value,
        reason: document.getElementById('actionReason').value,
        duration: document.getElementById('actionDuration').value ? 
                  parseInt(document.getElementById('actionDuration').value) : null
    };

    try {
        const response = await fetch(`${API_URL}/parking/admin/contractors/${currentContractorId}/action`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();
        if (result.success) {
            alert(result.message);
            closeActionModal();
            loadContractors(); // Reload the list
        } else {
            alert('Failed to perform action: ' + result.message);
        }
    } catch (error) {
        console.error('Error performing action:', error);
        alert('Error performing action.');
    }
}
```

#### Step 6: Remove Mock Data Functions

Delete these functions as they won't be needed:
- `generateMockActivity()`
- `generateMockViolations()`
- The `contractors` array at the top (it will be populated from API)

---

## Testing Checklist

After implementing backend APIs:

- [ ] Load contractors list successfully
- [ ] View contractor details with all sections
- [ ] Edit contractor information
- [ ] Issue warning (increment counter)
- [ ] Suspend contractor (with/without duration)
- [ ] Activate suspended contractor
- [ ] Reset warnings to 0
- [ ] Verify action history appears in notes
- [ ] Check error handling for failed API calls
- [ ] Verify authentication token is sent correctly

---

## Error Handling

Make sure to handle these scenarios:
- Network errors (server down)
- Authentication errors (invalid token)
- Not found errors (contractor doesn't exist)
- Validation errors (invalid data)

Example error handling pattern:
```javascript
try {
    const response = await fetch(url, options);
    const result = await response.json();
    
    if (!result.success) {
        alert('Error: ' + result.message);
        return;
    }
    
    // Success handling
} catch (error) {
    console.error('Error:', error);
    alert('Network error. Please try again.');
}
```

---

## Notes

- The frontend is **fully functional** with mock data right now
- You can test all UI features without backend
- When backend is ready, follow this guide to connect
- Keep the mock data version as backup for testing UI changes

---

**Last Updated:** January 11, 2026  
**Status:** Frontend Complete, Backend Integration Pending
