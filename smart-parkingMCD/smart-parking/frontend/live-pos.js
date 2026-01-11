// Live POS - Anti-QR Swap System JavaScript

// Check authentication
let token = localStorage.getItem('token');
let user = JSON.parse(localStorage.getItem('user') || '{}');

if (!token || user.role !== 'contractor') {
    window.location.href = 'index.html';
}

// Check if attendance is marked for today
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

// Enforce attendance check
const hasAttendance = checkTodayAttendance();
if (!hasAttendance) {
    showAttendanceRequiredModal();
    throw new Error('Attendance required'); // Stop execution
}

// Initialize page
document.getElementById('userEmail').textContent = user.email || 'contractor@parking.com';

// Mock transaction storage
let qrTransactions = JSON.parse(localStorage.getItem('qrTransactions') || '[]');
let currentQRData = null;
let qrExpiryTimer = null;

// Pricing structure
const PRICING = {
    '2-wheeler': 10,
    '4-wheeler': 20,
    'commercial': 30
};

// Auto-calculate amount when duration or vehicle type changes
document.getElementById('vehicleType').addEventListener('change', calculateAmount);
document.getElementById('parkingDuration').addEventListener('input', calculateAmount);

function calculateAmount() {
    const duration = parseInt(document.getElementById('parkingDuration').value || 2);
    const vehicleType = document.getElementById('vehicleType').value;
    const rate = PRICING[vehicleType];
    const amount = duration * rate;
    document.getElementById('amountToPay').value = `₹${amount}`;
}

// Generate unique ticket ID
function generateTicketID() {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return `MCD-${timestamp}-${random}`;
}

// Generate Dynamic QR Code
function generateDynamicQR() {
    const vehicleNumber = document.getElementById('vehicleNumber').value.trim().toUpperCase();
    const vehicleType = document.getElementById('vehicleType').value;
    const duration = parseInt(document.getElementById('parkingDuration').value);
    const amountText = document.getElementById('amountToPay').value;
    const amount = parseInt(amountText.replace('₹', ''));

    // Validation
    if (!vehicleNumber) {
        alert('⚠️ Please enter vehicle number');
        return;
    }

    if (vehicleNumber.length < 6) {
        alert('⚠️ Please enter a valid vehicle number (minimum 6 characters)');
        return;
    }

    // Generate ticket ID
    const ticketId = generateTicketID();
    const timestamp = new Date();
    const expiryTime = new Date(timestamp.getTime() + 5 * 60 * 1000); // 5 minutes from now

    // Create QR data with mock UPI payment link
    currentQRData = {
        ticketId: ticketId,
        vehicleNumber: vehicleNumber,
        vehicleType: vehicleType,
        duration: duration,
        amount: amount,
        timestamp: timestamp.toISOString(),
        expiryTime: expiryTime.toISOString(),
        paymentUPI: 'mcd.parking@upi',
        merchantId: 'MCD-PARKING-' + Math.random().toString(36).substr(2, 9).toUpperCase(),
        status: 'pending'
    };

    // Generate QR Code on canvas
    generateQRCanvas(currentQRData);

    // Update display
    document.getElementById('ticketId').textContent = ticketId;
    document.getElementById('displayVehicleNumber').textContent = vehicleNumber;
    document.getElementById('displayVehicleType').textContent = vehicleType.toUpperCase();
    document.getElementById('displayDuration').textContent = `${duration} hour${duration > 1 ? 's' : ''}`;
    document.getElementById('displayAmount').textContent = `₹${amount}`;
    document.getElementById('upiId').textContent = currentQRData.paymentUPI;

    // Show QR display
    document.getElementById('qrCodeDisplay').style.display = 'block';
    document.getElementById('generateQRBtn').disabled = true;
    document.getElementById('generateQRBtn').style.opacity = '0.5';

    // Start expiry countdown
    startQRExpiryTimer(expiryTime);

    // Save to transactions
    qrTransactions.unshift(currentQRData);
    if (qrTransactions.length > 50) qrTransactions.pop(); // Keep only last 50
    localStorage.setItem('qrTransactions', JSON.stringify(qrTransactions));
    updateRecentQRTransactions();

    // Scroll to QR display
    document.getElementById('qrCodeDisplay').scrollIntoView({ behavior: 'smooth' });

    console.log('✅ Dynamic QR Code Generated:', currentQRData);
}

// Generate QR Code on Canvas (Mock visualization)
function generateQRCanvas(data) {
    const canvas = document.getElementById('qrCanvas');
    const ctx = canvas.getContext('2d');

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Create QR-like pattern with adjusted sizes for 180x180 canvas
    const cellSize = 7;
    const padding = 18;
    const qrSize = canvas.width - (padding * 2);
    const cells = Math.floor(qrSize / cellSize);

    // White background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Generate pseudo-random pattern based on ticket ID
    const seed = data.ticketId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);

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

    // Add MCD branding with smaller font
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

// QR Expiry Timer
function startQRExpiryTimer(expiryTime) {
    // Clear existing timer
    if (qrExpiryTimer) {
        clearInterval(qrExpiryTimer);
    }

    function updateTimer() {
        const now = new Date();
        const timeLeft = expiryTime - now;

        if (timeLeft <= 0) {
            document.getElementById('qrExpiry').textContent = 'EXPIRED';
            document.getElementById('qrExpiry').style.color = '#dc3545';
            clearInterval(qrExpiryTimer);

            // Mark as expired
            if (currentQRData) {
                currentQRData.status = 'expired';
                // Update in storage
                const index = qrTransactions.findIndex(t => t.ticketId === currentQRData.ticketId);
                if (index !== -1) {
                    qrTransactions[index].status = 'expired';
                    localStorage.setItem('qrTransactions', JSON.stringify(qrTransactions));
                    updateRecentQRTransactions();
                }
            }
            return;
        }

        const minutes = Math.floor(timeLeft / 60000);
        const seconds = Math.floor((timeLeft % 60000) / 1000);

        document.getElementById('qrExpiry').textContent =
            `${minutes}:${seconds.toString().padStart(2, '0')}`;

        // Change color as it gets closer to expiry
        if (minutes < 1) {
            document.getElementById('qrExpiry').style.color = '#dc3545';
        } else if (minutes < 2) {
            document.getElementById('qrExpiry').style.color = '#ffc107';
        } else {
            document.getElementById('qrExpiry').style.color = '#28a745';
        }
    }

    updateTimer();
    qrExpiryTimer = setInterval(updateTimer, 1000);
}

// Print Ticket
function printTicket() {
    if (!currentQRData) return;

    // Simulate printing
    const printContent = `
╔════════════════════════════════════════╗
║     MUNICIPAL CORPORATION OF DELHI     ║
║          PARKING TICKET                ║
╚════════════════════════════════════════╝

Ticket ID: ${currentQRData.ticketId}
Vehicle: ${currentQRData.vehicleNumber}
Type: ${currentQRData.vehicleType.toUpperCase()}
Duration: ${currentQRData.duration} hour(s)
Amount: ₹${currentQRData.amount}

Issued: ${new Date(currentQRData.timestamp).toLocaleString()}
Valid Until: ${new Date(currentQRData.expiryTime).toLocaleString()}

Payment UPI: ${currentQRData.paymentUPI}
Merchant ID: ${currentQRData.merchantId}

════════════════════════════════════════
    SCAN QR CODE ABOVE TO PAY
    This QR code is time-limited
    and cannot be reused
════════════════════════════════════════
    `;

    console.log(printContent);
    alert('🖨️ Ticket sent to printer!\n\nCheck console for ticket details.');

    // In a real system, this would trigger actual printing
    // window.print() or send to thermal printer
}

// Reset POS
function resetPOS() {
    // Clear form
    document.getElementById('vehicleNumber').value = '';
    document.getElementById('vehicleType').value = '4-wheeler';
    document.getElementById('parkingDuration').value = '2';
    document.getElementById('amountToPay').value = '₹40';

    // Hide QR display
    document.getElementById('qrCodeDisplay').style.display = 'none';

    // Re-enable generate button
    document.getElementById('generateQRBtn').disabled = false;
    document.getElementById('generateQRBtn').style.opacity = '1';

    // Clear timer
    if (qrExpiryTimer) {
        clearInterval(qrExpiryTimer);
        qrExpiryTimer = null;
    }

    currentQRData = null;

    console.log('✅ POS Reset - Ready for new transaction');
}

// Update Recent QR Transactions
function updateRecentQRTransactions() {
    const container = document.getElementById('recentQRTransactions');

    if (qrTransactions.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #666; padding: 20px;">No transactions yet. Generate your first dynamic QR code above.</p>';
        return;
    }

    const transactionsHTML = qrTransactions.slice(0, 10).map((txn, index) => {
        const timestamp = new Date(txn.timestamp);
        const statusColor = txn.status === 'expired' ? '#dc3545' : txn.status === 'paid' ? '#28a745' : '#ffc107';
        const statusText = txn.status.toUpperCase();

        return `
            <div class="transaction-list-item" style="border-left-color: ${statusColor};">
                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 10px; align-items: center;">
                    <div>
                        <strong style="color: #1a5490; font-size: 0.85rem;">Ticket ID</strong>
                        <p style="margin: 2px 0 0 0; font-size: 0.8rem; color: #666;">${txn.ticketId}</p>
                    </div>
                    <div>
                        <strong style="color: #1a5490; font-size: 0.85rem;">Vehicle</strong>
                        <p style="margin: 2px 0 0 0; font-size: 0.8rem; color: #666; font-weight: 600;">${txn.vehicleNumber}</p>
                    </div>
                    <div>
                        <strong style="color: #1a5490; font-size: 0.85rem;">Amount</strong>
                        <p style="margin: 2px 0 0 0; font-size: 0.8rem; color: #28a745; font-weight: 700;">₹${txn.amount}</p>
                    </div>
                    <div>
                        <strong style="color: #1a5490; font-size: 0.85rem;">Status</strong>
                        <p style="margin: 2px 0 0 0; font-size: 0.8rem; color: ${statusColor}; font-weight: 600;">${statusText}</p>
                    </div>
                </div>
                <div style="margin-top: 8px; font-size: 0.75rem; color: #999;">
                    ${timestamp.toLocaleString()}
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = transactionsHTML;
}

// Initialize on page load
updateRecentQRTransactions();

// Logout function
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'index.html';
}

