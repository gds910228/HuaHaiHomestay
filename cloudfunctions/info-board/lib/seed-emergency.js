/**
 * 南澳岛应急联系 & 便民服务 POI seed
 *
 * 数据来源:南澳县公安局公开信息 / 南澳县应急管理局公示 / 旅游政务公开渠道
 * 最后更新:2026 年版
 *
 * 字段:
 *  - category: 'hospital' | 'police' | 'gas' | 'general' | 'travel-service' | 'travel-agency'
 *  - name, address, phone(可含空格/横线/斜杠分隔多号)
 *  - latitude, longitude (GCJ02);通用号码 / 无具体坐标 填 0
 *  - weight: 同 category 内排序权重(降序)
 *  - subtitle: 可选附加说明(如医院"24h 急诊")
 */
module.exports = [
  // ==================== 🏥 医院 ====================
  {
    category: 'hospital',
    name: '南澳县人民医院',
    address: '后宅镇隆澳大街',
    phone: '0754-86802348',
    subtitle: '24h 急诊 · 岛上主要医疗机构',
    latitude: 23.4225, longitude: 116.9810,
    weight: 100
  },

  // ==================== 👮 派出所 ====================
  {
    category: 'police',
    name: '南澳县公安局',
    address: '后宅镇中兴路',
    phone: '0754-86809643',
    latitude: 23.4222, longitude: 116.9815,
    weight: 110
  },
  {
    category: 'police',
    name: '后宅派出所',
    address: '后宅镇中兴路 165 号',
    phone: '0754-86800808',
    latitude: 23.4231, longitude: 116.9803,
    weight: 100
  },
  {
    category: 'police',
    name: '云澳派出所',
    address: '云澳镇台湾街 1 号',
    phone: '0754-86853755',
    latitude: 23.4019, longitude: 117.0721,
    weight: 90
  },
  {
    category: 'police',
    name: '青澳派出所',
    address: '青澳湾街景路旁',
    phone: '0754-86997372',
    latitude: 23.4566, longitude: 117.1310,
    weight: 90
  },
  {
    category: 'police',
    name: '长山尾派出所',
    address: '长山尾码头',
    phone: '0754-86806391',
    latitude: 23.4253, longitude: 116.9512,
    weight: 80
  },

  // ==================== ⛽ 加油站 ====================
  {
    category: 'gas',
    name: '中海油海澳加油站',
    address: '后宅镇中兴路沈公坑路口',
    phone: '0754-86803999',
    subtitle: '已完成安全生产应急预案备案',
    latitude: 23.4240, longitude: 116.9845,
    weight: 100
  },
  {
    category: 'gas',
    name: '中国石化亨翔加油站',
    address: '336 省道北隆东边防派出所东北 300 米',
    phone: '0754-86801878',
    latitude: 23.4280, longitude: 116.9900,
    weight: 90
  },

  // ==================== 🆘 紧急救援(全国通用) ====================
  {
    category: 'general',
    name: '报警',
    address: '全国统一',
    phone: '110',
    latitude: 0, longitude: 0,
    weight: 100
  },
  {
    category: 'general',
    name: '火警',
    address: '全国统一',
    phone: '119',
    latitude: 0, longitude: 0,
    weight: 95
  },
  {
    category: 'general',
    name: '医疗急救',
    address: '全国统一',
    phone: '120',
    latitude: 0, longitude: 0,
    weight: 90
  },
  {
    category: 'general',
    name: '海上遇险救援',
    address: '全国统一',
    phone: '12395',
    latitude: 0, longitude: 0,
    weight: 85
  },

  // ==================== 📞 旅游服务 & 便民咨询 ====================
  {
    category: 'travel-service',
    name: '旅游票务咨询',
    address: '南澳县旅游服务',
    phone: '0754-89802123 / 0754-86803033',
    subtitle: '旅游信息咨询、票务',
    latitude: 0, longitude: 0,
    weight: 100
  },
  {
    category: 'travel-service',
    name: '政务服务热线',
    address: '全国统一',
    phone: '12345',
    subtitle: '旅游投诉 · 综合服务',
    latitude: 0, longitude: 0,
    weight: 90
  },
  {
    category: 'travel-service',
    name: '南澳县应急管理局',
    address: '南澳县政府',
    phone: '0754-86802216',
    subtitle: '台风 · 暴雨等自然灾害应急',
    latitude: 0, longitude: 0,
    weight: 80
  },

  // ==================== 🏢 旅行社 ====================
  {
    category: 'travel-agency',
    name: '汕头市南澳海岛国际旅行社',
    address: '后宅镇前江巷口路安居工程楼下',
    phone: '0754-86800470',
    latitude: 23.4220, longitude: 116.9805,
    weight: 100
  },
  {
    category: 'travel-agency',
    name: '南澳海岸国际旅行社',
    address: '后宅镇龙滨路 78 号 209',
    phone: '0754-89806377',
    latitude: 23.4225, longitude: 116.9810,
    weight: 90
  },
  {
    category: 'travel-agency',
    name: '汕头市渔民国际旅行社',
    address: '后宅镇城内路(社保北侧)',
    phone: '0754-89806388',
    latitude: 23.4218, longitude: 116.9798,
    weight: 85
  },
  {
    category: 'travel-agency',
    name: '南澳县海魅旅行社',
    address: '青澳湾碧海蓝天花园 2 幢 2601',
    phone: '0754-89807199',
    latitude: 23.4566, longitude: 117.1320,
    weight: 80
  },
  {
    category: 'travel-agency',
    name: '广东行天下国际旅行社南澳分部',
    address: '后宅镇前江安居工程西区 A 幢 D102',
    phone: '0754-86808028',
    latitude: 23.4220, longitude: 116.9802,
    weight: 75
  },
  {
    category: 'travel-agency',
    name: '汕头市广之旅旅行社南澳营业部',
    address: '后宅镇龙滨路第二建筑公司二楼',
    phone: '0754-89802234',
    latitude: 23.4225, longitude: 116.9812,
    weight: 70
  },
  {
    category: 'travel-agency',
    name: '汕头优达旅行社',
    address: '后宅镇崇文路龙东商住楼 107-04',
    phone: '0754-86813768',
    latitude: 23.4230, longitude: 116.9815,
    weight: 65
  }
];
