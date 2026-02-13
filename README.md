# 画海民宿小程序 🌊

南澳岛画海民宿的微信小程序，为游客提供旅游攻略、民宿信息和预订服务。

## 项目简介

画海民宿小程序是一个基于微信云开发的旅游服务小程序，主要功能包括：
- 📝 旅游攻略展示（美食推荐、游玩路线、景点打卡、实用信息）
- 🏠 民宿信息展示（相册、房型、设施服务）
- 👤 用户中心（收藏、浏览历史）
- ⚙️ 管理后台（内容管理）

## 技术栈

- **前端**: 微信小程序原生开发（WXML + WXSS + JavaScript）
- **后端**: 微信云开发（云函数 + 云数据库 + 云存储）
- **环境**: cloudbase-8gnkfn465b833816

## 快速开始

### 1. 准备工作

- 安装[微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)
- 注册微信小程序并获取 AppID
- 开通微信云开发服务

### 2. 项目配置

1. 克隆或下载项目代码
2. 用微信开发者工具打开项目
3. 设置 `miniprogram/` 为小程序根目录
4. 设置 `cloudfunctions/` 为云函数根目录
5. 云环境 ID 已配置为 `cloudbase-8gnkfn465b833816`

### 3. 数据库设置

参考 [DATABASE.md](./DATABASE.md) 文档：
1. 在云开发控制台创建数据库集合（guides, hostel, rooms, favorites）
2. 添加初始数据
3. 设置集合权限

### 4. 部署云函数

右键点击 `cloudfunctions/huahai` 文件夹，选择「上传并部署：云端安装依赖」

### 5. 运行项目

点击微信开发者工具的「编译」按钮即可在模拟器中预览

**📚 首次使用？** 查看 [QUICK_START.md](./QUICK_START.md) 快速开始指南

## 项目结构

```
HuaHaiHomestay/
├── miniprogram/              # 小程序前端代码
│   ├── pages/               # 页面
│   │   ├── home/           # 首页（攻略推荐）
│   │   ├── guide-detail/   # 攻略详情
│   │   ├── hostel/         # 民宿介绍
│   │   ├── user/           # 个人中心
│   │   └── admin/          # 管理后台
│   ├── images/             # 图片资源
│   ├── app.js              # 应用入口
│   ├── app.json            # 应用配置
│   └── app.wxss            # 全局样式
├── cloudfunctions/         # 云函数
│   └── huahai/            # 主业务云函数
├── DATABASE.md            # 数据库设置指南
└── README.md              # 项目说明
```

## 主要功能

### 用户端
- **首页攻略**: 分类展示南澳岛旅游攻略，支持筛选和搜索
- **攻略详情**: 查看完整攻略内容，支持收藏、分享、导航
- **民宿介绍**: 展示民宿相册、房型信息、设施服务
- **个人中心**: 查看收藏和浏览历史

### 管理端
- **攻略管理**: 新增、编辑、删除、发布/下架攻略
- **民宿管理**: 管理民宿基本信息和房型

## 开发指南

### 云函数调用

所有云函数调用通过 `huahai` 云函数的 `type` 参数路由：

```javascript
const res = await wx.cloud.callFunction({
  name: 'huahai',
  data: {
    type: 'getGuides',  // 操作类型
    category: 'food'     // 参数
  }
});
```

### 数据库集合

- `guides`: 攻略内容
- `hostel`: 民宿信息
- `rooms`: 房型信息
- `favorites`: 用户收藏

详细字段说明请参考 [DATABASE.md](./DATABASE.md)

### 主题色

- 主色: #2E7DFF (海洋蓝)
- 辅助色: #4FC3F7 (浅蓝)
- 强调色: #FF6B35 (橙色)

## 管理员登录

管理后台默认密码: `huahai2026`

## 待完成功能

- [ ] 在线预订功能（V2）
- [ ] 社区互动功能（V2）
- [ ] AI智能客服（V2）
- [ ] 优惠券系统（V2）

## 参考文档

- [微信小程序开发文档](https://developers.weixin.qq.com/miniprogram/dev/framework/)
- [微信云开发文档](https://developers.weixin.qq.com/miniprogram/dev/wxcloud/basis/getting-started.html)
- [产品需求文档](./画海民宿小程序 - 产品需求文档(PRD).md)

## License

Copyright © 2026 画海民宿


