document.addEventListener('DOMContentLoaded', () => {
    // --- STATE MANAGEMENT ---
    let assignments = [];
    let subjects = {}; // To store subject colors { "math": "#ff0000" }
    let currentView = 'list';
    let calendarDate = new Date(); // Date for calendar views

    // --- DOM SELECTORS ---
    const appContainer = document.getElementById('app-container');
    const fab = document.getElementById('add-assignment-btn');
    
    // Form Modal
    const formModal = document.getElementById('form-modal');
    const closeFormModalBtn = document.getElementById('close-form-modal-btn');
    const assignmentForm = document.getElementById('assignment-form');
    const formModalTitle = document.getElementById('form-modal-title');
    const assignmentId = document.getElementById('assignment-id');
    const assignmentName = document.getElementById('assignment-name');
    const assignmentSubject = document.getElementById('assignment-subject');
    const subjectColor = document.getElementById('subject-color');
    const dueDate = document.getElementById('due-date');
    const subjectDatalist = document.getElementById('subject-list');

    // Settings Modal
    const settingsBtn = document.getElementById('settings-btn');
    const settingsModal = document.getElementById('settings-modal');
    const closeSettingsModalBtn = document.getElementById('close-settings-modal-btn');
    const subjectForm = document.getElementById('subject-form');
    const newSubjectName = document.getElementById('new-subject-name');
    const newSubjectColor = document.getElementById('new-subject-color');
    const subjectManagerList = document.getElementById('subject-manager-list');

    // View Switcher Buttons
    const viewButtons = {
        list: document.getElementById('view-list'),
        subject: document.getElementById('view-subject'),
        month: document.getElementById('view-month'),
        week: document.getElementById('view-week'),
    };

    // --- DATA FUNCTIONS (LocalStorage) ---
    function saveAllData() {
        localStorage.setItem('assignments', JSON.stringify(assignments));
        localStorage.setItem('subjects', JSON.stringify(subjects));
    }

    function loadAllData() {
        // Add default properties for completion to any existing assignments
        const loadedAssignments = JSON.parse(localStorage.getItem('assignments')) || [];
        assignments = loadedAssignments.map(a => ({
            ...a,
            isComplete: a.isComplete || false,
            completionDate: a.completionDate || null
        }));
        
        subjects = JSON.parse(localStorage.getItem('subjects')) || {};
        updateSubjectDatalist();
    }

    // --- UTILITY FUNCTIONS ---
    function formatDate(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString + 'T00:00:00'); // Fix timezone issue
        return date.toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
    }

    function getISOString(date) {
        return date.toISOString().split('T')[0];
    }
    
    function sortAssignmentsByDate(data) {
        return data.sort((a, b) => new Date(a.date) - new Date(b.date));
    }

    function sortAssignmentsByCompletion(data) {
        return data.sort((a, b) => b.completionDate - a.completionDate); // Newest first
    }

    // --- FORM MODAL FUNCTIONS ---
    function openFormModal(assignment = null) {
        assignmentForm.reset();
        if (assignment) {
            // Edit mode
            formModalTitle.textContent = 'Edit Assignment';
            assignmentId.value = assignment.id;
            assignmentName.value = assignment.name;
            assignmentSubject.value = assignment.subject;
            subjectColor.value = assignment.color;
            dueDate.value = assignment.date;
        } else {
            // Add mode
            formModalTitle.textContent = 'New Assignment';
            assignmentId.value = '';
            // Auto-fill color if subject is known
            handleSubjectInput();
        }
        formModal.classList.add('visible');
    }

    function closeFormModal() {
        formModal.classList.remove('visible');
    }

    function handleFormSubmit(e) {
        e.preventDefault();
        
        const id = assignmentId.value ? parseInt(assignmentId.value) : Date.now();
        const subjectName = assignmentSubject.value.trim();
        const color = subjectColor.value;

        // Find existing assignment to preserve completion status
        const existingAssignment = assignments.find(a => a.id === id);

        const newAssignment = {
            id: id,
            name: assignmentName.value.trim(),
            subject: subjectName,
            color: color,
            date: dueDate.value, // YYYY-MM-DD
            isComplete: existingAssignment ? existingAssignment.isComplete : false,
            completionDate: existingAssignment ? existingAssignment.completionDate : null,
        };

        // Update or add assignment
        const existingIndex = assignments.findIndex(a => a.id === id);
        if (existingIndex > -1) {
            assignments[existingIndex] = newAssignment;
        } else {
            assignments.push(newAssignment);
        }

        // Save subject and color (use lowercase for reliable key)
        subjects[subjectName.toLowerCase()] = color;
        
        saveAllData();
        updateSubjectDatalist();
        renderCurrentView();
        closeFormModal();
    }

    function handleSubjectInput() {
        // Auto-fill color if subject is known
        const subjectName = assignmentSubject.value.trim().toLowerCase();
        if (subjects[subjectName]) {
            subjectColor.value = subjects[subjectName];
        }
    }

    function updateSubjectDatalist() {
        subjectDatalist.innerHTML = '';
        Object.keys(subjects).forEach(subjectKey => {
            // Capitalize first letter for display
            const subjectName = subjectKey.charAt(0).toUpperCase() + subjectKey.slice(1);
            const option = document.createElement('option');
            option.value = subjectName;
            subjectDatalist.appendChild(option);
        });
    }

    // --- SETTINGS MODAL FUNCTIONS ---
    function openSettingsModal() {
        renderSettings();
        settingsModal.classList.add('visible');
    }

    function closeSettingsModal() {
        settingsModal.classList.remove('visible');
    }

    function renderSettings() {
        subjectManagerList.innerHTML = ''; // Clear list
        if (Object.keys(subjects).length === 0) {
            subjectManagerList.innerHTML = '<p>No subjects preloaded yet.</p>';
            return;
        }

        Object.keys(subjects).sort().forEach(subjectKey => {
            const color = subjects[subjectKey];
            // Capitalize first letter for display
            const subjectName = subjectKey.charAt(0).toUpperCase() + subjectKey.slice(1);
            
            const item = document.createElement('div');
            item.className = 'subject-list-item';
            item.innerHTML = `
                <span class="subject-list-color" style="background-color: ${color};"></span>
                <span class="subject-list-name">${subjectName}</span>
                <button class="action-btn delete" data-subject-key="${subjectKey}" aria-label="Delete Subject">
                    <span class="material-icons-outlined">delete_outline</span>
                </button>
            `;
            subjectManagerList.appendChild(item);
        });
    }

    function handleSubjectFormSubmit(e) {
        e.preventDefault();
        const name = newSubjectName.value.trim();
        const color = newSubjectColor.value;
        if (!name) return; // Don't add empty subject

        subjects[name.toLowerCase()] = color; // Save with lowercase key
        
        saveAllData();
        renderSettings(); // Re-render settings list
        updateSubjectDatalist(); // Update form datalist

        newSubjectName.value = ''; // Clear form
        newSubjectColor.value = '#56a3e2'; // Reset color
    }

    function deleteSubject(subjectKey) {
        if (confirm(`Are you sure you want to delete this subject? This won't delete assignments, but will remove the preloaded color.`)) {
            delete subjects[subjectKey];
            saveAllData();
            renderSettings();
            updateSubjectDatalist();
        }
    }

    // --- ASSIGNMENT CARD & ACTIONS ---
    function createAssignmentCard(assignment) {
        const card = document.createElement('div');
        card.className = 'assignment-card';
        card.dataset.id = assignment.id;
        card.style.setProperty('--subject-color', assignment.color);
        if (assignment.isComplete) {
            card.classList.add('completed');
        }

        card.innerHTML = `
            <input type="checkbox" class="assignment-checkbox" ${assignment.isComplete ? 'checked' : ''} aria-label="Mark as complete">
            <div class="assignment-card-content">
                <h3>${assignment.name}</h3>
                <p>${assignment.subject}</p>
            </div>
            <div class="assignment-due-date">
                ${formatDate(assignment.date)}
            </div>
            <div class="assignment-actions">
                <button class="action-btn edit" aria-label="Edit">
                    <span class="material-icons-outlined">edit</span>
                </button>
                <button class="action-btn delete" aria-label="Delete">
                    <span class="material-icons-outlined">delete_outline</span>
                </button>
            </div>
        `;
        return card;
    }

    function createEmptyState(message, icon) {
        return `
            <div class="empty-state">
                <span class="material-icons-outlined">${icon}</span>
                <p>${message}</p>
            </div>
        `;
    }

    function handleCardClick(e) {
        const card = e.target.closest('.assignment-card');
        if (!card) return; // Click was not on a card
        
        const id = parseInt(card.dataset.id);

        // Check for action buttons
        if (e.target.closest('.action-btn.edit')) {
            const assignmentToEdit = assignments.find(a => a.id === id);
            if (assignmentToEdit) openFormModal(assignmentToEdit);
            return;
        }

        if (e.target.closest('.action-btn.delete')) {
            if (confirm('Are you sure you want to delete this assignment?')) {
                assignments = assignments.filter(a => a.id !== id);
                saveAllData();
                renderCurrentView();
            }
            return;
        }
        
        // Check for checkbox click
        if (e.target.closest('.assignment-checkbox')) {
            const assignment = assignments.find(a => a.id === id);
            if (assignment) {
                assignment.isComplete = !assignment.isComplete; // Toggle status
                assignment.completionDate = assignment.isComplete ? Date.now() : null; // Set/unset completion timestamp
                saveAllData();
                renderCurrentView(); // Re-render to sort and update lists
            }
            return;
        }
    }

    // --- VIEW RENDERING FUNCTIONS ---

    // 1. Render Checklist View
    function renderChecklist() {
        appContainer.innerHTML = '';
        const container = document.createElement('div');
        container.className = 'view-container-list';

        const todo = sortAssignmentsByDate(assignments.filter(a => !a.isComplete));
        const done = sortAssignmentsByCompletion(assignments.filter(a => a.isComplete));

        if (todo.length === 0 && done.length === 0) {
            appContainer.innerHTML = createEmptyState("No assignments yet. Click '+' to add one.", "assignment");
            return;
        }

        // Render To-Do list
        if (todo.length > 0) {
            todo.forEach(assignment => {
                container.appendChild(createAssignmentCard(assignment));
            });
        } else {
            container.innerHTML = createEmptyState("All caught up!", "check_circle_outline");
        }

        // Render "Recently Completed" list
        if (done.length > 0) {
            const divider = document.createElement('h2');
            divider.className = 'list-divider-header';
            divider.textContent = 'Recently Completed';
            container.appendChild(divider);

            const recentlyDone = done.slice(0, 5); // Only show last 5
            recentlyDone.forEach(assignment => {
                container.appendChild(createAssignmentCard(assignment));
            });
        }
        
        appContainer.appendChild(container);
    }

    // 2. Render Subject View (Now only shows *incomplete* assignments)
    function renderBySubject() {
        appContainer.innerHTML = '';
        const container = document.createElement('div');
        container.className = 'view-container-subject';

        const incompleteAssignments = assignments.filter(a => !a.isComplete);

        if (incompleteAssignments.length === 0) {
            appContainer.innerHTML = createEmptyState("No assignments found.", "category");
            return;
        }

        const grouped = incompleteAssignments.reduce((acc, assignment) => {
            (acc[assignment.subject] = acc[assignment.subject] || []).push(assignment);
            return acc;
        }, {});

        const sortedSubjects = Object.keys(grouped).sort();

        sortedSubjects.forEach(subject => {
            const group = grouped[subject];
            const subjectColor = group[0].color;

            const groupContainer = document.createElement('div');
            groupContainer.className = 'subject-group';
            groupContainer.style.setProperty('--subject-color', subjectColor);

            groupContainer.innerHTML = `<div class="subject-header"><h2>${subject}</h2></div>`;
            
            const assignmentsContainer = document.createElement('div');
            assignmentsContainer.className = 'subject-assignments';
            
            const sortedGroup = sortAssignmentsByDate(group);
            sortedGroup.forEach(assignment => {
                assignmentsContainer.appendChild(createAssignmentCard(assignment));
            });
            
            groupContainer.appendChild(assignmentsContainer);
            container.appendChild(groupContainer);
        });

        appContainer.appendChild(container);
    }

    // 3. Render Monthly Calendar View
    function renderMonthlyCalendar() {
        renderCalendar(calendarDate, 'month');
    }

    // 4. Render Two-Week View
    function renderTwoWeek() {
        renderCalendar(calendarDate, 'week');
    }

    // (This function is large but mostly unchanged, just shows *incomplete* assignments)
    function renderCalendar(date, type) {
        appContainer.innerHTML = '';
        const container = document.createElement('div');
        container.className = 'view-container-calendar';

        const today = new Date();
        const todayISO = getISOString(today);

        // --- Calendar Header (Nav) ---
        const calendarHeader = document.createElement('div');
        calendarHeader.className = 'calendar-header';
        
        const monthYear = date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
        let title = monthYear;
        if (type === 'week') {
            const endDate = new Date(date);
            endDate.setDate(date.getDate() + 13);
            title = `${date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;
        }
        
        calendarHeader.innerHTML = `
            <button class="calendar-nav" id="prev-btn" aria-label="Previous Period">&lt;</button>
            <h2>${title}</h2>
            <button class="calendar-nav" id="next-btn" aria-label="Next Period">&gt;</button>
        `;
        container.appendChild(calendarHeader);

        // --- Calendar Grid ---
        const calendarGrid = document.createElement('div');
        calendarGrid.className = 'calendar-grid';
        const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        weekdays.forEach(day => {
            calendarGrid.innerHTML += `<div class="calendar-day-header">${day}</div>`;
        });

        let days = [];
        if (type === 'month') {
            const year = date.getFullYear();
            const month = date.getMonth();
            const firstDay = new Date(year, month, 1);
            const lastDay = new Date(year, month + 1, 0);
            for (let i = 0; i < firstDay.getDay(); i++) {
                days.push({ date: null, isOtherMonth: true });
            }
            for (let i = 1; i <= lastDay.getDate(); i++) {
                days.push({ date: new Date(year, month, i), isOtherMonth: false });
            }
        } else { // type === 'week'
            for (let i = 0; i < 14; i++) {
                const day = new Date(date);
                day.setDate(date.getDate() + i);
                days.push({ date: day, isOtherMonth: false });
            }
            while (days[0].date.getDay() !== 0) {
                const prevDay = new Date(days[0].date);
                prevDay.setDate(prevDay.getDate() - 1);
                days.unshift({ date: prevDay, isOtherMonth: true });
            }
            days = days.slice(0, 14);
        }

        // Create day cells
        days.forEach(dayData => {
            const dayCell = document.createElement('div');
            dayCell.className = 'calendar-day';
            
            if (dayData.isOtherMonth) {
                dayCell.classList.add('other-month');
                dayCell.innerHTML = `<div class="day-number"></div>`;
            } else {
                const dayISO = getISOString(dayData.date);
                if (dayISO === todayISO) dayCell.classList.add('today');
                
                dayCell.innerHTML = `<div class="day-number">${dayData.date.getDate()}</div>`;
                const assignmentsList = document.createElement('div');
                assignmentsList.className = 'calendar-assignments';

                // Find *incomplete* assignments for this day
                const dayAssignments = assignments.filter(a => a.date === dayISO && !a.isComplete);
                dayAssignments.forEach(a => {
                    const assignEl = document.createElement('div');
                    assignEl.className = 'calendar-assignment';
                    assignEl.style.setProperty('--subject-color', a.color);
                    assignEl.textContent = a.name;
                    assignEl.title = `${a.name} (${a.subject})`;
                    assignEl.dataset.id = a.id;
                    assignmentsList.appendChild(assignEl);
                });
                dayCell.appendChild(assignmentsList);
            }
            calendarGrid.appendChild(dayCell);
        });

        container.appendChild(calendarGrid);
        appContainer.appendChild(container);

        document.getElementById('prev-btn').addEventListener('click', () => changeCalendarPeriod(-1, type));
        document.getElementById('next-btn').addEventListener('click', () => changeCalendarPeriod(1, type));
    }

    function changeCalendarPeriod(direction, type) {
        if (type === 'month') {
            calendarDate.setMonth(calendarDate.getMonth() + direction);
        } else { // type === 'week'
            calendarDate.setDate(calendarDate.getDate() + (direction * 14));
        }
        renderCurrentView();
    }

    // --- GLOBAL RENDER & VIEW SWITCH ---
    function renderCurrentView() {
        if (currentView !== 'month' && currentView !== 'week') {
            calendarDate = new Date();
        }
        Object.values(viewButtons).forEach(btn => btn.classList.remove('active'));
        viewButtons[currentView].classList.add('active');
        
        switch (currentView) {
            case 'list': renderChecklist(); break;
            case 'subject': renderBySubject(); break;
            case 'month': renderMonthlyCalendar(); break;
            case 'week': renderTwoWeek(); break;
            default: renderChecklist();
        }
    }

    function setView(view) {
        currentView = view;
        renderCurrentView();
    }
    
    // --- EVENT LISTENERS ---
    
    // View Switcher
    viewButtons.list.addEventListener('click', () => setView('list'));
    viewButtons.subject.addEventListener('click', () => setView('subject'));
    viewButtons.month.addEventListener('click', () => setView('month'));
    viewButtons.week.addEventListener('click', () => setView('week'));
    
    // Modals
    fab.addEventListener('click', () => openFormModal());
    closeFormModalBtn.addEventListener('click', closeFormModal);
    formModal.addEventListener('click', (e) => {
        if (e.target === formModal) closeFormModal();
    });

    settingsBtn.addEventListener('click', openSettingsModal);
    closeSettingsModalBtn.addEventListener('click', closeSettingsModal);
    settingsModal.addEventListener('click', (e) => {
        if (e.target === settingsModal) closeSettingsModal();
    });

    // Forms
    assignmentForm.addEventListener('submit', handleFormSubmit);
    assignmentSubject.addEventListener('input', handleSubjectInput);
    assignmentSubject.addEventListener('change', handleSubjectInput);
    
    subjectForm.addEventListener('submit', handleSubjectFormSubmit);
    
    // Dynamic Clicks
    appContainer.addEventListener('click', (e) => {
        handleCardClick(e); // Handles checkbox, edit, delete
        
        // Handle clicks on calendar items
        const calendarItem = e.target.closest('.calendar-assignment');
        if (calendarItem) {
            const id = parseInt(calendarItem.dataset.id);
            const assignmentToEdit = assignments.find(a => a.id === id);
            if (assignmentToEdit) openFormModal(assignmentToEdit);
        }
    });

    subjectManagerList.addEventListener('click', (e) => {
        const deleteBtn = e.target.closest('.action-btn.delete');
        if (deleteBtn) {
            deleteSubject(deleteBtn.dataset.subjectKey);
        }
    });

    // --- INITIALIZE APP ---
    loadAllData();
    renderCurrentView();
});