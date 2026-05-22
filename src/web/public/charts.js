export function renderDoughnut(canvasId, labels, data, colors) {
  const ctx = document.querySelector(`#${canvasId}`).getContext('2d');
  return new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: colors,
        borderColor: '#11141c',
        borderWidth: 2,
        hoverOffset: 8
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '62%',
      plugins: {
        legend: {
          position: 'right',
          labels: {
            color: '#8b95a8',
            font: { family: "'SF Mono', 'Fira Code', monospace", size: 12 },
            padding: 16,
            usePointStyle: true,
            pointStyle: 'circle'
          }
        },
        tooltip: {
          backgroundColor: 'rgba(17, 20, 28, 0.95)',
          titleColor: '#e8ecf1',
          bodyColor: '#e8ecf1',
          borderColor: 'rgba(255,255,255,0.08)',
          borderWidth: 1,
          cornerRadius: 8,
          padding: 12,
          displayColors: true,
          boxPadding: 4
        }
      }
    }
  });
}

export function renderLine(canvasId, labels, data) {
  const ctx = document.querySelector(`#${canvasId}`).getContext('2d');

  const gradientFill = ctx.createLinearGradient(0, 0, 0, 300);
  gradientFill.addColorStop(0, 'rgba(14, 165, 233, 0.25)');
  gradientFill.addColorStop(1, 'rgba(14, 165, 233, 0.0)');

  return new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Баланс',
        data,
        fill: true,
        tension: 0.4,
        borderColor: '#0ea5e9',
        backgroundColor: gradientFill,
        pointBackgroundColor: '#0ea5e9',
        pointBorderColor: '#11141c',
        pointBorderWidth: 2,
        pointRadius: 3,
        pointHoverRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        intersect: false,
        mode: 'index'
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(17, 20, 28, 0.95)',
          titleColor: '#e8ecf1',
          bodyColor: '#e8ecf1',
          borderColor: 'rgba(255,255,255,0.08)',
          borderWidth: 1,
          cornerRadius: 8,
          padding: 12,
          displayColors: false,
          callbacks: {
            label: (ctx) => {
              const v = ctx.raw;
              return '  ' + new Intl.NumberFormat('ru-BY', { style: 'currency', currency: 'BYN' }).format(v);
            }
          }
        }
      },
      scales: {
        x: {
          display: true,
          grid: { color: 'rgba(255,255,255,0.04)' },
          ticks: { color: '#5c6577', font: { family: "'SF Mono', 'Fira Code', monospace", size: 11 } }
        },
        y: {
          display: true,
          beginAtZero: false,
          grid: { color: 'rgba(255,255,255,0.04)' },
          ticks: {
            color: '#5c6577',
            font: { family: "'SF Mono', 'Fira Code', monospace", size: 11 },
            callback: (v) => new Intl.NumberFormat('ru-BY', { notation: 'compact', compactDisplay: 'short' }).format(v)
          }
        }
      }
    }
  });
}
