/**
 * 游戏核心模块
 * 负责游戏的核心逻辑和状态管理
 */
const WordGame = {
    // 游戏数据
    wordPairs: [],
    
    // 游戏状态
    isGameOver: false,
    isLoading: false,
    matchedPairs: 0,
    score: 0,
    combo: 0,
    maxCombo: 0,
    timeLimit: 60,
    timer: null,
    hintUsed: 0,
    shuffleCount: 0,
    
    // 键盘事件处理函数
    keyboardHandler: null,
    
    /**
     * 初始化游戏
     */
    init() {
        // 注册事件监听
        this.setupEventListeners();
    },
    
    /**
     * 设置事件监听器
     */
    setupEventListeners() {
        // 游戏相关事件订阅
        WordUtils.EventSystem.on('cards:matched', this.handleCardsMatched.bind(this));
        WordUtils.EventSystem.on('cards:mismatched', this.handleCardsMismatched.bind(this));
        WordUtils.EventSystem.on('board:shuffled', this.handleBoardShuffled.bind(this));
    },
    
    /**
     * 处理卡片匹配成功
     * @param {Object} data - 匹配数据
     */
    handleCardsMatched(data) {
        // 更新匹配对数
        this.matchedPairs++;
        
        // 更新连击次数
        this.combo++;
        this.maxCombo = Math.max(this.maxCombo, this.combo);
        
        // 计算得分
        this.updateScore(true, data.firstCard);
        
        // 检查游戏是否结束
        if (this.matchedPairs >= this.wordPairs.length) {
            this.gameOver(true);
        } else {
            // 检查是否还有可连接的卡片
            setTimeout(() => {
                const hasMatch = WordPathFinder.checkForPossibleMatches();
                if (!hasMatch) {
                    // 如果没有可连接的卡片，自动洗牌
                    WordBoard.shuffleBoard(true);
                }
            }, 300);
        }
    },
    
    /**
     * 处理卡片匹配失败
     */
    handleCardsMismatched() {
        // 重置连击
        this.combo = 0;
        
        // 更新分数
        this.updateScore(false);
    },
    
    /**
     * 处理游戏板洗牌
     * @param {Object} data - 洗牌数据
     */
    handleBoardShuffled(data) {
        // 如果是非自动洗牌或非首次自动洗牌，扣分
        if (!data.isAuto || this.shuffleCount > 1) {
            this.score = Math.max(0, this.score - 20);
            this.updateUI();
        }
    },
    
    /**
     * 开始游戏
     */
    async startGame() {
        console.log("开始游戏...");
        
        try {
            // 强制显示游戏信息和控制按钮
            const outerInfo = document.querySelector('.outer-info');
            const outerControls = document.querySelector('.outer-controls');
            
            // 游戏开始时强制显示
            if (outerInfo) {
                outerInfo.style.cssText = 'display:flex !important; opacity:1 !important; visibility:visible !important';
            }
            if (outerControls) {
                outerControls.style.cssText = 'display:flex !important; opacity:1 !important; visibility:visible !important';
            }
            
            // 获取选中的数据源
            const dataSource = document.querySelector('input[name="data-source"]:checked')?.value;
            console.log("选中的数据源:", dataSource);
            
            // 准备单词数据
            const boardSizeElement = document.getElementById('board-size');
            const boardSize = boardSizeElement && boardSizeElement.value ? 
                            parseInt(boardSizeElement.value) : 8;
            const maxPairs = Math.floor((boardSize * boardSize) / 2);
            
            let wordPairs = null;
            
            // 1. 按章节获取 - 通过API从数据库获取特定章节的单词
            if (dataSource === 'chapter') {
                const chapterSelect = document.getElementById('chapter-select');
                const selectedChapter = chapterSelect.value;
                console.log("选中的章节:", selectedChapter);
                
                wordPairs = await WordDataLoader.loadChapterWords(selectedChapter);
                
                if (!wordPairs) {
                    console.error("未能获取到该章节的单词数据");
                } else {
                    console.log(`成功获取到${wordPairs.length}对单词数据`);
                }
            } 
            // // 2. 上传Excel文件 - 使用用户上传的Excel文件中的数据
            // else if (dataSource === 'upload') {
            //     // 检查是否有已加载的Excel数据
            //     const availableChapters = Object.keys(WordDataLoader.excelData);
                
            //     if (availableChapters.length === 0) {
            //         console.error("没有上传Excel文件或Excel数据为空");
            //         WordUtils.ErrorManager.showToast("请先上传Excel文件");
            //         return false;
            //     }
                
            //     // 使用第一个章节的数据（或者用户选择的章节）
            //     const selectedChapter = document.getElementById('chapter-select').value || availableChapters[0];
                
            //     wordPairs = WordDataLoader.getChapterWords(selectedChapter);
                
            //     if (!wordPairs) {
            //         console.error("未能从Excel中获取单词数据");
            //     } else {
            //         console.log(`成功从Excel获取到${wordPairs.length}对单词数据`);
            //     }

            //     //不要打乱顺序或者限制数量，直接使用原始数据
            //     this.wordPairs = wordPairs;
            // } 

            // 2. 上传Excel文件 - 使用用户上传的Excel文件中的数据
            else if (dataSource === 'upload') {
                // 检查是否有已加载的Excel数据
                const availableChapters = Object.keys(WordDataLoader.excelData);
                
                if (availableChapters.length === 0) {
                    console.error("没有上传Excel文件或Excel数据为空");
                    WordUtils.ErrorManager.showToast("请先上传Excel文件");
                    return false;
                }
                
                // 使用第一个章节的数据（或者用户选择的章节）
                const selectedChapter = document.getElementById('chapter-select').value || availableChapters[0];
                
                wordPairs = WordDataLoader.getChapterWords(selectedChapter);
                
                if (!wordPairs) {
                    console.error("未能从Excel中获取单词数据");
                    return false;
                } else {
                    console.log(`成功从Excel获取到${wordPairs.length}对单词数据`);
                }
            
                // 直接使用原始数据
                this.wordPairs = wordPairs;
                
                // 设置游戏参数
                const difficulty = document.getElementById('difficulty').value || 'normal';
                
                // 根据难度设置时间
                this.setDifficulty(difficulty);
                
                // 切换到游戏界面
                WordUI.switchScreen('game-screen');
                
                // 初始化游戏
                this.initGameState(boardSize);
                
                return true; // 直接返回，跳过后面的通用处理逻辑
            }
            // 3. 随机获取 - 从数据库中随机获取一定数量的不重复单词
            else if (dataSource === 'random') {
                const count = 32;
                console.log(`尝试随机获取${count}对单词`);
                
                try {
                    wordPairs = await WordDataLoader.getRandomWords(count);
                    
                    if (wordPairs) {
                        console.log(`成功随机获取到${wordPairs.length}对单词`);
                    }
                } catch (error) {
                    console.error("随机获取单词失败:", error);
                    WordUtils.ErrorManager.showToast(`随机获取单词失败: ${error.message}`);
                }
            }

            // 4. 自定义输入 - 使用用户按特定格式输入的单词数据
            else if (dataSource === 'custom') {
                const customInput = document.getElementById('word-input').value;
                
                if (!customInput.trim()) {
                    console.error("自定义输入为空");
                    WordUtils.ErrorManager.showToast("请输入单词数据");
                    return false;
                }
                
                wordPairs = WordUtils.parseCustomInput(customInput);
                
                if (!wordPairs || wordPairs.length < 2) {
                    console.error("解析自定义输入失败或数量不足");
                    WordUtils.ErrorManager.showToast("请至少输入两组有效的单词和定义");
                    return false;
                }
                
                console.log(`成功解析自定义输入，共${wordPairs.length}对单词`);
            }
            
            // 如果没有获取到单词数据，使用示例数据作为备用
            if (!wordPairs || wordPairs.length < 2) {
                console.log("使用示例数据作为备用");
                wordPairs = WordUtils.parseCustomInput(WordConfig.SAMPLE_DATA);
                
                if (!wordPairs || wordPairs.length < 2) {
                    WordUtils.ErrorManager.showToast("无法加载单词数据，请稍后再试");
                    return false;
                }
                
                console.log(`使用示例数据，共${wordPairs.length}对单词`);
            }
            
            // 打乱顺序并限制数量
            wordPairs = WordUtils.shuffle(wordPairs);
            
            if (wordPairs.length > maxPairs) {
                wordPairs = wordPairs.slice(0, maxPairs);
                console.log(`单词对数量超过最大限制，截取前${maxPairs}对`);
            }
            
            this.wordPairs = wordPairs;
            console.log("最终使用的单词对数量:", this.wordPairs.length);
            
            // 设置游戏参数
            const difficulty = document.getElementById('difficulty').value || 'normal';
            
            // 根据难度设置时间
            this.setDifficulty(difficulty);
            
            // 切换到游戏界面
            WordUI.switchScreen('game-screen');
            
            // 初始化游戏
            this.initGameState(boardSize);
            
            return true;
        } catch (error) {
            console.error("游戏启动错误:", error);
            WordUtils.ErrorManager.showToast("游戏启动失败: " + error.message);
            return false;
        }
    }, 

    /**
     * 直接跳转到特定关卡
     * @param {string} chapter - 关卡章节名
     */
    async startLevel(chapter) {
        console.log("直接跳转到关卡:", chapter);
        WordUtils.LoadingManager.show('正在加载关卡...');
        
        try {
            let wordPairs = null;
            
            // 检查是否是Excel工作表名称
            if (chapter && !chapter.match(/^第\d+章/)) {
                console.log("检测到Excel工作表名称，直接从Excel数据获取");
                
                // 从Excel数据中获取
                wordPairs = WordDataLoader.getChapterWords(chapter);
                
                if (!wordPairs || wordPairs.length === 0) {
                    WordUtils.LoadingManager.hide();
                    WordUtils.ErrorManager.showToast('无法从Excel中获取该章节数据');
                    return false;
                }
            } else {
                // 从API加载关卡数据
                wordPairs = await WordDataLoader.loadChapterWords(chapter);
                
                if (!wordPairs || wordPairs.length === 0) {
                    WordUtils.LoadingManager.hide();
                    WordUtils.ErrorManager.showToast('无法加载该关卡数据，请稍后再试');
                    return false;
                }
            }
            
            // 将数据传递给游戏
            this.wordPairs = wordPairs;
            
            // 设置游戏参数
            const boardSizeElement = document.getElementById('board-size');
            const boardSize = boardSizeElement ? parseInt(boardSizeElement.value) : 8;
            const difficulty = document.getElementById('difficulty').value || 'normal';
            
            // 根据难度设置时间
            this.setDifficulty(difficulty);
            
            // 切换到游戏界面
            WordUI.switchScreen('game-screen');
            
            // 初始化游戏
            this.initGameState(boardSize);
            
            WordUtils.LoadingManager.hide();
            console.log("成功启动关卡:", chapter);
            return true;
        } catch (error) {
            console.error("启动关卡失败:", error);
            WordUtils.LoadingManager.hide();
            WordUtils.ErrorManager.showToast(`启动关卡失败: ${error.message}`);
            return false;
        }
    },
    
    /**
     * 设置游戏难度
     * @param {string} difficulty - 难度级别
     */
    setDifficulty(difficulty) {
        switch (difficulty) {
            case 'easy':
                this.timeLimit = WordConfig.DIFFICULTY.easy.timeLimit;
                break;
            case 'normal':
                this.timeLimit = WordConfig.DIFFICULTY.normal.timeLimit;
                break;
            case 'hard':
                this.timeLimit = WordConfig.DIFFICULTY.hard.timeLimit;
                break;
        }
    },
    
    /**
     * 初始化游戏状态
     * @param {number} boardSize - 游戏板大小
     */
    initGameState(boardSize) {
        // 重置游戏状态
        this.isGameOver = false;
        this.isLoading = false;
        this.matchedPairs = 0;
        this.score = 0;
        this.combo = 0;
        this.maxCombo = 0;
        this.hintUsed = 0;
        this.shuffleCount = 0;
        
        // 初始化游戏板
        WordBoard.init(boardSize);
        WordBoard.setupBoard(this.wordPairs);
        
        // 启动计时器
        this.startTimer();
        
        // 更新UI
        this.updateUI();
        
        // 初始化键盘快捷键
        this.initKeyboardShortcuts();
    },
    
    /**
     * 启动计时器
     */
    startTimer() {
        clearInterval(this.timer);
        
        const timeDisplay = document.getElementById('time');
        timeDisplay.textContent = this.timeLimit;
        
        this.timer = setInterval(() => {
            this.timeLimit--;
            timeDisplay.textContent = this.timeLimit;
            
            if (this.timeLimit <= 0) {
                clearInterval(this.timer);
                this.gameOver(false);
            }
        }, 1000);
    },
    
    /**
     * 更新分数
     * @param {boolean} isCorrect - 是否匹配正确
     * @param {HTMLElement} card - 匹配的卡片
     */
    updateScore(isCorrect, card) {
        if (isCorrect) {
            // 匹配成功
            // 基础分 + 连击奖励 + 时间奖励
            const basePoints = 10;
            const comboBonus = this.combo * 5;
            const timeBonus = Math.floor(this.timeLimit / 10);
            
            const points = basePoints + comboBonus + timeBonus;
            this.score += points;
            
            // 显示加分动画
            WordUI.showPointsAnimation(points, card);
        }
        
        this.updateUI();
    },
    
    /**
     * 更新游戏UI
     */
    updateUI() {
        WordUtils.EventSystem.trigger('game:updateUI', {
            score: this.score,
            combo: this.combo,
            matchedPairs: this.matchedPairs,
            totalPairs: this.wordPairs.length,
            timeLimit: this.timeLimit
        });
    },
    
    /**
     * 游戏结束
     * @param {boolean} isWin - 是否获胜
     */
    gameOver(isWin) {
        clearInterval(this.timer);
        this.isGameOver = true;
        
        // 播放结束音效
        WordSoundManager.play(isWin ? 'win' : 'gameover');
        
        // 更新关卡状态
        const nextLevelAvailable = WordLevelSystem.updateLevelCompletion(isWin, this.score);
        
        // 保存当前关卡信息
        if (WordLevelSystem.levelData.currentLevel) {
            WordLevelSystem.saveLevelData();
        }
        
        // 触发游戏结束事件
        WordUtils.EventSystem.trigger('game:over', {
            isWin,
            score: this.score,
            timeLimit: this.timeLimit,
            maxCombo: this.maxCombo,
            totalPairs: this.wordPairs.length,
            nextLevelAvailable
        });
        
        // 清理键盘事件
        this.cleanupKeyboardShortcuts();
    },
    
    /**
     * 显示提示
     */
    showHint() {
        if (this.isGameOver || this.isLoading) return;
        
        WordSoundManager.play('hint');
        this.hintUsed++;
        
        // 使用游戏板的提示方法
        const hintFound = WordBoard.showHint();
        
        // 如果没有找到提示，提示洗牌
        if (!hintFound) {
            WordUtils.showConfirm("没有可连接的卡片", "将自动重新洗牌。", () => {
                this.shuffleBoard(true);
            });
        }
    },
    
    /**
     * 重新洗牌
     * @param {boolean} isAuto - 是否自动洗牌
     * @returns {Promise} 洗牌完成的Promise
     */
    shuffleBoard(isAuto) {
        return WordBoard.shuffleBoard(isAuto);
    },
    
    /**
     * 重置游戏
     */
    resetGame() {
        document.getElementById('next-level-btn').style.display = 'none';
        document.getElementById('result-modal').classList.remove('active');
        clearInterval(this.timer);
        WordBoard.removeConnectors();
        
        // 移除键盘事件监听
        this.cleanupKeyboardShortcuts();
        
        // 添加淡入动画
        const gameScreen = document.getElementById('game-screen');
        gameScreen.classList.remove('screen-fade-in');
        void gameScreen.offsetWidth; // 触发重排，重置动画
        gameScreen.classList.add('screen-fade-in');
        
        // 重新设置时间限制 - 修复时间不重置问题
        const difficulty = document.getElementById('difficulty').value;
        this.setDifficulty(difficulty);
        
        // 重新初始化游戏
        this.initGameState(WordBoard.boardSize);
    },
    
    /**
     * 停止计时器
     */
    stopTimer() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    },

    /**
     * 移除连接器
     */
    removeConnectors() {
        WordBoard.removeConnectors();
    },

    /**
     * 返回主界面
     */
    goBack() {
        // 立即隐藏游戏信息和控制按钮
        const outerInfo = document.querySelector('.outer-info');
        const outerControls = document.querySelector('.outer-controls');
        
        if (outerInfo) {
            outerInfo.style.cssText = 'display:none !important';
        }
        if (outerControls) {
            outerControls.style.cssText = 'display:none !important';
        }
        
        // 隐藏下一关按钮
        document.getElementById('next-level-btn').style.display = 'none';
        
        // 移除结果弹窗的active类
        document.getElementById('result-modal').classList.remove('active');
        
        // 停止计时器
        this.stopTimer();
        
        // 移除连接器
        this.removeConnectors();
        
        // 移除键盘事件监听
        this.cleanupKeyboardShortcuts();
        
        // 切换到开始界面
        WordUI.switchScreen('start-screen');
        
        // 触发返回事件，但不清空数据
        WordUtils.EventSystem.trigger('game:back');
    },
    
    /**
     * 进入下一关
     */
    goToNextLevel() {
        document.getElementById('result-modal').classList.remove('active');
        clearInterval(this.timer);
        WordBoard.removeConnectors();
        
        const currentLevel = WordLevelSystem.levelData.currentLevel;
        if (!currentLevel) {
            console.log("未找到当前关卡信息!");
            return;
        }
        
        // 获取所有章节/关卡
        const chapters = Object.keys(WordDataLoader.excelData);
        const currentIndex = chapters.indexOf(currentLevel);
        
        // 检查是否有下一关
        if (currentIndex >= 0 && currentIndex < chapters.length - 1) {
            const nextChapter = chapters[currentIndex + 1];
            
            // 检查下一关是否已解锁
            if (WordLevelSystem.levelData.levels[nextChapter] && WordLevelSystem.levelData.levels[nextChapter].unlocked) {
                // 设置当前关卡为下一关
                WordLevelSystem.levelData.currentLevel = nextChapter;
                WordLevelSystem.saveLevelData();
                
                // 加载下一关的数据
                this.startLevel(nextChapter);
                
                // 显示提示
                WordUtils.ErrorManager.showToast(`正在进入${nextChapter}...`, 2000, 'success');
            } else {
                WordUtils.ErrorManager.showToast('下一关尚未解锁!', 2000, 'warning');
                this.goBack(); // 返回主菜单
            }
        } else {
            WordUtils.ErrorManager.showToast('已经是最后一关!', 2000, 'warning');
            this.goBack(); // 返回主菜单
        }
    },
    
    /**
     * 初始化键盘快捷键
     */
    initKeyboardShortcuts() {
        // 移除可能存在的旧监听器
        this.cleanupKeyboardShortcuts();
        
        // 创建新的处理函数
        this.keyboardHandler = this.handleKeyPress.bind(this);
        
        // 添加全局键盘事件监听
        document.addEventListener('keydown', this.keyboardHandler);
    },
    
    /**
     * 清理键盘快捷键
     */
    cleanupKeyboardShortcuts() {
        if (this.keyboardHandler) {
            document.removeEventListener('keydown', this.keyboardHandler);
            this.keyboardHandler = null;
        }
    },
    
    /**
     * 键盘事件处理函数
     * @param {KeyboardEvent} event - 键盘事件
     */
    handleKeyPress(event) {
        // 只有在游戏进行中才处理键盘事件
        if (document.getElementById('game-screen').style.display === 'none' || this.isGameOver || this.isLoading) {
            return;
        }
        
        // 根据按键进行不同操作
        switch (event.key.toLowerCase()) {
            case 't': // T键 - 提示
                this.showHint();
                break;
            case ' ': // 空格键 - 洗牌
                this.shuffleBoard(false);
                break;
            case 'escape': // ESC键 - 返回
                this.goBack();
                break;
            case 'r': // R键 - 重新开始
                this.resetGame();
                break;
        }
    }
};

// 初始化控制按钮事件
function initControlButtons() {
    console.log("Attempting to initialize control buttons..."); // 调试信息

    try {
        // 检查游戏界面是否存在
        const gameScreen = document.getElementById('game-screen');
        if (!gameScreen) {
            console.warn("游戏界面元素 'game-screen' 不存在，跳过控制按钮初始化");
            return;
        }
        
        // 检查控制按钮是否存在
        const hintBtn = document.getElementById('hint-btn');
        const shuffleBtn = document.getElementById('shuffle-btn');
        const restartBtn = document.getElementById('restart-btn');
        const backBtn = document.getElementById('back-btn'); // 这个按钮现在用于退出登录

        // 为每个按钮添加存在性检查
        if (hintBtn) {
            hintBtn.addEventListener('click', () => {
                if (!Game.isRunning || Game.isPaused) return;
                SoundManager.playSound('click');
                Game.showHint();
            });
            console.log("Hint button initialized.");
        } else {
            console.warn("Hint button (hint-btn) not found.");
        }
    
        if (shuffleBtn) {
            shuffleBtn.addEventListener('click', () => {
                if (!Game.isRunning || Game.isPaused) return;
                SoundManager.playSound('shuffle');
                Game.shuffleBoard();
            });
            console.log("Shuffle button initialized.");
        } else {
            console.warn("Shuffle button (shuffle-btn) not found.");
        }
    
        if (restartBtn) {
            restartBtn.addEventListener('click', () => {
                 if (!Game.isRunning || Game.isPaused) return; // 可以在游戏暂停或未开始时也允许重新开始
                SoundManager.playSound('click');
                // Game.restart(); // 应该调用 Game 模块的重启方法，或者直接重新加载关卡
                // 临时的重启方式，后续需要完善
                 console.log("Restart button clicked - restarting game logic needed");
                 alert("重新开始功能待实现"); // 临时提示
            });
             console.log("Restart button initialized.");
        } else {
            console.warn("Restart button (restart-btn) not found.");
        }
    
        // back-btn 现在用于退出登录，其事件监听器应该在 index.html 的 <script> 块中
        if (backBtn) {
             console.log("Back button (back-btn) found, its listener should be in index.html.");
             // 注意：这里的 back-btn 的事件监听器已经在 index.html 中定义为退出登录了，这里不需要重复添加
        } else {
             console.warn("Back button (back-btn) not found.");
        }
    } catch (error) {
        console.error("初始化控制按钮时发生错误:", error);
    }
}

// 启动游戏的函数
function startGame(words, definitions) {
    // 强制显示游戏信息和控制按钮
    const outerInfo = document.querySelector('.outer-info');
    const outerControls = document.querySelector('.outer-controls');
    
    // 游戏开始时强制显示
    if (outerInfo) {
        outerInfo.style.cssText = 'display:flex !important; opacity:1 !important; visibility:visible !important';
    }
    if (outerControls) {
        outerControls.style.cssText = 'display:flex !important; opacity:1 !important; visibility:visible !important';
    }
    
    // 现有代码...
}