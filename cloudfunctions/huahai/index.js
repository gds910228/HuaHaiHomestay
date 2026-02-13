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
      case 'incrementViews':
        return await incrementViews(event);

      // ==================== 收藏相关 ====================
      case 'addFavorite':
        return await addFavorite(event, openid);
      case 'removeFavorite':
        return await removeFavorite(event, openid);
      case 'checkFavorite':
        return await checkFavorite(event, openid);
      case 'getFavorites':
        return await getFavorites(openid);

      // ==================== 民宿相关 ====================
      case 'getHostelInfo':
        return await getHostelInfo();
      case 'getRooms':
        return await getRooms();

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
  const { category, page = 1, pageSize = 10 } = event;

  const query = db.collection('guides');

  // 分类筛选
  if (category) {
    query.where({
      category: category
    });
  }

  // 只查询已发布的
  query.where({
    status: 'published'
  });

  // 按权重和更新时间排序
  query.orderBy('weight', 'desc').orderBy('updateTime', 'desc');

  // 分页
  query.skip((page - 1) * pageSize).limit(pageSize);

  const res = await query.get();

  return {
    success: true,
    data: res.data.map(item => ({
      ...item,
      categoryName: categoryMap[item.category] || item.category
    }))
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

  return {
    success: true,
    data: {
      ...res.data,
      categoryName: categoryMap[res.data.category] || res.data.category
    }
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
    data: res.total > 0
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

  const favorites = [];

  for (const item of res.data) {
    const guideRes = await db.collection('guides').doc(item.guideId).get();
    if (guideRes.data) {
      favorites.push({
        ...item,
        createTimeStr: formatTime(item.createTime),
        guide: guideRes.data
      });
    }
  }

  return {
    success: true,
    data: favorites
  };
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
 */
async function getRooms() {
  const res = await db.collection('rooms')
    .orderBy('price.low', 'asc')
    .get();

  return {
    success: true,
    data: res.data
  };
}

// ==================== 管理后台相关函数 ====================

/**
 * 管理员登录
 */
async function adminLogin(event) {
  const { password } = event;

  // 这里应该使用更安全的方式，比如密码哈希等
  if (password === 'huahai2026') {
    return {
      success: true,
      data: {
        token: 'admin_token_' + Date.now()
      }
    };
  }

  return {
    success: false,
    errMsg: '密码错误'
  };
}

/**
 * 获取所有攻略（管理后台）
 */
async function adminGetGuides(event) {
  const { category, status } = event;
  const query = db.collection('guides').orderBy('updateTime', 'desc');

  const where = {};
  if (category) where.category = category;
  if (status) where.status = status;

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
  const { id, ...guideData } = event;

  const data = {
    ...guideData,
    updateTime: new Date()
  };

  if (id) {
    // 编辑
    await db.collection('guides').doc(id).update({ data });
  } else {
    // 新增
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
 */
async function adminGetRooms() {
  const res = await db.collection('rooms').orderBy('price.low', 'asc').get();

  return {
    success: true,
    data: res.data
  };
}

/**
 * 保存房型
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
