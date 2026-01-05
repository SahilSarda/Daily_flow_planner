// app.js - Final: Weekday/Weekend Editing, Dark Mode, Notifications

// --- 1. LOCAL QUOTES BACKUP ---
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
    weekdayHabits: [...defaultHabits], // Habits for Mon-Fri
    weekendHabits: ["Relax", "Family Time", "Plan Week"], // Different defaults for Sat-Sun
    accentColor: "#4A5568", 
    bgTint: "#F7FAFC",
    darkTint: "#1A202C" // Default Dark Slate
};

// Migration for legacy users (preserves old data)
if (userPreferences.habits) {
    if (!userPreferences.weekdayHabits || userPreferences.weekdayHabits.length === 0) {
        userPreferences.weekdayHabits = [...userPreferences.habits];
        userPreferences.weekendHabits = [...userPreferences.habits];
    }
    delete userPreferences.habits; 
}

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

// --- 4. HELPER: DATE KEY ---
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
    
    // Notification Timer (Every 60s)
    setInterval(checkScheduleNotifications, 60000);
    
    // System Theme Listener (Auto-switch light/dark)
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyPreferences);
}

// --- 6. DATE & QUOTES ---
function updateDateDisplay() {
    const dd = String(activeDate.getDate()).padStart(2, '0');
    const mon = activeDate.toLocaleDateString('en-US', { month: 'short' });
    const yyyy = activeDate.getFullYear();
    dateBig.innerText = `${dd} ${mon} ${yyyy}`;
    daySmall.innerText = activeDate.toLocaleDateString('en-US', { weekday: 'long' });
}

async function fetchQuote() {
    const quoteIndex = activeDate.getDate() % localQuotes.length;
    quoteDisplay.innerText = `"${localQuotes[quoteIndex]}"`;
    try {
        const response = await fetch('https://api.quotable.io/random?maxLength=60');
        if (!response.ok) throw new Error("API Error");
        const data = await response.json();
        quoteDisplay.innerText = `"${data.content}"`;
    } catch (e) { console.log("Offline quote used"); }
}

// --- 7. SCHEDULE ---
function generateScheduleSlots() {
    slotsContainer.innerHTML = ''; 
    const hours = Array.from({length: 24}, (_, i) => i);
    hours.forEach(hour => {
        const div = document.createElement('div');
        div.className = 'slot';
        let displayTime = hour === 0 ? "12 AM" : (hour < 12 ? `${hour} AM` : (hour === 12 ? "12 PM" : `${hour - 12} PM`));
        div.innerHTML = `<div class="time">${displayTime}</div><textarea data-hour="${hour}"></textarea>`;
        slotsContainer.appendChild(div);
    });
}

// --- 8. LOAD DATA (Weekday vs Weekend Logic) ---
function loadDateData() {
    updateDateDisplay();
    const key = getLocalDateKey(activeDate);
    const data = JSON.parse(localStorage.getItem(key)) || {};
    
    // Determine Day Type (0 is Sunday, 6 is Saturday)
    const dayOfWeek = activeDate.getDay();
    const isWeekend = (dayOfWeek === 0 || dayOfWeek === 6);
    
    // Select correct habit list based on the DATE being viewed
    const currentHabits = isWeekend ? userPreferences.weekendHabits : userPreferences.weekdayHabits;
    
    // Update Label on Main Screen
    const label = document.getElementById('habitTypeLabel');
    if(label) label.innerText = isWeekend ? "(Weekend Mode)" : "(Weekday Mode)";

    habitListUI.innerHTML = '';
    currentHabits.forEach(habit => {
        const isChecked = (data.checkedHabits && data.checkedHabits.includes(habit)) ? 'checked' : '';
        const label = document.createElement('label');
        label.className = 'checkbox-wrapper';
        label.innerHTML = `
            <input type="checkbox" data-name="${habit}" ${isChecked}>
            <span class="checkmark"></span>
            <span class="label-text">${habit}</span>
        `;
        habitListUI.appendChild(label);
        const input = label.querySelector('input');
        input.addEventListener('change', saveData);
    });

    const journalBox = document.getElementById('daily-journal');
    if(journalBox) {
        journalBox.value = data.journal || '';
        const newBox = journalBox.cloneNode(true);
        journalBox.parentNode.replaceChild(newBox, journalBox);
        newBox.addEventListener('input', saveData);
    }

    document.querySelectorAll('.slot textarea').forEach(box => {
        const h = box.dataset.hour;
        box.value = (data.slots && data.slots[h]) ? data.slots[h] : '';
        box.addEventListener('input', saveData);
    });
}

function saveData() {
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
    localStorage.setItem(key, JSON.stringify(data));
}

// --- 9. NOTIFICATIONS ---
function checkScheduleNotifications() {
    if (Notification.permission !== "granted") return;

    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    // Notify at XX:40 for task at (XX+1):00
    if (currentMinute !== 40) return;

    const targetHour = currentHour + 1;
    const key = getLocalDateKey(now);
    const data = JSON.parse(localStorage.getItem(key)) || {};
    
    if (data.slots && data.slots[targetHour]) {
        const taskName = data.slots[targetHour];
        new Notification("Upcoming Task 🔔", {
            body: `In 20 mins: ${taskName}`,
            icon: 'icon.png'
        });
    }
}

// --- 10. PREFERENCES & EDITING LOGIC ---
function applyPreferences() {
    document.getElementById('userNameDisplay').innerText = userPreferences.name;
    document.getElementById('nameInput').value = userPreferences.name;
    
    // Theme Logic
    root.style.setProperty('--accent-color', userPreferences.accentColor);
    const isDarkMode = window.matchMedia("(prefers-color-scheme: dark)").matches;
    
    // If dark mode, use the darkTint, otherwise use bgTint
    // If user hasn't selected a theme recently (legacy), fallback to default dark
    const bgToApply = isDarkMode 
        ? (userPreferences.darkTint || "#1A202C") 
        : userPreferences.bgTint;
        
    root.style.setProperty('--accent-tint', bgToApply);
    
    // Render the list inside settings based on current dropdown selection
    renderSettingsHabitList();
}

// This function controls which list you are editing in settings
function renderSettingsHabitList() {
    const type = document.getElementById('habitTypeSelect').value; // 'weekday' or 'weekend'
    
    // Pick the array to show
    const listToRender = (type === 'weekend') ? userPreferences.weekendHabits : userPreferences.weekdayHabits;
    
    const settingsList = document.getElementById('settingsHabitList');
    settingsList.innerHTML = '';
    
    listToRender.forEach((habit, index) => {
        const li = document.createElement('li');
        li.style.display = 'flex'; li.style.justifyContent = 'space-between'; li.style.padding = '10px 0'; li.style.borderBottom = '1px solid #eee';
        // Pass the 'type' to removeHabit so we delete from the correct list
        li.innerHTML = `<span>${habit}</span> <span onclick="removeHabit(${index}, '${type}')" style="color:#e53e3e; cursor:pointer; padding:0 10px;">&times;</span>`;
        settingsList.appendChild(li);
    });
}

// When you change the dropdown, refresh the list immediately
document.getElementById('habitTypeSelect').addEventListener('change', () => {
    renderSettingsHabitList();
});

// Add Habit Button Logic
document.getElementById('addHabitBtn').onclick = () => {
    const input = document.getElementById('newHabitInput');
    const val = input.value.trim();
    const type = document.getElementById('habitTypeSelect').value; // Check dropdown value
    
    if(val) {
        if(type === 'weekend') {
            userPreferences.weekendHabits.push(val);
        } else {
            userPreferences.weekdayHabits.push(val);
        }
        input.value = '';
        renderSettingsHabitList(); // Refresh view
    }
};

// Remove Habit Logic
window.removeHabit = (index, type) => {
    if(type === 'weekend') {
        userPreferences.weekendHabits.splice(index, 1);
    } else {
        userPreferences.weekdayHabits.splice(index, 1);
    }
    renderSettingsHabitList(); // Refresh view
};

// COLOR SELECTION (Handles clicks on the new Aesthetic Cards)
document.querySelectorAll('.color-item').forEach(item => {
    item.addEventListener('click', () => {
        const circle = item.querySelector('.color-circle');
        userPreferences.accentColor = circle.dataset.color;
        userPreferences.bgTint = circle.dataset.tint;
        userPreferences.darkTint = circle.dataset.darkTint; // Save Dark Mode Tint
        applyPreferences();
    });
});

// --- 11. STATS ---
function calculateStats() {
    let totalHabits = 0;
    let currentStreak = 0;
    const currentYear = activeDate.getFullYear();
    const startDate = new Date(currentYear, 0, 1);
    const endDate = new Date(currentYear, 11, 31);
    const heatmapData = [];
    
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
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
        heatmapData.push({ dateStr: tooltipDate, level: isFuture ? -1 : level, count: count });
    }

    const todayKey = getLocalDateKey(new Date());
    const todayData = JSON.parse(localStorage.getItem(todayKey)) || {};
    const dayOfYear = Math.floor((new Date() - startDate) / (1000 * 60 * 60 * 24));
    
    let streakBroken = false;
    if (todayData.checkedHabits && todayData.checkedHabits.length > 0) currentStreak = 0; 
    else streakBroken = true;

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
             div.title = `${day.dateStr}: ${day.count} Habits Done`;
        }
        grid.appendChild(div);
    });
}

// --- 12. EVENTS ---
document.getElementById('prevBtn').onclick = () => { activeDate.setDate(activeDate.getDate() - 1); loadDateData(); fetchQuote(); };
document.getElementById('nextBtn').onclick = () => { activeDate.setDate(activeDate.getDate() + 1); loadDateData(); fetchQuote(); };
document.getElementById('settingsBtn').onclick = () => { settingsModal.style.display = 'block'; };
document.getElementById('closeSettings').onclick = () => { settingsModal.style.display = 'none'; };
document.getElementById('statsBtn').onclick = () => { calculateStats(); statsModal.style.display = 'block'; };
document.getElementById('closeStats').onclick = () => { statsModal.style.display = 'none'; };

document.getElementById('saveSettingsBtn').onclick = () => {
    userPreferences.name = document.getElementById('nameInput').value;
    localStorage.setItem('userPrefs', JSON.stringify(userPreferences));
    applyPreferences(); loadDateData(); settingsModal.style.display = 'none';
};

window.onclick = (event) => {
    if (event.target == settingsModal) settingsModal.style.display = 'none';
    if (event.target == statsModal) statsModal.style.display = 'none';
};

function setupReminders() {
    const btn = document.getElementById('reminderBtn');
    if (!("Notification" in window)) { btn.style.display = 'none'; return; }
    btn.onclick = () => {
        Notification.requestPermission().then(permission => {
            if (permission === "granted") new Notification("Daily Flow", { body: "Notifications active!" });
        });
    };
}

init();