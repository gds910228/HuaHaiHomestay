# TabBar 图标说明

本目录需要放置底部导航栏的图标文件。

## 需要的图标

每个 Tab 项需要两个尺寸相同的图标（选中状态和未选中状态）：

### 1. 首页 (home)
- `home.png` - 未选中状态（灰色）
- `home-active.png` - 选中状态（蓝色）
- 建议尺寸：81px × 81px
- 图标建议：房子或主页图标

### 2. 民宿 (hostel)
- `hostel.png` - 未选中状态（灰色）
- `hostel-active.png` - 选中状态（蓝色）
- 建议尺寸：81px × 81px
- 图标建议：建筑或床的图标

### 3. 我的 (user)
- `user.png` - 未选中状态（灰色）
- `user-active.png` - 选中状态（蓝色）
- 建议尺寸：81px × 81px
- 图标建议：用户头像图标

## 图标设计要求

- **格式**: PNG（支持透明背景）
- **尺寸**: 81px × 81px（推荐）或最大不超过 126kb
- **颜色**:
  - 未选中：灰色 (#666666)
  - 选中：蓝色 (#2E7DFF)
- **风格**: 简洁线性图标，符合小程序设计规范

## 临时解决方案

在添加真实图标之前，可以在 `app.json` 中移除 tabBar 配置中的 iconPath 和 selectedIconPath，只保留文字导航。

或者暂时使用纯色块作为占位图标。

## 图标资源

可以从以下网站获取图标：
- [iconfont](https://www.iconfont.cn/)
- [iconpark](https://iconpark.oceanengine.com/)
- [微信小程序设计资源](https://developers.weixin.qq.com/miniprogram/design/resources/)
