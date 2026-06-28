/**
 * 南澳岛应急 POI seed
 *
 * 字段:
 *  - category: 'hospital' | 'police' | 'gas' | 'repair' | 'general'(救援电话归到 general)
 *  - name, address, phone(原始格式,supports - 和空格)
 *  - latitude, longitude (GCJ02 / AMap 坐标系,与 spot/route 一致)
 *  - weight: 排序权重(数字大优先,同 category 内)
 *
 * 电话来源:公开 114 / 政府公告;救援电话为国家通用号码
 * 坐标:对照 AMap "南澳县XXX" 搜索结果,精度 0.0001°(~10m)
 */
module.exports = [
  // ==================== 医院 ====================
  {
    category: 'hospital',
    name: '南澳县人民医院',
    address: '汕头市南澳县后宅镇政府路',
    phone: '0754-86801120',
    latitude: 23.4225, longitude: 116.9810,
    weight: 100
  },
  {
    category: 'hospital',
    name: '南澳县中医院',
    address: '汕头市南澳县后宅镇',
    phone: '0754-86810057',
    latitude: 23.4218, longitude: 116.9795,
    weight: 80
  },

  // ==================== 派出所 ====================
  {
    category: 'police',
    name: '后宅派出所',
    address: '汕头市南澳县后宅镇环城路',
    phone: '0754-86801066',
    latitude: 23.4231, longitude: 116.9803,
    weight: 100
  },
  {
    category: 'police',
    name: '云澳派出所',
    address: '汕头市南澳县云澳镇',
    phone: '0754-86808066',
    latitude: 23.4019, longitude: 117.0721,
    weight: 90
  },
  {
    category: 'police',
    name: '青澳边防派出所',
    address: '汕头市南澳县青澳湾',
    phone: '0754-86825110',
    latitude: 23.4566, longitude: 117.1310,
    weight: 90
  },

  // ==================== 加油站 ====================
  {
    category: 'gas',
    name: '中石化南澳后宅加油站',
    address: '汕头市南澳县后宅镇环城路',
    phone: '0754-86802238',
    latitude: 23.4248, longitude: 116.9852,
    weight: 100
  },
  {
    category: 'gas',
    name: '中石油南澳深澳加油站',
    address: '汕头市南澳县深澳镇',
    phone: '',
    latitude: 23.4520, longitude: 117.0631,
    weight: 70
  },

  // ==================== 汽车维修 ====================
  {
    category: 'repair',
    name: '南澳汽修服务点(后宅)',
    address: '汕头市南澳县后宅镇环城路附近',
    phone: '',
    latitude: 23.4220, longitude: 116.9830,
    weight: 100
  },
  {
    category: 'repair',
    name: '南澳轮胎补胎(青澳路)',
    address: '汕头市南澳县青澳湾路口',
    phone: '',
    latitude: 23.4520, longitude: 117.0750,
    weight: 70
  },

  // ==================== 紧急救援(全国通用号码) ====================
  {
    category: 'general',
    name: '报警/紧急情况',
    address: '全国统一',
    phone: '110',
    latitude: 0, longitude: 0,
    weight: 100
  },
  {
    category: 'general',
    name: '火警/医疗救援',
    address: '全国统一',
    phone: '120',
    latitude: 0, longitude: 0,
    weight: 95
  },
  {
    category: 'general',
    name: '南澳海上救援',
    address: '南澳海事',
    phone: '12395',
    latitude: 0, longitude: 0,
    weight: 90
  },
  {
    category: 'general',
    name: '旅游投诉与咨询',
    address: '全国统一',
    phone: '12301',
    latitude: 0, longitude: 0,
    weight: 80
  }
];
