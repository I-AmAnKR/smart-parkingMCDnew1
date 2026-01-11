
// Mock Global Variables that exist in the real file
const PARKING_LOCATIONS = {
    'rithala': { name: 'Rithala Metro Parking', lat: 28.7233, lng: 77.1025, zone: 'North Delhi' },
    // ... other standard locations
};

// 1. SIMULATE USER: The contractor you created
const user = {
    email: '1234@gamil.com',
    role: 'contractor',
    parkingLotName: 'M R Public school begumpur', // Custom location name
    parkingLocation: undefined // No ID assigned
};

console.log("--- SIMULATION START ---");
console.log(`User: ${user.email}`);
console.log(`Assigned Lot Name: "${user.parkingLotName}"`);

// 2. THE NEW LOGIC (Copied from your file)
let selectedParkingLot = null;

function initializeParkingLocation() {
    const assignedLocation = user.parkingLocation || user.assignedLocation;
    const assignedLotName = user.parkingLotName;
    let foundLocation = null;

    // Try finding by ID
    if (assignedLocation && PARKING_LOCATIONS[assignedLocation]) {
        foundLocation = PARKING_LOCATIONS[assignedLocation];
    }

    // Try finding by Name
    if (!foundLocation && assignedLotName) {
        for (const [key, loc] of Object.entries(PARKING_LOCATIONS)) {
            if (loc.name.toLowerCase() === assignedLotName.toLowerCase()) {
                foundLocation = loc;
                break;
            }
        }
    }

    if (foundLocation) {
        selectedParkingLot = foundLocation;
        console.log("✅ STATUS: Found Standard Location");
    } else if (assignedLotName) {
        // Custom location logic
        selectedParkingLot = {
            name: assignedLotName,
            lat: null,
            lng: null,
            zone: 'Custom Location',
            isCustom: true
        };
        console.log("✅ STATUS: Detected New Custom Location");
    } else {
        console.log("❌ STATUS: No Location Found");
    }
}

// 3. RUN INITIALIZATION
initializeParkingLocation();

// 4. CHECK RESULT
if (selectedParkingLot) {
    console.log(`\nSelected Lot: ${selectedParkingLot.name}`);
    console.log(`Is Custom? ${selectedParkingLot.isCustom}`);

    // Simulate checkLocation()
    if (selectedParkingLot.isCustom) {
        console.log("\n[checkLocation] -> Custom location detected - Geofence check skipped");
        console.log("RESULT: Location Verified ✓ (User can now mark attendance)");
    } else {
        console.log("\n[checkLocation] -> Standard location - Starting GPS check...");
    }
} else {
    console.log("RESULT: Failed (No location)");
}
console.log("--- SIMULATION END ---");
