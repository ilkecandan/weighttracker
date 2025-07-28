const dateInput = document.getElementById('date');
const weightInput = document.getElementById('weight');
const saveBtn = document.getElementById('saveBtn');
const ctx = document.getElementById('weightChart').getContext('2d');

// Init localStorage data
let weightData = JSON.parse(localStorage.getItem('weights')) || {};

// Define chart variable outside function scope
let weightChart = null;

function saveWeight() {
  const date = dateInput.value;
  const weight = parseFloat(weightInput.value);

  if (!date || isNaN(weight)) {
    alert("⚠️ Please enter a valid date and a number for weight.");
    return;
  }

  // Save to data object
  weightData[date] = weight;
  localStorage.setItem('weights', JSON.stringify(weightData));

  // Clear input
  weightInput.value = '';
  showToast(`Saved entry for ${date}: ${weight} kg 🏋️‍♀️`);

  renderChart();
}

function renderChart() {
  const sortedDates = Object.keys(weightData).sort();
  const weights = sortedDates.map(date => weightData[date]);

  if (weightChart instanceof Chart) {
    weightChart.destroy(); // Proper chart destroy
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
        pointBackgroundColor: '#4a90e2',
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          display: true
        },
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

// Show simple toast
function showToast(msg) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

saveBtn.addEventListener('click', saveWeight);
renderChart();
