// Vehicle Entry/Exit Management System
// For Contractor Dashboard - Prototype Version

// Pricing structure
const VEHICLE_PRICING = {
    '2-wheeler': 10,  // ₹10 per hour
    '4-wheeler': 20,  // ₹20 per hour
    'commercial': 30  // ₹30 per hour
};

// Storage for parked vehicles
let parkedVehicles = JSON.parse(localStorage.getItem('parkedVehicles') || '[]');
let vehicleHistory = JSON.parse(localStorage.getItem('vehicleHistory') || '[]');
let currentVehicleForExit = null;

// ========== VEHICLE ENTRY MODAL ==========

function openVehicleEntryModal() {
    document.getElementById('vehicleEntryModal').style.display = 'flex';
    document.getElementById('entryVehicleNumber').value = '';
    document.getElementById('entryVehicleType').value = '4-wheeler';
    document.getElementById('entryDuration').value = '2';
    document.getElementById('qrCodeSection').style.display = 'none';
    calculateEntryAmount();
}

function closeVehicleEntryModal() {
    document.getElementById('vehicleEntryModal').style.display = 'none';
}

function calculateEntryAmount() {
    const vehicleType = document.getElementById('entryVehicleType').value;
    const duration = parseInt(document.getElementById('entryDuration').value || 2);
    const rate = VEHICLE_PRICING[vehicleType];
    const amount = duration * rate;

    document.getElementById('entryAmount').value = `₹${amount}`;
    document.getElementById('qrAmount').textContent = `₹${amount}`;
}

function showQRCode() {
    const vehicleNumber = document.getElementById('entryVehicleNumber').value.trim().toUpperCase();

    if (!vehicleNumber || vehicleNumber.length < 6) {
        alert('⚠️ Please enter a valid vehicle number (minimum 6 characters)');
        return;
    }

    // Show QR code section
    document.getElementById('qrCodeSection').style.display = 'block';

    // Generate QR code on canvas
    generateEntryQRCode();

    // Scroll to QR code
    document.getElementById('qrCodeSection').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function generateEntryQRCode() {
    const canvas = document.getElementById('entryQRCanvas');
    const ctx = canvas.getContext('2d');

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // White background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Generate QR-like pattern
    const cellSize = 7;
    const padding = 18;
    const qrSize = canvas.width - (padding * 2);
    const cells = Math.floor(qrSize / cellSize);

    // Generate pseudo-random pattern based on timestamp
    const seed = Date.now();

    function seededRandom(s) {
        const x = Math.sin(s) * 10000;
        return x - Math.floor(x);
    }

    // Draw QR pattern
    ctx.fillStyle = '#000000';
    for (let y = 0; y < cells; y++) {
        for (let x = 0; x < cells; x++) {
            const randomValue = seededRandom(seed + x * cells + y);
            if (randomValue > 0.5) {
                ctx.fillRect(
                    padding + x * cellSize,
                    padding + y * cellSize,
                    cellSize - 1,
                    cellSize - 1
                );
            }
        }
    }

    // Draw corner markers (position detection patterns)
    drawCornerMarker(ctx, padding, padding, cellSize);
    drawCornerMarker(ctx, canvas.width - padding - cellSize * 7, padding, cellSize);
    drawCornerMarker(ctx, padding, canvas.height - padding - cellSize * 7, cellSize);

    // Add MCD branding
    ctx.fillStyle = '#1a5490';
    ctx.font = 'bold 10px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('MCD PARKING', canvas.width / 2, canvas.height - 6);
}

function drawCornerMarker(ctx, x, y, cellSize) {
    ctx.fillStyle = '#000000';
    // Outer square
    ctx.fillRect(x, y, cellSize * 7, cellSize * 7);
    // Inner white square
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x + cellSize, y + cellSize, cellSize * 5, cellSize * 5);
    // Center black square
    ctx.fillStyle = '#000000';
    ctx.fillRect(x + cellSize * 2, y + cellSize * 2, cellSize * 3, cellSize * 3);
}

function addVehicleEntry() {
    const vehicleNumber = document.getElementById('entryVehicleNumber').value.trim().toUpperCase();
    const vehicleType = document.getElementById('entryVehicleType').value;
    const expectedDuration = parseInt(document.getElementById('entryDuration').value);
    const amountText = document.getElementById('entryAmount').value;
    const estimatedAmount = parseInt(amountText.replace('₹', ''));

    // Validation
    if (!vehicleNumber || vehicleNumber.length < 6) {
        alert('⚠️ Please enter a valid vehicle number (minimum 6 characters)');
        return;
    }

    // Check if vehicle already parked
    const alreadyParked = parkedVehicles.find(v => v.vehicleNumber === vehicleNumber);
    if (alreadyParked) {
        alert(`⚠️ Vehicle ${vehicleNumber} is already parked!\n\nEntry Time: ${new Date(alreadyParked.entryTime).toLocaleString()}`);
        return;
    }

    // Create entry record
    const entryRecord = {
        id: `ENTRY-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        vehicleNumber: vehicleNumber,
        vehicleType: vehicleType,
        entryTime: new Date().toISOString(),
        expectedDuration: expectedDuration,
        estimatedAmount: estimatedAmount,
        parkingLot: user.parkingLotName || 'Unknown Lot',
        contractorEmail: user.email,
        status: 'parked'
    };

    // Add to parked vehicles
    parkedVehicles.unshift(entryRecord);
    localStorage.setItem('parkedVehicles', JSON.stringify(parkedVehicles));

    // Update UI
    updateDashboardStats();
    loadRecentLogs();

    // Show success message
    alert(`✅ Vehicle Entry Recorded!\n\nVehicle: ${vehicleNumber}\nType: ${vehicleType.toUpperCase()}\nEntry Time: ${new Date().toLocaleTimeString()}\nEstimated Amount: ₹${estimatedAmount}\n\n💡 Payment not required (Prototype Mode)`);

    // Close modal
    closeVehicleEntryModal();

    console.log('✅ Vehicle entry added:', entryRecord);
}

// ========== VEHICLE EXIT MODAL ==========

function openVehicleExitModal() {
    document.getElementById('vehicleExitModal').style.display = 'flex';
    document.getElementById('exitVehicleNumber').value = '';
    document.getElementById('exitVehicleDetails').style.display = 'none';
    document.getElementById('confirmExitBtn').disabled = true;
    document.getElementById('confirmExitBtn').style.opacity = '0.5';
    currentVehicleForExit = null;
}

function closeVehicleExitModal() {
    document.getElementById('vehicleExitModal').style.display = 'none';
}

function searchParkedVehicle() {
    const vehicleNumber = document.getElementById('exitVehicleNumber').value.trim().toUpperCase();

    if (vehicleNumber.length < 6) {
        document.getElementById('exitVehicleDetails').style.display = 'none';
        document.getElementById('confirmExitBtn').disabled = true;
        document.getElementById('confirmExitBtn').style.opacity = '0.5';
        return;
    }

    // Find vehicle in parked list
    const vehicle = parkedVehicles.find(v => v.vehicleNumber === vehicleNumber);

    if (!vehicle) {
        document.getElementById('exitVehicleDetails').style.display = 'none';
        document.getElementById('confirmExitBtn').disabled = true;
        document.getElementById('confirmExitBtn').style.opacity = '0.5';
        alert(`⚠️ Vehicle ${vehicleNumber} not found in parking lot.`);
        return;
    }

    // Calculate actual duration and amount
    const entryTime = new Date(vehicle.entryTime);
    const exitTime = new Date();
    const durationMs = exitTime - entryTime;
    const durationHours = Math.ceil(durationMs / (1000 * 60 * 60)); // Round up to nearest hour
    const rate = VEHICLE_PRICING[vehicle.vehicleType];
    const actualAmount = durationHours * rate;

    // Display vehicle details
    document.getElementById('exitEntryTime').textContent = entryTime.toLocaleString();
    document.getElementById('exitVehicleType').textContent = vehicle.vehicleType.toUpperCase();
    document.getElementById('exitDuration').textContent = `${durationHours} hour${durationHours > 1 ? 's' : ''}`;
    document.getElementById('exitAmount').textContent = `₹${actualAmount}`;

    document.getElementById('exitVehicleDetails').style.display = 'block';
    document.getElementById('confirmExitBtn').disabled = false;
    document.getElementById('confirmExitBtn').style.opacity = '1';

    // Store for confirmation
    currentVehicleForExit = {
        ...vehicle,
        exitTime: exitTime.toISOString(),
        actualDuration: durationHours,
        actualAmount: actualAmount
    };
}

function confirmVehicleExit() {
    if (!currentVehicleForExit) {
        alert('⚠️ No vehicle selected for exit');
        return;
    }

    // Remove from parked vehicles
    parkedVehicles = parkedVehicles.filter(v => v.id !== currentVehicleForExit.id);
    localStorage.setItem('parkedVehicles', JSON.stringify(parkedVehicles));

    // Add to history
    const exitRecord = {
        ...currentVehicleForExit,
        status: 'exited',
        revenue: currentVehicleForExit.actualAmount
    };

    vehicleHistory.unshift(exitRecord);
    if (vehicleHistory.length > 100) vehicleHistory.pop(); // Keep last 100
    localStorage.setItem('vehicleHistory', JSON.stringify(vehicleHistory));

    // Update UI
    updateDashboardStats();
    loadRecentLogs();

    // Show success message
    alert(`✅ Vehicle Exit Recorded!\n\nVehicle: ${currentVehicleForExit.vehicleNumber}\nDuration: ${currentVehicleForExit.actualDuration} hour(s)\nAmount: ₹${currentVehicleForExit.actualAmount}\n\n💰 Revenue added to today's collection`);

    // Close modal
    closeVehicleExitModal();

    console.log('✅ Vehicle exit recorded:', exitRecord);
}

// ========== DASHBOARD STATS UPDATE ==========

function updateDashboardStats() {
    // Get today's date
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Filter today's entries and exits
    const todayEntries = vehicleHistory.filter(v => {
        const entryDate = new Date(v.entryTime);
        entryDate.setHours(0, 0, 0, 0);
        return entryDate.getTime() === today.getTime();
    });

    const todayExits = vehicleHistory.filter(v => {
        if (!v.exitTime) return false;
        const exitDate = new Date(v.exitTime);
        exitDate.setHours(0, 0, 0, 0);
        return exitDate.getTime() === today.getTime();
    });

    // Calculate stats
    const entriesCount = todayEntries.length;
    const exitsCount = todayExits.length;
    const currentOccupancy = parkedVehicles.length;
    const totalRevenue = todayExits.reduce((sum, v) => sum + (v.revenue || 0), 0);

    // Update UI
    document.getElementById('todayEntries').textContent = entriesCount;
    document.getElementById('todayExits').textContent = exitsCount;
    document.getElementById('currentOccupancyStat').textContent = currentOccupancy;
    document.getElementById('currentOccupancy').textContent = currentOccupancy;

    // Update total transactions
    document.getElementById('totalTransactions').textContent = entriesCount + exitsCount;

    // Calculate peak occupancy
    const peakOccupancy = Math.max(currentOccupancy, parseInt(document.getElementById('peakOccupancy').textContent || 0));
    document.getElementById('peakOccupancy').textContent = peakOccupancy;

    // Calculate average duration
    if (todayExits.length > 0) {
        const avgDuration = todayExits.reduce((sum, v) => sum + (v.actualDuration || 0), 0) / todayExits.length;
        document.getElementById('avgDuration').textContent = `${Math.round(avgDuration)} min`;
    }

    // Calculate utilization rate
    const maxCapacity = parseInt(document.getElementById('maxCapacity').textContent || 50);
    const utilizationRate = maxCapacity > 0 ? Math.round((currentOccupancy / maxCapacity) * 100) : 0;
    document.getElementById('utilizationRate').textContent = `${utilizationRate}%`;

    // Update status badge
    const statusBadge = document.getElementById('statusBadge');
    if (utilizationRate >= 90) {
        statusBadge.textContent = '🔴 Critical - Nearly Full';
        statusBadge.style.background = 'rgba(220, 53, 69, 0.2)';
        statusBadge.style.borderColor = '#dc3545';
    } else if (utilizationRate >= 70) {
        statusBadge.textContent = '🟡 High Occupancy';
        statusBadge.style.background = 'rgba(255, 193, 7, 0.2)';
        statusBadge.style.borderColor = '#ffc107';
    } else {
        statusBadge.textContent = '🟢 Normal Operation';
        statusBadge.style.background = 'rgba(40, 167, 69, 0.2)';
        statusBadge.style.borderColor = '#28a745';
    }

    console.log('📊 Dashboard stats updated:', {
        entries: entriesCount,
        exits: exitsCount,
        occupancy: currentOccupancy,
        revenue: totalRevenue,
        utilization: utilizationRate
    });
}

// ========== RECENT LOGS UPDATE ==========

function loadRecentLogs() {
    const container = document.getElementById('recentLogs');

    if (!container) return; // Element might not exist on all pages

    // Combine parked vehicles and recent exits
    const allLogs = [
        ...parkedVehicles.map(v => ({ ...v, type: 'entry' })),
        ...vehicleHistory.slice(0, 10).map(v => ({ ...v, type: 'exit' }))
    ].sort((a, b) => {
        const timeA = new Date(a.exitTime || a.entryTime);
        const timeB = new Date(b.exitTime || b.entryTime);
        return timeB - timeA;
    }).slice(0, 15);

    if (allLogs.length === 0) {
        container.innerHTML = '<p class="text-muted" style="text-align: center; padding: 20px;">No recent activity. Use the + button to add vehicle entry.</p>';
        return;
    }

    const logsHTML = allLogs.map(log => {
        const time = new Date(log.exitTime || log.entryTime);
        const isEntry = log.type === 'entry';
        const bgColor = isEntry ? '#e8f5e9' : '#ffebee';
        const borderColor = isEntry ? '#28a745' : '#dc3545';
        const icon = isEntry ? '🚗 IN' : '🚪 OUT';
        const amount = log.actualAmount || log.estimatedAmount || 0;

        return `
            <div style="padding: 12px; background: ${bgColor}; border-left: 4px solid ${borderColor}; border-radius: 5px; margin-bottom: 10px;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <strong style="color: ${borderColor}; font-size: 0.9rem;">${icon} ${log.vehicleNumber}</strong>
                        <p style="margin: 3px 0 0 0; font-size: 0.8rem; color: #666;">
                            ${log.vehicleType.toUpperCase()} | ${time.toLocaleTimeString()}
                        </p>
                    </div>
                    <div style="text-align: right;">
                        <strong style="color: #28a745; font-size: 1rem;">₹${amount}</strong>
                        ${!isEntry ? `<p style="margin: 3px 0 0 0; font-size: 0.75rem; color: #666;">${log.actualDuration || 0}h</p>` : ''}
                    </div>
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = logsHTML;
}

// ========== INITIALIZE ==========

// Prevent duplicate initialization
if (!window.vehicleSystemInitialized) {
    window.vehicleSystemInitialized = true;

    // Update stats on page load (only once)
    setTimeout(() => {
        if (typeof updateDashboardStats === 'function') {
            updateDashboardStats();
        }
    }, 1000); // Wait 1 second for DOM to be ready

    console.log('✅ Vehicle Entry/Exit system initialized');
    console.log(`📊 Currently parked: ${parkedVehicles.length} vehicles`);
    console.log(`📜 History records: ${vehicleHistory.length} transactions`);
}

// Note: Auto-refresh is handled by contractor.js to avoid duplicate intervals
