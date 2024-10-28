document.addEventListener('DOMContentLoaded', function () {
    const calendar = document.getElementById('calendar');
    const modal = document.getElementById('eventModal');
    const closeModal = document.querySelector('.close');
    const saveEvent = document.getElementById('saveEvent');
    let selectedDateElement = null;
    let events = {};  // Store events in an object
    const currentMonthYear = document.getElementById('currentMonthYear');
    let currentDate = new Date();

    function renderCalendar() {
        calendar.innerHTML = '';  // Clear previous calendar
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        
        currentMonthYear.innerText = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
        
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        
        // Add blank spaces for days before the 1st of the month
        for (let i = 0; i < firstDay; i++) {
            const blankDiv = document.createElement('div');
            calendar.appendChild(blankDiv);
        }

        // Fill in the days of the month
        for (let i = 1; i <= daysInMonth; i++) {
            const dayDiv = document.createElement('div');
            dayDiv.classList.add('day');
            dayDiv.innerHTML = `<div>${i}</div>`;
            dayDiv.addEventListener('click', function () {
                selectedDateElement = dayDiv;
                modal.style.display = 'block';
            });

            // Display event if exists
            if (events[`${year}-${month}-${i}`]) {
                const eventDiv = document.createElement('div');
                eventDiv.classList.add('event');
                eventDiv.innerText = events[`${year}-${month}-${i}`];
                dayDiv.appendChild(eventDiv);
            }

            calendar.appendChild(dayDiv);
        }
    }

    // Close the modal
    closeModal.addEventListener('click', function () {
        modal.style.display = 'none';
    });

    // Save event to the selected date
    saveEvent.addEventListener('click', function () {
        const eventText = document.getElementById('eventText').value;
        const selectedDay = selectedDateElement.querySelector('div').innerText;
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        
        if (eventText) {
            // Save event to the events object
            events[`${year}-${month}-${selectedDay}`] = eventText;

            // Display the event under the selected date
            const eventDiv = document.createElement('div');
            eventDiv.classList.add('event');
            eventDiv.innerText = eventText;
            selectedDateElement.appendChild(eventDiv);

            // Close modal and clear input
            modal.style.display = 'none';
            document.getElementById('eventText').value = '';
        }
    });

    // Close the modal when clicking outside of the modal content
    window.addEventListener('click', function (event) {
        if (event.target == modal) {
            modal.style.display = 'none';
        }
    });

    // Navigation for previous and next months
    document.getElementById('prevMonth').addEventListener('click', function () {
        currentDate.setMonth(currentDate.getMonth() - 1);
        renderCalendar();
    });

    document.getElementById('nextMonth').addEventListener('click', function () {
        currentDate.setMonth(currentDate.getMonth() + 1);
        renderCalendar();
    });

    // Initialize calendar for the current month
    renderCalendar();
});
