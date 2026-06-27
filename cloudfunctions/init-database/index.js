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
 * 校验管理密码 - 从云函数环境变量 ADMIN_PASSWORD 读取
 * 仓库公开,密码绝不写在源码里。部署前请在
 * 云开发控制台 → 云函数 → init-database → 函数配置 → 环境变量
 * 配置 ADMIN_PASSWORD=<你的密码>
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
 * 数据库初始化云函数
 * 自动创建集合并添加初始数据
 */
exports.main = async (event, context) => {
  const { type, password } = event;


  const check = checkAdminPassword(password);
  if (!check.configured) {
    console.error('云函数未配置 ADMIN_PASSWORD 环境变量,拒绝执行');
    return {
      success: false,
      errMsg: '云函数未配置 ADMIN_PASSWORD,请到云开发控制台 → 云函数 → init-database → 函数配置 → 环境变量 添加后重试'
    };
  }
  if (!check.ok) {
    return {
      success: false,
      errMsg: '密码错误'
    };
  }

  try {
    let result;
    switch (type) {
      case 'initAll':
        result = await initAll();
        break;
      case 'initHostel':
        result = await initHostel();
        break;
      case 'initRooms':
        result = await initRooms();
        break;
      case 'addLingFengRoom':
        result = await addLingFengRoom();
        break;
      case 'addWangHaiRoom':
        result = await addWangHaiRoom();
        break;
      case 'addSanFangRoom':
        result = await addSanFangRoom();
        break;
      case 'initFood':
        result = await initFood();
        break;
      case 'updateRoomFacilities':
        result = await updateRoomFacilities();
        break;
      default:
        return {
          success: false,
          errMsg: 'Invalid operation type'
        };
    }

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

  const results = {
    hostel: await initHostel(),
    rooms: await initRooms()
  };


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

  try {
    // 先尝试查询，触发集合创建
    const checkResult = await db.collection('hostel').limit(1).get();

    // 判断是否真的有数据 - 使用 count() 更准确
    const countResult = await db.collection('hostel').count();

    if (countResult.total > 0) {
      return {
        success: true,
        message: '民宿信息已存在，跳过初始化'
      };
    }

    const hostelData = {
      name: '画海民宿',
      description: '欢迎来到画海民宿，我们位于美丽的南澳岛青澳湾，为您提供舒适的住宿环境和贴心的服务。民宿出门即是海滩，环境优美，是您度假的理想选择。',
      address: '广东省汕头市南澳县后宅镇青澳湾',
      phone: '18907208020',
      wechat: 'qingaiyisheng321',
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

    const addResult = await db.collection('hostel').add({
      data: hostelData
    });


    if (addResult._id || addResult.id) {
      return {
        success: true,
        message: '民宿信息初始化成功',
        data: hostelData
      };
    } else {
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
 * 更新：增强数据结构，支持详细的房间信息、设施分类、入住规则等
 */
async function initRooms() {

  try {
    const checkResult = await db.collection('rooms').limit(1).get();

    const countResult = await db.collection('rooms').count();

    if (countResult.total > 0) {
      return {
        success: true,
        message: '房型数据已存在，跳过初始化'
      };
    }

    const roomsData = [
      // 模拟房型1：海景大床房（旧数据结构，保留兼容）
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
      // 模拟房型2：标准双床房（旧数据结构）
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
      // 模拟房型3：家庭套房（旧数据结构）
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
      },
      // 真实房型：画海-聆风（新增强数据结构）
      {
        roomType: '海景一室大床房',
        roomCategory: '公寓',
        images: [
          // TODO: 需要上传15张真实图片到云存储，然后替换这些placeholder
          'https://via.placeholder.com/800x600/FF9800/FFFFFF?text=画海-聆风+1',
          'https://via.placeholder.com/800x600/FF9800/FFFFFF?text=画海-聆风+2',
          'https://via.placeholder.com/800x600/FF9800/FFFFFF?text=画海-聆风+3',
          'https://via.placeholder.com/800x600/FF9800/FFFFFF?text=画海-聆风+4',
          'https://via.placeholder.com/800x600/FF9800/FFFFFF?text=画海-聆风+5',
          'https://via.placeholder.com/800x600/FF9800/FFFFFF?text=画海-聆风+6',
          'https://via.placeholder.com/800x600/FF9800/FFFFFF?text=画海-聆风+7',
          'https://via.placeholder.com/800x600/FF9800/FFFFFF?text=画海-聆风+8',
          'https://via.placeholder.com/800x600/FF9800/FFFFFF?text=画海-聆风+9',
          'https://via.placeholder.com/800x600/FF9800/FFFFFF?text=画海-聆风+10',
          'https://via.placeholder.com/800x600/FF9800/FFFFFF?text=画海-聆风+11',
          'https://via.placeholder.com/800x600/FF9800/FFFFFF?text=画海-聆风+12',
          'https://via.placeholder.com/800x600/FF9800/FFFFFF?text=画海-聆风+13',
          'https://via.placeholder.com/800x600/FF9800/FFFFFF?text=画海-聆风+14',
          'https://via.placeholder.com/800x600/FF9800/FFFFFF?text=画海-聆风+15'
        ],
        description: '温馨舒适的公寓式海景房，超大落地窗直面大海，配备投影仪和音响系统，适合情侣度假或家庭出游。房间40平米，设施齐全，楼下就是海滩，步行可达青澳湾景区。',
        area: '40m²',
        bedType: '特大床 2米',
        maxGuests: 2,
        allowExtraGuests: false,
        breakfast: '无早餐',
        fixedPrice: 538, // 固定价格（替代 price: { low, high }）
        tags: ['海景', '投影', '公寓', '特大床', '度假'],

        // 入住规则
        checkInRules: {
          checkInTime: '14:00后入住',
          checkOutTime: '12:00前退房',
          cancelPolicy: '30分钟内免费取消，订单确认30分钟后取消订单将扣除全部房费',
          deposit: 200,
          instantConfirm: true // 立即确认
        },

        // 接待要求
        guestRequirements: {
          allowInfants: true,         // 接待婴儿
          allowChildren: true,        // 接待儿童
          allowElderly: true,         // 接待老人
          allowOverseas: false,       // 不接待海外游客
          allowHKMacaoTaiwan: false,  // 不接待港澳台游客
          allowPets: false,           // 不允许携带宠物
          allowSmoking: true,         // 允许吸烟
          allowCooking: false,        // 不允许做饭
          allowParty: true,           // 允许聚会
          allowCommercialShoot: false // 不允许商业拍摄
        },

        // 详细设施分类（8大类）
        detailedFacilities: {
          // 服务类
          services: [
            '免费停车位',
            '付费停车位',
            '行李寄存',
            '管家式服务'
          ],
          // 基础类
          basic: [
            '无线网络',
            '电梯',
            '落地窗',
            '卧室-冷暖空调',
            '暖气',
            '晾衣架',
            '电热水壶',
            '沙发',
            '电视',
            '冰箱',
            '洗衣机',
            '免费瓶装水'
          ],
          // 卫浴类
          bathroom: [
            '一次性拖鞋',
            '热水',
            '独立卫浴',
            '电吹风',
            '洗浴用品',
            '牙具',
            '浴巾',
            '毛巾',
            '干湿分离'
          ],
          // 厨房类
          kitchen: [
            '电磁炉',
            '洗涤用品'
            // 注意：微波炉、餐具、刀具菜板、烹饪锅具、燃气灶 不提供
          ],
          // 周边配套
          surroundings: [
            '超市',
            '便利店',
            '餐厅',
            '药店',
            '公园',
            '海滩',
            '儿童乐园',
            '充电桩'
          ],
          // 安全设施
          safety: [
            '急救包',
            '智能门锁',
            '门禁卡',
            '保安',
            '火灾警报器',
            '灭火器'
          ],
          // 娱乐设施
          entertainment: [
            '投影设备',
            '音响',
            '读书品茶'
          ],
          // 休闲设施
          leisure: [
            '落地窗',
            '儿童防护设施'
          ]
        },

        // 兼容旧字段：简单设施列表（用于快速展示）
        facilities: [
          '无线网络', '电梯', '落地窗', '冷暖空调', '投影设备',
          '音响', '独立卫浴', '干湿分离', '冰箱', '洗衣机',
          '智能门锁', '超大观景窗', '管家式服务'
        ],

        status: 'available',
        updateTime: new Date()
      }
    ];

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < roomsData.length; i++) {
      const room = roomsData[i];

      try {
        const addResult = await db.collection('rooms').add({
          data: room
        });

        if (addResult._id || addResult.id) {
          successCount++;
        } else {
          failCount++;
        }
      } catch (err) {
        console.error(`2.10.${i + 1} ❌ ${room.roomType} 添加出错:`, err);
        failCount++;
      }
    }


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
 * 初始化美食攻略数据
 */
async function initFood() {

  try {
    const checkResult = await db.collection('guides').limit(1).get();

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < foodData.foodGuides.length; i++) {
      const guide = foodData.foodGuides[i];

      try {
        // 先检查是否已存在相同标题的攻略
        const existing = await db.collection('guides').where({
          title: guide.title
        }).get();

        if (existing.data.length > 0) {
          successCount++;
          continue;
        }

        const addResult = await db.collection('guides').add({
          data: guide
        });

        if (addResult._id || addResult.id) {
          successCount++;
        } else {
          failCount++;
        }
      } catch (err) {
        console.error(`5.8.${i + 1} ❌ ${guide.title} 添加出错:`, err);
        failCount++;
      }
    }


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
 * 添加"画海-聆风"房型
 * 检查是否已存在，如果不存在则添加
 */
async function addLingFengRoom() {

  try {
    // 检查是否已存在"海景一室大床房"
    const existing = await db.collection('rooms').where({
      roomType: '海景一室大床房'
    }).get();

    if (existing.data.length > 0) {
      return {
        success: true,
        message: '"画海-聆风"房型已存在，无需重复添加',
        exists: true
      };
    }


    // "画海-聆风"房型数据
    const lingFengRoom = {
      roomType: '海景一室大床房',
      roomCategory: '公寓',
      images: [
        // TODO: 需要上传15张真实图片到云存储，然后替换这些placeholder
        'https://via.placeholder.com/800x600/FF9800/FFFFFF?text=画海-聆风+1',
        'https://via.placeholder.com/800x600/FF9800/FFFFFF?text=画海-聆风+2',
        'https://via.placeholder.com/800x600/FF9800/FFFFFF?text=画海-聆风+3',
        'https://via.placeholder.com/800x600/FF9800/FFFFFF?text=画海-聆风+4',
        'https://via.placeholder.com/800x600/FF9800/FFFFFF?text=画海-聆风+5',
        'https://via.placeholder.com/800x600/FF9800/FFFFFF?text=画海-聆风+6',
        'https://via.placeholder.com/800x600/FF9800/FFFFFF?text=画海-聆风+7',
        'https://via.placeholder.com/800x600/FF9800/FFFFFF?text=画海-聆风+8',
        'https://via.placeholder.com/800x600/FF9800/FFFFFF?text=画海-聆风+9',
        'https://via.placeholder.com/800x600/FF9800/FFFFFF?text=画海-聆风+10',
        'https://via.placeholder.com/800x600/FF9800/FFFFFF?text=画海-聆风+11',
        'https://via.placeholder.com/800x600/FF9800/FFFFFF?text=画海-聆风+12',
        'https://via.placeholder.com/800x600/FF9800/FFFFFF?text=画海-聆风+13',
        'https://via.placeholder.com/800x600/FF9800/FFFFFF?text=画海-聆风+14',
        'https://via.placeholder.com/800x600/FF9800/FFFFFF?text=画海-聆风+15'
      ],
      description: '温馨舒适的公寓式海景房，超大落地窗直面大海，配备投影仪和音响系统，适合情侣度假或家庭出游。房间40平米，设施齐全，楼下就是海滩，步行可达青澳湾景区。',
      area: '40m²',
      bedType: '特大床 2米',
      maxGuests: 2,
      allowExtraGuests: false,
      breakfast: '无早餐',
      fixedPrice: 538, // 固定价格（替代 price: { low, high }）
      tags: ['海景', '投影', '公寓', '特大床', '度假'],

      // 入住规则
      checkInRules: {
        checkInTime: '14:00后入住',
        checkOutTime: '12:00前退房',
        cancelPolicy: '30分钟内免费取消，订单确认30分钟后取消订单将扣除全部房费',
        deposit: 200,
        instantConfirm: true // 立即确认
      },

      // 接待要求
      guestRequirements: {
        allowInfants: true,         // 接待婴儿
        allowChildren: true,        // 接待儿童
        allowElderly: true,         // 接待老人
        allowOverseas: false,       // 不接待海外游客
        allowHKMacaoTaiwan: false,  // 不接待港澳台游客
        allowPets: false,           // 不允许携带宠物
        allowSmoking: true,         // 允许吸烟
        allowCooking: false,        // 不允许做饭
        allowParty: true,           // 允许聚会
        allowCommercialShoot: false // 不允许商业拍摄
      },

      // 详细设施分类（8大类）
      detailedFacilities: {
        // 服务类
        services: [
          '免费停车位',
          '付费停车位',
          '行李寄存',
          '管家式服务'
        ],
        // 基础类
        basic: [
          '无线网络',
          '电梯',
          '落地窗',
          '卧室-冷暖空调',
          '暖气',
          '晾衣架',
          '电热水壶',
          '沙发',
          '电视',
          '冰箱',
          '洗衣机',
          '免费瓶装水'
        ],
        // 卫浴类
        bathroom: [
          '一次性拖鞋',
          '热水',
          '独立卫浴',
          '电吹风',
          '洗浴用品',
          '牙具',
          '浴巾',
          '毛巾',
          '干湿分离'
        ],
        // 厨房类
        kitchen: [
          '电磁炉',
          '洗涤用品'
          // 注意：微波炉、餐具、刀具菜板、烹饪锅具、燃气灶 不提供
        ],
        // 周边配套
        surroundings: [
          '超市',
          '便利店',
          '餐厅',
          '药店',
          '公园',
          '海滩',
          '儿童乐园',
          '充电桩'
        ],
        // 安全设施
        safety: [
          '急救包',
          '智能门锁',
          '门禁卡',
          '保安',
          '火灾警报器',
          '灭火器'
        ],
        // 娱乐设施
        entertainment: [
          '投影设备',
          '音响',
          '读书品茶'
        ],
        // 休闲设施
        leisure: [
          '落地窗',
          '儿童防护设施'
        ]
      },

      // 兼容旧字段：简单设施列表（用于快速展示）
      facilities: [
        '无线网络', '电梯', '落地窗', '冷暖空调', '投影设备',
        '音响', '独立卫浴', '干湿分离', '冰箱', '洗衣机',
        '智能门锁', '超大观景窗', '管家式服务'
      ],

      status: 'available',
      createTime: new Date(),
      updateTime: new Date()
    };

    const addResult = await db.collection('rooms').add({
      data: lingFengRoom
    });

    if (addResult._id || addResult.id) {
      return {
        success: true,
        message: '"画海-聆风"房型添加成功',
        data: lingFengRoom,
        roomId: addResult._id || addResult.id
      };
    } else {
      return {
        success: false,
        errMsg: '"画海-聆风"房型添加失败'
      };
    }
  } catch (err) {
    console.error('6.X 添加"画海-聆风"房型出错:', err);
    return {
      success: false,
      errMsg: err.message
    };
  }
}

/**
 * 添加"画海-望海"房型
 * 海景二室一厅套房，奶油原木风，楼下沙滩，县城中心
 */
async function addWangHaiRoom() {

  try {
    // 检查是否已存在"海景二室一厅套房"
    const existing = await db.collection('rooms').where({
      roomType: '海景二室一厅套房'
    }).get();

    if (existing.data.length > 0) {
      return {
        success: true,
        message: '"画海-望海"房型已存在，无需重复添加',
        exists: true
      };
    }


    // "画海-望海"房型数据
    const wangHaiRoom = {
      roomType: '海景二室一厅套房',
      roomCategory: '公寓',
      images: [
        // TODO: 需要上传15张真实图片到云存储，然后替换这些placeholder
        'https://via.placeholder.com/800x600/4CAF50/FFFFFF?text=画海-望海+1',
        'https://via.placeholder.com/800x600/4CAF50/FFFFFF?text=画海-望海+2',
        'https://via.placeholder.com/800x600/4CAF50/FFFFFF?text=画海-望海+3',
        'https://via.placeholder.com/800x600/4CAF50/FFFFFF?text=画海-望海+4',
        'https://via.placeholder.com/800x600/4CAF50/FFFFFF?text=画海-望海+5',
        'https://via.placeholder.com/800x600/4CAF50/FFFFFF?text=画海-望海+6',
        'https://via.placeholder.com/800x600/4CAF50/FFFFFF?text=画海-望海+7',
        'https://via.placeholder.com/800x600/4CAF50/FFFFFF?text=画海-望海+8',
        'https://via.placeholder.com/800x600/4CAF50/FFFFFF?text=画海-望海+9',
        'https://via.placeholder.com/800x600/4CAF50/FFFFFF?text=画海-望海+10',
        'https://via.placeholder.com/800x600/4CAF50/FFFFFF?text=画海-望海+11',
        'https://via.placeholder.com/800x600/4CAF50/FFFFFF?text=画海-望海+12',
        'https://via.placeholder.com/800x600/4CAF50/FFFFFF?text=画海-望海+13',
        'https://via.placeholder.com/800x600/4CAF50/FFFFFF?text=画海-望海+14',
        'https://via.placeholder.com/800x600/4CAF50/FFFFFF?text=画海-望海+15'
      ],
      description: '画海·望海-奶油原木风两房一厅特色民宿，楼下沙滩，县城中心，后宅镇，网红小夜市，楼下公交车站。优选民宿，经济型，干净卫生设施齐全。海景、近沙滩、小而美。共60平米，2卧室2张1.8米大床，可住4-6人。',
      area: '60m²',
      bedType: '2张1.8米大床（卧室1+卧室2）',
      maxGuests: 4,
      allowExtraGuests: true,
      extraGuestPrice: 50, // 加人费用 ¥50/人/晚
      extraGuestLimit: 2, // 最多加2人
      breakfast: '无早餐',
      fixedPrice: 868, // 固定价格
      tags: ['海景', '近沙滩', '小而美', '免费瓶装水', '海滩', '干湿分离', '桌游', '优选民宿'],

      // 入住规则
      checkInRules: {
        checkInTime: '14:00后入住',
        checkOutTime: '12:00前退房',
        cancelPolicy: '30分钟内免费取消，订单确认30分钟后取消订单将扣除全部房费',
        deposit: 200,
        instantConfirm: true // 立即确认
      },

      // 接待要求
      guestRequirements: {
        allowInfants: true,         // 接待婴儿
        allowChildren: true,        // 接待儿童
        allowElderly: true,         // 接待老人
        allowOverseas: false,       // 不接待海外游客
        allowHKMacaoTaiwan: false,  // 不接待港澳台游客
        allowPets: false,           // 不允许携带宠物
        allowSmoking: true,         // 允许吸烟
        allowCooking: false,        // 不允许做饭
        allowParty: true,           // 允许聚会
        allowCommercialShoot: false // 不允许商业拍摄
      },

      // 详细设施分类（8大类）
      detailedFacilities: {
        // 服务类
        services: [
          '免费停车位',
          '付费停车位',
          '行李寄存',
          '管家式服务'
        ],
        // 基础类
        basic: [
          '无线网络',
          '电梯',
          '落地窗',
          '卧室-冷暖空调',
          '客厅-冷暖空调',
          '暖气',
          '晾衣架',
          '电热水壶',
          '沙发',
          '电视',
          '冰箱',
          '洗衣机',
          '免费瓶装水'
        ],
        // 卫浴类
        bathroom: [
          '一次性拖鞋',
          '热水',
          '独立卫浴',
          '电吹风',
          '洗浴用品',
          '牙刷',
          '浴巾',
          '毛巾',
          '干湿分离'
        ],
        // 厨房类
        kitchen: [
          '电磁炉',
          '洗涤用品',
          '餐桌'
        ],
        // 周边配套
        surroundings: [
          '超市',
          '便利店',
          '餐厅',
          '药店',
          '公园',
          '海滩',
          '儿童乐园',
          '充电桩'
        ],
        // 安全设施
        safety: [
          '急救包',
          '智能门锁',
          '门禁卡',
          '保安',
          '火灾警报器',
          '灭火器'
        ],
        // 娱乐设施
        entertainment: [
          '投影设备',
          '音响',
          '桌游',
          '读书品茶'
        ],
        // 休闲设施
        leisure: [
          '落地窗'
        ]
      },

      // 兼容旧字段（取基础和卫浴的前10项作为简化设施列表）
      facilities: [
        '无线网络', '电梯', '落地窗', '卧室-冷暖空调', '客厅-冷暖空调',
        '暖气', '晾衣架', '电热水壶', '沙发', '电视'
      ],

      status: 'available', // 房间状态：available（可预订）、unavailable（已满房）、maintenance（维护中）
      createTime: new Date(),
      updateTime: new Date()
    };

    // 添加到数据库
    const result = await db.collection('rooms').add({
      data: wangHaiRoom
    });


    return {
      success: true,
      message: '成功添加"画海-望海"房型',
      roomId: result._id,
      roomType: wangHaiRoom.roomType,
      data: wangHaiRoom
    };
  } catch (err) {
    console.error('7.X 添加"画海-望海"房型失败:', err);
    return {
      success: false,
      errMsg: err.message
    };
  }
}

/**
 * 添加"画海-三房一厅"房型
 * 海景三室一厅套房，Ins风双投影，楼下沙滩，县城中心
 */
async function addSanFangRoom() {

  try {
    // 检查是否已存在"海景三室一厅套房"
    const existing = await db.collection('rooms').where({
      roomType: '海景三室一厅套房'
    }).get();

    if (existing.data.length > 0) {
      return {
        success: true,
        message: '"画海-三房一厅"房型已存在，无需重复添加',
        exists: true
      };
    }


    // "画海-三房一厅"房型数据
    const sanFangRoom = {
      roomType: '海景三室一厅套房',
      roomCategory: '公寓',
      images: [
        // TODO: 需要上传15张真实图片到云存储，然后替换这些placeholder
        'https://via.placeholder.com/800x600/9C27B0/FFFFFF?text=画海-三房一厅+1',
        'https://via.placeholder.com/800x600/9C27B0/FFFFFF?text=画海-三房一厅+2',
        'https://via.placeholder.com/800x600/9C27B0/FFFFFF?text=画海-三房一厅+3',
        'https://via.placeholder.com/800x600/9C27B0/FFFFFF?text=画海-三房一厅+4',
        'https://via.placeholder.com/800x600/9C27B0/FFFFFF?text=画海-三房一厅+5',
        'https://via.placeholder.com/800x600/9C27B0/FFFFFF?text=画海-三房一厅+6',
        'https://via.placeholder.com/800x600/9C27B0/FFFFFF?text=画海-三房一厅+7',
        'https://via.placeholder.com/800x600/9C27B0/FFFFFF?text=画海-三房一厅+8',
        'https://via.placeholder.com/800x600/9C27B0/FFFFFF?text=画海-三房一厅+9',
        'https://via.placeholder.com/800x600/9C27B0/FFFFFF?text=画海-三房一厅+10',
        'https://via.placeholder.com/800x600/9C27B0/FFFFFF?text=画海-三房一厅+11',
        'https://via.placeholder.com/800x600/9C27B0/FFFFFF?text=画海-三房一厅+12',
        'https://via.placeholder.com/800x600/9C27B0/FFFFFF?text=画海-三房一厅+13',
        'https://via.placeholder.com/800x600/9C27B0/FFFFFF?text=画海-三房一厅+14',
        'https://via.placeholder.com/800x600/9C27B0/FFFFFF?text=画海-三房一厅+15'
      ],
      description: '画海·三房一厅-Ins风双投影特色民宿，楼下沙滩，县城中心，后宅镇，网红小夜市，楼下公交站。优选民宿，经济型，干净卫生设施齐全。奶油风、海景、近沙滩、小而美。共100平米，3卧室1厅2卫，1张2米特大床+2张1.8米大床，可住6-8人。',
      area: '100m²',
      bedType: '1张2米特大床 + 2张1.8米大床（卧室1+卧室2+卧室3）',
      maxGuests: 6,
      allowExtraGuests: true,
      extraGuestPrice: 50, // 加人费用 ¥50/人/晚
      extraGuestLimit: 2, // 最多加2人
      breakfast: '无早餐',
      fixedPrice: 1380, // 固定价格
      tags: ['海景', '奶油风', '近沙滩', '小而美', '免费瓶装水', '海滩', '干湿分离', '优选民宿', '双投影'],

      // 入住规则
      checkInRules: {
        checkInTime: '14:00后入住',
        checkOutTime: '12:00前退房',
        cancelPolicy: '30分钟内免费取消，订单确认30分钟后取消订单将扣除全部房费',
        deposit: 200,
        instantConfirm: true // 立即确认
      },

      // 接待要求
      guestRequirements: {
        allowInfants: true,         // 接待婴儿
        allowChildren: true,        // 接待儿童
        allowElderly: true,         // 接待老人
        allowOverseas: false,       // 不接待海外游客
        allowHKMacaoTaiwan: false,  // 不接待港澳台游客
        allowPets: false,           // 不允许携带宠物
        allowSmoking: true,         // 允许吸烟
        allowCooking: false,        // 不允许做饭
        allowParty: true,           // 允许聚会
        allowCommercialShoot: true  // 允许商业拍摄
      },

      // 详细设施分类（8大类）
      detailedFacilities: {
        // 服务类
        services: [
          '免费停车位',
          '付费停车位',
          '行李寄存',
          '管家式服务'
        ],
        // 基础类
        basic: [
          '无线网络',
          '电梯',
          '落地窗',
          '卧室-冷暖空调',
          '客厅-冷暖空调',
          '暖气',
          '晾衣架',
          '电热水壶',
          '沙发',
          '电视',
          '冰箱',
          '洗衣机',
          '免费瓶装水'
        ],
        // 卫浴类
        bathroom: [
          '一次性拖鞋',
          '热水',
          '独立卫浴',
          '电吹风',
          '洗浴用品',
          '牙刷',
          '浴巾',
          '毛巾',
          '干湿分离'
        ],
        // 厨房类
        kitchen: [
          '微波炉',
          '餐具',
          '刀具菜板',
          '烹饪锅具',
          '电磁炉',
          '燃气灶',
          '洗涤用品',
          '餐桌'
        ],
        // 周边配套
        surroundings: [
          '超市',
          '便利店',
          '餐厅',
          '药店',
          '公园',
          '海滩',
          '菜市场',
          '提款机',
          '儿童乐园'
        ],
        // 安全设施
        safety: [
          '急救包',
          '保安',
          '火灾警报器',
          '灭火器'
        ],
        // 娱乐设施
        entertainment: [
          '投影设备',
          '音响',
          '桌游',
          '读书品茶'
        ],
        // 休闲设施
        leisure: [
          '落地窗'
        ],
        // 儿童设施
        children: [
          '儿童玩具'
        ]
      },

      // 兼容旧字段（取基础和卫浴的前10项作为简化设施列表）
      facilities: [
        '无线网络', '电梯', '落地窗', '卧室-冷暖空调', '客厅-冷暖空调',
        '暖气', '晾衣架', '电热水壶', '沙发', '电视'
      ],

      status: 'available', // 房间状态：available（可预订）、unavailable（已满房）、maintenance（维护中）
      createTime: new Date(),
      updateTime: new Date()
    };

    // 添加到数据库
    const result = await db.collection('rooms').add({
      data: sanFangRoom
    });


    return {
      success: true,
      message: '成功添加"画海-三房一厅"房型',
      roomId: result._id,
      roomType: sanFangRoom.roomType,
      data: sanFangRoom
    };
  } catch (err) {
    console.error('8.X 添加"画海-三房一厅"房型失败:', err);
    return {
      success: false,
      errMsg: err.message
    };
  }
}

/**
 * 更新所有房型的 detailedFacilities 字段
 * 为没有 detailedFacilities 或该字段为空的房型添加默认设施数据
 */
async function updateRoomFacilities() {

  try {
    // 获取所有房型
    const res = await db.collection('rooms').get();

    if (res.data.length === 0) {
      return {
        success: true,
        message: '没有需要更新的房型',
        count: 0
      };
    }

    let updateCount = 0;
    let skipCount = 0;

    // 默认设施数据结构（空数组）
    const defaultFacilities = {
      services: [],
      basic: [],
      bathroom: [],
      kitchen: [],
      surroundings: [],
      safety: [],
      entertainment: [],
      leisure: []
    };

    for (const room of res.data) {

      // 检查是否已有 detailedFacilities
      if (!room.detailedFacilities ||
          Object.keys(room.detailedFacilities).length === 0 ||
          (room.detailedFacilities.services &&
           room.detailedFacilities.basic &&
           room.detailedFacilities.bathroom &&
           room.detailedFacilities.kitchen &&
           room.detailedFacilities.surroundings &&
           room.detailedFacilities.safety &&
           room.detailedFacilities.entertainment &&
           room.detailedFacilities.leisure &&
           room.detailedFacilities.services.length === 0 &&
           room.detailedFacilities.basic.length === 0 &&
           room.detailedFacilities.bathroom.length === 0 &&
           room.detailedFacilities.kitchen.length === 0 &&
           room.detailedFacilities.surroundings.length === 0 &&
           room.detailedFacilities.safety.length === 0 &&
           room.detailedFacilities.entertainment.length === 0 &&
           room.detailedFacilities.leisure.length === 0)) {

        // 如果有旧的 facilities 字段，将其迁移到 basic 分类
        let facilitiesToUpdate = { ...defaultFacilities };
        if (room.facilities && Array.isArray(room.facilities) && room.facilities.length > 0) {
          facilitiesToUpdate.basic = room.facilities;
        }

        // 更新房型
        await db.collection('rooms').doc(room._id).update({
          data: {
            detailedFacilities: facilitiesToUpdate
          }
        });

        updateCount++;
      } else {
        skipCount++;
      }
    }


    return {
      success: true,
      message: `更新完成：${updateCount}个房型已添加详细设施，${skipCount}个房型已跳过`,
      updateCount: updateCount,
      skipCount: skipCount
    };
  } catch (err) {
    console.error('8.X 更新房型 detailedFacilities 失败:', err);
    return {
      success: false,
      errMsg: err.message
    };
  }
}
