// Modified functions in requests.js

// Add a loading state tracker
let isProcessing = false;

function approveRequest(requestId) {
    // Prevent multiple clicks while processing
    if (isProcessing) return;
    
    isProcessing = true;

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

    const requestBody = { request_id: requestId, status: 'approved' };

    fetch(`/admin/update-status`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        credentials: 'include'
    })
    .then(response => response.json())
    .then(data => {
        isProcessing = false;
        if (data.message === 'Request status updated successfully') {
            Swal.fire({
                title: 'Success!',
                text: `Request ${requestId} has been approved.`,
                icon: 'success',
                confirmButtonText: 'OK'
            }).then(() => {
                fetchBorrowingRequestsData();
                fetchApprovedRequestsData();
            });
        } else {
            Swal.fire({
                title: 'Error!',
                text: `Failed to approve request: ${data.message}`,
                icon: 'error',
                confirmButtonText: 'OK'
            });
        }
    })
    .catch(error => {
        isProcessing = false;
        Swal.fire({
            title: 'Error!',
            text: 'An error occurred while approving the request.',
            icon: 'error',
            confirmButtonText: 'OK'
        });
        console.error(`Error approving request: ${error.message}`);
    });
}

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

    Swal.fire({
        title: 'Are you sure?',
        text: "You're about to release this request to the requisitioner.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Yes, release it!',
        cancelButtonText: 'No, wait'
    }).then((result) => {
        if (result.isConfirmed) {
            isProcessing = true;

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

function returnRequest(requestId) {
    if (isProcessing) return;

    Swal.fire({
        title: 'Are you sure?',
        text: "You're about to mark this request as returned.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Yes, return it!',
        cancelButtonText: 'No, wait'
    }).then((result) => {
        if (result.isConfirmed) {
            isProcessing = true;

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
}

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