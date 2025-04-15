# 单词连连看项目 - HTML结构分析

## 主界面结构概述

主界面(`shouye.html`)采用了三栏式布局设计，由以下三个主要容器组成：

1. **左侧导航区**(`side-nav`) - 固定宽度
2. **中央内容区**(`content-area`) - 自适应宽度
3. **右侧面板区**(`right-panel`) - 固定宽度

整体页面被包裹在一个`main-wrapper`容器中，并且针对移动端设备提供了响应式设计元素。

## 详细容器与元素分析

### 1. 左侧导航区 (side-nav)

左侧导航区包含以下主要元素：

- **工作区标题** (`workspace-header`)
  - 应用标题: `<h1>单词连连看</h1>`
  - 主题切换按钮: `theme-switch` 包含两个主题按钮(feminine/masculine)

- **垂直导航菜单** (`vertical-nav`)
  - 学习空间部分: 包含"我的词库"、"学习日历"、"成就墙"按钮
  - 挑战模式部分: 包含"极速模式"、"拼图模式"、"生存模式"按钮

- **用户资料区** (`user-profile`)
  - 用户头像: `user-avatar` 包含头像图片和等级徽章
  - 用户信息: `user-info` 包含用户名、学习时间和积分信息

### 2. 中央内容区 (content-area)

中央内容区是主要的交互区域，包含以下元素：

- **网格标题** (`grid-header`)
  - 标题: `<h2>📖 单词学习矩阵</h2>`
  - 视图控制: `view-controls` 包含宫格视图、列表视图、时间线按钮

- **功能卡片网格** (`features-grid`)
  - 开始闯关卡片: `func-card` 带有Level 3标签和装饰元素
  - 随机挑战卡片: `func-card` 带有Hot!标签
  - 我的词库卡片: `func-card` 带有装饰元素
  - 今日推荐卡片: `func-card` 带有特效元素

- **分类部分** (`category-section`)
  - 分类标题: `category-title` 包含装饰和标题
  - 分类按钮: `category-buttons` 包含考研、高考、雅思等词汇分类按钮

- **统计容器** (`stats-container`)
  - 连续学习模块: `data-module` 显示连续学习天数和进度条
  - 已掌握单词模块: `data-module` 显示已掌握单词数量和进度条

### 3. 右侧面板区 (right-panel)

右侧面板包含辅助信息和功能：

- **成就徽章部分** (`panel-section`)
  - 标题: `<h4>🏆 成就徽章</h4>`
  - 徽章墙: `badge-wall` 包含已解锁和未解锁的成就徽章

- **学习日历部分** (`panel-section`)
  - 标题: `<h4>📅 学习日历</h4>`
  - 日历容器: `calendar-container` 用于显示热力图日历(由JS动态生成)

### 4. 移动端特定元素

页面底部包含几个移动端特定的控制元素：

- **移动端菜单开关**: `mobile-nav-toggle` 用于在小屏幕设备上显示/隐藏侧边导航
- **右侧面板切换按钮**: `panel-toggle` 用于在小屏幕设备上显示/隐藏右侧面板
- **设置菜单按钮**: `settings-button` 用于显示设置菜单

## 元素ID和Class分析

### 重要ID

- `user-avatar`: 用户头像图片
- `user-name`: 用户名称显示
- `user-minutes`: 用户学习时间
- `user-score`: 用户积分
- `streak-progress`: 连续学习进度条
- `mastery-progress`: 单词掌握进度条
- `right-calendar-container`: 右侧日历容器

### 重要Class

- 布局相关: `main-wrapper`, `side-nav`, `content-area`, `right-panel`
- 导航相关: `workspace-header`, `vertical-nav`, `nav-btn`, `nav-section`
- 功能卡片: `func-card`, `sticker`, `deco-clip`, `sparkle-effect`
- 分类相关: `category-section`, `category-btn`, `highlight`
- 统计相关: `stats-container`, `data-module`, `progress-bar`, `progress-fill`
- 徽章相关: `badge-wall`, `badge`, `unlocked`, `locked`
- 日历相关: `calendar-container`, `calendar-grid`, `calendar-day`

## HTML文件引用关系

`shouye.html`引用了以下外部资源：

### CSS文件
- `css/main.css`: 主样式文件
- `css/themes.css`: 主题样式文件
- `css/animations.css`: 动画效果样式文件
- `css/shouye.css`: 主页特定样式文件
- 外部字体图标库: Font Awesome 6.0.0

### JavaScript文件
- GSAP动画库: 用于高级动画效果
- `js/shouye.js`: 主页面逻辑(模块化导入其他JS文件)

## HTML结构问题分析

1. **路径问题**: CSS和JS文件的引用路径使用了相对路径，但文件实际位置可能不匹配
2. **资源缺失**: 引用了一些可能不存在的资源，如`assets/images/default-avatar.png`和装饰图片
3. **模块化不完整**: 虽然JS采用了模块化导入，但HTML结构未完全配合模块化设计
4. **响应式设计不完善**: 虽然有移动端控制元素，但缺少完整的响应式布局标记
5. **可访问性问题**: 缺少适当的ARIA标签和角色，对屏幕阅读器支持不足
