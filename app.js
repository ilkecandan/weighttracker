// DOM Elements
const elements = {
  dateInput: document.getElementById('date'),
  weightInput: document.getElementById('weight'),
  saveBtn: document.getElementById('saveBtn'),
  installBtn: document.getElementById('installBtn'),
  installBanner: document.getElementById('installBanner'),
  installBannerBtn: document.getElementById('installBannerBtn'),
  dismissBanner: document.getElementById('dismissBanner'),
  timeRange: document.getElementById('timeRange'),
  exportBtn: document.getElementById('exportBtn'),
  themeBtn: document.getElementById('themeBtn'),
  themeNavBtn: document.getElementById('themeNavBtn'),
  targetWeightInput: document.getElementById('targetWeight'),
  setGoalBtn: document.getElementById('setGoalBtn'),
  noGoalBtn: document.getElementById('noGoalBtn'),
  goalProgress: document.getElementById('goalProgress'),
  currentGoalDisplay: document.getElementById('currentGoalDisplay'),
  editGoalBtn: document.getElementById('editGoalBtn'),
  currentWeightEl: document.getElementById('currentWeight'),
  weeklyChangeEl: document.getElementById('weeklyChange'),
  monthlyChangeEl: document.getElementById('monthlyChange'),
  streakCountEl: document.getElementById('streakCount'),
  entriesTable: document.getElementById('entriesTable').querySelector('tbody'),
  searchEntry: document.getElementById('searchEntry'),
  editModal: document.getElementById('editModal'),
  goalModal: document.getElementById('goalModal'),
  closeModal: document.querySelector('.close-modal'),
  closeGoalModal: document.getElementById('closeGoalModal'),
  editDate: document.getElementById('editDate'),
  editWeight: document.getElementById('editWeight'),
  saveEditBtn: document.getElementById('saveEditBtn'),
  deleteEntryBtn: document.getElementById('deleteEntryBtn'),
  fabBtn: document.getElementById('fabBtn'),
  quickAddCard: document.getElementById('quickAddCard'),
  quickAddWeight: document.getElementById('quickAddWeight'),
  quickAddSubmit: document.getElementById('quickAddSubmit'),
  closeQuickAdd: document.getElementById('closeQuickAdd'),
  onboardingModal: document.getElementById('onboardingModal'),
  onboardingNext: document.getElementById('onboardingNext'),
  onboardingPrev: document.getElementById('onboardingPrev'),
  onboardingClose: document.getElementById('onboardingClose'),
  onboardingSteps: document.querySelectorAll('.onboarding-step'),
  bottomNav: document.getElementById('bottomNav'),
  navItems: document.querySelectorAll('.nav-item')
};

// Chart setup
const ctx = document.getElementById('weightChart').getContext('2d');
let weightChart = null;
let deferredPrompt = null;
let currentlyEditingId = null;
let currentOnboardingStep = 0;

// Initialize with today's date
elements.dateInput.valueAsDate = new Date();

// Simple encryption key (in a real app, use more secure key management)
const CRYPTO_KEY = 'your-secure-key-123';

// Encrypt data
function encryptData(data) {
  try {
    return btoa(encodeURIComponent(JSON.stringify(data)).split('').map(char => 
      String.fromCharCode(char.charCodeAt(0) + CRYPTO_KEY.length)
    ).join(''));
  } catch (e) {
    console.error('Encryption failed:', e);
    return data;
  }
}

// Decrypt data
function decryptData(encrypted) {
  try {
    return JSON.parse(decodeURIComponent(atob(encrypted).split('').map(char => 
      String.fromCharCode(char.charCodeAt(0) - CRYPTO_KEY.length)
    ).join('')));
  } catch (e) {
    console.error('Decryption failed:', e);
    return encrypted;
  }
}

// Load encrypted data from localStorage
let weightData = JSON.parse(localStorage.getItem('weights')) || {};
let goalData = JSON.parse(localStorage.getItem('weightGoal')) || { target: null };

// Try to decrypt if data appears encrypted
if (Object.keys(weightData).length > 0 && typeof Object.values(weightData)[0] === 'string') {
  try {
    const decrypted = decryptData(localStorage.getItem('weights'));
    weightData = JSON.parse(decrypted) || {};
  } catch (e) {
    console.log('Data not encrypted or corrupted');
  }
}

// Check if app is installed
function checkInstalled() {
  if (window.matchMedia('(display-mode: standalone)').matches) {
    elements.installBtn.style.display = 'none';
    elements.installBanner.style.display = 'none';
  }
}

// Theme management
function applyTheme(isDark) {
  const theme = isDark ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);
  elements.themeBtn.innerHTML = isDark ? '<i class="fas fa-sun"></i> Light Mode' : '<i class="fas fa-moon"></i> Dark Mode';
  elements.themeNavBtn.innerHTML = isDark ? '<i class="fas fa-sun"></i><span>Light</span>' : '<i class="fas fa-moon"></i><span>Dark</span>';
  
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

// Show onboarding if first visit
function checkFirstVisit() {
  const hasVisited = localStorage.getItem('hasVisited');
  if (!hasVisited) {
    showOnboarding();
    localStorage.setItem('hasVisited', 'true');
  }
}

// Onboarding flow
function showOnboarding() {
  elements.onboardingModal.style.display = 'flex';
  showOnboardingStep(0);
}

function showOnboardingStep(step) {
  currentOnboardingStep = step;
  elements.onboardingSteps.forEach((s, i) => {
    s.style.display = i === step ? 'block' : 'none';
  });
  
  elements.onboardingPrev.style.display = step === 0 ? 'none' : 'block';
  elements.onboardingNext.style.display = step === elements.onboardingSteps.length - 1 ? 'none' : 'block';
}

// Format date for display
function formatDate(dateString, short = false, excelFormat = false) {
  const date = new Date(dateString);
  
  if (excelFormat) {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }
  
  if (short) {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  }
  
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

// Show toast notification
function showToast(message) {
  const toast = elements.toast;
  toast.textContent = message;
  toast.style.display = 'block';
  
  setTimeout(() => {
    toast.style.display = 'none';
  }, 3000);
}

// Save weight entry
function saveWeight() {
  const date = elements.dateInput.value;
  const weight = parseFloat(elements.weightInput.value);

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
  localStorage.setItem('weights', encryptData(weightData));
  
  elements.weightInput.value = '';
  showToast(`✅ Saved entry for ${formatDate(date)}: ${weight} kg`);
  
  renderChart();
  renderEntriesTable();
  updateStats();
  updateGoalProgress();
  
  // Focus weight input for next entry
  elements.weightInput.focus();
}

// Quick add weight
function quickAddWeight() {
  const weight = parseFloat(elements.quickAddWeight.value);
  const date = new Date().toISOString().split('T')[0];

  if (isNaN(weight)) {
    showToast("⚠️ Please enter a valid weight");
    return;
  }

  weightData[date] = weight;
  localStorage.setItem('weights', encryptData(weightData));
  
  elements.quickAddWeight.value = '';
  showToast(`✅ Quick-added today's weight: ${weight} kg`);
  
  renderChart();
  renderEntriesTable();
  updateStats();
  updateGoalProgress();
  
  // Hide quick add card after submission
  elements.quickAddCard.classList.remove('active');
}

// Set weight goal
function setWeightGoal() {
  const target = parseFloat(elements.targetWeightInput.value);
  
  if (isNaN(target)) {
    showToast("⚠️ Please enter a valid target weight");
    return;
  }
  
  goalData.target = target;
  localStorage.setItem('weightGoal', JSON.stringify(goalData));
  showToast(`🎯 Goal set to ${target} kg`);
  
  updateGoalProgress();
  renderChart();
  updateCurrentGoalDisplay();
  elements.goalModal.style.display = 'none';
}

// Remove weight goal
function removeWeightGoal() {
  goalData.target = null;
  localStorage.setItem('weightGoal', JSON.stringify(goalData));
  showToast("🎯 Goal weight removed");
  
  updateGoalProgress();
  renderChart();
  updateCurrentGoalDisplay();
  elements.goalModal.style.display = 'none';
}

// Update current goal display
function updateCurrentGoalDisplay() {
  if (goalData.target) {
    elements.currentGoalDisplay.textContent = `${goalData.target} kg`;
  } else {
    elements.currentGoalDisplay.textContent = "Not Set";
  }
}

// Update goal progress
function updateGoalProgress() {
  if (!goalData.target) {
    elements.goalProgress.style.width = '0%';
    return;
  }

  const dates = Object.keys(weightData).sort();
  if (dates.length === 0) {
    elements.goalProgress.style.width = '0%';
    return;
  }

  const latestWeight = weightData[dates[dates.length - 1]];
  const progress = ((latestWeight - goalData.target) / (weightData[dates[0]] - goalData.target)) * 100;
  const progressPercent = Math.min(100, Math.max(0, 100 - progress));

  elements.goalProgress.style.width = `${progressPercent}%`;
}

// Get filtered data based on time range
function getFilteredData(range) {
  const now = new Date();
  const dates = Object.keys(weightData).sort();
  
  if (dates.length === 0) return [];
  
  if (range === 'all') return dates;
  
  const cutoffDate = new Date();
  
  switch (range) {
    case 'week':
      cutoffDate.setDate(now.getDate() - 7);
      break;
    case 'month':
      cutoffDate.setMonth(now.getMonth() - 1);
      break;
    case '3months':
      cutoffDate.setMonth(now.getMonth() - 3);
      break;
    case 'year':
      cutoffDate.setFullYear(now.getFullYear() - 1);
      break;
    default:
      return dates;
  }
  
  return dates.filter(date => new Date(date) >= cutoffDate);
}

// Enhanced Excel export
function exportData() {
  const dates = Object.keys(weightData).sort();
  if (dates.length === 0) {
    showToast("⚠️ No data to export");
    return;
  }

  // Create CSV with better formatting
  let csvContent = "Weight Tracker Export\n\n";
  csvContent += "Date,Weight (kg),Notes\n";
  
  // Add data rows with formatted dates
  dates.forEach(date => {
    const formattedDate = formatDate(date, false, true);
    csvContent += `${formattedDate},${weightData[date]},\n`;
  });

  // Add summary section
  csvContent += `\nSummary\n`;
  csvContent += `Total Entries,${dates.length}\n`;
  csvContent += `Date Range,${formatDate(dates[0], false, true)} to ${formatDate(dates[dates.length - 1], false, true)}\n`;
  
  // Add goal if exists
  if (goalData.target) {
    csvContent += `Goal Weight,${goalData.target} kg\n`;
    
    // Calculate progress
    const latestWeight = weightData[dates[dates.length - 1]];
    const progress = ((latestWeight - goalData.target) / (weightData[dates[0]] - goalData.target)) * 100;
    const progressPercent = Math.min(100, Math.max(0, 100 - progress));
    
    csvContent += `Progress Toward Goal,${progressPercent.toFixed(1)}%\n`;
  }

  // Create download link
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `Weight_Tracker_Export_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  showToast("📤 Data exported as CSV (Excel-friendly)");
}

// Enhanced chart rendering with animations
function renderChart() {
  const range = elements.timeRange ? elements.timeRange.value : 'all';
  const sortedDates = getFilteredData(range);
  const weights = sortedDates.map(date => weightData[date]);

  if (weightChart instanceof Chart) {
    weightChart.destroy();
  }

  if (sortedDates.length === 0) {
    document.getElementById('weightChart').style.display = 'none';
    document.getElementById('noDataMessage').style.display = 'block';
    return;
  }

  document.getElementById('weightChart').style.display = 'block';
  document.getElementById('noDataMessage').style.display = 'none';

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
        tension: 0.4,
        pointRadius: 5,
        pointBackgroundColor: 'var(--primary-color)',
        pointHoverRadius: 7,
        borderWidth: 3,
        pointHoverBorderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: 1000,
        easing: 'easeOutQuart'
      },
      plugins: {
        legend: { 
          display: true,
          labels: {
            usePointStyle: true,
            padding: 20
          }
        },
        tooltip: {
          callbacks: {
            label: context => `${context.parsed.y} kg`,
            title: context => formatDate(context[0].label, false)
          },
          displayColors: false,
          backgroundColor: 'rgba(0,0,0,0.8)',
          titleFont: { size: 14 },
          bodyFont: { size: 16 },
          padding: 12,
          cornerRadius: 8
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
            color: textColor,
            font: {
              weight: 'bold'
            }
          },
          grid: {
            color: gridColor
          },
          ticks: {
            color: textColor,
            callback: value => value + ' kg'
          }
        },
        x: {
          title: {
            display: true,
            text: 'Date',
            color: textColor,
            font: {
              weight: 'bold'
            }
          },
          grid: {
            color: gridColor
          },
          ticks: {
            color: textColor,
            maxRotation: 45,
            minRotation: 45
          }
        }
      },
      layout: {
        padding: {
          top: 20,
          right: 20,
          bottom: 20,
          left: 20
        }
      }
    }
  });
}

// Render entries table
function renderEntriesTable(searchTerm = '') {
  const tableBody = elements.entriesTable;
  tableBody.innerHTML = '';

  let dates = Object.keys(weightData).sort().reverse();
  
  if (searchTerm) {
    const searchLower = searchTerm.toLowerCase();
    dates = dates.filter(date => {
      const formattedDate = formatDate(date).toLowerCase();
      const weight = weightData[date].toString().toLowerCase();
      return formattedDate.includes(searchLower) || weight.includes(searchLower);
    });
  }

  if (dates.length === 0) {
    const row = document.createElement('tr');
    row.innerHTML = `<td colspan="3" class="no-entries">No entries found</td>`;
    tableBody.appendChild(row);
    return;
  }

  dates.forEach(date => {
    const row = document.createElement('tr');
    row.dataset.date = date;
    
    row.innerHTML = `
      <td>${formatDate(date)}</td>
      <td>${weightData[date]} kg</td>
      <td class="actions">
        <button class="btn btn-small edit-btn" data-date="${date}">
          <i class="fas fa-edit"></i>
        </button>
      </td>
    `;
    
    tableBody.appendChild(row);
  });

  // Add event listeners to edit buttons
  document.querySelectorAll('.edit-btn').forEach(btn => {
    btn.addEventListener('click', () => editEntry(btn.dataset.date));
  });
}

// Edit entry
function editEntry(date) {
  currentlyEditingId = date;
  elements.editDate.value = date;
  elements.editWeight.value = weightData[date];
  elements.editModal.style.display = 'flex';
}

// Save edited entry
function saveEditedEntry() {
  if (!currentlyEditingId) return;

  const newDate = elements.editDate.value;
  const newWeight = parseFloat(elements.editWeight.value);

  if (!newDate || isNaN(newWeight)) {
    showToast("⚠️ Please enter valid data");
    return;
  }

  // If date changed, we need to delete old entry and create new one
  if (currentlyEditingId !== newDate) {
    delete weightData[currentlyEditingId];
  }

  weightData[newDate] = newWeight;
  localStorage.setItem('weights', encryptData(weightData));

  showToast(`✅ Updated entry for ${formatDate(newDate)}: ${newWeight} kg`);
  elements.editModal.style.display = 'none';
  
  renderChart();
  renderEntriesTable();
  updateStats();
  updateGoalProgress();
}

// Delete entry
function deleteEntry(date) {
  if (!confirm(`Delete entry for ${formatDate(date)}?`)) return;

  delete weightData[date];
  localStorage.setItem('weights', encryptData(weightData));

  showToast(`🗑️ Deleted entry for ${formatDate(date)}`);
  
  renderChart();
  renderEntriesTable();
  updateStats();
  updateGoalProgress();
}

// Update stats
function updateStats() {
  const dates = Object.keys(weightData).sort();
  if (dates.length === 0) {
    elements.currentWeightEl.textContent = '-- kg';
    elements.weeklyChangeEl.textContent = '-- kg';
    elements.monthlyChangeEl.textContent = '-- kg';
    elements.streakCountEl.textContent = '0 days';
    return;
  }

  // Current weight
  const latestWeight = weightData[dates[dates.length - 1]];
  elements.currentWeightEl.textContent = `${latestWeight} kg`;

  // Weekly change
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const weeklyEntries = dates.filter(date => new Date(date) >= oneWeekAgo);
  
  if (weeklyEntries.length >= 2) {
    const change = latestWeight - weightData[weeklyEntries[0]];
    elements.weeklyChangeEl.textContent = `${change >= 0 ? '+' : ''}${change.toFixed(1)} kg`;
    elements.weeklyChangeEl.style.color = change < 0 ? 'var(--success-color)' : change > 0 ? 'var(--danger-color)' : 'inherit';
  } else {
    elements.weeklyChangeEl.textContent = '-- kg';
  }

  // Monthly change
  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
  const monthlyEntries = dates.filter(date => new Date(date) >= oneMonthAgo);
  
  if (monthlyEntries.length >= 2) {
    const change = latestWeight - weightData[monthlyEntries[0]];
    elements.monthlyChangeEl.textContent = `${change >= 0 ? '+' : ''}${change.toFixed(1)} kg`;
    elements.monthlyChangeEl.style.color = change < 0 ? 'var(--success-color)' : change > 0 ? 'var(--danger-color)' : 'inherit';
  } else {
    elements.monthlyChangeEl.textContent = '-- kg';
  }

  // Streak calculation
  let streak = 0;
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  if (weightData[today]) {
    streak = 1;
    let checkDate = new Date(yesterday);
    
    while (weightData[checkDate.toISOString().split('T')[0]]) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    }
  } else if (weightData[yesterdayStr]) {
    streak = 1;
    let checkDate = new Date(yesterday);
    checkDate.setDate(checkDate.getDate() - 1);
    
    while (weightData[checkDate.toISOString().split('T')[0]]) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    }
  }

  elements.streakCountEl.textContent = `${streak} day${streak !== 1 ? 's' : ''}`;
}

// Initialize the app
function initApp() {
  checkFirstVisit();
  checkInstalled();
  renderChart();
  renderEntriesTable();
  updateStats();
  updateGoalProgress();
  updateCurrentGoalDisplay();
  
  if (goalData.target) {
    elements.targetWeightInput.value = goalData.target;
  }
  
  // Set today's date by default
  elements.dateInput.valueAsDate = new Date();
  elements.weightInput.focus();
}

// Event listeners
elements.saveBtn.addEventListener('click', saveWeight);
elements.setGoalBtn.addEventListener('click', setWeightGoal);
elements.noGoalBtn.addEventListener('click', removeWeightGoal);
elements.editGoalBtn.addEventListener('click', () => {
  elements.targetWeightInput.value = goalData.target || '';
  elements.goalModal.style.display = 'flex';
});
elements.closeGoalModal.addEventListener('click', () => elements.goalModal.style.display = 'none');
elements.exportBtn.addEventListener('click', exportData);
elements.timeRange.addEventListener('change', renderChart);
elements.searchEntry.addEventListener('input', (e) => renderEntriesTable(e.target.value));
elements.closeModal.addEventListener('click', () => elements.editModal.style.display = 'none');
elements.saveEditBtn.addEventListener('click', saveEditedEntry);
elements.deleteEntryBtn.addEventListener('click', () => {
  if (currentlyEditingId) {
    deleteEntry(currentlyEditingId);
    elements.editModal.style.display = 'none';
  }
});
elements.fabBtn.addEventListener('click', () => {
  elements.quickAddCard.classList.toggle('active');
});
elements.closeQuickAdd.addEventListener('click', () => {
  elements.quickAddCard.classList.remove('active');
});
elements.quickAddSubmit.addEventListener('click', quickAddWeight);
elements.onboardingNext.addEventListener('click', () => showOnboardingStep(currentOnboardingStep + 1));
elements.onboardingPrev.addEventListener('click', () => showOnboardingStep(currentOnboardingStep - 1));
elements.onboardingClose.addEventListener('click', () => elements.onboardingModal.style.display = 'none');
elements.themeBtn.addEventListener('click', () => {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  applyTheme(!isDark);
});
elements.themeNavBtn.addEventListener('click', () => {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  applyTheme(!isDark);
});

// Bottom nav navigation
elements.navItems.forEach(item => {
  item.addEventListener('click', function() {
    const target = this.getAttribute('data-target');
    document.querySelectorAll('.main-section').forEach(section => {
      section.style.display = 'none';
    });
    
    if (target) {
      document.getElementById(target).style.display = 'block';
    }
    
    // Update active state
    elements.navItems.forEach(navItem => {
      navItem.classList.toggle('active', navItem === this);
    });
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
});

// PWA installation
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  elements.installBanner.style.display = 'flex';
});

elements.installBannerBtn.addEventListener('click', async () => {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      elements.installBanner.style.display = 'none';
    }
    deferredPrompt = null;
  }
});

elements.dismissBanner.addEventListener('click', () => {
  elements.installBanner.style.display = 'none';
});

// Close modals when clicking outside
window.addEventListener('click', (e) => {
  if (e.target === elements.editModal) {
    elements.editModal.style.display = 'none';
  }
  if (e.target === elements.goalModal) {
    elements.goalModal.style.display = 'none';
  }
  if (e.target === elements.onboardingModal) {
    elements.onboardingModal.style.display = 'none';
  }
});

// Start the app
document.addEventListener('DOMContentLoaded', initApp);
