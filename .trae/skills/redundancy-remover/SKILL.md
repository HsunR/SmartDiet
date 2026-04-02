---
name: "redundancy-remover"
description: "使用反向剔除法删除项目代码冗余：备份项目→标记存活代码（文件/函数/样式类）→比对冗余→安全删除。Invoke when user wants to identify and remove redundant code from project."
---

# 项目代码冗余删除 - 反向剔除法

## 核心原理

**反向剔除法**：通过标记"存活代码"，然后从备份中删除所有存活代码，剩余内容即为纯冗余。

```
项目备份 → 标记存活代码（入口→依赖链） → 备份中删除存活 → 剩余=冗余
```

## 支持精细度

1. **文件级别** - 整个文件是否被引用
2. **函数级别** - 函数/方法是否被调用
3. **样式类级别** - CSS 类名是否在 wxml 中使用

---

## 第一步：完整备份

```bash
# 创建备份目录
mkdir -p .backup

# 复制项目到备份（排除大型目录）
xcopy /E /I /H /Y /EXCLUDE:exclude.txt * .backup\

# exclude.txt 内容：
# .git
# node_modules
# frp_*
# docs
```

## 第二步：标记存活代码

### 2.1 确定入口文件

**微信小程序入口（必须全部保留）：**

| 文件路径 | 说明 |
|---------|------|
| `miniprogram/app.js` | 应用入口 |
| `miniprogram/app.json` | 应用配置 |
| `miniprogram/app.wxss` | 全局样式 |
| `miniprogram/custom-tab-bar/index.js` | 自定义TabBar |
| `miniprogram/custom-tab-bar/index.wxml` | 自定义TabBar模板 |
| `miniprogram/custom-tab-bar/index.json` | 自定义TabBar配置 |
| `miniprogram/custom-tab-bar/index.wxss` | 自定义TabBar样式 |

**页面入口（从 app.json 的 pages 字段获取）：**

```json
// miniprogram/app.json
{
  "pages": [
    "pages/chat/index",
    "pages/report/index",
    "pages/profile/index"
  ]
}
```

**组件入口（从 app.json 的 usingComponents 字段获取）：**

```json
// miniprogram/app.json
{
  "usingComponents": {
    "food-card": "/components/food-card/index"
  }
}
```

**云函数入口（从 cloudfunctions 目录获取）：**

```
cloudfunctions/
├── aiGateway/index.js          ← 存活
├── foodRecord/index.js         ← 存活
├── report/index.js             ← 存活
└── user/index.js               ← 存活
```

### 2.2 追踪 JS 依赖链

对于每个入口 JS 文件，递归追踪 `require()` 和 `import` 依赖：

```javascript
// 追踪模式
const requirePattern = /require\(['"](.+?)['"]\)/g;
const importPattern = /import\s+.+?\s+from\s+['"](.+?)['"]/g;
```

**示例依赖链：**

```
miniprogram/pages/chat/index.js
├── require('./utils/api.js')      ← 存活
├── require('./utils/util.js')     ← 存活
└── require('./constants.js')     ← 存活
```

### 2.3 追踪 wxml 组件引用

从页面 wxml 文件中提取使用的组件：

```html
<!-- miniprogram/pages/chat/index.wxml -->
<food-card id="foodCard" />
<image src="{{imageUrl}}" />
```

### 2.4 追踪样式类使用

**样式定义（wxss）：**

```css
/* miniprogram/pages/chat/index.wxss */
.chat-container { }      ← 类名：chat-container
.message-item { }        ← 类名：message-item
.user-avatar { }         ← 类名：user-avatar
```

**样式引用（wxml）：**

```html
<view class="chat-container">
  <view class="message-item user-avatar">
```

### 2.5 生成存活清单

创建 `.redundancy-report/alive-files.json`：

```json
{
  "files": [
    "miniprogram/app.js",
    "miniprogram/app.json",
    "miniprogram/custom-tab-bar/index.js",
    "miniprogram/custom-tab-bar/index.wxml",
    "miniprogram/custom-tab-bar/index.json",
    "miniprogram/custom-tab-bar/index.wxss",
    "miniprogram/pages/chat/index.js",
    "miniprogram/pages/chat/index.wxml",
    "miniprogram/pages/chat/index.json",
    "miniprogram/pages/chat/index.wxss"
  ],
  "functions": {
    "miniprogram/pages/chat/index.js": ["onLoad", "onReady", "sendMessage"],
    "miniprogram/utils/api.js": ["request", "uploadImage"]
  },
  "classes": {
    "miniprogram/app.wxss": ["container", "flex", "text-primary"]
  }
}
```

---

## 第三步：提取冗余代码

### 3.1 创建报告目录

```bash
mkdir -p .redundancy-report
```

### 3.2 删除存活文件

在备份目录 `.backup` 中删除所有存活文件：

```bash
# 伪代码：删除所有存活文件
for file in $(cat .redundancy-report/alive-files.json | jq -r '.files[]'); do
  rm -f ".backup/$file"
done
```

### 3.3 删除冗余文件

备份目录剩余的文件即为冗余文件：

```bash
# 列出所有冗余文件
find .backup -type f > .redundancy-report/redundant-files.txt
```

### 3.4 分析冗余函数

对于每个 JS 文件：

1. 提取所有函数定义
2. 检查是否被调用
3. 检查是否导出（导出的函数必须保留）
4. 生成冗余函数报告

```
# .redundancy-report/redundant-functions.txt 格式
# 文件: miniprogram/utils/constants.js
# 冗余度: 52% (12/23 函数未使用)

未使用函数:
- createTextMessage() [行 73]
- createImageMessage() [行 81]
- createFoodCardMessage() [行 93]
```

### 3.5 分析冗余样式类

对于每个 wxss 文件：

1. 提取所有 `.className` 定义
2. 在对应的 wxml 文件中查找 class 引用
3. 生成冗余样式类报告

```
# .redundancy-report/redundant-classes.txt 格式
# 文件: miniprogram/app.wxss
# 冗余度: 98% (52/53 类未使用)

未使用样式类:
- .page-content
- .safe-area-bottom
- .flex-row
```

---

## 第四步：人工确认

⚠️ **必须人工审核每一项，确认后再删除！**

### 审核检查点

| 类型 | 审核要点 |
|------|---------|
| 文件 | 是否真的未被引用？可能是动态加载 |
| 函数 | 是否导出？导出函数即使未内部调用也应保留 |
| 函数 | 是否为生命周期函数？如 `onLoad`, `onReady` |
| 函数 | 是否为事件处理函数？如 `handleTap`, `bindInput` |
| 样式类 | 是否为全局类？在其他页面可能使用 |
| 样式类 | 是否为工具类？如 `.flex`, `.text-center` |

### 常见误报

以下情况应**保留**（不是冗余）：

1. **导出但未内部调用** - 可能被外部调用
2. **以 `_` 开头的私有函数** - 可能在未来使用
3. **TabBar 相关文件** - 即使当前未启用
4. **云函数 package.json** - 运行时必需

---

## 第五步：安全删除

### 删除策略

| 策略 | 说明 |
|------|------|
| 保守模式 | 仅删除确定100%冗余的内容 |
| 激进模式 | 删除未调用的私有函数（`_`开头） |

### 执行步骤

1. **先删除冗余文件**（影响最小）
2. **再删除冗余样式类**（影响较小）
3. **最后删除冗余函数**（需谨慎）
4. **每步后测试**（确保功能正常）

### 删除函数示例

原始文件 `example.js`：

```javascript
function usedFunction() {
  return 'hello';
}

function unusedFunction() {      // ← 冗余
  return 'world';
}

function _privateUnused() {     // ← 保留（私有函数）
  return 'secret';
}

module.exports = { usedFunction };
```

删除后：

```javascript
function usedFunction() {
  return 'hello';
}

function _privateUnused() {
  return 'secret';
}

module.exports = { usedFunction };
```

### 删除样式类示例

原始文件 `example.wxss`：

```css
.used-class { color: red; }     /* ← 保留 */
.unused-class { font-size: 12px; }  /* ← 冗余 */
.private-unused { display: none; }   /* ← 保留（可能未来使用）*/
```

删除后：

```css
.used-class { color: red; }
.private-unused { display: none; }
```

---

## 输出文件结构

所有分析报告统一输出到 `.redundancy-report/` 目录：

```
.redundancy-report/
├── alive-files.json      # 存活文件清单（JSON格式）
├── redundant-files.txt   # 冗余文件清单
├── redundant-functions.txt # 冗余函数分析报告
└── redundant-classes.txt  # 冗余样式类分析报告
```

---

## 输出报告模板

### .redundancy-report/redundant-files.txt

```
# 冗余文件清单
# 生成时间: 2024-01-01 12:00:00
# 总数: 15 个文件

cloudfunctions/aiGateway/package.json
cloudfunctions/foodRecord/package.json
miniprogram/components/food-card/index.js
miniprogram/components/food-card/index.wxml
miniprogram/custom-tab-bar/index.js  ← 注意：此文件应保留
```

### .redundancy-report/redundant-functions.txt

```
# 冗余函数清单
# 生成时间: 2024-01-01 12:00:00
# 总数: 58 个函数

# 文件: miniprogram/utils/constants.js
# 冗余度: 52% (12/23 函数未使用)

## 未使用函数:
- createTextMessage() [行 73]
- createImageMessage() [行 81]
- createFoodCardMessage() [行 93]

# 文件: miniprogram/utils/util.js
# 冗余度: 29% (12/41 函数未使用)

## 未使用函数:
- formatNumber() [行 16]
- formatDate() [行 38]
- generateId() [行 42]
```

### .redundancy-report/redundant-classes.txt

```
# 冗余样式类清单
# 生成时间: 2024-01-01 12:00:00
# 总数: 69 个类

# 文件: miniprogram/app.wxss
# 冗余度: 98% (52/53 类未使用)

## 未使用样式类:
- .page-content
- .safe-area-bottom
- .flex-row
- .flex-column
- .text-center

# 文件: miniprogram/pages/chat/index.wxss
# 冗余度: 21% (21/99 类未使用)

## 未使用样式类:
- .message-content-user
- .bubble-user
- .multi-selected
```

---

## 特殊入口说明

### custom-tab-bar 入口

`miniprogram/custom-tab-bar/` 下的文件**始终视为存活入口**：

```
miniprogram/custom-tab-bar/
├── index.js    ← 存活（TabBar组件）
├── index.wxml  ← 存活（TabBar模板）
├── index.json  ← 存活（TabBar配置）
└── index.wxss ← 存活（TabBar样式）
```

**原因**：微信小程序自定义 TabBar 是标准实践，即使当前未启用，也应保留以备将来使用。

### 保留关键词

**函数名（即使未调用也应保留）：**

- 生命周期：`onLoad`, `onReady`, `onShow`, `onHide`, `onUnload`
- 事件处理：`handleTap`, `handleInput`, `bindFocus`, `triggerChange`
- 私有函数：`_init`, `_setup`, `_bindEvents`（以 `_` 开头）
- 导出函数：`module.exports` 中声明的函数

**样式类（常见工具类应保留）：**

- 布局类：`container`, `flex`, `row`, `col`, `center`
- 间距类：`mt-sm`, `mt-md`, `mb-lg`, `p-xl`
- 颜色类：`text-primary`, `bg-white`, `text-error`
- 状态类：`active`, `disabled`, `hidden`, `show`

---

## 配置清单

在分析前，创建一个 `.redundancy-config.json`：

```json
{
  "reservedFiles": [
    "miniprogram/custom-tab-bar/index.*"
  ],
  "reservedFunctions": [],
  "reservedClasses": [
    "container", "flex", "text-*", "bg-*"
  ],
  "analysisMode": "conservative"
}
```

---

## 注意事项

⚠️ **安全提醒：**

1. **始终先备份** - 删除操作不可逆
2. **人工审核不可少** - 自动分析可能有误
3. **分步删除测试** - 每步删除后测试功能
4. **保留可能的未来使用** - 不确定时先注释
5. **检查 git 提交** - 方便回滚

⚠️ **常见误区：**

| 误区 | 正确做法 |
|------|---------|
| 删除了导出但未调用的函数 | 导出函数应保留，可能被外部使用 |
| 删除了 TabBar 相关文件 | TabBar 是标准实践，应保留 |
| 删除了云函数的 package.json | 云函数运行需要依赖声明 |
| 删除了 `_` 开头的私有函数 | 这些可能是未来扩展点 |

---

## 快速检查命令

```bash
# 1. 备份项目
xcopy /E /I /H /Y miniprogram .backup\miniprogram
xcopy /E /I /H /Y cloudfunctions .backup\cloudfunctions

# 2. 创建报告目录
mkdir -p .redundancy-report

# 3. 统计文件数量
dir /S /B miniprogram\*.js | find /C ".js"
dir /S /B miniprogram\*.wxml | find /C ".wxml"

# 4. 检查未使用的函数（需人工）
# 查看 .redundancy-report/redundant-functions.txt

# 5. 检查未使用的样式类（需人工）
# 查看 .redundancy-report/redundant-classes.txt

# 6. 恢复备份（如需）
xcopy /E /I /H /Y .backup\* .
```

---

## 检查清单

- [ ] 项目已完整备份到 `.backup/`
- [ ] 已创建 `.redundancy-report/` 报告目录
- [ ] 已分析所有页面入口（app.json pages）
- [ ] 已分析所有组件入口（app.json usingComponents）
- [ ] 已分析 custom-tab-bar 入口
- [ ] 已追踪所有 JS 依赖链
- [ ] 已追踪 wxml 组件引用
- [ ] 已追踪样式类使用
- [ ] 已生成存活文件清单 `.redundancy-report/alive-files.json`
- [ ] 已生成冗余文件报告 `.redundancy-report/redundant-files.txt`
- [ ] 已生成冗余函数报告 `.redundancy-report/redundant-functions.txt`
- [ ] 已生成冗余样式类报告 `.redundancy-report/redundant-classes.txt`
- [ ] 已人工审核每一项冗余
- [ ] 已执行删除操作
- [ ] 已充分测试功能完整性
