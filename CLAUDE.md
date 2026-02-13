# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**HuaHai Homestay (画海民宿)** is a WeChat Mini Program for a homestay business on Nanao Island (南澳岛), China. It serves as a digital platform combining travel guides, accommodation information, and content management.

**Status:** Template codebase - WeChat Cloud Development quickstart that needs to be customized into the actual homestay platform.

**Technology Stack:**
- Frontend: WeChat Mini Program native development (WXML + WXSS + JavaScript)
- Backend: WeChat Cloud Development (云开发) - Serverless architecture
  - Cloud Functions (云函数)
  - Cloud Database (云数据库) - NoSQL JSON document database
  - Cloud Storage (云存储) - File storage with CDN

## Development Environment

### IDE and Tools
- **Primary IDE:** WeChat Developer Tools (微信开发者工具)
- **Project Root:** `miniprogram/` (set as miniprogram root in IDE)
- **Cloud Function Root:** `cloudfunctions/`
- **AppID:** `wx85725014dc402519`

### Initial Setup Required
Before development, configure the cloud environment ID in `miniprogram/app.js` (line 8).

### Running the Project
1. Open project in WeChat Developer Tools
2. Ensure cloud development is enabled in the IDE
3. Set `miniprogram/` as the miniprogram root directory
4. Set `cloudfunctions/` as the cloud function root directory
5. Configure the environment ID in `miniprogram/app.js`

### Cloud Function Deployment
- **Manual:** Right-click cloud function folder → "上传并部署-云端安装依赖" (Upload and Deploy: Cloud Install Dependencies)
- **CLI Script:** `uploadCloudFunction.sh` - Template script for deploying via command line

### Linting
ESLint is configured (`.eslintrc.js`) for WeChat Mini Program globals (wx, App, Page, Component, etc.).

## Architecture

### Directory Structure
```
HuaHaiHomestay/
├── miniprogram/              # Frontend Mini Program code
│   ├── pages/               # Page components (index, example)
│   ├── components/          # Reusable components (cloudTipModal)
│   ├── images/             # Image assets
│   ├── app.js              # Application entry point & cloud init
│   ├── app.json            # App configuration (pages, tabBar, styles)
│   ├── app.wxss            # Global styles
│   └── envList.js          # Environment configuration (placeholder)
├── cloudfunctions/         # Backend cloud functions
│   └── quickstartFunctions/ # Demo cloud function with type-based routing
│       ├── index.js         # Function logic with switch-case routing
│       ├── package.json      # Dependencies (wx-server-sdk)
│       └── config.json     # Permissions config
└── project.config.json      # WeChat Tools project configuration
```

### Architecture Pattern
- **Serverless:** No traditional server - uses WeChat Cloud Development
- **Component-Based UI:** Pages use WXML templates with separate JS logic and WXSS styles
- **Cloud Function Routing:** Single cloud function with type-based routing via `event.type` parameter
- **Event-Driven:** Uses WeChat's event system (bindtap, bindinput, observers)

### Data Flow
1. Frontend calls cloud function via `wx.cloud.callFunction()`
2. Cloud function executes logic based on `event.type` parameter
3. Cloud function interacts with database/storage via `wx-server-sdk`
4. Result returned to frontend for display

## Code Conventions

### File Structure (Pages/Components)
Each page/component has 4 files:
- `.js` - Logic and data
- `.json` - Configuration
- `.wxml` - Template (similar to HTML)
- `.wxss` - Styles (similar to CSS)

### Component Pattern
```javascript
Component({
  properties: { /* props */ },
  data: { /* state */ },
  observers: { /* computed/watch */ },
  methods: { /* functions */ }
})
```

### Page Pattern
```javascript
Page({
  data: { /* state */ },
  onLoad(options) { /* init */ },
  [EventHandlers]() { /* user interactions */ }
})
```

### Cloud Function Pattern
- Single entry point with type-based routing (switch statement on `event.type`)
- Helper functions for each operation
- Use `wx-server-sdk` for database/storage operations
- Return structured responses: `{ success: boolean, data/errMsg: any }`

### Naming Conventions
- camelCase for variables and functions
- PascalCase for components
- Files named after their primary function

### State Management
- Component state via `this.setData()`
- Parent-child communication via properties and events
- Global state in `app.js` (`getApp().globalData`)

### UI Patterns
- Rich text for code display: `<rich-text nodes="<pre>...</pre>"/>`
- Conditional rendering: `wx:if`, `wx:for`, `wx:key`
- Event binding: `bindtap`, `bindinput`, `catchtap`
- Data binding: `{{variable}}`, `{{item.property}}`

## Product Requirements (PRD)

The project has a comprehensive PRD document (`画海民宿小程序 - 产品需求文档(PRD).md`) outlining:

### MVP Features
1. **Homepage - Travel Guides (景点打卡, 美食推荐, 游玩路线, 实用信息)**
2. **Homestay Info** (photo gallery, room types, facilities, booking)
3. **User Center** (favorites, history, customer service)
4. **Admin System** (content management, image management, analytics)

### Database Schema (to be implemented)
- `guides` - Travel guide content (category, tags, location, views, likes)
- `hostel` - Homestay information (name, address, contact, albums, facilities)
- `rooms` - Room types (images, description, area, price, tags)
- `favorites` - User favorites (openid, guideId, createTime)

### Planned Features (V2)
- Social interaction features
- Online booking system
- AI intelligent assistant (using 混元AI with 100M token quota)

## WeChat API Usage

Key WeChat APIs used in this project:
- `wx.cloud` - Cloud development SDK
- `wx.cloud.callFunction()` - Call cloud functions
- `wx.cloud.uploadFile()` - Upload to cloud storage
- `wx.cloud.init()` - Initialize cloud environment
- `wx.chooseMedia()` - Image selection
- `wx.showModal()` - Alert dialogs
- `wx.navigateTo()` - Page navigation
- `wx.setClipboardData()` - Copy to clipboard

## Dependencies

### Backend (cloudfunctions/quickstartFunctions/package.json)
- **`wx-server-sdk` (~2.4.0)** - WeChat Cloud Server SDK for database, storage, and OpenAPI operations

### Frontend
- No package.json - uses WeChat native APIs directly

## Configuration Files

| File | Purpose |
|------|---------|
| `project.config.json` | WeChat Developer Tools project settings (appid, paths, compiler options) |
| `project.private.config.json` | Private overrides, local settings (compileHotReLoad, urlCheck, libVersion) |
| `miniprogram/app.json` | Mini Program manifest: pages, navigation bar styles, tabBar |
| `miniprogram/app.js` | Application lifecycle, cloud initialization, global data (env ID) |
| `miniprogram/sitemap.json` | SEO indexing rules |
| `.eslintrc.js` | ESLint configuration for WeChat Mini Program globals |
| `cloudfunctions/*/config.json` | Cloud function permissions |
| `cloudfunctions/*/package.json` | Cloud function dependencies |

## Important Notes

- **Environment ID:** Must be configured in `miniprogram/app.js` before cloud functions work
- **Tab Bar:** Not currently configured - will need to be added for navigation (首页/民宿/我的)
- **Cloud Functions:** Currently only has demo function `quickstartFunctions` - needs to be replaced with actual business logic
- **Images:** Store in `miniprogram/images/` for frontend assets, use cloud storage for dynamic content
- **Documentation:** Refer to `画海民宿小程序 - 产品需求文档(PRD).md` for detailed product requirements
