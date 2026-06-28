/**
 * 渡轮班次模块
 *
 * 数据来源:ferries 集合(seed 写入)
 * 不调外部 API,纯数据库读
 *
 * 返回字段供前端按方向(进岛 / 出岛)展示 + 今日下一班(各方向独立计算)
 */
const cloud = require('wx-server-sdk');
const db = cloud.database();

async function getFerries() {
  let res;
  try {
    res = await db.collection('ferries').limit(20).get();
  } catch (err) {
    const msg = (err && (err.errMsg || err.message)) || '';
    if (err.errCode === -502005 || /not exist/i.test(msg)) return [];
    throw err;
  }
  const routes = res.data || [];

  // 节假日判断:周末 + 法定节假日(2026)
  const today = new Date();
  const isWeekend = today.getDay() === 0 || today.getDay() === 6;
  const yMD = `${today.getMonth() + 1}-${today.getDate()}`;
  const HOLIDAYS_2026 = new Set([
    '1-1', '2-17','2-18','2-19','2-20','2-21','2-22','2-23',
    '4-4','4-5','4-6', '5-1','5-2','5-3','5-4','5-5',
    '6-19', '9-27',
    '10-1','10-2','10-3','10-4','10-5','10-6','10-7'
  ]);
  const isHoliday = isWeekend || HOLIDAYS_2026.has(yMD);

  return routes.map(r => {
    // schedule 新结构是 { toIsland, toMainland },旧数据兼容直接用 array
    const sched = isHoliday && r.holidaySchedule ? r.holidaySchedule : r.schedule;

    // 向后兼容:若 schedule 是旧的扁平数组,转成 { toIsland:[], toMainland:[] }
    let toIsland, toMainland;
    if (Array.isArray(sched)) {
      toIsland = sched.filter(s => !s.direction || s.direction === 'to-island');
      toMainland = sched.filter(s => s.direction === 'to-mainland');
    } else {
      toIsland = (sched && sched.toIsland) || [];
      toMainland = (sched && sched.toMainland) || [];
    }

    // 各方向独立计算"下一班"index
    const nowMin = today.getHours() * 60 + today.getMinutes();
    const annotate = (list) => {
      let nextIndex = -1;
      const annotated = list.map((t, i) => {
        const [hh, mm] = String(t.departure || '').split(':').map(Number);
        const tMin = (hh || 0) * 60 + (mm || 0);
        const isPast = tMin < nowMin;
        if (!isPast && nextIndex < 0) nextIndex = i;
        return { ...t, isPast };
      });
      return { list: annotated, nextIndex };
    };
    const ti = annotate(toIsland);
    const tm = annotate(toMainland);

    return {
      _id: r._id,
      route: r.route,
      routeShort: r.routeShort,
      toIsland: ti.list,
      toIslandNextIdx: ti.nextIndex,
      toMainland: tm.list,
      toMainlandNextIdx: tm.nextIndex,
      isHoliday,
      ticketingNote: r.ticketingNote || '',
      prices: Array.isArray(r.prices) ? r.prices : [],
      priceNotes: Array.isArray(r.priceNotes) ? r.priceNotes : [],
      contacts: Array.isArray(r.contacts) ? r.contacts : [],
      officialAccount: r.officialAccount || '',
      tips: Array.isArray(r.tips) ? r.tips : [],
      disclaimer: r.disclaimer || '班次仅供参考,以码头当日公告为准'
    };
  });
}

module.exports = { getFerries };
