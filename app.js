/* ==== app.js ==== */
const dateInput = document.getElementById('date');
const weightInput = document.getElementById('weight');
const saveBtn = document.getElementById('saveBtn');
const ctx = document.getElementById('weightChart').getContext('2d');

let weightData = JSON.parse(localStorage.getItem('weights')) || {};

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

function renderChart() {
  const sortedDates = Object.keys(weightData).sort();
  const weights = sortedDates.map(date => weightData[date]);

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
        backgroundColor: 'rgba(74, 144, 226, 0.2)',
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

saveBtn.addEventListener('click', saveWeight);
renderChart();
