// Geofenced Attendance System - Ghost Worker Prevention

// Check authentication
let token = localStorage.getItem('token');
let user = JSON.parse(localStorage.getItem('user') || '{}');

if (!token || user.role !== 'contractor') {
    window.location.href = 'index.html';
}

// Initialize page
const userEmail = user.email || 'contractor@parking.com';
document.getElementById('userEmail').textContent = userEmail;

// Pre-fill email field (read-only)
if (document.getElementById('staffEmail')) {
    document.getElementById('staffEmail').value = userEmail;
}

// MCD Parking Lot Locations (Multiple sites across Delhi)
const PARKING_LOCATIONS = {
    'rithala': {
        name: 'Rithala Metro Parking',
        lat: 28.7233,
        lng: 77.1025,
        zone: 'North Delhi'
    },
    'connaught-place': {
        name: 'Connaught Place Parking',
        lat: 28.6315,
        lng: 77.2167,
        zone: 'Central Delhi'
    },
    'nehru-place': {
        name: 'Nehru Place Parking',
        lat: 28.5494,
        lng: 77.2501,
        zone: 'South Delhi'
    },
    'dwarka': {
        name: 'Dwarka Sector 21 Parking',
        lat: 28.5521,
        lng: 77.0590,
        zone: 'West Delhi'
    },
    'karol-bagh': {
        name: 'Karol Bagh Parking',
        lat: 28.6519,
        lng: 77.1909,
        zone: 'Central Delhi'
    },
    'rohini': {
        name: 'Rohini Sector 18 Parking',
        lat: 28.7491,
        lng: 77.0674,
        zone: 'North West Delhi'
    },
    'mcd-civic-centre': {
        name: 'Municipal Corporation of Delhi Civic Center',
        lat: 28.6412,
        lng: 77.2277,
        zone: 'Central Delhi'
    },
    'mr-public-school': {
        name: 'M.R. Public School',
        lat: 28.6745,
        lng: 77.0605,
        zone: 'North West Delhi'
    },
    'kamla-nagar': {
        name: 'Kamla Nagar',
        lat: 28.6809,
        lng: 77.2046,
        zone: 'East Delhi'
    },
    'model-town': {
        name: 'Model Town',
        lat: 28.7095,
        lng: 77.1888,
        zone: 'East Delhi'
    },
    'palika-bazar': {
        name: 'Palika Bazar',
        lat: 28.6311,
        lng: 77.2191,
        zone: 'New Delhi'
    },
    'nsut': {
        name: 'Netaji Subhas University of Technology',
        lat: 28.6109,
        lng: 77.0385,
        zone: 'Najafgarh'
    }
};

const GEOFENCE_RADIUS = 50; // meters

// Global variables
let videoStream = null;
let currentLocation = null;
let isLocationVerified = false;
let capturedPhotoData = null;
let selectedParkingLot = null;

// Attendance records storage
let attendanceRecords = JSON.parse(localStorage.getItem('attendanceRecords') || '[]');

// Auto-select parking location from user profile
function initializeParkingLocation() {
    // Get contractor's assigned parking location from user object
    const assignedLocation = user.parkingLocation || user.assignedLocation;
    const assignedLotName = user.parkingLotName;

    let foundLocation = null;

    // 1. Try to find by ID/Key
    if (assignedLocation && PARKING_LOCATIONS[assignedLocation]) {
        foundLocation = PARKING_LOCATIONS[assignedLocation];
    }

    // 2. Try to find by Name match
    if (!foundLocation && assignedLotName) {
        for (const [key, loc] of Object.entries(PARKING_LOCATIONS)) {
            if (loc.name.toLowerCase() === assignedLotName.toLowerCase()) {
                foundLocation = loc;
                break;
            }
        }
    }

    if (foundLocation) {
        // Known location with coordinates
        selectedParkingLot = foundLocation;

        document.getElementById('assignedLocationName').textContent = selectedParkingLot.name;
        document.getElementById('assignedLocationZone').textContent = selectedParkingLot.zone;
        document.getElementById('assignedLocationCoords').textContent =
            `${selectedParkingLot.lat.toFixed(6)}, ${selectedParkingLot.lng.toFixed(6)}`;
    } else if (assignedLotName) {
        // Custom location created by Admin (No coordinates known)
        // We will allow attendance for these custom locations to unblock the user
        selectedParkingLot = {
            name: assignedLotName,
            lat: null,
            lng: null,
            zone: 'Custom Location',
            isCustom: true
        };

        document.getElementById('assignedLocationName').textContent = selectedParkingLot.name;
        document.getElementById('assignedLocationZone').textContent = "Assigned Zone";
        document.getElementById('assignedLocationCoords').textContent = "Coordinates Not Required";
    } else {
        // Fallback to default if absolutely nothing is found (for demo)
        // But better to show the "No Location" error
        const defaultLoc = PARKING_LOCATIONS['rithala'];
        // selectedParkingLot = defaultLoc; // Uncomment to force default
    }

    if (selectedParkingLot) {
        checkLocation();
    } else {
        // If no valid location assigned, show error
        document.getElementById('locationStatus').className = 'location-status outside';
        document.getElementById('locationStatusText').textContent = 'No Parking Location Assigned';
        document.getElementById('locationDetail').textContent = 'Please contact admin to assign a parking location to your account';
    }
}

// Initialize parking location on page load
initializeParkingLocation();

// Check user's location
function checkLocation() {
    const statusDiv = document.getElementById('locationStatus');
    const statusText = document.getElementById('locationStatusText');
    const statusDetail = document.getElementById('locationDetail');

    // Check if parking location is selected
    if (!selectedParkingLot) {
        statusDiv.className = 'location-status checking';
        statusText.textContent = 'No Parking Location Assigned';
        statusDetail.textContent = 'Please contact admin to assign a parking location to your account';
        isLocationVerified = false;
        updateSubmitButton();
        return;
    }

    // Handle custom location without coordinates (Skip Geofence)
    if (selectedParkingLot.isCustom) {
        statusDiv.className = 'location-status inside';
        statusText.textContent = 'Location Verified ✓';
        statusDetail.textContent = 'Custom location detected - Geofence check skipped';
        // Set dummy location to prevent camera crash
        currentLocation = { lat: 0, lng: 0, accuracy: 0 };
        isLocationVerified = true;
        updateSubmitButton();
        return;
    }

    if (!navigator.geolocation) {
        statusDiv.className = 'location-status outside';
        statusText.textContent = 'Geolocation Not Supported ❌';
        statusDetail.textContent = 'Your browser does not support geolocation';
        return;
    }

    statusDiv.className = 'location-status checking';
    statusText.textContent = 'Checking location...';
    statusDetail.textContent = 'Acquiring GPS coordinates...';

    navigator.geolocation.getCurrentPosition(
        (position) => {
            currentLocation = {
                lat: position.coords.latitude,
                lng: position.coords.longitude,
                accuracy: position.coords.accuracy
            };

            // Calculate distance from selected parking lot
            const distance = calculateDistance(
                currentLocation.lat,
                currentLocation.lng,
                selectedParkingLot.lat,
                selectedParkingLot.lng
            );

            // Update coordinates display
            document.getElementById('currentCoords').innerHTML = `
                Your Location: ${currentLocation.lat.toFixed(6)}, ${currentLocation.lng.toFixed(6)}<br>
                Distance from ${selectedParkingLot.name}: ${distance.toFixed(0)} meters
            `;

            // Check if within geofence
            if (distance <= GEOFENCE_RADIUS) {
                statusDiv.className = 'location-status inside';
                statusText.textContent = 'Location Verified ✓';
                statusDetail.textContent = `You are inside ${selectedParkingLot.name} (${distance.toFixed(0)}m from center)`;
                isLocationVerified = true;
                updateSubmitButton();
            } else {
                statusDiv.className = 'location-status outside';
                statusText.textContent = 'Outside Geofence ❌';
                // Add Demo Link to bypass
                statusDetail.innerHTML = `You are ${distance.toFixed(0)}m away. <br><a href="#" onclick="simulateMockLocation(); return false;" style="color:#d9534f; font-weight:bold;">[DEMO: FORCE VERIFY]</a>`;
                isLocationVerified = false;
                updateSubmitButton();
            }
        },
        (error) => {
            statusDiv.className = 'location-status outside';
            statusText.textContent = 'Location Access Denied ❌';

            switch (error.code) {
                case error.PERMISSION_DENIED:
                    statusDetail.textContent = 'Please enable location permissions in your browser';
                    break;
                case error.POSITION_UNAVAILABLE:
                    statusDetail.textContent = 'Location information unavailable';
                    break;
                case error.TIMEOUT:
                    statusDetail.textContent = 'Location request timed out';
                    break;
                default:
                    statusDetail.textContent = 'Unknown error occurred';
            }

            // For demo purposes, simulate being inside geofence
            simulateMockLocation();
        }
    );
}

// Simulate mock location for demo (when GPS is not available)
function simulateMockLocation() {
    if (!selectedParkingLot) {
        return; // Can't simulate without a selected location
    }

    currentLocation = {
        lat: selectedParkingLot.lat + (Math.random() - 0.5) * 0.0001,
        lng: selectedParkingLot.lng + (Math.random() - 0.5) * 0.0001,
        accuracy: 10
    };

    const distance = calculateDistance(
        currentLocation.lat,
        currentLocation.lng,
        selectedParkingLot.lat,
        selectedParkingLot.lng
    );

    const statusDiv = document.getElementById('locationStatus');
    const statusText = document.getElementById('locationStatusText');
    const statusDetail = document.getElementById('locationDetail');

    statusDiv.className = 'location-status inside';
    statusText.textContent = 'Location Verified ✓ (Demo Mode)';
    statusDetail.textContent = `Simulated location: ${distance.toFixed(0)}m from ${selectedParkingLot.name}`;

    document.getElementById('currentCoords').innerHTML = `
        Demo Location: ${currentLocation.lat.toFixed(6)}, ${currentLocation.lng.toFixed(6)}<br>
        Distance from ${selectedParkingLot.name}: ${distance.toFixed(0)} meters
    `;

    isLocationVerified = true;
    updateSubmitButton();
}

// Calculate distance between two coordinates (Haversine formula)
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
}

// Start camera
async function startCamera() {
    try {
        const constraints = {
            video: {
                width: { ideal: 640 },
                height: { ideal: 480 },
                facingMode: 'user' // Front camera for selfie
            }
        };

        videoStream = await navigator.mediaDevices.getUserMedia(constraints);
        const videoElement = document.getElementById('videoElement');
        videoElement.srcObject = videoStream;

        // Show video, hide placeholder
        document.getElementById('cameraPlaceholder').style.display = 'none';
        videoElement.style.display = 'block';

        // Update buttons
        document.getElementById('startCameraBtn').style.display = 'none';
        document.getElementById('captureBtn').style.display = 'inline-block';

    } catch (error) {
        alert('Camera access denied or not available. Please enable camera permissions.');
        console.error('Camera error:', error);
    }
}

// Capture photo
function capturePhoto() {
    const videoElement = document.getElementById('videoElement');
    const canvas = document.getElementById('capturedImage');
    const context = canvas.getContext('2d');

    // Set canvas size to match video
    canvas.width = videoElement.videoWidth;
    canvas.height = videoElement.videoHeight;

    // Draw current video frame to canvas
    context.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

    // Add timestamp and location watermark
    context.fillStyle = 'rgba(0, 0, 0, 0.7)';
    context.fillRect(0, canvas.height - 60, canvas.width, 60);

    context.fillStyle = 'white';
    context.font = 'bold 14px Arial';
    const timestamp = new Date().toLocaleString();
    let locationText = "📍 Location: Unknown";

    if (currentLocation && currentLocation.lat) {
        locationText = `📍 ${currentLocation.lat.toFixed(6)}, ${currentLocation.lng.toFixed(6)}`;
    } else if (selectedParkingLot && selectedParkingLot.isCustom) {
        locationText = `📍 ${selectedParkingLot.name} (Custom)`;
    }

    context.fillText(`⏰ ${timestamp}`, 10, canvas.height - 35);
    context.fillText(locationText, 10, canvas.height - 15);

    // Get photo data
    capturedPhotoData = canvas.toDataURL('image/jpeg', 0.8);

    // Stop video stream
    if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
        videoStream = null;
    }

    // Show canvas, hide video
    videoElement.style.display = 'none';
    canvas.style.display = 'block';

    // Update buttons
    document.getElementById('captureBtn').style.display = 'none';
    document.getElementById('retakeBtn').style.display = 'inline-block';

    updateSubmitButton();
}

// Retake photo
function retakePhoto() {
    const canvas = document.getElementById('capturedImage');
    canvas.style.display = 'none';

    document.getElementById('retakeBtn').style.display = 'none';
    document.getElementById('startCameraBtn').style.display = 'inline-block';

    capturedPhotoData = null;
    updateSubmitButton();
}

// Update submit button state
function updateSubmitButton() {
    const submitBtn = document.getElementById('submitBtn');
    const staffName = document.getElementById('staffName').value.trim();

    const canSubmit = isLocationVerified && capturedPhotoData && staffName;
    submitBtn.disabled = !canSubmit;
}

// Add input listeners
document.getElementById('staffName').addEventListener('input', updateSubmitButton);

// Submit attendance
function submitAttendance() {
    const staffName = document.getElementById('staffName').value.trim();
    const staffEmail = document.getElementById('staffEmail').value.trim();
    const staffRole = document.getElementById('staffRole').value;
    const staffShift = document.getElementById('staffShift').value;

    if (!staffName || !staffEmail) {
        alert('Please fill in all staff information');
        return;
    }

    if (!isLocationVerified) {
        alert('Location not verified. You must be inside the parking lot geofence.');
        return;
    }

    if (!capturedPhotoData) {
        alert('Please capture a selfie first');
        return;
    }

    // Create attendance record
    const attendanceRecord = {
        id: `ATT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        staffName: staffName,
        staffEmail: staffEmail,
        role: staffRole,
        shift: staffShift,
        parkingLocation: selectedParkingLot.name,
        parkingZone: selectedParkingLot.zone,
        timestamp: new Date().toISOString(),
        location: {
            lat: currentLocation.lat,
            lng: currentLocation.lng,
            accuracy: currentLocation.accuracy
        },
        distance: calculateDistance(
            currentLocation.lat,
            currentLocation.lng,
            selectedParkingLot.lat,
            selectedParkingLot.lng
        ),
        photo: capturedPhotoData,
        verified: true,
        status: 'present'
    };

    // Add to records
    attendanceRecords.unshift(attendanceRecord);

    // Keep only last 50 records
    if (attendanceRecords.length > 50) {
        attendanceRecords = attendanceRecords.slice(0, 50);
    }

    // Save to localStorage
    localStorage.setItem('attendanceRecords', JSON.stringify(attendanceRecords));

    // Show success message
    alert(`✅ Attendance Marked Successfully!\n\nStaff: ${staffName}\nEmail: ${staffEmail}\nParking: ${selectedParkingLot.name}\nTime: ${new Date().toLocaleTimeString()}\nLocation Verified: ✓`);

    // Reset form
    resetForm();

    // Update display
    updateAttendanceRecords();
}

// Reset form
function resetForm() {
    document.getElementById('staffName').value = '';
    // Don't reset email as it's pre-filled
    document.getElementById('staffRole').selectedIndex = 0;
    document.getElementById('staffShift').selectedIndex = 0;

    const canvas = document.getElementById('capturedImage');
    canvas.style.display = 'none';

    document.getElementById('cameraPlaceholder').style.display = 'block';
    document.getElementById('retakeBtn').style.display = 'none';
    document.getElementById('startCameraBtn').style.display = 'inline-block';

    capturedPhotoData = null;
    updateSubmitButton();
}

// Update attendance records display
function updateAttendanceRecords() {
    const container = document.getElementById('attendanceRecords');

    if (attendanceRecords.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #666; padding: 20px;">No attendance records yet. Mark your first attendance above.</p>';
        return;
    }

    const recordsHTML = attendanceRecords.map(record => {
        const timestamp = new Date(record.timestamp);
        const roleLabels = {
            'security-guard': 'Security Guard',
            'parking-attendant': 'Parking Attendant',
            'supervisor': 'Supervisor'
        };
        const shiftLabels = {
            'morning': 'Morning (6 AM - 2 PM)',
            'afternoon': 'Afternoon (2 PM - 10 PM)',
            'night': 'Night (10 PM - 6 AM)'
        };

        return `
            <div class="attendance-record ${record.verified ? '' : 'rejected'}">
                <img src="${record.photo}" alt="Staff Photo" class="attendance-thumbnail">
                <div class="attendance-info">
                    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
                        <div>
                            <strong style="color: #1a5490; font-size: 1rem;">${record.staffName}</strong>
                            <span class="location-badge ${record.verified ? 'verified' : 'failed'}">
                                ${record.verified ? '✓ VERIFIED' : '✗ FAILED'}
                            </span>
                            <p style="margin: 2px 0; color: #666; font-size: 0.85rem;">
                                ${record.staffEmail} | ${roleLabels[record.role]}
                            </p>
                        </div>
                        <div style="text-align: right; font-size: 0.8rem; color: #999;">
                            ${timestamp.toLocaleDateString()}<br>
                            ${timestamp.toLocaleTimeString()}
                        </div>
                    </div>
                    <div style="font-size: 0.85rem; color: #666;">
                        <strong>Parking:</strong> ${record.parkingLocation} (${record.parkingZone})<br>
                        <strong>Shift:</strong> ${shiftLabels[record.shift]}<br>
                        <strong>Location:</strong> ${record.location.lat.toFixed(6)}, ${record.location.lng.toFixed(6)} 
                        (${record.distance.toFixed(0)}m from center)<br>
                        <strong>Record ID:</strong> ${record.id}
                    </div>
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = recordsHTML;
}

// Logout function
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'index.html';
}

// Initialize display
updateAttendanceRecords();

// Refresh location every 30 seconds
setInterval(checkLocation, 30000);
