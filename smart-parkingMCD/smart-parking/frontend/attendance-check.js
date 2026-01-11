// Attendance-based Access Control
// Contractors must mark attendance before accessing other features

// Check if contractor has marked attendance today
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

// Check attendance status on page load
function enforceAttendanceCheck() {
    const currentPage = window.location.pathname.split('/').pop();

    // Pages that don't require attendance check
    const exemptPages = ['index.html', 'geofence-attendance.html', 'index.html'];

    // If on an exempt page, don't check
    if (exemptPages.includes(currentPage)) {
        return;
    }

    // Check if attendance is marked
    const hasAttendance = checkTodayAttendance();

    if (!hasAttendance) {
        // Show alert and redirect to attendance page
        alert('⚠️ Attendance Required!\n\nYou must mark your attendance before accessing this feature.\n\nRedirecting to Attendance page...');
        window.location.href = 'geofence-attendance.html';
    }
}

// Export functions for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { checkTodayAttendance, enforceAttendanceCheck };
}
