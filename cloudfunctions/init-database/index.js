// cloudfunctions/init-database/index.js
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

// 引入美食数据
const foodData = require('./food-data.js');

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
      case 'initFood':
        console.log('执行 initFood');
        result = await initFood();
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
 * ⚠️ 已清空假数据，使用 initFood() 导入真实美食数据
 */
async function initGuides() {
  console.log('3. ⚠️ initGuides() 已废弃');
  console.log('3.1 请使用"美食攻略（真实数据）"按钮导入真实数据');

  return {
    success: true,
    message: '示例攻略已移除，请使用"美食攻略（真实数据）"导入基于真实攻略文件的数据'
  };
}

/**
 * 初始化美食攻略数据
 */
async function initFood() {
  console.log('5. 开始初始化美食攻略数据');

  try {
    console.log('5.1 检查/创建 guides 集合');
    const checkResult = await db.collection('guides').limit(1).get();
    console.log('5.2 查询结果:', checkResult);

    console.log('5.3 准备添加美食攻略数据，数量:', foodData.foodGuides.length);
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < foodData.foodGuides.length; i++) {
      const guide = foodData.foodGuides[i];
      console.log(`5.4.${i + 1} 添加美食攻略: ${guide.title}`);

      try {
        // 先检查是否已存在相同标题的攻略
        const existing = await db.collection('guides').where({
          title: guide.title
        }).get();

        if (existing.data.length > 0) {
          console.log(`5.5.${i + 1} ⚠️ ${guide.title} 已存在，跳过`);
          successCount++;
          continue;
        }

        const addResult = await db.collection('guides').add({
          data: guide
        });

        if (addResult._id || addResult.id) {
          console.log(`5.6.${i + 1} ✅ ${guide.title} 添加成功, ID: ${addResult._id || addResult.id}`);
          successCount++;
        } else {
          console.log(`5.7.${i + 1} ❌ ${guide.title} 添加失败`);
          failCount++;
        }
      } catch (err) {
        console.error(`5.8.${i + 1} ❌ ${guide.title} 添加出错:`, err);
        failCount++;
      }
    }

    console.log(`5.9 美食攻略添加完成，成功: ${successCount}/${foodData.foodGuides.length}`);

    if (successCount > 0) {
      return {
        success: true,
        message: `美食攻略数据初始化成功 (${successCount}/${foodData.foodGuides.length})`,
        count: successCount,
        data: foodData.foodGuides
      };
    } else {
      return {
        success: false,
        errMsg: `没有美食攻略数据被添加 (成功: ${successCount})`
      };
    }
  } catch (err) {
    console.error('5.X 美食攻略数据初始化出错:', err);
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
