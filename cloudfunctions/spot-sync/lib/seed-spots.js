/**
 * 南澳岛真实景点保底数据
 * - 坐标精度 0.0001°,误差约 10m;手工核对自 AMap / 天地图
 * - 当 KEY 配置完成后,可用 spot-sync 的 refineSpots 调用 AMap 文本搜索自动校准
 * - amapId 占位为 "seed:xxx",AMap refine 成功后 amapId 会替换成真实 POI id
 * - location 是普通对象 {latitude, longitude};syncer 会同时生成 geoLocation: Geo.Point
 * - tags 控制在 1-3 个,与现有 guides.tags 字段保持一致语义
 * - 每条景点新增 highlights/bestTime/duration/tips 结构化字段,
 *   syncer.buildContent 会自动生成富文本 content,无需重复手写 HTML
 */

module.exports = [
  {
    amapId: 'seed:qingaowan',
    title: '青澳湾',
    summary: '南澳岛东端的弧形海湾,沙白水清,被誉为"东方夏威夷"。日出与海面同色。',
    address: '汕头市南澳县青澳镇青澳湾',
    location: { latitude: 23.4566, longitude: 117.1310 },
    tags: ['海滩', '必去', '日出'],
    weight: 100,
    highlights: [
      '约 2.4 公里弧形沙滩,沙质细白,水质属南澳之最',
      '看日出的最佳机位之一,凌晨 5:30 海面被染成金色',
      '退潮时露出大片潮汐池,可赶海拾贝'
    ],
    bestTime: '日出(5:30-6:30)、傍晚(17:00-18:30)。夏季可全天戏水。',
    duration: '半天 ~ 一天(含玩水/拍照/吃午餐)',
    tips: [
      '夏季中午紫外线强,建议带遮阳伞与防晒霜',
      '海湾正中央旺季人多,可往东西两端走避开人潮',
      '部分海域无救生员,请勿越线游泳'
    ]
  },
  {
    amapId: 'seed:beihuiguixian',
    title: '北回归线标志塔·自然之门',
    summary: '北回归线穿过南澳岛的纪念地标,夏至日正午阳光直射穿过塔心,留下"立竿无影"奇观。',
    address: '汕头市南澳县青澳湾畔',
    location: { latitude: 23.4602, longitude: 117.1278 },
    tags: ['地标', '科普'],
    weight: 95,
    highlights: [
      '中国大陆 12 座北回归线标志塔之一,造型抽象大气',
      '夏至日(6/21 前后)正午可见"立竿无影"现象',
      '塔顶观景台俯瞰青澳湾全景,出片率极高'
    ],
    bestTime: '夏至日正午;日常推荐傍晚顺光拍摄',
    duration: '30 分钟 ~ 1 小时',
    tips: [
      '免门票,园区可上塔',
      '与青澳湾相邻,可串联游玩'
    ]
  },
  {
    amapId: 'seed:songjing',
    title: '宋井',
    summary: '南宋末年宋帝南逃驻留南澳所凿之井,千年涌泉至今未涸,海边咫尺却为淡水。',
    address: '汕头市南澳县云澳镇澳前村',
    // 坐标采用 AMap "广东省汕头市南澳县宋井" 权威 POI
    location: { latitude: 23.4063, longitude: 117.1072 },
    tags: ['历史', '文化'],
    weight: 90,
    highlights: [
      '近千年历史的古井,距离海岸仅数十米却出淡水',
      '相传南宋末帝赵昰、赵昺南逃避难凿井之处',
      '配套有宋井博物馆与海防纪念馆'
    ],
    bestTime: '上午 9:00-11:00 较凉爽',
    duration: '1 ~ 1.5 小时',
    tips: [
      '门票现场购买,景区内含多个相邻景点',
      '与金银岛、走马埔风车阵在同一片区,可一并安排'
    ]
  },
  {
    amapId: 'seed:zongbingfu',
    title: '总兵府',
    summary: '明代南澳总兵驻地遗址,郑成功曾在此誓师收复台湾,内有兵防史展陈。',
    address: '汕头市南澳县深澳镇',
    location: { latitude: 23.4520, longitude: 117.0631 },
    tags: ['历史', '人文'],
    weight: 85,
    highlights: [
      '明清两代南澳总兵驻地,见证东南海防 300 年',
      '郑成功 1661 年在此誓师起兵收复台湾',
      '院落保留明清建筑格局,有兵防陈列馆可参观'
    ],
    bestTime: '上午,光线柔和适合拍照',
    duration: '1 ~ 1.5 小时',
    tips: [
      '深澳古镇内可步行参观,周边有渔民市集',
      '门票较便宜,带学生证可半价'
    ]
  },
  {
    amapId: 'seed:jinyindao',
    title: '金银岛',
    summary: '相传郑成功藏宝之地的礁石小岛,礁石嶙峋,涨潮时与陆地隔断,适合摄影与日落。',
    address: '汕头市南澳县云澳镇外海',
    location: { latitude: 23.4001, longitude: 117.0944 },
    tags: ['礁石', '日落', '摄影'],
    weight: 80,
    highlights: [
      '相传郑成功撤退台湾前的藏宝之地',
      '礁石形态独特,潮间带生物丰富',
      '日落机位极佳,落日与礁石轮廓出片'
    ],
    bestTime: '日落前 1 小时(17:30-18:30 视季节)',
    duration: '1 ~ 2 小时',
    tips: [
      '涨潮时栈道部分被淹,出发前查潮汐表',
      '岛上无遮阴,夏天注意补水防晒'
    ]
  },
  {
    amapId: 'seed:changshanwei',
    title: '长山尾灯塔',
    summary: '南澳岛西端的白色灯塔,与南澳大桥相望,日落机位首选,黄昏色温极佳。',
    address: '汕头市南澳县后宅镇长山尾',
    location: { latitude: 23.4253, longitude: 116.9512 },
    tags: ['灯塔', '日落'],
    weight: 88,
    highlights: [
      '南澳岛西端守桥灯塔,与南澳大桥东西呼应',
      '日落机位,黄昏时大桥与海面被染成蜜糖色',
      '人少,可拍极简风海岸大片'
    ],
    bestTime: '日落前 1 小时(夏季 18:30,冬季 17:30)',
    duration: '1 小时',
    tips: [
      '需自驾或骑行前往,公交班次少',
      '灯塔本身不开放进入,只能在外围拍照'
    ]
  },
  {
    amapId: 'seed:huanghuashan',
    title: '黄花山国家森林公园',
    summary: '南澳岛最高山脉,登顶可俯瞰整个岛屿与外海,植被覆盖率高,常年云雾缭绕。',
    address: '汕头市南澳县后宅镇黄花山',
    location: { latitude: 23.4078, longitude: 117.0107 },
    tags: ['森林', '徒步', '观景'],
    weight: 92,
    highlights: [
      '南澳岛最高山,主峰大尖山海拔 588 米',
      '森林覆盖率 96%,空气负氧离子浓度极高',
      '俯瞰青澳湾、深澳湾、云澳湾全景'
    ],
    bestTime: '上午 9:00-11:00 或下午 15:00-17:00',
    duration: '半天 ~ 一天(含七星伴月、龟埕、风车长廊)',
    tips: [
      '山路弯多,自驾注意慢行',
      '山顶气温较低,带件薄外套',
      '园区内含龟埕、七星伴月观景台等多个子景点'
    ]
  },
  {
    amapId: 'seed:nanaodaqiao',
    title: '南澳大桥',
    summary: '连接南澳岛与汕头市区的跨海大桥,全长 11.08 公里,曾是国内最长跨海大桥之一。',
    address: '汕头市南澳县后宅镇—澄海区',
    location: { latitude: 23.4192, longitude: 116.9189 },
    tags: ['跨海桥', '地标'],
    weight: 75,
    highlights: [
      '全长 11.08 公里,2015 年通车,曾为国内最长跨海大桥之一',
      '主跨双索面斜拉桥,夜晚桥身灯光秀',
      '车行 15 分钟入岛,沿途海景极佳'
    ],
    bestTime: '日落前后车行通过最美;桥头观景台日落',
    duration: '15-30 分钟(含桥头停车拍照)',
    tips: [
      '桥上严禁停车,可去桥头观景平台',
      '强风天气可能临时封桥,出行前查路况'
    ]
  },
  {
    amapId: 'seed:apowan',
    title: '啊婆湾',
    summary: '小众海湾,人少景静,适合避开人潮拍空镜,礁石间常见赶海者。',
    address: '汕头市南澳县深澳镇',
    location: { latitude: 23.4495, longitude: 117.0857 },
    tags: ['小众', '海湾', '赶海'],
    weight: 70,
    highlights: [
      '深澳镇隐藏小海湾,游客极少',
      '礁石与沙滩交错,潮间带生物丰富',
      '本地人常来赶海拾螺、捡海菜'
    ],
    bestTime: '退潮前后 2 小时',
    duration: '1 ~ 2 小时',
    tips: [
      '无停车场,需把车停在村口步行进入',
      '礁石湿滑,穿防滑鞋'
    ]
  },
  {
    // 关键修正:龟埕原坐标 (23.4615,117.1295) 在青澳湾东侧,实际位于黄花山风景区内
    amapId: 'seed:guicheng',
    title: '龟埕风景区',
    summary: '黄花山森林公园内的巨石景观区,数十块花岗岩巨石形如群龟列阵,可步行栈道近观。',
    address: '汕头市南澳县后宅镇黄花山森林公园内',
    location: { latitude: 23.4083, longitude: 117.0094 },
    tags: ['礁石', '黄花山', '步道'],
    weight: 75,
    highlights: [
      '位于黄花山森林公园核心区,而非青澳湾',
      '巨石形态酷似昂首巨龟,有"千龟拜寿"奇观',
      '配套步行栈道,沿途可观赏花岗岩节理'
    ],
    bestTime: '上午 10:00-12:00 或下午 15:00-17:00',
    duration: '1 ~ 1.5 小时',
    tips: [
      '建议与七星伴月、风车长廊串联游玩',
      '巨石区夏天蛇虫较多,穿长裤运动鞋'
    ]
  },
  {
    amapId: 'seed:qixingbanyue',
    title: '七星伴月观景台',
    summary: '黄花山山脊观景平台,可同时看到七个海湾轮廓,夜晚是观星与远眺渔火的好地方。',
    address: '汕头市南澳县后宅镇黄花山顶',
    location: { latitude: 23.4061, longitude: 117.0098 },
    tags: ['观景台', '观星'],
    weight: 78,
    highlights: [
      '可同时俯瞰南澳七个海湾,故名"七星"',
      '夜晚远眺海面渔船灯火,如同星河洒落',
      '日出与日落均可,云海概率高'
    ],
    bestTime: '日出、日落、晴朗夜晚',
    duration: '30 分钟 ~ 1 小时',
    tips: [
      '山顶风大,带件外套',
      '夜晚上山注意路况,建议日落前抵达'
    ]
  },
  {
    amapId: 'seed:zoumabu',
    title: '走马埔风车阵',
    summary: '海岸线上的白色风力发电机阵列,蓝海+白机+沙滩配色,是南澳出片率最高的机位之一。',
    address: '汕头市南澳县云澳镇走马埔',
    location: { latitude: 23.4019, longitude: 117.0721 },
    tags: ['风车', '摄影'],
    weight: 82,
    highlights: [
      '近海风电场,数十台白色风机沿海岸排列',
      '蓝天 + 白机 + 草坡,简约风出片机位',
      '夕阳逆光拍剪影格外出彩'
    ],
    bestTime: '上午 9-11 点正光、傍晚逆光剪影',
    duration: '1 小时',
    tips: [
      '风机周边为风电场区域,请勿越围栏靠近',
      '海风强,无人机注意飞行安全'
    ]
  },
  {
    amapId: 'seed:xiongzhenguan',
    title: '雄镇关',
    summary: '清代关隘遗址,扼守深澳与云澳之间的山口,古道与城门保留完整,登关可眺南海。',
    address: '汕头市南澳县深澳镇与云澳镇交界',
    // 坐标采用 AMap "广东省汕头市南澳县雄镇关" 权威 POI
    location: { latitude: 23.4525, longitude: 117.0898 },
    tags: ['古迹', '城关'],
    weight: 65,
    highlights: [
      '清代海防关隘,扼守深澳-云澳古驿道',
      '城门、关墙保留完整,带"雄镇"匾额',
      '登关可远眺南海与深澳湾'
    ],
    bestTime: '上午或傍晚',
    duration: '30 分钟',
    tips: [
      '位于环岛公路旁,自驾可临时停车',
      '历史氛围浓厚,适合喜欢人文的游客'
    ]
  },
  {
    amapId: 'seed:longmenwan',
    title: '龙门湾礁石区',
    summary: '青澳湾南侧的礁石海岸,涨潮时浪涛拍岸气势磅礴,退潮时露出大片潮汐池适合赶海。',
    address: '汕头市南澳县青澳镇',
    location: { latitude: 23.4533, longitude: 117.1280 },
    tags: ['礁石', '赶海'],
    weight: 73,
    highlights: [
      '青澳湾南端礁石海岸,与沙滩区形成对比',
      '潮汐池里寄居蟹、海螺、海葵丰富',
      '涨潮时浪花拍崖适合拍长曝光'
    ],
    bestTime: '退潮前后 2 小时(查潮汐表)',
    duration: '1 ~ 1.5 小时',
    tips: [
      '礁石锋利且湿滑,务必穿防滑鞋',
      '不要踩踏潮汐池里的生物'
    ]
  },
  {
    amapId: 'seed:fengchechanglang',
    title: '风车长廊',
    summary: '黄花山脊上沿公路延伸数公里的风电机组,公路两侧白色巨叶旋转,适合自驾骑行。',
    address: '汕头市南澳县黄花山脊',
    location: { latitude: 23.4087, longitude: 117.0089 },
    tags: ['风车', '自驾', '骑行'],
    weight: 76,
    highlights: [
      '黄花山脊公路沿线绵延数公里风机',
      '公路蜿蜒,自驾骑行体验绝佳',
      '风机近距离震撼感强,声音呼啸'
    ],
    bestTime: '上午 9-11 点光线好',
    duration: '1 ~ 2 小时(含沿途停车拍照)',
    tips: [
      '山路弯急,夜间不建议骑行',
      '电动车需提前充电,山上无充电点'
    ]
  },
  {
    amapId: 'seed:longaoguicheng',
    title: '隆澳古城遗址',
    summary: '南澳岛上保存较完整的明清海防古城遗址,城墙、瓮城、海防炮台格局清晰可辨。',
    address: '汕头市南澳县后宅镇',
    location: { latitude: 23.4231, longitude: 116.9826 },
    tags: ['古城', '历史'],
    weight: 68,
    highlights: [
      '南澳总兵衙署故址之一,明代海防古城',
      '保留城墙、瓮城、炮台等海防遗迹',
      '位于后宅镇中心,可顺路造访'
    ],
    bestTime: '上午,凉爽适合徒步',
    duration: '40 分钟',
    tips: [
      '免门票开放参观',
      '与海岛风情街相距 1 公里,可步行串联'
    ]
  },
  {
    amapId: 'seed:sancongya',
    title: '三囱崖灯塔',
    summary: '南澳岛东南角雷打石海岬上的红白色灯塔,周边几乎无人工建筑,适合拍极简风海岸照。',
    address: '汕头市南澳县云澳镇东南雷打石海岬',
    // 坐标采用 AMap "广东省汕头市南澳县三囱崖灯塔" 权威 POI(seed 原坐标在岛东北端是错的)
    location: { latitude: 23.4016, longitude: 117.1414 },
    tags: ['灯塔', '极简'],
    weight: 71,
    highlights: [
      '南澳岛东南雷打石海岬礁崖灯塔,守护东南海域航道',
      '红白条纹灯塔造型经典,极简构图必拍',
      '游客极少,可独享空旷海岸'
    ],
    bestTime: '日出(凌晨 5:30 出发)',
    duration: '1 小时',
    tips: [
      '通往灯塔路况一般,建议自驾',
      '崖边无防护栏,小心安全'
    ]
  },
  {
    amapId: 'seed:haidaofengqing',
    title: '海岛风情街',
    summary: '后宅镇中心的步行街区,集中分布渔家小吃、海产干货与文创铺位,适合傍晚闲逛。',
    address: '汕头市南澳县后宅镇',
    location: { latitude: 23.4221, longitude: 116.9799 },
    tags: ['街区', '小吃', '夜逛'],
    weight: 62,
    highlights: [
      '后宅镇核心步行街,集中分布商铺与小吃',
      '海产干货、文创、咖啡馆混合业态',
      '傍晚至夜间最热闹,夜市氛围浓厚'
    ],
    bestTime: '17:00 后逛街吃饭,21:00 前后夜市最旺',
    duration: '2 ~ 3 小时',
    tips: [
      '议价时礼貌沟通,海产明码标价更稳妥',
      '紧邻民宿,步行可达,无需打车'
    ]
  }
];
