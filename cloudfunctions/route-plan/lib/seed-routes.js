/**
 * 南澳岛 5 条经典路线 seed 数据
 *
 * 坐标精度 0.0001°,误差约 10m;手工对照 AMap 实测填,与 spot-sync/seed-spots 共享同一组坐标
 * routeKey 是 upsert 唯一键,seed:* 由脚本生成,人工新建可留空(走 _id)
 * 5 条 weight 排序:经典=100,两日游=95,摄影=85,美食=80,人文=70
 *
 * 维护提示:
 *  - 修改 waypoints 后,云函数控制台调 { type:'seedOne', routeKey:'seed:xxx' } 重 plan
 *  - 修改 days 时记得同步调整 waypoints 的 dayIndex 字段
 */

module.exports = [
  // ============ 1. 经典一日游 ============
  {
    routeKey: 'seed:classic-1day',
    title: '经典一日游',
    summary: '南澳岛精华 5 站,从长山尾灯塔到后宅镇,环岛主路一气呵成。适合首次到访。',
    days: 1,
    transport: 'driving',
    tags: ['必玩', '环岛'],
    weight: 100,
    waypoints: [
      {
        name: '长山尾灯塔',
        latitude: 23.4253, longitude: 116.9512,
        dayIndex: 1, stayMin: 30,
        desc: '南澳岛标志性红色灯塔,可观赏南澳大桥全景与日落',
        tip: ''
      },
      {
        name: '北回归线广场·青澳湾',
        latitude: 23.4602, longitude: 117.1278,
        dayIndex: 1, stayMin: 60,
        desc: '"自然之门"地标雕塑,青澳湾沙质细腻,可下海戏水',
        tip: '夏至日正午可见立竿无影'
      },
      {
        name: '三囱崖灯塔',
        latitude: 23.4577, longitude: 117.1413,
        dayIndex: 1, stayMin: 30,
        desc: '红白相间灯塔矗立海崖之上,环岛路最出片机位之一',
        tip: ''
      },
      {
        name: '云澳渔港',
        latitude: 23.4019, longitude: 117.0721,
        dayIndex: 1, stayMin: 50,
        desc: '南澳岛最大渔港,大排档可品尝当日捕捞海鲜',
        tip: '推荐紫菜炒饭、清蒸海鱼、白灼虾'
      },
      {
        name: '后宅镇',
        latitude: 23.4221, longitude: 116.9799,
        dayIndex: 1, stayMin: 60,
        desc: '岛上最繁华镇中心,美食民宿集中,适合晚餐与住宿',
        tip: ''
      }
    ]
  },

  // ============ 2. 摄影机位线(日出日落专线) ============
  {
    routeKey: 'seed:photo-spots',
    title: '摄影机位线 · 日出日落',
    summary: '专为出片设计:傍晚追日落,凌晨守日出。3 个灯塔 + 1 个登高位,色温丰富。',
    days: 1,
    transport: 'driving',
    tags: ['摄影', '日出', '日落'],
    weight: 85,
    waypoints: [
      {
        name: '长山尾灯塔',
        latitude: 23.4253, longitude: 116.9512,
        dayIndex: 1, stayMin: 40,
        desc: '红色灯塔 + 南澳大桥剪影,色温最佳',
        tip: '⭐ 日落首选机位,17:00 前抵达'
      },
      {
        name: '三囱崖灯塔',
        latitude: 23.4577, longitude: 117.1413,
        dayIndex: 1, stayMin: 30,
        desc: '白色灯塔 + 蔚蓝海景,适合下午顺光拍摄',
        tip: ''
      },
      {
        name: '竹栖肚溪',
        latitude: 23.4015, longitude: 117.0498,
        dayIndex: 1, stayMin: 50,
        desc: '清晨海面晨雾与朝阳交相辉映',
        tip: '⭐ 日出首选机位,05:00 前抵达,建议前一晚住青澳湾'
      },
      {
        name: '黄花山·北回归线地标',
        latitude: 23.4078, longitude: 117.0107,
        dayIndex: 1, stayMin: 40,
        desc: '登高俯瞰南澳大桥和海湾,地标碑适合打卡',
        tip: '需门票约 20 元/人,地标碑在公园深处'
      }
    ]
  },

  // ============ 3. 美食线 ============
  {
    routeKey: 'seed:food-tour',
    title: '美食一条线',
    summary: '从早茶到海鲜大餐,4 个镇串起南澳味觉地图。',
    days: 1,
    transport: 'driving',
    tags: ['美食', '海鲜'],
    weight: 80,
    waypoints: [
      {
        name: '后宅镇',
        latitude: 23.4221, longitude: 116.9799,
        dayIndex: 1, stayMin: 50,
        desc: '早餐与小吃集中地',
        tip: '推荐南澳肠粉、猪脚圈、蚝烙'
      },
      {
        name: '深澳镇',
        latitude: 23.4520, longitude: 117.0631,
        dayIndex: 1, stayMin: 40,
        desc: '南澳紫菜核心产区',
        tip: '可购买头水紫菜、虾干等干货伴手礼'
      },
      {
        name: '云澳渔港',
        latitude: 23.4019, longitude: 117.0721,
        dayIndex: 1, stayMin: 60,
        desc: '渔港大排档午餐',
        tip: '必点紫菜炒饭、清蒸海鱼、白灼虾'
      },
      {
        name: '青澳湾',
        latitude: 23.4566, longitude: 117.1310,
        dayIndex: 1, stayMin: 70,
        desc: '海鲜晚餐,边吃边看海',
        tip: '推荐蒜蓉蒸扇贝、椒盐皮皮虾'
      }
    ]
  },

  // ============ 4. 历史人文线 ============
  {
    routeKey: 'seed:history',
    title: '历史人文线',
    summary: '从明清军事到南宋遗踪,4 站串联南澳千年故事。',
    days: 1,
    transport: 'driving',
    tags: ['历史', '文化'],
    weight: 70,
    waypoints: [
      {
        name: '总兵府',
        latitude: 23.4520, longitude: 117.0631,
        dayIndex: 1, stayMin: 45,
        desc: '明清时期南澳岛军事指挥中心',
        tip: '郑成功曾在此驻军'
      },
      {
        name: '宋井',
        latitude: 23.4063, longitude: 117.1072,
        dayIndex: 1, stayMin: 40,
        desc: '南宋末年帝赵昺驻跸时所掘,临海井水甘甜',
        tip: '700 余年不枯'
      },
      {
        name: '雄镇关',
        latitude: 23.4347, longitude: 117.0712,
        dayIndex: 1, stayMin: 30,
        desc: '南澳岛古代关隘遗址,扼守岛陆咽喉',
        tip: ''
      },
      {
        name: '叠石岩',
        latitude: 23.4128, longitude: 117.0234,
        dayIndex: 1, stayMin: 40,
        desc: '天然巨石叠垒奇观,岩下古寺清幽',
        tip: ''
      }
    ]
  },

  // ============ 5. 周末两日游 ============
  {
    routeKey: 'seed:weekend-2day',
    title: '周末两日游',
    summary: 'D1 环岛主线 + 夜宿后宅,D2 凌晨追日出 + 黄花山观景。最完整的南澳体验。',
    days: 2,
    transport: 'mixed',
    dayTransport: { '1': 'driving', '2': 'driving' },
    tags: ['两日游', '深度'],
    weight: 95,
    waypoints: [
      // === Day 1 ===
      {
        name: '长山尾灯塔',
        latitude: 23.4253, longitude: 116.9512,
        dayIndex: 1, stayMin: 30,
        desc: '进岛第一站,远眺南澳大桥',
        tip: ''
      },
      {
        name: '北回归线广场·青澳湾',
        latitude: 23.4602, longitude: 117.1278,
        dayIndex: 1, stayMin: 90,
        desc: '打卡自然之门,沙滩放松',
        tip: '午餐可在青澳湾解决'
      },
      {
        name: '三囱崖灯塔',
        latitude: 23.4577, longitude: 117.1413,
        dayIndex: 1, stayMin: 30,
        desc: '环岛中路打卡点',
        tip: ''
      },
      {
        name: '竹栖肚溪',
        latitude: 23.4015, longitude: 117.0498,
        dayIndex: 1, stayMin: 30,
        desc: '傍晚踩点,为次日日出做准备',
        tip: ''
      },
      {
        name: '后宅镇',
        latitude: 23.4221, longitude: 116.9799,
        dayIndex: 1, stayMin: 0,
        desc: '夜宿后宅镇,体验岛上夜生活与美食',
        tip: '推荐南澳肠粉、蚝烙夜宵'
      },
      // === Day 2 ===
      {
        name: '竹栖肚溪',
        latitude: 23.4015, longitude: 117.0498,
        dayIndex: 2, stayMin: 50,
        desc: '早起看日出',
        tip: '⭐ 05:00-06:00 日出最佳'
      },
      {
        name: '黄花山·北回归线地标',
        latitude: 23.4078, longitude: 117.0107,
        dayIndex: 2, stayMin: 90,
        desc: '登高望远,俯瞰南澳大桥全景',
        tip: '门票约 20 元/人'
      },
      {
        name: '云澳渔港',
        latitude: 23.4019, longitude: 117.0721,
        dayIndex: 2, stayMin: 60,
        desc: '午餐后出岛',
        tip: '紫菜炒饭、海鲜大排档'
      }
    ]
  }
];
