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
  targetWeightInput: document.getElementById('targetWeight'),
  setGoalBtn: document.getElementById('setGoalBtn'),
  removeGoalBtn: document.getElementById('removeGoalBtn'),
  goalProgress: document.getElementById('goalProgress'),
  currentWeightEl: document.getElementById('currentWeight'),
  weeklyChangeEl: document.getElementById('weeklyChange'),
  monthlyChangeEl: document.getElementById('monthlyChange'),
  streakCountEl: document.getElementById('streakCount'),
  entriesTable: document.getElementById('entriesTable').querySelector('tbody'),
  searchEntry: document.getElementById('searchEntry'),
  editModal: document.getElementById('editModal'),
  closeModal: document.querySelector('.close-modal'),
  editDate: document.getElementById('editDate'),
  editWeight: document.getElementById('editWeight'),
  saveEditBtn: document.getElementById('saveEditBtn'),
  deleteEntryBtn: document.getElementById('deleteEntryBtn'),
  currentGoalDisplay: document.getElementById('currentGoalDisplay'),
  fabBtn: document.getElementById('fabBtn'),
  quickAddCard: document.getElementById('quickAddCard'),
  quickAddWeight: document.getElementById('quickAddWeight'),
  quickAddSubmit: document.getElementById('quickAddSubmit'),
  closeQuickAdd: document.getElementById('closeQuickAdd'),
  addSampleDataBtn: document.getElementById('addSampleDataBtn'),
  onboardingModal: document.getElementById('onboardingModal'),
  onboardingNext: document.getElementById('onboardingNext'),
  onboardingNext2: document.getElementById('onboardingNext2'),
  onboardingPrev: document.getElementById('onboardingPrev'),
  onboardingPrev2: document.getElementById('onboardingPrev2'),
  onboardingClose: document.getElementById('onboardingClose'),
  showHelp: document.getElementById('showHelp'),
  goalBanner: document.getElementById('goalBanner')
};

// Chart setup
const ctx = document.getElementById('weightChart').getContext('2d');
let weightChart = null;
let deferredPrompt = null;
let currentlyEditingId = null;

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
  elements.themeBtn.innerHTML = isDark ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
  
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
  document.querySelector('.onboarding-step').classList.add('active');
}

// Format date for display
function formatDate(dateString, short = false, forExport = false) {
  const date = new Date(dateString);
  if (forExport) {
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }
  if (short) {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
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
  const target = parseFloat(prompt("Enter your goal weight in kg:"));
  
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
}

// Remove weight goal
function removeWeightGoal() {
  if (confirm("Are you sure you want to remove your goal weight?")) {
    goalData.target = null;
    localStorage.setItem('weightGoal', JSON.stringify(goalData));
    showToast("Goal weight removed");
    updateCurrentGoalDisplay();
    renderChart();
  }
}

// Update current goal display
function updateCurrentGoalDisplay() {
  if (goalData.target) {
    elements.currentGoalDisplay.textContent = `${goalData.target} kg`;
    elements.goalBanner.style.display = 'flex';
  } else {
    elements.currentGoalDisplay.textContent = "Not Set";
    elements.goalBanner.style.display = 'none';
  }
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

// Get filtered data based on time range
function getFilteredData(range) {
  const allDates = Object.keys(weightData).sort();
  if (range === 'all') return allDates;

  const now = new Date();
  let cutoffDate = new Date();

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
      return allDates;
  }

  return allDates.filter(date => new Date(date) >= cutoffDate);
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
    document.getElementById('noDataMessage').style.display = 'flex';
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
  const tbody = elements.entriesTable;
  tbody.innerHTML = '';

  let sortedDates = Object.keys(weightData).sort().reverse();
  
  if (searchTerm) {
    const term = searchTerm.toLowerCase();
    sortedDates = sortedDates.filter(date => {
      return formatDate(date).toLowerCase().includes(term) || 
             weightData[date].toString().includes(term);
    });
  }

  if (sortedDates.length === 0) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td colspan="3" class="empty-state">No entries found</td>`;
    tbody.appendChild(tr);
    return;
  }

  sortedDates.forEach(date => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${formatDate(date)}</td>
      <td>${weightData[date]} kg</td>
      <td class="actions">
        <button class="btn btn-small btn-secondary edit-btn" data-id="${date}">
          <i class="fas fa-edit"></i>
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  // Add event listeners to edit buttons
  document.querySelectorAll('.edit-btn').forEach(btn => {
    btn.addEventListener('click', () => editEntry(btn.dataset.id));
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
  const newDate = elements.editDate.value;
  const newWeight = parseFloat(elements.editWeight.value);

  if (!newDate || isNaN(newWeight)) {
    showToast("⚠️ Please enter valid data");
    return;
  }

  // If date changed, we need to remove old entry and add new one
  if (currentlyEditingId !== newDate) {
    delete weightData[currentlyEditingId];
  }

  weightData[newDate] = newWeight;
  localStorage.setItem('weights', encryptData(weightData));
  
  elements.editModal.style.display = 'none';
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
    localStorage.setItem('weights', encryptData(weightData));
    showToast("🗑️ Entry deleted");
    
    renderChart();
    renderEntriesTable();
    updateStats();
    updateGoalProgress();
  }
}

// Update stats
function updateStats() {
  const dates = Object.keys(weightData).sort();
  if (dates.length === 0) {
    elements.currentWeightEl.textContent = '-';
    elements.weeklyChangeEl.textContent = '-';
    elements.monthlyChangeEl.textContent = '-';
    elements.streakCountEl.textContent = '0 days';
    return;
  }

  // Current weight (most recent entry)
  const currentWeight = weightData[dates[dates.length - 1]];
  elements.currentWeightEl.textContent = `${currentWeight} kg`;

  // Weekly change (last entry vs entry 7 days before)
  if (dates.length >= 2) {
    const lastDate = new Date(dates[dates.length - 1]);
    const weekAgo = new Date(lastDate);
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    const weekAgoDate = weekAgo.toISOString().split('T')[0];
    const weekAgoWeight = weightData[weekAgoDate];
    
    if (weekAgoWeight) {
      const change = currentWeight - weekAgoWeight;
      const changeText = change > 0 ? `+${change.toFixed(1)}` : change.toFixed(1);
      elements.weeklyChangeEl.textContent = `${changeText} kg`;
      elements.weeklyChangeEl.style.color = change < 0 ? 'var(--success-color)' : change > 0 ? 'var(--danger-color)' : 'inherit';
    } else {
      elements.weeklyChangeEl.textContent = 'N/A';
    }
  } else {
    elements.weeklyChangeEl.textContent = 'N/A';
  }

  // Monthly change (last entry vs entry 30 days before)
  if (dates.length >= 2) {
    const lastDate = new Date(dates[dates.length - 1]);
    const monthAgo = new Date(lastDate);
    monthAgo.setDate(monthAgo.getDate() - 30);
    
    const monthAgoDate = monthAgo.toISOString().split('T')[0];
    const monthAgoWeight = weightData[monthAgoDate];
    
    if (monthAgoWeight) {
      const change = currentWeight - monthAgoWeight;
      const changeText = change > 0 ? `+${change.toFixed(1)}` : change.toFixed(1);
      elements.monthlyChangeEl.textContent = `${changeText} kg`;
      elements.monthlyChangeEl.style.color = change < 0 ? 'var(--success-color)' : change > 0 ? 'var(--danger-color)' : 'inherit';
    } else {
      elements.monthlyChangeEl.textContent = 'N/A';
    }
  } else {
    elements.monthlyChangeEl.textContent = 'N/A';
  }

  // Streak calculation (consecutive days with entries)
  let streak = 1;
  for (let i = dates.length - 1; i > 0; i--) {
    const currentDate = new Date(dates[i]);
    const prevDate = new Date(dates[i - 1]);
    const diffTime = currentDate - prevDate;
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    
    if (diffDays === 1) {
      streak++;
    } else {
      break;
    }
  }
  elements.streakCountEl.textContent = `${streak} day${streak !== 1 ? 's' : ''}`;
}

// Update goal progress
function updateGoalProgress() {
  if (!goalData.target) return;

  const dates = Object.keys(weightData).sort();
  if (dates.length === 0) return;

  const currentWeight = weightData[dates[dates.length - 1]];
  const progress = ((goalData.target - currentWeight) / Math.abs(goalData.target - currentWeight)) * -1;
  
  // Update progress bar if it exists
  const progressBar = document.getElementById('goalProgressBar');
  if (progressBar) {
    progressBar.style.width = `${Math.abs(progress) * 100}%`;
    progressBar.style.backgroundColor = progress < 0 ? 'var(--danger-color)' : 'var(--success-color)';
  }
}

// Add sample data for new users
function addSampleData() {
  if (Object.keys(weightData).length > 0 && !confirm("This will add sample data. Your existing data will be preserved. Continue?")) {
    return;
  }

  const today = new Date();
  const sampleData = {};
  
  // Generate 30 days of sample data with a downward trend
  for (let i = 30; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    
    // Skip if user already has data for this date
    if (weightData[dateStr]) continue;
    
    // Generate weight with downward trend and some randomness
    const baseWeight = 75 - (i * 0.1);
    const randomFluctuation = (Math.random() * 0.5) - 0.25;
    sampleData[dateStr] = parseFloat((baseWeight + randomFluctuation).toFixed(1));
  }
  
  // Merge with existing data
  weightData = { ...sampleData, ...weightData };
  localStorage.setItem('weights', encryptData(weightData));
  
  // Set a sample goal if none exists
  if (!goalData.target) {
    goalData.target = 72;
    localStorage.setItem('weightGoal', JSON.stringify(goalData));
  }
  
  showToast("📊 Sample data added");
  renderChart();
  renderEntriesTable();
  updateStats();
  updateGoalProgress();
  updateCurrentGoalDisplay();
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
  
  // Focus weight input on page load
  elements.weightInput.focus();
}

// Event listeners
elements.saveBtn.addEventListener('click', saveWeight);
elements.setGoalBtn.addEventListener('click', setWeightGoal);
elements.removeGoalBtn.addEventListener('click', removeWeightGoal);
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
elements.themeBtn.addEventListener('click', () => {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  applyTheme(!isDark);
});
elements.fabBtn.addEventListener('click', () => {
  elements.quickAddCard.classList.toggle('active');
});
elements.quickAddSubmit.addEventListener('click', quickAddWeight);
elements.closeQuickAdd.addEventListener('click', () => {
  elements.quickAddCard.classList.remove('active');
});
elements.addSampleDataBtn.addEventListener('click', addSampleData);
elements.showHelp.addEventListener('click', showOnboarding);

// Bottom nav navigation
document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', function() {
    const target = this.getAttribute('data-target');
    document.querySelectorAll('section').forEach(section => {
      section.style.display = 'none';
    });
    document.getElementById(target.replace('Section', '')).style.display = 'block';
    
    // Update active state
    document.querySelectorAll('.nav-item').forEach(navItem => {
      navItem.classList.toggle('active', navItem === this);
    });
  });
});

// PWA Installation
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  elements.installBanner.style.display = 'flex';
});

elements.installBannerBtn.addEventListener('click', () => {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then((choiceResult) => {
      if (choiceResult.outcome === 'accepted') {
        elements.installBanner.style.display = 'none';
      }
      deferredPrompt = null;
    });
  }
});

elements.dismissBanner.addEventListener('click', () => {
  elements.installBanner.style.display = 'none';
});

// Onboarding navigation
elements.onboardingNext.addEventListener('click', () => {
  document.querySelector('.onboarding-step.active').classList.remove('active');
  document.querySelectorAll('.onboarding-step')[1].classList.add('active');
});

elements.onboardingNext2.addEventListener('click', () => {
  document.querySelector('.onboarding-step.active').classList.remove('active');
  document.querySelectorAll('.onboarding-step')[2].classList.add('active');
});

elements.onboardingPrev.addEventListener('click', () => {
  document.querySelector('.onboarding-step.active').classList.remove('active');
  document.querySelectorAll('.onboarding-step')[0].classList.add('active');
});

elements.onboardingPrev2.addEventListener('click', () => {
  document.querySelector('.onboarding-step.active').classList.remove('active');
  document.querySelectorAll('.onboarding-step')[1].classList.add('active');
});

elements.onboardingClose.addEventListener('click', () => {
  elements.onboardingModal.style.display = 'none';
});

// Start the app when DOM is loaded
document.addEventListener('DOMContentLoaded', initApp);
