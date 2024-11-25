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
    
    input.addEventListener('focus', () => {
      input.setAttribute('min', this.getCurrentDateTime());
    });
    
    input.addEventListener('keydown', e => e.preventDefault());
    
    // Add validation on change
    input.addEventListener('input', () => {
      const startDateTime = input.value;
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
  group.classList.toggle('error', !isValid);
  group.classList.toggle('success', isValid);
  
  const error = group.querySelector('.error-message') || document.createElement('div');
  if (!isValid) {
    error.className = 'error-message';
    error.textContent = message;
    if (!group.querySelector('.error-message')) {
      group.appendChild(error);
    }
  } else if (group.contains(error)) {
    error.remove();
  }
}

function setupEquipmentHandling() {
  document.getElementById('add-more').addEventListener('click', () => {
    const section = createEquipmentSection();
    document.getElementById('form-duplicates').appendChild(section);
    utils.setupDateTimeInput(section.querySelector('input[type="datetime-local"]'));
    updateScrollSpy();
    section.scrollIntoView({ behavior: 'smooth' });
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
  const sections = document.querySelectorAll('.equipment-section');
  
  nav.innerHTML = '';
  
  if (sections.length === 0) {
    nav.style.display = 'none';
    return;
  }
  
  nav.style.display = 'flex';
  sections.forEach((section, index) => {
    const dot = document.createElement('div');
    dot.className = 'section-dot';
    dot.dataset.label = `Equipment ${String.fromCharCode(65 + index)}`;
    dot.onclick = () => section.scrollIntoView({ behavior: 'smooth' });
    nav.appendChild(dot);
  });
}

function handleSubmit(event) {
  event.preventDefault();
  
  // Check for any validation errors
  const hasErrors = document.querySelectorAll('.form-group.error').length > 0;
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
  
  // Validate start time operating hours
  if (startTime && !validators.operatingHours(new Date(startTime).toTimeString())) {
    validateField(startInput, false, 'Start time must be between 6 AM and 5 PM');
    return;
  }
  
  // Validate end time operating hours
  if (endTime && !validators.operatingHours(endTime)) {
    validateField(endInput, false, 'Return time must be between 6 AM and 5 PM');
    return;
  }
  
  // Validate overall datetime logic
  const isValid = validators.datetime(startTime, endTime);
  validateField(startInput, isValid, isValid ? '' : 'Invalid date/time selection (24h advance booking required and within operating hours 6 AM - 5 PM)');
  validateField(endInput, isValid, isValid ? '' : 'Invalid return time');
}

// Add this new function for setting up datetime validation
function setupDateTimeValidation() {
  const validateTimeInputs = (container) => {
    const startDateTime = container.querySelector('input[name="startDateTime"]');
    const endTime = container.querySelector('input[name="endTime"]');
    
    if (startDateTime && endTime) {
      endTime.addEventListener('input', () => {
        if (startDateTime.value) {
          validateDateTime(startDateTime, endTime);
        }
      });
      
      startDateTime.addEventListener('input', () => {
        if (endTime.value) {
          validateDateTime(startDateTime, endTime);
        }
      });
      
      // Add immediate validation for operating hours
      startDateTime.addEventListener('change', () => {
        if (startDateTime.value) {
          const time = new Date(startDateTime.value);
          if (!validators.operatingHours(time.toTimeString())) {
            validateField(startDateTime, false, 'Start time must be between 6 AM and 5 PM');
          }
        }
      });
      
      endTime.addEventListener('change', () => {
        if (endTime.value) {
          if (!validators.operatingHours(endTime.value)) {
            validateField(endTime, false, 'Return time must be between 6 AM and 5 PM');
          }
        }
      });
    }
  };

  // Setup for initial form and observe new sections
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
      
      validateField(this, validators.quantity(parseInt(this.value)), '');
    });
  };

  // Add toast notification function
  const showToast = (message) => {
    const Toast = Swal.mixin({
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 2000,
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