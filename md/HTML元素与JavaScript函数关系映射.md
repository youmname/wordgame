# HTML元素与JavaScript函数关系映射

本文档详细分析了HTML页面中的元素与JavaScript函数之间的关联关系，包括各元素的ID、类名、功能以及对应的JavaScript处理函数。

## 页面结构概览

网页主要包含以下几个主要屏幕（screen）：
1. 开始屏幕（start-screen）
2. 游戏屏幕（game-screen）
3. 关卡选择屏幕（level-screen）
4. 结果模态框（result-modal）
5. 帮助模态框（help-modal）

## 元素与函数关系详细映射

### 开始屏幕（start-screen）

| 元素ID/类名 | 元素类型 | 功能描述 | 关联JS文件 | 关联函数 |
|------------|---------|---------|-----------|---------|
| start-btn | button | 开始游戏按钮 | level-system.js | WordLevelSystem.init() |
| sample-btn | button | 示例游戏按钮 | ui-manager.js | WordUI.setupEventListeners() |
| theme-selector | select | 主题选择器 | ui-manager.js | WordUI.handleThemeChange() |
| bg-upload | input | 背景图片上传 | ui-manager.js | WordUI.handleBgUpload() |
| board-size | select | 游戏板大小选择 | game.js | WordGame.startGame() |
| difficulty | select | 难度选择 | game.js | WordGame.setDifficulty() |
| selected-source | input | 数据源选择 | game.js, main.js | WordGame.startGame(), setupDataSourceButtons() |
| chapter-select | select | 章节选择 | data-loader.js | WordDataLoader.loadChapterWords() |
| word-input | textarea | 自定义单词输入 | data-loader.js | WordDataLoader.parseCustomInput() |
| excel-file | input | Excel文件上传 | data-loader.js | WordDataLoader.handleExcelUpload() |
| reset-game-btn | button | 重置游戏按钮 | level-system.js | WordLevelSystem.resetProgress() |

### 游戏屏幕（game-screen）

| 元素ID/类名 | 元素类型 | 功能描述 | 关联JS文件 | 关联函数 |
|------------|---------|---------|-----------|---------|
| game-board | div | 游戏板容器 | board.js | WordBoard.setupBoard() |
| time | span | 时间显示 | game.js | WordGame.startTimer() |
| score | span | 分数显示 | game.js | WordGame.updateScore() |
| combo | span | 连击显示 | game.js | WordGame.handleCardsMatched() |
| matched-pairs | span | 已匹配对数 | game.js | WordGame.handleCardsMatched() |
| total-pairs | span | 总对数 | game.js | WordGame.updateUI() |
| progress-fill | div | 进度条 | ui-manager.js | WordUI.updateGameInfo() |
| hint-btn | button | 提示按钮 | game.js | WordGame.showHint() |
| shuffle-btn | button | 洗牌按钮 | game.js | WordGame.shuffleBoard() |
| restart-btn | button | 重新开始按钮 | game.js | WordGame.resetGame() |
| back-btn | button | 返回按钮 | game.js | WordGame.goBack() |

### 关卡选择屏幕（level-screen）

| 元素ID/类名 | 元素类型 | 功能描述 | 关联JS文件 | 关联函数 |
|------------|---------|---------|-----------|---------|
| level-grid | div | 关卡网格容器 | level-system.js | WordLevelSystem.renderLevelPage() |
| back-to-menu-btn | button | 返回主菜单按钮 | level-system.js, main.js | WordLevelSystem.setupLevelScreenButtons() |
| prev-page-btn | button | 上一页按钮 | level-system.js | WordLevelSystem.setupLevelScreenButtons() |
| next-page-btn | button | 下一页按钮 | level-system.js | WordLevelSystem.setupLevelScreenButtons() |
| page-indicator | span | 页码指示器 | level-system.js | WordLevelSystem.updatePageIndicator() |
| level-category | div | 级别分类按钮 | main.js | setupLevelCategoryButtons() |
| level-item | div | 关卡项 | main.js | setupLevelItems() |

### 结果模态框（result-modal）

| 元素ID/类名 | 元素类型 | 功能描述 | 关联JS文件 | 关联函数 |
|------------|---------|---------|-----------|---------|
| result-title | h2 | 结果标题 | ui-manager.js | WordUI.showGameResult() |
| final-score | span | 最终分数 | ui-manager.js | WordUI.showGameResult() |
| time-left | span | 剩余时间 | ui-manager.js | WordUI.showGameResult() |
| max-combo | span | 最大连击 | ui-manager.js | WordUI.showGameResult() |
| star1, star2, star3 | span | 星级评分 | ui-manager.js | WordUI.showGameResult() |
| play-again-btn | button | 再玩一次按钮 | ui-manager.js | WordUI.setupEventListeners() |
| next-level-btn | button | 下一关按钮 | ui-manager.js | WordUI.setupEventListeners() |
| menu-btn | button | 菜单按钮 | ui-manager.js | WordUI.setupEventListeners() |

### 帮助模态框（help-modal）

| 元素ID/类名 | 元素类型 | 功能描述 | 关联JS文件 | 关联函数 |
|------------|---------|---------|-----------|---------|
| help-modal | div | 帮助模态框 | ui-manager.js | WordUI.createHelpButton() |
| close-help-btn | button | 关闭帮助按钮 | ui-manager.js | WordUI.setupEventListeners() |
| help-btn | button | 帮助按钮 | ui-manager.js | WordUI.createHelpButton() |

### 游戏卡片元素

游戏卡片是动态生成的，没有固定ID，但有以下特征和关联函数：

| 元素类名 | 元素类型 | 功能描述 | 关联JS文件 | 关联函数 |
|---------|---------|---------|-----------|---------|
| card | div | 游戏卡片 | board.js | WordBoard.createCard() |
| selected | 类名 | 选中状态 | board.js | WordBoard.handleCardClick() |
| matched | 类名 | 已匹配状态 | board.js | WordBoard.markCardsAsMatched() |
| incorrect | 类名 | 不匹配状态 | board.js | WordBoard.markCardsAsIncorrect() |
| hint | 类名 | 提示状态 | board.js | WordBoard.showHint() |
| shuffling | 类名 | 洗牌动画 | board.js | WordBoard.shuffleBoard() |

## 主要事件监听和处理流程

### 游戏初始化流程

1. DOMContentLoaded事件触发（main.js）
   - 初始化各模块：WordSoundManager, WordUI, WordLevelSystem, WordDataLoader, WordGame
   - 应用主题设置
   - 初始化控制按钮
   - 设置级别分类按钮事件
   - 设置关卡项事件
   - 设置数据源按钮事件

2. 游戏开始流程（game.js - WordGame.startGame()）
   - 获取选中的数据源
   - 准备单词数据
   - 设置游戏难度
   - 切换到游戏界面
   - 初始化游戏状态
   - 启动计时器

### 卡片交互流程

1. 卡片点击事件（board.js - WordBoard.handleCardClick()）
   - 检查是否可以点击
   - 处理第一次选择
   - 处理第二次选择
   - 检查匹配状态

2. 卡片匹配处理（game.js - WordGame.handleCardsMatched()）
   - 更新匹配对数
   - 更新连击次数
   - 计算得分
   - 检查游戏是否结束

3. 卡片不匹配处理（game.js - WordGame.handleCardsMismatched()）
   - 重置连击
   - 更新分数

### 游戏控制流程

1. 提示功能（game.js - WordGame.showHint()）
   - 播放提示音效
   - 使用游戏板的提示方法
   - 如果没有找到提示，提示洗牌

2. 洗牌功能（board.js - WordBoard.shuffleBoard()）
   - 收集未匹配的卡片
   - 取消当前选中状态
   - 给所有卡片添加洗牌动画
   - 应用智能洗牌算法
   - 更新卡片位置和矩阵

3. 游戏结束处理（game.js - WordGame.gameOver()）
   - 清除计时器
   - 播放结束音效
   - 更新关卡状态
   - 保存当前关卡信息
   - 触发游戏结束事件
   - 清理键盘事件

## 模块间通信机制

系统使用事件系统（WordUtils.EventSystem）进行模块间通信，主要事件包括：

1. 'cards:matched' - 卡片匹配成功事件
2. 'cards:mismatched' - 卡片匹配失败事件
3. 'board:shuffled' - 游戏板洗牌事件
4. 'game:updateUI' - 更新游戏UI事件
5. 'game:over' - 游戏结束事件
6. 'game:back' - 返回事件
7. 'chapters:updated' - 章节更新事件
8. 'screen:changed' - 屏幕切换事件

## 数据流向

1. 单词数据流向：
   - 从API或本地获取（WordDataLoader）
   - 传递给游戏模块（WordGame）
   - 用于创建游戏卡片（WordBoard）

2. 游戏状态数据流向：
   - 游戏模块（WordGame）维护核心状态
   - 通过事件系统传递给UI模块（WordUI）
   - UI模块更新界面显示

3. 关卡数据流向：
   - 从本地存储或API加载（WordLevelSystem）
   - 用于渲染关卡选择界面
   - 保存游戏进度和成就
