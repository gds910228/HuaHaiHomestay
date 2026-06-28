/**
 * 南澳岛 4 项户外活动今日适合度评分
 *
 * @param {Object} weather  天气数据(对应 spot.weather.now 或 forecast7d[0])
 *   @prop {string}  text          天气状况文本:晴/多云/阴/小雨/中雨/大雨/暴雨/雷阵雨/雪 等
 *   @prop {number}  temp          当前温度 ℃(或日均温度)
 *   @prop {number}  windScale     风力等级 0-12(蒲福风级)
 *   @prop {number} [uvIndex]      紫外线指数 0-15(可选,缺失时按 5 估算)
 * @param {Object} tide  潮汐数据
 *   @prop {number}  currentHeight 当前潮高 m
 *   @prop {string}  currentTrend  'rising' | 'falling' | 'slack'
 * @param {number} hour  当前小时 0-23(用于摄影日出日落加分)
 *
 * @returns {{beach:number|null, sailing:number|null, hike:number|null, photo:number|null}}
 *   每项 0-5 分,精确到 0.5;入参缺失时对应项返回 null,前端显示 '--'
 *
 * 评分系数依据:
 *
 * **beach(赶海)** - 系数来源:南澳青澳湾本地赶海经验
 *   - 潮高 0.5-1.5m 是滩涂出露面积最大区间 → 基础 5 分
 *   - 潮高 < 0.3m 或 > 2.5m 滩涂被水淹/退太远 → 基础 1 分
 *   - 中间区段线性插值
 *   - 风力 ≥ 5 级海况差,扣 1 分
 *   - 暴雨/雷雨直接扣 2 分(安全)
 *
 * **sailing(出海)** - 系数来源:《中国近海海洋图集》近海航行安全标准(蒲福风级 4 级以下作业)
 *   - 风力 ≤ 3 级且无强降水 → 5 分
 *   - 风力 4 级 → 3.5;5 级 → 2;6 级 → 1;≥ 7 级 → 0(已不适合出海)
 *   - 暴雨/雷雨再扣 1.5 分
 *
 * **hike(登山/徒步)** - 系数来源:户外运动温度舒适区间通识 + 山地大风/雷雨警示
 *   - 15-28℃ 区间 → 5 分(黄花山徒步舒适)
 *   - 28-32℃ 扣 1;32-35℃ 扣 2;> 35℃ 扣 3(高温警告)
 *   - 5-15℃ 扣 1;< 5℃ 扣 3(南澳冬季少见但要兜底)
 *   - UV ≥ 8 扣 1(夏季正午暴晒)
 *   - 风力 ≥ 5 级扣 1(山顶强风),≥ 7 级再扣 1(危险)
 *   - 暴雨/雷雨扣 3(滑坡 + 雷击风险);中-大雨扣 1.5;小雨扣 0.5
 *
 * **photo(摄影)** - 系数来源:摄影圈"光线 + 天气"经验
 *   - 晴/多云 → 基础 4 分;阴 → 2 分;雨 → 0(不利于普通游客拍照,专业玩家除外)
 *   - 日出时段 5-7 点 或 日落 17-19 点 → +1(色温佳)
 *   - 退潮(falling)+ 0.5(滩涂层次感)
 *   - 紫外线 ≥ 10 → -0.5(过曝)
 */
function calcActivityScore(weather, tide, hour) {
  const w = weather || {};
  const t = tide || {};
  const h = typeof hour === 'number' ? hour : new Date().getHours();

  // 缺天气核心字段时,所有项都没法算
  const hasWeather = (w.text || w.temp != null || w.windScale != null);
  const hasTide = (t.currentHeight != null);

  return {
    beach: (hasTide && hasWeather) ? scoreBeach(w, t) : null,
    sailing: hasWeather ? scoreSailing(w) : null,
    hike: hasWeather ? scoreHike(w) : null,
    photo: hasWeather ? scorePhoto(w, t, h) : null
  };
}

function scoreBeach(w, t) {
  const height = Number(t.currentHeight);
  const wind = Number(w.windScale) || 0;
  const text = String(w.text || '');

  // 潮高基础分(0.5-1.5m 最佳)
  let s;
  if (height >= 0.5 && height <= 1.5) {
    s = 5;
  } else if (height < 0.3 || height > 2.5) {
    s = 1;
  } else if (height < 0.5) {
    // 0.3-0.5: 1 → 5 线性
    s = 1 + (height - 0.3) / 0.2 * 4;
  } else {
    // 1.5-2.5: 5 → 1 线性
    s = 5 - (height - 1.5) / 1.0 * 4;
  }

  if (wind >= 5) s -= 1;
  if (/暴雨|雷/.test(text)) s -= 2;
  else if (/大雨/.test(text)) s -= 1;

  return halfStar(s);
}

function scoreSailing(w) {
  const wind = Number(w.windScale) || 0;
  const text = String(w.text || '');

  let s;
  if (wind <= 3) s = 5;
  else if (wind === 4) s = 3.5;
  else if (wind === 5) s = 2;
  else if (wind === 6) s = 1;
  else s = 0;

  if (/暴雨|雷/.test(text)) s -= 1.5;
  else if (/大雨/.test(text)) s -= 0.5;

  return halfStar(s);
}

function scoreHike(w) {
  const temp = Number(w.temp);
  const uv = w.uvIndex != null ? Number(w.uvIndex) : 5;
  const wind = Number(w.windScale) || 0;
  const text = String(w.text || '');

  let s = 5;
  if (temp >= 15 && temp <= 28) {
    s = 5;
  } else if (temp > 28 && temp <= 32) {
    s -= 1;
  } else if (temp > 32 && temp <= 35) {
    s -= 2;
  } else if (temp > 35) {
    s -= 3;
  } else if (temp >= 5 && temp < 15) {
    s -= 1;
  } else if (temp < 5) {
    s -= 3;
  }

  if (uv >= 8) s -= 1;

  // 风力对登山的影响:5 级起山顶强风扣 1,7 级以上明显风险再扣 1
  if (wind >= 7) s -= 2;
  else if (wind >= 5) s -= 1;

  if (/暴雨|雷/.test(text)) s -= 3;
  else if (/大雨|中雨/.test(text)) s -= 1.5;
  else if (/小雨|阵雨/.test(text)) s -= 0.5;

  return halfStar(s);
}

function scorePhoto(w, t, hour) {
  const text = String(w.text || '');
  const uv = w.uvIndex != null ? Number(w.uvIndex) : 5;

  let s;
  if (/暴雨|雷/.test(text)) s = 0;
  else if (/大雨|中雨/.test(text)) s = 1;
  else if (/小雨|阵雨/.test(text)) s = 1.5;
  else if (/阴/.test(text)) s = 2;
  else if (/多云|晴/.test(text)) s = 4;
  else s = 3;

  // 日出 / 日落 时段加分
  if ((hour >= 5 && hour <= 7) || (hour >= 17 && hour <= 19)) s += 1;

  // 退潮滩涂层次感
  if (t && t.currentTrend === 'falling') s += 0.5;

  // 正午暴晒(过曝)
  if (uv >= 10) s -= 0.5;

  return halfStar(s);
}

/** 限制 [0, 5] + 半星精度 */
function halfStar(s) {
  if (!isFinite(s)) return 0;
  if (s < 0) s = 0;
  if (s > 5) s = 5;
  return Math.round(s * 2) / 2;
}

module.exports = { calcActivityScore };
