function approveRequest(requestId) {
    const requestBody = { request_id: requestId, status: 'approved' };
    console.log('Request Body:', JSON.stringify(requestBody)); // Log the JSON body

    fetch(`https://localhost:8000/equipments/update-status`, {
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
            alert(`Request ${requestId} has been approved.`);
            fetchBorrowingRequestsData(); // Refresh the pending requests table
            fetchApprovedRequestsData(); // Refresh the approved requests table
        } else {
            alert(`Failed to approve request: ${data.message}`);
        }
    })
    .catch(error => {
        console.error(`Error approving request: ${error.message}`);
        alert('An error occurred while approving the request.');
    });
}

const rejectRequest = (requestId) => {
    fetch(`https://localhost:8000/equipments/update-status`, {
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
            alert(`Request ${requestId} has been cancelled.`);
            fetchBorrowingRequestsData(); // Refresh the pending requests table
            fetchApprovedRequestsData(); // Refresh the approved requests table
        } else {
            alert(`Failed to cancel request: ${data.message}`);
        }
    })
    .catch(error => {
        console.error(`Error cancelling request: ${error.message}`);
        alert('An error occurred while cancelling the request.');
    });
};

const releaseRequest = (requestId) => {
    fetch(`https://localhost:8000/equipments/release`, {
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
            alert(`Request ${requestId} has been released to the requisitioner.`);
            fetchApprovedRequestsData(); // Refresh the approved requests table
        } else {
            alert(`Failed to release request: ${data.message}`);
        }
    })
    .catch(error => {
        console.error(`Error releasing request: ${error.message}`);
        alert('An error occurred while releasing the request.');
    });
};

const returnRequest = (requestId) => {
    fetch(`https://localhost:8000/equipments/release`, {
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
            alert(`Request ${requestId} has been returned.`);
            fetchApprovedRequestsData(); // Refresh the approved requests table
        } else {
            alert(`Failed to return request: ${data.message}`);
        }
    })
    .catch(error => {
        console.error(`Error returning request: ${error.message}`);
        alert('An error occurred while returning the request.');
    });
};

const cancelRequest = (requestId) => {
    fetch(`https://localhost:8000/equipments/release`, {
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
            alert(`Request ${requestId} has been cancelled.`);
            fetchApprovedRequestsData(); // Refresh the approved requests table
        } else {
            alert(`Failed to cancel request: ${data.message}`);
        }
    })
    .catch(error => {
        console.error(`Error cancelling request: ${error.message}`);
        alert('An error occurred while cancelling the request.');
    });
};