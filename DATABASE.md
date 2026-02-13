# 数据库设置指南

本文档说明如何在微信云开发控制台中创建数据库集合并添加初始数据。

## 一、创建数据库集合

在微信开发者工具中，打开云开发控制台 → 数据库，创建以下集合：

### 1. guides（攻略表）
用于存储旅游攻略内容。

**字段说明：**
- `_id`: 自动生成的唯一ID
- `title`: 攻略标题
- `category`: 分类（food/route/info/spot）
- `tags`: 标签数组
- `cover`: 封面图片URL
- `images`: 图片URL数组
- `summary`: 简介（50字内）
- `content`: 富文本内容
- `location`: 位置信息 {latitude, longitude}
- `address`: 地址
- `info`: 实用信息数组 [{label, value}]
- `weight`: 排序权重（数字越大越靠前）
- `status`: 状态（published/draft）
- `views`: 浏览量
- `likes`: 点赞数
- `createTime`: 创建时间
- `updateTime`: 更新时间

**索引建议：**
- `category` (普通索引)
- `status` (普通索引)
- `weight` (降序索引)
- `updateTime` (降序索引)

### 2. hostel（民宿信息表）
用于存储民宿基本信息。

**字段说明：**
- `_id`: 自动生成的唯一ID
- `name`: 民宿名称
- `description`: 民宿描述
- `address`: 详细地址
- `phone`: 联系电话
- `wechat`: 微信号
- `location`: 位置信息 {latitude, longitude}
- `albums`: 相册图片URL数组
- `facilities`: 设施服务数组
- `updateTime`: 更新时间

### 3. rooms（房型表）
用于存储房型信息。

**字段说明：**
- `_id`: 自动生成的唯一ID
- `roomType`: 房型名称
- `images`: 房间图片URL数组
- `description`: 房间描述
- `area`: 面积
- `bedType`: 床型
- `price`: 价格 {low: 淡季价格, high: 旺季价格}
- `tags`: 特色标签数组
- `facilities`: 房间设施数组
- `status`: 状态（available/full）
- `updateTime`: 更新时间

### 4. favorites（收藏表）
用于存储用户收藏记录。

**字段说明：**
- `_id`: 自动生成的唯一ID
- `openid`: 用户openid
- `guideId`: 攻略ID
- `createTime`: 收藏时间

**索引建议：**
- `openid` (普通索引)
- `guideId` (普通索引)

## 二、添加初始数据

### 1. 民宿信息初始数据

在 `hostel` 集合中添加：

```json
{
  "name": "画海民宿",
  "description": "欢迎来到画海民宿，我们位于美丽的南澳岛，为您提供舒适的住宿环境和贴心的服务。民宿靠近青澳湾，环境优美，是您度假的理想选择。",
  "address": "广东省汕头市南澳县后宅镇XXX路XX号",
  "phone": "138XXXX1234",
  "wechat": "huahai_minisu",
  "location": {
    "latitude": 23.4234,
    "longitude": 117.0234
  },
  "albums": [
    "cloud://xxx.png",
    "cloud://xxx.png"
  ],
  "facilities": [
    "免费WiFi",
    "24小时热水",
    "独立空调",
    "独立卫生间",
    "24小时前台",
    "行李寄存",
    "停车场"
  ],
  "updateTime": {"$date": "2026-01-01T00:00:00.000Z"}
}
```

### 2. 房型初始数据

在 `rooms` 集合中添加：

```json
[
  {
    "roomType": "海景大床房",
    "images": ["cloud://xxx.png"],
    "description": "面对大海，宽敞明亮，配有超大观景窗，可欣赏美丽的海景",
    "area": "35㎡",
    "bedType": "1.8m大床",
    "price": {"low": 288, "high": 488},
    "tags": ["观海", "大床", "情侣"],
    "facilities": ["空调", "WiFi", "电视", "热水", "独立卫浴"],
    "status": "available",
    "updateTime": {"$date": "2026-01-01T00:00:00.000Z"}
  },
  {
    "roomType": "标准双床房",
    "images": ["cloud://xxx.png"],
    "description": "温馨舒适的双床房，适合朋友出行或商务出差",
    "area": "28㎡",
    "bedType": "1.2m单人床x2",
    "price": {"low": 238, "high": 398},
    "tags": ["双床", "性价比"],
    "facilities": ["空调", "WiFi", "电视", "热水", "独立卫浴"],
    "status": "available",
    "updateTime": {"$date": "2026-01-01T00:00:00.000Z"}
  },
  {
    "roomType": "家庭套房",
    "images": ["cloud://xxx.png"],
    "description": "宽敞的家庭套房，适合家庭出游，设施齐全",
    "area": "55㎡",
    "bedType": "1.8m大床+1.2m单人床",
    "price": {"low": 488, "high": 688},
    "tags": ["家庭", "套房", "海景"],
    "facilities": ["空调", "WiFi", "电视", "热水", "独立卫浴", "冰箱"],
    "status": "available",
    "updateTime": {"$date": "2026-01-01T00:00:00.000Z"}
  }
]
```

### 3. 攻略示例数据

可以参考项目中的 `画海民宿攻略.md` 文档添加实际的攻略内容。

```json
[
  {
    "title": "后宅镇美食推荐",
    "category": "food",
    "tags": ["海鲜", "地道", "必吃"],
    "cover": "cloud://xxx.png",
    "images": ["cloud://xxx.png", "cloud://xxx.png"],
    "summary": "南澳岛后宅镇是本地人的美食天堂，这里有最新鲜的海鲜和最地道的潮汕风味。",
    "content": "<p>详细内容...</p>",
    "location": {
      "latitude": 23.4234,
      "longitude": 117.0234
    },
    "address": "汕头市南澳县后宅镇",
    "info": [
      {"label": "营业时间", "value": "全天"},
      {"label": "人均消费", "value": "80-150元"}
    ],
    "weight": 10,
    "status": "published",
    "views": 0,
    "likes": 0,
    "createTime": {"$date": "2026-01-01T00:00:00.000Z"},
    "updateTime": {"$date": "2026-01-01T00:00:00.000Z"}
  }
]
```

## 三、权限设置

在每个集合的权限设置中，选择合适的权限模式：

- **guides**: 所有用户可读，仅管理员可写
- **hostel**: 所有用户可读，仅管理员可写
- **rooms**: 所有用户可读，仅管理员可写
- **favorites**: 仅创建者可读写

## 四、数据安全规则建议

```json
{
  "read": true,
  "write": "doc.openid == auth.openid || doc._openid == auth.openid"
}
```

## 五、下一步

1. 在云开发控制台创建上述4个集合
2. 添加民宿信息和房型的初始数据
3. 根据 `画海民宿攻略.md` 文档添加实际的攻略内容
4. 上传图片到云存储，获取云存储URL
5. 部署云函数
6. 在小程序中测试功能
