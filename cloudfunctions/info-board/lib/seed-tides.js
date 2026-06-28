/**
 * 南澳青澳湾潮汐 seed(演示用)
 *
 * ⚠️ 数据来源:基于南澳一般潮汐规律(2 高 2 低 / 日,大致每 6 小时一循环)生成的近似预测,
 *    精度不及官方潮汐表。**仅供首次启动时让仪表盘有数据展示**。
 *
 * 真实数据维护方式:
 *  1. 从 https://ocean.cnss.com.cn/(中国海事服务网)或南澳气象局抄取官方潮汐表
 *  2. 通过云函数 `{ "type": "seedTidesManual", "data": [...] }` 一次性提交
 *  3. 每 1-2 周更新一次
 *
 * 字段:
 *  - date: 'YYYY-MM-DD'
 *  - extremes: 4 个高低潮点(2 高 + 2 低,按时刻升序)
 *    - time: 'HH:MM' 24h 格式
 *    - height: m
 *    - type: 'high' | 'low'
 *
 * heights(96 点/天)会由 tide.js::interpolateHeights() 用 cos 半周期插值自动生成
 *
 * 该 seed 数据生成自 2026-06-28 起未来 14 天的近似潮位:
 *  - 基础日均潮差(高潮 vs 低潮):约 1.8m(青澳湾平均)
 *  - 每天高低潮时刻向后推迟约 48 分钟(月球周期 24.84h / 2)
 *  - 大潮/小潮(spring/neap)半月周期波动:潮差在 1.3m ~ 2.3m 之间
 */

// 起始日:2026-06-28 大致大潮日(满月附近)
// 后续 14 天按规律推算
const BASE_DATE = '2026-06-28';
const SEED_DAYS = 14;

// 当天 4 个 extremes 时刻(基于 2026-06-28 大致情况手工拟合,精度 ±30 分钟)
const BASE_EXTREMES = [
  { time: '02:30', height: 0.6, type: 'low'  },
  { time: '08:45', height: 2.4, type: 'high' },
  { time: '14:50', height: 0.7, type: 'low'  },
  { time: '21:10', height: 2.3, type: 'high' }
];

// 每日推迟分钟数(月球周期)
const DELAY_MIN_PER_DAY = 48;

// 半月大小潮调制:潮差在 0.7x ~ 1.15x 之间起伏
function tideAmplitudeFactor(dayOffset) {
  // 14 天半月周期,sin 调制,大潮 spring 出现在 0 day 和 14 day
  const phase = (dayOffset / 14) * 2 * Math.PI;
  return 0.92 + 0.18 * Math.cos(phase);  // [0.74, 1.10]
}

function addDays(ymd, n) {
  const d = new Date(ymd + 'T00:00:00+08:00');
  d.setDate(d.getDate() + n);
  const pad = x => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function shiftTime(hm, minutes) {
  const [h, m] = hm.split(':').map(Number);
  const total = (h * 60 + m + minutes + 1440 * 10) % 1440;
  const pad = x => String(x).padStart(2, '0');
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`;
}

function generateSeed() {
  const result = [];
  for (let i = 0; i < SEED_DAYS; i++) {
    const date = addDays(BASE_DATE, i);
    const factor = tideAmplitudeFactor(i);
    const meanH = (BASE_EXTREMES.reduce((s, e) => s + e.height, 0)) / BASE_EXTREMES.length;
    const extremes = BASE_EXTREMES.map(e => ({
      time: shiftTime(e.time, DELAY_MIN_PER_DAY * i),
      height: Math.round((meanH + (e.height - meanH) * factor) * 10) / 10,
      type: e.type
    })).sort((a, b) => a.time.localeCompare(b.time));
    result.push({ date, extremes, station: '南澳青澳湾(演示数据)' });
  }
  return result;
}

module.exports = generateSeed();
