document.addEventListener('DOMContentLoaded', () => {
    // --- STATE MANAGEMENT ---
    let assignments = [];
    // NEW STRUCTURE: {"math": {name: "Math", color: "#ff0000"}}
    let subjects = {}; 
    let bannerColor = '#4a90e2'; // NEW for theme
    let currentView = 'list';
    let calendarDate = new Date(); 

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
    // This is now a <select> element
    const assignmentSubject = document.getElementById('assignment-subject'); 
    const dueDate = document.getElementById('due-date');
    // subjectColor and subjectDatalist are removed

    // Settings Modal
    const settingsBtn = document.getElementById('settings-btn');
    const settingsModal = document.getElementById('settings-modal');
    const closeSettingsModalBtn = document.getElementById('close-settings-modal-btn');
    const subjectForm = document.getElementById('subject-form');
    const newSubjectName = document.getElementById('new-subject-name');
    const newSubjectColor = document.getElementById('new-subject-color');
    const subjectManagerList = document.getElementById('subject-manager-list');
    const bannerColorInput = document.getElementById('banner-color'); // NEW

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
        localStorage.setItem('bannerColor', bannerColor); // NEW
    }

    function loadAllData() {
        const loadedAssignments = JSON.parse(localStorage.getItem('assignments')) || [];
        assignments = loadedAssignments.map(a => ({
            ...a,
            isComplete: a.isComplete || false,
            completionDate: a.completionDate || null
        }));
        
        subjects = JSON.parse(localStorage.getItem('subjects')) || {};
        bannerColor = localStorage.getItem('bannerColor') || '#4a90e2'; // NEW
        
        applyBannerColor(bannerColor); // NEW: Apply theme on load
    }

    // --- UTILITY FUNCTIONS ---
    function formatDate(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString + 'T00:00:00'); 
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
        return data.sort((a, b) => b.completionDate - a.completionDate);
    }

    // --- NEW: THEME/COLOR FUNCTIONS ---
    function applyBannerColor(hex) {
        document.documentElement.style.setProperty('--primary-color', hex);
        // Calculate and set a darker version for the nav
        const darkColor = darkenColor(hex, 15);
        document.documentElement.style.setProperty('--primary-dark', darkColor);
    }

    function handleBannerColorChange(e) {
        const newColor = e.target.value;
        bannerColor = newColor;
        applyBannerColor(newColor);
        saveAllData();
    }

    // Utility to calculate a darker shade
    function darkenColor(hex, percent) {
        let r = parseInt(hex.substr(1, 2), 16);
        let g = parseInt(hex.substr(3, 2), 16);
        let b = parseInt(hex.substr(5, 2), 16);

        r = Math.floor(r * (100 - percent) / 100);
        g = Math.floor(g * (100 - percent) / 100);
        b = Math.floor(b * (100 - percent) / 100);

        return `#${(r < 0 ? 0 : r).toString(16).padStart(2, '0')}${(g < 0 ? 0 : g).toString(16).padStart(2, '0')}${(b < 0 ? 0 : b).toString(16).padStart(2, '0')}`;
    }

    // --- FORM MODAL FUNCTIONS ---

    // NEW: Populates the <select> dropdown
    function updateSubjectDropdown() {
        // Clear all but the first (disabled) option
        while (assignmentSubject.options.length > 1) {
            assignmentSubject.remove(1);
        }
        
        Object.keys(subjects).sort().forEach(subjectKey => {
            const subject = subjects[subjectKey];
            const option = document.createElement('option');
            option.value = subjectKey; // Use the lowercase key as the value
            option.textContent = subject.name; // Use the display name as the text
            assignmentSubject.appendChild(option);
        });
    }

    function openFormModal(assignment = null) {
        assignmentForm.reset();
        updateSubjectDropdown(); // ALWAYS update dropdown with latest subjects

        if (assignment) {
            // Edit mode
            formModalTitle.textContent = 'Edit Assignment';
            assignmentId.value = assignment.id;
            assignmentName.value = assignment.name;
            assignmentSubject.value = assignment.subjectKey; // Set dropdown
            dueDate.value = assignment.date;
        } else {
            // Add mode
            formModalTitle.textContent = 'New Assignment';
            assignmentId.value = '';
            // Form is already reset, dropdown is populated
        }
        formModal.classList.add('visible');
    }

    function closeFormModal() {
        formModal.classList.remove('visible');
    }

    function handleFormSubmit(e) {
        e.preventDefault();
        
        const id = assignmentId.value ? parseInt(assignmentId.value) : Date.now();
        const subjectKey = assignmentSubject.value; // Get key from dropdown

        if (!subjectKey) { // Check if they selected a subject
            alert('Please select a subject. You can add subjects in Settings.');
            return;
        }

        const existingAssignment = assignments.find(a => a.id === id);

        // NEW: Assignment only stores the key
        const newAssignment = {
            id: id,
            name: assignmentName.value.trim(),
            subjectKey: subjectKey, // Store the key, not the name/color
            date: dueDate.value, 
            isComplete: existingAssignment ? existingAssignment.isComplete : false,
            completionDate: existingAssignment ? existingAssignment.completionDate : null,
        };

        const existingIndex = assignments.findIndex(a => a.id === id);
        if (existingIndex > -1) {
            assignments[existingIndex] = newAssignment;
        } else {
            assignments.push(newAssignment);
        }

        saveAllData();
        renderCurrentView();
        closeFormModal();
    }

    // --- SETTINGS MODAL FUNCTIONS ---
    function openSettingsModal() {
        renderSettings();
        bannerColorInput.value = bannerColor; // Set theme picker
        settingsModal.classList.add('visible');
    }

    function closeSettingsModal() {
        settingsModal.classList.remove('visible');
    }

    function renderSettings() {
        subjectManagerList.innerHTML = ''; 
        if (Object.keys(subjects).length === 0) {
            subjectManagerList.innerHTML = '<p>No subjects preloaded yet.</p>';
            return;
        }

        // NEW: Loop and get data from new object structure
        Object.keys(subjects).sort().forEach(subjectKey => {
            const subjectData = subjects[subjectKey];
            const item = document.createElement('div');
            item.className = 'subject-list-item';
            item.innerHTML = `
                <span class="subject-list-color" style="background-color: ${subjectData.color};"></span>
                <span class="subject-list-name">${subjectData.name}</span>
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
        if (!name) return;

        // NEW: Save as an object, using lowercase key
        subjects[name.toLowerCase()] = { name: name, color: color };
        
        saveAllData();
        renderSettings(); // Re-render settings list

        newSubjectName.value = ''; 
        newSubjectColor.value = '#56a3e2'; 
    }

    function deleteSubject(subjectKey) {
        if (confirm(`Are you sure you want to delete "${subjects[subjectKey].name}"? This won't delete existing assignments, but they will show as "Unknown Subject" if not re-added.`)) {
            delete subjects[subjectKey];
            saveAllData();
            renderSettings();
        }
    }

    // --- ASSIGNMENT CARD & ACTIONS ---
    function createAssignmentCard(assignment) {
        const card = document.createElement('div');
        card.className = 'assignment-card';
        card.dataset.id = assignment.id;
        
        // NEW: Look up subject data
        const subjectData = subjects[assignment.subjectKey] || { name: 'Unknown Subject', color: '#aaaaaa' };
        
        card.style.setProperty('--subject-color', subjectData.color);
        if (assignment.isComplete) {
            card.classList.add('completed');
        }

        card.innerHTML = `
            <input type="checkbox" class="assignment-checkbox" ${assignment.isComplete ? 'checked' : ''} aria-label="Mark as complete">
            <div class="assignment-card-content">
                <h3>${assignment.name}</h3>
                <p>${subjectData.name}</p> </div>
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
        if (!card) return;
        
        const id = parseInt(card.dataset.id);

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
        
        if (e.target.closest('.assignment-checkbox')) {
            const assignment = assignments.find(a => a.id === id);
            if (assignment) {
                assignment.isComplete = !assignment.isComplete;
                assignment.completionDate = assignment.isComplete ? Date.now() : null; 
                saveAllData();
                renderCurrentView(); 
            }
            return;
        }
    }

    // --- VIEW RENDERING FUNCTIONS ---

    // 1. Render Checklist View (Unchanged logic, but createAssignmentCard is updated)
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

        if (todo.length > 0) {
            todo.forEach(assignment => {
                container.appendChild(createAssignmentCard(assignment));
            });
        } else {
            container.innerHTML = createEmptyState("All caught up!", "check_circle_outline");
        }

        if (done.length > 0) {
            const divider = document.createElement('h2');
            divider.className = 'list-divider-header';
            divider.textContent = 'Recently Completed';
            container.appendChild(divider);

            const recentlyDone = done.slice(0, 5);
            recentlyDone.forEach(assignment => {
                container.appendChild(createAssignmentCard(assignment));
            });
        }
        
        appContainer.appendChild(container);
    }

    // 2. Render Subject View
    function renderBySubject() {
        appContainer.innerHTML = '';
        const container = document.createElement('div');
        container.className = 'view-container-subject';

        const incompleteAssignments = assignments.filter(a => !a.isComplete);

        if (incompleteAssignments.length === 0) {
            appContainer.innerHTML = createEmptyState("No assignments found.", "category");
            return;
        }

        // NEW: Group by subjectKey
        const grouped = incompleteAssignments.reduce((acc, assignment) => {
            (acc[assignment.subjectKey] = acc[assignment.subjectKey] || []).push(assignment);
            return acc;
        }, {});

        const sortedSubjects = Object.keys(grouped).sort();

        sortedSubjects.forEach(subjectKey => {
            // NEW: Look up subject data
            const subjectData = subjects[subjectKey] || { name: 'Unknown Subject', color: '#aaaaaa' };
            const group = grouped[subjectKey];

            const groupContainer = document.createElement('div');
            groupContainer.className = 'subject-group';
            groupContainer.style.setProperty('--subject-color', subjectData.color);

            groupContainer.innerHTML = `<div class="subject-header"><h2>${subjectData.name}</h2></div>`;
            
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

    function renderCalendar(date, type) {
        appContainer.innerHTML = '';
        const container = document.createElement('div');
        container.className = 'view-container-calendar';

        const today = new Date();
        const todayISO = getISOString(today);

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
        } else { 
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

                const dayAssignments = assignments.filter(a => a.date === dayISO && !a.isComplete);
                dayAssignments.forEach(a => {
                    // NEW: Look up subject data
                    const subjectData = subjects[a.subjectKey] || { name: 'Unknown', color: '#aaaaaa' };
                    const assignEl = document.createElement('div');
                    assignEl.className = 'calendar-assignment';
                    assignEl.style.setProperty('--subject-color', subjectData.color);
                    assignEl.textContent = a.name;
                    assignEl.title = `${a.name} (${subjectData.name})`; // Use looked-up name
                    assignEl.dataset.id = a.id;
                    assignmentsList.appendChild(assignEl);
                });
                dayCell.appendChild(assignmentsList);
            }
            calendarGrid.appendChild(dayCell);
        });

        container.appendChild(calendarGrid);

        document.getElementById('prev-btn').addEventListener('click', () => changeCalendarPeriod(-1, type));
        document.getElementById('next-btn').addEventListener('click', () => changeCalendarPeriod(1, type));
    }

    function changeCalendarPeriod(direction, type) {
        if (type === 'month') {
            calendarDate.setMonth(calendarDate.getMonth() + direction);
        } else {
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
    
    viewButtons.list.addEventListener('click', () => setView('list'));
    viewButtons.subject.addEventListener('click', () => setView('subject'));
    viewButtons.month.addEventListener('click', () => setView('month'));
    viewButtons.week.addEventListener('click', () => setView('week'));
    
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

    assignmentForm.addEventListener('submit', handleFormSubmit);
    subjectForm.addEventListener('submit', handleSubjectFormSubmit);
    bannerColorInput.addEventListener('input', handleBannerColorChange); // NEW
    
    appContainer.addEventListener('click', (e) => {
        handleCardClick(e);
        
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
New:
        }
    });

    // --- INITIALIZE APP ---
    loadAllData();
    renderCurrentView();
});