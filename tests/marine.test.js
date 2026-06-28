/**
 * tests/marine.test.js
 *
 * 零依赖测试,跑法:`node tests/marine.test.js`
 * 退出码 0 = 全通过,非 0 = 有失败
 *
 * 6 个场景:
 *  1. 晴天小风 → 四项均 ≥ 3.5
 *  2. 大风暴雨 → sailing/hike 低
 *  3. 平潮 → beach 不佳
 *  4. 大潮低潮 → beach ≥ 4
 *  5. 高温暴晒 → hike 低,photo 仍可
 *  6. 寒潮 → 整体偏低
 *  + 入参缺失 → 对应项 null
 *  + 0.5 精度
 */
const assert = require('node:assert/strict');
const { calcActivityScore } = require('../miniprogram/utils/marine');

const tests = [
  {
    name: '晴天小风 - 四项均良好',
    input: {
      weather: { text: '晴', temp: 25, windScale: 2, uvIndex: 5 },
      tide: { currentHeight: 1.2, currentTrend: 'falling' },
      hour: 10
    },
    check: (r) => {
      assert.ok(r.beach >= 3.5, `beach=${r.beach}, expect ≥3.5`);
      assert.ok(r.sailing >= 3.5, `sailing=${r.sailing}, expect ≥3.5`);
      assert.ok(r.hike >= 3.5, `hike=${r.hike}, expect ≥3.5`);
      assert.ok(r.photo >= 3.5, `photo=${r.photo}, expect ≥3.5`);
    }
  },

  {
    name: '大风暴雨 - sailing/beach 低',
    input: {
      weather: { text: '暴雨', temp: 20, windScale: 7, uvIndex: 0 },
      tide: { currentHeight: 2.0, currentTrend: 'rising' },
      hour: 14
    },
    check: (r) => {
      assert.ok(r.sailing <= 1.0, `sailing=${r.sailing}, expect ≤1.0`);
      assert.ok(r.beach <= 2.0, `beach=${r.beach}, expect ≤2.0`);
      assert.ok(r.hike <= 2.0, `hike=${r.hike}, expect ≤2.0`);
    }
  },

  {
    name: '平潮 - 赶海不佳',
    input: {
      weather: { text: '多云', temp: 26, windScale: 3, uvIndex: 6 },
      tide: { currentHeight: 2.5, currentTrend: 'slack' },
      hour: 12
    },
    check: (r) => {
      assert.ok(r.beach <= 2.5, `beach=${r.beach}, expect ≤2.5(潮太高滩涂不出露)`);
      assert.ok(r.sailing >= 3.5, `sailing=${r.sailing}`);
    }
  },

  {
    name: '大潮低潮 - 赶海最佳',
    input: {
      weather: { text: '晴', temp: 28, windScale: 3, uvIndex: 8 },
      tide: { currentHeight: 0.8, currentTrend: 'falling' },
      hour: 10
    },
    check: (r) => {
      assert.ok(r.beach >= 4.0, `beach=${r.beach}, expect ≥4.0`);
    }
  },

  {
    name: '高温暴晒 - 登山危险,摄影仍可',
    input: {
      weather: { text: '晴', temp: 36, windScale: 1, uvIndex: 12 },
      tide: { currentHeight: 1.5, currentTrend: 'rising' },
      hour: 13
    },
    check: (r) => {
      assert.ok(r.hike <= 2.0, `hike=${r.hike}, expect ≤2.0`);
      assert.ok(r.photo >= 3.0, `photo=${r.photo}, expect ≥3.0`);
    }
  },

  {
    name: '寒潮 - 整体偏低',
    input: {
      weather: { text: '多云', temp: 6, windScale: 5, uvIndex: 3 },
      tide: { currentHeight: 1.2, currentTrend: 'rising' },
      hour: 9
    },
    check: (r) => {
      assert.ok(r.hike <= 3.0, `hike=${r.hike}, expect ≤3.0`);
      assert.ok(r.sailing <= 3.0, `sailing=${r.sailing}, expect ≤3.0`);
    }
  },

  // 边界:入参缺失
  {
    name: '入参缺失 tide → beach 为 null',
    input: {
      weather: { text: '晴', temp: 25, windScale: 2 },
      tide: null,
      hour: 10
    },
    check: (r) => {
      assert.strictEqual(r.beach, null);
      // sailing/hike/photo 不依赖 tide(scorePhoto 接受 tide=null 已处理)
      assert.ok(typeof r.sailing === 'number');
      assert.ok(typeof r.hike === 'number');
    }
  },

  {
    name: '入参缺失 weather → 全部 null',
    input: { weather: null, tide: { currentHeight: 1.0 }, hour: 10 },
    check: (r) => {
      assert.strictEqual(r.beach, null);
      assert.strictEqual(r.sailing, null);
      assert.strictEqual(r.hike, null);
      assert.strictEqual(r.photo, null);
    }
  },

  // 精度
  {
    name: '所有返回值均为 0.5 精度',
    input: {
      weather: { text: '晴', temp: 25, windScale: 2, uvIndex: 5 },
      tide: { currentHeight: 1.0, currentTrend: 'falling' },
      hour: 10
    },
    check: (r) => {
      ['beach', 'sailing', 'hike', 'photo'].forEach(k => {
        if (r[k] != null) {
          assert.strictEqual(r[k] % 0.5, 0, `${k}=${r[k]} 不是 0.5 精度`);
          assert.ok(r[k] >= 0 && r[k] <= 5, `${k}=${r[k]} 超出 [0, 5]`);
        }
      });
    }
  },

  // 日出加分
  {
    name: '日出时段 photo 加分',
    input: {
      weather: { text: '晴', temp: 22, windScale: 2, uvIndex: 3 },
      tide: { currentHeight: 1.2, currentTrend: 'falling' },
      hour: 6  // 日出时段
    },
    check: (r) => {
      // 基础 4 + 日出 1 + 退潮 0.5 = 5.5 → clamp 5
      assert.ok(r.photo >= 5.0, `photo=${r.photo}, expect 5.0(日出+退潮加分顶满)`);
    }
  }
];

let pass = 0;
let fail = 0;
const failures = [];

for (const t of tests) {
  try {
    const r = calcActivityScore(t.input.weather, t.input.tide, t.input.hour);
    t.check(r);
    console.log('  ✓', t.name);
    pass++;
  } catch (e) {
    console.error('  ✗', t.name);
    console.error('    └', e.message);
    failures.push({ name: t.name, error: e.message });
    fail++;
  }
}

console.log('');
console.log(`──────────────────────────────────────────`);
console.log(`  ${pass}/${tests.length} passed${fail > 0 ? `, ${fail} failed` : ''}`);
console.log(`──────────────────────────────────────────`);

if (fail > 0) {
  console.log('\nFailures:');
  failures.forEach(f => console.log(`  - ${f.name}: ${f.error}`));
}

process.exit(fail === 0 ? 0 : 1);
