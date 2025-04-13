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
        this.loadProgress(); // 确保加载进度数据
        this.setupLevelScreenButtons();
        
        // 默认解锁第一关
        this.maxUnlockedLevel = Math.max(this.maxUnlockedLevel || 0, 0);
        
        // 重写开始游戏按钮，根据数据源决定行为
        const startBtn = document.getElementById('start-btn');
        if (startBtn) {
            startBtn.addEventListener('click', () => {
                const dataSource = document.getElementById('selected-source').value;
                
                // 只有"按章节获取"才打开关卡选择界面
                if (dataSource === 'chapter') {
                    console.log("打开关卡选择界面");
                    // 隐藏开始界面
                    document.getElementById('start-screen').style.display = 'none';
                    // 显示关卡选择界面
                    document.getElementById('level-screen').style.display = 'block';
                } else {
                    // 其他数据源直接开始游戏
                    WordGame.startGame();
                }
            });
        }
        
        // 初始化其他按钮
        this.initOtherButtons();
        
        // 监听章节更新事件
        WordUtils.EventSystem.on('chapters:updated', () => {
            this.renderLevelPage();
        });
        
        // 监听返回事件
        WordUtils.EventSystem.on('game:back', () => {
            const dataSource = document.querySelector('input[name="data-source"]:checked');
            if (!dataSource) {
                console.error('未找到选中的数据源');
                return;
            }

            const sourceValue = dataSource.value;
            // 如果是关卡模式，返回关卡选择界面
            if (sourceValue === 'chapter' || sourceValue === 'upload') {
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
     * 初始化其他按钮
     */
    initOtherButtons() {
        // 添加重置游戏按钮事件监听
        const resetBtn = document.getElementById('reset-game-btn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                // 重置游戏逻辑
                this.resetProgress();
                // 刷新页面
                window.location.reload();
            });
        }
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
        console.log("[openLevelScreen] 当前数据来源:", dataSource);
        
        // 输出用户类型和权限状态，方便调试
        const userType = localStorage.getItem('userType');
        console.log("[openLevelScreen] 当前用户类型:", userType);
        
        // 先确保加载了数据
        if (dataSource === 'chapter') {
            // 对于按章节获取，确保我们已经获取了章节数据
            const chapterSelect = document.getElementById('chapter-select');
            
            if (chapterSelect && chapterSelect.options.length > 0 && Object.keys(WordDataLoader.excelData).length > 0) {
                console.log("[openLevelScreen] 章节已加载，准备生成关卡");
                // 使用章节数据生成游戏关卡
                this.generateLevelsFromChapters();
                
                // 计算上次关卡所在的页码
                if (this.levelData.currentLevel) {
                    const chapters = Object.keys(WordDataLoader.excelData);
                    const currentIndex = chapters.indexOf(this.levelData.currentLevel);
                    if (currentIndex >= 0) {
                        this.currentPage = Math.floor(currentIndex / this.levelsPerPage) + 1;
                        console.log("[openLevelScreen] 跳转到上次关卡所在页码:", this.currentPage);
                    }
                }
                
                // 切换到关卡选择界面
                WordUI.switchScreen('level-screen');
                
                // 渲染页面并更新页码指示器
                this.renderLevelPage();
                this.updatePageIndicator();
            } else {
                console.log("[openLevelScreen] 章节未加载，尝试获取章节数据");
                // 如果章节数据未加载，先加载章节
                WordDataLoader.updateChapterSelectWithApiData().then(success => {
                    if (success) {
                        console.log("[openLevelScreen] 成功获取章节数据");
                        this.generateLevelsFromChapters();
                        
                        // 计算上次关卡所在的页码
                        if (this.levelData.currentLevel) {
                            const chapters = Object.keys(WordDataLoader.excelData);
                            const currentIndex = chapters.indexOf(this.levelData.currentLevel);
                            if (currentIndex >= 0) {
                                this.currentPage = Math.floor(currentIndex / this.levelsPerPage) + 1;
                                console.log("[openLevelScreen] 跳转到上次关卡所在页码:", this.currentPage);
                            }
                        }
                        
                        // 切换到关卡选择界面
                        WordUI.switchScreen('level-screen');
                        
                        // 渲染页面并更新页码指示器
                        this.renderLevelPage();
                        this.updatePageIndicator();
                    } else {
                        WordUtils.ErrorManager.showToast('无法从服务器获取章节数据，请稍后再试');
                    }
                }).catch(error => {
                    console.error("[openLevelScreen] 获取章节数据失败:", error);
                    WordUtils.ErrorManager.showToast('无法从服务器获取章节数据，请检查网络连接');
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
                        console.log("[openLevelScreen] 跳转到上次关卡所在页码:", this.currentPage);
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
            WordUtils.ErrorManager.showToast('请选择章节数据来源或上传Excel文件');
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
            
            // 初始化关卡数据 - 只有第一关默认解锁
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
        
        console.log(`[renderLevelPage] 渲染第${this.currentPage}页，索引范围${startIndex}-${endIndex}`);
        
        // 获取用户类型
        const userType = localStorage.getItem('userType');
        console.log(`[renderLevelPage] 当前用户类型: ${userType}`);
        
        // 预先计算最大已解锁关卡索引
        let maxUnlockedLevel = 0;
        for (let i = 0; i < chapters.length; i++) {
            const chapter = chapters[i];
            if (this.levelData.levels[chapter] && this.levelData.levels[chapter].unlocked) {
                maxUnlockedLevel = Math.max(maxUnlockedLevel, i);
            }
        }
        console.log(`[renderLevelPage] 最大已解锁关卡索引: ${maxUnlockedLevel}`);
        
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
            levelItem.dataset.index = i; // 添加索引数据
            
            // 判断此关卡是否在用户可见范围内
            let isVisible = true;
            if (userType === 'admin') {
                // 管理员可以看到所有关卡
                isVisible = true;
            } else if (userType === 'vip' || userType === 'user') {
                // VIP用户和普通用户可以看到所有关卡
                isVisible = true;
            } else {
                // 游客用户只能看到前5关
                isVisible = i < 5;
            }
            
            // 如果关卡不可见，跳过渲染
            if (!isVisible) {
                continue;
            }
            
            // 判断此关卡是否已解锁（按顺序解锁）
            let isUnlocked = false;
            if (userType === 'admin') {
                // 管理员所有关卡都已解锁
                isUnlocked = true;
            } else {
                // 其他用户需要按顺序解锁
                isUnlocked = i <= maxUnlockedLevel + 1 && (i === 0 || this.levelData.levels[chapters[i-1]].completed);
            }
            
            console.log(`[renderLevelPage] 关卡${i+1}: 可见性=${isVisible}, 解锁状态=${isUnlocked}`);
            
            // 根据解锁状态设置样式
            if (!isUnlocked) {
                levelItem.classList.add('locked');
            } else if (this.levelData.levels[chapter].completed) {
                levelItem.classList.add('completed');
            } else {
                levelItem.classList.add('available');
            }
            
            // 关卡名称（使用章节ID或序号）
            const levelNumber = i + 1;
            
            // 构建关卡内容
            const content = document.createElement('div');
            content.className = 'level-content';
            
            // 关卡名称
            const levelName = document.createElement('div');
            levelName.className = 'level-name';
            levelName.textContent = `第 ${levelNumber} 关`;
            
            // 星级评分
            const starsDiv = document.createElement('div');
            starsDiv.className = 'level-stars';
            starsDiv.innerHTML = this.getStarsHTML(this.levelData.levels[chapter].stars);
            
            // 关卡信息
            const infoDiv = document.createElement('div');
            infoDiv.className = 'level-info';
            
            if (this.levelData.levels[chapter].completed) {
                infoDiv.textContent = `最高分: ${this.levelData.levels[chapter].highScore}`;
            } else if (isUnlocked) {
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
                if (isUnlocked) {
                    console.log(`[点击关卡] 第${levelNumber}关 (${chapter}), 索引: ${i}`);
                    // 设置当前关卡
                    this.levelData.currentLevel = chapter;
                    this.saveLevelData();
                    
                    // 调用游戏开始函数
                    try {
                        WordGame.startLevel(chapter);
                    } catch (error) {
                        console.error("[启动关卡失败]", error);
                        WordUtils.ErrorManager.showToast("启动关卡失败，请稍后再试");
                    }
                } else {
                    WordUtils.ErrorManager.showToast('该关卡未解锁，请先完成前面的关卡');
                }
            });
            
            levelGrid.appendChild(levelItem);
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
            console.log("[updateLevelCompletion] 未找到当前关卡信息!");
            return false;
        }
        
        console.log("[updateLevelCompletion] 更新关卡状态:", currentLevel, "是否获胜:", isWin);
        
        const levelInfo = this.levelData.levels[currentLevel];
        if (!levelInfo) {
            console.log("[updateLevelCompletion] 未找到当前关卡数据!");
            return false;
        }
        
        let nextLevelAvailable = false;
        
        // 如果赢了，标记为完成并解锁下一关
        if (isWin) {
            console.log("[updateLevelCompletion] 获胜，更新关卡完成状态");
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
                console.log("[updateLevelCompletion] 更新星级:", newStars);
            }
            
            // 解锁下一关 (通过saveLevelData API同步到服务器)
            const chapters = Object.keys(WordDataLoader.excelData);
            const currentIndex = chapters.indexOf(currentLevel);
            console.log("[updateLevelCompletion] 当前关卡索引:", currentIndex, "总关卡数:", chapters.length);
            
            // 检查是否是最后一关
            if (currentIndex >= 0 && currentIndex < chapters.length - 1) {
                const nextChapter = chapters[currentIndex + 1];
                console.log("[updateLevelCompletion] 尝试解锁下一关:", nextChapter);
                
                // 获取用户类型，检查是否可以解锁下一关
                const userType = localStorage.getItem('userType');
                const nextIndex = currentIndex + 1;
                
                // 检查是否超出普通用户的可见范围
                if (userType !== 'admin' && userType !== 'vip' && nextIndex >= 5) {
                    console.log("[updateLevelCompletion] 普通用户无法解锁第5关以后的关卡");
                    nextLevelAvailable = false;
                } else {
                    // 本地解锁下一关，服务器端通过saveLevelData API解锁
                    if (this.levelData.levels[nextChapter]) {
                        this.levelData.levels[nextChapter].unlocked = true;
                        console.log("[updateLevelCompletion] 本地解锁下一关!");
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
                        console.log("[updateLevelCompletion] 本地创建并解锁下一关!");
                        nextLevelAvailable = true;
                    }
                }
            } else {
                console.log("[updateLevelCompletion] 已经是最后一关或无法找到当前关卡索引");
            }
        }
        
        // 保存关卡数据 (会同步到服务器)
        this.saveLevelData();
        console.log("[updateLevelCompletion] 关卡数据已保存:", this.levelData);
        
        return nextLevelAvailable;
    },
    
    /**
     * 保存关卡数据
     */
    saveLevelData() {
        try {
            // 保存到本地存储作为备份
            localStorage.setItem(WordConfig.STORAGE_KEYS.LEVEL_DATA, JSON.stringify(this.levelData));
            console.log("[saveLevelData] 成功保存关卡数据到本地");
            
            // 如果当前关卡为null，则不需要保存到服务器
            const currentLevel = this.levelData.currentLevel;
            if (!currentLevel) {
                console.log("[saveLevelData] 当前无活跃关卡，跳过服务器保存");
                return;
            }
            
            // 获取当前关卡的ID
            const chapterId = parseInt(currentLevel.match(/\d+/)?.[0]) || 0;
            if (chapterId === 0) {
                console.error("[saveLevelData] 无法解析关卡ID:", currentLevel);
                return;
            }
            
            // 获取当前关卡数据
            const levelInfo = this.levelData.levels[currentLevel];
            if (!levelInfo) {
                console.error("[saveLevelData] 未找到关卡数据:", currentLevel);
                return;
            }
            
            // 检查是否已登录
            const token = localStorage.getItem('authToken');
            if (!token) {
                console.log("[saveLevelData] 用户未登录，跳过服务器保存");
                return;
            }
            
            console.log("[saveLevelData] 正在保存关卡进度到服务器:", chapterId, levelInfo);
            
            // 发送请求到服务器保存进度
            fetch(`${WordConfig.API.BASE_URL}/user/progress`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    chapterId: chapterId,
                    completed: levelInfo.completed,
                    stars: levelInfo.stars,
                    highScore: levelInfo.highScore,
                    bestTime: levelInfo.bestTime
                })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    console.log("[saveLevelData] 保存进度成功:", data);
                    
                    // 如果服务器返回了下一关信息，更新本地数据
                    if (data.nextChapter) {
                        const nextChapter = `第${data.nextChapter}章`;
                        if (this.levelData.levels[nextChapter]) {
                            this.levelData.levels[nextChapter].unlocked = true;
                            console.log("[saveLevelData] 服务器已解锁下一关:", nextChapter);
                        } else {
                            this.levelData.levels[nextChapter] = {
                                unlocked: true,
                                completed: false,
                                stars: 0,
                                highScore: 0,
                                bestTime: 0
                            };
                            console.log("[saveLevelData] 服务器已创建并解锁下一关:", nextChapter);
                        }
                        
                        // 重新保存到本地
                        localStorage.setItem(WordConfig.STORAGE_KEYS.LEVEL_DATA, JSON.stringify(this.levelData));
                    }
                } else {
                    console.warn("[saveLevelData] 保存进度失败:", data.message);
                }
            })
            .catch(error => {
                console.error("[saveLevelData] 保存进度请求错误:", error);
            });
        } catch (e) {
            console.error('[saveLevelData] 保存关卡数据失败', e);
        }
    },
    
    /**
     * 加载关卡数据
     */
    loadLevelData() {
        try {
            // 首先从本地存储加载，作为备用
            const savedData = localStorage.getItem(WordConfig.STORAGE_KEYS.LEVEL_DATA);
            if (savedData) {
                this.levelData = JSON.parse(savedData);
                console.log("[loadLevelData] 从本地加载关卡数据:", this.levelData);
            } else {
                console.log("[loadLevelData] 未找到本地保存的关卡数据，使用默认设置");
            }
            
            // 然后尝试从服务器加载数据
            const token = localStorage.getItem('authToken');
            if (token) {
                console.log("[loadLevelData] 尝试从服务器获取关卡数据");
                
                // 显示加载动画
                WordUtils.LoadingManager.show('正在加载游戏进度...');
                
                fetch(`${WordConfig.API.BASE_URL}/user/progress`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                })
                .then(response => {
                    if (!response.ok) {
                        throw new Error('获取进度失败');
                    }
                    return response.json();
                })
                .then(data => {
                    if (data.success) {
                        console.log("[loadLevelData] 从服务器加载的数据:", data);
                        
                        // 处理权限数据
                        const permissions = data.permissions || [];
                        // 处理进度数据
                        const progressItems = data.progress || [];
                        
                        // 将服务器数据转换为levelData格式
                        const serverLevelData = {
                            currentLevel: this.levelData.currentLevel, // 保留当前关卡
                            levels: {}
                        };
                        
                        // 处理权限数据，确定每个关卡是否解锁
                        permissions.forEach(permission => {
                            const chapterId = `第${permission.category_id}章`;
                            serverLevelData.levels[chapterId] = serverLevelData.levels[chapterId] || {};
                            serverLevelData.levels[chapterId].unlocked = permission.has_access === 1;
                        });
                        
                        // 处理进度数据，确定每个关卡的完成状态和分数
                        progressItems.forEach(progressItem => {
                            const chapterId = `第${progressItem.related_id}章`;
                            serverLevelData.levels[chapterId] = serverLevelData.levels[chapterId] || {};
                            
                            // 解析进度数据
                            try {
                                const progressData = JSON.parse(progressItem.progress);
                                serverLevelData.levels[chapterId].completed = progressData.completed || false;
                                serverLevelData.levels[chapterId].stars = progressData.stars || 0;
                                serverLevelData.levels[chapterId].highScore = progressData.highScore || 0;
                                serverLevelData.levels[chapterId].bestTime = progressData.bestTime || 0;
                            } catch (e) {
                                console.error("[loadLevelData] 解析进度数据失败:", e);
                            }
                        });
                        
                        // 确保所有关卡都有基础数据结构
                        if (Object.keys(WordDataLoader.excelData).length > 0) {
                            Object.keys(WordDataLoader.excelData).forEach((chapter, index) => {
                                if (!serverLevelData.levels[chapter]) {
                                    serverLevelData.levels[chapter] = {
                                        unlocked: index === 0, // 默认只有第一关解锁
                                        completed: false,
                                        stars: 0,
                                        highScore: 0,
                                        bestTime: 0
                                    };
                                }
                            });
                        }
                        
                        // 确保第一关始终解锁
                        const chapters = Object.keys(serverLevelData.levels);
                        if (chapters.length > 0) {
                            const firstChapter = chapters.sort()[0];
                            serverLevelData.levels[firstChapter].unlocked = true;
                        }
                        
                        console.log("[loadLevelData] 处理后的服务器数据:", serverLevelData);
                        
                        // 更新关卡数据
                        this.levelData = serverLevelData;
                    } else {
                        console.warn("[loadLevelData] 从服务器加载数据失败:", data.message);
                    }
                    
                    WordUtils.LoadingManager.hide();
                })
                .catch(error => {
                    console.error("[loadLevelData] 从服务器加载数据错误:", error);
                    WordUtils.LoadingManager.hide();
                });
            } else {
                console.log("[loadLevelData] 用户未登录，使用本地数据");
            }
        } catch (e) {
            console.error('[loadLevelData] 加载关卡数据失败', e);
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
    isLevelUnlocked: function(levelIndex) {
        const userType = localStorage.getItem('userType') || 'guest';
        const maxUnlockedIndex = this.maxUnlockedLevel;
        
        console.log(`[isLevelUnlocked] 检查关卡 ${levelIndex} 是否解锁，用户类型:${userType}, 最大解锁关卡:${maxUnlockedIndex}`);
        
        // 第一关始终可用
        if (levelIndex === 0) {
            console.log('[isLevelUnlocked] 第一关始终可用');
            return true;
        }
        
        // 管理员可以看到所有关卡，且无需解锁
        if (userType === 'admin') {
            console.log(`[isLevelUnlocked] 管理员用户，关卡 ${levelIndex} 可用`);
            return true;
        } else if (userType === 'vip' || userType === 'user') {
            // VIP用户和普通用户可以看到所有关卡，但需要逐关解锁
            const isAvailable = levelIndex <= maxUnlockedIndex + 1;
            console.log(`[isLevelUnlocked] ${userType === 'vip' ? 'VIP' : '普通'}用户，关卡 ${levelIndex} ${isAvailable ? '可用' : '未解锁'}`);
            return isAvailable;
        }
        
        // 游客用户只能看到前5关
        const maxAllowedForGuest = 4; // 索引从0开始，所以是0-4共5关
        if (levelIndex <= maxAllowedForGuest) {
            // 只有已解锁的关卡或下一关才可用
            const isAvailable = levelIndex <= maxUnlockedIndex + 1;
            console.log(`[isLevelUnlocked] 游客用户，关卡 ${levelIndex} ${isAvailable ? '可用' : '未解锁'}`);
            return isAvailable;
        }
        
        console.log(`[isLevelUnlocked] 游客用户，关卡 ${levelIndex} 超出权限范围(最多5关)`);
        return false;
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
         
         // 保存所选关卡索引
         this.levelData.currentLevel = index;
         this.saveLevelData();
         
         // 隐藏关卡选择界面
         document.getElementById('level-screen').style.display = 'none';
         
         // 显示游戏界面
         document.getElementById('game-screen').style.display = 'block';
         
         // 开始游戏，基于选定的关卡
         WordGame.startGame();
    },

    /**
     * 开始指定关卡
     * @param {string} chapterName - 章节名称
     */
    startLevel: function(chapterName) {
        console.log("[startLevel] 开始关卡:", chapterName);
        
        // 设置当前关卡
        this.levelData.currentLevel = chapterName;
        this.saveLevelData();
        
        // 显示加载动画
        WordUtils.LoadingManager.show('正在加载关卡数据...');
        
        // 加载该关卡的单词数据
        WordDataLoader.loadChapterWords(chapterName)
            .then(wordPairs => {
                if (!wordPairs || wordPairs.length < 2) {
                    WordUtils.ErrorManager.showToast('无法加载关卡数据，单词数量不足');
                    WordUtils.LoadingManager.hide();
                    return;
                }
                
                console.log(`[startLevel] 成功加载关卡 ${chapterName} 的数据，单词数: ${wordPairs.length}`);
                
                // 开始游戏
                try {
                    WordGame.wordPairs = wordPairs;
                    WordGame.startGame();
                } catch (error) {
                    console.error('[startLevel] 启动游戏失败:', error);
                    WordUtils.ErrorManager.showToast('启动游戏失败，请稍后再试');
                }
            })
            .catch(error => {
                console.error('[startLevel] 加载关卡数据失败:', error);
                WordUtils.ErrorManager.showToast('加载关卡数据失败，请稍后再试');
                WordUtils.LoadingManager.hide();
            });
    },
};