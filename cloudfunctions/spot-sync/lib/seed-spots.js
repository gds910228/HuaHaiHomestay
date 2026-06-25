/**
 * 南澳岛真实景点保底数据
 * - 坐标精度 0.0001°,误差约 10m;手工核对自 AMap / 天地图
 * - amapId 占位为 "seed:xxx",AMap 同步成功后会被替换为真实 POI id
 * - location 是普通对象 {latitude, longitude};syncer 会同时生成 geoLocation: Geo.Point
 * - tags 控制在 1-3 个,与现有 guides.tags 字段保持一致语义
 */

module.exports = [
  {
    amapId: 'seed:qingaowan',
    title: '青澳湾',
    summary: '南澳岛东端的弧形海湾,沙白水清,被誉为"东方夏威夷"。日出与海面同色。',
    address: '汕头市南澳县青澳镇青澳湾',
    location: { latitude: 23.4566, longitude: 117.1310 },
    tags: ['海滩', '必去', '日出'],
    weight: 100
  },
  {
    amapId: 'seed:beihuiguixian',
    title: '北回归线标志塔·自然之门',
    summary: '北回归线穿过南澳岛的纪念地标,夏至日正午阳光直射穿过塔心,留下"立竿无影"奇观。',
    address: '汕头市南澳县青澳湾畔',
    location: { latitude: 23.4602, longitude: 117.1278 },
    tags: ['地标', '科普'],
    weight: 95
  },
  {
    amapId: 'seed:songjing',
    title: '宋井',
    summary: '南宋末年宋帝南逃驻留南澳所凿之井,千年涌泉至今未涸,海边咫尺却为淡水。',
    address: '汕头市南澳县云澳镇澳前村',
    location: { latitude: 23.4163, longitude: 117.0875 },
    tags: ['历史', '文化'],
    weight: 90
  },
  {
    amapId: 'seed:zongbingfu',
    title: '总兵府',
    summary: '明代南澳总兵驻地遗址,郑成功曾在此誓师收复台湾,内有兵防史展陈。',
    address: '汕头市南澳县深澳镇',
    location: { latitude: 23.4520, longitude: 117.0631 },
    tags: ['历史', '人文'],
    weight: 85
  },
  {
    amapId: 'seed:jinyindao',
    title: '金银岛',
    summary: '相传郑成功藏宝之地的礁石小岛,礁石嶙峋,涨潮时与陆地隔断,适合摄影与日落。',
    address: '汕头市南澳县云澳镇外海',
    location: { latitude: 23.4001, longitude: 117.0944 },
    tags: ['礁石', '日落', '摄影'],
    weight: 80
  },
  {
    amapId: 'seed:changshanwei',
    title: '长山尾灯塔',
    summary: '南澳岛西端的白色灯塔,与南澳大桥相望,日落机位首选,黄昏色温极佳。',
    address: '汕头市南澳县后宅镇长山尾',
    location: { latitude: 23.4253, longitude: 116.9512 },
    tags: ['灯塔', '日落'],
    weight: 88
  },
  {
    amapId: 'seed:huanghuashan',
    title: '黄花山国家森林公园',
    summary: '南澳岛最高山脉,登顶可俯瞰整个岛屿与外海,植被覆盖率高,常年云雾缭绕。',
    address: '汕头市南澳县后宅镇黄花山',
    location: { latitude: 23.4078, longitude: 117.0107 },
    tags: ['森林', '徒步', '观景'],
    weight: 92
  },
  {
    amapId: 'seed:nanaodaqiao',
    title: '南澳大桥',
    summary: '连接南澳岛与汕头市区的跨海大桥,全长 11.08 公里,曾是国内最长跨海大桥之一。',
    address: '汕头市南澳县后宅镇—澄海区',
    location: { latitude: 23.4192, longitude: 116.9189 },
    tags: ['跨海桥', '地标'],
    weight: 75
  },
  {
    amapId: 'seed:apowan',
    title: '啊婆湾',
    summary: '小众海湾,人少景静,适合避开人潮拍空镜,礁石间常见赶海者。',
    address: '汕头市南澳县深澳镇',
    location: { latitude: 23.4495, longitude: 117.0857 },
    tags: ['小众', '海湾', '赶海'],
    weight: 70
  },
  {
    amapId: 'seed:guicheng',
    title: '龟埕风景区',
    summary: '青澳湾东侧礁石滩,形如群龟卧海,涨退潮变化大,沿岸有栈道可远眺自然之门。',
    address: '汕头市南澳县青澳镇',
    location: { latitude: 23.4615, longitude: 117.1295 },
    tags: ['礁石', '栈道'],
    weight: 72
  },
  {
    amapId: 'seed:qixingbanyue',
    title: '七星伴月观景台',
    summary: '黄花山山脊观景平台,可同时看到七个海湾轮廓,夜晚是观星与远眺渔火的好地方。',
    address: '汕头市南澳县后宅镇黄花山顶',
    location: { latitude: 23.4061, longitude: 117.0098 },
    tags: ['观景台', '观星'],
    weight: 78
  },
  {
    amapId: 'seed:zoumabu',
    title: '走马埔风车阵',
    summary: '海岸线上的白色风力发电机阵列,蓝海+白机+沙滩配色,是南澳出片率最高的机位之一。',
    address: '汕头市南澳县云澳镇走马埔',
    location: { latitude: 23.4019, longitude: 117.0721 },
    tags: ['风车', '摄影'],
    weight: 82
  },
  {
    amapId: 'seed:xiongzhenguan',
    title: '雄镇关',
    summary: '清代关隘遗址,扼守深澳与云澳之间的山口,古道与城门保留完整,登关可眺南海。',
    address: '汕头市南澳县深澳镇与云澳镇交界',
    location: { latitude: 23.4347, longitude: 117.0712 },
    tags: ['古迹', '城关'],
    weight: 65
  },
  {
    amapId: 'seed:longmenwan',
    title: '龙门湾礁石区',
    summary: '青澳湾南侧的礁石海岸,涨潮时浪涛拍岸气势磅礴,退潮时露出大片潮汐池适合赶海。',
    address: '汕头市南澳县青澳镇',
    location: { latitude: 23.4533, longitude: 117.1280 },
    tags: ['礁石', '赶海'],
    weight: 73
  },
  {
    amapId: 'seed:fengchechanglang',
    title: '风车长廊',
    summary: '黄花山脊上沿公路延伸数公里的风电机组,公路两侧白色巨叶旋转,适合自驾骑行。',
    address: '汕头市南澳县黄花山脊',
    location: { latitude: 23.4087, longitude: 117.0089 },
    tags: ['风车', '自驾', '骑行'],
    weight: 76
  },
  {
    amapId: 'seed:longaoguicheng',
    title: '隆澳古城遗址',
    summary: '南澳岛上保存较完整的明清海防古城遗址,城墙、瓮城、海防炮台格局清晰可辨。',
    address: '汕头市南澳县后宅镇',
    location: { latitude: 23.4231, longitude: 116.9826 },
    tags: ['古城', '历史'],
    weight: 68
  },
  {
    amapId: 'seed:sancongya',
    title: '三囱崖灯塔',
    summary: '南澳岛最东端礁崖上的红白色灯塔,周边几乎无人工建筑,适合拍极简风海岸照。',
    address: '汕头市南澳县青澳镇东端',
    location: { latitude: 23.4577, longitude: 117.1413 },
    tags: ['灯塔', '极简'],
    weight: 71
  },
  {
    amapId: 'seed:haidaofengqing',
    title: '海岛风情街',
    summary: '后宅镇中心的步行街区,集中分布渔家小吃、海产干货与文创铺位,适合傍晚闲逛。',
    address: '汕头市南澳县后宅镇',
    location: { latitude: 23.4221, longitude: 116.9799 },
    tags: ['街区', '小吃', '夜逛'],
    weight: 62
  }
];
