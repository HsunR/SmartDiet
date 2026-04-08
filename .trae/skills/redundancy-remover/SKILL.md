---
name: "redundancy-remover"
description: "Detects and removes redundant code using reverse elimination method. Invoke when user asks to clean up code redundancy or optimize project files."
---

# 项目代码冗余删除 - 反向剔除法

## 核心原理

**反向剔除法**：通过标记"存活代码"，然后从备份中删除所有存活代码，剩余内容即为纯冗余。

```
项目备份 → 标记存活代码（入口→依赖链） → 备份中删除存活 → 剩余=冗余
```

## 功能特性

1. **项目备份** - 自动备份项目到 .backup/ 目录
2. **文件级别冗余检测** - 检测从未被引用的文件
3. **函数级别冗余检测** - 检测未被调用的函数/方法
4. **样式类级别冗余检测** - 检测 CSS/WXSS 类名未在 WXML 中使用
5. **冗余报告生成** - 在 .redundancy-report/ 目录生成详细报告

## 搜索精细度

- **文件级别** - 文件是否被引用
- **函数级别** - 函数/方法是否被调用
- **样式类级别** - CSS 类名是否在 wxml 中使用

## 使用方法

### 快速开始

```bash
# 进入技能目录
cd .trae/skills/redundancy-remover

# 运行完整分析
python redundancy_remover.py

# 只检测冗余文件
python redundancy_remover.py --files-only

# 只检测冗余函数
python redundancy_remover.py --functions-only

# 只检测冗余样式类
python redundancy_remover.py --classes-only

# 指定项目根目录
python redundancy_remover.py --root ../../..
```

### 参数说明

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `--root` | 项目根目录路径 | 当前目录 |
| `--files-only` | 只检测冗余文件 | False |
| `--functions-only` | 只检测冗余函数 | False |
| `--classes-only` | 只检测冗余样式类 | False |
| `--backup` | 是否创建备份 | True |

## 输出目录

```
.redundancy-report/
├── alive-files.json      # 存活文件列表
├── redundant-files.txt   # 冗余文件列表
├── redundant-functions.txt  # 冗余函数列表
└── redundant-classes.txt    # 冗余样式类列表
```

## 检测逻辑

### 文件级别冗余检测

1. 从 app.json 读取小程序页面配置
2. 追踪所有 require/import 引用
3. 追踪组件引用（usingComponents）
4. 从未被引用的文件标记为冗余

### 函数级别冗余检测

1. 解析所有 JavaScript 文件中的函数定义
2. 追踪函数调用关系
3. 从入口函数开始构建调用链
4. 不在调用链中的函数标记为冗余

### 样式类级别冗余检测

1. 解析所有 WXSS/CSS 文件中的类定义
2. 解析所有 WXML 文件中的类使用
3. 从未在 WXML 中使用的类标记为冗余

## 注意事项

1. 运行前会自动备份项目到 `.backup/` 目录
2. 检测结果仅供参考，请人工确认后再删除
3. 动态加载的代码可能被误判为冗余
4. 建议先在测试环境验证

## 示例

### 完整分析示例

```
=== 项目代码冗余检测 - 反向剔除法 ===

[1/6] 创建项目备份... 完成
[2/6] 分析文件依赖关系... 完成
[3/6] 检测冗余文件... 完成
[4/6] 分析函数调用关系... 完成
[5/6] 检测冗余函数... 完成
[6/6] 检测冗余样式类... 完成

=== 检测完成 ===
存活文件: 42 个
冗余文件: 3 个
冗余函数: 8 个
冗余样式类: 15 个

报告已生成到: .redundancy-report/
```
