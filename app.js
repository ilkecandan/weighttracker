// DOM Elements
const dateInput = document.getElementById('date');
const weightInput = document.getElementById('weight');
const saveBtn = document.getElementById('saveBtn');
const installBtn = document.getElementById('installBtn');
const installBanner = document.getElementById('installBanner');
const installBannerBtn = document.getElementById('installBannerBtn');
const dismissBanner = document.getElementById('dismissBanner');
const timeRange = document.getElementById('timeRange');
const exportBtn = document.getElementById('exportBtn');
const themeBtn = document.getElementById('themeBtn');
const targetWeightInput = document.getElementById('targetWeight');
const setGoalBtn = document.getElementById('setGoalBtn');
const goalProgress = document.getElementById('goalProgress');
const currentWeightEl = document.getElementById('currentWeight');
const weeklyChangeEl = document.getElementById('weeklyChange');
const monthlyChangeEl = document.getElementById('monthlyChange');
const streakCountEl = document.getElementById('streakCount');
const entriesTable = document.getElementById('entriesTable').querySelector('tbody');
const searchEntry = document.getElementById('searchEntry');
const editModal = document.getElementById('editModal');
const closeModal = document.querySelector('.close-modal');
const editDate = document.getElementById('editDate');
const editWeight = document.getElementById('editWeight');
const saveEditBtn = document.getElementById('saveEditBtn');
const deleteEntryBtn = document.getElementById('deleteEntryBtn');

// Chart setup
const ctx = document.getElementById('weightChart').getContext('2d');
let weightChart = null;
let deferredPrompt = null;
let currentlyEditingId = null;

// Initialize with today's date
dateInput.valueAsDate = new Date();

// Load data from localStorage
let weightData = JSON.parse(localStorage.getItem('weights')) || {};
let goalData = JSON.parse(localStorage.getItem('weightGoal')) || { target: null };

// Check if app is installed
function checkInstalled() {
  if (window.matchMedia('(display-mode: standalone)').matches) {
    installBtn.style.display = 'none';
    installBanner.style.display = 'none';
  }
}

// Theme management
function applyTheme(isDark) {
  const theme = isDark ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);
  themeBtn.textContent = isDark ? '☀️ Light Mode' : '🌙 Dark Mode';
  
  // Update chart theme if it exists
  if (weightChart) {
    weightChart.options.scales.x.grid.color = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
    weightChart.options.scales.y.grid.color = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
    weightChart.update();
  }
}

// Check for saved theme preference
const savedTheme = localStorage.getItem('theme');
if (savedTheme) {
  applyTheme(savedTheme === 'dark');
} else {
  // Auto-detect system preference
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  applyTheme(prefersDark);
}

// Install PWA logic
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  
  // Only show install button if not already installed
  if (!window.matchMedia('(display-mode: standalone)').matches) {
    installBtn.style.display = 'inline-block';
    
    // Show banner after 30 seconds if not installed
    setTimeout(() => {
      if (!window.matchMedia('(display-mode: standalone)').matches) {
        const lastDismissed = localStorage.getItem('bannerDismissed');
        if (!lastDismissed || Date.now() - lastDismissed > 7 * 24 * 60 * 60 * 1000) {
          installBanner.style.display = 'flex';
        }
      }
    }, 30000);
  }
});

// Check installed status on load
window.addEventListener('load', checkInstalled);

// Install button click handler
if (installBtn) {
  installBtn.addEventListener('click', async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        installBtn.style.display = 'none';
        installBanner.style.display = 'none';
      }
      deferredPrompt = null;
    }
  });
}

// Banner install button
if (installBannerBtn) {
  installBannerBtn.addEventListener('click', () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then(choiceResult => {
        if (choiceResult.outcome === 'accepted') {
          installBanner.style.display = 'none';
        }
      });
    }
  });
}

// Dismiss banner
if (dismissBanner) {
  dismissBanner.addEventListener('click', () => {
    installBanner.style.display = 'none';
    // Don't show again for a week
    localStorage.setItem('bannerDismissed', Date.now());
  });
}

// Theme toggle
themeBtn.addEventListener('click', () => {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  applyTheme(!isDark);
});

// Save weight entry
function saveWeight() {
  const date = dateInput.value;
  const weight = parseFloat(weightInput.value);

  if (!date || isNaN(weight)) {
    showToast("⚠️ Please enter a valid date and weight");
    return;
  }

  // Check for existing entry
  if (weightData[date]) {
    if (!confirm(`You already have an entry for ${formatDate(date)}. Overwrite?`)) {
      return;
    }
  }

  weightData[date] = weight;
  localStorage.setItem('weights', JSON.stringify(weightData));
  
  weightInput.value = '';
  showToast(`✅ Saved entry for ${formatDate(date)}: ${weight} kg`);
  
  renderChart();
  renderEntriesTable();
  updateStats();
  updateGoalProgress();
  
  // Focus weight input for next entry
  weightInput.focus();
}

// Set weight goal
function setWeightGoal() {
  const target = parseFloat(targetWeightInput.value);
  
  if (isNaN(target)) {
    showToast("⚠️ Please enter a valid target weight");
    return;
  }
  
  goalData.target = target;
  localStorage.setItem('weightGoal', JSON.stringify(goalData));
  showToast(`🎯 Goal set to ${target} kg`);
  
  updateGoalProgress();
  renderChart();
}

// Update goal progress display
function updateGoalProgress() {
  if (!goalData.target) {
    goalProgress.innerHTML = '<p>Set a goal to track your progress!</p>';
    return;
  }

  const dates = Object.keys(weightData).sort();
  if (dates.length === 0) {
    goalProgress.innerHTML = '<p>No weight data to compare with goal</p>';
    return;
  }

  const latestWeight = weightData[dates[dates.length - 1]];
  const difference = latestWeight - goalData.target;
  const percentage = Math.abs(difference / goalData.target * 100).toFixed(1);

  let progressText, progressBar;
  if (difference > 0) {
    progressText = `You're ${difference.toFixed(1)} kg (${percentage}%) above your goal`;
    progressBar = `<div class="progress-bar"><div class="progress-fill" style="width: ${Math.min(100, percentage)}%; background: var(--danger-color)"></div></div>`;
  } else if (difference < 0) {
    progressText = `You're ${Math.abs(difference).toFixed(1)} kg (${percentage}%) below your goal`;
    progressBar = `<div class="progress-bar"><div class="progress-fill" style="width: ${Math.min(100, percentage)}%; background: var(--success-color)"></div></div>`;
  } else {
    progressText = "🎉 You've reached your goal weight!";
    progressBar = `<div class="progress-bar"><div class="progress-fill" style="width: 100%; background: var(--success-color)"></div></div>`;
    // Trigger confetti if goal reached
    if (difference === 0) triggerConfetti();
  }

  goalProgress.innerHTML = `
    <p>${progressText}</p>
    ${progressBar}
  `;
}

// Calculate and display statistics
function updateStats() {
  const dates = Object.keys(weightData).sort();
  if (dates.length === 0) {
    currentWeightEl.textContent = '-- kg';
    weeklyChangeEl.textContent = '-- kg';
    monthlyChangeEl.textContent = '-- kg';
    streakCountEl.textContent = '-- days';
    return;
  }

  // Current weight
  const currentWeight = weightData[dates[dates.length - 1]];
  currentWeightEl.textContent = `${currentWeight} kg`;

  // Weekly change (last 7 days)
  if (dates.length >= 2) {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekAgoDate = formatDate(weekAgo.toISOString().split('T')[0]);

    let closestWeekAgoWeight = null;
    for (let i = dates.length - 1; i >= 0; i--) {
      if (dates[i] <= weekAgoDate) {
        closestWeekAgoWeight = weightData[dates[i]];
        break;
      }
    }

    if (closestWeekAgoWeight) {
      const weeklyChange = currentWeight - closestWeekAgoWeight;
      weeklyChangeEl.textContent = `${weeklyChange > 0 ? '+' : ''}${weeklyChange.toFixed(1)} kg`;
      weeklyChangeEl.style.color = weeklyChange < 0 ? 'var(--success-color)' : 'var(--danger-color)';
    } else {
      weeklyChangeEl.textContent = 'N/A';
    }
  } else {
    weeklyChangeEl.textContent = 'N/A';
  }

  // Monthly change (last 30 days)
  if (dates.length >= 2) {
    const monthAgo = new Date();
    monthAgo.setDate(monthAgo.getDate() - 30);
    const monthAgoDate = formatDate(monthAgo.toISOString().split('T')[0]);

    let closestMonthAgoWeight = null;
    for (let i = dates.length - 1; i >= 0; i--) {
      if (dates[i] <= monthAgoDate) {
        closestMonthAgoWeight = weightData[dates[i]];
        break;
      }
    }

    if (closestMonthAgoWeight) {
      const monthlyChange = currentWeight - closestMonthAgoWeight;
      monthlyChangeEl.textContent = `${monthlyChange > 0 ? '+' : ''}${monthlyChange.toFixed(1)} kg`;
      monthlyChangeEl.style.color = monthlyChange < 0 ? 'var(--success-color)' : 'var(--danger-color)';
    } else {
      monthlyChangeEl.textContent = 'N/A';
    }
  } else {
    monthlyChangeEl.textContent = 'N/A';
  }

  // Streak calculation
  let streak = 1;
  const today = new Date();
  let checkDate = new Date(today);

  for (let i = 1; i <= 30; i++) { // Max 30 day streak check
    checkDate.setDate(checkDate.getDate() - 1);
    const checkDateStr = formatDate(checkDate.toISOString().split('T')[0]);
    
    if (weightData[checkDateStr]) {
      streak++;
    } else {
      break;
    }
  }

  streakCountEl.textContent = `${streak} day${streak !== 1 ? 's' : ''}`;
}

// Render entries table
function renderEntriesTable(filter = '') {
  entriesTable.innerHTML = '';
  
  const filteredEntries = Object.entries(weightData)
    .filter(([date, weight]) => 
      date.includes(filter) || weight.toString().includes(filter)
    )
    .sort((a, b) => new Date(b[0]) - new Date(a[0]));

  if (filteredEntries.length === 0) {
    const row = document.createElement('tr');
    row.innerHTML = `<td colspan="3" style="text-align: center;">No entries found</td>`;
    entriesTable.appendChild(row);
    return;
  }

  filteredEntries.forEach(([date, weight]) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${formatDate(date)}</td>
      <td>${weight} kg</td>
      <td>
        <button class="edit-btn" data-date="${date}">✏️ Edit</button>
        <button class="delete-btn" data-date="${date}">🗑️ Delete</button>
      </td>
    `;
    entriesTable.appendChild(row);
  });

  // Add event listeners to edit/delete buttons
  document.querySelectorAll('.edit-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const date = e.target.getAttribute('data-date');
      openEditModal(date);
    });
  });

  document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const date = e.target.getAttribute('data-date');
      deleteEntry(date);
    });
  });
}

// Open edit modal
function openEditModal(date) {
  currentlyEditingId = date;
  editDate.value = date;
  editWeight.value = weightData[date];
  editModal.style.display = 'flex';
  editWeight.focus();
}

// Save edited entry
function saveEditedEntry() {
  const newDate = editDate.value;
  const newWeight = parseFloat(editWeight.value);

  if (!newDate || isNaN(newWeight)) {
    showToast("⚠️ Please enter valid date and weight");
    return;
  }

  // If date changed, we need to delete old entry and create new one
  if (newDate !== currentlyEditingId) {
    delete weightData[currentlyEditingId];
  }

  weightData[newDate] = newWeight;
  localStorage.setItem('weights', JSON.stringify(weightData));
  
  editModal.style.display = 'none';
  showToast("✅ Entry updated successfully");
  
  renderChart();
  renderEntriesTable();
  updateStats();
  updateGoalProgress();
}

// Delete entry
function deleteEntry(date) {
  if (confirm(`Are you sure you want to delete the entry for ${formatDate(date)}?`)) {
    delete weightData[date];
    localStorage.setItem('weights', JSON.stringify(weightData));
    showToast("🗑️ Entry deleted");
    
    renderChart();
    renderEntriesTable();
    updateStats();
    updateGoalProgress();
  }
}

// Export data
function exportData() {
  const data = {
    weights: weightData,
    goal: goalData.target || null,
    exportedAt: new Date().toISOString()
  };

  const dataStr = JSON.stringify(data, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `weight-tracker-export-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  showToast("📤 Data exported successfully");
}

// Filter data based on time range
function getFilteredData(range) {
  const now = new Date();
  return Object.keys(weightData)
    .filter(date => {
      if (range === 'all') return true;
      const diff = (now - new Date(date)) / (1000 * 60 * 60 * 24);
      return diff <= parseInt(range);
    })
    .sort();
}

// Render chart
function renderChart() {
  const range = timeRange ? timeRange.value : 'all';
  const sortedDates = getFilteredData(range);
  const weights = sortedDates.map(date => weightData[date]);

  if (weightChart instanceof Chart) {
    weightChart.destroy();
  }

  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const gridColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
  const textColor = isDark ? 'rgba(255, 255, 255, 0.8)' : 'rgba(0, 0, 0, 0.8)';

  const goalAnnotation = goalData.target ? {
    type: 'line',
    mode: 'horizontal',
    scaleID: 'y',
    value: goalData.target,
    borderColor: 'var(--success-color)',
    borderWidth: 2,
    borderDash: [6, 6],
    label: {
      content: 'Goal: ' + goalData.target + 'kg',
      enabled: true,
      position: 'right',
      backgroundColor: 'rgba(0,0,0,0.7)'
    }
  } : null;

  weightChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: sortedDates.map(date => formatDate(date, true)),
      datasets: [{
        label: 'Weight (kg)',
        data: weights,
        borderColor: 'var(--primary-color)',
        backgroundColor: 'rgba(74, 144, 226, 0.15)',
        fill: true,
        tension: 0.3,
        pointRadius: 5,
        pointBackgroundColor: 'var(--primary-color)',
        pointHoverRadius: 7
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: true },
        tooltip: {
          callbacks: {
            label: context => `${context.parsed.y} kg`
          }
        },
        annotation: goalAnnotation ? {
          annotations: { goal: goalAnnotation }
        } : {}
      },
      scales: {
        y: {
          beginAtZero: false,
          title: {
            display: true,
            text: 'Weight (kg)',
            color: textColor
          },
          grid: {
            color: gridColor
          },
          ticks: {
            color: textColor
          }
        },
        x: {
          title: {
            display: true,
            text: 'Date',
            color: textColor
          },
          grid: {
            color: gridColor
          },
          ticks: {
            color: textColor
          }
        }
      }
    }
  });
}

// Show toast notification
function showToast(msg) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// Simple confetti effect
function triggerConfetti() {
  const confetti = document.createElement('div');
  confetti.className = 'confetti';
  confetti.innerHTML = `
    <style>
      .confetti {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 1000;
      }
      .confetti-piece {
        position: absolute;
        width: 10px;
        height: 10px;
        background: var(--secondary-color);
        opacity: 0;
      }
    </style>
  `;
  
  document.body.appendChild(confetti);
  
  // Create confetti pieces
  for (let i = 0; i < 100; i++) {
    const piece = document.createElement('div');
    piece.className = 'confetti-piece';
    piece.style.left = Math.random() * 100 + 'vw';
    piece.style.animation = `confetti-fall ${Math.random() * 3 + 2}s ease-in forwards`;
    piece.style.animationDelay = Math.random() * 2 + 's';
    piece.style.setProperty('--hue', Math.random() * 360);
    confetti.appendChild(piece);
    
    // Add animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes confetti-fall {
        0% {
          transform: translateY(-100vh) rotate(0deg);
          opacity: 1;
        }
        100% {
          transform: translateY(100vh) rotate(${Math.random() * 360}deg);
          opacity: 0;
        }
      }
    `;
    confetti.appendChild(style);
  }
  
  // Remove after animation
  setTimeout(() => confetti.remove(), 5000);
}

// Format date for display
function formatDate(dateStr, short = false) {
  const date = new Date(dateStr);
  if (short) {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

// Event listeners
saveBtn.addEventListener('click', saveWeight);
setGoalBtn.addEventListener('click', setWeightGoal);
exportBtn.addEventListener('click', exportData);
timeRange.addEventListener('change', renderChart);
searchEntry.addEventListener('input', (e) => renderEntriesTable(e.target.value));
closeModal.addEventListener('click', () => editModal.style.display = 'none');
saveEditBtn.addEventListener('click', saveEditedEntry);
deleteEntryBtn.addEventListener('click', () => {
  if (currentlyEditingId) {
    deleteEntry(currentlyEditingId);
    editModal.style.display = 'none';
  }
});

// Close modal when clicking outside
window.addEventListener('click', (e) => {
  if (e.target === editModal) {
    editModal.style.display = 'none';
  }
});

// Initialize the app
function initApp() {
  renderChart();
  renderEntriesTable();
  updateStats();
  updateGoalProgress();
  
  // Set target weight if exists
  if (goalData.target) {
    targetWeightInput.value = goalData.target;
    updateGoalProgress();
  }
  
  // Focus weight input on load
  weightInput.focus();
}

// Start the app
initApp();

// Register service worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js', {
      scope: './'
    })
    .then(registration => {
      console.log('ServiceWorker registration successful');
    })
    .catch(err => {
      console.log('ServiceWorker registration failed: ', err);
    });
  });
}
