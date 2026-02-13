// cloudfunctions/init-database/index.js
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

/**
 * 数据库初始化云函数
 * 自动创建集合并添加初始数据
 */
exports.main = async (event, context) => {
  const { type, password } = event;

  console.log('=== 开始执行初始化 ===');
  console.log('操作类型:', type);

  // 简单的安全验证
  if (password !== 'huahai2026') {
    console.log('密码验证失败');
    return {
      success: false,
      errMsg: '密码错误'
    };
  }

  try {
    let result;
    switch (type) {
      case 'initAll':
        console.log('执行 initAll');
        result = await initAll();
        break;
      case 'initHostel':
        console.log('执行 initHostel');
        result = await initHostel();
        break;
      case 'initRooms':
        console.log('执行 initRooms');
        result = await initRooms();
        break;
      case 'initGuides':
        console.log('执行 initGuides');
        result = await initGuides();
        break;
      case 'clearAll':
        console.log('执行 clearAll');
        result = await clearAll();
        break;
      default:
        console.log('未知的操作类型');
        return {
          success: false,
          errMsg: 'Invalid operation type'
        };
    }

    console.log('执行结果:', result);
    return result;
  } catch (err) {
    console.error('初始化过程出错:', err);
    return {
      success: false,
      errMsg: err.message
    };
  }
};

/**
 * 初始化所有数据
 */
async function initAll() {
  console.log('--- 开始初始化所有数据 ---');

  const results = {
    hostel: await initHostel(),
    rooms: await initRooms(),
    guides: await initGuides()
  };

  console.log('所有数据初始化完成:', results);

  return {
    success: true,
    message: '数据库初始化完成',
    data: results
  };
}

/**
 * 初始化民宿信息
 */
async function initHostel() {
  console.log('1. 开始初始化民宿信息');

  try {
    // 先尝试查询，触发集合创建
    console.log('1.1 检查/创建 hostel 集合');
    const checkResult = await db.collection('hostel').limit(1).get();
    console.log('1.2 查询结果:', checkResult);

    // 判断是否真的有数据 - 使用 count() 更准确
    const countResult = await db.collection('hostel').count();
    console.log('1.3 count 结果:', countResult);

    if (countResult.total > 0) {
      console.log('1.4 民宿信息已存在，跳过');
      return {
        success: true,
        message: '民宿信息已存在，跳过初始化'
      };
    }

    console.log('1.5 准备添加民宿数据');
    const hostelData = {
      name: '画海民宿',
      description: '欢迎来到画海民宿，我们位于美丽的南澳岛青澳湾，为您提供舒适的住宿环境和贴心的服务。民宿出门即是海滩，环境优美，是您度假的理想选择。',
      address: '广东省汕头市南澳县后宅镇青澳湾',
      phone: '13800138000',
      wechat: 'huahai_hostel',
      location: {
        latitude: 23.4234,
        longitude: 117.0234
      },
      albums: [
        'https://via.placeholder.com/800x600/2E7DFF/FFFFFF?text=画海民宿+1',
        'https://via.placeholder.com/800x600/2E7DFF/FFFFFF?text=画海民宿+2',
        'https://via.placeholder.com/800x600/2E7DFF/FFFFFF?text=画海民宿+3'
      ],
      facilities: [
        '免费WiFi',
        '24小时热水',
        '独立空调',
        '独立卫生间',
        '24小时前台',
        '行李寄存',
        '免费停车场',
        '吹风机',
        '洗漱用品',
        '电视'
      ],
      updateTime: new Date()
    };

    console.log('1.6 开始添加数据');
    const addResult = await db.collection('hostel').add({
      data: hostelData
    });

    console.log('1.7 添加结果:', addResult);
    console.log('1.8 添加的 _id:', addResult._id || addResult.id);

    if (addResult._id || addResult.id) {
      console.log('1.9 ✅ 民宿信息添加成功');
      return {
        success: true,
        message: '民宿信息初始化成功',
        data: hostelData
      };
    } else {
      console.log('1.10 ❌ 民宿信息添加失败');
      return {
        success: false,
        errMsg: '添加民宿信息失败'
      };
    }
  } catch (err) {
    console.error('1.X 民宿信息初始化出错:', err);
    throw err;
  }
}

/**
 * 初始化房型数据
 */
async function initRooms() {
  console.log('2. 开始初始化房型数据');

  try {
    console.log('2.1 检查/创建 rooms 集合');
    const checkResult = await db.collection('rooms').limit(1).get();
    console.log('2.2 查询结果:', checkResult);

    const countResult = await db.collection('rooms').count();
    console.log('2.3 count 结果:', countResult);

    if (countResult.total > 0) {
      console.log('2.4 房型数据已存在，跳过');
      return {
        success: true,
        message: '房型数据已存在，跳过初始化'
      };
    }

    console.log('2.5 准备添加房型数据');
    const roomsData = [
      {
        roomType: '海景大床房',
        images: [
          'https://via.placeholder.com/800x600/4FC3F7/FFFFFF?text=海景大床房',
          'https://via.placeholder.com/800x600/4FC3F7/FFFFFF?text=海景大床房+2'
        ],
        description: '面对大海，宽敞明亮，配有超大观景窗，可欣赏美丽的海景日出。',
        area: '35㎡',
        bedType: '1.8m大床',
        price: {
          low: 288,
          high: 488
        },
        tags: ['观海', '大床', '情侣', '日出'],
        facilities: ['空调', 'WiFi', '电视', '热水', '独立卫浴', '吹风机'],
        status: 'available',
        updateTime: new Date()
      },
      {
        roomType: '标准双床房',
        images: [
          'https://via.placeholder.com/800x600/4FC3F7/FFFFFF?text=标准双床房',
          'https://via.placeholder.com/800x600/4FC3F7/FFFFFF?text=标准双床房+2'
        ],
        description: '温馨舒适的双床房，适合朋友出行或商务出差，设施齐全。',
        area: '28㎡',
        bedType: '1.2m单人床 x 2',
        price: {
          low: 238,
          high: 398
        },
        tags: ['双床', '性价比', '商务'],
        facilities: ['空调', 'WiFi', '电视', '热水', '独立卫浴', '书桌'],
        status: 'available',
        updateTime: new Date()
      },
      {
        roomType: '家庭套房',
        images: [
          'https://via.placeholder.com/800x600/4FC3F7/FFFFFF?text=家庭套房',
          'https://via.placeholder.com/800x600/4FC3F7/FFFFFF?text=家庭套房+2'
        ],
        description: '宽敞的家庭套房，适合家庭出游，包含一个主卧和两个单人床，设施齐全。',
        area: '55㎡',
        bedType: '1.8m大床 + 1.2m单人床',
        price: {
          low: 488,
          high: 688
        },
        tags: ['家庭', '套房', '海景', '多人'],
        facilities: ['空调', 'WiFi', '电视', '热水', '独立卫浴', '冰箱', '沙发', '茶几'],
        status: 'available',
        updateTime: new Date()
      }
    ];

    console.log('2.6 开始添加房型数据，数量:', roomsData.length);
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < roomsData.length; i++) {
      const room = roomsData[i];
      console.log(`2.7.${i + 1} 添加房型: ${room.roomType}`);

      try {
        const addResult = await db.collection('rooms').add({
          data: room
        });

        if (addResult._id || addResult.id) {
          console.log(`2.8.${i + 1} ✅ ${room.roomType} 添加成功, ID: ${addResult._id || addResult.id}`);
          successCount++;
        } else {
          console.log(`2.9.${i + 1} ❌ ${room.roomType} 添加失败`);
          failCount++;
        }
      } catch (err) {
        console.error(`2.10.${i + 1} ❌ ${room.roomType} 添加出错:`, err);
        failCount++;
      }
    }

    console.log(`2.11 房型添加完成，成功: ${successCount}/${roomsData.length}`);

    if (successCount > 0) {
      return {
        success: true,
        message: `房型数据初始化成功 (${successCount}/${roomsData.length})`,
        count: successCount,
        data: roomsData
      };
    } else {
      return {
        success: false,
        errMsg: `没有房型数据被添加 (成功: ${successCount})`
      };
    }
  } catch (err) {
    console.error('2.X 房型数据初始化出错:', err);
    throw err;
  }
}

/**
 * 初始化攻略数据
 */
async function initGuides() {
  console.log('3. 开始初始化攻略数据');

  try {
    console.log('3.1 检查/创建 guides 集合');
    const checkResult = await db.collection('guides').limit(1).get();
    console.log('3.2 查询结果:', checkResult);

    const countResult = await db.collection('guides').count();
    console.log('3.3 count 结果:', countResult);

    if (countResult.total > 0) {
      console.log('3.4 攻略数据已存在，跳过');
      return {
        success: true,
        message: '攻略数据已存在，跳过初始化'
      };
    }

    console.log('3.5 准备添加攻略数据');
    const guidesData = [
      {
        title: '后宅镇美食探店攻略',
        category: 'food',
        tags: ['海鲜', '地道', '必吃', '人均80'],
        cover: 'https://via.placeholder.com/800x600/FF6B35/FFFFFF?text=后宅镇美食',
        images: [
          'https://via.placeholder.com/800x600/FF6B35/FFFFFF?text=后宅镇美食+1',
          'https://via.placeholder.com/800x600/FF6B35/FFFFFF?text=后宅镇美食+2'
        ],
        summary: '南澳岛后宅镇是本地人的美食天堂，这里有最新鲜的海鲜和最地道的潮汕风味。',
        content: '<p>后宅镇是南澳岛最繁华的城镇，也是美食聚集地。这里的海鲜市场每天早上都有新鲜渔获，可以自己购买后让附近的餐厅加工。</p><h3>推荐餐厅：</h3><p><strong>1. 聪明海鲜大排档</strong> - 本地人常去，海鲜新鲜，价格公道。推荐菜：清蒸石斑鱼、白灼虾。</p><p><strong>2. 老字号牛肉丸</strong> - 地道潮汕风味，手打牛肉丸 Q 弹有劲。</p><h3>美食小贴士：</h3><p>• 海鲜最佳食用时间是上午，刚从渔船上下来最新鲜</p><p>• 可以让民宿老板帮忙推荐靠谱的餐厅</p><p>• 加工费一般按斤计算，提前问清楚价格</p>',
        location: {
          latitude: 23.4234,
          longitude: 117.0234
        },
        address: '广东省汕头市南澳县后宅镇',
        info: [
          { label: '最佳时间', value: '全天' },
          { label: '人均消费', value: '80-150元' },
          { label: '推荐指数', value: '⭐⭐⭐' }
        ],
        weight: 10,
        status: 'published',
        views: 0,
        likes: 0,
        createTime: new Date(),
        updateTime: new Date()
      },
      {
        title: '青澳湾环岛骑行路线',
        category: 'route',
        tags: ['骑行', '海景', '日出', '新手'],
        cover: 'https://via.placeholder.com/800x600/4CAF50/FFFFFF?text=环岛骑行',
        images: [
          'https://via.placeholder.com/800x600/4CAF50/FFFFFF?text=环岛骑行+1'
        ],
        summary: '从青澳湾出发，沿着海滨公路环岛骑行，欣赏南澳岛最美的海岸线。',
        content: '<p>南澳岛环岛骑行是体验海岛风情的最佳方式。全程约60公里，建议分2天完成。</p><h3>推荐路线：</h3><p><strong>第一天（北线）：青澳湾 → 金山浴场 → 总兵府 → 宋井</strong></p><p>路程约30公里，沿途经过北回归线广场、金银岛等景点。</p><p><strong>第二天（南线）：后宅镇 → 云澳镇 → 青澳湾</strong></p><p>路程约30公里，南线海岸线更加原生态。</p><h3>骑行贴士：</h3><p>• 电动车租赁约60-80元/天</p><p>• 自行车租赁约30-50元/天</p><p>• 建议早上6点出发看日出</p><p>• 注意防晒和补水</p>',
        location: {
          latitude: 23.4234,
          longitude: 117.0234
        },
        address: '南澳岛环岛公路',
        info: [
          { label: '骑行距离', value: '约60公里' },
          { label: '建议时长', value: '2天' },
          { label: '租赁费用', value: '30-80元/天' }
        ],
        weight: 9,
        status: 'published',
        views: 0,
        likes: 0,
        createTime: new Date(),
        updateTime: new Date()
      },
      {
        title: '南澳岛交通指南',
        category: 'info',
        tags: ['交通', '实用', '必看'],
        cover: 'https://via.placeholder.com/800x600/2196F3/FFFFFF?text=交通指南',
        images: [
          'https://via.placeholder.com/800x600/2196F3/FFFFFF?text=交通指南+1'
        ],
        summary: '详细的南澳岛交通指南，包括如何到达岛上、岛内交通方式和注意事项。',
        content: '<h3>如何到达南澳岛：</h3><p><strong>自驾：</strong>导航至"南澳大桥"，过桥费约96元/往返。岛上停车方便，民宿通常有免费停车场。</p><p><strong>公交：</strong>汕头市区乘坐203路公交到莱芜渡口，然后转乘轮渡到南澳岛（轮渡约20元/人）。</p><h3>岛内交通：</h3><p><strong>电动车/自行车：</strong>最推荐的出行方式，灵活方便，适合环岛游。</p><p><strong>公交车：</strong>岛内有公交环线，票价2-5元，但班次较少。</p><p><strong>出租车：</strong>起步价较高，建议包车，约200-300元/天。</p><h3>注意事项：</h3><p>• 南澳大桥限速60公里/小时</p><p>• 节假日南澳大桥可能实行交通管制</p><p>• 建议提前购买轮渡票</p>',
        location: null,
        address: null,
        info: [
          { label: '过桥费', value: '96元/往返' },
          { label: '轮渡', value: '约20元/人' },
          { label: '岛内公交', value: '2-5元' }
        ],
        weight: 8,
        status: 'published',
        views: 0,
        likes: 0,
        createTime: new Date(),
        updateTime: new Date()
      },
      {
        title: '青澳湾日出观赏攻略',
        category: 'spot',
        tags: ['日出', '打卡', '拍照', '情侣'],
        cover: 'https://via.placeholder.com/800x600/FF9800/FFFFFF?text=青澳湾日出',
        images: [
          'https://via.placeholder.com/800x600/FF9800/FFFFFF?text=青澳湾日出+1'
        ],
        summary: '青澳湾是南澳岛观看日出的最佳地点，北回归线标志塔就在这里。',
        content: '<p>青澳湾位于南澳岛东端，是观看海上日出的绝佳位置。这里的沙滩平缓，海水清澈，被称为"东方夏威夷"。</p><h3>最佳观赏点：</h3><p><strong>1. 北回归线标志塔</strong> - 最有名的打卡点，日出时分光线最美。</p><p><strong>2. 青澳湾沙滩</strong> - 可以赤脚走在沙滩上，等待太阳从海平面升起。</p><h3>最佳时间：</h3><p>• 夏季：5:30-6:00</p><p>• 冬季：6:30-7:00</p><p>• 建议提前30分钟到达，选好位置</p><h3>拍照贴士：</h3><p>• 带上三脚架，可以拍出美丽的剪影</p><p>• 日出后后的蓝调时段也很美</p><p>• 可以利用北回归线标志塔作为前景</p>',
        location: {
          latitude: 23.4234,
          longitude: 117.0234
        },
        address: '南澳县青澳湾',
        info: [
          { label: '最佳季节', value: '夏季' },
          { label: '最佳时间', value: '早上5:30-6:00' },
          { label: '门票', value: '免费' }
        ],
        weight: 10,
        status: 'published',
        views: 0,
        likes: 0,
        createTime: new Date(),
        updateTime: new Date()
      }
    ];

    console.log('3.6 开始添加攻略数据，数量:', guidesData.length);
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < guidesData.length; i++) {
      const guide = guidesData[i];
      console.log(`3.7.${i + 1} 添加攻略: ${guide.title}`);

      try {
        const addResult = await db.collection('guides').add({
          data: guide
        });

        if (addResult._id || addResult.id) {
          console.log(`3.8.${i + 1} ✅ ${guide.title} 添加成功, ID: ${addResult._id || addResult.id}`);
          successCount++;
        } else {
          console.log(`3.9.${i + 1} ❌ ${guide.title} 添加失败`);
          failCount++;
        }
      } catch (err) {
        console.error(`3.10.${i + 1} ❌ ${guide.title} 添加出错:`, err);
        failCount++;
      }
    }

    console.log(`3.11 攻略添加完成，成功: ${successCount}/${guidesData.length}`);

    if (successCount > 0) {
      return {
        success: true,
        message: `攻略数据初始化成功 (${successCount}/${guidesData.length})`,
        count: successCount,
        data: guidesData
      };
    } else {
      return {
        success: false,
        errMsg: `没有攻略数据被添加 (成功: ${successCount})`
      };
    }
  } catch (err) {
    console.error('3.X 攻略数据初始化出错:', err);
    throw err;
  }
}

/**
 * 清空所有数据（慎用！）
 */
async function clearAll() {
  console.log('4. 开始清空所有数据');

  // 获取所有集合的记录
  const collections = ['guides', 'hostel', 'rooms', 'favorites'];
  const cleared = {};

  for (const collName of collections) {
    try {
      console.log(`4.1 清空集合: ${collName}`);
      const res = await db.collection(collName).get();
      console.log(`4.2 ${collName} 有 ${res.data.length} 条记录`);

      let deleteCount = 0;
      for (const doc of res.data) {
        await db.collection(collName).doc(doc._id).remove();
        deleteCount++;
      }

      cleared[collName] = deleteCount;
      console.log(`4.3 ${collName} 删除了 ${deleteCount} 条记录`);
    } catch (err) {
      console.error(`4.X 清空 ${collName} 失败:`, err);
      cleared[collName] = 0;
    }
  }

  console.log('4.4 清空完成:', cleared);

  return {
    success: true,
    message: '所有数据已清空',
    data: cleared
  };
}
