// app.js - Final Version: Linked Stats, Correct Date Format & Fast Quotes

// --- 1. LOCAL QUOTES BACKUP (Offline mode / Instant Load) ---
const localQuotes = [
    "Start where you are. Use what you have.",
    "Simplicity is the ultimate sophistication.",
    "Small steps in the right direction.",
    "Focus on being productive instead of busy.",
    "Your future is created by what you do today.",
    "Breathe. It’s just a bad day, not a bad life.",
    "Do it with passion or not at all.",
    "Make each day your masterpiece."
];

// --- 2. GLOBAL STATE ---
const defaultHabits = ["Drink Water", "Exercise", "Read"];
let userPreferences = JSON.parse(localStorage.getItem('userPrefs')) || {
    name: "Friend",
    habits: defaultHabits,
    accentColor: "#4A5568", 
    bgTint: "#F7FAFC"       
};
let activeDate = new Date();

// --- 3. DOM ELEMENTS ---
const dateBig = document.getElementById('dateBig');
const daySmall = document.getElementById('daySmall');
const quoteDisplay = document.getElementById('quoteDisplay');
const habitListUI = document.getElementById('habit-list');
const slotsContainer = document.getElementById('time-slots');
const settingsModal = document.getElementById('settingsModal');
const statsModal = document.getElementById('statsModal');
const root = document.documentElement;

// --- 4. HELPER: LOCAL DATE KEY (CRITICAL FOR STATS) ---
// This ensures that "Jan 3" is always "2026-01-03", regardless of timezone
function getLocalDateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// --- 5. INITIALIZATION ---
function init() {
    applyPreferences();
    generateScheduleSlots(); 
    loadDateData();
    fetchQuote();
    setupReminders();
}

// --- 6. LOGIC: DATE & QUOTES ---

function updateDateDisplay() {
    // 1. TOP: "03 Jan 2026"
    const dd = String(activeDate.getDate()).padStart(2, '0');
    const mon = activeDate.toLocaleDateString('en-US', { month: 'short' });
    const yyyy = activeDate.getFullYear();
    dateBig.innerText = `${dd} ${mon} ${yyyy}`;
    
    // 2. BOTTOM: "Saturday"
    daySmall.innerText = activeDate.toLocaleDateString('en-US', { weekday: 'long' });
}

async function fetchQuote() {
    // 1. Show local quote INSTANTLY (No waiting)
    const quoteIndex = activeDate.getDate() % localQuotes.length;
    quoteDisplay.innerText = `"${localQuotes[quoteIndex]}"`;
    
    // 2. Fetch from API in background
    try {
        const response = await fetch('https://api.quotable.io/random?maxLength=60');
        if (!response.ok) throw new Error("API Error");
        const data = await response.json();
        quoteDisplay.innerText = `"${data.content}"`; // Update if successful
    } catch (error) {
        console.log("Using offline quote."); // Silent fallback
    }
}

// --- 7. LOGIC: SCHEDULE (24 Hours) ---
function generateScheduleSlots() {
    slotsContainer.innerHTML = ''; 
    const hours = Array.from({length: 24}, (_, i) => i);
    
    hours.forEach(hour => {
        const div = document.createElement('div');
        div.className = 'slot';
        
        let displayTime = hour === 0 ? "12 AM" : (hour < 12 ? `${hour} AM` : (hour === 12 ? "12 PM" : `${hour - 12} PM`));
        
        div.innerHTML = `
            <div class="time">${displayTime}</div>
            <textarea data-hour="${hour}" placeholder=""></textarea>
        `;
        slotsContainer.appendChild(div);
    });
}

// --- 8. DATA LOADING & SAVING ---
function loadDateData() {
    updateDateDisplay();
    
    // Use Fixed Local Key
    const key = getLocalDateKey(activeDate);
    const data = JSON.parse(localStorage.getItem(key)) || {};
    
    // Habits
    habitListUI.innerHTML = '';
    userPreferences.habits.forEach(habit => {
        const isChecked = (data.checkedHabits && data.checkedHabits.includes(habit)) ? 'checked' : '';
        const label = document.createElement('label');
        label.className = 'checkbox-wrapper';
        label.innerHTML = `
            <input type="checkbox" data-name="${habit}" ${isChecked}>
            <span class="checkmark"></span>
            <span class="label-text">${habit}</span>
        `;
        habitListUI.appendChild(label);

        // Attach Event Listener directly to Input for Immediate Save
        const input = label.querySelector('input');
        input.addEventListener('change', saveData);
    });

    // Journal
    const journalBox = document.getElementById('daily-journal');
    if(journalBox) {
        journalBox.value = data.journal || '';
        // Remove old listeners by cloning
        const newBox = journalBox.cloneNode(true);
        journalBox.parentNode.replaceChild(newBox, journalBox);
        newBox.addEventListener('input', saveData);
    }

    // Schedule
    document.querySelectorAll('.slot textarea').forEach(box => {
        const h = box.dataset.hour;
        box.value = (data.slots && data.slots[h]) ? data.slots[h] : '';
        box.addEventListener('input', saveData);
    });
}

function saveData() {
    // Use Fixed Local Key
    const key = getLocalDateKey(activeDate);
    
    const checked = Array.from(document.querySelectorAll('#habit-list input:checked')).map(box => box.dataset.name);
    
    const slots = {};
    document.querySelectorAll('.slot textarea').forEach(box => {
        if(box.value.trim()) slots[box.dataset.hour] = box.value;
    });

    const data = {
        checkedHabits: checked,
        journal: document.getElementById('daily-journal').value,
        slots: slots
    };
    
    // Write to storage immediately so Stats can see it
    localStorage.setItem(key, JSON.stringify(data));
}

// --- 9. PREFERENCES ---
function applyPreferences() {
    const nameDisplay = document.getElementById('userNameDisplay');
    if(nameDisplay) nameDisplay.innerText = userPreferences.name;
    const nameInput = document.getElementById('nameInput');
    if(nameInput) nameInput.value = userPreferences.name;
    
    root.style.setProperty('--accent-color', userPreferences.accentColor);
    root.style.setProperty('--accent-tint', userPreferences.bgTint);

    const settingsList = document.getElementById('settingsHabitList');
    if(settingsList) {
        settingsList.innerHTML = '';
        userPreferences.habits.forEach((habit, index) => {
            const li = document.createElement('li');
            li.style.display = 'flex'; li.style.justifyContent = 'space-between'; li.style.padding = '10px 0'; li.style.borderBottom = '1px solid #eee';
            li.innerHTML = `<span>${habit}</span> <span onclick="removeHabit(${index})" style="color:#e53e3e; cursor:pointer;">&times;</span>`;
            settingsList.appendChild(li);
        });
    }
}

// --- 10. STATS & YEARLY HEATMAP (Linked Logic) ---
function calculateStats() {
    let totalHabits = 0;
    let currentStreak = 0;
    
    // 1. Range: Jan 1 to Dec 31 of CURRENT YEAR
    const currentYear = activeDate.getFullYear();
    const startDate = new Date(currentYear, 0, 1);
    const endDate = new Date(currentYear, 11, 31);
    
    const heatmapData = [];
    
    // 2. Loop through year
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        // Use EXACT same key format as saveData
        const key = getLocalDateKey(d);
        
        const isFuture = d > new Date();
        const dayData = JSON.parse(localStorage.getItem(key)) || {};
        const count = dayData.checkedHabits ? dayData.checkedHabits.length : 0;
        
        if (!isFuture) totalHabits += count;

        let level = 0;
        if (count > 0) level = 1;
        if (count > 1) level = 2;
        if (count > 3) level = 3;
        if (count >= 5) level = 4;
        
        const tooltipDate = d.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
        heatmapData.push({ 
            dateStr: tooltipDate, 
            level: isFuture ? -1 : level,
            count: count 
        });
    }

    // 3. Streak Logic
    const todayKey = getLocalDateKey(new Date());
    const todayData = JSON.parse(localStorage.getItem(todayKey)) || {};
    const dayOfYear = Math.floor((new Date() - startDate) / (1000 * 60 * 60 * 24));
    
    let streakBroken = false;
    // Check today first
    if (todayData.checkedHabits && todayData.checkedHabits.length > 0) {
        currentStreak = 0; 
    } else {
        streakBroken = true; 
    }

    // Loop backwards
    if (heatmapData[dayOfYear]) {
        for (let i = dayOfYear; i >= 0; i--) {
            if (heatmapData[i].level > 0) {
                if (!streakBroken || i === dayOfYear) {
                    currentStreak++;
                    streakBroken = false;
                }
            } else {
                if (i === dayOfYear) continue; 
                break; 
            }
        }
    }

    document.getElementById('totalHabitsCount').innerText = totalHabits;
    document.getElementById('streakCount').innerText = currentStreak;
    renderHeatmap(heatmapData);
}

function renderHeatmap(data) {
    const grid = document.getElementById('heatmapGrid');
    if(!grid) return;
    grid.innerHTML = '';
    
    // Month Labels
    let labelsContainer = document.getElementById('heatmapMonths');
    if (!labelsContainer) {
        labelsContainer = document.createElement('div');
        labelsContainer.id = 'heatmapMonths';
        labelsContainer.className = 'heatmap-months';
        grid.parentNode.insertBefore(labelsContainer, grid);
        
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        months.forEach(m => {
            const span = document.createElement('span');
            span.innerText = m;
            labelsContainer.appendChild(span);
        });
    }
    
    data.forEach(day => {
        const div = document.createElement('div');
        div.className = 'day-square';
        
        if (day.level === -1) {
             div.style.backgroundColor = "transparent";
             div.style.border = "1px dashed #E2E8F0";
        } else {
             div.dataset.level = day.level;
             div.title = `${day.dateStr}, ${day.count} Habits Done`;
        }
        grid.appendChild(div);
    });
}

// --- 11. EVENTS ---
document.getElementById('prevBtn').onclick = () => { activeDate.setDate(activeDate.getDate() - 1); loadDateData(); fetchQuote(); };
document.getElementById('nextBtn').onclick = () => { activeDate.setDate(activeDate.getDate() + 1); loadDateData(); fetchQuote(); };
document.getElementById('settingsBtn').onclick = () => { settingsModal.style.display = 'block'; };
document.getElementById('statsBtn').onclick = () => { calculateStats(); statsModal.style.display = 'block'; };
document.getElementById('closeStats').onclick = () => { statsModal.style.display = 'none'; };

document.getElementById('saveSettingsBtn').onclick = () => {
    userPreferences.name = document.getElementById('nameInput').value;
    localStorage.setItem('userPrefs', JSON.stringify(userPreferences));
    applyPreferences(); loadDateData(); settingsModal.style.display = 'none';
};

document.getElementById('addHabitBtn').onclick = () => {
    const input = document.getElementById('newHabitInput');
    const val = input.value.trim();
    if(val) { userPreferences.habits.push(val); input.value = ''; applyPreferences(); }
};

window.removeHabit = (index) => { userPreferences.habits.splice(index, 1); applyPreferences(); };

window.onclick = (event) => {
    if (event.target == settingsModal) settingsModal.style.display = 'none';
    if (event.target == statsModal) statsModal.style.display = 'none';
};

document.querySelectorAll('.color-circle').forEach(circle => {
    circle.addEventListener('click', () => {
        userPreferences.accentColor = circle.dataset.color;
        userPreferences.bgTint = circle.dataset.tint;
        root.style.setProperty('--accent-color', circle.dataset.color);
        root.style.setProperty('--accent-tint', circle.dataset.tint);
    });
});

function setupReminders() {
    const btn = document.getElementById('reminderBtn');
    if (!("Notification" in window)) { btn.style.display = 'none'; return; }
    btn.onclick = () => {
        Notification.requestPermission().then(permission => {
            if (permission === "granted") new Notification("Daily Flow", { body: "Notifications active!" });
        });
    };
}

// Start App
init();