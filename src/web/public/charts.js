const chartColors = {
  income: '#22c55e',
  incomeDim: 'rgba(34, 197, 94, 0.15)',
  expense: '#f43f5e',
  expenseDim: 'rgba(244, 63, 94, 0.15)',
  balance: '#0ea5e9',
  balanceDim: 'rgba(14, 165, 233, 0.1)',
  grid: 'rgba(255,255,255,0.04)',
  ticks: '#5c6577',
  tooltipBg: 'rgba(17, 20, 28, 0.95)',
  tooltipBorder: 'rgba(255,255,255,0.08)'
};

const commonOptions = {
  responsive: true,
  maintainAspectRatio: false,
  animation: { duration: 400, easing: 'easeInOutQuart' }
};

const commonTooltip = {
  backgroundColor: chartColors.tooltipBg,
  titleColor: '#e8ecf1',
  bodyColor: '#e8ecf1',
  borderColor: chartColors.tooltipBorder,
  borderWidth: 1,
  cornerRadius: 8,
  padding: 12,
  displayColors: true,
  boxPadding: 4
};

function formatCurrency(value) {
  return new Intl.NumberFormat('ru-BY', { style: 'currency', currency: 'BYN' }).format(value);
}

function hexToRgba(hex, alpha) {
  const r = Number.parseInt(hex.slice(1, 3), 16);
  const g = Number.parseInt(hex.slice(3, 5), 16);
  const b = Number.parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function renderDoughnut(canvasId, labels, data, colors, categoryIds, { onClick } = {}) {
  const ctx = document.querySelector(`#${canvasId}`).getContext('2d');
  const total = data.reduce((a, b) => a + b, 0);

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
      ...commonOptions,
      cutout: '60%',
      onClick: (event, elements) => {
        if (elements.length > 0 && onClick) {
          const idx = elements[0].index;
          onClick(idx, { name: labels[idx], total: data[idx], category_id: categoryIds ? categoryIds[idx] : null });
        }
      },
      plugins: {
        legend: {
          position: 'right',
          labels: {
            color: '#8b95a8',
            font: { family: "'SF Mono', 'Fira Code', monospace", size: 12 },
            padding: 16,
            usePointStyle: true,
            pointStyle: 'circle',
            callback: (label, idx) => {
              const value = data[idx];
              const pct = total > 0 ? Math.round((value / total) * 100) : 0;
              return `${label}  ${formatCurrency(value)}  (${pct}%)`;
            }
          }
        },
        tooltip: {
          ...commonTooltip,
          callbacks: {
            label: (ctx) => {
              const value = ctx.raw;
              const pct = total > 0 ? Math.round((value / total) * 100) : 0;
              return ` ${ctx.label}: ${formatCurrency(value)} (${pct}%)`;
            }
          }
        },
        datalabels: {
          display: false
        }
      }
    },
    plugins: [{
      id: 'centerText',
      beforeDraw(chart) {
        const { ctx, width, height } = chart;
        ctx.save();
        ctx.font = "bold 1.4rem 'SF Mono', 'Fira Code', monospace";
        ctx.fillStyle = '#e8ecf1';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(formatCurrency(total), width / 2, height / 2);
        ctx.font = "0.75rem 'SF Mono', 'Fira Code', monospace";
        ctx.fillStyle = '#8b95a8';
        ctx.fillText('Всего расходов', width / 2, height / 2 + 22);
        ctx.restore();
      }
    }]
  });
}

export function renderIncomeExpenseLine(canvasId, data, { onClick } = {}) {
  const ctx = document.querySelector(`#${canvasId}`).getContext('2d');
  const labels = data.map(d => d.period);
  const incomeData = data.map(d => d.income);
  const expenseData = data.map(d => d.expense);
  const balanceData = data.map(d => d.cumulative_balance);

  const gradientIncome = ctx.createLinearGradient(0, 0, 0, 400);
  gradientIncome.addColorStop(0, chartColors.incomeDim);
  gradientIncome.addColorStop(1, 'rgba(34, 197, 94, 0.0)');

  const gradientExpense = ctx.createLinearGradient(0, 0, 0, 400);
  gradientExpense.addColorStop(0, chartColors.expenseDim);
  gradientExpense.addColorStop(1, 'rgba(244, 63, 94, 0.0)');

  return new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Доходы',
          labelKey: 'income',
          data: incomeData,
          fill: true,
          tension: 0.3,
          borderColor: chartColors.income,
          backgroundColor: gradientIncome,
          pointBackgroundColor: chartColors.income,
          pointBorderColor: '#11141c',
          pointBorderWidth: 2,
          pointRadius: 3,
          pointHoverRadius: 6
        },
        {
          label: 'Расходы',
          labelKey: 'expense',
          data: expenseData,
          fill: true,
          tension: 0.3,
          borderColor: chartColors.expense,
          backgroundColor: gradientExpense,
          pointBackgroundColor: chartColors.expense,
          pointBorderColor: '#11141c',
          pointBorderWidth: 2,
          pointRadius: 3,
          pointHoverRadius: 6
        },
        {
          label: 'Баланс',
          labelKey: 'balance',
          data: balanceData,
          fill: false,
          tension: 0.3,
          borderColor: chartColors.balance,
          backgroundColor: 'transparent',
          borderDash: [6, 4],
          pointBackgroundColor: chartColors.balance,
          pointBorderColor: '#11141c',
          pointBorderWidth: 2,
          pointRadius: 3,
          pointHoverRadius: 6
        }
      ]
    },
    options: {
      ...commonOptions,
      interaction: {
        intersect: false,
        mode: 'index'
      },
      onClick: (event, elements) => {
        if (elements.length > 0 && onClick) {
          const idx = elements[0].index;
          onClick(idx, data[idx]);
        }
      },
      plugins: {
        legend: {
          labels: {
            color: '#8b95a8',
            font: { family: "'SF Mono', 'Fira Code', monospace", size: 12 },
            usePointStyle: true,
            pointStyle: 'circle'
          }
        },
        tooltip: {
          ...commonTooltip,
          callbacks: {
            label: (ctx) => {
              const v = ctx.raw;
              return ` ${ctx.dataset.label}: ${formatCurrency(v)}`;
            }
          }
        },
        datalabels: {
          display: false
        }
      },
      scales: {
        x: {
          display: true,
          grid: { color: chartColors.grid },
          ticks: { color: chartColors.ticks, font: { family: "'SF Mono', 'Fira Code', monospace", size: 11 } }
        },
        y: {
          display: true,
          beginAtZero: false,
          grid: { color: chartColors.grid },
          ticks: {
            color: chartColors.ticks,
            font: { family: "'SF Mono', 'Fira Code', monospace", size: 11 },
            callback: (v) => new Intl.NumberFormat('ru-BY', { notation: 'compact', compactDisplay: 'short' }).format(v)
          }
        }
      }
    }
  });
}

export function renderPeriodComparisonBar(canvasId, data) {
  const ctx = document.querySelector(`#${canvasId}`).getContext('2d');
  const labels = data.map(d => d.name);
  const currentData = data.map(d => d.current);
  const previousData = data.map(d => d.previous);
  const colors = data.map(d => d.color || 'rgba(255,255,255,0.3)');

  return new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Текущий период',
          data: currentData,
          backgroundColor: colors,
          borderRadius: 4,
          borderSkipped: false
        },
        {
          label: 'Предыдущий период',
          data: previousData,
          backgroundColor: colors.map(c => hexToRgba(c.startsWith('#') ? c : '#888888', 0.4)),
          borderRadius: 4,
          borderSkipped: false
        }
      ]
    },
    options: {
      ...commonOptions,
      interaction: {
        intersect: false,
        mode: 'index'
      },
      plugins: {
        legend: {
          labels: {
            color: '#8b95a8',
            font: { family: "'SF Mono', 'Fira Code', monospace", size: 12 },
            usePointStyle: true,
            pointStyle: 'circle'
          }
        },
        tooltip: {
          ...commonTooltip,
          callbacks: {
            label: (ctx) => {
              const v = ctx.raw;
              return ` ${ctx.dataset.label}: ${formatCurrency(v)}`;
            },
            afterBody: (items) => {
              const idx = items[0].dataIndex;
              const row = data[idx];
              if (!row) return '';
              const deltaText = row.delta >= 0 ? `+${formatCurrency(row.delta)}` : formatCurrency(row.delta);
              return `\nРазница: ${deltaText} (${row.deltaPercent}%)`;
            }
          }
        },
        datalabels: {
          display: false
        }
      },
      scales: {
        x: {
          display: true,
          grid: { color: chartColors.grid },
          ticks: { color: chartColors.ticks, font: { family: "'SF Mono', 'Fira Code', monospace", size: 11 } }
        },
        y: {
          display: true,
          beginAtZero: true,
          grid: { color: chartColors.grid },
          ticks: {
            color: chartColors.ticks,
            font: { family: "'SF Mono', 'Fira Code', monospace", size: 11 },
            callback: (v) => new Intl.NumberFormat('ru-BY', { notation: 'compact', compactDisplay: 'short' }).format(v)
          }
        }
      }
    }
  });
}
