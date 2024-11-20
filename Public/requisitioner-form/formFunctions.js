document.addEventListener("DOMContentLoaded", function () {
  const dropdown = document.getElementById('dropdown');
  const container = document.getElementById('additional-field-container');

  dropdown.addEventListener('change', function () {
    const existingField = document.getElementById('additional-text-field');

    if (dropdown.value === 'other') {
      if (!existingField) {
        const textFieldHTML = `
        <div class="form-group">
          <input type="text" name="other-details" id="additional-text-field" class="form-control" placeholder="Please specify" required="">
        </div>
      `;
        container.insertAdjacentHTML('beforeend', textFieldHTML);
      }
    } else {
      if (existingField) {
        container.removeChild(existingField.parentElement);
      }
    }
  });

  const purposeDropdown = document.getElementById('purposeDropdown');
  const purposeContainer = document.getElementById('purpose-field-container');

  purposeDropdown.addEventListener('change', function () {
    const existingPurposeField = document.getElementById('additional-purpose-field');

    if (purposeDropdown.value === 'otherPurpose') {
      if (!existingPurposeField) {
        const textFieldHTML = `
        <div class="form-group">
          <input type="text" name="other-purpose" id="additional-purpose-field" class="form-control" placeholder="Please specify your purpose" required="">
        </div>
      `;
        purposeContainer.insertAdjacentHTML('beforeend', textFieldHTML);
      }
    } else {
      if (existingPurposeField) {
        purposeContainer.removeChild(existingPurposeField.parentElement);
      }
    }
  });

  const checkboxes = document.querySelectorAll('.input-checkbox');

  checkboxes.forEach(checkbox => {
    checkbox.addEventListener('change', function () {
      if (checkbox.value === 'Others') {
        handleOthersCheckbox(checkbox);
      } else if (checkbox.value === 'Instructional Materials') {
        handleInstructionalMaterialsCheckbox(checkbox);
      }
    });
  });
});

function handleOthersCheckbox(checkbox) {
  const textInputContainer = document.getElementById('Others-text-container');

  if (checkbox.checked) {
    if (!document.getElementById('Others-text')) {
      const textFieldHTML = `
        <div class="form-group">
          <label for="Others-text">Specify Others:</label>
          <input type="text" name="Others-text" id="Others-text" class="form-control" placeholder="Please specify" required>
        </div>
      `;
      textInputContainer.innerHTML = textFieldHTML;
    }
  } else {
    textInputContainer.innerHTML = '';
  }

}

function handleInstructionalMaterialsCheckbox(checkbox) {
  const textInputContainer = document.getElementById('Instructional-Materials-text-container');
  if (checkbox.checked) {
    if (!document.getElementById('Instructional-Materials-text')) {
      const textFieldHTML = `
        <div class="form-group">
          <label for="Instructional-Materials-text">Specify Instructional Materials:</label>
          <input type="text" name="Instructional-Materials-text" id="Instructional-Materials-text" class="form-control" placeholder="Please specify" required>
        </div>
      `;
      textInputContainer.innerHTML = textFieldHTML;
    }
  } else {
    textInputContainer.innerHTML = '';
  }


}


// Show terms popup with animation
document.getElementById('terms-checkbox').addEventListener('change', function() {
  if (this.checked) {
    const popup = document.getElementById('terms-popup');
    popup.style.display = 'flex';
    // Trigger reflow
    void popup.offsetWidth;
    popup.classList.add('active');
    this.checked = false;
  }
});

// Modify the agree button handler
document.getElementById('agree-button').addEventListener('click', function(event) {
  event.preventDefault(); // Prevent form submission
  const popup = document.getElementById('terms-popup');
  document.getElementById('terms-checkbox').checked = true;
  popup.classList.remove('active');
  setTimeout(() => popup.style.display = 'none', 300);
});

// Add form submission validation
document.getElementById('main-form').addEventListener('submit', function(event) {
  const termsCheckbox = document.getElementById('terms-checkbox');
  
  if (!termsCheckbox.checked) {
    event.preventDefault();
    alert('Please agree to the Terms and Conditions before submitting.');
    return false;
  }
});

// Modify close button to also prevent form submission
document.getElementById('close-button').addEventListener('click', function(event) {
  event.preventDefault();
  const popup = document.getElementById('terms-popup');
  document.getElementById('terms-checkbox').checked = false;
  popup.classList.remove('active');
  setTimeout(() => popup.style.display = 'none', 300);
});

function updateScrollSpy() {
  const nav = document.querySelector('.form-sections-nav');
  const sections = document.querySelectorAll('.equipment-section');
  
  nav.innerHTML = '';
  sections.forEach((section, index) => {
    const dot = document.createElement('div');
    dot.className = 'section-dot';
    dot.setAttribute('data-label', `Equipment ${String.fromCharCode(65 + index)}`);
    dot.onclick = () => section.scrollIntoView({ behavior: 'smooth' });
    nav.appendChild(dot);
  });
  
  // Update active dot on scroll
  window.addEventListener('scroll', () => {
    const sections = document.querySelectorAll('.equipment-section');
    sections.forEach((section, index) => {
      const rect = section.getBoundingClientRect();
      const dot = document.querySelectorAll('.section-dot')[index];
      if (rect.top <= window.innerHeight/2 && rect.bottom >= window.innerHeight/2) {
        dot.classList.add('active');
      } else {
        dot.classList.remove('active');
      }
    });
  });
}

// Remove sectionCount variable and modify add-more handler
document.getElementById('add-more').addEventListener('click', function() {
  const container = document.getElementById('inputs-container');
  const clone = container.cloneNode(true);
  
  // Wrap in section container
  const section = document.createElement('div');
  section.className = 'equipment-section';
  section.innerHTML = `
    <div class="section-header">
      <span class="section-title">Additional Equipment Request</span>
    </div>
  `;
  section.appendChild(clone);
  
  const removeBtn = document.createElement('button');
  removeBtn.textContent = 'Remove Equipment';
  removeBtn.className = 'form-control remove-button';
  removeBtn.style.backgroundColor = '#e74c3c';
  removeBtn.style.color = 'white';
  removeBtn.style.borderRadius = '8px';
  removeBtn.style.marginTop = '10px';
  
  removeBtn.addEventListener('click', function() {
    section.remove();
    updateScrollSpy();
  });
  
  section.appendChild(removeBtn);
  document.getElementById('form-duplicates').appendChild(section);
  updateScrollSpy();
  
  // Smooth scroll to new section
  section.scrollIntoView({ behavior: 'smooth' });
});

// Initialize scroll spy
document.addEventListener('DOMContentLoaded', function() {
  const nav = document.createElement('div');
  nav.className = 'form-sections-nav';
  document.body.appendChild(nav);
  updateScrollSpy();
});

document.addEventListener('DOMContentLoaded', function() {
  // Intersection Observer for fade-in animation
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.1,
    rootMargin: '0px'
  });

  // Observe section-3
  const section3 = document.querySelector('.section-3');
  if (section3) {
    observer.observe(section3);
  }
});

// validation.js
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('main-form');
  const inputs = form.querySelectorAll('input, select');
  
  // Add animation classes to form elements
  const animateFormElements = () => {
    document.querySelectorAll('.form-group').forEach((element, index) => {
      element.style.animation = `slideIn 0.5s ease forwards ${index * 0.1}s`;
      element.style.opacity = '0';
    });
  };

  // Validate input fields
  const validateField = (input) => {
    const field = input.parentElement;
    const value = input.value.trim();

    if (input.type === 'email') {
      const emailRegex = /^[a-zA-Z0-9._%+-]+@(mls\.ceu\.edu\.ph|ceu\.edu\.ph)$/;
      if (!emailRegex.test(value)) {
        setError(field, 'Please enter a valid CEU email address');
        return false;
      }
    }

    if (input.required && value === '') {
      setError(field, 'This field is required');
      return false;
    }

    setSuccess(field);
    return true;
  };

  // Set error state
  const setError = (field, message) => {
    field.classList.add('error');
    const error = field.querySelector('.error-message') || document.createElement('div');
    error.className = 'error-message';
    error.innerText = message;
    if (!field.querySelector('.error-message')) {
      field.appendChild(error);
    }
  };

  // Set success state
  const setSuccess = (field) => {
    field.classList.remove('error');
    field.classList.add('success');
    const error = field.querySelector('.error-message');
    if (error) {
      error.remove();
    }
  };

  // Add event listeners
  inputs.forEach(input => {
    input.addEventListener('blur', () => validateField(input));
    input.addEventListener('input', () => validateField(input));
  });

  // Form submission
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    let isValid = true;

    inputs.forEach(input => {
      if (!validateField(input)) {
        isValid = false;
      }
    });

    if (isValid) {
      const submitBtn = form.querySelector('.submit-button');
      submitBtn.classList.add('loading');
      
      // Simulate form submission
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      submitBtn.classList.remove('loading');
      showSuccessMessage();
    }
  });

  animateFormElements();
});

