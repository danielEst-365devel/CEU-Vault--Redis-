// Modified functions in requests.js

// Add a loading state tracker
let isProcessing = false;

// Add this function at the top with other utility functions
function showLoadingOverlay() {
    Swal.fire({
        title: 'Processing...',
        html: 'Please wait while we process your request.',
        allowOutsideClick: false,
        allowEscapeKey: false,
        didOpen: () => {
            Swal.showLoading();
        }
    });
}

// New function to fetch inventory data
async function getInventoryStatus(categoryId) {
    try {
        const response = await fetch('/admin/get-adminEquipment');
        const data = await response.json();
        
        if (data.successful) {
            return data.equipmentCategories.find(category => category.category_id === categoryId);
        }
        throw new Error('Failed to fetch inventory data');
    } catch (error) {
        console.error('Error fetching inventory:', error);
        return null;
    }
}

// Modified approveRequest function
async function approveRequest(requestId) {
    if (isProcessing) return;
    
    isProcessing = true;
    showLoadingOverlay();

    try {
        // Disable the row
        const row = document.querySelector(`tr[data-request-id="${requestId}"]`);
        if (row) {
            row.style.pointerEvents = 'none';
            row.style.opacity = '0.6';
        }

        // First, get the request details to find the category ID
        const requestResponse = await fetch('/admin/get-all-requests');
        const requestData = await requestResponse.json();
        const request = requestData.borrowingRequests.find(req => req.request_id === requestId);

        if (!request) {
            throw new Error('Request not found');
        }

        // Get inventory status for this category
        const inventoryStatus = await getInventoryStatus(request.equipment_category_id);

        if (!inventoryStatus) {
            throw new Error('Could not fetch inventory status');
        }

        // Calculate remaining quantity after approval

        // Create inventory status HTML using email styles
        const remainingQuantity = inventoryStatus.quantity_available - request.quantity_requested;
        const availabilityStatus = remainingQuantity >= 0 ? 'Available' : 'Insufficient';
        const statusColor = remainingQuantity >= 0 ? '#2E7D32' : '#DC2626';

        // Update the inventory status HTML generation
        const inventoryStatusHtml = `
            <style>
                @keyframes pulse {
                    0% { transform: scale(0.95); box-shadow: 0 0 0 0 ${statusColor}40 }
                    70% { transform: scale(1); box-shadow: 0 0 0 4px ${statusColor}00 }
                    100% { transform: scale(0.95); box-shadow: 0 0 0 0 ${statusColor}00 }
                }
            </style>
            <div style="${INVENTORY_STYLES.container}">
                <h2 style="${INVENTORY_STYLES.header}">
                    Equipment Availability
                </h2>
                
                <div style="${INVENTORY_STYLES.card}">
                    <div style="${INVENTORY_STYLES.categoryName}">
                        ${inventoryStatus.category_name}
                    </div>

                    <div style="${INVENTORY_STYLES.statusBadge(statusColor)}">
                        <span style="${INVENTORY_STYLES.indicator(statusColor)}"></span>
                        <span style="color: ${statusColor}; font-weight: 600; font-size: 0.875rem">
                            ${availabilityStatus}
                        </span>
                    </div>

                    <div style="${INVENTORY_STYLES.details}">
                        <span style="${INVENTORY_STYLES.label}">Current Stock</span>
                        <span style="${INVENTORY_STYLES.value}">${inventoryStatus.quantity_available}</span>

                        <span style="${INVENTORY_STYLES.label}">Requested</span>
                        <span style="${INVENTORY_STYLES.value} ${
                            request.quantity_requested > inventoryStatus.quantity_available 
                            ? 'color: #DC2626;' 
                            : ''
                        }">
                            ${request.quantity_requested}
                        </span>
                    </div>
                </div>
            </div>
        `;

        // Show confirmation with inventory status
        const result = await Swal.fire({
          
            html: `
                ${inventoryStatusHtml}
                <p style="${SWAL_CUSTOM_STYLES.message}">Do you want to approve this request?</p>
            `,
            showCancelButton: true,
            confirmButtonText: 'Yes, approve',
            cancelButtonText: 'No, cancel',
            customClass: {
                popup: 'swal2-large'
            },
            confirmButtonColor: '#2E7D32',
            cancelButtonColor: '#6B7280'
        });

        if (result.isConfirmed) {
            // Show loading state
            Swal.fire({
                title: 'Processing...',
                html: 'Please wait while we approve the request.',
                allowOutsideClick: false,
                allowEscapeKey: false,
                didOpen: () => {
                    Swal.showLoading();
                }
            });

            // Proceed with the approval
            const response = await fetch(`/admin/update-status`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ request_id: requestId, status: 'approved' }),
                credentials: 'include'
            });

            const data = await response.json();

            if (data.message === 'Request status updated successfully') {
                await Swal.fire({
                    title: 'Success!',
                    text: `Request ${requestId} has been approved.`,
                    icon: 'success',
                    confirmButtonText: 'OK'
                });
                fetchBorrowingRequestsData();
                fetchApprovedRequestsData();
            } else {
                throw new Error(data.message);
            }
        }
    } catch (error) {
        Swal.fire({
            title: 'Error!',
            text: error.message || 'An error occurred while approving the request.',
            icon: 'error',
            confirmButtonText: 'OK'
        });
        console.error('Error in approveRequest:', error);
    } finally {
        isProcessing = false;
        // Re-enable the row
        const row = document.querySelector(`tr[data-request-id="${requestId}"]`);
        if (row) {
            row.style.pointerEvents = '';
            row.style.opacity = '';
        }
    }
}


// Add these style constants at the top of the file
const INVENTORY_STYLES = {
    container: `
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        padding: 1.25rem;
        border-radius: 8px;
        background: #ffffff;
        max-width: 400px;
        margin: auto;
    `,
    header: `
        color: #2E7D32;
        font-size: 1.125rem;
        font-weight: 600;
        margin-bottom: 1rem;
        letter-spacing: -0.25px;
    `,
    card: `
        background: #f8fafc;
        padding: 1.25rem;
        border-radius: 8px;
        border: 1px solid #e2e8f0;
    `,
    statusBadge: (color) => `
        display: inline-flex;
        align-items: center;
        padding: 0.5rem 0.75rem;
        background: ${color}10;
        border-radius: 6px;
        margin-bottom: 1rem;
        border: 1px solid ${color}30;
    `,
    indicator: (color) => `
        display: inline-block;
        width: 8px;
        height: 8px;
        border-radius: 50%;
        margin-right: 8px;
        background-color: ${color};
        animation: pulse 2s infinite;
    `,
    details: `
        display: grid;
        grid-template-columns: auto 1fr;
        gap: 0.75rem;
        align-items: center;
        padding: 0.75rem;
        background: #ffffff;
        border-radius: 6px;
        border: 1px solid #e2e8f0;
    `,
    label: `
        color: #64748b;
        font-size: 0.875rem;
        font-weight: 500;
    `,
    value: `
        color: #1e293b;
        font-size: 1rem;
        font-weight: 600;
        text-align: right;
    `,
    categoryName: `
        color: #1e293b;
        font-size: 1rem;
        font-weight: 600;
        margin: 0 0 1rem 0;
        padding-bottom: 0.75rem;
        border-bottom: 1px solid #e2e8f0;
    `
};

// Replace the existing SWAL_CUSTOM_STYLES with this simplified version
const SWAL_CUSTOM_STYLES = {
    message: `
        color: #6B7280;
        font-size: 0.875rem;
        margin-top: 0.5rem;
    `
};

function rejectRequest(requestId) {
    if (isProcessing) return;
    
    // Show confirmation dialog
    Swal.fire({
        title: 'Are you sure?',
        text: "You're about to cancel this request.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Yes, cancel it!',
        cancelButtonText: 'No, keep it'
    }).then((result) => {
        if (result.isConfirmed) {
            isProcessing = true;
            
            Swal.fire({
                title: 'Processing...',
                html: 'Please wait while we cancel the request.',
                allowOutsideClick: false,
                allowEscapeKey: false,
                didOpen: () => {
                    Swal.showLoading();
                }
            });

            fetch(`/admin/update-status`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ request_id: requestId, status: 'cancelled' }),
                credentials: 'include'
            })
            .then(response => response.json())
            .then(data => {
                isProcessing = false;
                if (data.message === 'Request status updated successfully') {
                    Swal.fire({
                        title: 'Cancelled!',
                        text: `Request ${requestId} has been cancelled.`,
                        icon: 'success',
                        confirmButtonText: 'OK'
                    }).then(() => {
                        fetchBorrowingRequestsData();
                        fetchApprovedRequestsData();
                    });
                } else {
                    throw new Error(data.message);
                }
            })
            .catch(error => {
                isProcessing = false;
                Swal.fire({
                    title: 'Error!',
                    text: 'An error occurred while cancelling the request.',
                    icon: 'error',
                    confirmButtonText: 'OK'
                });
                console.error(`Error cancelling request: ${error.message}`);
            });
        }
    });
}

const releaseRequest = (requestId) => {
    if (isProcessing) return;

    // First check if MCL Pass exists
    fetch(`/admin/get-active-requests`)
        .then(response => response.json())
        .then(data => {
            const request = data.history.find(r => r.request_id === requestId);
            
            if (!request.mcl_pass_no) {
                Swal.fire({
                    title: 'MCL Pass Required',
                    text: 'Please assign an MCL Pass Number before releasing equipment',
                    icon: 'warning',
                    showCancelButton: false,
                    confirmButtonColor: '#3085d6',
                    confirmButtonText: 'Assign MCL Pass'
                }).then((result) => {
                    if (result.isConfirmed) {
                        showRequestDetails(request);
                    }
                });
                return;
            }

            // Continue with existing release confirmation
            Swal.fire({
                title: 'Are you sure?',
                text: "You're about to release this request to the requisitioner.",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Yes, release it!',
                cancelButtonText: 'No, wait'
            }).then((result) => {
                if (result.isConfirmed) {
                    Swal.fire({
                        title: 'Processing...',
                        html: 'Please wait while we release the request.',
                        allowOutsideClick: false,
                        allowEscapeKey: false,
                        didOpen: () => {
                            Swal.showLoading();
                        }
                    });

                    fetch(`/admin/release`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ request_id: requestId, status: 'ongoing' }),
                        credentials: 'include'
                    })
                    .then(response => response.json())
                    .then(data => {
                        isProcessing = false;
                        if (data.message === 'Request status updated successfully') {
                            Swal.fire({
                                title: 'Released!',
                                text: `Request ${requestId} has been released to the requisitioner.`,
                                icon: 'success',
                                confirmButtonText: 'OK'
                            }).then(() => {
                                fetchApprovedRequestsData();
                            });
                        } else {
                            // Handle insufficient stock error
                            if (data.message && data.message.includes('Insufficient stock')) {
                                Swal.fire({
                                    title: 'Cannot Release Equipment',
                                    html: `${data.message}<br><br>Category: ${data.category}`,
                                    icon: 'error',
                                    confirmButtonText: 'OK'
                                });
                            } else {
                                throw new Error(data.message);
                            }
                        }
                    })
                    .catch(error => {
                        isProcessing = false;
                        Swal.fire({
                            title: 'Error!',
                            text: 'An error occurred while releasing the request.',
                            icon: 'error',
                            confirmButtonText: 'OK'
                        });
                        console.error(`Error releasing request: ${error.message}`);
                    });
                }
            });
        });
};

const cancelRequest = (requestId) => {
    if (isProcessing) return;

    Swal.fire({
        title: 'Are you sure?',
        text: "You're about to cancel this approved request.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Yes, cancel it!',
        cancelButtonText: 'No, keep it'
    }).then((result) => {
        if (result.isConfirmed) {
            isProcessing = true;

            Swal.fire({
                title: 'Processing...',
                html: 'Please wait while we cancel the request.',
                allowOutsideClick: false,
                allowEscapeKey: false,
                didOpen: () => {
                    Swal.showLoading();
                }
            });

            fetch(`/admin/release`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ request_id: requestId, status: 'cancelled' }),
                credentials: 'include'
            })
            .then(response => response.json())
            .then(data => {
                isProcessing = false;
                if (data.message === 'Request status updated successfully') {
                    Swal.fire({
                        title: 'Cancelled!',
                        text: `Request ${requestId} has been cancelled.`,
                        icon: 'success',
                        confirmButtonText: 'OK'
                    }).then(() => {
                        fetchApprovedRequestsData();
                    });
                } else {
                    throw new Error(data.message);
                }
            })
            .catch(error => {
                isProcessing = false;
                Swal.fire({
                    title: 'Error!',
                    text: 'An error occurred while cancelling the request.',
                    icon: 'error',
                    confirmButtonText: 'OK'
                });
                console.error(`Error cancelling request: ${error.message}`);
            });
        }
    });
};

const returnRequest = (requestId) => {
    if (isProcessing) return;

    // First check if MCL Pass exists
    fetch(`/admin/get-active-requests`)
        .then(response => response.json())
        .then(data => {
            const request = data.history.find(r => r.request_id === requestId);
            
            if (!request.mcl_pass_no) {
                Swal.fire({
                    title: 'MCL Pass Required',
                    text: 'Please assign an MCL Pass Number before returning equipment',
                    icon: 'warning',
                    showCancelButton: false,
                    confirmButtonColor: '#3085d6',
                    confirmButtonText: 'Assign MCL Pass'
                }).then((result) => {
                    if (result.isConfirmed) {
                        showRequestDetails(request);
                    }
                });
                return;
            }

            // Continue with existing return confirmation
            Swal.fire({
                title: 'Are you sure?',
                text: "You're about to mark this request as returned.",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Yes, return it!',
                cancelButtonText: 'No, wait'
            }).then((result) => {
                if (result.isConfirmed) {
                    Swal.fire({
                        title: 'Processing...',
                        html: 'Please wait while we process the return.',
                        allowOutsideClick: false,
                        allowEscapeKey: false,
                        didOpen: () => {
                            Swal.showLoading();
                        }
                    });

                    fetch(`/admin/release`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ request_id: requestId, status: 'returned' }),
                        credentials: 'include'
                    })
                    .then(response => response.json())
                    .then(data => {
                        isProcessing = false;
                        if (data.message === 'Request status updated successfully') {
                            Swal.fire({
                                title: 'Returned!',
                                text: `Request ${requestId} has been marked as returned.`,
                                icon: 'success',
                                confirmButtonText: 'OK'
                            }).then(() => {
                                fetchApprovedRequestsData();
                            });
                        } else {
                            throw new Error(data.message);
                        }
                    })
                    .catch(error => {
                        isProcessing = false;
                        Swal.fire({
                            title: 'Error!',
                            text: 'An error occurred while processing the return.',
                            icon: 'error',
                            confirmButtonText: 'OK'
                        });
                        console.error(`Error returning request: ${error.message}`);
                    });
                }
            });
        });
};

// Updated showToast function in requests.js
function showToast(message, type) {
    const toastContainer = document.getElementById('toast-container');

    const toastEl = document.createElement('div');
    toastEl.className = `toast align-items-center border-0 mb-2`;
    toastEl.setAttribute('role', 'alert');
    toastEl.setAttribute('aria-live', 'assertive');
    toastEl.setAttribute('aria-atomic', 'true');

    toastEl.innerHTML = `
        <div class="toast-header">
            <img src="../assets/img/CEU-Logo.png" alt="Icon" width="30" height="30" class="me-2">
            <strong class="me-auto">CEU Vault</strong>
            <small>Just now</small>
            <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
        <div class="toast-body">
            ${message}
        </div>
    `;

    toastContainer.appendChild(toastEl);
    const toast = new bootstrap.Toast(toastEl);
    toast.show();

    toastEl.addEventListener('hidden.bs.toast', () => {
        toastEl.remove();
    });
}

document.addEventListener("DOMContentLoaded", function() {
    const navbarCheckbox = document.getElementById('navbarFixed');
    navbarFixed(navbarCheckbox);
});