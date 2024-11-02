document.addEventListener('DOMContentLoaded', async function () {
    const calendar = document.getElementById('calendar');
    const modal = document.getElementById('eventModal');
    const closeModal = document.querySelector('.close');
    const eventList = document.getElementById('eventList');
    const currentMonthYear = document.getElementById('currentMonthYear');
    let currentDate = new Date();
    let fetchedEvents = {}; // Store fetched events

    // Fetch events from the backend
    async function fetchEvents() {
        try {
            const response = await fetch('https://localhost:8000/equipments/get-all-history');
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            const data = await response.json();
            
            if (data.successful && Array.isArray(data.history)) {
                fetchedEvents = {}; // Reset fetchedEvents
                data.history.forEach(event => {
                    const dateKey = new Date(event.requested).toISOString().split('T')[0];
                    if (!fetchedEvents[dateKey]) {
                        fetchedEvents[dateKey] = [];
                    }
                    fetchedEvents[dateKey].push({
                        equipmentCategoryId: event.equipment_category_id,
                        categoryName: event.category_name,
                        requestId: event.request_id,
                        firstName: event.first_name,
                        lastName: event.last_name,
                        department: event.department,
                        natureOfService: event.nature_of_service,
                        purpose: event.purpose,
                        venue: event.venue,
                        quantityRequested: event.quantity_requested,
                        status: event.status
                    });
                });
            } else {
                console.error('Unexpected data format:', data);
            }
        } catch (error) {
            console.error('Error fetching events:', error);
        }
    }

    async function renderCalendar() {
        calendar.innerHTML = '';  // Clear previous calendar
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        
        currentMonthYear.innerText = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
        
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        
        // Add blank spaces for days before the 1st of the month
        for (let i = 0; i < firstDay; i++) {
            const blankDiv = document.createElement('div');
            blankDiv.classList.add('blank-day');
            calendar.appendChild(blankDiv);
        }

        // Fill in the days of the month
        for (let i = 1; i <= daysInMonth; i++) {
            const dayDiv = document.createElement('div');
            dayDiv.classList.add('day');
            const date = new Date(year, month, i);
            const dateKey = date.toISOString().split('T')[0];
            dayDiv.innerHTML = `<div>${i}</div>`;
            dayDiv.dataset.date = dateKey;

            // Highlight the day if it exists in fetched events
            if (fetchedEvents[dateKey] && fetchedEvents[dateKey].length > 0) {
                dayDiv.style.backgroundColor = 'lightcoral';
                dayDiv.classList.add('has-event');
                dayDiv.addEventListener('click', () => openModal(dateKey));
            }

            calendar.appendChild(dayDiv);
        }
    }

    // Open modal and display events for the selected date
    function openModal(dateKey) {
        const events = fetchedEvents[dateKey];
        if (events && events.length > 0) {
            eventList.innerHTML = ''; // Clear previous events
            events.forEach(event => {
                const eventItem = document.createElement('div');
                eventItem.classList.add('event-item');
                eventItem.innerHTML = `
                    <h4>Request ID: ${event.requestId}</h4>
                    <p><strong>Name:</strong> ${event.firstName} ${event.lastName}</p>
                    <p><strong>Department:</strong> ${event.department}</p>
                    <p><strong>Nature of Service:</strong> ${event.natureOfService}</p>
                    <p><strong>Purpose:</strong> ${event.purpose}</p>
                    <p><strong>Venue:</strong> ${event.venue}</p>
                    <p><strong>Equipment Category:</strong> ${event.categoryName} (ID: ${event.equipmentCategoryId})</p>
                    <p><strong>Quantity Requested:</strong> ${event.quantityRequested}</p>
                    <p><strong>Status:</strong> ${event.status}</p>
                    <hr/>
                `;
                eventList.appendChild(eventItem);
            });
            modal.style.display = 'block';
        }
    }

    // Close the modal
    closeModal.addEventListener('click', function () {
        modal.style.display = 'none';
    });

    // Close the modal when clicking outside of the modal content
    window.addEventListener('click', function (event) {
        if (event.target == modal) {
            modal.style.display = 'none';
        }
    });

    // Navigation for previous and next months
    document.getElementById('prevMonth').addEventListener('click', async function () {
        currentDate.setMonth(currentDate.getMonth() - 1);
        await fetchEvents();
        renderCalendar();
    });

    document.getElementById('nextMonth').addEventListener('click', async function () {
        currentDate.setMonth(currentDate.getMonth() + 1);
        await fetchEvents();
        renderCalendar();
    });

    // Initialize calendar
    await fetchEvents();
    renderCalendar();
});