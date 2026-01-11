// settings.js
// System Settings Page JavaScript

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

// Load saved settings from localStorage
function loadSettings() {
    const settings = JSON.parse(localStorage.getItem('systemSettings') || '{}');

    // Notification Settings
    document.getElementById('emailViolations').checked = settings.emailViolations !== false;
    document.getElementById('emailDaily').checked = settings.emailDaily !== false;
    document.getElementById('emailWeekly').checked = settings.emailWeekly || false;

    // Dashboard Settings
    document.getElementById('autoRefresh').checked = settings.autoRefresh !== false;
    document.getElementById('soundAlerts').checked = settings.soundAlerts || false;
    document.getElementById('showCharts').checked = settings.showCharts !== false;

    // Threshold Settings
    document.getElementById('capacityThreshold').value = settings.capacityThreshold || 100;
    document.getElementById('warningThreshold').value = settings.warningThreshold || 90;

    // Data Retention
    document.getElementById('logRetention').value = settings.logRetention || 365;
    document.getElementById('autoBackup').checked = settings.autoBackup !== false;
    document.getElementById('backupRetention').value = settings.backupRetention || 30;

    // System Preferences
    document.getElementById('itemsPerPage').value = settings.itemsPerPage || 50;
    document.getElementById('dateFormat').value = settings.dateFormat || 'DD/MM/YYYY';
    document.getElementById('timezone').value = settings.timezone || 'Asia/Kolkata';
    document.getElementById('timeFormat').value = settings.timeFormat || '12';
}

// Save settings
async function saveSettings() {
    const saveBtn = document.getElementById('saveBtn');
    const messageBox = document.getElementById('messageBox');

    // Disable button
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';

    // Collect all settings
    const settings = {
        // Notification Settings
        emailViolations: document.getElementById('emailViolations').checked,
        emailDaily: document.getElementById('emailDaily').checked,
        emailWeekly: document.getElementById('emailWeekly').checked,

        // Dashboard Settings
        autoRefresh: document.getElementById('autoRefresh').checked,
        soundAlerts: document.getElementById('soundAlerts').checked,
        showCharts: document.getElementById('showCharts').checked,

        // Threshold Settings
        capacityThreshold: parseInt(document.getElementById('capacityThreshold').value),
        warningThreshold: parseInt(document.getElementById('warningThreshold').value),

        // Data Retention
        logRetention: parseInt(document.getElementById('logRetention').value),
        autoBackup: document.getElementById('autoBackup').checked,
        backupRetention: parseInt(document.getElementById('backupRetention').value),

        // System Preferences
        itemsPerPage: parseInt(document.getElementById('itemsPerPage').value),
        dateFormat: document.getElementById('dateFormat').value,
        timezone: document.getElementById('timezone').value,
        timeFormat: document.getElementById('timeFormat').value,

        // Metadata
        lastUpdated: new Date().toISOString(),
        updatedBy: user.email
    };

    try {
        // Save to localStorage
        localStorage.setItem('systemSettings', JSON.stringify(settings));

        // Optional: Send to backend API
        // const response = await fetch(`${API_URL}/settings/update`, {
        //     method: 'POST',
        //     headers: {
        //         'Content-Type': 'application/json',
        //         'Authorization': `Bearer ${token}`
        //     },
        //     body: JSON.stringify(settings)
        // });

        // Show success message
        showMessage('✓ Settings saved successfully!', 'success');

        // Apply settings immediately
        applySettings(settings);

    } catch (error) {
        console.error('Error saving settings:', error);
        showMessage('✗ Failed to save settings. Please try again.', 'error');
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = '💾 Save All Settings';
    }
}

// Reset settings to defaults
function resetSettings() {
    if (confirm('Are you sure you want to reset all settings to defaults? This cannot be undone.')) {
        localStorage.removeItem('systemSettings');
        loadSettings();
        showMessage('ℹ️ Settings reset to defaults. Click "Save All Settings" to apply.', 'info');
    }
}

// Apply settings to the application
function applySettings(settings) {
    // Apply auto-refresh setting
    if (settings.autoRefresh) {
        console.log('Auto-refresh enabled');
    }

    // Apply sound alerts
    if (settings.soundAlerts) {
        console.log('Sound alerts enabled');
    }

    // Apply other settings as needed
    console.log('Settings applied:', settings);
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

// Validate threshold values
document.getElementById('capacityThreshold').addEventListener('change', function () {
    const value = parseInt(this.value);
    if (value < 90) this.value = 90;
    if (value > 150) this.value = 150;
});

document.getElementById('warningThreshold').addEventListener('change', function () {
    const value = parseInt(this.value);
    const capacityThreshold = parseInt(document.getElementById('capacityThreshold').value);
    if (value < 70) this.value = 70;
    if (value > capacityThreshold) this.value = capacityThreshold;
});

// Load settings on page load
loadSettings();

// Show info message on load
setTimeout(() => {
    showMessage('ℹ️ Configure your system settings below. Don\'t forget to save your changes!', 'info');
}, 500);
