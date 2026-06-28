/**
 * 天气模块
 *
 * 策略:复用 spot-sync 已有的 weather 数据,从 guides 集合任取一个 spot 的 weather 字段
 *      优先用青澳湾(seed:qingaowan)的天气,因为坐标在南澳岛东端代表性强
 *      若主选 spot 没数据,降级取任一有 weather 的 spot
 *
 * 不调 QWeather API,零 KEY 消耗,数据新鲜度依赖 spot-sync 的 cron(4 小时一刷)
 */
const cloud = require('wx-server-sdk');
const db = cloud.database();

// 优先取这条 spot 的 weather(青澳湾,南澳东端的代表性坐标)
const PRIMARY_SPOT_AMAPID = 'seed:qingaowan';

async function getWeather() {
  // 1. 尝试主 spot
  const primaryRes = await db.collection('guides')
    .where({ category: 'spot', amapId: PRIMARY_SPOT_AMAPID })
    .field({ weather: true, title: true })
    .limit(1)
    .get();

  let doc = primaryRes.data && primaryRes.data[0];
  let source = 'primary';

  // 2. 降级:任一有 weather.now 的 spot
  if (!doc || !doc.weather || !doc.weather.now) {
    const fallbackRes = await db.collection('guides')
      .where({ category: 'spot' })
      .field({ weather: true, title: true })
      .limit(10)
      .get();
    doc = (fallbackRes.data || []).find(s => s.weather && s.weather.now);
    source = 'fallback';
  }

  if (!doc || !doc.weather) {
    return null;
  }

  const w = doc.weather;
  return {
    now: w.now || null,                    // { temp, text, icon, windScale, windDir, humidity, obsTime }
    forecast7d: w.forecast7d || w.forecast3d || [],  // 兼容旧数据只有 forecast3d
    sourceSpot: doc.title || '',
    sourceMode: source,                     // 'primary' | 'fallback'
    updatedAt: w.updatedAt || null
  };
}

module.exports = { getWeather };
