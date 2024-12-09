const TIME_STATUS_STYLES = {
  OVERDUE: {
    backgroundColor: 'rgba(220, 53, 69, 0.15)',  // Increased from 0.1 to 0.15
    cursor: 'pointer'
  },
  DUE_30: {
    backgroundColor: 'rgba(255, 193, 7, 0.15)',  // Increased from 0.1 to 0.15
    cursor: 'pointer'
  },
  DUE_60: {
    backgroundColor: 'rgba(23, 162, 184, 0.15)', // Increased from 0.1 to 0.15
    cursor: 'pointer'
  }
};

// Add this helper function at the top
function isOverdue(request) {
  // Parse the date and time
  const requestDate = new Date(request.requested);
  const returnTime = request.return_time.split(':');
  const returnDate = new Date(requestDate);
  returnDate.setHours(returnTime[0], returnTime[1], 0);

  // Get current date/time
  const now = new Date();

  return now > returnDate;
}

function getRowStyle(request) {
  // Only apply styles for ongoing requests
  if (request.status !== 'ongoing') {
    return {};
  }

  // Convert backend minutes into more usable format
  const returnDate = new Date(request.requested);
  const returnTime = request.return_time.split(':');
  returnDate.setHours(returnTime[0], returnTime[1], 0);
  
  const now = new Date();
  const diffMinutes = (returnDate - now) / (1000 * 60);

  if (isOverdue(request)) {
    return TIME_STATUS_STYLES.OVERDUE;
  } else if (diffMinutes <= 30) {
    return TIME_STATUS_STYLES.DUE_30;
  } else if (diffMinutes <= 60) {
    return TIME_STATUS_STYLES.DUE_60;
  }
  return {};
}

function showPenaltyDetails(request) {
  // Calculate time-related values
  const returnDate = new Date(request.requested);
  const returnTime = request.return_time.split(':');
  returnDate.setHours(returnTime[0], returnTime[1], 0);
  
  const now = new Date();
  const diffMinutes = Math.abs(now - returnDate) / (1000 * 60);
  const isLate = isOverdue(request);
  
  const completedHours = Math.floor(diffMinutes / 60);
  const remainingMinutes = Math.floor(diffMinutes % 60);
  const penalty = isLate ? completedHours * 100 : 0;

  const customStyles = `
    <style>
      .status-card {
        background: #fff;
        border-radius: 12px;
        padding: 1.5rem;
        box-shadow: 0 2px 12px rgba(0,0,0,0.08);
      }

      .status-header {
        padding: 1.5rem;
        border-radius: 12px;
        margin-bottom: 1.5rem;
        text-align: center;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 1rem;
      }

      .status-title {
        font-size: 1rem;
        font-weight: 600;
        letter-spacing: 0.5px;
        margin: 0;
      }

      .info-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 1rem;
      }

      .info-item {
        padding: 1rem;
        background: #f8f9fa;
        border-radius: 8px;
      }

      .info-label {
        font-size: 0.75rem;
        color: #6c757d;
        margin-bottom: 0.25rem;
      }

      .info-value {
        font-size: 1rem;
        font-weight: 600;
        color: #344767;
      }

      .penalty-section {
        margin-top: 1.5rem;
        text-align: center;
        padding: 1rem;
        background: #f8f9fa;
        border-radius: 8px;
      }

      .penalty-label {
        font-size: 0.875rem;
        color: #6c757d;
        margin-bottom: 0.5rem;
      }

      .penalty-amount {
        font-size: 2.5rem;
        font-weight: 700;
        color: #dc3545;
        margin: 0.5rem 0;
      }

      .penalty-note {
        font-size: 0.75rem;
        color: #6c757d;
      }

      .close-btn {
        background: #344767;
        color: white;
        border: none;
        padding: 0.5rem 1.5rem;
        border-radius: 6px;
        font-weight: 500;
        margin-top: 1rem;
      }

      .close-btn:hover {
        background: #273553;
      }

      .status-indicator {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 1rem;
        background: rgba(255, 255, 255, 0.9);
        padding: 0.75rem 1.5rem;
        border-radius: 8px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.05);
      }

      .pulse-circle {
        position: relative;
        width: 12px;
        height: 12px;
      }

      .pulse-dot {
        position: absolute;
        width: 100%;
        height: 100%;
        background: currentColor;
        border-radius: 50%;
      }

      .pulse-ring {
        position: absolute;
        width: 100%;
        height: 100%;
        border-radius: 50%;
        animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
      }

      @keyframes pulse {
        0% {
          transform: scale(1);
          opacity: 0.8;
        }
        50% {
          transform: scale(2);
          opacity: 0;
        }
        100% {
          transform: scale(1);
          opacity: 0;
        }
      }

      .status-text {
        font-size: 0.875rem;
        font-weight: 600;
        letter-spacing: 0.5px;
        text-transform: uppercase;
      }
    </style>
  `;

  // Status specific styles
  let statusColor = isLate ? '#dc3545' : 
                   diffMinutes <= 30 ? '#ffc107' : 
                   diffMinutes <= 60 ? '#17a2b8' : '#28a745';

  let statusText = isLate ? 'OVERDUE' :
                  diffMinutes <= 30 ? 'DUE VERY SOON' :
                  diffMinutes <= 60 ? 'DUE SOON' : 'ON TIME';

  Swal.fire({
    title: 'Request Status',
    html: `
      ${customStyles}
      <div class="status-card">
        <div class="status-header" style="background: ${statusColor}15">
          <div class="status-indicator" style="color: ${statusColor}">
            <div class="pulse-circle">
              <div class="pulse-dot"></div>
              <div class="pulse-ring" style="background: ${statusColor}"></div>
            </div>
            <div class="status-text">${statusText}</div>
          </div>
        </div>
        
        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">Equipment</div>
            <div class="info-value">${request.category_name}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Requisitioner</div>
            <div class="info-value">${request.first_name} ${request.last_name}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Return Time</div>
            <div class="info-value">${formatTime(request.return_time)}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Time ${isLate ? 'Overdue' : 'Remaining'}</div>
            <div class="info-value" style="color: ${statusColor}">
              ${completedHours}h ${remainingMinutes}m
            </div>
          </div>
        </div>

        ${isLate ? `
          <div class="penalty-section">
            <div class="penalty-label">Current Penalty</div>
            <div class="penalty-amount" id="penaltyCounter">₱0</div>
            <div class="penalty-note">Based on ₱100/hour rate</div>
          </div>
        ` : ''}
      </div>
    `,
    showConfirmButton: true,
    confirmButtonText: 'Close',
    customClass: {
      confirmButton: 'close-btn'
    },
    buttonsStyling: false,
    didOpen: () => {
      if (isLate && penalty > 0) {
        const counter = document.getElementById('penaltyCounter');
        let startTime = null;
        const duration = 6000; // 6 seconds
        const startValue = 0;
        const endValue = penalty;
        
        function animate(currentTime) {
          if (!startTime) startTime = currentTime;
          const elapsedTime = currentTime - startTime;
          const progress = Math.min(elapsedTime / duration, 1);
          
          // Easing function for smoother animation
          const easeOut = t => 1 - Math.pow(1 - t, 3);
          const easedProgress = easeOut(progress);
          
          const currentValue = Math.round(startValue + (endValue - startValue) * easedProgress);
          counter.textContent = `₱${currentValue.toLocaleString()}`;
          
          if (progress < 1) {
            requestAnimationFrame(animate);
          }
        }
        
        requestAnimationFrame(animate);
      }
    }
  });
}

async function fetchApprovedRequestsData() {
    const tableBody = document.getElementById('approvedRequestsTableBody');
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
      const response = await fetch('/admin/get-active-requests');
      console.log('Response Status:', response.status);
      console.log('Response Headers:', response.headers);
  
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
  
      const data = await response.json();
      console.log('Fetched Data:', data); // Log the fetched data
  
      if (data.successful && data.history && data.history.length > 0) {
        displayApprovedRequestsTable(data.history, 'approvedRequestsTableBody');
      } else {
        document.getElementById('approvedRequestsTableBody').innerHTML = `<p class="text-center text-muted">Waiting for approved requests...</p>`;
      }
    } catch (error) {
      console.error('Error fetching approved requests data:', error);
      document.getElementById('approvedRequestsTableBody').innerHTML = `<p class="text-center text-muted">Waiting for approved requests...</p>`;
    }
  }
  
  async function processReleaseRequest(requestId) {
    const customStyles = `
      <style>
        .mcl-input-container {
          background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
          border: 2px solid #2E7D32;
          border-radius: 12px;
          padding: 16px 24px;
          box-shadow: 0 2px 8px rgba(46, 125, 50, 0.1);
          transition: all 0.2s ease;
        }
  
        .mcl-input-container:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(46, 125, 50, 0.15);
        }
  
        .mcl-input {
          width: 60px;
          height: 60px;
          font-size: 24px;
          font-weight: 600;
          text-align: center;
          border: 2px solid #d2d6da;
          border-radius: 8px;
          transition: all 0.2s ease;
          background: white;
          color: #344767;
        }
  
        .mcl-input:focus {
          border-color: #2E7D32;
          box-shadow: 0 0 0 0.2rem rgba(46, 125, 50, 0.25);
          outline: none;
        }
  
        .custom-btn {
          padding: 8px 16px;
          font-weight: 500;
          border: none;
          border-radius: 6px;
          transition: all 0.2s ease;
          font-size: 0.875rem;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          min-width: 100px;
          margin: 0 6px;
        }
  
        .btn-release {
          background: #17c1e8;
          color: white;
          box-shadow: 0 2px 6px rgba(23, 193, 232, 0.3);
        }
  
        .btn-release:hover {
          background: #0ea5c9;
          box-shadow: 0 4px 12px rgba(23, 193, 232, 0.4);
          transform: translateY(-1px);
        }
  
        .btn-cancel {
          background: #dc3545;
          color: white;
          box-shadow: 0 2px 6px rgba(220, 53, 69, 0.3);
        }
  
        .btn-cancel:hover {
          background: #c82333;
          box-shadow: 0 4px 12px rgba(220, 53, 69, 0.4);
          transform: translateY(-1px);
        }
  
        .button-container {
          display: flex;
          justify-content: flex-end;
          gap: 8px;
          margin-top: 20px;
          padding: 0 4px;
        }
  
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-6px); }
          to { opacity: 1; transform: translateY(0); }
        }
  
        .fade-in {
          animation: fadeIn 0.2s ease-out forwards;
        }
  
        .swal2-actions {
          margin-top: 1.5rem !important;
        }
  
        .mcl-label {
          color: #2E7D32;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 12px;
          text-align: center;
        }
      </style>
    `;
  
    const { value: formValues } = await Swal.fire({
      title: 'Enter MCL Pass Number',
      html: `
        ${customStyles}
        <div class="fade-in">
          <div class="mcl-input-container mb-4">
            <div class="mcl-label">MCL Pass Assignment</div>
            <div class="d-flex justify-content-center gap-3">
              <input type="text" id="mcl1" class="mcl-input" maxlength="1" inputmode="numeric" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" data-form-type="other" data-lpignore="true">
              <input type="text" id="mcl2" class="mcl-input" maxlength="1" inputmode="numeric" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" data-form-type="other" data-lpignore="true">
            </div>
          </div>
          <p class="text-muted mt-2" style="font-size: 0.875rem;">Enter two digits (00-99)</p>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: '<i class="fas fa-check-circle me-1"></i>Release',
      cancelButtonText: '<i class="fas fa-times me-1"></i>Cancel',
      customClass: {
        confirmButton: 'custom-btn btn-release',
        cancelButton: 'custom-btn btn-cancel',
        popup: 'fade-in',
        actions: 'button-container'
      },
      buttonsStyling: false,
      showClass: {
        popup: 'fade-in'
      },
      didOpen: () => {
        const mcl1 = document.getElementById('mcl1');
        const mcl2 = document.getElementById('mcl2');
  
        // Add input event listeners
        mcl1.addEventListener('input', (e) => {
          if ( e.target.value) {
            mcl2.focus();
          }
        });
  
        // Add keydown listeners for backspace and enter
        [mcl1, mcl2].forEach(input => {
          input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              const mcl1Value = mcl1.value;
              const mcl2Value = mcl2.value;
              
              if (mcl1Value && mcl2Value) {
                Swal.clickConfirm();
              }
            }
          });
        });
  
        mcl2.addEventListener('keydown', (e) => {
          if (e.key === 'Backspace' && !e.target.value) {
            mcl1.focus();
          }
        });
  
        // Add input validation
        [mcl1, mcl2].forEach(input => {
          input.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/[^0-9]/g, '');
          });
        });
  
        // Focus first input on open
        mcl1.focus();
      },
      preConfirm: () => {
        const mcl1 = document.getElementById('mcl1').value;
        const mcl2 = document.getElementById('mcl2').value;
        
        if (!mcl1 || !mcl2) {
          Swal.showValidationMessage('Please enter both digits');
          return false;
        }
        
        return mcl1 + mcl2;
      }
    });
  
    if (formValues) {
      // Show processing alert
      Swal.fire({
        title: 'Processing Request',
        html: 'Please wait while we process the MCL pass assignment...',
        allowOutsideClick: false,
        allowEscapeKey: false,
        showConfirmButton: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });
    
      try {
        // First update MCL Pass
        const updateResponse = await fetch('/admin/update-request-details', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            request_id: requestId,
            mcl_pass_no: formValues,
            remarks: ''
          }),
          credentials: 'include'
        });
    
        if (!updateResponse.ok) throw new Error('Failed to update MCL Pass');
    
        // Then process the release
        const releaseResponse = await fetch('/admin/release', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            request_id: requestId,
            status: 'ongoing'
          }),
          credentials: 'include'
        });
    
        if (!releaseResponse.ok) throw new Error('Failed to release equipment');
    
        // Close loading alert and show success
        Swal.fire({
          title: 'Success',
          text: 'Equipment released successfully',
          icon: 'success'
        }).then(() => {
          fetchApprovedRequestsData();
        });
      } catch (error) {
        // Close loading alert and show error
        console.error('Error processing release:', error);
        Swal.fire({
          title: 'Error',
          text: 'Failed to process release',
          icon: 'error'
        });
      }
    }
  }
  
  async function processReturnRequest(requestId, currentMclPass) {
    const customStyles = `
      <style>
        .custom-btn {
          padding: 8px 16px;
          font-weight: 500;
          border: none;
          border-radius: 6px;
          transition: all 0.2s ease;
          font-size: 0.875rem;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          min-width: 100px;
          margin: 0 6px;
        }
  
        .btn-return {
          background: #f0ad4e;
          color: #000;
          box-shadow: 0 2px 6px rgba(240, 173, 78, 0.3);
        }
  
        .btn-return:hover {
          background: #ec971f;
          box-shadow: 0 4px 12px rgba(240, 173, 78, 0.4);
          transform: translateY(-1px);
        }
  
        .btn-cancel {
          background: #dc3545;
          color: #fff;
          box-shadow: 0 2px 6px rgba(220, 53, 69, 0.3);
        }
  
        .btn-cancel:hover {
          background: #c82333;
          box-shadow: 0 4px 12px rgba(220, 53, 69, 0.4);
          transform: translateY(-1px);
        }
  
        .custom-btn:active {
          transform: translateY(0);
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
  
        .mcl-pass-display {
          background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
          border: 2px solid #2E7D32;
          border-radius: 8px;
          padding: 12px 20px;
          min-width: 120px;
          box-shadow: 0 2px 8px rgba(46, 125, 50, 0.1);
          transition: all 0.2s ease;
        }
  
        .mcl-pass-display:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(46, 125, 50, 0.15);
        }
  
        .remarks-textarea {
          transition: all 0.2s ease;
          border: 1px solid #d2d6da;
          box-shadow: 0 1px 4px rgba(0,0,0,0.04);
        }
  
        .remarks-textarea:focus {
          border-color: #2E7D32;
          box-shadow: 0 2px 8px rgba(46, 125, 50, 0.1);
        }
  
        .button-container {
          display: flex;
          justify-content: flex-end;
          gap: 8px;
          margin-top: 20px;
          padding: 0 4px;
        }
  
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-6px); }
          to { opacity: 1; transform: translateY(0); }
        }
  
        .fade-in {
          animation: fadeIn 0.2s ease-out forwards;
        }
  
        .swal2-actions {
          margin-top: 1.5rem !important;
        }
      </style>
    `;
  
    try {
      // Get remarks first before showing processing alert
      const { value: remarksValue, isConfirmed } = await Swal.fire({
        title: 'Return Equipment',
        html: `
          ${customStyles}
          <div class="mb-4 fade-in">
            <div class="d-flex align-items-center justify-content-center mb-4">
              <div class="mcl-pass-display">
                <div class="text-xs text-uppercase mb-1" style="color: #2E7D32; font-weight: 600; letter-spacing: 0.5px;">
                  MCL Pass
                </div>
                <div class="text-lg font-weight-bold" style="color: #2E7D32; font-size: 20px;">
                  ${currentMclPass}
                </div>
              </div>
            </div>
            <div class="form-group">
              <label for="remarks" class="form-label text-start d-block mb-2" 
                     style="font-size: 0.875rem; color: #344767; font-weight: 600;">
                Remarks
              </label>
              <textarea 
                id="remarks" 
                class="form-control remarks-textarea" 
                rows="3"
                style="
                  padding: 0.75rem;
                  border-radius: 0.5rem;
                  font-size: 0.875rem;
                  line-height: 1.4;
                  resize: vertical;
                "
                placeholder="Enter any remarks about the returned equipment..."
              ></textarea>
            </div>
          </div>
        `,
        showCancelButton: true,
        confirmButtonText: '<i class="fas fa-undo-alt me-1"></i>Return',
        cancelButtonText: '<i class="fas fa-times me-1"></i>Cancel',
        customClass: {
          confirmButton: 'custom-btn btn-return',
          cancelButton: 'custom-btn btn-cancel',
          popup: 'fade-in',
          actions: 'button-container'
        },
        buttonsStyling: false,
        showClass: {
          popup: 'fade-in'
        },
        didOpen: () => {
          const remarksArea = document.getElementById('remarks');
          remarksArea.focus();
          
          remarksArea.addEventListener('input', () => {
            const length = remarksArea.value.length;
            const maxHeight = 200;
            const minHeight = 100;
            const heightPerChar = 0.5;
            
            const newHeight = Math.min(maxHeight, 
                                     Math.max(minHeight, 
                                            minHeight + (length * heightPerChar)));
            
            remarksArea.style.height = `${newHeight}px`;
          });
        },
        preConfirm: () => {
          return document.getElementById('remarks').value;
        }
      });
  
      if (isConfirmed) {
        // Show processing alert
        Swal.fire({
          title: 'Processing Return',
          html: 'Please wait while we process the equipment return...',
          allowOutsideClick: false,
          allowEscapeKey: false,
          showConfirmButton: false,
          didOpen: () => {
            Swal.showLoading();
          }
        });
  
        // Update remarks
        const updateResponse = await fetch('/admin/update-request-details', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            request_id: requestId,
            remarks: remarksValue // Use the captured remarks value
          }),
          credentials: 'include'
        });
  
        if (!updateResponse.ok) throw new Error('Failed to update remarks');
  
        // Process the return
        const returnResponse = await fetch('/admin/release', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            request_id: requestId,
            status: 'returned'
          }),
          credentials: 'include'
        });
  
        if (!returnResponse.ok) throw new Error('Failed to return equipment');
  
        // Show success message
        Swal.fire({
          title: 'Success',
          text: 'Equipment returned successfully',
          icon: 'success'
        }).then(() => {
          fetchApprovedRequestsData();
        });
      }
    } catch (error) {
      console.error('Error processing return:', error);
      Swal.fire({
        title: 'Error',
        text: 'Failed to process return',
        icon: 'error'
      });
    }
  }
  
  function displayApprovedRequestsTable(requests, containerId) {
    const tableBody = document.getElementById(containerId);
    tableBody.innerHTML = '';
  
    // Filter out requests with statuses of "cancelled" and "returned"
    const filteredRequests = requests.filter(request => request.status !== 'cancelled' && request.status !== 'returned');
  
    // Sort requests by batch_id
    filteredRequests.sort((a, b) => (a.batch_id || '').toString().localeCompare((b.batch_id || '').toString()));
  
    // Group requests by batch_id
    let currentBatchId = null;
    let rowspanCount = 0;
    let firstRowOfBatch = null;
  
    filteredRequests.forEach((request, index) => {
      const row = document.createElement('tr');
      
      // Apply time status styling
      const rowStyle = getRowStyle(request);
      Object.assign(row.style, rowStyle);
      
      // Add click handler ONLY for ongoing requests with time status
      if (request.status === 'ongoing' && 
          (isOverdue(request) || Object.keys(getRowStyle(request)).length > 0)) {
        row.style.cursor = 'pointer';
        row.addEventListener('click', (event) => {
          // Check if the click was on a button
          const isButton = event.target.closest('a[id^="releaseButton"], a[id^="returnButton"], a[id^="cancelButton"]');
          if (!isButton) {
            showPenaltyDetails(request);
          }
        });
      }
  
      // Remove the row click handler and cursor style
      // row.style.cursor = 'pointer';
      // row.onclick = () => showRequestDetails(request);
  
      // Create row content without batch_id cell
      let rowContent = `
          <td>
            <div class="d-flex px-2 py-1">
              <div class="d-flex flex-column justify-content-center">
                <h6 class="mb-0 text-sm">${request.first_name} ${request.last_name}</h6>
                <p class="text-xs text-secondary mb-0">${request.email}</p>
              </div>
            </div>
          </td>`;
  
      // Handle batch_id cell
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
  
        // Add batch_id cell only for first row of new batch
        rowContent += `
            <td class="merged-cell align-middle text-center align-items-center">
              <p class="text-xs font-weight-bold mb-0">${request.batch_id}</p>
            </td>`;
      } else {
        rowspanCount++;
      }
  
      // Determine action buttons based on status
      let actionButtons = '';
      if (request.status === 'ongoing') {
        actionButtons = `
            <a id="returnButton-${index}" 
               href="javascript:;" 
               class="badge badge-sm bg-gradient-warning text-xs" 
               data-toggle="tooltip" 
               data-original-title="Return" 
               onclick="processReturnRequest(${request.request_id}, '${request.mcl_pass_no || 'Not assigned'}')">
              Return
            </a>
          `;
      } else if (request.status === 'approved') {
        actionButtons = `
            <a id="releaseButton-${index}" 
               href="javascript:;" 
               class="badge badge-sm bg-gradient-info text-xs mb-1" 
               data-toggle="tooltip" 
               data-original-title="Release" 
               onclick="processReleaseRequest(${request.request_id})">
              Release
            </a>
            <a id="cancelButton-${index}" 
               href="javascript:;" 
               class="badge badge-sm bg-gradient-danger text-xs" 
               data-toggle="tooltip" 
               data-original-title="Cancel" 
               onclick="cancelRequest(${request.request_id})">
              Cancel
            </a>
          `;
      }
  
      const statusClass = request.status === 'approved'
        ? 'badge badge-sm bg-gradient-success'
        : request.status === 'ongoing'
          ? 'badge badge-sm bg-gradient-info'
          : 'badge badge-sm bg-gradient-info';
  
      // Add remaining cells
      let equipmentCell = `
      <td>
        <div class="d-flex justify-content-between align-items-center">
          <div>
            <p class="text-xs font-weight-bold mb-0">${request.equipment_category_id}</p>
            <p class="text-xs text-secondary mb-0">${request.category_name}</p>
          </div>
          ${request.mcl_pass_no ? `
            <div class="py-1 px-2" style="
              background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
              border: 1px solid #2E7D32;
              border-radius: 4px;
            ">
              <span class="text-xs" style="
                color: #2E7D32;
                font-weight: 600;
                letter-spacing: 0.5px;
              ">MCL #${request.mcl_pass_no}</span>
            </div>
          ` : ''}
        </div>
      </td>`;
      rowContent += equipmentCell + `
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
          </td>
          <td class="align-middle">
            ${actionButtons}
          </td>`;
  
      row.innerHTML = rowContent;
      tableBody.appendChild(row);
  
      // Add event listeners
      const releaseButton = document.getElementById(`releaseButton-${index}`);
      const returnButton = document.getElementById(`returnButton-${index}`);
      const cancelButton = document.getElementById(`cancelButton-${index}`);
  
      if (releaseButton) {
        releaseButton.addEventListener('click', function(e) {
          e.stopPropagation(); // Prevent row click
          console.log(`Release button clicked for request ${request.request_id}`);
          processReleaseRequest(request.request_id);
        });
      }
  
      if (returnButton) {
        returnButton.addEventListener('click', function(e) {
          e.stopPropagation(); // Prevent row click
          console.log(`Return button clicked for request ${request.request_id}`);
          processReturnRequest(request.request_id, request.mcl_pass_no || 'Not assigned');
        });
      }
  
      if (cancelButton) {
        cancelButton.addEventListener('click', function(e) {
          e.stopPropagation(); // Prevent row click
          console.log(`Cancel button clicked for request ${request.request_id}`);
          cancelRequest(request.request_id);
        });
      }
    });
  
    // Handle rowspan for last batch
    if (firstRowOfBatch && rowspanCount > 1) {
      const batchCell = firstRowOfBatch.cells[1];
      batchCell.rowSpan = rowspanCount;
      batchCell.className = "merged-cell align-middle text-center align-items-center";
    }
  }
  
  async function saveRequestDetails() {
    const requestId = document.getElementById('modalRequestId').value;
    const mclPassNo = document.getElementById('mclPassNo').value;
    const remarks = document.getElementById('remarks').value;
  
    // Validate MCL Pass Number
    if (!mclPassNo || !/^[0-9]{1,2}$/.test(mclPassNo)) {
      Swal.fire({
        title: 'Error',
        text: 'MCL Pass Number must be a 2-digit number (00-99)',
        icon: 'error'
      });
      return;
    }
  
    // Pad single digit with leading zero
    const formattedMclPassNo = mclPassNo.padStart(2, '0');
  
    try {
      const response = await fetch('/admin/update-request-details', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          request_id: requestId,
          mcl_pass_no: formattedMclPassNo,
          remarks: remarks
        }),
        credentials: 'include'
      });
  
      if (!response.ok) throw new Error('Failed to update request details');
  
      const modal = bootstrap.Modal.getInstance(document.getElementById('requestDetailsModal'));
      modal.hide();
  
      Swal.fire({
        title: 'Success',
        text: 'Request details updated successfully',
        icon: 'success'
      }).then(() => {
        fetchApprovedRequestsData();
      });
    } catch (error) {
      console.error('Error updating request details:', error);
      Swal.fire({
        title: 'Error',
        text: 'Failed to update request details',
        icon: 'error'
      });
    }
  }
  
  // Call the function to fetch and display data
  fetchApprovedRequestsData();

function formatDuration(overdueMinutes, minutesUntilOverdue) {
  if (overdueMinutes > 0) {
    const hours = Math.floor(overdueMinutes / 60);
    const minutes = Math.floor(overdueMinutes % 60);
    return `${hours}h ${minutes}m overdue`;
  } else if (minutesUntilOverdue) {
    const hours = Math.floor(minutesUntilOverdue / 60);
    const minutes = Math.floor(minutesUntilOverdue % 60);
    return `${hours}h ${minutes}m remaining`;
  }
  return '';
}