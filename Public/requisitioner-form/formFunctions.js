// Toast notification function
const showToast = (message) => {
  const Toast = Swal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 5000,          // Increased from 2000 to 5000 ms (5 seconds)
    timerProgressBar: true,
    didOpen: (toast) => {
      toast.addEventListener('mouseenter', Swal.stopTimer);
      toast.addEventListener('mouseleave', Swal.resumeTimer);
    }
  });

  Toast.fire({
    icon: 'warning',
    title: message
  });
};

// Utility functions
const utils = {
  getCurrentDateTime() {
    const now = new Date();
    now.setHours(now.getHours() + 24); // Add 24 hours
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0,16);
  },

  formatTimeToHHMMSS(timeString) {
    const [hours, minutes] = timeString.split(':');
    return `${hours}:${minutes}:00`;
  },

  setupDateTimeInput(input) {
    const minDateTime = this.getCurrentDateTime();
    input.setAttribute('min', minDateTime);
    
    // Add max date constraint (4 digit year)
    const maxDate = new Date(9999, 11, 31, 23, 59); // Max date: 9999-12-31 23:59
    input.setAttribute('max', maxDate.toISOString().slice(0,16));
    
    input.addEventListener('focus', () => {
      input.setAttribute('min', this.getCurrentDateTime());
    });
    
    // Validate input to prevent invalid years and past dates
    input.addEventListener('input', () => {
      const startDateTime = input.value;
      if (startDateTime) {
        const selectedDate = new Date(startDateTime);
        const minDate = new Date();
        minDate.setHours(minDate.getHours() + 24); // Add 24 hours

        // Check for past dates or invalid years
        if (selectedDate < minDate || selectedDate.getFullYear() > 9999) {
          input.value = ''; // Clear invalid input
          showToast('Please select a future date (24h advance) with a valid year');
          return;
        }
      }
      
      const endTimeInput = input.closest('.row, #inputs-container').querySelector('input[name="endTime"]');
      if (endTimeInput && endTimeInput.value) {
        validateDateTime(input, endTimeInput);
      }
    });
  }
};

// Add this function after the existing utility functions
async function populateEquipmentDropdowns() {
  try {
    const response = await fetch('/equipments/get-equipments');
    const data = await response.json();
    
    if (data.successful) {
      const equipmentSelects = document.querySelectorAll('select[name="equipment-select"]');
      
      // Sort equipment categories by ID
      const sortedCategories = data.equipmentCategories.sort((a, b) => a.category_id - b.category_id);
      
      const options = sortedCategories.map(category => 
        `<option value="${category.category_name}" 
         ${category.quantity_available === 0 ? 'disabled' : ''}
         data-quantity="${category.quantity_available}">
           ${category.category_name} (${category.quantity_available} available)
         </option>`
      ).join('');
      
      equipmentSelects.forEach(select => {
        select.innerHTML = `
          <option value="" selected>Select an option</option>
          ${options}
        `;

        // Update event listener to use quantity_available
        select.addEventListener('change', function() {
          const selectedOption = this.options[this.selectedIndex];
          const availableQuantity = parseInt(selectedOption.dataset.quantity) || 0;
          const quantityInput = this.closest('.row, #inputs-container').querySelector('input[name="quantity"]');
          
          if (quantityInput) {
            // Set max to either available quantity or 3, whichever is smaller
            const maxQuantity = Math.min(availableQuantity, 3);
            quantityInput.max = maxQuantity;
            
            // If current value is higher than new max, adjust it
            if (parseInt(quantityInput.value) > maxQuantity) {
              quantityInput.value = maxQuantity;
              showToast(`Maximum quantity available is ${maxQuantity}`);
            }
          }
        });
      });
    } else {
      console.error('Failed to fetch equipment categories');
    }
  } catch (error) {
    console.error('Error fetching equipment categories:', error);
  }
}

// Validation rules
const validators = {
  names: value => /^[A-Za-z\s'-]{2,50}$/.test(value),
  department: value => /^[A-Za-z0-9\s\/.()-]{3,100}$/.test(value),
  email: value => /^[a-zA-Z0-9._%+-]+@(mls\.ceu\.edu\.ph|ceu\.edu\.ph)$/.test(value),
  operatingHours: (timeString) => {
    if (!timeString) return false;
    const [hours] = timeString.split(':').map(Number);
    return hours >= 6 && hours < 17; // 6 AM to 5 PM
  },
  datetime: (start, end) => {
    if (!start || !end) return false;
    
    const startDate = new Date(start);
    const [endHours, endMinutes] = end.split(':');
    const endDate = new Date(startDate);
    endDate.setHours(parseInt(endHours), parseInt(endMinutes), 0);
    
    // Get current date and add 24 hours
    const minDate = new Date();
    minDate.setHours(minDate.getHours() + 24);
    
    // Check operating hours for both start and end times
    const startHours = startDate.getHours();
    const endHoursNum = parseInt(endHours);
    
    const withinOperatingHours = startHours >= 6 && startHours < 17 && 
                                endHoursNum >= 6 && endHoursNum < 17;
    
    return startDate > minDate && endDate > startDate && withinOperatingHours;
  },
  quantity: value => value > 0 && value <= 3 // Change max to 3
};

// Form initialization
function initForm() {
  initializeFormAnimations();
  setupTermsPopup();
  setupValidation();
  setupEquipmentHandling();
  setupDateTimeRestrictions();
  setupDateTimeValidation(); 
  setupQuantityValidation(); 
  initScrollSpy();
  populateEquipmentDropdowns();
  
  // Add form submit handler
  const form = document.getElementById('main-form');
  form.addEventListener('submit', handleSubmit);
}

// Add this to formFunctions.js
function initializeFormAnimations() {
  const formGroups = document.querySelectorAll('.form-group');
  
  formGroups.forEach((group, index) => {
    // Remove opacity 0
    group.style.opacity = '1';
    
    // Add animation
    group.style.animation = `fadeInUp 0.5s ease forwards ${index * 0.1}s`;
  });
}

function setupTermsPopup() {
  const termsCheckbox = document.getElementById('terms-checkbox');
  const popup = document.getElementById('terms-popup');
  
  termsCheckbox.addEventListener('change', () => {
    if (termsCheckbox.checked) {
      popup.style.display = 'flex';
      void popup.offsetWidth;
      popup.classList.add('active');
      termsCheckbox.checked = false;
    }
  });

  document.getElementById('agree-button').addEventListener('click', e => {
    e.preventDefault();
    termsCheckbox.checked = true;
    popup.classList.remove('active');
    setTimeout(() => popup.style.display = 'none', 300);
  });

  document.getElementById('close-button').addEventListener('click', e => {
    e.preventDefault();
    termsCheckbox.checked = false;
    popup.classList.remove('active');
    setTimeout(() => popup.style.display = 'none', 300);
  });
}

function setupValidation() {
  const validationRules = {
    'first-name': { validator: validators.names, message: 'Please enter a valid first name' },
    'last-name': { validator: validators.names, message: 'Please enter a valid last name' },
    'department-name': { validator: validators.department, message: 'Please enter a valid department name' },
    'email': { validator: validators.email, message: 'Please enter a valid CEU email address' }
  };

  Object.entries(validationRules).forEach(([id, {validator, message}]) => {
    const element = document.getElementById(id);
    if (element) {
      element.addEventListener('input', () => validateField(element, validator(element.value), message));
    }
  });

  setupDateTimeValidation();
}

function validateField(element, isValid, message) {
  const group = element.closest('.form-group');
  
  // Store the validation state in a data attribute
  element.dataset.isValid = isValid;
  
  // Update visual feedback
  group.classList.toggle('error', !isValid);
  group.classList.toggle('success', isValid);
  
  // Handle error message
  let error = group.querySelector('.error-message');
  if (!isValid && message) {
    if (!error) {
      error = document.createElement('div');
      error.className = 'error-message';
      group.appendChild(error);
    }
    error.textContent = message;
  } else if (error) {
    error.remove();
  }
}

function setupEquipmentHandling() {
  const addMoreBtn = document.getElementById('add-more');
  
  addMoreBtn.addEventListener('click', () => {
    const currentCount = document.querySelectorAll('.equipment-section').length;
    
    if (currentCount >= 4) {
      Swal.fire({
        icon: 'warning',
        title: 'Maximum Limit Reached',
        text: 'Maximum of 4 additional equipment requests allowed',
        confirmButtonColor: '#3085d6'
      });
      return;
    }
    
    const section = createEquipmentSection();
    document.getElementById('form-duplicates').appendChild(section);
    utils.setupDateTimeInput(section.querySelector('input[type="datetime-local"]'));
    updateScrollSpy();
    section.scrollIntoView({ behavior: 'smooth' });
    
    if (currentCount + 1 >= 4) {
      addMoreBtn.style.display = 'none';
    }
  });

  // Add global event delegation for equipment selects
  document.addEventListener('change', async function(e) {
    if (e.target.matches('select[name="equipment-select"]')) {
      const selectedValue = e.target.value;
      if (!selectedValue) return;

      const allSelects = document.querySelectorAll('select[name="equipment-select"]');
      const duplicateSelects = Array.from(allSelects).filter(select => 
        select !== e.target && select.value === selectedValue
      );

      if (duplicateSelects.length > 0) {
        const result = await Swal.fire({
          title: 'Duplicate Equipment',
          text: 'You have already selected this equipment. Do you want to proceed with selecting it again?',
          icon: 'warning',
          showCancelButton: true,
          confirmButtonText: 'Yes, proceed',
          cancelButtonText: 'No, choose another'
        });

        if (!result.isConfirmed) {
          e.target.value = ''; // Reset to default option
          return;
        }
      }
    }
  });
}

function createEquipmentSection() {
  const section = document.createElement('div');
  section.className = 'equipment-section';
  
  // Get the original container and its select element
  const originalContainer = document.getElementById('inputs-container');
  const originalSelect = originalContainer.querySelector('select[name="equipment-select"]');
  
  // Clone the container
  const container = originalContainer.cloneNode(true);
  
  // Get the new select element
  const newSelect = container.querySelector('select[name="equipment-select"]');
  
  // Copy options from original select to maintain the populated data
  while (newSelect.firstChild) {
    newSelect.removeChild(newSelect.firstChild);
  }
  originalSelect.childNodes.forEach(node => {
    newSelect.appendChild(node.cloneNode(true));
  });

  // Add header and container to section
  section.innerHTML = '<div class="section-header"><span class="section-title">Additional Equipment Request</span></div>';
  section.appendChild(container);

  // Add remove button
  const removeBtn = document.createElement('button');
  removeBtn.textContent = 'Remove Equipment';
  removeBtn.className = 'form-control remove-button';
  removeBtn.onclick = () => {
    section.remove();
    updateScrollSpy();
    
    // Show "Add More" button if we're below the limit
    const currentCount = document.querySelectorAll('.equipment-section').length;
    if (currentCount < 4) {
      document.getElementById('add-more').style.display = '';
    }
  };
  section.appendChild(removeBtn);

  // Add change event listener for the new select
  newSelect.addEventListener('change', function() {
    const selectedOption = this.options[this.selectedIndex];
    const availableQuantity = parseInt(selectedOption.dataset.quantity) || 0;
    const quantityInput = this.closest('.row, #inputs-container').querySelector('input[name="quantity"]');
    
    if (quantityInput) {
      const maxQuantity = Math.min(availableQuantity, 3);
      quantityInput.max = maxQuantity;
      
      if (parseInt(quantityInput.value) > maxQuantity) {
        quantityInput.value = maxQuantity;
        showToast(`Maximum quantity available is ${maxQuantity}`);
      }
    }
  });

  updateScrollSpy();
  return section;
}

function setupDateTimeRestrictions() {
  const dateInputs = document.querySelectorAll('input[type="datetime-local"]');
  dateInputs.forEach(input => utils.setupDateTimeInput(input));
}

function updateScrollSpy() {
  const nav = document.querySelector('.form-sections-nav');
  const originalForm = document.getElementById('inputs-container');
  const duplicateSections = document.querySelectorAll('.equipment-section');
  
  nav.innerHTML = '';
  
  // Create dot for original form
  const originalDot = document.createElement('div');
  originalDot.className = 'section-dot';
  originalDot.dataset.label = 'Original Request';
  originalDot.onclick = () => originalForm.scrollIntoView({ behavior: 'smooth' });
  nav.appendChild(originalDot);
  
  duplicateSections.forEach((section, index) => {
    const dot = document.createElement('div');
    dot.className = 'section-dot';
    dot.dataset.label = `Additional Request ${index + 1}`;
    dot.onclick = () => section.scrollIntoView({ behavior: 'smooth' });
    nav.appendChild(dot);
  });
  
  nav.style.display = 'flex';
}

function handleSubmit(event) {
  event.preventDefault();
  
  // Update validation for maximum equipment requests
  const duplicateCount = document.querySelectorAll('.equipment-section').length;
  if (duplicateCount > 4) { // Only count duplicates, not including original
    Swal.fire({
      icon: 'error',
      title: 'Too Many Equipment Requests',
      text: 'Maximum of 4 additional equipment requests allowed.'
    });
    return;
  }

  // Check all validation states
  const allInputs = event.target.querySelectorAll('input, select');
  let hasErrors = false;
  
  allInputs.forEach(input => {
    if (input.dataset.isValid === 'false') {
      hasErrors = true;
    }
  });
  
  if (hasErrors) {
    Swal.fire({
      icon: 'error',
      title: 'Validation Error',
      text: 'Please correct all errors before submitting.'
    });
    return;
  }
  
  if (!document.getElementById('terms-checkbox').checked) {
    Swal.fire({
      icon: 'warning',
      title: 'Terms Required',
      text: 'Please agree to the Terms and Conditions.'
    });
    return;
  }

  // Continue with form submission if no errors
  const formData = new FormData(event.target);
  const jsonData = {
    firstName: formData.get('first-name'),
    lastName: formData.get('last-name'),
    departmentName: formData.get('department-name'),
    email: formData.get('email'),
    natureOfService: formData.get('natureOfService'),
    purpose: formData.get('purpose'),
    venue: formData.get('venue'),
    equipmentCategories: getEquipmentData()
  };

  submitForm(jsonData);
  return false;
}

async function submitForm(data) {
  const submitBtn = document.getElementById('submit');
  const buttonText = submitBtn.querySelector('.button-text');
  
  submitBtn.disabled = true;
  submitBtn.classList.add('loading');
  buttonText.textContent = 'Submitting...';
  
  try {
    const response = await fetch('/equipments/insert-details', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      credentials: 'include'
    });
    
    const result = await response.json();
    if (result.successful) {
      document.getElementById('main-form').reset();
      document.getElementById('form-duplicates').innerHTML = '';
      
      Swal.fire({
        icon: 'success',
        title: 'Success!',
        text: 'Your equipment request has been submitted successfully.',
        timer: 3000,
        timerProgressBar: true,
        showConfirmButton: true,
        allowOutsideClick: false
      }).then(() => {
        window.location.href = '../otp/index.html';
      });
    } else {
      throw new Error(result.message);
    }
  } catch (error) {
    console.error('Error:', error);
    Swal.fire({
      icon: 'error',
      title: 'Submission Failed',
      text: error.message || 'An error occurred while submitting the form'
    });
  } finally {
    submitBtn.disabled = false;
    submitBtn.classList.remove('loading');
    buttonText.textContent = 'Submit';
  }
}

// Add this function to formFunctions.js
function initScrollSpy() {
  // Create scroll spy container if it doesn't exist
  let nav = document.querySelector('.form-sections-nav');
  if (!nav) {
    nav = document.createElement('div');
    nav.className = 'form-sections-nav';
    document.querySelector('.container').appendChild(nav);
  }
  
  updateScrollSpy();
}

// Update scroll spy styles - add to your CSS
const styles = `
.form-sections-nav {
  position: fixed;
  right: 20px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  flex-direction: column;
  gap: 10px;
  z-index: 1000;
}

.section-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.5);
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
}

.section-dot:hover {
  background: #fff;
  transform: scale(1.2);
}

.section-dot:hover::after {
  content: attr(data-label);
  position: absolute;
  right: 20px;
  top: 50%;
  transform: translateY(-50%);
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  white-space: nowrap;
}
`;

// Add styles to document
document.head.insertAdjacentHTML('beforeend', `<style>${styles}</style>`);

// Initialize everything when DOM is ready
document.addEventListener('DOMContentLoaded', initForm);

function getEquipmentData() {
  // Get all equipment sections including the initial one and duplicates
  const sections = [
    document.getElementById('inputs-container'),
    ...document.querySelectorAll('#form-duplicates .equipment-section')
  ];

  // Map each section to equipment data
  return sections.map(section => {
    const select = section.querySelector('select[name="equipment-select"]');
    const quantity = section.querySelector('input[name="quantity"]');
    const startDateTime = section.querySelector('input[name="startDateTime"]');
    const endTime = section.querySelector('input[name="endTime"]');

    // Extract date and format time
    const date = new Date(startDateTime.value);
    const dateStr = date.toISOString().split('T')[0];
    const startTimeStr = utils.formatTimeToHHMMSS(date.toTimeString().slice(0, 5));
    const endTimeStr = utils.formatTimeToHHMMSS(endTime.value);

    return {
      category: select.value,
      quantity: parseInt(quantity.value),
      dateRequested: dateStr,
      timeRequested: startTimeStr,
      returnTime: endTimeStr
    };
  }).filter(data => data.category); // Filter out any empty selections
}

// Add this new function for datetime validation
function validateDateTime(startInput, endInput) {
  const startTime = startInput.value;
  const endTime = endInput.value;
  
  // Clear previous validations
  validateField(startInput, true, '');
  validateField(endInput, true, '');
  
  // Real-time validation for start time
  if (startTime) {
    const selectedDate = new Date(startTime);
    const minDate = new Date();
    minDate.setHours(minDate.getHours() + 24);
    
    if (selectedDate < minDate) {
      validateField(startInput, false, 'Booking must be at least 24 hours in advance');
      return;
    }
    
    // Validate operating hours
    if (!validators.operatingHours(selectedDate.toTimeString())) {
      validateField(startInput, false, 'Start time must be between 6 AM and 5 PM');
      return;
    }
  }
  
  // Real-time validation for end time
  if (endTime) {
    if (!validators.operatingHours(endTime)) {
      validateField(endInput, false, 'Return time must be between 6 AM and 5 PM');
      return;
    }
    
    // Validate end time is after start time
    if (startTime) {
      const startDate = new Date(startTime);
      const [endHours, endMinutes] = endTime.split(':');
      const endDate = new Date(startDate);
      endDate.setHours(parseInt(endHours), parseInt(endMinutes), 0);
      
      if (endDate <= startDate) {
        validateField(endInput, false, 'Return time must be after start time');
        return;
      }
    }
  }
  
  // If both times are set, do final validation
  if (startTime && endTime) {
    const isValid = validators.datetime(startTime, endTime);
    if (!isValid) {
      validateField(startInput, false, 'Invalid date/time selection');
      validateField(endInput, false, 'Invalid return time');
    }
  }
}

// Add this new function for setting up datetime validation
function setupDateTimeValidation() {
  const validateTimeInputs = (container) => {
    const startDateTime = container.querySelector('input[name="startDateTime"]');
    const endTime = container.querySelector('input[name="endTime"]');
    
    if (startDateTime && endTime) {
      // Real-time validation for both inputs
      ['input', 'change'].forEach(eventType => {
        startDateTime.addEventListener(eventType, () => {
          validateDateTime(startDateTime, endTime);
        });
        
        endTime.addEventListener(eventType, () => {
          validateDateTime(startDateTime, endTime);
        });
      });
    }
  };

  // Setup for initial form
  validateTimeInputs(document.getElementById('inputs-container'));
  
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.classList && node.classList.contains('equipment-section')) {
          validateTimeInputs(node);
        }
      });
    });
  });

  observer.observe(document.getElementById('form-duplicates'), {
    childList: true
  });
}

// Update the quantity input restrictions in HTML via JavaScript
function setupQuantityValidation() {
  const validateQuantity = (input) => {
    input.setAttribute('min', '1');
    input.setAttribute('max', '3'); // Update max attribute
    
    // Allow empty input while typing
    input.addEventListener('input', function() {
      if (this.value === '') return;
      
      const value = parseInt(this.value);
      if (isNaN(value)) {
        this.value = '';
      }
      
      // Validate quantity immediately on input
      const isValid = validators.quantity(value);
      validateField(this, isValid, isValid ? '' : 'Quantity must be between 1 and 3');
      
      // Revalidate associated datetime fields
      const container = this.closest('.row, #inputs-container');
      const startDateTime = container.querySelector('input[name="startDateTime"]');
      const endTime = container.querySelector('input[name="endTime"]');
      if (startDateTime && endTime) {
        validateDateTime(startDateTime, endTime);
      }
    });
    
    // Validate on blur
    input.addEventListener('blur', function() {
      const value = parseInt(this.value);
      
      if (this.value === '' || isNaN(value) || value < 1) {
        this.value = 1;
        showToast('Quantity must be at least 1');
      } else if (value > 3) {
        this.value = 3;
        showToast('Maximum quantity allowed is 3');
      }
      
      // Validate after correction
      const isValid = validators.quantity(parseInt(this.value));
      validateField(this, isValid, isValid ? '' : 'Quantity must be between 1 and 3');
      
      // Revalidate associated datetime fields
      const container = this.closest('.row, #inputs-container');
      const startDateTime = container.querySelector('input[name="startDateTime"]');
      const endTime = container.querySelector('input[name="endTime"]');
      if (startDateTime && endTime) {
        validateDateTime(startDateTime, endTime);
      }
    });
  };

  // Setup for initial form
  const quantityInput = document.querySelector('input[name="quantity"]');
  if (quantityInput) {
    validateQuantity(quantityInput);
  }

  // Setup observer for dynamically added sections
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.classList && node.classList.contains('equipment-section')) {
          const newQuantityInput = node.querySelector('input[name="quantity"]');
          if (newQuantityInput) {
            validateQuantity(newQuantityInput);
          }
        }
      });
    });
  });

  observer.observe(document.getElementById('form-duplicates'), {
    childList: true
  });
}