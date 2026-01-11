// Professional Government-Style Attendance Modal

function showAttendanceRequiredModal() {
    // Create modal HTML
    const modalHTML = `
        <div id="attendanceModal" class="attendance-modal-overlay active">
            <div class="attendance-modal">
                <!-- Header -->
                <div class="attendance-modal-header">
                    <div class="attendance-modal-header-content">
                        <div class="attendance-modal-icon">
                            <svg width="35" height="35" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" fill="white"/>
                            </svg>
                        </div>
                        <div class="attendance-modal-title">
                            <h2>⚠️ Attendance Verification Required</h2>
                            <p>Municipal Corporation of Delhi - Smart Parking System</p>
                        </div>
                    </div>
                </div>

                <!-- Body -->
                <div class="attendance-modal-body">
                    <!-- MCD Emblem -->
                    <div class="mcd-emblem">
                        <svg width="60" height="60" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="12" cy="12" r="10" stroke="#1a5490" stroke-width="2" fill="rgba(26, 84, 144, 0.1)"/>
                            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="#1a5490"/>
                        </svg>
                        <div class="mcd-emblem-text">Government of NCT of Delhi</div>
                    </div>

                    <!-- Notice Box -->
                    <div class="attendance-notice-box">
                        <h3>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" fill="#856404"/>
                            </svg>
                            Mandatory Attendance Compliance
                        </h3>
                        <p>
                            As per MCD regulations and service guidelines, all contractors and staff members must mark their 
                            geofenced attendance before accessing operational systems. This is a mandatory requirement to ensure 
                            accountability and prevent unauthorized access.
                        </p>
                    </div>

                    <!-- Requirements -->
                    <div class="attendance-requirements">
                        <h4>📋 Attendance Verification Requirements:</h4>
                        <ul>
                            <li>Physical presence at assigned parking location (GPS verified)</li>
                            <li>Geofenced selfie capture with timestamp</li>
                            <li>Location must be within 50-meter radius of parking lot</li>
                            <li>Valid for current date only (must be marked daily)</li>
                        </ul>
                    </div>

                    <div style="background: #e7f3ff; padding: 15px; border-radius: 6px; border-left: 4px solid #1a5490;">
                        <p style="margin: 0; color: #1a5490; font-size: 0.9rem; line-height: 1.6;">
                            <strong>📍 Next Step:</strong> You will be redirected to the Attendance Verification page. 
                            Please ensure you are physically present at your assigned parking location and have enabled 
                            location services on your device.
                        </p>
                    </div>
                </div>

                <!-- Footer -->
                <div class="attendance-modal-footer">
                    <div class="attendance-footer-note">
                        Ref: MCD/PARKING/ATT/2026
                    </div>
                    <button class="attendance-modal-button" onclick="proceedToAttendance()">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" fill="white"/>
                        </svg>
                        Proceed to Mark Attendance
                    </button>
                </div>
            </div>
        </div>
    `;

    // Add modal to body
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Prevent body scroll
    document.body.style.overflow = 'hidden';
}

function proceedToAttendance() {
    // Remove modal
    const modal = document.getElementById('attendanceModal');
    if (modal) {
        modal.remove();
    }

    // Restore body scroll
    document.body.style.overflow = '';

    // Redirect to attendance page
    window.location.href = 'geofence-attendance.html';
}

// Export function for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { showAttendanceRequiredModal };
}
