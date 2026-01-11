// issues.js
// Issues Reporting Page JavaScript

const API_URL = 'http://localhost:3000/api';
let token = localStorage.getItem('token');
let user = JSON.parse(localStorage.getItem('user') || '{}');
let allIssues = [];

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

// Load issues on page load
loadIssues();

// Form submission handler
document.getElementById('issueReportForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const submitBtn = document.getElementById('submitBtn');
    const messageBox = document.getElementById('messageBox');

    // Get form values
    const issueData = {
        type: document.getElementById('issueType').value,
        priority: document.getElementById('priority').value,
        title: document.getElementById('issueTitle').value.trim(),
        description: document.getElementById('issueDescription').value.trim(),
        affectedArea: document.getElementById('affectedArea').value.trim(),
        browserInfo: document.getElementById('browserInfo').value.trim() || navigator.userAgent,
        reportedBy: user.email,
        reportedAt: new Date().toISOString(),
        status: 'open',
        id: 'ISSUE-' + Date.now()
    };

    // Disable button
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting...';
    messageBox.style.display = 'none';

    try {
        // Save to localStorage (in production, this would be an API call)
        const issues = JSON.parse(localStorage.getItem('systemIssues') || '[]');
        issues.unshift(issueData);
        localStorage.setItem('systemIssues', JSON.stringify(issues));

        // Optional: Send to backend API
        // const response = await fetch(`${API_URL}/issues/report`, {
        //     method: 'POST',
        //     headers: {
        //         'Content-Type': 'application/json',
        //         'Authorization': `Bearer ${token}`
        //     },
        //     body: JSON.stringify(issueData)
        // });

        // Show success message
        showMessage(`✓ Issue reported successfully! Issue ID: ${issueData.id}`, 'success');

        // Reset form
        document.getElementById('issueReportForm').reset();

        // Reload issues list
        loadIssues();

    } catch (error) {
        console.error('Error reporting issue:', error);
        showMessage('✗ Failed to submit issue report. Please try again.', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = '📤 Submit Issue Report';
    }
});

// Load all issues
function loadIssues() {
    try {
        allIssues = JSON.parse(localStorage.getItem('systemIssues') || '[]');

        // Update statistics
        updateStatistics();

        // Display issues
        displayIssues(allIssues);

    } catch (error) {
        console.error('Error loading issues:', error);
        document.getElementById('issuesList').innerHTML =
            '<p class="text-muted">Error loading issues.</p>';
    }
}

// Update statistics
function updateStatistics() {
    const total = allIssues.length;
    const open = allIssues.filter(i => i.status === 'open' || i.status === 'in-progress').length;
    const critical = allIssues.filter(i => i.priority === 'critical').length;

    document.getElementById('totalIssues').textContent = total;
    document.getElementById('openIssues').textContent = open;
    document.getElementById('criticalIssues').textContent = critical;
}

// Display issues
function displayIssues(issues) {
    const issuesList = document.getElementById('issuesList');

    if (issues.length === 0) {
        issuesList.innerHTML = '<p class="text-muted">No issues reported yet.</p>';
        return;
    }

    issuesList.innerHTML = issues.map(issue => {
        const priorityClass = {
            'low': 'priority-low',
            'medium': 'priority-medium',
            'high': 'priority-high',
            'critical': 'priority-critical'
        }[issue.priority] || '';

        const statusClass = {
            'open': 'status-open',
            'in-progress': 'status-progress',
            'resolved': 'status-resolved',
            'closed': 'status-closed'
        }[issue.status] || '';

        const priorityIcon = {
            'low': '🟢',
            'medium': '🟡',
            'high': '🟠',
            'critical': '🔴'
        }[issue.priority] || '⚪';

        return `
            <div class="issue-item ${priorityClass}">
                <div class="issue-header">
                    <div class="issue-title-section">
                        <span class="issue-id">${issue.id}</span>
                        <h3>${issue.title}</h3>
                    </div>
                    <div class="issue-badges">
                        <span class="priority-badge ${priorityClass}">${priorityIcon} ${issue.priority.toUpperCase()}</span>
                        <span class="status-badge ${statusClass}">${issue.status.toUpperCase()}</span>
                    </div>
                </div>
                <div class="issue-body">
                    <p>${issue.description}</p>
                    <div class="issue-meta">
                        <span>📂 Type: ${issue.type}</span>
                        <span>👤 Reported by: ${issue.reportedBy}</span>
                        <span>📅 ${new Date(issue.reportedAt).toLocaleString()}</span>
                        ${issue.affectedArea ? `<span>🎯 Area: ${issue.affectedArea}</span>` : ''}
                    </div>
                </div>
                <div class="issue-actions">
                    <button class="btn-action" onclick="updateIssueStatus('${issue.id}', 'in-progress')" title="Mark as In Progress">
                        ⏳
                    </button>
                    <button class="btn-action" onclick="updateIssueStatus('${issue.id}', 'resolved')" title="Mark as Resolved">
                        ✅
                    </button>
                    <button class="btn-action" onclick="deleteIssue('${issue.id}')" title="Delete Issue">
                        🗑️
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// Filter issues by status
function filterIssues() {
    const filter = document.getElementById('statusFilter').value;

    if (filter === 'all') {
        displayIssues(allIssues);
    } else {
        const filtered = allIssues.filter(issue => issue.status === filter);
        displayIssues(filtered);
    }
}

// Update issue status
function updateIssueStatus(issueId, newStatus) {
    const issues = JSON.parse(localStorage.getItem('systemIssues') || '[]');
    const issueIndex = issues.findIndex(i => i.id === issueId);

    if (issueIndex !== -1) {
        issues[issueIndex].status = newStatus;
        issues[issueIndex].updatedAt = new Date().toISOString();
        localStorage.setItem('systemIssues', JSON.stringify(issues));

        showMessage(`✓ Issue ${issueId} marked as ${newStatus}`, 'success');
        loadIssues();
    }
}

// Delete issue
function deleteIssue(issueId) {
    if (confirm(`Are you sure you want to delete issue ${issueId}?`)) {
        let issues = JSON.parse(localStorage.getItem('systemIssues') || '[]');
        issues = issues.filter(i => i.id !== issueId);
        localStorage.setItem('systemIssues', JSON.stringify(issues));

        showMessage(`✓ Issue ${issueId} deleted successfully`, 'success');
        loadIssues();
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

// Auto-refresh issues every 30 seconds
setInterval(loadIssues, 30000);
