document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const todoTasks = document.getElementById('todo-tasks');
    const inProgressTasks = document.getElementById('in-progress-tasks');
    const doneTasks = document.getElementById('done-tasks');
    const addTaskBtn = document.getElementById('add-task-btn');
    const taskModal = document.getElementById('task-modal');
    const confirmModal = document.getElementById('confirm-modal');
    const exportModal = document.getElementById('export-modal');
    const closeBtns = document.querySelectorAll('.close-btn');
    const cancelTaskBtn = document.getElementById('cancel-task');
    const taskForm = document.getElementById('task-form');
    const searchInput = document.getElementById('search-input');
    const priorityFilter = document.getElementById('priority-filter');
    const clearFiltersBtn = document.getElementById('clear-filters');
    const undoBtn = document.getElementById('undo-btn');
    const redoBtn = document.getElementById('redo-btn');
    const confirmYesBtn = document.getElementById('confirm-yes');
    const confirmNoBtn = document.getElementById('confirm-no');
    const exportBtn = document.getElementById('export-btn');
    const exportConfirmBtn = document.getElementById('export-confirm');
    const exportCancelBtn = document.getElementById('export-cancel');
    const themeToggleBtn = document.getElementById('theme-toggle');
    const advancedSearchBtn = document.getElementById('advanced-search-btn');
    const advancedSearchPanel = document.getElementById('advanced-search-panel');
    
    // Task count elements
    const todoCount = document.getElementById('todo-count');
    const inProgressCount = document.getElementById('in-progress-count');
    const doneCount = document.getElementById('done-count');
    
    // Stats panel elements
    const totalTasksEl = document.getElementById('total-tasks');
    const completedTasksEl = document.getElementById('completed-tasks');
    const overdueTasksEl = document.getElementById('overdue-tasks');
    const avgCompletionEl = document.getElementById('avg-completion');

    // State management
    let tasks = [];
    let editTaskId = null;
    let taskToDelete = null;
    let currentFilter = {
        search: '',
        priority: 'all',
        status: ['todo', 'in-progress', 'done'],
        tags: [],
        dateRange: null
    };
    
    // Task templates
    const taskTemplates = {
        'bug': {
            title: 'Bug: ',
            description: 'Steps to reproduce:\n1. \n2. \n\nExpected behavior:\n\nActual behavior:',
            priority: 'high'
        },
        'feature': {
            title: 'Feature: ',
            description: 'Description:\n\nAcceptance Criteria:\n1. \n2. ',
            priority: 'medium'
        },
        'meeting': {
            title: 'Meeting: ',
            description: 'Agenda:\n\nNotes:\n\nAction Items:',
            priority: 'low'
        }
    };

    // Command pattern for undo/redo
    const commandHistory = {
        history: [],
        future: [],
        execute: function(command) {
            command.execute();
            this.history.push(command);
            this.future = [];
            saveState();
            updateUndoRedoButtons();
        },
        undo: function() {
            if (this.history.length > 0) {
                const command = this.history.pop();
                command.undo();
                this.future.push(command);
                renderTasks();
                saveState();
                updateUndoRedoButtons();
            }
        },
        redo: function() {
            if (this.future.length > 0) {
                const command = this.future.pop();
                command.execute();
                this.history.push(command);
                renderTasks();
                saveState();
                updateUndoRedoButtons();
            }
        },
        clear: function() {
            this.history = [];
            this.future = [];
            updateUndoRedoButtons();
        }
    };

    // Initialize the app
    init();

    function init() {
        loadState();
        setupEventListeners();
        setupDatePickers();
        renderTasks();
        updateStats();
        updateUndoRedoButtons();
        checkPreferredTheme();
    }

    function loadState() {
        // Load tasks from localStorage
        const savedTasks = localStorage.getItem('tasks');
        if (savedTasks) {
            tasks = JSON.parse(savedTasks);
        }
        
        // Load command history
        const savedHistory = localStorage.getItem('commandHistory');
        if (savedHistory) {
            const historyData = JSON.parse(savedHistory);
            commandHistory.history = historyData.history || [];
            commandHistory.future = historyData.future || [];
        }
        
        // Load theme preference
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme) {
            document.documentElement.setAttribute('data-theme', savedTheme);
            updateThemeToggleIcon();
        }
    }

    function setupEventListeners() {
        // Modal controls
        addTaskBtn.addEventListener('click', openAddTaskModal);
        closeBtns.forEach(btn => btn.addEventListener('click', closeAllModals));
        cancelTaskBtn.addEventListener('click', () => closeModal(taskModal));
        taskForm.addEventListener('submit', handleTaskSubmit);

        // Search and filter
        searchInput.addEventListener('input', handleSearchInput);
        clearFiltersBtn.addEventListener('click', clearFilters);
        priorityFilter.addEventListener('change', applyFilter);
        advancedSearchBtn.addEventListener('click', toggleAdvancedSearch);

        // Confirmation modal
        confirmYesBtn.addEventListener('click', confirmDelete);
        confirmNoBtn.addEventListener('click', () => closeModal(confirmModal));

        // Export functionality
        exportBtn.addEventListener('click', () => openModal(exportModal));
        exportConfirmBtn.addEventListener('click', exportTasks);
        exportCancelBtn.addEventListener('click', () => closeModal(exportModal));
        document.getElementById('export-range').addEventListener('change', toggleCustomDateRange);

        // Theme toggle
        themeToggleBtn.addEventListener('click', toggleTheme);

        // Template selection
        document.getElementById('task-template').addEventListener('change', applyTemplate);

        // Tags input
        document.getElementById('task-tags').addEventListener('keydown', handleTagInput);
        document.getElementById('search-tags').addEventListener('keydown', handleSearchTagInput);

        // Drag and drop
        setupDragAndDrop();

        // Keyboard shortcuts
        document.addEventListener('keydown', handleKeyboardShortcuts);
        
        // File upload
        document.getElementById('task-attachments').addEventListener('change', handleFileUpload);
    }

    function setupDatePickers() {
        // Task due date picker
        flatpickr("#task-due-date", {
            dateFormat: "Y-m-d",
            minDate: "today"
        });
        
        // Search date range picker
        flatpickr("#search-date", {
            mode: "range",
            dateFormat: "Y-m-d",
            allowInput: true
        });
        
        // Export date range picker
        flatpickr("#export-custom-range", {
            mode: "range",
            dateFormat: "Y-m-d",
            allowInput: true
        });
    }

    function handleKeyboardShortcuts(e) {
        // Don't trigger if typing in an input
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        
        if (e.ctrlKey && e.key === 'z') {
            e.preventDefault();
            commandHistory.undo();
        } else if (e.ctrlKey && e.key === 'y') {
            e.preventDefault();
            commandHistory.redo();
        } else if (e.key === 'Escape') {
            closeAllModals();
        } else if (e.key === 'n' && e.ctrlKey) {
            e.preventDefault();
            openAddTaskModal();
        }
    }

    function updateUndoRedoButtons() {
        undoBtn.disabled = commandHistory.history.length === 0;
        redoBtn.disabled = commandHistory.future.length === 0;
        
        undoBtn.title = commandHistory.history.length > 0 ? 
            `Undo (${commandHistory.history.length} available)` : 'Undo';
        redoBtn.title = commandHistory.future.length > 0 ? 
            `Redo (${commandHistory.future.length} available)` : 'Redo';
    }

    function openAddTaskModal() {
        editTaskId = null;
        document.getElementById('modal-title').textContent = 'Add New Task';
        document.getElementById('task-id').value = '';
        document.getElementById('task-title').value = '';
        document.getElementById('task-description').value = '';
        document.getElementById('task-due-date').value = '';
        document.getElementById('task-priority').value = 'low';
        document.getElementById('task-status').value = 'todo';
        document.getElementById('task-template').value = '';
        document.getElementById('task-tags-container').innerHTML = '';
        document.getElementById('file-list').innerHTML = '';
        openModal(taskModal);
    }

    function openEditTaskModal(task) {
        editTaskId = task.id;
        document.getElementById('modal-title').textContent = 'Edit Task';
        document.getElementById('task-id').value = task.id;
        document.getElementById('task-title').value = task.title;
        document.getElementById('task-description').value = task.description || '';
        document.getElementById('task-due-date').value = task.dueDate || '';
        document.getElementById('task-priority').value = task.priority || 'low';
        document.getElementById('task-status').value = task.status || 'todo';
        
        // Set tags
        const tagsContainer = document.getElementById('task-tags-container');
        tagsContainer.innerHTML = '';
        if (task.tags && task.tags.length > 0) {
            task.tags.forEach(tag => {
                addTagToContainer(tag, tagsContainer);
            });
        }
        
        // Set attachments (simplified for this example)
        const fileList = document.getElementById('file-list');
        fileList.innerHTML = '';
        if (task.attachments && task.attachments.length > 0) {
            task.attachments.forEach(file => {
                addFileToFileList(file.name);
            });
        }
        
        openModal(taskModal);
    }

    function openModal(modal) {
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }

    function closeModal(modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }

    function closeAllModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            closeModal(modal);
        });
    }

    function handleTaskSubmit(e) {
        e.preventDefault();
        
        const taskId = document.getElementById('task-id').value;
        const title = document.getElementById('task-title').value.trim();
        const description = document.getElementById('task-description').value.trim();
        const dueDate = document.getElementById('task-due-date').value;
        const priority = document.getElementById('task-priority').value;
        const status = document.getElementById('task-status').value;
        
        // Get tags
        const tagsContainer = document.getElementById('task-tags-container');
        const tags = Array.from(tagsContainer.querySelectorAll('.tag')).map(tag => 
            tag.querySelector('span').textContent
        );
        
        // Get attachments (simplified for this example)
        const fileInput = document.getElementById('task-attachments');
        const attachments = Array.from(fileInput.files).map(file => ({
            name: file.name,
            size: file.size,
            type: file.type
        }));
        
        if (!title) {
            alert('Task title is required');
            return;
        }
        
        const taskData = {
            id: taskId || generateId(),
            title,
            description,
            dueDate,
            priority,
            status,
            tags,
            attachments,
            createdAt: taskId ? tasks.find(t => t.id === taskId).createdAt : new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            timeSpent: taskId ? tasks.find(t => t.id === taskId).timeSpent || 0 : 0
        };
        
        if (editTaskId) {
            // Update existing task
            const command = new UpdateTaskCommand(editTaskId, taskData);
            commandHistory.execute(command);
        } else {
            // Add new task
            const command = new AddTaskCommand(taskData);
            commandHistory.execute(command);
        }
        
        renderTasks();
        updateStats();
        closeModal(taskModal);
    }

    function applyTemplate() {
        const templateName = document.getElementById('task-template').value;
        if (templateName && taskTemplates[templateName]) {
            const template = taskTemplates[templateName];
            document.getElementById('task-title').value = template.title;
            document.getElementById('task-description').value = template.description;
            document.getElementById('task-priority').value = template.priority;
        }
    }

    function handleTagInput(e) {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            const tagInput = e.target;
            const tagValue = tagInput.value.trim();
            
            if (tagValue) {
                const tagsContainer = document.getElementById('task-tags-container');
                addTagToContainer(tagValue, tagsContainer);
                tagInput.value = '';
            }
        }
    }

    function handleSearchTagInput(e) {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            const tagInput = e.target;
            const tagValue = tagInput.value.trim();
            
            if (tagValue) {
                const tagsContainer = document.getElementById('selected-tags');
                addTagToContainer(tagValue, tagsContainer);
                
                // Add to current filter
                if (!currentFilter.tags.includes(tagValue)) {
                    currentFilter.tags.push(tagValue);
                    renderTasks();
                }
                
                tagInput.value = '';
            }
        }
    }

    function addTagToContainer(tagValue, container) {
        const tagElement = document.createElement('div');
        tagElement.className = 'tag';
        tagElement.innerHTML = `
            <span>${tagValue}</span>
            <span class="remove-tag">&times;</span>
        `;
        
        tagElement.querySelector('.remove-tag').addEventListener('click', () => {
            container.removeChild(tagElement);
            
            // If it's a search tag, update the filter
            if (container.id === 'selected-tags') {
                currentFilter.tags = currentFilter.tags.filter(t => t !== tagValue);
                renderTasks();
            }
        });
        
        container.appendChild(tagElement);
    }

    function handleFileUpload(e) {
        const files = e.target.files;
        const fileList = document.getElementById('file-list');
        fileList.innerHTML = '';
        
        Array.from(files).forEach(file => {
            addFileToFileList(file.name);
        });
    }

    function addFileToFileList(fileName) {
        const fileList = document.getElementById('file-list');
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item';
        fileItem.innerHTML = `
            <span class="file-name">${fileName}</span>
            <span class="file-remove">&times;</span>
        `;
        
        fileItem.querySelector('.file-remove').addEventListener('click', () => {
            fileList.removeChild(fileItem);
        });
        
        fileList.appendChild(fileItem);
    }

    function handleSearchInput(e) {
        currentFilter.search = e.target.value.toLowerCase();
        renderTasks();
    }

    function applyFilter() {
        currentFilter.priority = priorityFilter.value;
        renderTasks();
    }

    function toggleAdvancedSearch() {
        advancedSearchPanel.classList.toggle('active');
    }

    function clearFilters() {
        searchInput.value = '';
        priorityFilter.value = 'all';
        document.getElementById('search-date').value = '';
        document.getElementById('selected-tags').innerHTML = '';
        
        currentFilter = {
            search: '',
            priority: 'all',
            status: ['todo', 'in-progress', 'done'],
            tags: [],
            dateRange: null
        };
        
        renderTasks();
    }

    function showDeleteConfirmation(taskId) {
        taskToDelete = taskId;
        document.getElementById('confirm-message').textContent = 
            'Are you sure you want to delete this task?';
        openModal(confirmModal);
    }

    function confirmDelete() {
        if (taskToDelete) {
            const command = new DeleteTaskCommand(taskToDelete);
            commandHistory.execute(command);
            renderTasks();
            updateStats();
            taskToDelete = null;
        }
        closeModal(confirmModal);
    }

    function toggleCustomDateRange() {
        const rangeSelect = document.getElementById('export-range');
        const customRangeContainer = document.getElementById('custom-range-container');
        
        if (rangeSelect.value === 'custom') {
            customRangeContainer.style.display = 'block';
        } else {
            customRangeContainer.style.display = 'none';
        }
    }

    function exportTasks() {
        const format = document.getElementById('export-format').value;
        const range = document.getElementById('export-range').value;
        
        let tasksToExport = [...tasks];
        
        // Filter by date range if needed
        if (range === 'week') {
            const oneWeekAgo = new Date();
            oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
            tasksToExport = tasksToExport.filter(task => 
                new Date(task.createdAt) >= oneWeekAgo
            );
        } else if (range === 'month') {
            const oneMonthAgo = new Date();
            oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
            tasksToExport = tasksToExport.filter(task => 
                new Date(task.createdAt) >= oneMonthAgo
            );
        } else if (range === 'custom') {
            const dateRange = document.getElementById('export-custom-range').value;
            if (dateRange) {
                const [startDate, endDate] = dateRange.split(' to ');
                tasksToExport = tasksToExport.filter(task => {
                    const taskDate = new Date(task.createdAt);
                    return taskDate >= new Date(startDate) && 
                           taskDate <= new Date(endDate);
                });
            }
        }
        
        // Prepare data for export
        const exportData = {
            exportedAt: new Date().toISOString(),
            tasks: tasksToExport
        };
        
        // Export based on format
        if (format === 'json') {
            downloadFile(
                JSON.stringify(exportData, null, 2),
                `tasks-export-${new Date().toISOString().split('T')[0]}.json`,
                'application/json'
            );
        } else if (format === 'csv') {
            // Convert to CSV
            const csvData = tasksToExport.map(task => ({
                Title: task.title,
                Description: task.description,
                Status: task.status,
                Priority: task.priority,
                'Due Date': task.dueDate,
                'Created At': task.createdAt,
                Tags: task.tags ? task.tags.join(', ') : ''
            }));
            
            const csv = Papa.unparse(csvData);
            downloadFile(
                csv,
                `tasks-export-${new Date().toISOString().split('T')[0]}.csv`,
                'text/csv'
            );
        } else if (format === 'pdf') {
            // Simple PDF export (would need more sophisticated implementation)
            alert('PDF export would be implemented with a proper library');
        }
        
        closeModal(exportModal);
    }

    function downloadFile(content, fileName, contentType) {
        const blob = new Blob([content], { type: contentType });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 0);
    }

    function toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        updateThemeToggleIcon();
    }

    function checkPreferredTheme() {
        // Check for OS-level preference
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches && 
            !localStorage.getItem('theme')) {
            document.documentElement.setAttribute('data-theme', 'dark');
            localStorage.setItem('theme', 'dark');
        }
        updateThemeToggleIcon();
    }

    function updateThemeToggleIcon() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        themeToggleBtn.innerHTML = currentTheme === 'dark' ? 
            '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
    }

    function renderTasks() {
        // Clear all columns
        todoTasks.innerHTML = '';
        inProgressTasks.innerHTML = '';
        doneTasks.innerHTML = '';
        
        // Filter tasks
        const filteredTasks = tasks.filter(task => {
            // Search text
            const matchesSearch = currentFilter.search === '' || 
                task.title.toLowerCase().includes(currentFilter.search) || 
                (task.description && task.description.toLowerCase().includes(currentFilter.search));
            
            // Priority
            const matchesPriority = currentFilter.priority === 'all' || 
                task.priority === currentFilter.priority;
            
            // Status
            const matchesStatus = currentFilter.status.includes(task.status);
            
            // Tags
            const matchesTags = currentFilter.tags.length === 0 || 
                (task.tags && currentFilter.tags.some(tag => task.tags.includes(tag)));
            
            // Date range (simplified for this example)
            const matchesDate = true; // Would implement actual date filtering
            
            return matchesSearch && matchesPriority && matchesStatus && matchesTags && matchesDate;
        });
        
        // Sort tasks by due date (ascending) and priority (high to low)
        filteredTasks.sort((a, b) => {
            // Sort by due date (closest first)
            if (a.dueDate && b.dueDate) {
                const dateA = new Date(a.dueDate);
                const dateB = new Date(b.dueDate);
                if (dateA < dateB) return -1;
                if (dateA > dateB) return 1;
            } else if (a.dueDate) return -1;
            else if (b.dueDate) return 1;
            
            // Then sort by priority (high to low)
            const priorityOrder = { high: 3, medium: 2, low: 1 };
            return priorityOrder[b.priority] - priorityOrder[a.priority];
        });
        
        // Update task counters
        updateTaskCounters();
        
        // Render tasks in their respective columns
        filteredTasks.forEach(task => {
            const taskElement = createTaskElement(task);
            
            switch (task.status) {
                case 'todo':
                    todoTasks.appendChild(taskElement);
                    break;
                case 'in-progress':
                    inProgressTasks.appendChild(taskElement);
                    break;
                case 'done':
                    doneTasks.appendChild(taskElement);
                    break;
            }
        });
        
        // Re-setup drag and drop for new task elements
        setupDragAndDrop();
        
        // Save state after rendering
        saveState();
    }

    function updateTaskCounters() {
        const todoTasksCount = tasks.filter(t => t.status === 'todo').length;
        const inProgressTasksCount = tasks.filter(t => t.status === 'in-progress').length;
        const doneTasksCount = tasks.filter(t => t.status === 'done').length;
        
        todoCount.textContent = todoTasksCount;
        inProgressCount.textContent = inProgressTasksCount;
        doneCount.textContent = doneTasksCount;
    }

    function updateStats() {
        // Total tasks
        totalTasksEl.textContent = tasks.length;
        
        // Completed tasks
        const completedTasks = tasks.filter(t => t.status === 'done').length;
        completedTasksEl.textContent = completedTasks;
        
        // Overdue tasks
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const overdueTasks = tasks.filter(t => 
            t.dueDate && 
            new Date(t.dueDate) < today && 
            t.status !== 'done'
        ).length;
        
        overdueTasksEl.textContent = overdueTasks;
        
        // Average completion time (simplified)
        const doneTasks = tasks.filter(t => t.status === 'done');
        if (doneTasks.length > 0) {
            const totalHours = doneTasks.reduce((sum, task) => {
                const createdAt = new Date(task.createdAt);
                const updatedAt = new Date(task.updatedAt);
                const hours = (updatedAt - createdAt) / (1000 * 60 * 60);
                return sum + hours;
            }, 0);
            
            const avgHours = totalHours / doneTasks.length;
            const hours = Math.floor(avgHours);
            const minutes = Math.floor((avgHours - hours) * 60);
            
            avgCompletionEl.textContent = `${hours}h ${minutes}m`;
        } else {
            avgCompletionEl.textContent = '0h 0m';
        }
    }

    function createTaskElement(task) {
        const taskElement = document.createElement('div');
        taskElement.className = `task-card ${task.priority}-priority`;
        taskElement.setAttribute('draggable', 'true');
        taskElement.setAttribute('data-task-id', task.id);
        
        // Format due date
        let dueDateText = 'No due date';
        let isOverdue = false;
        
        if (task.dueDate) {
            const dueDate = new Date(task.dueDate);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            dueDateText = dueDate.toLocaleDateString();
            
            if (dueDate < today && task.status !== 'done') {
                isOverdue = true;
                dueDateText += ' (Overdue)';
            }
        }
        
        // Priority text
        const priorityText = task.priority.charAt(0).toUpperCase() + task.priority.slice(1);
        
        // Task content
        taskElement.innerHTML = `
            <div class="task-title">
                <i class="fas fa-${getTaskIcon(task.status)}"></i>
                ${task.title}
            </div>
            ${task.description ? `<div class="task-description">${task.description}</div>` : ''}
            ${task.tags && task.tags.length > 0 ? `
                <div class="task-tags">
                    ${task.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                </div>
            ` : ''}
            <div class="task-meta">
                <div class="task-due-date ${isOverdue ? 'overdue' : ''}">
                    <i class="far fa-calendar-alt"></i> ${dueDateText}
                </div>
                <div class="priority-${task.priority}">
                    <i class="fas fa-exclamation-circle"></i> ${priorityText}
                </div>
            </div>
            <div class="task-actions">
                <button class="edit-task" title="Edit Task"><i class="fas fa-edit"></i></button>
                <button class="delete-task" title="Delete Task"><i class="fas fa-trash"></i></button>
            </div>
        `;
        
        // Add event listeners for action buttons
        taskElement.querySelector('.edit-task').addEventListener('click', () => {
            const taskToEdit = tasks.find(t => t.id === task.id);
            if (taskToEdit) {
                openEditTaskModal(taskToEdit);
            }
        });
        
        taskElement.querySelector('.delete-task').addEventListener('click', () => {
            showDeleteConfirmation(task.id);
        });
        
        return taskElement;
    }

    function getTaskIcon(status) {
        switch(status) {
            case 'todo': return 'clipboard-list';
            case 'in-progress': return 'spinner';
            case 'done': return 'check-circle';
            default: return 'tasks';
        }
    }

    function setupDragAndDrop() {
        const taskElements = document.querySelectorAll('.task-card');
        const columns = document.querySelectorAll('.tasks');
        
        // Remove existing event listeners
        taskElements.forEach(task => {
            task.removeEventListener('dragstart', dragStart);
        });
        
        columns.forEach(column => {
            column.removeEventListener('dragover', dragOver);
            column.removeEventListener('dragenter', dragEnter);
            column.removeEventListener('dragleave', dragLeave);
            column.removeEventListener('drop', drop);
        });
        
        // Add drag event listeners to each task
        taskElements.forEach(task => {
            task.addEventListener('dragstart', dragStart);
        });
        
        // Add drop event listeners to each column
        columns.forEach(column => {
            column.addEventListener('dragover', dragOver);
            column.addEventListener('dragenter', dragEnter);
            column.addEventListener('dragleave', dragLeave);
            column.addEventListener('drop', drop);
        });
    }
    
    function dragStart(e) {
        e.dataTransfer.setData('text/plain', e.target.dataset.taskId);
        e.target.classList.add('dragging');
        
        // Store the original column for undo purposes
        const taskId = e.target.dataset.taskId;
        const task = tasks.find(t => t.id === taskId);
        e.dataTransfer.setData('original-status', task.status);
    }
    
    function dragOver(e) {
        e.preventDefault();
    }
    
    function dragEnter(e) {
        e.preventDefault();
        e.target.classList.add('drag-over');
    }
    
    function dragLeave(e) {
        e.target.classList.remove('drag-over');
    }
    
    function drop(e) {
        e.preventDefault();
        e.target.classList.remove('drag-over');
        
        const taskId = e.dataTransfer.getData('text/plain');
        const originalStatus = e.dataTransfer.getData('original-status');
        const newStatus = e.target.closest('.tasks').dataset.status;
        
        if (originalStatus !== newStatus) {
            const command = new MoveTaskCommand(taskId, originalStatus, newStatus);
            commandHistory.execute(command);
            renderTasks();
            updateStats();
        }
    }

    function saveState() {
        localStorage.setItem('tasks', JSON.stringify(tasks));
        localStorage.setItem('commandHistory', JSON.stringify({
            history: commandHistory.history,
            future: commandHistory.future
        }));
    }

    function generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    }

    // Task commands
    function AddTaskCommand(task) {
        this.task = task;
        this.execute = function() {
            tasks.push(this.task);
        };
        this.undo = function() {
            tasks = tasks.filter(t => t.id !== this.task.id);
        };
    }

    function UpdateTaskCommand(taskId, updatedTask) {
        this.taskId = taskId;
        this.updatedTask = updatedTask;
        this.previousTask = tasks.find(t => t.id === taskId);
        
        this.execute = function() {
            const index = tasks.findIndex(t => t.id === this.taskId);
            if (index !== -1) {
                tasks[index] = this.updatedTask;
            }
        };
        
        this.undo = function() {
            const index = tasks.findIndex(t => t.id === this.taskId);
            if (index !== -1) {
                tasks[index] = this.previousTask;
            }
        };
    }

    function DeleteTaskCommand(taskId) {
        this.taskId = taskId;
        this.deletedTask = tasks.find(t => t.id === taskId);
        
        this.execute = function() {
            tasks = tasks.filter(t => t.id !== this.taskId);
        };
        
        this.undo = function() {
            tasks.push(this.deletedTask);
        };
    }

    function MoveTaskCommand(taskId, fromStatus, toStatus) {
        this.taskId = taskId;
        this.fromStatus = fromStatus;
        this.toStatus = toStatus;
        
        this.execute = function() {
            const task = tasks.find(t => t.id === this.taskId);
            if (task) {
                task.status = this.toStatus;
                task.updatedAt = new Date().toISOString();
            }
        };
        
        this.undo = function() {
            const task = tasks.find(t => t.id === this.taskId);
            if (task) {
                task.status = this.fromStatus;
                task.updatedAt = new Date().toISOString();
            }
        };
    }
});

// Service Worker Registration for PWA
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').then(registration => {
            console.log('ServiceWorker registration successful');
        }, err => {
            console.log('ServiceWorker registration failed: ', err);
        });
    });
}