// Get elements
const dateInput = document.getElementById('date');
const weightInput = document.getElementById('weight');
const saveBtn = document.getElementById('saveBtn');
const ctx = document.getElementById('weightChart').getContext('2d');

// Load saved data or start fresh
let weightData = JSON.parse(localStorage.getItem('weights')) || {};

// Save weight
function saveWeight() {
  const date = dateInput.value;
  const weight = parseFloat(weightInput.value);

  if (!date || isNaN(weight)) {
    alert("Please enter a valid date and weight!");
    return;
  }

  weightData[date] = weight;
  localStorage.setItem('weights', JSON.stringify(weightData));
  renderChart();
  weightInput.value = '';
}

// Render chart
function renderChart() {
  const sortedDates = Object.keys(weightData).sort();
  const weights = sortedDates.map(date => weightData[date]);

  // Destroy existing chart if exists
  if (window.weightChart) {
    window.weightChart.destroy();
  }

  window.weightChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: sortedDates,
      datasets: [{
        label: 'Weight (kg)',
        data: weights,
        borderColor: '#4a90e2',
        backgroundColor: '#d6e9ff',
        fill: true,
        tension: 0.3,
        pointRadius: 5,
        pointBackgroundColor: '#4a90e2'
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          display: true
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

// Event listeners
saveBtn.addEventListener('click', saveWeight);

// Initial chart render
renderChart();
