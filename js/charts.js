// charts.js простые столбчатые диаграммы на canvas

const PALETTE = ['#4f8cff', '#36c98d', '#ffb020', '#ff6b6b', '#9b7bff', '#22b8cf', '#f06595'];

function barChart(canvas, data) {
  if (!canvas || !canvas.getContext) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;

  ctx.clearRect(0, 0, W, H);

  if (!data || data.length === 0) {
    ctx.fillStyle = '#9aa0a6';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Нет данных', W / 2, H / 2);
    return;
  }

  const padding = { top: 20, right: 16, bottom: 40, left: 32 };
  const chartW = W - padding.left - padding.right;
  const chartH = H - padding.top - padding.bottom;

  const maxValue = Math.max(1, ...data.map(d => d.value));
  // округляем верх шкалы вверх, чтобы подписи были аккуратными
  const top = Math.ceil(maxValue);

  // ось Y
  ctx.strokeStyle = '#e3e6ea';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(padding.left, padding.top);
  ctx.lineTo(padding.left, padding.top + chartH);
  ctx.lineTo(padding.left + chartW, padding.top + chartH);
  ctx.stroke();

  // деления и горизонтальные линии
  const steps = Math.min(top, 5);
  ctx.fillStyle = '#9aa0a6';
  ctx.font = '11px sans-serif';
  ctx.textAlign = 'right';
  for (let i = 0; i <= steps; i++) {
    const val = Math.round((top / steps) * i);
    const y = padding.top + chartH - (chartH * i) / steps;
    ctx.fillText(String(val), padding.left - 6, y + 4);
    if (i > 0) {
      ctx.strokeStyle = '#f1f3f5';
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(padding.left + chartW, y);
      ctx.stroke();
    }
  }

  // столбцы
  const slot = chartW / data.length;
  const barW = Math.min(48, slot * 0.6);

  data.forEach((d, i) => {
    const x = padding.left + slot * i + (slot - barW) / 2;
    const barH = (chartH * d.value) / top;
    const y = padding.top + chartH - barH;

    ctx.fillStyle = PALETTE[i % PALETTE.length];
    ctx.fillRect(x, y, barW, barH);

    // значение над столбцом
    if (d.value > 0) {
      ctx.fillStyle = '#3c4043';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(String(d.value), x + barW / 2, y - 6);
    }

    // подпись под столбцом
    ctx.fillStyle = '#5f6368';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    let label = d.label;
    if (label.length > 8) label = label.slice(0, 7) + '…';
    ctx.fillText(label, x + barW / 2, padding.top + chartH + 16);
  });
}

window.Charts = { barChart };
