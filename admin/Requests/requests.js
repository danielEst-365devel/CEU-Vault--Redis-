// Modified functions in requests.js

function approveRequest(requestId) {
    const requestBody = { request_id: requestId, status: 'approved' };
    console.log('Request Body:', JSON.stringify(requestBody)); // Log the JSON body

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
        if (data.message === 'Request status updated successfully') {
            showToast(`Request ${requestId} has been approved.`, 'success');
            fetchBorrowingRequestsData(); // Refresh the pending requests table
            fetchApprovedRequestsData(); // Refresh the approved requests table
        } else {
            showToast(`Failed to approve request: ${data.message}`, 'danger');
        }
    })
    .catch(error => {
        console.error(`Error approving request: ${error.message}`);
        showToast('An error occurred while approving the request.', 'danger');
    });
}

const rejectRequest = (requestId) => {
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
        if (data.message === 'Request status updated successfully') {
            showToast(`Request ${requestId} has been cancelled.`, 'success');
            fetchBorrowingRequestsData(); // Refresh the pending requests table
            fetchApprovedRequestsData(); // Refresh the approved requests table
        } else {
            showToast(`Failed to cancel request: ${data.message}`, 'danger');
        }
    })
    .catch(error => {
        console.error(`Error cancelling request: ${error.message}`);
        showToast('An error occurred while cancelling the request.', 'danger');
    });
};

const releaseRequest = (requestId) => {
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
        if (data.message === 'Request status updated successfully') {
            showToast(`Request ${requestId} has been released to the requisitioner.`, 'success');
            fetchApprovedRequestsData(); // Refresh the approved requests table
        } else {
            showToast(`Failed to release request: ${data.message}`, 'danger');
        }
    })
    .catch(error => {
        console.error(`Error releasing request: ${error.message}`);
        showToast('An error occurred while releasing the request.', 'danger');
    });
};

const returnRequest = (requestId) => {
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
        if (data.message === 'Request status updated successfully') {
            showToast(`Request ${requestId} has been returned.`, 'success');
            fetchApprovedRequestsData(); // Refresh the approved requests table
        } else {
            showToast(`Failed to return request: ${data.message}`, 'danger');
        }
    })
    .catch(error => {
        console.error(`Error returning request: ${error.message}`);
        showToast('An error occurred while returning the request.', 'danger');
    });
};

const cancelRequest = (requestId) => {
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
        if (data.message === 'Request status updated successfully') {
            showToast(`Request ${requestId} has been cancelled.`, 'success');
            fetchApprovedRequestsData(); // Refresh the approved requests table
        } else {
            showToast(`Failed to cancel request: ${data.message}`, 'danger');
        }
    })
    .catch(error => {
        console.error(`Error cancelling request: ${error.message}`);
        showToast('An error occurred while cancelling the request.', 'danger');
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