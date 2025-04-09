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
            const dataSource = document.getElementById('selected-source').value;
            console.log("选中的数据源:", dataSource);
            
            // 准备单词数据
            const boardSizeElement = document.getElementById('board-size');
            const boardSize = boardSizeElement && boardSizeElement.value ? 
                            parseInt(boardSizeElement.value) : 8;
            const maxPairs = Math.floor((boardSize * boardSize) / 2);
            
            let wordPairs = null;
            
            // 使用当前选择的级别和章节
            if (dataSource === 'chapter') {
                if (WordLevelSystem.levelData && WordLevelSystem.levelData.currentLevel) {
                    // 如果已选择特定章节，使用该章节
                    const chapterId = WordLevelSystem.levelData.currentLevel;
                    console.log("加载指定章节ID:", chapterId);
                    
                    wordPairs = await this.loadChapterWordsById(chapterId);
                    
                    if (!wordPairs || wordPairs.length === 0) {
                        console.error("加载章节单词失败");
                        WordUtils.ErrorManager.showToast('无法加载该章节单词，请选择其他章节');
                        return false;
                    }
                } else {
                    // 如果没有特定章节，使用默认数据
                    console.warn("未选择特定章节，使用随机单词");
                    wordPairs = await WordDataLoader.getRandomWords(maxPairs);
                }
            } else if (dataSource === 'random') {
                // 从随机单词库获取单词
                wordPairs = await WordDataLoader.getRandomWords(maxPairs);
            } else if (dataSource === 'upload') {
                // 从上传的Excel文件获取单词
                wordPairs = await WordDataLoader.getExcelWords(maxPairs);
            } else if (dataSource === 'custom') {
                // 从自定义输入框获取单词
                const customInput = document.getElementById('word-input').value;
                wordPairs = WordDataLoader.parseCustomInput(customInput, maxPairs);
            } else {
                // 默认情况下使用随机单词
                console.log("没有明确的数据源，使用随机单词");
                wordPairs = await WordDataLoader.getRandomWords(maxPairs);
            }
            
            // 检查是否成功获取了单词对
            if (!wordPairs || wordPairs.length === 0) {
                WordUtils.ErrorManager.showToast('无法获取单词数据，请选择其他数据源或重试');
                return false;
            }
            
            // 保存单词对到游戏状态
            this.wordPairs = wordPairs;
            
            // 获取难度设置
            const difficulty = document.getElementById('difficulty').value || 'normal';
            
            // 设置游戏难度
            this.setDifficulty(difficulty);
            
            // 切换到游戏界面
            WordUI.switchScreen('game-screen');
            
            // 初始化游戏状态
            this.initGameState(boardSize);
            
            return true;
        } catch (error) {
            console.error("游戏启动失败:", error);
            WordUtils.ErrorManager.showToast('游戏启动失败，请稍后再试');
            return false;
        }
    },
    
    /**
     * 根据章节ID加载单词
     * @param {number} chapterId - 章节ID
     * @returns {Promise<Array>} 单词数组Promise
     */
    async loadChapterWordsById(chapterId) {
        console.log("根据ID加载章节单词:", chapterId);
        WordUtils.LoadingManager.show('正在加载单词数据...');
        
        try {
            // 构建API请求URL
            const endpoint = WordConfig.API.WORDS_ENDPOINT.replace('{id}', chapterId);
            const fullUrl = WordConfig.API.BASE_URL + endpoint;
            console.log("API请求URL:", fullUrl);
            
            const response = await fetch(fullUrl);
            
            // 检查响应状态
            if (!response.ok) {
                throw new Error(`获取单词失败: ${response.status} - ${response.statusText}`);
            }
            
            const wordsData = await response.json();
            console.log("API返回的单词数据:", wordsData);
            
            if (!wordsData || wordsData.length === 0) {
                WordUtils.ErrorManager.showToast('该章节没有单词数据，请选择其他章节');
                WordUtils.LoadingManager.hide();
                return null;
            }
            
            // 转换为游戏需要的格式
            const wordPairs = wordsData.map(word => ({
                word: word.word || "未知单词",
                definition: word.meaning || "未知定义"
            }));
            
            console.log("转换后的单词对:", wordPairs.length);
            
            if (wordPairs.length < 2) {
                WordUtils.ErrorManager.showToast('该章节单词数量不足，请选择其他章节');
                WordUtils.LoadingManager.hide();
                return null;
            }
            
            WordUtils.LoadingManager.hide();
            return wordPairs;
        } catch (error) {
            console.error('加载章节单词失败:', error);
            WordUtils.ErrorManager.showToast(`无法加载章节单词: ${error.message}`);
            WordUtils.LoadingManager.hide();
            return null;
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
function initControlButtons(retryCount = 0) {
    console.log(`Attempting to initialize control buttons... (尝试次数: ${retryCount + 1})`);
    
    // 最大重试次数限制
    const MAX_RETRIES = 5;
    
    // 使用setTimeout确保DOM完全加载
    setTimeout(() => {
        try {
            // 使用querySelector增加选择器的兼容性
            const hintBtn = document.getElementById('hint-btn') || document.querySelector('.hint-btn');
            const shuffleBtn = document.getElementById('shuffle-btn') || document.querySelector('.shuffle-btn');
            const restartBtn = document.getElementById('restart-btn') || document.querySelector('.restart-btn');
            const backBtn = document.getElementById('back-btn') || document.querySelector('.back-btn');
    
            console.log('[Chrome调试] 按钮元素状态:', {
                hintBtn: !!hintBtn,
                shuffleBtn: !!shuffleBtn,
                restartBtn: !!restartBtn,
                backBtn: !!backBtn
            });
    
            // 如果所有按钮都不存在，可能DOM还没准备好，稍后重试
            if ((!hintBtn && !shuffleBtn && !restartBtn && !backBtn) && retryCount < MAX_RETRIES) {
                const delayTime = 500 * Math.pow(1.5, retryCount); // 指数退避重试
                console.warn(`Control buttons not found, retrying in ${delayTime}ms... (尝试 ${retryCount + 1}/${MAX_RETRIES})`);
                setTimeout(() => initControlButtons(retryCount + 1), delayTime);
                return;
            } else if (retryCount >= MAX_RETRIES) {
                console.error(`已达到最大重试次数(${MAX_RETRIES})，停止尝试初始化控制按钮`);
                return;
            }
    
            // 为每个按钮添加存在性检查
            if (hintBtn) {
                // 移除可能已存在的事件监听器(防止重复绑定)
                const newHintBtn = hintBtn.cloneNode(true);
                if (hintBtn.parentNode) {
                    hintBtn.parentNode.replaceChild(newHintBtn, hintBtn);
                }
                
                newHintBtn.addEventListener('click', () => {
                    if (!Game.isRunning || Game.isPaused) return;
                    SoundManager.playSound('click');
                    Game.showHint();
                });
                console.log("Hint button initialized.");
            } else {
                console.warn("Hint button (hint-btn) not found.");
            }
    
            if (shuffleBtn) {
                // 移除可能已存在的事件监听器
                const newShuffleBtn = shuffleBtn.cloneNode(true);
                if (shuffleBtn.parentNode) {
                    shuffleBtn.parentNode.replaceChild(newShuffleBtn, shuffleBtn);
                }
                
                newShuffleBtn.addEventListener('click', () => {
                    if (!Game.isRunning || Game.isPaused) return;
                    SoundManager.playSound('shuffle');
                    Game.shuffleBoard();
                });
                console.log("Shuffle button initialized.");
            } else {
                console.warn("Shuffle button (shuffle-btn) not found.");
            }
    
            if (restartBtn) {
                // 移除可能已存在的事件监听器
                const newRestartBtn = restartBtn.cloneNode(true);
                if (restartBtn.parentNode) {
                    restartBtn.parentNode.replaceChild(newRestartBtn, restartBtn);
                }
                
                newRestartBtn.addEventListener('click', () => {
                    if (!Game.isRunning || Game.isPaused) return;
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
            
            console.log("Control buttons initialization completed successfully");
        } catch (error) {
            console.error("Error initializing control buttons:", error);
            
            // 如果还有重试次数，继续尝试
            if (retryCount < MAX_RETRIES) {
                const delayTime = 500 * Math.pow(1.5, retryCount);
                console.warn(`初始化按钮出错，${delayTime}ms后重试... (尝试 ${retryCount + 1}/${MAX_RETRIES})`);
                setTimeout(() => initControlButtons(retryCount + 1), delayTime);
            } else {
                console.error(`已达到最大重试次数(${MAX_RETRIES})，停止尝试初始化控制按钮`);
            }
        }
    }, 300); // 增加初始延迟时间
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