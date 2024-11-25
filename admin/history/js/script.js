document.getElementById('signOutLink').addEventListener('click', async () => {
    try {
        const response = await fetch('/admin/logout', {
            method: 'POST', // Assuming the logout endpoint expects a POST request
            credentials: 'include' // Include cookies if needed
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        // Redirect to the login page
        window.location.href = '../sign-in/'; // Adjust the login URL as needed
    } catch (error) {
        console.error('Error during sign out:', error);
    }
});



// Formatting functions
function formatDate(isoString) {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    const date = new Date(isoString);
    return date.toLocaleDateString(undefined, options);
}

function formatTime(timeString) {
    const [hour, minute, second] = timeString.split(':');
    const date = new Date();
    date.setHours(parseInt(hour, 10), parseInt(minute, 10), parseInt(second, 10));
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

let allHistoryData = []; // Store all history data

async function fetchApprovedRequestsData() {
    const tableBody = document.getElementById('approvedRequestsTableBody');
    tableBody.innerHTML = `
          <tr>
            <td colspan="8" class="text-center">
              <div class="spinner-border" role="status">
                <span class="visually-hidden">Loading...</span>
              </div>
            </td>
          </tr>
        `;
    try {
        const response = await fetch('/admin/get-all-history');
        console.log('Response Status:', response.status);
        console.log('Response Headers:', response.headers);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Fetched Data:', data);

        if (data.successful && data.history && data.history.length > 0) {
            allHistoryData = data.history; // Store all data
            displayApprovedRequestsTable(data.history.slice(0, 5), 'approvedRequestsTableBody'); // Display first 5 rows
        } else {
            tableBody.innerHTML = `<tr><td colspan="8" class="text-center text-muted">Waiting for approved requests...</td></tr>`;
        }
    } catch (error) {
        console.error('Error fetching approved requests data:', error);
        tableBody.innerHTML = `<tr><td colspan="8" class="text-center text-muted">Waiting for approved requests...</td></tr>`;
    }
}

// Add event listener for view all history button
document.getElementById('viewAllHistoryBtn').addEventListener('click', () => {
    displayApprovedRequestsTable(allHistoryData, 'modalHistoryTableBody');
    const modalElement = document.getElementById('viewAllHistoryModal');
    const modal = new bootstrap.Modal(modalElement);
    modal.show();
});

function displayApprovedRequestsTable(requests, containerId) {
    const tableBody = document.getElementById(containerId);
    tableBody.innerHTML = '';

    // Filter requests
    const filteredRequests = requests.filter(request =>
        request.status === 'cancelled' || request.status === 'returned');

    // Sort by batch_id
    filteredRequests.sort((a, b) =>
        (a.batch_id || '').toString().localeCompare((b.batch_id || '').toString()));

    // Tracking variables for batch merging
    let currentBatchId = null;
    let rowspanCount = 0;
    let firstRowOfBatch = null;

    filteredRequests.forEach((request, index) => {
        const row = document.createElement('tr');

        // Start with requisitioner cell
        let rowContent = `
            <td>
              <div class="d-flex px-2 py-1">
                <div class="d-flex flex-column justify-content-center">
                  <h6 class="mb-0 text-sm">${request.first_name} ${request.last_name}</h6>
                  <p class="text-xs text-secondary mb-0">${request.email}</p>
                </div>
              </div>
            </td>`;

        // Handle batch_id cell merging
        if (request.batch_id !== currentBatchId) {
            // Set rowspan for previous batch if exists
            if (firstRowOfBatch && rowspanCount > 1) {
                const batchCell = firstRowOfBatch.cells[1];
                batchCell.rowSpan = rowspanCount;
                batchCell.className = "merged-cell align-middle text-center align-items-center";
            }

            // Start new batch
            currentBatchId = request.batch_id;
            rowspanCount = 1;
            firstRowOfBatch = row;

            // Add batch_id cell only for first row of batch
            rowContent += `
              <td class="merged-cell align-middle text-center align-items-center">
                <p class="text-xs font-weight-bold mb-0">${request.batch_id}</p>
              </td>`;
        } else {
            rowspanCount++;
        }

        const statusClass = request.status === 'cancelled'
            ? 'badge badge-sm bg-gradient-danger'
            : request.status === 'returned'
                ? 'badge badge-sm bg-gradient-secondary'
                : 'badge badge-sm bg-gradient-success';

        // Add remaining cells
        rowContent += `
            <td>
              <p class="text-xs font-weight-bold mb-0">${request.equipment_category_id}</p>
              <p class="text-xs text-secondary mb-0">${request.category_name}</p>
            </td>
            <td class="align-middle align-items-center text-center">
              <p class="text-xs font-weight-bold mb-0">${request.quantity_requested}</p>
            </td>
            <td class="align-middle text-center text-sm">
              <span class="${statusClass}">${request.status}</span>
            </td>
            <td>
              <p class="text-xs font-weight-bold mb-0">${formatDate(request.requested)}</p>
            </td>
            <td>
              <p class="text-xs font-weight-bold mb-0">${formatTime(request.time_requested)}</p>
            </td>
            <td>
              <p class="text-xs font-weight-bold mb-0">${formatTime(request.return_time)}</p>
            </td>`;

        row.innerHTML = rowContent;
        tableBody.appendChild(row);
    });

    // Handle rowspan for last batch
    if (firstRowOfBatch && rowspanCount > 1) {
        const batchCell = firstRowOfBatch.cells[1];
        batchCell.rowSpan = rowspanCount;
        batchCell.className = "merged-cell align-middle text-center align-items-center";
    }
}

// Add CSS for merged cells if not already present
const style = document.createElement('style');
style.textContent = `
      .merged-cell {
        border: 1px solid rgba(0,0,0,0.05);
        background: linear-gradient(310deg, #ffffff 0%, #f8f9fa 100%);
        box-shadow: 0 0 2px 0 rgba(0,0,0,0.05);
        transition: all 0.15s ease-in-out;
      }

      .merged-cell:hover {
        box-shadow: 0 0 4px 0 rgba(0,0,0,0.1);
      }

      .merged-cell p {
        margin: 0;
        position: relative;
        top: 50%;
        transform: translateY(-50%);
      }`;
document.head.appendChild(style);

// Call the function to fetch and display data
fetchApprovedRequestsData();


document.addEventListener('DOMContentLoaded', () => {
    const invoiceList = document.getElementById('invoiceList');
    const allInvoiceList = document.getElementById('allInvoiceList');
    const maxItems = 5;
    const errorMessage = document.getElementById('errorMessage');

    // Display the spinner in the invoiceList
    invoiceList.innerHTML = `
      <li class="list-group-item text-center">
        <div class="spinner-border" role="status">
          <span class="visually-hidden">Loading...</span>
        </div>
      </li>
    `;

    // Fetch data from get-receipts endpoint
    fetch('/admin/get-receipts')
        .then(response => response.json())
        .then(data => {
            // Clear the invoiceList
            invoiceList.innerHTML = '';

            if (data.successful && Array.isArray(data.requestHistory)) {
                const requestHistory = data.requestHistory;

                // Display up to 5 items
                requestHistory.slice(0, maxItems).forEach(item => {
                    const listItem = createInvoiceListItem(item);
                    invoiceList.appendChild(listItem);
                });

                // Populate the modal with all items
                requestHistory.forEach(item => {
                    const listItem = createInvoiceListItem(item);
                    allInvoiceList.appendChild(listItem);
                });
            } else {
                console.error('Failed to fetch receipts:', data.message);
                if (errorMessage) {
                    errorMessage.textContent = data.message || 'Failed to fetch invoices.';
                    errorMessage.style.display = 'block';
                }

                // Display a message in the invoiceList
                invoiceList.innerHTML = `
    <li class="list-group-item text-center text-muted">
      ${data.message || 'No receipts available.'}
    </li>
  `;
            }
        })
        .catch(error => {
            console.error('Error:', error);
            // Display an error message in the invoiceList
            invoiceList.innerHTML = `
          <li class="list-group-item text-center text-muted">
            An unexpected error occurred.
          </li>
        `;
        });

    // Function to create a list item
    function createInvoiceListItem(item) {
        const li = document.createElement('li');
        li.className = 'list-group-item border-0 d-flex justify-content-between ps-0 mb-2 border-radius-lg';

        const infoDiv = document.createElement('div');
        infoDiv.className = 'd-flex flex-column';

        // Name (First Name + Last Name)
        const nameH6 = document.createElement('h6');
        nameH6.className = 'mb-1 text-dark font-weight-bold text-sm';
        nameH6.textContent = `${item.first_name} ${item.last_name}`;
        infoDiv.appendChild(nameH6);

        // Batch ID
        const idSpan = document.createElement('span');
        idSpan.className = 'text-xs';
        idSpan.textContent = `Batch #${item.batch_id}`;
        infoDiv.appendChild(idSpan);

        // Email and PDF Buttons Column
        const emailAndPdfDiv = document.createElement('div');
        emailAndPdfDiv.className = 'd-flex align-items-center text-sm';

        // Email
        const emailSpan = document.createElement('span');
        emailSpan.textContent = item.email;
        emailAndPdfDiv.appendChild(emailSpan);

        // Request Form PDF Button
        const requestPdfButton = document.createElement('button');
        requestPdfButton.className = 'btn btn-link text-dark text-sm mb-0 px-0 ms-4';
        requestPdfButton.innerHTML = '<i class="fas fa-file-pdf text-lg me-1"></i> Request Form';
        requestPdfButton.addEventListener('click', () => {
            downloadPDF(item.form_receipt, `RequestForm-${item.batch_id}.pdf`);
        });
        emailAndPdfDiv.appendChild(requestPdfButton);

        // Approved Receipt PDF Button (if available)
        if (item.approved_receipt) {
            const approvedPdfButton = document.createElement('button');
            approvedPdfButton.className = 'btn btn-link text-danger text-sm mb-0 px-0 ms-4';
            approvedPdfButton.innerHTML = '<i class="fas fa-file-pdf text-lg me-1"></i> Approved Form';
            approvedPdfButton.addEventListener('click', () => {
                downloadPDF(item.approved_receipt, `ApprovedForm-${item.batch_id}.pdf`);
            });
            emailAndPdfDiv.appendChild(approvedPdfButton);
        }

        li.appendChild(infoDiv);
        li.appendChild(emailAndPdfDiv);

        return li;
    }

    // Function to download PDF
    function downloadPDF(base64Data, fileName) {
        try {
            const link = document.createElement('a');
            link.href = `data:application/pdf;base64,${base64Data}`;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            console.error('Download failed:', error);
        }
    }

    // Event listener for 'View All' button
    document.getElementById('viewAllBtn').addEventListener('click', () => {
        const modalElement = document.getElementById('viewAllModal');
        const modal = new bootstrap.Modal(modalElement);
        modal.show();
    });
});