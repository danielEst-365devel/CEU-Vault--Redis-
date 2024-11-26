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

let currentPage = 1;
let allHistoryData = []; // Store all history data
let currentSearch = '';
let searchTimeout = null;
let currentDateFilter = '';

// Add these variables at the top with other state variables
let currentReceiptSearch = '';
let receiptSearchTimeout = null;

// Modified fetchApprovedRequestsData function
async function fetchApprovedRequestsData(page = 1, search = '', searchMode = 'general') {
    const tableBody = document.getElementById('approvedRequestsTableBody');
    const modalTableBody = document.getElementById('modalHistoryTableBody');
    const currentTableBody = modalTableBody.closest('.modal')?.classList.contains('show') ? modalTableBody : tableBody;

    try {
        currentTableBody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center">
                    <div class="spinner-border" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                </td>
            </tr>
        `;

        const params = new URLSearchParams({
            page: page.toString(),
            limit: '10'
        });

        if (search) {
            params.append('search', search);
            params.append('searchMode', searchMode);
        }

        if (currentDateFilter) {
            params.append('dateFilter', currentDateFilter);
        }

        const url = `/admin/get-all-history?${params}`;
        console.log('Fetching from:', url);

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Cache-Control': 'no-cache'
            },
            credentials: 'include'
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Server response:', errorText);
            throw new Error(`Server error: ${response.status}`);
        }

        const data = await response.json();
        console.log('Received data:', data);

        if (!data.successful) {
            throw new Error(data.message || 'Failed to retrieve data');
        }

        if (!Array.isArray(data.history)) {
            throw new Error('Invalid data format received');
        }

        allHistoryData = data.history;
        if (currentTableBody === tableBody) {
            displayApprovedRequestsTable(data.history.slice(0, 5), 'approvedRequestsTableBody');
        } else {
            displayApprovedRequestsTable(data.history, 'modalHistoryTableBody');
            if (data.pagination) {
                updatePaginationControls(data.pagination);
            }
        }
    } catch (error) {
        console.error('Error details:', error);
        currentTableBody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center text-danger">
                    Failed to load data: ${error.message}
                </td>
            </tr>
        `;
    }
}

// Add event listener for search input
document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('historySearchInput');
    const batchSearchToggle = document.getElementById('batchSearchToggle');
    
    if (searchInput && batchSearchToggle) {
        let searchTimeout;

        function updateSearchPlaceholder() {
            searchInput.placeholder = batchSearchToggle.checked ? 
                "Enter batch ID..." : 
                "Search by name or email...";
        }

        function performSearch() {
            const searchValue = searchInput.value.trim();
            const searchMode = batchSearchToggle.checked ? 'batch' : 'general';
            fetchApprovedRequestsData(1, searchValue, searchMode);
        }

        batchSearchToggle.addEventListener('change', () => {
            updateSearchPlaceholder();
            performSearch();
        });

        searchInput.addEventListener('input', () => {
            if (searchTimeout) {
                clearTimeout(searchTimeout);
            }
            searchTimeout = setTimeout(performSearch, 300);
        });

        // Initialize placeholder
        updateSearchPlaceholder();
    }

    const dateFilterType = document.getElementById('dateFilterType');
    const dateFilter = document.getElementById('dateFilter');
    const monthFilter = document.getElementById('monthFilter');

    dateFilterType.addEventListener('change', function() {
        dateFilter.style.display = 'none';
        monthFilter.style.display = 'none';
        currentDateFilter = '';

        switch(this.value) {
            case 'date':
                dateFilter.style.display = 'block';
                break;
            case 'month':
                monthFilter.style.display = 'block';
                break;
        }
        
        performSearch();
    });

    dateFilter.addEventListener('change', function() {
        if (this.value) {
            currentDateFilter = this.value;
        } else {
            currentDateFilter = '';
        }
        performSearch();
    });

    monthFilter.addEventListener('change', function() {
        if (this.value) {
            currentDateFilter = 'month:' + this.value;
        } else {
            currentDateFilter = '';
        }
        performSearch();
    });

    const receiptSearchInput = document.getElementById('receiptSearchInput');
    const receiptBatchSearchToggle = document.getElementById('receiptBatchSearchToggle');
    
    if (receiptSearchInput && receiptBatchSearchToggle) {
        function updateReceiptSearchPlaceholder() {
            receiptSearchInput.placeholder = receiptBatchSearchToggle.checked ? 
                "Enter batch ID..." : 
                "Search by name or email...";
        }

        function performReceiptSearch() {
            const searchValue = receiptSearchInput.value.trim();
            const searchMode = receiptBatchSearchToggle.checked ? 'batch' : 'general';
            currentReceiptSearch = searchValue;
            fetchReceipts(1, searchValue, searchMode);
        }

        receiptBatchSearchToggle.addEventListener('change', () => {
            updateReceiptSearchPlaceholder();
            performReceiptSearch();
        });

        receiptSearchInput.addEventListener('input', () => {
            if (receiptSearchTimeout) {
                clearTimeout(receiptSearchTimeout);
            }
            receiptSearchTimeout = setTimeout(performReceiptSearch, 300);
        });

        updateReceiptSearchPlaceholder();
    }
});

// For the requests page (approved and ongoing)
async function fetchActiveRequestsData(page = 1) {
    const tableBody = document.getElementById('approvedRequestsTableBody');
    const modalTableBody = document.getElementById('modalHistoryTableBody');
    const currentTableBody = modalTableBody.closest('.modal').classList.contains('show') ? modalTableBody : tableBody;

    currentTableBody.innerHTML = `
        <tr>
            <td colspan="8" class="text-center">
                <div class="spinner-border" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
            </td>
        </tr>
    `;

    try {
        const response = await fetch(`/admin/get-active-requests?page=${page}&limit=10`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Fetched data:', data); // Debug log

        if (data.successful && data.history && data.history.length > 0) {
            allHistoryData = data.history;
            // Display first 5 rows in main table
            if (currentTableBody === tableBody) {
                displayApprovedRequestsTable(data.history.slice(0, 5), 'approvedRequestsTableBody');
            } else {
                // Display all rows in modal
                displayApprovedRequestsTable(data.history, 'modalHistoryTableBody');
                updatePaginationControls(data.pagination);
            }
        } else {
            currentTableBody.innerHTML = `<tr><td colspan="8" class="text-center text-muted">No requests found...</td></tr>`;
        }
    } catch (error) {
        console.error('Error fetching approved requests data:', error);
        currentTableBody.innerHTML = `<tr><td colspan="8" class="text-center text-muted">Error loading data...</td></tr>`;
    }
}

function updatePaginationControls(pagination) {
    const paginationContainer = document.getElementById('historyPagination');
    const { currentPage, totalPages, totalItems, itemsPerPage } = pagination;
    const startItem = ((currentPage - 1) * itemsPerPage) + 1;
    const endItem = Math.min(currentPage * itemsPerPage, totalItems);

    let paginationHTML = `
        <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
            <a class="page-link" href="#" data-page="${currentPage - 1}" aria-label="Previous">
                <i class="fas fa-chevron-left"></i>
            </a>
        </li>
    `;

    // Add page numbers with increased gap spacing
    for (let i = 1; i <= totalPages; i++) {
        paginationHTML += `
            <li class="page-item ${i === currentPage ? 'active' : ''}" style="margin: 0 5px;">
                <a class="page-link" href="#" data-page="${i}">${i}</a>
            </li>
        `;
    }

    paginationHTML += `
        <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
            <a class="page-link" href="#" data-page="${currentPage + 1}" aria-label="Next">
                <i class="fas fa-chevron-right"></i>
            </a>
        </li>
    `;

    paginationContainer.innerHTML = paginationHTML;

    // Add row count display
    const rowCountDisplay = document.getElementById('rowCountDisplay');
    rowCountDisplay.innerHTML = `Showing requests ${startItem} to ${endItem} out of ${totalItems} requests`;

    // Add event listeners to pagination buttons
    paginationContainer.querySelectorAll('.page-link').forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            const newPage = parseInt(e.target.closest('.page-link').dataset.page);
            if (!isNaN(newPage) && newPage !== currentPage) {
                fetchApprovedRequestsData(newPage, currentSearch);
            }
        });
    });
}

// Add event listener for view all history button
document.getElementById('viewAllHistoryBtn').addEventListener('click', () => {
    const modalElement = document.getElementById('viewAllHistoryModal');
    const modal = new bootstrap.Modal(modalElement);
    modalElement.addEventListener('shown.bs.modal', function () {
        document.getElementById('modalHistoryTableBody').classList.add('active');
        fetchApprovedRequestsData(1);
    });
    modalElement.addEventListener('hidden.bs.modal', function () {
        document.getElementById('modalHistoryTableBody').classList.remove('active');
        fetchApprovedRequestsData(1); // Refresh main table
    });
    modal.show();
});

function displayApprovedRequestsTable(requests, containerId) {
    const tableBody = document.getElementById(containerId);
    tableBody.innerHTML = '';

    // Sort requests by batch_id in descending order
    requests.sort((a, b) => b.batch_id - a.batch_id);

    let currentBatchId = null;
    let rowspanCount = 0;
    let firstRowOfBatch = null;

    requests.forEach((request, index) => {
        const row = document.createElement('tr');
        row.style.cursor = 'pointer';
        row.dataset.requestData = JSON.stringify(request);
        
        row.addEventListener('click', () => showRequestDetails(request));

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
            if (firstRowOfBatch && rowspanCount > 1) {
                const batchCell = firstRowOfBatch.cells[1];
                batchCell.rowSpan = rowspanCount;
                batchCell.className = "merged-cell align-middle text-center align-items-center";
            }

            currentBatchId = request.batch_id;
            rowspanCount = 1;
            firstRowOfBatch = row;

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

    if (firstRowOfBatch && rowspanCount > 1) {
        const batchCell = firstRowOfBatch.cells[1];
        batchCell.rowSpan = rowspanCount;
        batchCell.className = "merged-cell align-middle text-center align-items-center";
    }
}

async function showRequestDetails(request) {
    // Fetch receipts for the batch_id
    try {
        const response = await fetch(`/admin/get-receipts?search=${request.batch_id}&searchMode=batch`);
        const data = await response.json();
        
        const receipt = data.requestHistory?.find(r => r.batch_id === request.batch_id);
        
        // Show/hide form buttons based on availability
        const requestFormBtn = document.getElementById('requestFormBtn');
        const approvedFormBtn = document.getElementById('approvedFormBtn');
        
        if (receipt) {
            requestFormBtn.classList.remove('d-none');
            requestFormBtn.onclick = () => downloadPDF(receipt.form_receipt, `RequestForm-${request.batch_id}.pdf`);
            
            if (receipt.approved_receipt) {
                approvedFormBtn.classList.remove('d-none');
                approvedFormBtn.onclick = () => downloadPDF(receipt.approved_receipt, `ApprovedForm-${request.batch_id}.pdf`);
            } else {
                approvedFormBtn.classList.add('d-none');
            }
        } else {
            requestFormBtn.classList.add('d-none');
            approvedFormBtn.classList.add('d-none');
        }

        // Fetch all related requests with the same batch_id
        const relatedRequests = allHistoryData.filter(r => r.batch_id === request.batch_id);
        
        // Update the existing detail fields
        document.getElementById('detail-name').textContent = `${request.first_name} ${request.last_name}`;
        document.getElementById('detail-email').textContent = request.email;
        document.getElementById('detail-department').textContent = request.department || 'N/A';
        document.getElementById('detail-batch-id').textContent = request.batch_id;
        document.getElementById('detail-status').textContent = request.status;
        document.getElementById('detail-mcl-pass').textContent = request.mcl_pass_no || 'N/A';
        document.getElementById('detail-approved-by').textContent = request.request_approved_by || 'N/A';
        document.getElementById('detail-category').textContent = request.category_name;
        document.getElementById('detail-quantity').textContent = request.quantity_requested;
        document.getElementById('detail-date').textContent = formatDate(request.requested);
        document.getElementById('detail-time-requested').textContent = formatTime(request.time_requested);
        document.getElementById('detail-return-time').textContent = formatTime(request.return_time);
        document.getElementById('detail-nature').textContent = request.nature_of_service || 'N/A';
        document.getElementById('detail-purpose').textContent = request.purpose || 'N/A';
        document.getElementById('detail-venue').textContent = request.venue || 'N/A';
        document.getElementById('detail-released-by').textContent = request.released_by || 'N/A';
        document.getElementById('detail-received-by').textContent = request.received_by || 'N/A';
        document.getElementById('detail-remarks').textContent = request.remarks || 'N/A';

        // Show the panel
        document.getElementById('requestDetailPanel').classList.add('show');
        
    } catch (error) {
        console.error('Error fetching receipt data:', error);
    }
}

function closeRequestDetails() {
    document.getElementById('requestDetailPanel').classList.remove('show');
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


async function fetchReceipts(page = 1, search = '', searchMode = 'general') {
    const invoiceList = document.getElementById('invoiceList');
    const modalInvoiceList = document.getElementById('allInvoiceList');
    const currentList = modalInvoiceList.closest('.modal').classList.contains('show') ? modalInvoiceList : invoiceList;
    const errorMessage = document.getElementById('errorMessage');

    try {
        currentList.innerHTML = `
            <li class="list-group-item text-center">
                <div class="spinner-border" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
            </li>
        `;

        const params = new URLSearchParams({
            page: page.toString(),
            limit: '10'
        });

        if (search) {
            params.append('search', search);
            params.append('searchMode', searchMode);
        }

        const response = await fetch(`/admin/get-receipts?${params}`);
        const data = await response.json();

        if (data.successful && Array.isArray(data.requestHistory)) {
            // Sort requestHistory by batch_id in descending order
            data.requestHistory.sort((a, b) => b.batch_id - a.batch_id);
            
            currentList.innerHTML = '';
            data.requestHistory.forEach(item => {
                const listItem = createInvoiceListItem(item);
                currentList.appendChild(listItem);
            });

            if (currentList === modalInvoiceList) {
                updateReceiptsPagination(data.pagination);
            } else {
                Array.from(currentList.children)
                    .slice(5)
                    .forEach(item => item.remove());
            }
        } else {
            throw new Error(data.message || 'Failed to fetch receipts');
        }
    } catch (error) {
        console.error('Error:', error);
        currentList.innerHTML = `
            <li class="list-group-item text-center text-muted">
                ${error.message || 'An unexpected error occurred.'}
            </li>
        `;
        if (errorMessage) {
            errorMessage.textContent = error.message || 'Failed to fetch invoices.';
            errorMessage.style.display = 'block';
        }
    }
}

function updateReceiptsPagination(pagination) {
    const paginationContainer = document.getElementById('receiptsPagination');
    const { currentPage, totalPages, totalItems, itemsPerPage } = pagination;
    const startItem = ((currentPage - 1) * itemsPerPage) + 1;
    const endItem = Math.min(currentPage * itemsPerPage, totalItems);

    let paginationHTML = `
        <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
            <a class="page-link" href="#" data-page="${currentPage - 1}" aria-label="Previous">
                <i class="fas fa-chevron-left"></i>
            </a>
        </li>
    `;

    for (let i = 1; i <= totalPages; i++) {
        paginationHTML += `
            <li class="page-item ${i === currentPage ? 'active' : ''}" style="margin: 0 5px;">
                <a class="page-link" href="#" data-page="${i}">${i}</a>
            </li>
        `;
    }

    paginationHTML += `
        <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
            <a class="page-link" href="#" data-page="${currentPage + 1}" aria-label="Next">
                <i class="fas fa-chevron-right"></i>
            </a>
        </li>
    `;

    paginationContainer.innerHTML = paginationHTML;

    // Update row count display
    const rowCountDisplay = document.getElementById('receiptsRowCountDisplay');
    rowCountDisplay.innerHTML = `Showing receipts ${startItem} to ${endItem} out of ${totalItems} receipts`;

    // Add event listeners
    paginationContainer.querySelectorAll('.page-link').forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            const newPage = parseInt(e.target.closest('.page-link').dataset.page);
            if (!isNaN(newPage) && newPage !== currentPage) {
                fetchReceipts(newPage);
            }
        });
    });
}

// Modified event listener for view all button
document.getElementById('viewAllBtn').addEventListener('click', () => {
    const modalElement = document.getElementById('viewAllModal');
    const modal = new bootstrap.Modal(modalElement);
    modalElement.addEventListener('shown.bs.modal', function () {
        document.getElementById('allInvoiceList').classList.add('active');
        fetchReceipts(1);
    });
    modalElement.addEventListener('hidden.bs.modal', function () {
        document.getElementById('allInvoiceList').classList.remove('active');
        fetchReceipts(1); // Refresh main list
    });
    modal.show();
});

// Initial load
document.addEventListener('DOMContentLoaded', () => {
    fetchReceipts(1);
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

// Update the downloadPDF function to handle errors better
function downloadPDF(base64Data, fileName) {
    try {
        if (!base64Data) {
            throw new Error('No PDF data available');
        }

        const link = document.createElement('a');
        link.href = `data:application/pdf;base64,${base64Data}`;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } catch (error) {
        console.error('Download failed:', error);
        alert('Failed to download PDF. Please try again later.');
    }
}