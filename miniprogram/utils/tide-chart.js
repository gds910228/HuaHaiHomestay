/**
 * Canvas 2d 潮汐曲线绘制
 *
 * 用法(在 page.js 里):
 *   const query = wx.createSelectorQuery();
 *   query.select('#tide-canvas').fields({ node: true, size: true }).exec((res) => {
 *     const canvas = res[0].node;
 *     const ctx = canvas.getContext('2d');
 *     const dpr = wx.getSystemInfoSync().pixelRatio;
 *     canvas.width = res[0].width * dpr;
 *     canvas.height = res[0].height * dpr;
 *     ctx.scale(dpr, dpr);
 *     drawTideChart(ctx, res[0].width, res[0].height, tideData);
 *   });
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} width  CSS 像素宽
 * @param {number} height CSS 像素高
 * @param {Object} opts
 *   @prop {Array<{dt,date,height}>} heights  96 点/天的潮高序列
 *   @prop {Array<{dt,date,height,type}>} extremes  高低潮点
 *   @prop {number} [currentSec]  当前 Unix 秒(默认 Date.now()/1000)
 *   @prop {Object} [colors]  自定义配色 { line, fill, axis, label, current, high, low }
 */
function drawTideChart(ctx, width, height, opts) {
  const heights = (opts && opts.heights) || [];
  const extremes = (opts && opts.extremes) || [];
  const nowSec = (opts && opts.currentSec) || Math.floor(Date.now() / 1000);
  const colors = Object.assign({
    line: '#1E5266',
    fill: 'rgba(30, 82, 102, 0.12)',
    axis: '#A39A8D',
    label: '#5E4832',
    current: '#E89A3C',
    high: '#1E5266',
    low: '#3E7A6E'
  }, (opts && opts.colors) || {});

  if (heights.length < 2) {
    drawEmpty(ctx, width, height, '潮汐数据不足');
    return;
  }

  // 内边距:左 36(给 y label)右 12 上 28(给高潮 label)下 44(给低潮 label + x 轴时间刻度)
  const pad = { l: 36, r: 12, t: 28, b: 44 };
  const innerW = width - pad.l - pad.r;
  const innerH = height - pad.t - pad.b;

  // 取一天的范围(假设 heights 已经是按时间升序的当天数据)
  const startSec = heights[0].dt;
  const endSec = heights[heights.length - 1].dt;
  const tRange = endSec - startSec || 86400;

  // y 轴 min/max(留 0.3m 余量)
  let yMin = Infinity, yMax = -Infinity;
  heights.forEach(h => { if (h.height < yMin) yMin = h.height; if (h.height > yMax) yMax = h.height; });
  yMin = Math.floor((yMin - 0.3) * 10) / 10;
  yMax = Math.ceil((yMax + 0.3) * 10) / 10;
  const yRange = yMax - yMin || 1;

  const mapX = (sec) => pad.l + (sec - startSec) / tRange * innerW;
  const mapY = (h) => pad.t + (1 - (h - yMin) / yRange) * innerH;

  // ---- 背景清空 ----
  ctx.clearRect(0, 0, width, height);

  // ---- 网格(横向 3 条) ----
  ctx.strokeStyle = 'rgba(163, 154, 141, 0.18)';
  ctx.lineWidth = 1;
  for (let i = 1; i < 4; i++) {
    const y = pad.t + (innerH / 4) * i;
    ctx.beginPath();
    ctx.moveTo(pad.l, y);
    ctx.lineTo(pad.l + innerW, y);
    ctx.stroke();
  }

  // ---- y 轴刻度 label ----
  ctx.fillStyle = colors.label;
  ctx.font = '10px sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  for (let i = 0; i <= 4; i++) {
    const v = yMax - yRange * i / 4;
    const y = pad.t + innerH * i / 4;
    ctx.fillText(v.toFixed(1) + 'm', pad.l - 4, y);
  }

  // ---- x 轴刻度(每 4h)放到 canvas 最底部,与低潮 label 分开 ----
  ctx.fillStyle = colors.axis;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.font = '10px sans-serif';
  for (let h = 0; h <= 24; h += 4) {
    const ratio = h / 24;
    const x = pad.l + innerW * ratio;
    // 放在 canvas 最底部 2px,避开低潮 label 区域
    ctx.fillText(String(h).padStart(2, '0') + ':00', x, height - 2);
  }

  // ---- 平滑曲线(Catmull-Rom → 三次贝塞尔)+ 填充 ----
  const points = heights.map(h => ({ x: mapX(h.dt), y: mapY(h.height) }));

  // 填充
  ctx.beginPath();
  ctx.moveTo(points[0].x, pad.t + innerH);
  ctx.lineTo(points[0].x, points[0].y);
  drawCatmullRom(ctx, points);
  ctx.lineTo(points[points.length - 1].x, pad.t + innerH);
  ctx.closePath();
  ctx.fillStyle = colors.fill;
  ctx.fill();

  // 线
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  drawCatmullRom(ctx, points);
  ctx.strokeStyle = colors.line;
  ctx.lineWidth = 2;
  ctx.stroke();

  // ---- 高低潮点标注 ▲▼ ----
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.font = 'bold 11px sans-serif';
  extremes.forEach(e => {
    if (e.dt < startSec || e.dt > endSec) return;
    const x = mapX(e.dt);
    const y = mapY(e.height);
    const isHigh = String(e.type).toLowerCase() === 'high';
    const c = isHigh ? colors.high : colors.low;

    // 标记三角
    ctx.fillStyle = c;
    ctx.beginPath();
    if (isHigh) {
      ctx.moveTo(x, y - 3); ctx.lineTo(x - 5, y + 4); ctx.lineTo(x + 5, y + 4);
    } else {
      ctx.moveTo(x, y + 3); ctx.lineTo(x - 5, y - 4); ctx.lineTo(x + 5, y - 4);
    }
    ctx.closePath();
    ctx.fill();

    // 时刻 + 潮高 label(低潮 label 现在有 ~26px 空间,与底部 x 轴 label 留 ~16px 间隙)
    const labelY = isHigh ? y - 8 : y + 16;
    const labelText = hmFromIso(e.date) + ' ' + Number(e.height).toFixed(1) + 'm';
    ctx.fillStyle = c;
    ctx.textBaseline = isHigh ? 'bottom' : 'top';
    ctx.font = 'bold 10px sans-serif';
    ctx.fillText(labelText, x, labelY);
  });

  // ---- 当前时刻红点 ----
  if (nowSec >= startSec && nowSec <= endSec) {
    // 找最近 height 点
    let nearestIdx = 0, nearestDiff = Infinity;
    heights.forEach((h, i) => {
      const d = Math.abs(h.dt - nowSec);
      if (d < nearestDiff) { nearestDiff = d; nearestIdx = i; }
    });
    const cx = mapX(nowSec);
    const cy = mapY(heights[nearestIdx].height);

    // 外圈光晕
    ctx.fillStyle = 'rgba(232, 154, 60, 0.25)';
    ctx.beginPath();
    ctx.arc(cx, cy, 9, 0, Math.PI * 2);
    ctx.fill();

    // 红点
    ctx.fillStyle = colors.current;
    ctx.beginPath();
    ctx.arc(cx, cy, 4.5, 0, Math.PI * 2);
    ctx.fill();

    // 白圈
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, 4.5, 0, Math.PI * 2);
    ctx.stroke();
  }
}

/**
 * Catmull-Rom 转三次贝塞尔,平滑度 0.5(标准张力)
 * 调用前 ctx 已 moveTo(points[0]),此函数 lineTo + bezierCurveTo 后续点
 */
function drawCatmullRom(ctx, points) {
  if (points.length < 2) return;
  if (points.length === 2) {
    ctx.lineTo(points[1].x, points[1].y);
    return;
  }
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
  }
}

function drawEmpty(ctx, w, h, msg) {
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#A39A8D';
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(msg, w / 2, h / 2);
}

function hmFromIso(iso) {
  const s = String(iso || '');
  const t = s.indexOf('T');
  if (t < 0) return '';
  return s.slice(t + 1, t + 6);
}

module.exports = { drawTideChart };
