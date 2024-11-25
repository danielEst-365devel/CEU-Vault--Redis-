document.addEventListener('DOMContentLoaded', async function () {
    const calendar = document.getElementById('calendar');
    const eventModal = $('#eventModal'); // Use jQuery for Bootstrap modal
    const eventList = document.getElementById('eventList');
    const currentMonthYear = document.getElementById('currentMonthYear');
    let currentDate = new Date();
    let fetchedEvents = {}; // Store fetched events
    let isShowingActiveOnly = false; // New state variable
    let activeEvents = {}; // Store active events separately

    // Remove toggle creation code and add event listener to existing HTML toggle
    document.getElementById('activeToggle').addEventListener('change', async function(e) {
        isShowingActiveOnly = e.target.checked;
        await fetchEvents();
        renderCalendar();
    });

    // Modify the fetchEvents function
    async function fetchEvents() {
        try {
            if (!isShowingActiveOnly) {
                // Fetch both active and all history
                const [allResponse, activeResponse] = await Promise.all([
                    fetch('/admin/get-all-history'),
                    fetch('/admin/get-active-requests')
                ]);

                const [allData, activeData] = await Promise.all([
                    allResponse.json(),
                    activeResponse.json()
                ]);

                // Process all history
                fetchedEvents = {};
                if (allData.successful && Array.isArray(allData.history)) {
                    processEvents(allData.history, fetchedEvents);
                }

                // Store active events separately
                activeEvents = {};
                if (activeData.successful && Array.isArray(activeData.history)) {
                    processEvents(activeData.history, activeEvents);
                }
            } else {
                // Fetch only active requests
                const response = await fetch('/admin/get-active-requests');
                const data = await response.json();
                fetchedEvents = {};
                if (data.successful && Array.isArray(data.history)) {
                    processEvents(data.history, fetchedEvents);
                }
            }
        } catch (error) {
            console.error('Error fetching events:', error);
        }
    }

    // Helper function to process events
    function processEvents(events, storage) {
        events.forEach(event => {
            const eventDate = new Date(event.requested);
            const dateKey = eventDate.toLocaleDateString('en-CA');
            
            if (!storage[dateKey]) {
                storage[dateKey] = [];
            }
            storage[dateKey].push({
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
    }

    // Modify the renderCalendar function
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
            blankDiv.classList.add('blank-day', 'col'); // Added 'col' for Bootstrap grid
            calendar.appendChild(blankDiv);
        }

        // Fill in the days of the month
        for (let i = 1; i <= daysInMonth; i++) {
            const dayDiv = document.createElement('div');
            dayDiv.classList.add('day', 'col', 'border'); // Added 'col' and 'border' for visibility
            
            // Create date in local timezone
            const date = new Date(year, month, i);
            const dateKey = date.toLocaleDateString('en-CA'); // Uses YYYY-MM-DD format
            
            dayDiv.innerHTML = `<div class="text-center">${i}</div>`;
            dayDiv.dataset.date = dateKey;

            // Update the renderCalendar function in app.js

            // Highlight the day based on event statuses
            if (fetchedEvents[dateKey] && fetchedEvents[dateKey].length > 0) {
                const events = fetchedEvents[dateKey];
                const hasActiveEvents = isShowingActiveOnly || 
                    (activeEvents[dateKey] && activeEvents[dateKey].length > 0);
                
                if (hasActiveEvents) {
                    dayDiv.classList.add('has-event', 'active-events');
                } else {
                    const allCancelled = events.every(event => 
                        ['returned', 'cancelled'].includes(event.status.toLowerCase())
                    );
                    if (allCancelled) {
                        dayDiv.classList.add('has-event', 'all-cancelled');
                    } else {
                        dayDiv.classList.add('has-event', 'active-events');
                    }
                }
                dayDiv.style.cursor = 'pointer';
                dayDiv.addEventListener('click', () => openModal(dateKey));
            }

            calendar.appendChild(dayDiv);
        }
    }

    // Open modal and display events for the selected date
    function openModal(dateKey) {
        const events = fetchedEvents[dateKey];
        if (events && events.length > 0) {
            const eventList = document.getElementById('eventList'); // Moved inside the function
            eventList.innerHTML = ''; // Clear previous events
            events.forEach(event => {
                const eventItem = document.createElement('div');
                eventItem.classList.add('card', 'mb-3', 'shadow-sm');
                eventItem.innerHTML = `
                    <div class="card-body">
                        <h5 class="card-title text-primary">Request ID: ${event.requestId}</h5>
                        <h6 class="card-subtitle mb-2 text-muted">${event.firstName} ${event.lastName}</h6>
                        <p class="card-text"><strong>Department:</strong> ${event.department}</p>
                        <p class="card-text"><strong>Nature of Service:</strong> ${event.natureOfService}</p>
                        <p class="card-text"><strong>Purpose:</strong> ${event.purpose}</p>
                        <p class="card-text"><strong>Venue:</strong> ${event.venue}</p>
                        <p class="card-text"><strong>Equipment Category:</strong> ${event.categoryName} (ID: ${event.equipmentCategoryId})</p>
                        <p class="card-text"><strong>Quantity Requested:</strong> ${event.quantityRequested}</p>
                        <p class="card-text"><strong>Status:</strong> <span class="${getStatusBadge(event.status)}">${event.status}</span></p>
                    </div>
                `;
                eventList.appendChild(eventItem);
            });
            // Show Bootstrap modal
            eventModal.modal('show');
            // Disable page scrolling and fix modal position
            document.body.classList.add('body-no-scroll');
            eventModal.addClass('modal-fixed');
        }
    }

    // Close modal and enable page scrolling
    $('.close-modal').on('click', function () {
        eventModal.modal('hide');
    });

    // Also remove the class when modal is hidden by backdrop click or ESC key
    $('#eventModal').on('hidden.bs.modal', function () {
        document.body.classList.remove('body-no-scroll');
        eventModal.removeClass('modal-fixed');
    });

    // Helper function to assign badge classes based on status
    function getStatusBadge(status) {
        switch (status.toLowerCase()) {
            case 'approved':
                return 'badge badge-sm bg-gradient-success';
            case 'pending':
                return 'badge badge-sm bg-gradient-secondary';
            case 'ongoing':
                return 'badge badge-sm bg-gradient-info';
            case 'cancelled':
                return 'badge badge-sm bg-gradient-danger';
            default:
                return 'badge badge-sm bg-gradient-secondary';
        }
    }

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
    (async () => {
        await fetchEvents();
        renderCalendar();
    })();
});