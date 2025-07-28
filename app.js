const dateInput = document.getElementById('date');
const weightInput = document.getElementById('weight');
const saveBtn = document.getElementById('saveBtn');
const installBtn = document.getElementById('installBtn');
const timeRange = document.getElementById('timeRange');
const ctx = document.getElementById('weightChart').getContext('2d');

let weightData = JSON.parse(localStorage.getItem('weights')) || {};
let weightChart = null;
let deferredPrompt = null;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  if (installBtn) {
    installBtn.style.display = 'inline-block';
  }
});

if (installBtn) {
  installBtn.addEventListener('click', () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then(choiceResult => {
        if (choiceResult.outcome === 'accepted') {
          console.log('User accepted the install prompt');
        }
        deferredPrompt = null;
        installBtn.style.display = 'none';
      });
    }
  });
}

function saveWeight() {
  const date = dateInput.value;
  const weight = parseFloat(weightInput.value);

  if (!date || isNaN(weight)) {
    alert("⚠️ Please enter a valid date and a number for weight.");
    return;
  }

  weightData[date] = weight;
  localStorage.setItem('weights', JSON.stringify(weightData));

  weightInput.value = '';
  showToast(`Saved entry for ${date}: ${weight} kg 🏋️‍♀️`);
  renderChart();
}

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

function renderChart() {
  const range = timeRange ? timeRange.value : 'all';
  const sortedDates = getFilteredData(range);
  const weights = sortedDates.map(date => weightData[date]);

  if (weightChart instanceof Chart) {
    weightChart.destroy();
  }

  weightChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: sortedDates,
      datasets: [{
        label: 'Weight (kg)',
        data: weights,
        borderColor: '#4a90e2',
        backgroundColor: 'rgba(74, 144, 226, 0.15)',
        fill: true,
        tension: 0.3,
        pointRadius: 5,
        pointBackgroundColor: '#4a90e2'
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: true },
        tooltip: {
          callbacks: {
            label: context => `${context.parsed.y} kg`
          }
        }
      },
      scales: {
        y: {
          beginAtZero: false,
          title: {
            display: true,
            text: 'Weight (kg)'
          }
        },
        x: {
          title: {
            display: true,
            text: 'Date'
          }
        }
      }
    }
  });
}

function showToast(msg) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

saveBtn.addEventListener('click', saveWeight);
if (timeRange) timeRange.addEventListener('change', renderChart);
renderChart();
