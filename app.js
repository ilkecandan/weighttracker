// DOM Elements
const elements = {
  dateInput: document.getElementById('date'),
  weightInput: document.getElementById('weight'),
  saveBtn: document.getElementById('saveBtn'),
  targetWeightInput: document.getElementById('targetWeight'),
  setGoalBtn: document.getElementById('setGoalBtn'),
  removeGoalBtn: document.getElementById('removeGoalBtn'),
  goalProgress: document.getElementById('goalProgress'),
  progressFill: document.getElementById('progressFill'),
  currentWeightDisplay: document.getElementById('currentWeightDisplay'),
  goalText: document.getElementById('goalText'),
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
  cancelEditBtn: document.getElementById('cancelEditBtn'),
  exportBtn: document.getElementById('exportBtn'),
  timeRange: document.getElementById('timeRange'),
  toast: document.getElementById('toast'),
  onboardingModal: document.getElementById('onboardingModal'),
  onboardingNext: document.getElementById('onboardingNext'),
  onboardingPrev: document.getElementById('onboardingPrev'),
  onboardingClose: document.getElementById('onboardingClose'),
  onboardingSteps: document.querySelectorAll('.onboarding-step'),
  onboardingDots: document.querySelectorAll('.dot'),
  navHome: document.getElementById('navHome'),
  navChart: document.getElementById('navChart'),
  navAdd: document.getElementById('navAdd'),
  navSettings: document.getElementById('navSettings'),
  goalTooltip: document.getElementById('goalTooltip'),
  addTooltip: document.getElementById('addTooltip')
};

// Chart setup
const ctx = document.getElementById('weightChart').getContext('2d');
let weightChart = null;
let currentlyEditingId = null;
let currentOnboardingStep = 0;

// Initialize with today's date
elements.dateInput.valueAsDate = new Date();

// Load data from localStorage
let weightData = JSON.parse(localStorage.getItem('weights')) || {};
let goalData = JSON.parse(localStorage.getItem('weightGoal')) || { target: null };

// Show onboarding if first visit
function checkFirstVisit() {
  const hasVisited = localStorage.getItem('hasVisited');
  if (!hasVisited) {
    showOnboarding();
    localStorage.setItem('hasVisited', 'true');
    
    // Show tooltips after onboarding
    setTimeout(() => {
      showTooltip(elements.goalTooltip, elements.setGoalBtn, 'Click to set your weight goal');
      setTimeout(() => {
        showTooltip(elements.addTooltip, elements.navAdd, 'Tap here to add new entries');
      }, 2000);
    }, 500);
  }
}

function showTooltip(tooltip, element, message) {
  tooltip.textContent = message;
  const rect = element.getBoundingClientRect();
  tooltip.style.top = `${rect.top - 40}px`;
  tooltip.style.left = `${rect.left + (rect.width / 2) - (tooltip.offsetWidth / 2)}px`;
  tooltip.style.opacity = '1';
  
  setTimeout(() => {
    tooltip.style.opacity = '0';
  }, 3000);
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
  
  elements.onboardingDots.forEach((dot, i) => {
    dot.classList.toggle('active', i === step);
  });
  
  elements.onboardingPrev.style.display = step === 0 ? 'none' : 'block';
  elements.onboardingNext.style.display = step === elements.onboardingSteps.length - 1 ? 'none' : 'block';
  elements.onboardingClose.style.display = step === elements.onboardingSteps.length - 1 ? 'block' : 'none';
}

// Show toast notification
function showToast(message, duration = 3000) {
  elements.toast.textContent = message;
  elements.toast.style.display = 'block';
  
  setTimeout(() => {
    elements.toast.style.display = 'none';
  }, duration);
}

// Format date for display
function formatDate(dateString, short = false, forExport = false) {
  const date = new Date(dateString);
  if (forExport) {
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }
  return date.toLocaleDateString('en-US', { 
    month: short ? 'short' : 'long', 
    day: 'numeric', 
    year: short ? undefined : 'numeric' 
  });
}

// Save weight entry
function saveWeight() {
  const date = elements.dateInput.value;
  const weight = parseFloat(elements.weightInput.value);

  if (!date || isNaN(weight)) {
    showToast("⚠️ Please enter valid date and weight");
    return;
  }

  if (weightData[date]) {
    if (!confirm(`You already have an entry for ${formatDate(date)}. Overwrite?`)) {
      return;
    }
  }

  weightData[date] = weight;
  localStorage.setItem('weights', JSON.stringify(weightData));
  
  elements.weightInput.value = '';
  showToast(`✅ Saved ${weight} kg for ${formatDate(date)}`);
  
  renderChart();
  renderEntriesTable();
  updateStats();
  updateGoalProgress();
  elements.weightInput.focus();
}

// Set weight goal
function setWeightGoal() {
  const target = parseFloat(elements.targetWeightInput.value);
  
  if (isNaN(target)) {
    showToast("⚠️ Please enter valid target weight");
    return;
  }
  
  goalData.target = target;
  localStorage.setItem('weightGoal', JSON.stringify(goalData));
  showToast(`🎯 Goal set to ${target} kg`);
  
  updateGoalProgress();
  renderChart();
}

// Remove weight goal
function removeWeightGoal() {
  goalData.target = null;
  localStorage.setItem('weightGoal', JSON.stringify(goalData));
  showToast("🎯 Goal removed");
  updateGoalProgress();
  renderChart();
}

// Update goal progress display
function updateGoalProgress() {
  if (!goalData.target) {
    elements.goalText.textContent = "No goal set";
    elements.progressFill.style.width = "0%";
    elements.currentWeightDisplay.textContent = "--";
    return;
  }

  const dates = Object.keys(weightData).sort();
  if (dates.length === 0) {
    elements.goalText.textContent = "No data yet";
    elements.progressFill.style.width = "0%";
    elements.currentWeightDisplay.textContent = "--";
    return;
  }

  const currentWeight = weightData[dates[dates.length - 1]];
  elements.currentWeightDisplay.textContent = `${currentWeight} kg`;
  elements.goalText.textContent = `Goal: ${goalData.target} kg`;

  // Calculate progress (assuming goal is to lose weight)
  const progress = ((currentWeight - goalData.target) / (weightData[dates[0]] - goalData.target)) * 100;
  const progressPercent = Math.min(100, Math.max(0, 100 - progress));
  elements.progressFill.style.width = `${progressPercent}%`;
}

// Get filtered data based on time range
function getFilteredData(range) {
  const now = new Date();
  const dates = Object.keys(weightData).sort();
  
  if (range === 'all') return dates;
  
  const cutoff = new Date();
  if (range === 'week') cutoff.setDate(now.getDate() - 7);
  else if (range === 'month') cutoff.setDate(now.getDate() - 30);
  else if (range === '3months') cutoff.setDate(now.getDate() - 90);
  
  return dates.filter(date => new Date(date) >= cutoff);
}

// Render chart with animations
function renderChart() {
  const range = elements.timeRange.value;
  const sortedDates = getFilteredData(range);
  const weights = sortedDates.map(date => weightData[date]);

  if (weightChart) {
    weightChart.destroy();
  }

  if (sortedDates.length === 0) {
    return;
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
        tension: 0.4,
        pointRadius: 5,
        pointBackgroundColor: 'var(--primary-color)',
        pointHoverRadius: 7,
        borderWidth: 3
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
        legend: { display: true },
        tooltip: {
          callbacks: {
            label: context => `${context.parsed.y} kg`,
            title: context => formatDate(context[0].label, false)
          }
        },
        annotation: goalAnnotation ? { annotations: { goal: goalAnnotation } } : {}
      },
      scales: {
        y: { 
          beginAtZero: false,
          grid: { color: gridColor },
          ticks: { color: textColor }
        },
        x: {
          grid: { color: gridColor },
          ticks: { color: textColor }
        }
      }
    }
  });
}

// Render entries table
function renderEntriesTable(searchTerm = '') {
  elements.entriesTable.innerHTML = '';
  
  const filteredDates = Object.keys(weightData)
    .sort()
    .reverse()
    .filter(date => {
      if (!searchTerm) return true;
      return date.includes(searchTerm) || 
             weightData[date].toString().includes(searchTerm) || 
             formatDate(date).toLowerCase().includes(searchTerm.toLowerCase());
    });

  if (filteredDates.length === 0) {
    const row = document.createElement('tr');
    row.innerHTML = `<td colspan="3" style="text-align: center;">No entries found</td>`;
    elements.entriesTable.appendChild(row);
    return;
  }

  filteredDates.forEach(date => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${formatDate(date)}</td>
      <td>${weightData[date]} kg</td>
      <td class="actions">
        <button class="btn btn-secondary edit-btn" data-id="${date}">
          <i class="fas fa-edit"></i>
        </button>
      </td>
    `;
    elements.entriesTable.appendChild(row);
  });

  // Add event listeners to edit buttons
  document.querySelectorAll('.edit-btn').forEach(btn => {
    btn.addEventListener('click', () => openEditModal(btn.dataset.id));
  });
}

// Open edit modal
function openEditModal(date) {
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
  localStorage.setItem('weights', JSON.stringify(weightData));
  
  showToast("✅ Entry updated");
  elements.editModal.style.display = 'none';
  
  renderChart();
  renderEntriesTable();
  updateStats();
  updateGoalProgress();
}

// Delete entry
function deleteEntry() {
  if (confirm(`Delete entry for ${formatDate(currentlyEditingId)}?`)) {
    delete weightData[currentlyEditingId];
    localStorage.setItem('weights', JSON.stringify(weightData));
    showToast("🗑️ Entry deleted");
    
    renderChart();
    renderEntriesTable();
    updateStats();
    updateGoalProgress();
    elements.editModal.style.display = 'none';
  }
}

// Calculate and update stats
function updateStats() {
  const dates = Object.keys(weightData).sort();
  if (dates.length === 0) {
    elements.currentWeightEl.textContent = "--";
    elements.weeklyChangeEl.textContent = "--";
    elements.monthlyChangeEl.textContent = "--";
    elements.streakCountEl.textContent = "--";
    return;
  }

  // Current weight
  const currentWeight = weightData[dates[dates.length - 1]];
  elements.currentWeightEl.textContent = `${currentWeight} kg`;

  // Weekly change
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekAgoDate = weekAgo.toISOString().split('T')[0];
  const weekAgoWeight = weightData[weekAgoDate];
  
  if (weekAgoWeight) {
    const change = currentWeight - weekAgoWeight;
    elements.weeklyChangeEl.textContent = `${change > 0 ? '+' : ''}${change.toFixed(1)} kg`;
    elements.weeklyChangeEl.style.color = change < 0 ? 'var(--success-color)' : change > 0 ? 'var(--danger-color)' : 'inherit';
  } else {
    elements.weeklyChangeEl.textContent = "--";
  }

  // Monthly change
  const monthAgo = new Date();
  monthAgo.setMonth(monthAgo.getMonth() - 1);
  const monthAgoDate = monthAgo.toISOString().split('T')[0];
  const monthAgoWeight = weightData[monthAgoDate];
  
  if (monthAgoWeight) {
    const change = currentWeight - monthAgoWeight;
    elements.monthlyChangeEl.textContent = `${change > 0 ? '+' : ''}${change.toFixed(1)} kg`;
    elements.monthlyChangeEl.style.color = change < 0 ? 'var(--success-color)' : change > 0 ? 'var(--danger-color)' : 'inherit';
  } else {
    elements.monthlyChangeEl.textContent = "--";
  }

  // Streak count (consecutive days with entries)
  let streak = 1;
  let currentDate = new Date(dates[dates.length - 1]);
  
  while (streak < dates.length) {
    currentDate.setDate(currentDate.getDate() - 1);
    const prevDate = currentDate.toISOString().split('T')[0];
    if (weightData[prevDate]) {
      streak++;
    } else {
      break;
    }
  }
  
  elements.streakCountEl.textContent = streak;
}

// Export data to Excel
function exportData() {
  const dates = Object.keys(weightData).sort();
  if (dates.length === 0) {
    showToast("⚠️ No data to export");
    return;
  }

  // Create CSV content
  let csvContent = "Weight Tracker Export\n\n";
  csvContent += "Date,Weight (kg)\n";
  
  dates.forEach(date => {
    csvContent += `${formatDate(date, false, true)},${weightData[date]}\n`;
  });

  // Add summary section
  csvContent += `\nSummary\n`;
  csvContent += `Total Entries,${dates.length}\n`;
  csvContent += `First Entry,${formatDate(dates[0], false, true)}\n`;
  csvContent += `Last Entry,${formatDate(dates[dates.length - 1], false, true)}\n`;
  
  if (goalData.target) {
    csvContent += `Goal Weight,${goalData.target} kg\n`;
    
    const currentWeight = weightData[dates[dates.length - 1]];
    const progress = currentWeight - goalData.target;
    csvContent += `Progress,${progress > 0 ? '+' : ''}${progress.toFixed(1)} kg from goal\n`;
  }

  // Create download link
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `Weight_Tracker_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  showToast("📊 Data exported");
}

// Navigate to different sections
function navigateTo(section) {
  // Reset all nav buttons
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  
  // Activate current nav button
  elements[`nav${section}`].classList.add('active');
  
  // Scroll to section (implementation depends on your layout)
  // This is a simplified version - adjust as needed
  if (section === 'Home') {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } else if (section === 'Chart') {
    document.querySelector('.chart-section').scrollIntoView({ behavior: 'smooth' });
  } else if (section === 'Add') {
    document.querySelector('.input-section').scrollIntoView({ behavior: 'smooth' });
    elements.weightInput.focus();
  } else if (section === 'Settings') {
    // Future implementation for settings
    showToast("⚙️ Settings coming soon");
  }
}

// Initialize the app
function initApp() {
  checkFirstVisit();
  renderChart();
  renderEntriesTable();
  updateStats();
  updateGoalProgress();
  
  if (goalData.target) {
    elements.targetWeightInput.value = goalData.target;
  }
  
  // Set today's date by default
  elements.dateInput.valueAsDate = new Date();
}

// Event listeners
elements.saveBtn.addEventListener('click', saveWeight);
elements.setGoalBtn.addEventListener('click', setWeightGoal);
elements.removeGoalBtn.addEventListener('click', removeWeightGoal);
elements.exportBtn.addEventListener('click', exportData);
elements.timeRange.addEventListener('change', renderChart);
elements.searchEntry.addEventListener('input', (e) => renderEntriesTable(e.target.value));
elements.closeModal.addEventListener('click', () => elements.editModal.style.display = 'none');
elements.cancelEditBtn.addEventListener('click', () => elements.editModal.style.display = 'none');
elements.saveEditBtn.addEventListener('click', saveEditedEntry);
elements.deleteEntryBtn.addEventListener('click', deleteEntry);
elements.onboardingNext.addEventListener('click', () => showOnboardingStep(currentOnboardingStep + 1));
elements.onboardingPrev.addEventListener('click', () => showOnboardingStep(currentOnboardingStep - 1));
elements.onboardingClose.addEventListener('click', () => elements.onboardingModal.style.display = 'none');

// Navigation event listeners
elements.navHome.addEventListener('click', () => navigateTo('Home'));
elements.navChart.addEventListener('click', () => navigateTo('Chart'));
elements.navAdd.addEventListener('click', () => navigateTo('Add'));
elements.navSettings.addEventListener('click', () => navigateTo('Settings'));

// Close modals when clicking outside
window.addEventListener('click', (e) => {
  if (e.target === elements.editModal) {
    elements.editModal.style.display = 'none';
  }
  if (e.target === elements.onboardingModal) {
    elements.onboardingModal.style.display = 'none';
  }
});

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', initApp);
