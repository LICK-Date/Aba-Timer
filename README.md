<div align="center">

<img src="images/logo-round.png" alt="ABA Timer Logo" width="100" />

# ABA Timer

**一个轻量、可离线使用、适合 HIIT / 间歇训练的分组计时器。**

![Version](https://img.shields.io/badge/version-1.1.0-blue.svg)
![PWA](https://img.shields.io/badge/PWA-Ready-3b82f6.svg)
[![License: MIT](https://img.shields.io/badge/License-MIT-f59e0b.svg)](LICENSE)

</div>

---

## 项目来源

本项目 **forked from [Devilquest/TabataTimer](https://github.com/Devilquest/TabataTimer)**，并在原项目基础上做了针对当前产品形态的界面和交互改造。

如果你想查看原始版本，请访问：

- 原项目仓库：[https://github.com/Devilquest/TabataTimer](https://github.com/Devilquest/TabataTimer)

---

## 项目简介

ABA Timer 是一个单页训练计时器，适合高强度间歇训练、循环训练和自定义节奏训练。

当前版本已经不再是传统固定 `work / rest / rounds` 的 Tabata 表单，而是升级为更灵活的“分组运动”模式：

- 一个可配置的 **Ready Time** 作为正式开始前倒计时
- 多个 **运动分组**
- 每个分组拥有独立的 `Sport` 时长和 `Rest` 时长
- 一个全局 **Rounds** 用于重复整套分组流程
- 训练过程中根据阶段自动变化的界面配色

典型流程如下：

```text
Ready -> Sport 1 -> Rest 1 -> Sport 2 -> Rest 2 -> ... -> 下一轮
```

---

## 当前功能

- 分组式运动编辑界面
- 每个运动项支持独立设置 `Sport` / `Rest`
- 支持拖拽调整运动项顺序
- 支持删除单个运动项
- 支持通过底部大 `+` 按钮新增运动项
- 独立设置 `Ready Time`
- 独立设置全局 `Rounds`
- 自动计算总训练时长
- 训练倒计时音效、阶段切换音效、完成提示音
- 圆形进度环动画
- 深色 / 浅色主题切换
- 阶段主题联动：
  - 运动阶段切换为活力橙色界面
  - 准备阶段和休息阶段保持当前主题原本颜色
- 自动保存配置到 `localStorage`
- 支持 PWA 安装与离线缓存
- 支持 Wake Lock，训练时尽量保持屏幕常亮

---

## 使用说明

### 配置界面

当前配置页由以下几部分组成：

- **Ready Time**
  - 训练开始前的准备倒计时
- **运动分组列表**
  - 每一行包含：
    - 左侧排序手柄
    - 中间 `Sport N` 时间卡片
    - 中间 `Rest N` 时间卡片
    - 右侧删除按钮
- **底部大 + 按钮**
  - 用于新增一个运动分组
- **Rounds**
  - 控制整套分组流程重复的次数
- **Total Time**
  - 根据准备时间、分组内容和轮数自动计算

### 训练逻辑

开始训练后，程序会先把当前配置展开成完整时间轴，再逐段播放。

顺序如下：

1. 如果 `Ready Time > 0`，先进入准备阶段
2. 按照当前 `Rounds` 循环
3. 每一轮中依次执行所有运动分组
4. 每个分组按 `Sport -> Rest` 播放
5. 最后一轮最后一个 `Sport` 结束后直接完成，不额外追加无意义的尾部休息

---

## 界面说明

### 阶段配色

计时界面会根据训练阶段自动切换视觉主题：

- **Work / Sport 阶段**
  - 整个训练界面切换为橙色高能风格
- **Ready / Rest 阶段**
  - 保持当前主题的基础颜色
  - 浅色主题继续保持浅色
  - 深色主题继续保持深蓝色

### 训练控制

训练过程中可使用以下操作：

- 停止
- 播放 / 暂停
- 跳过当前阶段

中间的圆环会在整个阶段持续时间内平滑播放，而不是每秒跳一次。

---

## 技术栈

| 层级 | 技术 |
|---|---|
| 结构 | HTML5 |
| 样式 | Vanilla CSS3 |
| 逻辑 | Vanilla JavaScript (ES6+) |
| 音效 | Web Audio API |
| 离线能力 | Service Worker + Cache API |
| 安装能力 | Web App Manifest |

项目无需框架、无需构建工具、无需安装依赖。

---

## 项目结构

```text
/
|-- index.html
|-- manifest.json
|-- sw.js
|-- css/
|   `-- styles.css
|-- js/
|   `-- main.js
`-- images/
    |-- favicon.ico
    |-- logo.png
    |-- logo-round.png
    |-- logo-white.png
    `-- logo-black.png
```

---

## 实现说明

### 状态模型

当前项目主要维护两类状态：

```js
const config = {
  preparation: 10,
  rounds: 2,
  groups: [{ id, work, rest }]
};

let state = {
  phase,
  currentRound,
  currentGroup,
  timeLeft,
  paused,
  interval,
  timeline,
  currentPhaseIndex
};
```

### 分组配置渲染

`js/main.js` 中通过 `createGroup()` 创建运动分组，通过 `renderGroups()` 动态渲染当前配置界面。

这让下面这些操作都能自动同步到 UI：

- 新增运动项
- 删除运动项
- 修改单项时长
- 调整顺序

### 时间轴生成

当前计时引擎不再直接使用旧版固定 `work/rest x rounds` 逻辑，而是通过 `buildTimeline()` 将当前配置展开为完整阶段列表。

这样更适合支持：

- 多组运动
- 每组独立休息时间
- 更准确的最后阶段收尾逻辑

### 阶段主题切换

训练进入运动阶段时，`setTimerPhaseTheme()` 会给文档添加 `data-timer-phase="work"` 属性，CSS 再根据这个属性切换整套橙色主题。

阶段切换回 `ready`、`rest`，或训练结束时，这个覆盖会被移除，界面回到当前亮色 / 暗色主题的基础配色。

### 本地持久化

训练配置保存在 `localStorage` 的 `tabataConfig` 中。

同时保留了对旧配置格式的兼容逻辑：如果历史数据中只有 `work` 和 `rest`，加载时会自动转换成一个默认分组。

---

## 本地运行

### 方式一：直接打开

直接用浏览器打开 `index.html` 即可体验基础功能。

### 方式二：本地静态服务器

如果你想测试完整的 PWA / Service Worker 能力，可以使用本地 HTTP 服务：

```bash
python -m http.server 8000
```

然后访问：

```text
http://localhost:8000
```

也可以使用任意其他静态服务器工具。

---

## 浏览器说明

项目依赖现代浏览器提供的标准 Web API：

- 音效使用 Web Audio API
- 离线能力使用 Service Worker
- 屏幕常亮使用 Screen Wake Lock API

如果设备或浏览器不支持 Wake Lock，计时器依然可以正常运行，只是训练过程中屏幕可能不会持续常亮。

---

## 当前状态

当前仓库内容已经对应以下能力：

- 分组式运动配置
- 多轮分组播放
- 阶段主题切换
- 深浅主题支持
- 本地配置持久化

如果你继续更新截图、宣传文案或产品说明，建议统一以当前“分组运动版”的工作流为准，而不是旧版单组 Tabata 配置页。

---

## License

Copyright (c) 2026 Devilquest  
[MIT License](LICENSE)
