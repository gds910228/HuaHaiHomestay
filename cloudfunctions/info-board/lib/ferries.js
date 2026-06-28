/**
 * 渡轮班次模块
 *
 * 数据来源:ferries 集合(seed 写入)
 * 不调外部 API,纯数据库读
 *
 * 返回的数据带 todayList(今日全部班次 + 节假日自动切换),前端按当前时间过滤"下一班"
 */
const cloud = require('wx-server-sdk');
const db = cloud.database();

async function getFerries() {
  const res = await db.collection('ferries').limit(20).get();
  const routes = res.data || [];

  // 今天是否节假日(简单实现:周六/周日 + 法定节假日列表)
  // 法定节假日 2026:1/1 元旦,2/17-23 春节,4/4-6 清明,5/1-5 劳动,6/19 端午,9/27 中秋,10/1-7 国庆
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

  return routes.map(r => ({
    _id: r._id,
    route: r.route,
    schedule: r.schedule || [],
    holidaySchedule: r.holidaySchedule || [],
    todayList: isHoliday && r.holidaySchedule && r.holidaySchedule.length > 0
      ? r.holidaySchedule
      : (r.schedule || []),
    isHoliday,
    disclaimer: r.disclaimer || '班次仅供参考,以码头当日公告为准'
  }));
}

module.exports = { getFerries };
