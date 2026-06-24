# 画海民宿 · Design System MASTER

> **真源 (Single Source of Truth)** —— 建任何新页面/组件前先读此文件。修改 token 也只能改这里 + `miniprogram/app.wxss`。
> **主题:** 海岛暖光 · 沙岸 (Island Warm Light · Sand Beach)
> **品牌定位:** 南澳岛精品民宿 + 海岛旅行攻略平台

---

## 1. 调色板 (Color Palette)

### 1.1 品牌基础色

| 角色 | Hex | Token | 使用 |
|---|---|---|---|
| Background | `#FBF7F0` | `--bg-canvas` | 页面底色 |
| Surface | `#FFFFFF` | `--bg-surface` | 卡片底色 |
| Surface Muted | `#F4EFE6` | `--bg-muted` | 输入框/区段 |
| Surface Muted Strong | `#ECE4D3` | `--bg-muted-strong` | 强调底色 |
| Brand Primary | `#1E5266` | `--brand-primary` | 主色 · 深海青 |
| Brand Primary Strong | `#0F3848` | `--brand-primary-strong` | 按下/标题强调 |
| Brand Primary Soft | `#DCE9EE` | `--brand-primary-soft` | 主色 Tag 背景 |
| Brand Accent | `#E8916D` | `--brand-accent` | 强调色 · 落日珊瑚 |
| Brand Accent Strong | `#C76F4E` | `--brand-accent-strong` | 强调按下 |
| Brand Accent Soft | `#FBEBE0` | `--brand-accent-soft` | 强调 Tag 背景 |

### 1.2 文本色

| 角色 | Hex | Token |
|---|---|---|
| Primary (墨黑) | `#2A2520` | `--text-primary` |
| Secondary (烟褐) | `#6B6359` | `--text-secondary` |
| Tertiary (沙岩) | `#A39A8D` | `--text-tertiary` |
| Placeholder | `#C7BFB1` | `--text-placeholder` |
| White | `#FFFFFF` | `--text-white` |

### 1.3 类目色系 (沙岸家族)

四个类目色全部来自同一温度家族,放一起有连贯的"沙岸"调性。

| 类目 | 主色 | Soft | Token |
|---|---|---|---|
| 景点 | `#1E5266` 深海青 | `#DCE9EE` | `--cat-spot` / `--cat-spot-soft` |
| 美食 | `#C75B39` 朱砂 | `#F8E2D5` | `--cat-food` / `--cat-food-soft` |
| 路线 | `#3E7A6E` 海藻青 | `#DDE9E5` | `--cat-route` / `--cat-route-soft` |
| 信息 | `#8B6F3F` 沙金棕 | `#EFE6D2` | `--cat-info` / `--cat-info-soft` |

### 1.4 功能色

| 角色 | Hex | Soft | Token |
|---|---|---|---|
| Success | `#5B8C5A` | `#E2EBE0` | `--color-success` |
| Warning | `#D6A23E` | `#F4EBD2` | `--color-warning` |
| Danger | `#C75B4E` | `#F4D8D3` | `--color-danger` |

### 1.5 线条

| 角色 | Hex | Token |
|---|---|---|
| Border | `#EDE4D3` | `--border-line` |
| Border Strong | `#DDD2BC` | `--border-line-strong` |
| Divider | `#F1EAD9` | `--divider-color` |

---

## 2. 字体系统 (Typography)

- **标题** PingFang SC,字重 600/700,Hero 大标题 `letter-spacing: -0.5rpx`
- **正文** PingFang SC,字重 400,行高 1.6
- **数字** `font-variant-numeric: tabular-nums` (`.tabular-nums`),用在价格/计数/编号
- 整张小程序保留原生中文字体栈

字号阶梯:`22 / 24 / 28 / 32 / 36 / 40 / 48 / 56` rpx

---

## 3. 形态 (Shape)

### 3.1 圆角

| Token | Value | 用途 |
|---|---|---|
| `--radius-sm` | `8rpx` | 微小元素 |
| `--radius-md` | `12rpx` | Tag, 小按钮, Input |
| `--radius-lg` | `20rpx` | 中卡 |
| `--radius-xl` | `24rpx` | **Bento 大卡 (默认)** |
| `--radius-2xl` | `32rpx` | Hero 容器, Sheet |
| `--radius-3xl` | `40rpx` | 顶部沉浸 Sheet |
| `--radius-pill` | `9999rpx` | 按钮/Pill |
| `--radius-round` | `50%` | 头像/FAB |

### 3.2 阴影 (暖灰投影)

```
--shadow-xs:     0 1rpx 4rpx rgba(94, 72, 50, 0.03)
--shadow-sm:     0 2rpx 8rpx rgba(94, 72, 50, 0.04)
--shadow-md:     0 4rpx 16rpx rgba(94, 72, 50, 0.06)   ← 卡片默认
--shadow-lg:     0 12rpx 28rpx rgba(94, 72, 50, 0.08)
--shadow-xl:     0 20rpx 40rpx rgba(94, 72, 50, 0.10)
--shadow-brand:  0 8rpx 20rpx rgba(30, 82, 102, 0.18)  ← 主按钮
--shadow-accent: 0 8rpx 20rpx rgba(232, 145, 109, 0.22) ← 强调按钮
```

---

## 4. 间距 (Spacing)

| Token | Value |
|---|---|
| `--space-xs` | `8rpx` |
| `--space-sm` | `12rpx` |
| `--space-md` | `16rpx` |
| `--space-lg` | `24rpx` |
| `--space-xl` | `32rpx` |
| `--space-2xl` | `48rpx` |
| `--space-3xl` | `64rpx` |

---

## 5. Bento Grid 布局 (核心语言)

每个内容页面的主体都用 `.bento-grid` 容器 + `.bento-item` 卡片,大小通过宽度 modifier 控制:

```html
<view class="bento-grid">
  <view class="bento-item bento-2">  <!-- 100% 宽 -->
  <view class="bento-item bento-1">  <!-- 50% 宽 -->
  <view class="bento-item bento-1">
  <view class="bento-item bento-3">  <!-- 33% 宽 -->
</view>
```

- 卡片间距 `gap: var(--space-lg)` (24rpx)
- 卡片默认 `padding: var(--space-lg)` (24rpx)
- 卡片圆角 `--radius-xl` (24rpx)
- 卡片阴影 `--shadow-md` (暖灰)

---

## 6. 组件规范

### 6.1 按钮 (`.btn-*`)

| 类 | 形态 | 用途 |
|---|---|---|
| `.btn-primary` | 实色深海青底 + 白字 + 圆角 pill + brand 阴影 | 主 CTA |
| `.btn-accent` | 实色珊瑚底 + 白字 + 圆角 pill + accent 阴影 | 高强调 CTA (预订/确认下单) |
| `.btn-secondary` | 白底 + 深海青字 + 深海青描边 | 副 CTA |
| `.btn-ghost` | 暖灰底 + 墨黑字 | 弱 CTA |

按下:`scale(0.97)` + 加深底色,150ms `ease-out`。

### 6.2 Tag / Pill

`.tag` 基础类(暖灰底+次文本),通过 modifier 切换语义:
`.tag-brand` (深海青) / `.tag-accent` (珊瑚) / `.tag-success` / `.tag-warning` / `.tag-danger` / `.tag-spot/food/route/info`

### 6.3 Hero 标题区 (`.hero-band`)

```html
<view class="hero-band hero-band-food">
  <view class="hero-eyebrow">FOOD · 美食推荐</view>
  <view class="hero-title">南澳味道</view>
  <view class="hero-subtitle">海岛人家的一桌一椅</view>
</view>
```

每个类目页用对应类目色:`.hero-band-spot / -food / -route / -info`

---

## 7. 图标策略

- **绝不使用 emoji** 作为结构性 UI 图标。允许出现在用户输入/正文内容内
- 优先使用项目已有 SVG (`miniprogram/images/icons/*.svg`),如果不存在则用 inline SVG via `<image src="data:image/svg+xml;utf8,...">`
- 线性图标 stroke `2rpx`,色用 `--text-secondary` 默认 / `--brand-primary` 选中
- 触控目标最小 88rpx × 88rpx (≥44pt)

---

## 8. 动效

- 卡片按下 `scale(0.97)` + 阴影减小, 150ms `--ease-out`
- 列表项进入 `.fade-in-up` + 50ms stagger
- Tab 切换下划线 200ms `--ease-default`
- 尊重 `prefers-reduced-motion`(已在 app.wxss 配置 fallback)

---

## 9. 反 Pattern (禁止)

- ❌ 任何 `linear-gradient(blue → light blue)` 蓝色渐变作为 Hero 背景
- ❌ 任何 `#2E7DFF / #4FC3F7 / #1976D2` 蓝色硬编码
- ❌ 任何 emoji UI 图标 (`🏠 📍 ⭐ 📞 ▼` etc.)
- ❌ 每个页面的导航条颜色都不同(必须 `#FBF7F0` 暖米统一)
- ❌ 多个类目色混搭 (饱和度/色相差距过大),必须从沙岸家族里选
- ❌ 在组件内直接写 hex 颜色(必须 var(--brand-*))

---

## 10. 落地清单 (每次写新页面对照)

- [ ] 页面底色 `--bg-canvas` 而非纯白
- [ ] 主要内容用 `.bento-grid` + `.bento-item`,圆角 24rpx,暖灰阴影
- [ ] 主 CTA 用 `.btn-primary` 深海青;高强调用 `.btn-accent` 珊瑚
- [ ] Tag 用 `.tag` + 语义 modifier,不写裸色
- [ ] 图标全 SVG,无 emoji
- [ ] 按下交互 scale(0.97),≥88rpx 触控区
- [ ] 文字层级 `--text-primary / -secondary / -tertiary` 三档
- [ ] 数字/价格加 `.tabular-nums`
- [ ] 类目相关页用对应 `--cat-*` 色,不偏离家族
