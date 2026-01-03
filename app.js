// --- DOM Elements ---
const dateDisplay = document.getElementById('dateDisplay');
const quoteDisplay = document.getElementById('quoteDisplay');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const journalBox = document.getElementById('daily-journal');
const slotsContainer = document.getElementById('time-slots');

// --- Global State ---
let activeDate = new Date(); // Defaults to today

// --- Quotes Array ---
const quotes = [
    "Start where you are. Use what you have.",
    "Simplicity is the ultimate sophistication.",
    "Focus on being productive instead of busy.",
    "Small steps every day.",
    "Your future is created by what you do today.",
    "Breathe. It’s just a bad day, not a bad life."
];

// --- 1. Generate Time Slots UI ---
const hours = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
hours.forEach(hour => {
    const div = document.createElement('div');
    div.className = 'slot';
    const displayTime = hour > 12 ? `${hour - 12} PM` : `${hour} AM`;
    // Note: We used '12 PM' for noon logic broadly for simplicity here
    div.innerHTML = `
        <span class="time">${hour === 12 ? '12 PM' : displayTime}</span>
        <textarea data-hour="${hour}" rows="1"></textarea>
    `;
    slotsContainer.appendChild(div);
});

// --- 2. Core Functions ---

// Get a unique key for storage (e.g., "2025-11-24")
function getDateKey(dateObj) {
    return dateObj.toISOString().split('T')[0];
}

// Get pretty text for header (e.g., "Monday, Nov 24")
function getPrettyDate(dateObj) {
    return dateObj.toLocaleDateString('en-US', { 
        weekday: 'long', 
        month: 'short', 
        day: 'numeric' 
    });
}

function loadData() {
    const key = getDateKey(activeDate);
    const data = JSON.parse(localStorage.getItem(key)) || {};
    
    // Update Header
    dateDisplay.innerText = getPrettyDate(activeDate);
    
    // Pick a random quote based on the date number (so it stays same for the whole day)
    const quoteIndex = activeDate.getDate() % quotes.length;
    quoteDisplay.innerText = `"${quotes[quoteIndex]}"`;

    // Reset Inputs first
    document.querySelectorAll('input[type="checkbox"]').forEach(box => box.checked = false);
    document.querySelectorAll('textarea').forEach(box => {
        box.value = '';
        box.style.height = 'inherit'; // Reset height
    });

    // Fill Data
    if(data.exercise) document.getElementById('habit-exercise').checked = true;
    if(data.steps) document.getElementById('habit-steps').checked = true;
    if(data.code) document.getElementById('habit-code').checked = true;
    if(data.journal) {
        journalBox.value = data.journal;
        autoExpand(journalBox);
    }
    
    document.querySelectorAll('.slot textarea').forEach(box => {
        const h = box.dataset.hour;
        if(data[h]) {
            box.value = data[h];
            autoExpand(box);
        }
    });
}

function saveData() {
    const key = getDateKey(activeDate);
    
    const data = {
        exercise: document.getElementById('habit-exercise').checked,
        steps: document.getElementById('habit-steps').checked,
        code: document.getElementById('habit-code').checked,
        journal: journalBox.value
    };
    
    document.querySelectorAll('.slot textarea').forEach(box => {
        if(box.value.trim() !== "") {
            data[box.dataset.hour] = box.value;
        }
    });

    localStorage.setItem(key, JSON.stringify(data));
}

// Auto-expand logic for textareas
function autoExpand(field) {
    field.style.height = 'inherit';
    const computed = window.getComputedStyle(field);
    const height = field.scrollHeight + parseInt(computed.borderTopWidth) + parseInt(computed.borderBottomWidth);
    field.style.height = height + 'px';
}

// --- 3. Event Listeners ---

// Navigation Arrows
prevBtn.addEventListener('click', () => {
    saveData(); // Save current page before leaving
    activeDate.setDate(activeDate.getDate() - 1);
    loadData();
});

nextBtn.addEventListener('click', () => {
    saveData();
    activeDate.setDate(activeDate.getDate() + 1);
    loadData();
});

// Auto-save on any input
document.body.addEventListener('input', (e) => {
    // If typing in textarea
    if (e.target.tagName.toLowerCase() === 'textarea') {
        autoExpand(e.target);
        saveData();
    }
});

// Save on checkbox click
document.body.addEventListener('change', (e) => {
    if (e.target.type === 'checkbox') {
        saveData();
    }
});

// Initialize
loadData();