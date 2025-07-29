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
  onboardingModal: document.getElementById('onboardingModal'),
  onboardingNext: document.getElementById('onboardingNext'),
  onboardingPrev: document.getElementById('onboardingPrev'),
  onboardingClose: document.getElementById('onboardingClose'),
  onboardingSteps: document.querySelectorAll('.onboarding-step'),
  bottomNav: document.getElementById('bottomNav'),
  quickAddCard: document.getElementById('quickAddCard'),
  quickAddWeight: document.getElementById('quickAddWeight'),
  quickAddSubmit: document.getElementById('quickAddSubmit')
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
}

// Update current goal display
function updateCurrentGoalDisplay() {
  if (goalData.target) {
    elements.currentGoalDisplay.textContent = `${goalData.target} kg`;
  } else {
    elements.currentGoalDisplay.textContent = "Not Set";
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

// Initialize the app
function initApp() {
  checkFirstVisit();
  renderChart();
  renderEntriesTable();
  updateStats();
  updateGoalProgress();
  updateCurrentGoalDisplay();
  
  if (goalData.target) {
    elements.targetWeightInput.value = goalData.target;
  }
  
  elements.weightInput.focus();
}

// Event listeners
elements.saveBtn.addEventListener('click', saveWeight);
elements.setGoalBtn.addEventListener('click', setWeightGoal);
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
elements.quickAddSubmit.addEventListener('click', quickAddWeight);
elements.onboardingNext.addEventListener('click', () => showOnboardingStep(currentOnboardingStep + 1));
elements.onboardingPrev.addEventListener('click', () => showOnboardingStep(currentOnboardingStep - 1));
elements.onboardingClose.addEventListener('click', () => elements.onboardingModal.style.display = 'none');

// Bottom nav navigation
document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', function() {
    const target = this.getAttribute('data-target');
    document.querySelectorAll('.main-section').forEach(section => {
      section.style.display = section.id === target ? 'block' : 'none';
    });
    
    // Update active state
    document.querySelectorAll('.nav-item').forEach(navItem => {
      navItem.classList.toggle('active', navItem === this);
    });
  });
});

// Start the app
initApp();
