export function renderDoughnut(canvasId, labels, data, colors) {
  const ctx = document.querySelector(`#${canvasId}`).getContext('2d');
  return new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: colors,
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'right' }
      }
    }
  });
}

export function renderLine(canvasId, labels, data) {
  const ctx = document.querySelector(`#${canvasId}`).getContext('2d');
  return new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Баланс',
        data,
        fill: false,
        tension: 0.3,
        borderColor: '#0d6efd',
        backgroundColor: '#0d6efd',
        pointRadius: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        intersect: false,
        mode: 'index'
      },
      scales: {
        x: { display: true },
        y: { display: true, beginAtZero: false }
      }
    }
  });
}
