# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**HuaHai Homestay (画海民宿)** is a WeChat Mini Program for a homestay business on Nanao Island (南澳岛), China. It is a digital platform combining travel guides (景点打卡/美食推荐/南澳玩法/实用信息), accommodation information (民宿与房型), and a password-gated admin content management system.

**Status:** Production codebase in active development (54+ commits). The original template (quickstartFunctions demo) has been fully replaced with real business logic.

**Technology Stack:**
- Frontend: WeChat Mini Program native development (WXML + WXSS + JavaScript, Canvas 2D for tide chart)
- Backend: WeChat Cloud Development (云开发) - Serverless architecture
  - Cloud Functions (云函数) - 5 functions, all single-entry `event.type` switch routing
  - Cloud Database (云数据库) - NoSQL JSON document database - 7 collections
  - Cloud Storage (云存储) - File storage with CDN
- Third-party services: AMap (POI/route planning), QWeather, 大鱼潮汐表/WorldTides (tide data)
- Design system: `design-system/MASTER.md` is the single source of truth for tokens,落地在 `miniprogram/app.wxss`

## Development Environment

### IDE and Tools
- **Primary IDE:** WeChat Developer Tools (微信开发者工具)
- **Project Root:** `miniprogram/` (set as miniprogram root in IDE)
- **Cloud Function Root:** `cloudfunctions/`
- **AppID:** `wx85725014dc402519`
- **Cloud Env ID:** `cloudbase-8gnkfn465b833816` (in `miniprogram/app.js` globalData)

### Running the Project
1. Open project in WeChat Developer Tools
2. Ensure cloud development is enabled in the IDE
3. Set `miniprogram/` as the miniprogram root directory
4. Set `cloudfunctions/` as the cloud function root directory
5. Cloud env ID is already configured in `miniprogram/app.js`

### Cloud Function Deployment
- **Manual:** Right-click cloud function folder -> "上传并部署-云端安装依赖" (Upload and Deploy: Cloud Install Dependencies)
- **CLI Script:** `uploadCloudFunction.sh` - Template script for deploying via command line
- **After deploy MUST verify:** check cloud logs for startup errors, call the event.type from frontend, and confirm triggers (if any) are active in console — deploy ≠ effective

### Linting
ESLint is configured (`.eslintrc.js`) for WeChat Mini Program globals (wx, App, Page, Component, etc.).

## Architecture

### Directory Structure
```
HuaHaiHomestay/
├── miniprogram/              # Frontend Mini Program code
│   ├── pages/               # 19 registered pages (home/hostel/user + guides/food/route/info/spot/admin/*)
│   ├── components/          # 5 display-only components (unified-card/optimized-image/empty-state/loading-state/skeleton-card)
│   ├── utils/               # Pure function modules (marine.js activity scoring, tide-chart.js canvas drawing)
│   ├── images/             # Image assets
│   ├── app.js              # Entry & cloud init; globalData only has env ID (no business state)
│   ├── app.json            # App config (pages, tabBar with 3 tabs: 首页/画海/我的)
│   └── app.wxss            # Global styles (design system tokens landed here)
├── cloudfunctions/         # Backend cloud functions (all single-entry event.type switch routing)
│   ├── huahai/             # Main BFF (26 types: guides/favorites/hostel/admin/storage-cleanup)
│   ├── info-board/         # Info dashboard backend (weather/tide/ferries/emergency, lib/ has 14 modules)
│   ├── init-database/      # DB initialization (password-gated, has seed data)
│   ├── route-plan/         # AMap route planning (async-triggered by huahai adminSaveGuide)
│   └── spot-sync/          # Spot weather/walking-time sync (has 2 cron triggers in config.json)
├── design-system/          # MASTER.md - design token single source of truth
├── .harness/               # Harness engineering assets (agents/rules/skills/changes/mcp)
├── wiki/                   # Business knowledge base (to be filled)
├── docs/                   # Local docs (gitignored, includes Harness SOP)
├── historyinfo/            # Raw room photo assets (gitignored)
├── tests/                  # Unit tests (marine.test.js)
└── project.config.json     # WeChat Tools project configuration
```

### Architecture Pattern
- **Serverless:** No traditional server - uses WeChat Cloud Development
- **Component-Based UI:** Pages use WXML templates with separate JS logic and WXSS styles
- **Cloud Function Routing:** ALL 5 cloud functions use single-entry `event.type` switch routing (not one-function-per-file)
- **Content Model Unification:** `guides` collection stores 4 content types (food/route/spot/info) distinguished by `category` field — NOT one collection per type
- **Event-Driven:** Uses WeChat's event system (bindtap, bindinput, observers)
- **State Minimal:** `globalData` holds only env ID; business state lives in page `data` or cloud functions

### Data Flow
1. Frontend calls cloud function via `wx.cloud.callFunction()`
2. Cloud function routes logic based on `event.type` parameter (switch-case)
3. Cloud function interacts with database/storage via `wx-server-sdk`
4. Result returned to frontend as `{ success: boolean, data? | errMsg? }`

### Cloud Database Collections (7)
- `guides` - Unified content (category: food/route/spot/info; has geoLocation as db.Geo.Point with geo index)
- `hostel` - Single homestay info record
- `rooms` - Room types (price: fixedPrice integer in 元, or legacy price{low,high})
- `favorites` - User favorites (openid, guideId, category)
- `ferries` - Ferry schedules
- `emergency_pois` - Emergency POIs
- `tides_cache` - Tide cache (indexed by date)

## Code Conventions

### File Structure (Pages/Components)
Each page/component has 4 files:
- `.js` - Logic and data
- `.json` - Configuration
- `.wxml` - Template (similar to HTML)
- `.wxss` - Styles (similar to CSS)

### Page Pattern
```javascript
Page({
  data: { /* state */ },
  onLoad(options) { /* init */ },
  [EventHandlers]() { /* user interactions */ }
})
```

### Component Pattern
```javascript
Component({
  properties: { /* props */ },
  data: { /* state */ },
  observers: { /* computed/watch */ },
  methods: { /* functions */ }
})
```
Components are display-only (no direct cloud function calls); business logic stays in pages.

### Cloud Function Pattern
- Single entry point with type-based routing (switch statement on `event.type`)
- Complex logic split into `lib/<module>.js`; index.js only does routing + param validation + auth
- Use `wx-server-sdk` for database/storage operations
- Return structured responses: `{ success: boolean, data?/errMsg? }`
- Aggregate endpoints (e.g. info-board `all`) use `Promise.allSettled` (partial failure tolerated)

### Naming Conventions
- Variables/functions: camelCase (e.g. `getNearbySpots`)
- Components: PascalCase directory (e.g. `UnifiedCard`)
- Pages: kebab-case directory (e.g. `guide-detail`)
- Collections: lowercase + underscore (e.g. `emergency_pois`)
- Document fields: camelCase (e.g. `createTime`)
- Cloud function event.type: camelCase (e.g. `getGuideDetail`)

### State Management
- Page state via `this.setData()`
- Parent-child communication via properties and events
- `globalData` holds ONLY env ID — do NOT put business state there

### UI Patterns
- Conditional rendering: `wx:if`, `wx:for`, `wx:key`
- Event binding: `bindtap`, `bindinput`, `catchtap`
- Data binding: `{{variable}}`, `{{item.property}}`
- Rich text: `<rich-text nodes="..."/>` (note: `cloud://` image links expire in 2h, need `refreshContentImages` to re-sign via getTempFileURL)

## Critical Constraints (Hard Rules — see .harness/rules/项目编码规范.md for full list)

Each rule corresponds to a past lesson. Violating these causes real bugs/rejections:

1. **Price field:** Use `fixedPrice` (元 as integer, e.g. 538), compat legacy `price{low,high}`; sort must handle both: `x.fixedPrice ?? (x.price && x.price.low) ?? 0`
2. **Location:** Use `wx.getFuzzyLocation` (NOT `wx.getLocation`) — project category restricts getLocation; declare `scope.userFuzzyLocation`
3. **Collection creation:** `db.add` does NOT auto-create collections — must `ensureCollection(db, name)` (catch errCode -502002 if exists)
4. **Secrets:** Admin password via cloud function env var `ADMIN_PASSWORD` (constant-time compare); third-party keys (AMAP_KEY/QWEATHER_KEY/WORLDTIDES_KEY) also via env var — NEVER hardcode (repo is public)
5. **Rich text images:** `cloud://` links expire in 2h — detail pages must `refreshContentImages` before render
6. **Cloud storage cleanup:** No listFiles API — orphan cleanup via "console export + cloud function diff" (see huahai scanGuideImages/computeOrphans/cleanupFiles)
7. **Cron triggers:** Must be written into `config.json` triggers field, NOT only configured in cloud console — code `event.Type === 'Timer'` branches must match config.json 1:1 (info-board has drift risk here)
8. **Audit compliance:** User-facing copy must NOT use "游玩路线/旅行社/预订/下单/支付" (travel-agency/transaction terms trigger rejection); route category shown as "南澳玩法/玩法" externally, code identifier stays `route`
9. **Time fields:** `createTime`/`updateTime` via `db.serverDate()` (cloud side), NOT local `new Date()`
10. **DB schema changes:** Never assume old docs have new fields — use `??` fallback; add seed/migration in `init-database` first

## Product Requirements (PRD)

PRD document: `docs/bak/画海民宿小程序 - 产品需求文档(PRD).md` (gitignored, local only).

### Features (implemented)
1. **Homepage** - 4 category entry cards (景点/美食/南澳玩法/实用信息)
2. **Guides** - food/route/spot/info unified in `guides` collection; list/detail/favorites/views
3. **Homestay** - hostel info + room types (tabBar page "画海")
4. **Info Dashboard** - weather + activity score + tide chart (Canvas) + ferries + emergency POIs, 24h local cache
5. **User Center** - favorites (tabBar page "我的")
6. **Admin System** - password-gated CRUD for guides/hostel/rooms (rich text + image list)
7. **Data Sync** - spot-sync (weather/walking times), route-plan (AMap), info-board (tide prewarm), orphan file cleanup

## WeChat API Usage

Key WeChat APIs used in this project:
- `wx.cloud` - Cloud development SDK
- `wx.cloud.callFunction()` - Call cloud functions
- `wx.cloud.uploadFile()` - Upload to cloud storage
- `wx.cloud.init()` - Initialize cloud environment
- `wx.getFuzzyLocation()` - Fuzzy location (NOT getLocation — category restricted)
- `wx.chooseMedia()` - Image selection
- `wx.showModal()` - Alert dialogs
- `wx.navigateTo()` - Page navigation
- `wx.setClipboardData()` - Copy to clipboard
- Canvas 2D - tide chart drawing (`utils/tide-chart.js`)

## Dependencies

### Backend (cloudfunctions/*/package.json)
- **`wx-server-sdk` (~2.4.0)** - WeChat Cloud Server SDK for database, storage, and OpenAPI operations
- Each cloud function has its own package.json

### Frontend
- No package.json - uses WeChat native APIs directly

## Configuration Files

| File | Purpose |
|------|---------|
| `project.config.json` | WeChat Developer Tools project settings (appid, paths, compiler options) |
| `project.private.config.json` | Private overrides, local settings (compileHotReLoad, urlCheck, libVersion) |
| `miniprogram/app.json` | Mini Program manifest: 19 pages, navigation bar styles, tabBar (3 tabs), permissions (userFuzzyLocation) |
| `miniprogram/app.js` | Application lifecycle, cloud init, globalData (env ID only) |
| `miniprogram/sitemap.json` | SEO indexing rules |
| `design-system/MASTER.md` | Design system single source of truth (tokens) |
| `.eslintrc.js` | ESLint configuration for WeChat Mini Program globals |
| `cloudfunctions/*/config.json` | Cloud function permissions + cron triggers (spot-sync has 2) |
| `cloudfunctions/*/package.json` | Cloud function dependencies |

## Important Notes

- **Cloud Env ID:** Configured in `miniprogram/app.js` globalData (`cloudbase-8gnkfn465b833816`)
- **TabBar:** 3 tabs configured — 首页 (home) / 画海 (hostel) / 我的 (user)
- **Cloud Functions:** 5 functions, all single-entry event.type routing; deploy via WeChat Tools
- **Images:** Static assets in `miniprogram/images/`; dynamic content via cloud storage (note 2h expiry on cloud:// links)
- **Documentation:** PRD and dev docs are gitignored in `docs/bak/`; Harness SOP at `docs/Harness 落地设计 SOP.md`
- **Gitignored dirs:** `docs/`, `historyinfo/`, `.claude/` (local-only; do NOT put shared rules there — use `.harness/`)

---

## ▎ Harness 体系（.harness/）
▎
▎ 本项目已落地 Harness 工程化体系（SOP 见 docs/Harness 落地设计 SOP.md）：
▎ - 开发任何需求前，先读
▎ .harness/agents/application-owner.md（调度大脑），按十阶段流程执行。
▎ - L1 常驻：.harness/rules/ 三份 + verification-before-completion 铁律。
▎ - L2 阶段触发：.harness/skills/ 对应 skill。
▎ - L3 按需查询：wiki/ 业务知识库 + .harness/mcp/ 外部能力。
▎ - 变更管理：每个需求复制 .harness/changes/_template/ 为变更目录，summary.md 是全流程追溯唯一真源。
▎ - 8 个 superpowers skill（brainstorming/writing-plans/executing-plans/test-driven-development/verification-before-completion/requesting-code-review/receiving-code-review/writing-skills）不被 Claude Code 原生加载，需由 application-owner agent 在十阶段流程中显式 Read SKILL.md 调度。
</content>
