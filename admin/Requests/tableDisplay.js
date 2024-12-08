// Consolidated formatting functions
function formatDate(isoString) {
  const options = { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  };
  const date = new Date(isoString);
  return date.toLocaleDateString(undefined, options);
}

function formatTime(timeString) {
  const [hour, minute] = timeString.split(':');
  const date = new Date();
  date.setHours(parseInt(hour), parseInt(minute));
  return date.toLocaleTimeString([], { 
    hour: 'numeric',
    minute: '2-digit',
    hour12: true 
  });
}

async function fetchBorrowingRequestsData() {
  const tableBody = document.getElementById('pendingRequestsTableBody');
  // Add loading spinner
  tableBody.innerHTML = `
    <tr>
      <td colspan="9" class="text-center">
        <div class="spinner-border" role="status">
          <span class="visually-hidden">Loading...</span>
        </div>
      </td>
    </tr>
  `;

  try {
    const response = await fetch('/admin/get-all-requests');
    console.log('Response Status:', response.status);
    console.log('Response Headers:', response.headers);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (data.successful && data.borrowingRequests) {
      displayTable(data.borrowingRequests, 'pendingRequestsTableBody');
    } else {
      document.getElementById('pendingRequestsTableBody').innerHTML = `<p>${data.message}</p>`;
    }
  } catch (error) {
    console.error('Error fetching borrowing requests data:', error);
    document.getElementById('pendingRequestsTableBody').innerHTML = `<p>Error fetching borrowing requests data: ${error.message}</p>`;
  }
}

// Add this function to handle batch selection
function toggleBatchSelection(batchId, initialState = null) {
  const table = document.getElementById('pendingRequestsTable');
  const rows = table.querySelectorAll('tr[data-request-id]');
  let shouldCheck;

  // If initialState is not provided, determine it based on the current state
  if (initialState === null) {
    // Check if all rows in this batch are already selected
    const batchRows = Array.from(rows).filter(row => {
      const rowBatchId = row.querySelector('.merged-cell')?.textContent.trim() ||
        row.previousElementSibling?.querySelector('.merged-cell')?.textContent.trim();
      return rowBatchId === batchId.toString();
    });

    shouldCheck = !batchRows.every(row => {
      const checkbox = row.querySelector('input[type="checkbox"]');
      return checkbox && checkbox.checked;
    });
  } else {
    shouldCheck = initialState;
  }

  // Update each row in the batch
  rows.forEach(row => {
    const rowBatchId = row.querySelector('.merged-cell')?.textContent.trim() ||
      row.previousElementSibling?.querySelector('.merged-cell')?.textContent.trim();

    if (rowBatchId === batchId.toString()) {
      const checkbox = row.querySelector('input[type="checkbox"]');
      if (checkbox) {
        checkbox.checked = shouldCheck;
        toggleRequestSelection(parseInt(row.getAttribute('data-request-id')), checkbox);
      }
    }
  });
}

function displayTable(requests, containerId) {
  const tableBody = document.getElementById(containerId);
  tableBody.innerHTML = '';

  // Sort requests by batch_id
  requests.sort((a, b) => (a.batch_id || '').toString().localeCompare((b.batch_id || '').toString()));

  // Group requests by batch_id
  let currentBatchId = null;
  let rowspanCount = 0;
  let firstRowOfBatch = null;

  requests.forEach((request, index) => {
    const row = document.createElement('tr');
    row.setAttribute('data-request-id', request.request_id);

    // Add double tap detection
    row.addEventListener('touchend', handleDoubleTap);
    row.addEventListener('dblclick', handleDoubleClick);

    // Add event listeners for long press
    row.addEventListener('mousedown', () => {
      longPressTimer = setTimeout(() => {
        if (!isSelectionMode) {
          toggleSelectionMode();
        }
      }, LONG_PRESS_DURATION);
    });

    row.addEventListener('mouseup', () => {
      clearTimeout(longPressTimer);
    });

    row.addEventListener('mouseleave', () => {
      clearTimeout(longPressTimer);
    });

    // Add click handler for the entire row when in selection mode
    row.addEventListener('click', (e) => {
      if (isSelectionMode) {
        const checkbox = row.querySelector('input[type="checkbox"]');
        if (e.target.type !== 'checkbox') { // Only toggle if we didn't click the checkbox directly
          checkbox.checked = !checkbox.checked;
          toggleRequestSelection(request.request_id, checkbox);
        }
      }
    });

    // Create all cells for the row
    const cells = [];

    // Add checkbox cell
    const checkboxCell = document.createElement('td');
    checkboxCell.className = 'checkbox-column';
    checkboxCell.style.display = 'none';
    checkboxCell.innerHTML = `
        <div class="checkbox-wrapper">
            <label class="custom-checkbox">
                <input type="checkbox" 
                    onchange="toggleRequestSelection(${request.request_id}, this)"
                    ${selectedRequests.has(request.request_id) ? 'checked' : ''}>
            </label>
        </div>
    `;
    cells.push(checkboxCell);

    // Add requisitioner cell
    const requisitionerCell = document.createElement('td');
    requisitionerCell.innerHTML = `
            <div class="d-flex px-2 py-1">
                <div class="d-flex flex-column justify-content-center">
                    <h6 class="mb-0 text-sm">${request.first_name} ${request.last_name}</h6>
                    <p class="text-xs text-secondary mb-0">${request.email}</p>
                </div>
            </div>
        `;
    cells.push(requisitionerCell);

    // Handle batch_id cell
    if (request.batch_id !== currentBatchId) {
      const batchCell = document.createElement('td');
      batchCell.className = "merged-cell align-middle text-center align-items-center";
      batchCell.style.cursor = 'pointer'; // Add pointer cursor
      batchCell.innerHTML = `<p class="text-xs font-weight-bold mb-0">${request.batch_id}</p>`;

      // Add click handler for batch selection
      batchCell.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent row click handler from firing
        if (isSelectionMode) {
          const actualBatchId = request.batch_id;
          console.log('Batch cell clicked:', actualBatchId); // Debug log
          toggleBatchSelection(actualBatchId);
        }
      });

      if (firstRowOfBatch && rowspanCount > 1) {
        // Set rowspan for previous batch
        firstRowOfBatch.querySelector('td:nth-child(3)').rowSpan = rowspanCount;
      }

      currentBatchId = request.batch_id;
      rowspanCount = 1;
      firstRowOfBatch = row;
      cells.push(batchCell);
    } else {
      rowspanCount++;
    }

    // Add remaining cells
    const remainingCells = `
            <td>
                <p class="text-xs font-weight-bold mb-0">${request.equipment_category_id}</p>
                <p class="text-xs text-secondary mb-0">${request.category_name}</p>
            </td>
            <td class="align-middle align-items-center text-center">
                <p class="text-xs font-weight-bold mb-0">${request.quantity_requested}</p>
            </td>
            <td class="align-middle text-center text-sm">
                <span class="badge badge-sm bg-gradient-secondary">${request.status}</span>
            </td>
            <td>
                <p class="text-xs font-weight-bold mb-0">${formatDate(request.requested)}</p>
            </td>
            <td>
                <p class="text-xs font-weight-bold mb-0">${formatTime(request.time_requested)}</p>
            </td>
            <td>
                <p class="text-xs font-weight-bold mb-0">${formatTime(request.return_time)}</p>
            </td>
            <td class="align-middle">
                <a id="approveButton-${index}" href="javascript:;" class="badge badge-sm bg-gradient-success text-xs mb-1" data-toggle="tooltip" data-original-title="Approve" onclick="approveRequest(${request.request_id})">Approve</a>
                <a id="cancelButton-${index}" href="javascript:;" class="badge badge-sm bg-gradient-danger text-xs" data-toggle="tooltip" data-original-title="Cancel" onclick="rejectRequest(${request.request_id})">Cancel</a>
            </td>
        `;

    // Add remaining cells to row
    cells.forEach(cell => row.appendChild(cell));
    row.insertAdjacentHTML('beforeend', remainingCells);
    tableBody.appendChild(row);

    // Add event listeners for buttons
    document.getElementById(`approveButton-${index}`).addEventListener('click', function (e) {
      e.stopPropagation();
      console.log(`Approve button clicked for request ${request.request_id}`);
    });

    document.getElementById(`cancelButton-${index}`).addEventListener('click', function (e) {
      e.stopPropagation();
      console.log(`Cancel button clicked for request ${request.request_id}`);
    });
  });

  // Handle rowspan for the last batch
  if (firstRowOfBatch && rowspanCount > 1) {
    firstRowOfBatch.querySelector('td:nth-child(3)').rowSpan = rowspanCount;
  }

  // Add checkbox to header if needed
  const headerRow = document.querySelector('#pendingRequestsTable thead tr');
  if (!headerRow.querySelector('.checkbox-column')) {
    const checkboxHeader = document.createElement('th');
    checkboxHeader.className = 'checkbox-column text-uppercase text-secondary text-xxs font-weight-bolder opacity-7';
    checkboxHeader.style.display = 'none';
    checkboxHeader.innerHTML = `
        <div class="checkbox-header">
            <button id="selectAllBtn" class="select-all-btn" onclick="toggleAllRequests()">
                <i class="fas fa-check-square me-2"></i>
                Select All
            </button>
        </div>
    `;
    headerRow.insertBefore(checkboxHeader, headerRow.firstChild);
  }

  // Add hover effect after table is populated
  const table = document.getElementById(containerId);
  addBatchHoverEffect(table);
}

// First add this CSS to your stylesheet or <style> tag
const style = document.createElement('style');
style.textContent = `
.merged-cell {
    border: 1px solid rgba(0,0,0,0.05);
    background: linear-gradient(310deg, #ffffff 0%, #f8f9fa 100%);
    box-shadow: 0 0 2px 0 rgba(0,0,0,0.05);
    transition: all 0.3s ease;
    cursor: pointer;
    user-select: none;
    position: relative;
    z-index: 2; /* Add this to keep merged cell above highlighted rows */
}

.merged-cell:hover {
    box-shadow: 0 0 15px rgba(33, 150, 243, 0.3);
    background: rgba(33, 150, 243, 0.05);
    transform: translateY(-1px);
}

.merged-cell:active {
    transform: translateY(0);
}

.merged-cell p {
    margin: 0;
    position: relative;
    top: 50%;
    transform: translateY(-50%);
    transition: all 0.3s ease;
}

.merged-cell:hover p {
    color: #2196F3;
}

/* Updated batch highlight styles */
.batch-highlight {
    position: relative;
    background: rgba(33, 150, 243, 0.05);
    transition: all 0.3s ease;
}

.batch-highlight td {
    border-color: rgba(33, 150, 243, 0.2);
}

/* Add a subtle left border to indicate batch grouping */
tr.batch-highlight td:first-child {
    border-left: 2px solid rgba(33, 150, 243, 0.3);
}

/* Add a subtle right border to indicate batch grouping */
tr.batch-highlight td:last-child {
    border-right: 2px solid rgba(33, 150, 243, 0.3);
}

/* Special styling for first row in batch */
tr.batch-highlight:first-child td {
    border-top: 2px solid rgba(33, 150, 243, 0.3);
}

/* Special styling for last row in batch */
tr.batch-highlight:last-child td {
    border-bottom: 2px solid rgba(33, 150, 243, 0.3);
}

/* Custom checkbox styling */
.checkbox-wrapper {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 0 8px;
}

.custom-checkbox {
    position: relative;
    display: inline-block;
}

.custom-checkbox input[type="checkbox"] {
    appearance: none;
    -webkit-appearance: none;
    width: 18px;
    height: 18px;
    border: 2px solid #2196F3;
    border-radius: 4px;
    outline: none;
    cursor: pointer;
    transition: all 0.3s ease;
    position: relative;
    background: white;
}

.custom-checkbox input[type="checkbox"]:checked {
    background-color: #2196F3;
    border-color: #2196F3;
}

.custom-checkbox input[type="checkbox"]:checked::before {
    content: '✓';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    color: white;
    font-size: 12px;
    font-weight: bold;
}

.custom-checkbox input[type="checkbox"]:hover {
    border-color: #1976D2;
    box-shadow: 0 0 5px rgba(33, 150, 243, 0.3);
}

.checkbox-label {
    font-size: 0.75rem;
    color: #666;
    user-select: none;
    cursor: pointer;
}

/* Header checkbox styling */
.checkbox-header {
    display: flex;
    align-items: center;
    padding: 8px;
    background: rgba(33, 150, 243, 0.05);
    border-radius: 4px;
    margin: 4px;
}

.checkbox-header .custom-checkbox {
    margin-right: 8px;
}

.checkbox-header .checkbox-label {
    font-weight: 600;
    color: #444;
}

/* Enhanced Select All Header Styling */
.checkbox-column.text-uppercase {
    min-width: 100px;
    vertical-align: middle;
    padding: 12px 8px !important;
}

.checkbox-header {
    display: flex;
    align-items: center;
    padding: 8px;
    border-radius: 6px;
    background: rgba(33, 150, 243, 0.05);
    transition: all 0.3s ease;
    margin: 0;
    gap: 8px;
}

.checkbox-header:hover {
    background: rgba(33, 150, 243, 0.1);
}

.checkbox-header .custom-checkbox {
    margin: 0;
}

.checkbox-header .checkbox-label {
    font-size: 0.75rem;
    font-weight: 600;
    color: #344767;
    white-space: nowrap;
    letter-spacing: 0.02em;
    opacity: 0.8;
    transition: opacity 0.3s ease;
}

.checkbox-header:hover .checkbox-label {
    opacity: 1;
}

/* Improved checkbox styling */
.custom-checkbox input[type="checkbox"] {
    width: 16px;
    height: 16px;
    border: 2px solid rgba(33, 150, 243, 0.6);
    border-radius: 4px;
    position: relative;
    margin: 0;
    padding: 0;
    cursor: pointer;
    transition: all 0.2s ease;
}

.custom-checkbox input[type="checkbox"]:checked {
    background-color: #2196F3;
    border-color: #2196F3;
}

.custom-checkbox input[type="checkbox"]:checked::before {
    content: '✓';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    color: white;
    font-size: 11px;
    font-weight: bold;
}

.custom-checkbox input[type="checkbox"]:hover {
    border-color: #2196F3;
    box-shadow: 0 0 0 3px rgba(33, 150, 243, 0.1);
}

/* Adjust the table header to accommodate the select all button */
#pendingRequestsTable thead th:first-child {
    padding-left: 8px;
    padding-right: 8px;
}

/* Add these styles to your existing style block */
.select-all-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 8px 16px;
    background: #2196F3;
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 0.75rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    width: 100%;
    text-transform: none;
}

.select-all-btn:hover {
    background: #1976D2;
    transform: translateY(-1px);
    box-shadow: 0 2px 5px rgba(0,0,0,0.2);
}

.select-all-btn:active {
    transform: translateY(0);
}

.select-all-btn i {
    font-size: 0.875rem;
}

.checkbox-header {
    padding: 4px;
}

/* Batch action controls - consolidated styles */
.batch-actions {
    display: none;
    background: #f8f9fa;
    border: 1px solid rgba(0,0,0,0.05);
    border-radius: 8px;
    padding: 6px 8px;
    margin: 8px 0;
    min-height: 44px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}

.batch-actions.active {
    display: flex;
    align-items: center;
    animation: fadeIn 0.3s ease;
}

.batch-actions > div {
    display: flex;
    align-items: center;
    gap: 4px;
    width: 100%;
}

.batch-actions .button-group {
    display: flex;
    gap: 4px;
    margin-left: 4px;
}

.selection-count {
    font-size: 0.8125rem;
    font-weight: 600;
    color: #344767;
    padding: 6px 10px;
    background: white;
    border-radius: 4px;
    border: 1px solid rgba(0,0,0,0.08);
    height: 32px;
    display: inline-flex;
    align-items: center;
    margin-right: 4px;
    white-space: nowrap;
}

.batch-action-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    padding: 6px 12px;
    border-radius: 4px;
    font-weight: 600;
    font-size: 0.8125rem;
    height: 32px;
    border: none;
    color: white;
    cursor: pointer;
    transition: all 0.2s ease;
    white-space: nowrap;
}

/* Approve button */
.batch-action-btn.btn-success {
    background: linear-gradient(310deg, #2dce89 0%, #26a69a 100%);
    border: none;
}

.batch-action-btn.btn-success:hover:not(:disabled) {
    background: linear-gradient(310deg, #26a69a 0%, #2dce89 100%);
    box-shadow: 0 4px 10px rgba(45, 206, 137, 0.3);
    transform: translateY(-1px);
}

/* Cancel button */
.batch-action-btn.btn-danger {
    background: linear-gradient(310deg, #f5365c 0%, #f56036 100%);
    border: none;
}

.batch-action-btn.btn-danger:hover:not(:disabled) {
    background: linear-gradient(310deg, #f56036 0%, #f5365c 100%);
    box-shadow: 0 4px 10px rgba(245, 54, 92, 0.3);
    transform: translateY(-1px);
}

/* Exit selection mode button */
.batch-action-btn.btn-secondary {
    background: linear-gradient(310deg, #627594 0%, #8498b9 100%);
    border: none;
}

.batch-action-btn.btn-secondary:hover {
    background: linear-gradient(310deg, #8498b9 0%, #627594 100%);
    box-shadow: 0 4px 10px rgba(98, 117, 148, 0.3);
    transform: translateY(-1px);
}

/* Active state for all buttons */
.batch-action-btn:active:not(:disabled) {
    transform: translateY(0);
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

/* Container for batch actions */
.batch-actions {
    display: none;
    gap: 12px;
    padding: 16px;
    background: white;
    border-radius: 12px;
    box-shadow: 0 4px 6px rgba(0,0,0,0.05);
    margin: 16px 0;
    align-items: center;
    justify-content: center;
    flex-wrap: wrap;
}

/* Container for batch actions - updated for better cohesion */
.batch-actions {
    display: none;
    gap: 4px; /* Reduced gap between buttons */
    padding: 8px 12px; /* Slightly reduced padding */
    background: #f8f9fa; /* Light gray background */
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.05);
    margin: 8px 0;
    align-items: center;
    justify-content: flex-start; /* Align to start instead of center */
    flex-wrap: nowrap; /* Prevent wrapping */
    min-height: 48px;
    border: 1px solid rgba(0,0,0,0.05); /* Subtle border */
}

/* Selection count style update */
.selection-count {
    font-size: 0.8125rem;
    font-weight: 600;
    color: #344767;
    padding: 6px 12px;
    background: white; /* White background for contrast */
    border-radius: 4px;
    margin-right: 8px; /* Reduced margin */
    height: 32px;
    display: inline-flex;
    align-items: center;
    border: 1px solid rgba(0,0,0,0.08); /* Subtle border */
}

/* Update batch action buttons */
.batch-action-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 4px; /* Reduced gap between icon and text */
    padding: 6px 12px;
    border-radius: 4px;
    font-weight: 600;
    font-size: 0.8125rem;
    transition: all 0.2s ease;
    box-shadow: 0 1px 2px rgba(0,0,0,0.1);
    min-width: auto; /* Remove fixed width */
    margin: 0 2px; /* Minimal margin between buttons */
    height: 32px;
}

/* Update buttons container when in selection mode */
.batch-actions.active {
    background: linear-gradient(to right, #f8f9fa, #ffffff);
    animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
    from { opacity: 0; transform: translateY(-5px); }
    to { opacity: 1; transform: translateY(0); }
}

.selection-count {
    font-size: 0.875rem;
    font-weight: 600;
    color: #344767;
    padding: 8px 16px;
    background: #f8f9fa;
    border-radius: 6px;
    margin-right: 16px;
}
`;
document.head.appendChild(style);

// Call the function to fetch and display data
fetchBorrowingRequestsData();


// Add these variables at the top of the file
let selectedRequests = new Set();
let isSelectionMode = false;
let longPressTimer;
const LONG_PRESS_DURATION = 500; // milliseconds
let lastTapTime = 0;
const DOUBLE_TAP_DELAY = 300; // milliseconds

// Add these functions after your existing imports
function toggleSelectionMode() {
  if (isSelectionMode) {
    // Show confirmation if there are selected items
    if (selectedRequests.size > 0) {
      Swal.fire({
        title: 'Cancel Selection?',
        text: "You'll lose your current selection.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Yes, cancel selection'
      }).then((result) => {
        if (result.isConfirmed) {
          exitSelectionMode();
        }
      });
    } else {
      exitSelectionMode();
    }
  } else {
    // Enter selection mode with notification
    enterSelectionMode();
  }
}

function enterSelectionMode() {
  isSelectionMode = true;
  const table = document.getElementById('pendingRequestsTable');
  const actionColumn = table.querySelectorAll('th:last-child, td:last-child');
  const checkboxColumn = table.querySelectorAll('.checkbox-column');
  const batchActions = document.getElementById('batchActions');

  // Animate the transition
  actionColumn.forEach(cell => {
    cell.style.transition = 'opacity 0.3s';
    cell.style.opacity = '0';
    setTimeout(() => { cell.style.display = 'none'; }, 300);
  });

  checkboxColumn.forEach(cell => {
    cell.style.display = '';
    cell.style.opacity = '0';
    setTimeout(() => {
      cell.style.transition = 'opacity 0.3s';
      cell.style.opacity = '1';
    }, 50);
  });

  batchActions.style.display = 'flex';
  batchActions.style.opacity = '0';
  setTimeout(() => {
    batchActions.style.transition = 'opacity 0.3s';
    batchActions.style.opacity = '1';
  }, 50);

  // Updated toast notification with more complete instructions
  Swal.fire({
    toast: true,
    position: 'bottom-start',
    icon: 'info',
    title: 'Batch Selection Mode',
    html: `
      <div style="text-align: left; font-size: 0.9em;">
        <p style="margin-bottom: 8px;">You can:</p>
        <ul style="padding-left: 20px;">
          <li>Click rows to select items</li>
          <li>Click batch numbers to select entire batches</li>
          <li>Use "Select All" to select everything</li>
        </ul>
      </div>
    `,
    showConfirmButton: false,
    timer: 5000,
    timerProgressBar: true
  });

  updateBatchActionsHTML();
}

function exitSelectionMode() {
  isSelectionMode = false;
  const table = document.getElementById('pendingRequestsTable');
  const actionColumn = table.querySelectorAll('th:last-child, td:last-child');
  const checkboxColumn = table.querySelectorAll('.checkbox-column');
  const batchActions = document.getElementById('batchActions');

  // Remove highlighting from all rows
  const allRows = table.querySelectorAll('tr');
  allRows.forEach(row => {
    row.classList.remove('table-active');
  });

  // Hide floating counter

  // Animate the transition
  actionColumn.forEach(cell => {
    cell.style.display = '';
    cell.style.opacity = '0';
    setTimeout(() => {
      cell.style.transition = 'opacity 0.3s';
      cell.style.opacity = '1';
    }, 50);
  });

  checkboxColumn.forEach(cell => {
    cell.style.transition = 'opacity 0.3s';
    cell.style.opacity = '0';
    setTimeout(() => { cell.style.display = 'none'; }, 300);
  });

  batchActions.style.transition = 'opacity 0.3s';
  batchActions.style.opacity = '0';
  setTimeout(() => { batchActions.style.display = 'none'; }, 300);

  // Clear selected requests and update UI
  selectedRequests.clear();
  updateBatchActionButtons();

  // Update all checkboxes
  const allCheckboxes = document.querySelectorAll('#pendingRequestsTable input[type="checkbox"]');
  allCheckboxes.forEach(checkbox => {
    checkbox.checked = false;
    // Also remove highlighting from parent row
    const row = checkbox.closest('tr');
    if (row) {
      row.classList.remove('table-active');
    }
  });

  // Ensure floating counter is removed

}

// Update processBatchRequests function
async function processBatchRequests(action) {
  if (selectedRequests.size === 0) return;

  // Show confirmation dialog
  const result = await Swal.fire({
    title: `${action === 'approved' ? 'Approve' : 'Cancel'} Selected Requests?`,
    text: `You are about to ${action === 'approved' ? 'approve' : 'cancel'} ${selectedRequests.size} request(s).`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: action === 'approved' ? '#28a745' : '#dc3545',
    cancelButtonColor: '#6c757d',
    confirmButtonText: `Yes, ${action === 'approved' ? 'approve' : 'cancel'} them!`
  });

  if (!result.isConfirmed) return;

  try {
    // Show loading state
    Swal.fire({
      title: 'Processing...',
      text: `${action === 'approved' ? 'Approving' : 'Cancelling'} ${selectedRequests.size} request(s)`,
      allowOutsideClick: false,
      allowEscapeKey: false,
      showConfirmButton: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    const response = await fetch('/admin/update-batch-status', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        request_ids: Array.from(selectedRequests),
        status: action
      }),
      credentials: 'include'
    });

    const data = await response.json();

    // Check for successful response in data instead of response.ok
    if (data.successful || data.message === 'Batch request status updated successfully') {
      // Show success message
      await Swal.fire({
        icon: 'success',
        title: 'Success!',
        text: `Successfully ${action === 'approved' ? 'approved' : 'cancelled'} ${selectedRequests.size} request(s)`,
        timer: 2000,
        showConfirmButton: false
      });

      exitSelectionMode();
      await Promise.all([
        fetchBorrowingRequestsData(),
        fetchApprovedRequestsData()
      ]);
    } else {
      throw new Error(data.message || 'Operation failed');
    }
  } catch (error) {
    console.error('Error processing batch requests:', error);
    await Swal.fire({
      icon: 'error',
      title: 'Error!',
      text: error.message || 'Failed to process requests',
    });
  }
}

// Update toggleRequestSelection function
function toggleRequestSelection(requestId, checkbox) {
  if (checkbox.checked) {
    selectedRequests.add(requestId);
    // Add subtle highlight to selected row
    checkbox.closest('tr').classList.add('table-active');
  } else {
    selectedRequests.delete(requestId);
    checkbox.closest('tr').classList.remove('table-active');
  }
  updateBatchActionButtons();

}

// Add floating counter functions


function updateBatchActionButtons() {
  const count = selectedRequests.size;
  const batchApproveBtn = document.getElementById('batchApproveBtn');
  const batchCancelBtn = document.getElementById('batchCancelBtn');
  const selectionCount = document.getElementById('selectionCount');

  if (batchApproveBtn && batchCancelBtn && selectionCount) {
    batchApproveBtn.disabled = count === 0;
    batchCancelBtn.disabled = count === 0;
    selectionCount.textContent = `${count} selected`;
  }
}

// Update the toggleAllRequests function to work without checkbox
function toggleAllRequests() {
  const selectAllBtn = document.getElementById('selectAllBtn');
  const allCheckboxes = document.querySelectorAll('#pendingRequestsTableBody .checkbox-column input[type="checkbox"]');
  
  // Determine if we should check or uncheck based on if any are currently unchecked
  const hasUnchecked = Array.from(allCheckboxes).some(box => !box.checked);
  const isChecked = hasUnchecked; // If there are unchecked boxes, we want to check all

  allCheckboxes.forEach(box => {
      box.checked = isChecked;
      const row = box.closest('tr');
      const requestId = parseInt(row.getAttribute('data-request-id'));
      
      if (isChecked) {
          selectedRequests.add(requestId);
          row.classList.add('table-active');
      } else {
          selectedRequests.delete(requestId);
          row.classList.remove('table-active');
      }
  });

  // Update button text based on state
  selectAllBtn.innerHTML = isChecked ? 
      '<i class="fas fa-times-square me-2"></i>Deselect All' : 
      '<i class="fas fa-check-square me-2"></i>Select All';

  updateBatchActionButtons();
  
}

// Update toggleBatchSelection function to remove floating counter references
function toggleBatchSelection(batchId) {
    if (!isSelectionMode) return;

    const table = document.getElementById('pendingRequestsTable');
    if (!table) {
        console.error('Table not found');
        return;
    }

    try {
        console.log(`Toggling batch ${batchId}`); // Debug log

        // Find all rows belonging to the batch
        const batchRows = getBatchRows(table, batchId);
        
        if (batchRows.length === 0) {
            console.warn(`No rows found for batch ID ${batchId}`);
            return;
        }

        // Determine if we should check or uncheck based on current state
        const shouldCheck = !areAllRowsSelected(batchRows);
        console.log(`Setting all rows to ${shouldCheck ? 'checked' : 'unchecked'}`); // Debug log

        // Update each row in the batch
        batchRows.forEach(row => {
            const checkbox = row.querySelector('input[type="checkbox"]');
            if (checkbox) {
                checkbox.checked = shouldCheck;
                const requestId = parseInt(row.getAttribute('data-request-id'));
                if (!isNaN(requestId)) {
                    if (shouldCheck) {
                        selectedRequests.add(requestId);
                        row.classList.add('table-active');
                    } else {
                        selectedRequests.delete(requestId);
                        row.classList.remove('table-active');
                    }
                }
            }
        });

        // Update UI
        updateBatchActionButtons();

    } catch (error) {
        console.error('Error in toggleBatchSelection:', error);
    }
}

// Helper function to get all rows belonging to a batch
function getBatchRows(table, batchId) {
    const rows = Array.from(table.querySelectorAll('tr[data-request-id]'));
    let currentBatchRows = [];
    let foundBatch = false;

    for (const row of rows) {
        const batchCell = row.querySelector('.merged-cell');
        if (batchCell) {
            // Found a new batch header
            if (batchCell.textContent.trim() === batchId.toString()) {
                foundBatch = true;
                currentBatchRows.push(row);
            } else {
                if (foundBatch) break; // Stop if we've moved to a new batch
            }
        } else if (foundBatch) {
            // This row belongs to the current batch
            currentBatchRows.push(row);
        }
    }

    console.log(`Found ${currentBatchRows.length} rows for batch ${batchId}`); // Debug log
    return currentBatchRows;
}

// Helper function to check if all rows in a batch are selected
function areAllRowsSelected(rows) {
    return rows.every(row => {
        const checkbox = row.querySelector('input[type="checkbox"]');
        return checkbox && checkbox.checked;
    });
}

// Add visual feedback for batch hover
function addBatchHoverEffect(table) {
    let currentHighlightedRows = [];

    table.addEventListener('mouseover', (e) => {
        const batchCell = e.target.closest('.merged-cell');
        if (batchCell && isSelectionMode) {
            // Remove previous highlights
            currentHighlightedRows.forEach(row => row.classList.remove('batch-highlight'));
            
            const batchId = batchCell.textContent.trim();
            const batchRows = getBatchRows(table, batchId);
            batchRows.forEach(row => row.classList.add('batch-highlight'));
            currentHighlightedRows = batchRows;
        }
    });

    table.addEventListener('mouseout', (e) => {
        if (!e.target.closest('.merged-cell')) {
            currentHighlightedRows.forEach(row => row.classList.remove('batch-highlight'));
            currentHighlightedRows = [];
        }
    });

    // Clean up highlights when leaving the table
    table.addEventListener('mouseleave', () => {
        currentHighlightedRows.forEach(row => row.classList.remove('batch-highlight'));
        currentHighlightedRows = [];
    });
}

// Add hover effect for checkbox cells
function addCheckboxHoverEffect() {
    const table = document.getElementById('pendingRequestsTable');
    
    table.addEventListener('mouseover', (e) => {
        const checkboxWrapper = e.target.closest('.checkbox-wrapper');
        if (checkboxWrapper) {
            checkboxWrapper.style.transform = 'scale(1.05)';
        }
    });

    table.addEventListener('mouseout', (e) => {
        const checkboxWrapper = e.target.closest('.checkbox-wrapper');
        if (checkboxWrapper) {
            checkboxWrapper.style.transform = 'scale(1)';
        }
    });
}

// Call this function after table is populated
document.addEventListener('DOMContentLoaded', () => {
    addCheckboxHoverEffect();
});

// Update the HTML structure for the batch action buttons
// This can be done by updating the innerHTML of your batchActions container
function updateBatchActionsHTML() {
  const batchActions = document.getElementById('batchActions');
  if (batchActions) {
    batchActions.className = 'batch-actions active';
    batchActions.innerHTML = `
      <div>
        <span id="selectionCount" class="selection-count">0 selected</span>
        <div class="button-group">
          <button id="batchApproveBtn" class="batch-action-btn btn-success" onclick="processBatchRequests('approved')" disabled>
            <i class="fas fa-check-circle"></i>
            Approve
          </button>
          <button id="batchCancelBtn" class="batch-action-btn btn-danger" onclick="processBatchRequests('cancelled')" disabled>
            <i class="fas fa-times-circle"></i>
            Cancel
          </button>
          <button class="batch-action-btn btn-secondary" onclick="toggleSelectionMode()">
            <i class="fas fa-arrow-left"></i>
            Exit
          </button>
        </div>
      </div>
    `;
  }
}

function handleDoubleTap(event) {
  const currentTime = new Date().getTime();
  const tapLength = currentTime - lastTapTime;

  if (tapLength < DOUBLE_TAP_DELAY && tapLength > 0) {
    event.preventDefault();
    if (!isSelectionMode) {
      toggleSelectionMode();
    }
  }

  lastTapTime = currentTime;
}

function handleDoubleClick(event) {
  if (!isSelectionMode) {
    event.preventDefault();
    toggleSelectionMode();
  }
}
