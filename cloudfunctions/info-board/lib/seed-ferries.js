/**
 * 莱长渡口(莱芜渡口 ↔ 长山尾码头)轮渡信息
 *
 * ⚠️ 数据来自"莱长渡口管理所"公开公告 + 收费公示栏(2026 年最新);
 *    停复航以公众号"莱长渡口管理所"公告为准
 *
 * 现状:自 2015 年南澳大桥通车后,自驾过桥更便捷,轮渡主要为
 *  - 想体验"海上航行"感觉的游客
 *  - 无自驾条件的背包客
 *  - 大型货车/集装箱车
 */
module.exports = [
  {
    route: '莱芜渡口 ↔ 长山尾码头',
    routeShort: '莱长渡口',
    // 日常每日 4 班(进岛 2 + 出岛 2)
    schedule: {
      toIsland: [   // 莱芜 → 长山尾(进岛)
        { departure: '09:00', sellStart: '08:40' },
        { departure: '15:00', sellStart: '14:30' }
      ],
      toMainland: [ // 长山尾 → 莱芜(出岛)
        { departure: '10:00' },
        { departure: '16:00' }
      ]
    },
    // 节假日加密班次(进岛 4 + 出岛 4),例:五一/国庆等
    holidaySchedule: {
      toIsland: [
        { departure: '09:00' },
        { departure: '11:00', isHolidayExtra: true },
        { departure: '13:00' },
        { departure: '15:00', isHolidayExtra: true }
      ],
      toMainland: [
        { departure: '10:00' },
        { departure: '12:00', isHolidayExtra: true },
        { departure: '14:00' },
        { departure: '16:00', isHolidayExtra: true }
      ]
    },
    ticketingNote: '售票时间:开航前 30 分钟,售票窗口扫码购票,当航有效',

    // 收费标准(2026 最新公告)
    prices: [
      { item: '行人', unit: '人/次',  amount: 10,  highlight: true },
      { item: '自行车', unit: '辆/次', amount: 10 },
      { item: '摩托车', unit: '辆/次', amount: 25 },
      { item: '机动三轮车', unit: '辆/次', amount: 30 },
      { item: '简易机动车、各种拖拉机', unit: '辆/次', amount: 60 },
      { item: '20 座以下客车、2 吨以下货车', unit: '辆/次', amount: 95 },
      { item: '21 座以上客车、2-10 吨货车', unit: '吨/次', amount: 35, suffix: '(按吨计)' },
      { item: '10 吨以上货车', unit: '吨/次', amount: 45, suffix: '(第 11 吨起计)' },
      { item: '20 英尺集装箱车', unit: '辆/次', amount: 500 },
      { item: '40 英尺集装箱车', unit: '辆/次', amount: 800 }
    ],
    priceNotes: [
      '每辆机动车免收一位司机客票',
      '对超长、超宽、超高车辆不得加收任何费用',
      '消防车、殡葬车和负有军事任务、训练任务的军车免收过渡费'
    ],

    // 联系方式
    contacts: [
      { name: '莱芜码头咨询',   phone: '0754-85500214' },
      { name: '长山尾码头咨询', phone: '0754-86806393' },
      { name: '渡口管理所监督', phone: '0754-85500500' },
      { name: '物价局投诉',     phone: '12358' }
    ],
    officialAccount: '莱长渡口管理所',

    // 出行提醒
    tips: [
      { title: '天气影响', content: '轮渡受大风暴雨影响极易停航。海面风力 6-7 级以上时会临时停航,出行前务必电话确认' },
      { title: '售票方式', content: '售票窗口现场扫码购票,所购票据仅当航有效,不能改签' },
      { title: '首选建议', content: '自 2015 年南澳大桥通车后,自驾或乘公交经大桥进岛更便捷,全天候通行' },
      { title: '体验玩法', content: '轮渡适合想体验"海上航行"的游客,或无自驾条件的背包客' }
    ],

    disclaimer: '班次和价格仅供参考,以渡口当日公告及"莱长渡口管理所"公众号为准'
  }
];
