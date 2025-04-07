/**
 * 关卡系统模块
 * 负责管理游戏关卡
 */
const WordLevelSystem = {
    // 关卡数据
    levelData: {
        currentLevel: null,
        levels: {}
    },
    
    // 分页相关
    currentPage: 1,
    levelsPerPage: 10,
    totalPages: 1,
    
    /**
     * 初始化关卡系统
     */
    init() {
        this.loadLevelData();
        this.setupLevelScreenButtons();
        
        // 重写开始游戏按钮，根据数据源决定行为
        const startBtn = document.getElementById('start-btn');
        startBtn.removeEventListener('click', WordGame.startGame);
        startBtn.addEventListener('click', () => {
            const dataSource = document.querySelector('input[name="data-source"]:checked').value;
            
            // 只有"按章节获取"或"上传Excel"才打开关卡选择界面
            if (dataSource === 'chapter' || dataSource === 'upload') {
                this.openLevelScreen();
            } else {
                // 其他数据源直接开始游戏
                WordGame.startGame();
            }
        });
        
        // 添加重置游戏按钮事件监听
        const resetBtn = document.getElementById('reset-game-btn');
        resetBtn.addEventListener('click', () => {
            WordUtils.showConfirm(
                "确定要重置游戏吗？",
                "这将清除所有游戏进度和记录，此操作不可撤销。",
                () => {
                    // 重置所有数据
                    this.levelData = {
                        currentLevel: null,
                        levels: {}
                    };
                    this.saveLevelData();
                    
                    // 清除Excel数据
                    WordDataLoader.excelData = {};
                    WordDataLoader.currentSource = null;
                    WordDataLoader.sourceData = {
                        chapter: {},
                        upload: {},
                        random: {},
                        custom: {}
                    };
                    
                    // 显示成功提示
                    WordUtils.ErrorManager.showToast("游戏已重置", 2000, 'success');
                    
                    // 刷新页面
                    setTimeout(() => {
                        location.reload();
                    }, 1000);
                }
            );
        });
        
        // 监听章节更新事件
        WordUtils.EventSystem.on('chapters:updated', () => {
            this.renderLevelPage();
        });
        
        // 监听返回事件
        WordUtils.EventSystem.on('game:back', () => {
            const dataSource = document.querySelector('input[name="data-source"]:checked').value;
            // 如果是关卡模式，返回关卡选择界面
            if (dataSource === 'chapter' || dataSource === 'upload') {
                this.openLevelScreen();
            }
        });
        
        // 监听数据源切换事件
        const dataSourceInputs = document.querySelectorAll('input[name="data-source"]');
        dataSourceInputs.forEach(input => {
            input.addEventListener('change', () => {
                // 如果切换到按章节获取，需要重新加载章节数据
                if (input.value === 'chapter') {
                    WordDataLoader.updateChapterSelectWithApiData();
                }
            });
        });
    },
    
    /**
     * 设置关卡选择界面按钮
     */
    setupLevelScreenButtons() {
        // 返回主菜单按钮
        document.getElementById('back-to-menu-btn').addEventListener('click', () => {
            WordUI.switchScreen('start-screen');
        });
        
        // 分页按钮
        document.getElementById('prev-page-btn').addEventListener('click', () => {
            if (this.currentPage > 1) {
                this.currentPage--;
                this.renderLevelPage();
                this.updatePageIndicator();
            }
        });
        
        document.getElementById('next-page-btn').addEventListener('click', () => {
            if (this.currentPage < this.totalPages) {
                this.currentPage++;
                this.renderLevelPage();
                this.updatePageIndicator();
            }
        });
    },
    
    /**
     * 打开关卡选择界面
     */
    openLevelScreen() {
        const dataSource = document.querySelector('input[name="data-source"]:checked').value;
        console.log("当前数据来源:", dataSource);
        
        // 先确保加载了数据
        if (dataSource === 'chapter') {
            // 对于按章节获取，确保我们已经获取了章节数据
            const chapterSelect = document.getElementById('chapter-select');
            
            if (chapterSelect && chapterSelect.options.length > 0) {
                console.log("章节已加载，准备生成关卡");
                // 使用章节数据生成游戏关卡
                this.generateLevelsFromChapters();
                
                // 计算上次关卡所在的页码
                if (this.levelData.currentLevel) {
                    const chapters = Object.keys(WordDataLoader.excelData);
                    const currentIndex = chapters.indexOf(this.levelData.currentLevel);
                    if (currentIndex >= 0) {
                        this.currentPage = Math.floor(currentIndex / this.levelsPerPage) + 1;
                        console.log("跳转到上次关卡所在页码:", this.currentPage);
                    }
                }
                
                // 切换到关卡选择界面
                WordUI.switchScreen('level-screen');
                
                // 渲染页面并更新页码指示器
                this.renderLevelPage();
                this.updatePageIndicator();
            } else {
                console.log("章节未加载，尝试获取章节数据");
                // 如果章节数据未加载，先加载章节
                WordDataLoader.updateChapterSelectWithApiData().then(success => {
                    if (success) {
                        console.log("成功获取章节数据");
                        this.generateLevelsFromChapters();
                        
                        // 计算上次关卡所在的页码
                        if (this.levelData.currentLevel) {
                            const chapters = Object.keys(WordDataLoader.excelData);
                            const currentIndex = chapters.indexOf(this.levelData.currentLevel);
                            if (currentIndex >= 0) {
                                this.currentPage = Math.floor(currentIndex / this.levelsPerPage) + 1;
                                console.log("跳转到上次关卡所在页码:", this.currentPage);
                            }
                        }
                        
                        // 切换到关卡选择界面
                        WordUI.switchScreen('level-screen');
                        
                        // 渲染页面并更新页码指示器
                        this.renderLevelPage();
                        this.updatePageIndicator();
                    } else {
                        WordUtils.ErrorManager.showToast('无法加载章节数据，请稍后再试');
                    }
                });
            }
        } else if (dataSource === 'upload') {
            // 对于Excel数据源，检查是否有数据
            if (Object.keys(WordDataLoader.excelData).length > 0) {
                // 计算上次关卡所在的页码
                if (this.levelData.currentLevel) {
                    const chapters = Object.keys(WordDataLoader.excelData);
                    const currentIndex = chapters.indexOf(this.levelData.currentLevel);
                    if (currentIndex >= 0) {
                        this.currentPage = Math.floor(currentIndex / this.levelsPerPage) + 1;
                        console.log("跳转到上次关卡所在页码:", this.currentPage);
                    }
                }
                
                // 切换到关卡选择界面
                WordUI.switchScreen('level-screen');
                
                // 渲染页面并更新页码指示器
                this.renderLevelPage();
                this.updatePageIndicator();
            } else {
                WordUtils.ErrorManager.showToast('请先上传Excel文件');
            }
        } else {
            WordUtils.ErrorManager.showToast('没有可用的单词数据，请先上传Excel文件或选择其他数据源');
        }
    },

    /**
     * 从章节数据生成关卡
     */
    generateLevelsFromChapters() {
        const chapterSelect = document.getElementById('chapter-select');
        if (!chapterSelect || chapterSelect.options.length === 0) {
            console.log("章节选择器为空，无法生成关卡");
            return;
        }
        
        console.log("开始从章节数据生成关卡");
        
        // 从章节选择器中获取章节数据
        const chapters = [];
        for (let i = 0; i < chapterSelect.options.length; i++) {
            chapters.push(chapterSelect.options[i].value);
        }
        
        console.log("获取到的章节:", chapters);
        
        // 将章节数据存储在excelData中以便复用现有逻辑
        chapters.forEach((chapter, index) => {
            if (!WordDataLoader.excelData[chapter]) {
                WordDataLoader.excelData[chapter] = []; // 空数组作为占位符
            }
            
            // 初始化关卡数据
            if (!this.levelData.levels[chapter]) {
                this.levelData.levels[chapter] = {
                    unlocked: index === 0, // 只有第一关默认解锁
                    completed: false,
                    stars: 0,
                    highScore: 0,
                    bestTime: 0
                };
            }
        });
        
        console.log("关卡数据生成完成:", this.levelData);
    },

    /**
     * 更新页码指示器
     */
    updatePageIndicator() {
        const pageIndicator = document.getElementById('page-indicator');
        pageIndicator.textContent = `第 ${this.currentPage}/${this.totalPages} 页`;
        
        // 更新按钮状态
        document.getElementById('prev-page-btn').disabled = (this.currentPage <= 1);
        document.getElementById('next-page-btn').disabled = (this.currentPage >= this.totalPages);
    },
    
    /**
     * 渲染关卡页面
     */
    renderLevelPage() {
        const levelGrid = document.getElementById('level-grid');
        levelGrid.innerHTML = '';
        levelGrid.className = 'level-grid'; // 确保使用网格布局样式
        
        const chapters = Object.keys(WordDataLoader.excelData);
        
        // 计算总页数
        this.totalPages = Math.ceil(chapters.length / this.levelsPerPage);
        
        const startIndex = (this.currentPage - 1) * this.levelsPerPage;
        const endIndex = Math.min(startIndex + this.levelsPerPage, chapters.length);
        
        // 添加当前页的关卡
        for (let i = startIndex; i < endIndex; i++) {
            const chapter = chapters[i];
            
            // 如果关卡数据中没有这一关，初始化它
            if (!this.levelData.levels[chapter]) {
                this.levelData.levels[chapter] = {
                    unlocked: i === 0, // 只有第一关默认解锁
                    completed: false,
                    stars: 0,
                    highScore: 0,
                    bestTime: 0
                };
            }
            
            // 创建关卡项
            const levelItem = document.createElement('div');
            levelItem.className = 'level-item';
            
            // 根据解锁状态设置样式
            if (!this.levelData.levels[chapter].unlocked) {
                levelItem.classList.add('locked');
            } else if (this.levelData.levels[chapter].completed) {
                levelItem.classList.add('completed');
            } else {
                levelItem.classList.add('available');
            }
            
            // 构建关卡内容 - 修改成网格样式布局
            const content = document.createElement('div');
            content.className = 'level-content';
            
            // 关卡名称
            const levelName = document.createElement('div');
            levelName.className = 'level-name';
            levelName.textContent = chapter;
            
            // 星级评分
            const starsDiv = document.createElement('div');
            starsDiv.className = 'level-stars';
            starsDiv.innerHTML = this.getStarsHTML(this.levelData.levels[chapter].stars);
            
            // 关卡信息
            const infoDiv = document.createElement('div');
            infoDiv.className = 'level-info';
            
            if (this.levelData.levels[chapter].completed) {
                infoDiv.textContent = `最高分: ${this.levelData.levels[chapter].highScore}`;
            } else if (this.levelData.levels[chapter].unlocked) {
                infoDiv.textContent = '点击开始';
            } else {
                infoDiv.textContent = '未解锁';
                
                // 添加锁图标
                const lockIcon = document.createElement('div');
                lockIcon.className = 'lock-icon';
                lockIcon.innerHTML = '🔒';
                levelItem.appendChild(lockIcon);
            }
            
            // 组装关卡内容
            content.appendChild(levelName);
            content.appendChild(starsDiv);
            content.appendChild(infoDiv);
            
            // 添加进度指示器
            const progressIndicator = document.createElement('div');
            progressIndicator.className = 'progress-indicator';
            progressIndicator.style.width = this.levelData.levels[chapter].completed ? '100%' : '0%';
            
            // 将所有元素添加到关卡项
            levelItem.appendChild(content);
            levelItem.appendChild(progressIndicator);
            
            // 关卡点击事件
            levelItem.addEventListener('click', () => {
                if (this.levelData.levels[chapter].unlocked) {
                    console.log("点击关卡:", chapter);
                    // 设置当前关卡
                    this.levelData.currentLevel = chapter;
                    this.saveLevelData();
                    
                    // 调用游戏开始函数
                    try {
                        WordGame.startLevel(chapter);
                    } catch (error) {
                        console.error("启动关卡时出错:", error);
                        WordUtils.ErrorManager.showToast("启动关卡失败，请稍后再试");
                    }
                } else {
                    WordUtils.ErrorManager.showToast('需要先完成前一关才能解锁此关卡');
                }
            });
            
            levelGrid.appendChild(levelItem);
        }
        
        // 如果当前页的关卡数少于每页显示的最大数，添加空白占位
        for (let i = endIndex - startIndex; i < this.levelsPerPage; i++) {
            const emptyItem = document.createElement('div');
            emptyItem.className = 'level-item';
            emptyItem.style.visibility = 'hidden';
            emptyItem.style.pointerEvents = 'none';
            levelGrid.appendChild(emptyItem);
        }
        
        // 保存关卡数据
        this.saveLevelData();
    },
    
    /**
     * 获取星级HTML
     * @param {number} stars - 星级数
     * @returns {string} 星级HTML
     */
    getStarsHTML(stars) {
        let html = '';
        for (let i = 1; i <= 3; i++) {
            html += `<span class="star ${i <= stars ? 'filled' : ''}">★</span>`;
        }
        return html;
    },
    
    /**
     * 更新关卡完成状态
     * @param {boolean} isWin - 是否获胜
     * @param {number} score - 获得的分数
     * @returns {boolean} 下一关是否可用
     */
    updateLevelCompletion(isWin, score) {
        const currentLevel = this.levelData.currentLevel;
        if (!currentLevel) {
            console.log("未找到当前关卡信息!");
            return false;
        }
        
        console.log("更新关卡状态:", currentLevel, "是否获胜:", isWin);
        
        const levelInfo = this.levelData.levels[currentLevel];
        if (!levelInfo) {
            console.log("未找到当前关卡数据!");
            return false;
        }
        
        let nextLevelAvailable = false;
        
        // 如果赢了，标记为完成并解锁下一关
        if (isWin) {
            console.log("获胜，更新关卡完成状态");
            levelInfo.completed = true;
            
            // 更新最高分
            if (score > levelInfo.highScore) {
                levelInfo.highScore = score;
            }
            
            // 计算星级
            const maxScore = WordGame.wordPairs.length * 30; // 理想满分
            const percentage = score / maxScore;
            
            let newStars = 0;
            if (percentage >= 0.3) newStars = 1;
            if (percentage >= 0.6) newStars = 2;
            if (percentage >= 0.8) newStars = 3;
            
            // 只更新更高的星级
            if (newStars > levelInfo.stars) {
                levelInfo.stars = newStars;
            }
            
            // 解锁下一关
            const chapters = Object.keys(WordDataLoader.excelData);
            const currentIndex = chapters.indexOf(currentLevel);
            console.log("当前关卡索引:", currentIndex, "总关卡数:", chapters.length);
            
            if (currentIndex >= 0 && currentIndex < chapters.length - 1) {
                const nextChapter = chapters[currentIndex + 1];
                console.log("尝试解锁下一关:", nextChapter);
                
                if (this.levelData.levels[nextChapter]) {
                    this.levelData.levels[nextChapter].unlocked = true;
                    console.log("成功解锁下一关!");
                    nextLevelAvailable = true;
                } else {
                    // 如果下一关卡数据不存在，创建它
                    this.levelData.levels[nextChapter] = {
                        unlocked: true,
                        completed: false,
                        stars: 0,
                        highScore: 0,
                        bestTime: 0
                    };
                    console.log("创建并解锁下一关!");
                    nextLevelAvailable = true;
                }
            } else {
                console.log("已经是最后一关或无法找到当前关卡索引");
            }
        }
        
        // 保存关卡数据
        this.saveLevelData();
        console.log("关卡数据已保存:", this.levelData);
        
        return nextLevelAvailable;
    },
    
    /**
     * 保存关卡数据
     */
    saveLevelData() {
        try {
            localStorage.setItem(WordConfig.STORAGE_KEYS.LEVEL_DATA, JSON.stringify(this.levelData));
            console.log("成功保存关卡数据");
        } catch (e) {
            console.error('保存关卡数据失败', e);
        }
    },
    
    /**
     * 加载关卡数据
     */
    loadLevelData() {
        try {
            const savedData = localStorage.getItem(WordConfig.STORAGE_KEYS.LEVEL_DATA);
            if (savedData) {
                this.levelData = JSON.parse(savedData);
                console.log("成功加载关卡数据:", this.levelData);
            } else {
                console.log("未找到保存的关卡数据，使用默认设置");
            }
        } catch (e) {
            console.error('加载关卡数据失败', e);
            this.levelData = {
                currentLevel: null,
                levels: {}
            };
        }
    },
    
    /**
     * 重置关卡数据（用于调试）
     */
    resetLevelData() {
        this.levelData = {
            currentLevel: null,
            levels: {}
        };
        this.saveLevelData();
        this.renderLevelPage();
    },
    
    /**
     * 检查指定索引的关卡是否已解锁
     * @param {number} levelIndex - 关卡的索引 (从0开始)
     * @returns {boolean} 如果关卡已解锁则返回true，否则返回false
     */
    isLevelUnlocked: function(levelKey) {
        const userType = localStorage.getItem('userType');
        const levelIndex = parseInt(levelKey);
        
        // 管理员和VIP可以访问所有关卡
        if (userType === 'admin' || userType === 'vip') {
            return true;
        }
        
        // 普通用户只能访问前5关
        return levelIndex <= 5 && this.levelData.levels[levelKey]?.unlocked;
    },
    
    loadProgress: function() {
        const savedLevel = localStorage.getItem('maxUnlockedLevel'); // 确认键名是否为 maxUnlockedLevel
        this.maxUnlockedLevel = (parseInt(savedLevel, 10) >= 0) ? parseInt(savedLevel, 10) : 0;
        // --- 添加日志 ---
        console.log(`[loadProgress] Value from localStorage: ${savedLevel}`);
        console.log(`[loadProgress] Final maxUnlockedLevel set to: ${this.maxUnlockedLevel}`);
        // --- 日志结束 ---
    },

    generateLevelButtons: function(chapters) { // 确保能获取到章节数据
        const grid = document.getElementById('level-grid');
        if (!grid) { console.error("Level grid not found!"); return; }
        grid.innerHTML = '';

        // --- 修改：从传入的参数或DataLoader获取总关卡数 ---
        const totalLevels = chapters ? chapters.length : (DataLoader.getChapters() ? DataLoader.getChapters().length : 0);
        this.totalLevels = totalLevels;
        // --- 修改结束 ---

        console.log(`[generateLevelButtons] Generating ${totalLevels} buttons. Current maxUnlockedLevel: ${this.maxUnlockedLevel}`); // 添加日志

        for (let i = 0; i < totalLevels; i++) {
            const button = document.createElement('button');
            // ... (设置 button.textContent, classList, dataset.levelIndex) ...
            button.textContent = `第 ${i + 1} 关`;
            button.classList.add('level-button', 'btn');
            button.dataset.levelIndex = i;

            // --- 添加详细日志，特别关注 i === 0 ---
            if (i === 0) {
                console.log(`[generateLevelButtons] Processing button for index 0 (First Level).`);
            }
            const isUnlocked = this.isLevelUnlocked(i); // 调用检查函数
            console.log(`[generateLevelButtons] Button index ${i}: isUnlocked = ${isUnlocked}`); // 打印检查结果

            if (isUnlocked) {
                button.classList.remove('locked');
                button.classList.add('unlocked');
                button.disabled = false;
                button.title = `开始第 ${i + 1} 关`;
                button.addEventListener('click', this.handleLevelButtonClick.bind(this)); // 绑定点击事件
                // --- 添加日志 ---
                 if (i === 0) {
                     console.log(`[generateLevelButtons] Button index 0: Set as UNLOCKED (disabled=${button.disabled}, classes=${button.className})`);
                 }
                // --- 日志结束 ---
            } else {
                button.classList.remove('unlocked');
                button.classList.add('locked');
                button.disabled = true;
                button.title = "请先完成前面的关卡";
                 // --- 添加日志 ---
                 if (i === 0) { // 这理论上不应该发生
                     console.error(`[generateLevelButtons] ERROR: Button index 0: Incorrectly set as LOCKED (disabled=${button.disabled}, classes=${button.className})`);
                 }
                // --- 日志结束 ---
            }
            // --- 日志结束 ---
            grid.appendChild(button);
        }
    },
    // 确保有一个处理按钮点击的函数
    handleLevelButtonClick: function(event) {
         const index = parseInt(event.target.dataset.levelIndex, 10);
         console.log(`[handleLevelButtonClick] Starting level ${index + 1}`);
         Game.startLevel(index); // 假设 Game 对象有 startLevel 方法
         UIManager.showScreen('game-screen');
    },
};