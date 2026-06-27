/**
 * route-plan 云函数入口
 *
 * event.type 分发:
 *  - seedAll          : 写入 SEED_ROUTES 全部 5 条 + 立即 plan
 *  - seedOne          : event.routeKey 指定一条
 *  - plan             : event.routeId 指定路线 _id,只做规划不动 waypoints
 *  - inspect          : 返回单条 doc(排查 polylineSegments 写入)
 *
 * 调用示例(开发者工具云函数测试):
 *   { "type": "seedAll" }
 *   { "type": "plan", "routeId": "<doc _id>" }
 *
 * 返回:{ success, data, errMsg? }
 */
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const SEED_ROUTES = require('./lib/seed-routes');
const syncer = require('./lib/route-syncer');

const db = cloud.database();

exports.main = async (event) => {
  const type = (event && event.type) || 'seedAll';
  console.log(`[route-plan] type=${type}`);

  try {
    let result;
    switch (type) {
      case 'seedAll':
        result = await seedAll();
        break;
      case 'seedOne':
        result = await seedOne(event);
        break;
      case 'plan':
        result = await planOne(event);
        break;
      case 'inspect':
        result = await inspect(event);
        break;
      default:
        return { success: false, errMsg: `Unknown type: ${type}` };
    }
    return { success: true, data: result };
  } catch (err) {
    console.error('[route-plan] error:', err);
    return { success: false, errMsg: err.message, stack: err.stack };
  }
};

async function seedAll() {
  const stats = { upserted: 0, planned: 0, failed: 0, details: [] };
  for (const route of SEED_ROUTES) {
    try {
      const up = await syncer.upsertRoute(route, 'seed');
      stats.upserted++;

      // 立刻规划(读回最新 doc,避免 upsert 后字段不齐)
      const fresh = await db.collection('guides').doc(up._id).get();
      const planRes = await syncer.planRoute(fresh.data);
      stats.planned++;
      stats.details.push({
        routeKey: route.routeKey,
        title: route.title,
        op: up.op,
        plan: planRes
      });
    } catch (err) {
      console.warn('[seedAll]', route.routeKey, err.message);
      stats.failed++;
      stats.details.push({
        routeKey: route.routeKey,
        title: route.title,
        error: err.message
      });
    }
  }
  return stats;
}

async function seedOne(event) {
  const key = event && event.routeKey;
  if (!key) throw new Error('seedOne 缺少 routeKey');
  const route = SEED_ROUTES.find(r => r.routeKey === key);
  if (!route) throw new Error(`未找到 routeKey=${key}`);
  const up = await syncer.upsertRoute(route, 'seed');
  const fresh = await db.collection('guides').doc(up._id).get();
  const planRes = await syncer.planRoute(fresh.data);
  return { upsert: up, plan: planRes };
}

async function planOne(event) {
  const routeId = event && event.routeId;
  if (!routeId) throw new Error('plan 缺少 routeId');
  const res = await db.collection('guides').doc(routeId).get();
  if (!res.data) throw new Error(`路线不存在: ${routeId}`);
  if (res.data.category !== 'route') {
    throw new Error(`doc ${routeId} 不是 route 类别(${res.data.category})`);
  }
  return await syncer.planRoute(res.data);
}

async function inspect(event) {
  const where = { category: 'route' };
  if (event && event.routeKey) where.routeKey = event.routeKey;
  const res = await db.collection('guides').where(where).limit(1).get();
  const doc = res.data && res.data[0];
  if (!doc) return { found: false };
  return {
    found: true,
    fields: Object.keys(doc).sort(),
    segments: (doc.polylineSegments || []).length,
    totalDistance: doc.totalDistance,
    totalDuration: doc.totalDuration,
    status: doc.routePlanStatus,
    waypointCount: (doc.waypoints || []).length,
    fullDoc: doc
  };
}
