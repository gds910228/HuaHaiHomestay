/**
 * 渡轮班次 seed 数据
 *
 * 当前仅一条:莱芜港 ↔ 南澳港(澄海莱芜 → 南澳后宅,海上轮渡,有了南澳大桥后大部分游客已走桥,
 *           轮渡留作备用 / 大桥拥堵替代 / 装载大件物资。班次相对稀疏)
 *
 * ⚠️ 时刻表数据来自网络公开整理,实际以现场公告为准。本数据集仅供参考用途。
 *
 * 后续若新增更多航线(汕头主港 → 南澳青澳湾游艇等),按相同结构追加即可。
 */
module.exports = [
  {
    route: '莱芜港 ↔ 南澳港',
    schedule: [
      // 工作日时刻(参考)
      { departure: '07:00', arrival: '07:40', type: 'regular', direction: 'to-island' },
      { departure: '08:30', arrival: '09:10', type: 'regular', direction: 'to-island' },
      { departure: '10:00', arrival: '10:40', type: 'regular', direction: 'to-island' },
      { departure: '11:30', arrival: '12:10', type: 'regular', direction: 'to-island' },
      { departure: '13:30', arrival: '14:10', type: 'regular', direction: 'to-island' },
      { departure: '15:00', arrival: '15:40', type: 'regular', direction: 'to-island' },
      { departure: '16:30', arrival: '17:10', type: 'regular', direction: 'to-island' },
      { departure: '18:00', arrival: '18:40', type: 'regular', direction: 'to-island' }
    ],
    holidaySchedule: [
      // 周末 / 节假日加密班次(参考)
      { departure: '06:30', arrival: '07:10', type: 'holiday', direction: 'to-island' },
      { departure: '07:30', arrival: '08:10', type: 'holiday', direction: 'to-island' },
      { departure: '08:30', arrival: '09:10', type: 'holiday', direction: 'to-island' },
      { departure: '09:30', arrival: '10:10', type: 'holiday', direction: 'to-island' },
      { departure: '10:30', arrival: '11:10', type: 'holiday', direction: 'to-island' },
      { departure: '11:30', arrival: '12:10', type: 'holiday', direction: 'to-island' },
      { departure: '13:00', arrival: '13:40', type: 'holiday', direction: 'to-island' },
      { departure: '14:00', arrival: '14:40', type: 'holiday', direction: 'to-island' },
      { departure: '15:00', arrival: '15:40', type: 'holiday', direction: 'to-island' },
      { departure: '16:00', arrival: '16:40', type: 'holiday', direction: 'to-island' },
      { departure: '17:00', arrival: '17:40', type: 'holiday', direction: 'to-island' },
      { departure: '18:00', arrival: '18:40', type: 'holiday', direction: 'to-island' },
      { departure: '19:30', arrival: '20:10', type: 'holiday', direction: 'to-island' }
    ],
    disclaimer: '班次仅供参考,以码头当日公告为准。台风、雷暴等极端天气可能临时停航,出发前请电话确认 (0754) 86801120。建议提前到码头购票。'
  }
];
