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


// Show terms popup when checkbox is changed
document.getElementById('terms-checkbox').addEventListener('change', function () {
  if (this.checked) {
    document.getElementById('terms-popup').style.display = 'flex';
    this.checked = false; // Uncheck the checkbox to prevent form submission
  }
});

// Check checkbox and hide popup when agree button is clicked
document.getElementById('agree-button').addEventListener('click', function () {
  document.getElementById('terms-checkbox').checked = true; // Check the checkbox
  document.getElementById('terms-popup').style.display = 'none'; // Hide the popup
});

// Hide popup when close button is clicked
document.getElementById('close-button').addEventListener('click', function () {
  document.getElementById('terms-popup').style.display = 'none'; // Hide the popup
});

// Prevent form submission if terms checkbox is not checked
document.getElementById('main-form').addEventListener('submit', function (event) {
  console.log('Form submit event triggered'); // Debug log
  if (!document.getElementById('terms-checkbox').checked) {
    event.preventDefault(); // Prevent form submission
    alert('You must agree to the Terms and Conditions before submitting.');
    console.log('Form submission prevented'); // Debug log
  }
});
