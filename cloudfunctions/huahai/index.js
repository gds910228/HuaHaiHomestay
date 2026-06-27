// cloudfunctions/huahai/index.js
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

// 分类映射
const categoryMap = {
  'food': '美食推荐',
  'route': '游玩路线',
  'info': '实用信息',
  'spot': '景点打卡'
};

/**
 * 校验管理密码 - 从云函数环境变量 ADMIN_PASSWORD 读取
 *
 * 仓库公开,密码绝不能写在源码里。部署前请在
 * 云开发控制台 → 云函数 → huahai → 函数配置 → 环境变量
 * 配置 ADMIN_PASSWORD=<你的密码>
 *
 * 返回:
 *   { ok: true }                       密码正确
 *   { ok: false, configured: false }   云函数没配 ADMIN_PASSWORD 环境变量
 *   { ok: false, configured: true }    密码错误
 */
function checkAdminPassword(input) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) {
    return { ok: false, configured: false };
  }
  if (typeof input !== 'string' || input.length !== expected.length) {
    return { ok: false, configured: true };
  }
  return { ok: input === expected, configured: true };
}

/**
 * 云函数入口
 */
exports.main = async (event, context) => {
  const { type } = event;
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  try {
    switch (type) {
      // ==================== 攻略相关 ====================
      case 'getGuides':
        return await getGuides(event);
      case 'getGuideDetail':
        return await getGuideDetail(event);
      case 'getGuideById':
        return await getGuideById(event);
      case 'incrementViews':
        return await incrementViews(event);
      case 'getAllTags':
        return await getAllTags(event);
      case 'getNearbySpots':
        return await getNearbySpots(event);

      // ==================== 收藏相关 ====================
      case 'addFavorite':
        return await addFavorite(event, openid);
      case 'removeFavorite':
        return await removeFavorite(event, openid);
      case 'checkFavorite':
        return await checkFavorite(event, openid);
      case 'getFavorites':
        return await getFavorites(openid);
      case 'toggleFavorite':
        return await toggleFavorite(event, openid);

      // ==================== 民宿相关 ====================
      case 'getHostelInfo':
        return await getHostelInfo();
      case 'getRooms':
        return await getRooms();
      case 'getRoomDetail':
        return await getRoomDetail(event);

      // ==================== 管理后台相关 ====================
      case 'adminLogin':
        return await adminLogin(event);
      case 'adminGetGuides':
        return await adminGetGuides(event);
      case 'adminSaveGuide':
        return await adminSaveGuide(event);
      case 'adminDeleteGuide':
        return await adminDeleteGuide(event);
      case 'adminGetHostel':
        return await adminGetHostel();
      case 'adminSaveHostel':
        return await adminSaveHostel(event);
      case 'adminGetRooms':
        return await adminGetRooms();
      case 'adminSaveRoom':
        return await adminSaveRoom(event);
      case 'adminDeleteRoom':
        return await adminDeleteRoom(event);

      // ==================== 存储维护工具 ====================
      case 'scanGuideImages':
        return await scanGuideImages(event);
      case 'computeOrphans':
        return await computeOrphans(event);
      case 'cleanupFiles':
        return await cleanupFiles(event);

      default:
        return {
          success: false,
          errMsg: 'Invalid operation type'
        };
    }
  } catch (err) {
    console.error(err);
    return {
      success: false,
      errMsg: err.message
    };
  }
};

// ==================== 攻略相关函数 ====================

/**
 * 获取攻略列表
 */
async function getGuides(event) {
  const { category, tag, page = 1, pageSize = 10 } = event;

  const query = db.collection('guides');

  // 构建查询条件
  const whereCondition = {
    status: 'published'
  };

  // 分类筛选
  if (category) {
    whereCondition.category = category;
  }

  // 标签筛选（tags 是字符串数组字段，直接赋值即匹配"数组包含该值"）
  if (tag) {
    if (Array.isArray(tag)) {
      // 多标签：任一命中即可
      if (tag.length === 1) {
        whereCondition.tags = tag[0];
      } else if (tag.length > 1) {
        whereCondition.tags = _.in(tag);
      }
    } else {
      whereCondition.tags = tag;
    }
  }

  // 只查询已发布的
  query.where(whereCondition);

  // 按权重和更新时间排序
  query.orderBy('weight', 'desc').orderBy('updateTime', 'desc');

  // 分页
  query.skip((page - 1) * pageSize).limit(pageSize);

  const res = await query.get();

  return {
    success: true,
    data: res.data.map(item => {
      // 确保 images 数组存在
      if (!item.images || item.images.length === 0) {
        if (item.cover) {
          item.images = [item.cover];
        } else {
          item.images = [];
        }
      }

      // 确定显示的封面图：优先使用真实图片，避免占位图
      let finalCover = item.cover;
      if (!finalCover || finalCover.includes('placeholder')) {
        // 如果 cover 是占位图或不存在，使用 images 数组的第一张
        finalCover = item.images && item.images.length > 0 ? item.images[0] : '';
      }

      return {
        ...item,
        cover: finalCover, // 覆盖 cover 字段，使用真实的图片
        categoryName: categoryMap[item.category] || item.category
      };
    })
  };
}

/**
 * 获取攻略详情
 */
async function getGuideDetail(event) {
  const { id } = event;

  const res = await db.collection('guides').doc(id).get();

  if (!res.data) {
    return {
      success: false,
      errMsg: '攻略不存在'
    };
  }

  const guide = res.data;

  // 确保 images 数组不为空，如果为空且有 cover，则使用 cover
  if (!guide.images || guide.images.length === 0) {
    guide.images = guide.cover ? [guide.cover] : [];
  }

  // 刷新富文本正文里 editor 插入的图片链接（cloud:// 文件 ID 的 tempFileURL 仅 2 小时有效）
  if (guide.content && typeof guide.content === 'string') {
    guide.content = await refreshContentImages(guide.content);
  }

  // 检查当前用户是否收藏了该攻略
  const wxContext = cloud.getWXContext();
  if (wxContext.OPENID) {
    const favoriteRes = await db.collection('favorites').where({
      openid: wxContext.OPENID,
      guideId: id,
      category: 'guide'
    }).count();

    guide.isFavorited = favoriteRes.total > 0;
  }

  return {
    success: true,
    data: {
      ...guide,
      categoryName: categoryMap[guide.category] || guide.category
    }
  };
}

/**
 * 根据ID获取攻略（用于编辑）
 */
async function getGuideById(event) {
  const { id } = event;

  const res = await db.collection('guides').doc(id).get();

  if (!res.data) {
    return {
      success: false,
      errMsg: '攻略不存在'
    };
  }

  return {
    success: true,
    data: res.data
  };
}

/**
 * 增加浏览量
 */
async function incrementViews(event) {
  const { id } = event;

  await db.collection('guides').doc(id).update({
    data: {
      views: _.inc(1)
    }
  });

  return {
    success: true
  };
}

/**
 * 获取全部标签（去重、按出现频次降序）
 * 可选参数 category 用于按分类范围聚合
 */
async function getAllTags(event) {
  const { category } = event || {};

  const where = { status: 'published' };
  if (category) where.category = category;

  // 云数据库单次 .get() 最多返回 100 条，分页拉满
  const PAGE = 100;
  let all = [];
  let offset = 0;
  // 防御性上限 5000 条，避免极端情况下死循环
  while (offset < 5000) {
    const res = await db.collection('guides')
      .where(where)
      .field({ tags: true })
      .skip(offset)
      .limit(PAGE)
      .get();
    all = all.concat(res.data || []);
    if (!res.data || res.data.length < PAGE) break;
    offset += PAGE;
  }

  const counter = {};
  all.forEach(item => {
    (item.tags || []).forEach(t => {
      const tag = String(t || '').trim();
      if (!tag) return;
      counter[tag] = (counter[tag] || 0) + 1;
    });
  });

  const list = Object.keys(counter)
    .map(name => ({ name, count: counter[name] }))
    .sort((a, b) => b.count - a.count);

  return {
    success: true,
    data: list
  };
}

// ==================== 收藏相关函数 ====================

/**
 * 添加收藏
 */
async function addFavorite(event, openid) {
  const { guideId } = event;

  // 检查是否已收藏
  const existRes = await db.collection('favorites').where({
    openid,
    guideId
  }).count();

  if (existRes.total > 0) {
    return {
      success: false,
      errMsg: '已收藏'
    };
  }

  await db.collection('favorites').add({
    data: {
      openid,
      guideId,
      createTime: new Date()
    }
  });

  return {
    success: true
  };
}

/**
 * 取消收藏
 */
async function removeFavorite(event, openid) {
  const { guideId } = event;

  await db.collection('favorites').where({
    openid,
    guideId
  }).remove();

  return {
    success: true
  };
}

/**
 * 检查收藏状态
 */
async function checkFavorite(event, openid) {
  const { guideId } = event;

  const res = await db.collection('favorites').where({
    openid,
    guideId
  }).count();

  return {
    success: true,
    data: {
      isFavorited: res.total > 0
    }
  };
}

/**
 * 获取收藏列表
 */
async function getFavorites(openid) {
  const res = await db.collection('favorites')
    .orderBy('createTime', 'desc')
    .where({ openid })
    .get();

  return {
    success: true,
    data: res.data
  };
}

/**
 * 切换收藏状态（用于攻略和房型）
 */
async function toggleFavorite(event, openid) {
  const { guideId, category } = event;

  // 检查是否已收藏
  const existRes = await db.collection('favorites').where({
    openid,
    guideId,
    category: category || 'guide'
  }).count();

  if (existRes.total > 0) {
    // 已收藏，执行取消收藏
    await db.collection('favorites').where({
      openid,
      guideId,
      category: category || 'guide'
    }).remove();

    return {
      success: true,
      data: {
        isFavorited: false
      }
    };
  } else {
    // 未收藏，执行添加收藏
    await db.collection('favorites').add({
      data: {
        openid,
        guideId,
        category: category || 'guide',
        createTime: new Date()
      }
    });

    return {
      success: true,
      data: {
        isFavorited: true
      }
    };
  }
}

// ==================== 民宿相关函数 ====================

/**
 * 获取民宿信息
 */
async function getHostelInfo() {
  const res = await db.collection('hostel').limit(1).get();

  if (res.data.length === 0) {
    return {
      success: true,
      data: {
        name: '画海民宿',
        description: '欢迎来到画海民宿，享受南澳岛的美好时光',
        address: '广东省汕头市南澳岛',
        phone: '',
        wechat: '',
        albums: ['/images/default-hostel.jpg'],
        facilities: ['免费WiFi', '24小时热水', '空调', '独立卫生间']
      }
    };
  }

  return {
    success: true,
    data: res.data[0]
  };
}

/**
 * 获取房型列表
 * 更新：支持新旧数据结构排序（fixedPrice 或 price.low）
 */
async function getRooms() {
  const res = await db.collection('rooms').get();

  // 手动排序，兼容固定价格和范围价格
  const sortedData = res.data.sort((a, b) => {
    const priceA = a.fixedPrice || (a.price && a.price.low) || 0;
    const priceB = b.fixedPrice || (b.price && b.price.low) || 0;
    return priceA - priceB;
  });

  return {
    success: true,
    data: sortedData
  };
}

/**
 * 获取房型详情
 */
async function getRoomDetail(event) {
  const { roomId } = event;

  if (!roomId) {
    return {
      success: false,
      errMsg: '房型ID不能为空'
    };
  }

  const res = await db.collection('rooms').doc(roomId).get();

  if (!res.data) {
    return {
      success: false,
      errMsg: '房型不存在'
    };
  }

  const room = res.data;

  // 检查当前用户是否收藏了该房型（如果传入了openid）
  const wxContext = cloud.getWXContext();
  if (wxContext.OPENID) {
    const favoriteRes = await db.collection('favorites').where({
      openid: wxContext.OPENID,
      guideId: roomId,
      category: 'room'
    }).count();

    room.isFavorited = favoriteRes.total > 0;
  }

  return {
    success: true,
    data: room
  };
}

// ==================== 管理后台相关函数 ====================

/**
 * 管理员登录
 */
async function adminLogin(event) {
  const { password } = event;

  const check = checkAdminPassword(password);
  if (!check.configured) {
    console.error('[adminLogin] 云函数未配置 ADMIN_PASSWORD 环境变量');
    return {
      success: false,
      errMsg: '管理后台未配置,请联系管理员'
    };
  }
  if (!check.ok) {
    return { success: false, errMsg: '密码错误' };
  }
  return {
    success: true,
    data: {
      token: 'admin_token_' + Date.now()
    }
  };
}

/**
 * 获取所有攻略（管理后台）
 */
async function adminGetGuides(event) {
  const { category, status, tag } = event;
  const query = db.collection('guides').orderBy('updateTime', 'desc');

  const where = {};
  if (category) where.category = category;
  if (status) where.status = status;
  if (tag) where.tags = tag;

  if (Object.keys(where).length > 0) {
    query.where(where);
  }

  const res = await query.get();

  return {
    success: true,
    data: res.data,
    total: res.data.length
  };
}

/**
 * 保存攻略（新增或编辑）
 */
async function adminSaveGuide(event) {
  // eslint-disable-next-line no-unused-vars
  const { id, type, ...guideData } = event;

  const data = {
    ...guideData,
    updateTime: new Date()
  };

  if (id) {
    // 编辑
    await db.collection('guides').doc(id).update({ data });
  } else {
    // 新增：默认发布状态
    if (!data.status) data.status = 'published';
    if (typeof data.views !== 'number') data.views = 0;
    if (typeof data.likes !== 'number') data.likes = 0;
    if (typeof data.weight !== 'number') data.weight = 0;
    data.createTime = new Date();
    await db.collection('guides').add({ data });
  }

  return {
    success: true
  };
}

/**
 * 删除攻略
 */
async function adminDeleteGuide(event) {
  const { id } = event;

  await db.collection('guides').doc(id).remove();

  return {
    success: true
  };
}

/**
 * 获取民宿信息（管理后台）
 */
async function adminGetHostel() {
  const res = await db.collection('hostel').limit(1).get();

  return {
    success: true,
    data: res.data.length > 0 ? res.data[0] : null
  };
}

/**
 * 保存民宿信息
 */
async function adminSaveHostel(event) {
  const { id, ...hostelData } = event;

  const data = {
    ...hostelData,
    updateTime: new Date()
  };

  if (id) {
    await db.collection('hostel').doc(id).update({ data });
  } else {
    await db.collection('hostel').add({ data });
  }

  return {
    success: true
  };
}

/**
 * 获取房型列表（管理后台）
 * 更新：支持新旧数据结构排序
 */
async function adminGetRooms() {
  const res = await db.collection('rooms').get();

  // 手动排序，兼容固定价格和范围价格
  const sortedData = res.data.sort((a, b) => {
    const priceA = a.fixedPrice || (a.price && a.price.low) || 0;
    const priceB = b.fixedPrice || (b.price && b.price.low) || 0;
    return priceA - priceB;
  });

  return {
    success: true,
    data: sortedData
  };
}

/**
 * 保存房型
 * 更新：支持新的数据结构字段
 */
async function adminSaveRoom(event) {
  const { id, ...roomData } = event;

  const data = {
    ...roomData,
    updateTime: new Date()
  };

  if (id) {
    await db.collection('rooms').doc(id).update({ data });
  } else {
    data.createTime = new Date();
    await db.collection('rooms').add({ data });
  }

  return {
    success: true
  };
}

/**
 * 删除房型
 */
async function adminDeleteRoom(event) {
  const { id } = event;

  await db.collection('rooms').doc(id).remove();

  return {
    success: true
  };
}

// ==================== 工具函数 ====================

/**
 * 解析富文本，提取 editor 写入的 data-fileid，重新换发 tempFileURL 后替换 src。
 * 兼容两种历史 HTML：
 *  1) 新版（推荐）：<img src="https://tmp-url" data-fileid="cloud://...">
 *  2) 旧版：<img src="cloud://..."> 直接以 cloud:// 作为 src
 */
async function refreshContentImages(html) {
  if (!html) return html;

  const fileIds = new Set();

  // 收集 data-fileid="cloud://..."
  const fileIdRegex = /data-fileid=["']([^"']+)["']/g;
  let m;
  while ((m = fileIdRegex.exec(html)) !== null) {
    if (m[1] && m[1].indexOf('cloud://') === 0) fileIds.add(m[1]);
  }

  // 收集 src="cloud://..."（旧版兼容）
  const srcCloudRegex = /src=["'](cloud:\/\/[^"']+)["']/g;
  while ((m = srcCloudRegex.exec(html)) !== null) {
    fileIds.add(m[1]);
  }

  if (fileIds.size === 0) return html;

  let urlMap = {};
  try {
    const res = await cloud.getTempFileURL({ fileList: Array.from(fileIds) });
    (res.fileList || []).forEach(f => {
      if (f.fileID && f.tempFileURL) urlMap[f.fileID] = f.tempFileURL;
    });
  } catch (err) {
    console.warn('refreshContentImages getTempFileURL 失败:', err);
    return html;
  }

  // 替换：把 <img ... data-fileid="cloud://X" ...> 中的 src 替换为新链接
  html = html.replace(/<img\b([^>]*)>/g, (tag, attrs) => {
    const fidMatch = /data-fileid=["']([^"']+)["']/.exec(attrs);
    if (fidMatch && urlMap[fidMatch[1]]) {
      // 替换/插入 src
      if (/\bsrc=["'][^"']*["']/.test(attrs)) {
        attrs = attrs.replace(/\bsrc=["'][^"']*["']/, `src="${urlMap[fidMatch[1]]}"`);
      } else {
        attrs = ` src="${urlMap[fidMatch[1]]}"` + attrs;
      }
    } else {
      // 旧版：src 就是 cloud:// 协议，直接替换
      const srcMatch = /\bsrc=["'](cloud:\/\/[^"']+)["']/.exec(attrs);
      if (srcMatch && urlMap[srcMatch[1]]) {
        attrs = attrs.replace(/\bsrc=["'](cloud:\/\/[^"']+)["']/, `src="${urlMap[srcMatch[1]]}"`);
      }
    }
    return `<img${attrs}>`;
  });

  return html;
}

/**
 * 格式化时间
 */
function formatTime(date) {
  if (!date) return '';

  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

// ==================== 景点(地理位置)相关 ====================

/**
 * 按用户当前位置返回最近的 N 个景点
 *
 * @param {Object} event
 * @param {number} event.latitude   WGS84 纬度
 * @param {number} event.longitude  WGS84 经度
 * @param {number} [event.radius=50000]  最大半径,米
 * @param {number} [event.limit=30]  返回条数上限
 *
 * 依赖:guides 集合的 geoLocation 字段为 db.Geo.Point(lng, lat),
 *      并在控制台建立地理位置索引(参考 docs/spot-sync-usage.md)。
 * 注意:db.Geo.Point 的参数顺序是 (longitude, latitude)。
 */
async function getNearbySpots(event) {
  const { latitude, longitude, radius = 50000, limit = 30 } = event || {};

  if (typeof latitude !== 'number' || typeof longitude !== 'number') {
    return { success: false, errMsg: 'latitude/longitude 必填且为数字' };
  }

  const res = await db.collection('guides')
    .where({
      category: 'spot',
      status: 'published',
      geoLocation: _.geoNear({
        geometry: db.Geo.Point(longitude, latitude),
        maxDistance: radius
      })
    })
    .limit(limit)
    .get();

  const data = (res.data || []).map(item => {
    // 数据库返回时 geoLocation 是 { type:'Point', coordinates:[lng,lat] }
    // 客户端用的是 location.{latitude,longitude},这里同时保留并附加 distance
    const itemLat = (item.location && item.location.latitude) ||
      (item.geoLocation && item.geoLocation.coordinates && item.geoLocation.coordinates[1]);
    const itemLng = (item.location && item.location.longitude) ||
      (item.geoLocation && item.geoLocation.coordinates && item.geoLocation.coordinates[0]);

    let distance = null;
    if (typeof itemLat === 'number' && typeof itemLng === 'number') {
      distance = haversineKm(latitude, longitude, itemLat, itemLng);
    }

    // 兜底 cover/images,与 getGuides 行为一致
    if (!item.images || item.images.length === 0) {
      item.images = item.cover ? [item.cover] : [];
    }
    let finalCover = item.cover;
    if (!finalCover || finalCover.includes('placeholder')) {
      finalCover = item.images && item.images.length > 0 ? item.images[0] : '';
    }

    return {
      ...item,
      cover: finalCover,
      categoryName: categoryMap[item.category] || item.category,
      distance // km, 保留 3 位小数;前端按需四舍五入
    };
  });

  return { success: true, data };
}

/**
 * Haversine 球面距离,返回 km(保留 3 位小数)
 */
function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371; // 地球平均半径 km
  const toRad = d => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 1000) / 1000;
}

// ==================== 存储维护工具 ====================

/**
 * 从富文本内容里抽出所有 cloud:// 文件 ID
 * 匹配两种格式:
 *   1) <img ... data-fileid="cloud://...">   (新版,推荐)
 *   2) <img src="cloud://...">                (旧版兼容)
 */
function extractFileIdsFromContent(html) {
  const ids = [];
  if (!html || typeof html !== 'string') return ids;
  const re1 = /data-fileid=["']([^"']+)["']/g;
  let m;
  while ((m = re1.exec(html)) !== null) {
    if (m[1] && m[1].indexOf('cloud://') === 0) ids.push(m[1]);
  }
  const re2 = /src=["'](cloud:\/\/[^"']+)["']/g;
  while ((m = re2.exec(html)) !== null) {
    ids.push(m[1]);
  }
  return ids;
}

function isCloudFile(s) {
  return typeof s === 'string' && s.indexOf('cloud://') === 0;
}

/**
 * 扫描所有 guides 引用了哪些 cloud:// 文件
 * event:
 *   verify: boolean (默认 false) - true 时调用 getTempFileURL 验证每个 fileID 是否还存在
 *                                  打开后会更慢,但能查出"DB 有引用但文件已删"的死链
 *   sampleByGuide: number (默认 5) - byGuide 字段保留多少条详情(避免响应过大)
 * 返回:
 *   referenced: 所有去重后的 fileID 列表(用于 Step 2 算孤儿)
 *   byGuide:    每条攻略引用的 fileID 概况(cover/images/contentImages)
 *   broken:     verify=true 时,无法 getTempFileURL 的 fileID(死链)
 *   stats:      汇总
 */
async function scanGuideImages(event) {
  const verify = !!event.verify;
  const sampleByGuide = Number(event.sampleByGuide) > 0 ? Number(event.sampleByGuide) : 5;

  // 分页拉取所有 guides(默认每页 100)
  const guides = [];
  let skip = 0;
  const pageSize = 100;
  while (true) {
    const res = await db.collection('guides').skip(skip).limit(pageSize).get();
    if (!res.data || res.data.length === 0) break;
    guides.push(...res.data);
    if (res.data.length < pageSize) break;
    skip += pageSize;
  }

  const fileIdSet = new Set();
  const byGuide = [];

  for (const g of guides) {
    const ref = {
      id: g._id,
      title: g.title || '(无标题)',
      cover: null,
      images: [],
      contentImages: []
    };
    if (isCloudFile(g.cover)) {
      ref.cover = g.cover;
      fileIdSet.add(g.cover);
    }
    (Array.isArray(g.images) ? g.images : []).forEach(f => {
      if (isCloudFile(f)) {
        ref.images.push(f);
        fileIdSet.add(f);
      }
    });
    extractFileIdsFromContent(g.content).forEach(f => {
      ref.contentImages.push(f);
      fileIdSet.add(f);
    });
    byGuide.push(ref);
  }

  const referenced = Array.from(fileIdSet);

  // 可选:验证每个 fileID 是否还在存储里
  const broken = [];
  if (verify && referenced.length > 0) {
    // getTempFileURL 单次最多 50 个
    for (let i = 0; i < referenced.length; i += 50) {
      const batch = referenced.slice(i, i + 50);
      try {
        const res = await cloud.getTempFileURL({ fileList: batch });
        (res.fileList || []).forEach(f => {
          if (f.status !== 0 || !f.tempFileURL) {
            broken.push({
              fileID: f.fileID,
              status: f.status,
              errMsg: f.errMsg || 'unknown'
            });
          }
        });
      } catch (err) {
        batch.forEach(fid => broken.push({
          fileID: fid,
          status: -1,
          errMsg: err.message || 'getTempFileURL exception'
        }));
      }
    }
  }

  // 只保留每条引用的前 N 个 byGuide 详情,避免响应体过大
  // (但 cover 和 images 都是少量,主要担心 content 内嵌图)
  const byGuideTrimmed = byGuide
    .filter(g => g.cover || g.images.length || g.contentImages.length)
    .slice(0, sampleByGuide * 20)
    .map(g => ({
      ...g,
      contentImages: g.contentImages.slice(0, sampleByGuide)
    }));

  return {
    success: true,
    data: {
      stats: {
        totalGuides: guides.length,
        totalReferences: referenced.length,
        brokenReferences: broken.length,
        verified: verify
      },
      referenced,
      byGuide: byGuideTrimmed,
      broken
    }
  };
}

/**
 * 算孤儿:输入存储里的全部 fileID 列表(由用户从云控制台导出后传进来),
 *        和 DB 引用清单 diff,返回 storage 里有但 DB 没引用的 fileID
 * event:
 *   storageFileIds: Array<string>  必填,从云存储控制台导出的全量 fileID 列表
 * 返回:
 *   orphans:  孤儿 fileID 列表(可直接传给 cleanupFiles 删除)
 *   inboth:   DB 有引用且存储有的 fileID(健康)
 *   missing:  DB 有引用但 storageFileIds 里没有的 fileID(死链,建议清 DB 引用)
 */
async function computeOrphans(event) {
  const { storageFileIds } = event;
  if (!Array.isArray(storageFileIds)) {
    return { success: false, errMsg: 'storageFileIds 必须是数组' };
  }

  const scan = await scanGuideImages({});
  if (!scan.success) return scan;

  const referencedSet = new Set(scan.data.referenced);
  const storageSet = new Set(storageFileIds);

  const orphans = [];
  const inboth = [];
  storageFileIds.forEach(f => {
    if (referencedSet.has(f)) inboth.push(f);
    else orphans.push(f);
  });

  const missing = [];
  referencedSet.forEach(f => {
    if (!storageSet.has(f)) missing.push(f);
  });

  return {
    success: true,
    data: {
      stats: {
        totalStorage: storageFileIds.length,
        totalReferenced: referencedSet.size,
        orphans: orphans.length,
        inboth: inboth.length,
        missing: missing.length
      },
      orphans,
      missing
    }
  };
}

/**
 * 批量删除云存储文件
 * event:
 *   fileIds: Array<string>  必填,要删除的 cloud:// fileID 列表
 *   password: string         必填,管理密码(同 init-database)
 *   dryRun:  boolean         可选,true 时不实际删除,只返回计划
 *
 * 限流:单次最多 200 个,超出请分批
 */
async function cleanupFiles(event) {
  const { fileIds, password, dryRun = false } = event;

  const check = checkAdminPassword(password);
  if (!check.configured) {
    console.error('[cleanupFiles] 云函数未配置 ADMIN_PASSWORD 环境变量');
    return { success: false, errMsg: '云函数未配置 ADMIN_PASSWORD,请到控制台配置后重试' };
  }
  if (!check.ok) {
    return { success: false, errMsg: '密码错误' };
  }
  if (!Array.isArray(fileIds) || fileIds.length === 0) {
    return { success: false, errMsg: 'fileIds 必须是非空数组' };
  }
  if (fileIds.length > 200) {
    return { success: false, errMsg: `单次最多删除 200 个文件(当前 ${fileIds.length} 个),请分批` };
  }

  // 校验都是 cloud:// 协议,避免误删
  const invalid = fileIds.filter(f => !isCloudFile(f));
  if (invalid.length > 0) {
    return {
      success: false,
      errMsg: `存在 ${invalid.length} 个非 cloud:// 协议的 fileID,拒绝执行`,
      data: { invalid: invalid.slice(0, 10) }
    };
  }

  if (dryRun) {
    return {
      success: true,
      data: {
        dryRun: true,
        plan: { willDelete: fileIds.length, sample: fileIds.slice(0, 10) }
      }
    };
  }

  const result = [];
  // deleteFile 单次最多 50 个
  for (let i = 0; i < fileIds.length; i += 50) {
    const batch = fileIds.slice(i, i + 50);
    try {
      const res = await cloud.deleteFile({ fileList: batch });
      (res.fileList || []).forEach(f => {
        result.push({
          fileID: f.fileID,
          status: f.status,
          errMsg: f.errMsg || (f.status === 0 ? 'ok' : 'unknown')
        });
      });
    } catch (err) {
      batch.forEach(fid => result.push({
        fileID: fid,
        status: -1,
        errMsg: err.message || 'deleteFile exception'
      }));
    }
  }

  const ok = result.filter(r => r.status === 0).length;
  const failed = result.length - ok;

  return {
    success: true,
    data: {
      stats: { total: result.length, ok, failed },
      // 只返回失败明细,成功的太多没意义
      failures: result.filter(r => r.status !== 0)
    }
  };
}
