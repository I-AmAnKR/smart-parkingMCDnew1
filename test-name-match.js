
// Mock PARKING_LOCATIONS from the actual file
const PARKING_LOCATIONS = {
    'mr-public-school': {
        name: 'M.R. Public School',
        lat: 28.6745,
        lng: 77.0605,
        zone: 'Rohini'
    },
    // ... others
};

// User Profile
const user = {
    email: '1234@gamil.com',
    parkingLotName: 'M R Public school begumpur' // The tricky name
};

console.log(`User Assigned Name: "${user.parkingLotName}"`);
console.log(`Config Name: "${PARKING_LOCATIONS['mr-public-school'].name}"`);

// Logic from geofence-attendance.js
let selectedParkingLot = null;
let foundLocation = null;
const assignedLotName = user.parkingLotName;

// Name Match Logic
for (const [key, loc] of Object.entries(PARKING_LOCATIONS)) {
    // Current Logic: Exact match (case insensitive)
    if (loc.name.toLowerCase() === assignedLotName.toLowerCase()) {
        foundLocation = loc;
        break;
    }
}

if (foundLocation) {
    console.log("MATCH FOUND! -> Using Real Coordinates");
} else {
    console.log("NO MATCH! -> Logic falls back to Custom Location Mode");
    // Custom Logic
    selectedParkingLot = {
        name: assignedLotName,
        lat: null,
        isCustom: true
    };
}

if (selectedParkingLot && selectedParkingLot.isCustom) {
    console.log("RESULT: Auto-Verify (Geofence Skipped) ✅");
} else {
    console.log("RESULT: Real GPS Check (with Demo Link) ✅");
}
