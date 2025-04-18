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
                const dataSource = document.getElementById('selected-source')?.value || 
                                   document.querySelector('input[name="data-source"]:checked')?.value || 
                                   'chapter';
                
                console.log("[init startBtn] 当前数据源:", dataSource);
                
                // 只有"按章节获取"才打开关卡选择界面
                if (dataSource === 'chapter') {
                    console.log("[init startBtn] 打开关卡选择界面");
                    // 隐藏开始界面
                    document.getElementById('start-screen').style.display = 'none';
                    // 隐藏游戏界面
                    document.getElementById('game-screen').style.display = 'none';
                    // 显示关卡选择界面
                    document.getElementById('level-screen').style.display = 'block';
                    
                    // 渲染关卡页面 - 确保有关卡显示
                    this.renderLevelPage();
                    this.updatePageIndicator();
                    
                    // 确保级别网格可见
                    const levelGrid = document.getElementById('level-grid');
                    if (levelGrid) {
                        levelGrid.style.display = 'grid';
                    }
                    
                    console.log("[init startBtn] 关卡选择界面已显示");
                } else {
                    // 其他数据源直接开始游戏
                    WordGame.startGame();
                }
            });
        }
        
        // 初始化其他按钮
        this.initOtherButtons();
        
        // 监听章节更新事件
        WordUtils.EventSystem.on('chapters:updated', this.handleChaptersUpdated.bind(this));
        
        // 监听级别更新事件
        WordUtils.EventSystem.on('levels:updated', this.handleLevelsUpdated.bind(this));
        
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
     * 处理级别数据更新事件
     * @param {Array} levels - 级别数据数组
     */
    handleLevelsUpdated(levels) {
        console.log('[handleLevelsUpdated] 收到级别数据更新事件', levels);
        if (!Array.isArray(levels) || levels.length === 0) return;
        
        // 可以在这里对级别数据进行处理
        // 这个函数可以扩展，根据需要处理不同格式的级别数据
    },
    
    /**
     * 处理章节数据更新事件
     * @param {Array|Object} chapters - 章节数据
     */
    handleChaptersUpdated(chapters) {
        console.log('[handleChaptersUpdated] 收到章节数据更新事件', chapters);
        
        // 尝试使用更新的章节数据生成关卡
        this.generateLevelsFromChapters();
        this.renderLevelPage();
        this.updatePageIndicator();
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
        // 获取数据源
        const dataSource = document.querySelector('input[name="data-source"]:checked')?.value || 
                          document.getElementById('selected-source')?.value || 'chapter';
        
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
                
                // 显式隐藏其他屏幕
                document.getElementById('start-screen').style.display = 'none';
                document.getElementById('game-screen').style.display = 'none';
                
                // 显式显示关卡选择屏幕
                document.getElementById('level-screen').style.display = 'block';
                
                // 渲染页面并更新页码指示器
                this.renderLevelPage();
                this.updatePageIndicator();
                
                // 确保页面元素可见
                const levelGrid = document.getElementById('level-grid');
                if (levelGrid) {
                    levelGrid.style.display = 'grid';
                }
                
                console.log("[openLevelScreen] 关卡选择界面已显示");
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
                        
                        // 显式隐藏其他屏幕
                        document.getElementById('start-screen').style.display = 'none';
                        document.getElementById('game-screen').style.display = 'none';
                        
                        // 显式显示关卡选择屏幕
                        document.getElementById('level-screen').style.display = 'block';
                        
                        // 渲染页面并更新页码指示器
                        this.renderLevelPage();
                        this.updatePageIndicator();
                        
                        console.log("[openLevelScreen] 关卡选择界面已显示");
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
                
                // 显式隐藏其他屏幕
                document.getElementById('start-screen').style.display = 'none';
                document.getElementById('game-screen').style.display = 'none';
                
                // 显式显示关卡选择屏幕
                document.getElementById('level-screen').style.display = 'block';
                
                // 渲染页面并更新页码指示器
                this.renderLevelPage();
                this.updatePageIndicator();
                
                console.log("[openLevelScreen] 关卡选择界面已显示");
            } else {
                // 如果没有上传数据，提示用户先上传数据
                WordUtils.ErrorManager.showToast('请先上传Excel文件');
            }
        } else {
            // 对于其他数据源，直接返回主菜单
            document.getElementById('start-screen').style.display = 'block';
            document.getElementById('level-screen').style.display = 'none';
            document.getElementById('game-screen').style.display = 'none';
        }
    },

    /**
     * 从章节数据生成关卡
     */
    generateLevelsFromChapters() {
        // 如果WordDataLoader可用且有章节数据，则使用它
        if (typeof WordDataLoader !== 'undefined') {
            const chapters = WordDataLoader.excelData;
            const chapterCount = Object.keys(chapters).length;
            
            console.log(`[generateLevelsFromChapters] 从WordDataLoader获取${chapterCount}个章节`);
            
            if (chapterCount > 0) {
                // 重置关卡数据
                this.levelData.levels = {};
                
                // 创建新的关卡数据
                Object.keys(chapters).forEach((chapterKey, index) => {
                    // 确保章节有一个唯一标识符
                    const levelNum = index + 1;
                    
                    // 从chapterKey中提取章节编号
                    let chapterNumber = chapterKey.match(/\d+/);
                    chapterNumber = chapterNumber ? parseInt(chapterNumber[0]) : levelNum;
                    
                    // 生成关卡数据
                    this.levelData.levels[chapterKey] = {
                        name: chapterKey,
                        displayName: chapterKey,
                        chapterNumber: chapterNumber,
                        completed: false,
                        stars: 0,
                        score: 0,
                        time: 0,
                        unlocked: index === 0 ? true : false, // 只解锁第一关
                        wordCount: chapters[chapterKey].length || 0
                    };
                });
                
                // 保存关卡数据
                this.saveLevelData();
                this.updatePagination();
                
                return;
            }
        }
        
        // 如果没有获取到章节数据，就使用默认数据
        console.log('[generateLevelsFromChapters] 没有获取到章节数据，使用默认数据');
        this.createMockLevelData();
    },

    /**
     * 更新页码指示器
     */
    updatePageIndicator() {
        const pageIndicator = document.getElementById('page-indicator');
        const prevBtn = document.getElementById('prev-page-btn');
        const nextBtn = document.getElementById('next-page-btn');
        
        if (!pageIndicator || !prevBtn || !nextBtn) {
            console.warn('[updatePageIndicator] 未找到分页按钮或页码指示器');
            return;
        }
        
        pageIndicator.textContent = `第 ${this.currentPage}/${Math.max(1, this.totalPages)} 页`;
        
        // 更新按钮状态
        prevBtn.disabled = (this.currentPage <= 1);
        nextBtn.disabled = (this.currentPage >= this.totalPages);
        
        // 如果总页数小于等于1，隐藏分页控件
        const pagination = document.querySelector('.level-pagination');
        if (pagination) {
            pagination.style.display = this.totalPages <= 1 ? 'none' : 'flex';
        }
    },
    
    /**
     * 渲染关卡页面，显示当前页中的关卡
     */
    renderLevelPage() {
        console.log(`[renderLevelPage] 开始渲染第${this.currentPage}页关卡`);
        
        // 获取关卡容器 - 先尝试使用ID选择器
        let levelGrid = document.getElementById('level-grid');
        
        // 如果没找到，尝试使用类选择器
        if (!levelGrid) {
            levelGrid = document.querySelector('.level-grid');
        }
        
        if (!levelGrid) {
            console.error('[renderLevelPage] 未找到关卡容器 #level-grid 或 .level-grid');
            return;
        }
        
        // 清空现有内容
        levelGrid.innerHTML = '';
        
        // 获取所有章节
        let chapters = [];
        if (WordDataLoader && WordDataLoader.excelData) {
            chapters = Object.keys(WordDataLoader.excelData);
        }
        
        // 检查是否有章节数据
        if (chapters.length === 0) {
            console.warn('[renderLevelPage] 没有可用的章节数据');
            levelGrid.innerHTML = `<div class="no-data-message">暂无关卡数据，请先上传章节</div>`;
            return;
        }
        
        // 确保levelGrid显示为grid布局
        levelGrid.style.display = 'grid';
        
        // 根据当前页计算起始和结束索引
        const startIdx = (this.currentPage - 1) * this.levelsPerPage;
        const endIdx = Math.min(startIdx + this.levelsPerPage, chapters.length);
        
        console.log(`[renderLevelPage] 页码: ${this.currentPage}, 显示关卡 ${startIdx} 到 ${endIdx-1}, 总关卡数: ${chapters.length}`);
        
        // 生成当前页面的关卡
        const levelsToShow = chapters.slice(startIdx, endIdx);
        
        // 创建关卡元素
        levelsToShow.forEach((chapter, index) => {
            const level = this.levelData.levels[chapter] || {
                unlocked: index === 0,
                completed: false,
                stars: 0,
                highScore: 0,
                bestTime: 0
            };
            
            // 创建关卡项目元素
            const levelItem = document.createElement('div');
            levelItem.className = 'level-item';
            levelItem.setAttribute('data-chapter', chapter);
            
            // 根据关卡状态添加类
            if (!level.unlocked) {
                levelItem.classList.add('locked');
            } else if (level.completed) {
                levelItem.classList.add('completed');
            } else {
                levelItem.classList.add('available');
            }
            
            // 创建关卡内容
            const levelNumber = startIdx + index + 1;
            
            // 构建HTML内容
            levelItem.innerHTML = `
                <div class="level-number">${levelNumber}</div>
                <div class="chapter-name">${chapter}</div>
                ${level.completed ? `
                    <div class="level-score">最高分: ${level.highScore}</div>
                    <div class="level-time">最佳时间: ${this.formatTime(level.bestTime)}</div>
                    <div class="star-rating">
                        ${this.renderStars(level.stars)}
                    </div>
                ` : ''}
                ${!level.unlocked ? '<div class="lock-icon">🔒</div>' : ''}
            `;
            
            // 添加点击事件 - 只有解锁的关卡可以点击
            if (level.unlocked) {
                levelItem.addEventListener('click', () => {
                    this.startLevel(chapter);
                });
            }
            
            // 添加到容器
            levelGrid.appendChild(levelItem);
        });
        
        // 更新分页
        this.updatePagination();
        
        console.log('[renderLevelPage] 关卡渲染完成');
    },
    
    /**
     * 格式化时间（秒转为分:秒格式）
     */
    formatTime(seconds) {
        if (!seconds) return '00:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    },
    
    /**
     * 渲染星级评分
     */
    renderStars(stars) {
        let starsHtml = '';
        for (let i = 1; i <= 3; i++) {
            if (i <= stars) {
                starsHtml += '<span class="star filled">★</span>';
            } else {
                starsHtml += '<span class="star">☆</span>';
            }
        }
        return starsHtml;
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
            // 先保存到本地存储
            localStorage.setItem(WordConfig.STORAGE_KEYS.LEVEL_DATA, JSON.stringify(this.levelData));
            
            // 判断当前关卡是否存在，如果不存在则不尝试保存到服务器
            if (!this.levelData.currentLevel) {
                console.log('[saveLevelData] 当前没有正在进行的关卡，只保存到本地');
                return;
            }
            
            // 获取当前章节的进度数据
            const levelInfo = this.levelData.levels[this.levelData.currentLevel];
            if (!levelInfo) {
                console.log(`[saveLevelData] 未找到关卡 ${this.levelData.currentLevel} 的进度数据`);
                return;
            }
            
            // 从当前关卡名称中提取章节ID（格式：第X章）
            const chapterId = this.levelData.currentLevel.replace(/第(\d+)章/, '$1');
            if (!chapterId) {
                console.log(`[saveLevelData] 无法从 ${this.levelData.currentLevel} 解析出章节ID`);
                return;
            }
            
            // 检查token，确保用户已登录
            const token = localStorage.getItem('authToken');
            if (!token) {
                console.log('[saveLevelData] 用户未登录，无法将进度保存到服务器');
                return;
            }
            
            console.log(`[saveLevelData] 尝试保存关卡 ${this.levelData.currentLevel} 的进度到服务器`, levelInfo);
            
            // 构建API URL
            const apiUrl = `${WordConfig.API.BASE_URL}/user/progress`;
            console.log(`[saveLevelData] API URL: ${apiUrl}`);
            
            // 构建请求选项
            const fetchOptions = {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache'
                },
                body: JSON.stringify({
                    chapterId: chapterId,
                    completed: levelInfo.completed,
                    stars: levelInfo.stars,
                    highScore: levelInfo.highScore,
                    bestTime: levelInfo.bestTime
                })
            };
            
            // 使用Promise.race添加超时控制
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('保存请求超时')), 5000)
            );
            
            // 发送请求到服务器保存进度
            Promise.race([
                fetch(apiUrl, fetchOptions),
                timeoutPromise
            ])
            .then(response => {
                console.log(`[saveLevelData] 收到响应状态: ${response.status} ${response.statusText}`);
                if (!response.ok) {
                    throw new Error(`保存进度失败: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                if (data && data.success) {
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
                    console.warn("[saveLevelData] 保存进度失败:", data ? data.message : "未知错误");
                }
            })
            .catch(error => {
                console.warn("[saveLevelData] 保存进度请求错误:", error);
                // 即使服务器保存失败，本地保存已经完成，不影响用户体验
            });
        } catch (e) {
            console.error('[saveLevelData] 保存关卡数据失败', e);
            // 尝试再次保存到本地，以便不丢失数据
            try {
                localStorage.setItem(WordConfig.STORAGE_KEYS.LEVEL_DATA, JSON.stringify(this.levelData));
            } catch (localError) {
                console.error('[saveLevelData] 本地保存也失败', localError);
            }
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
                // 初始化默认数据
                this.levelData = {
                    currentLevel: null,
                    levels: {}
                };
                console.log("[loadLevelData] 未找到本地保存的关卡数据，使用默认设置");
            }
            
            // 确保基础数据结构存在（即使没有服务器数据）
            this.ensureBasicLevelStructure();
            
            // 然后尝试从服务器加载数据
            const token = localStorage.getItem('authToken');
            if (token) {
                console.log("[loadLevelData] 尝试从服务器获取关卡数据");
                
                // 显示加载动画
                WordUtils.LoadingManager.show('正在加载游戏进度...');
                
                // 使用Promise.race添加超时控制
                const timeoutPromise = new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('请求超时')), 5000)
                );
                
                // 设置fetch选项
                const fetchOptions = {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                        'Cache-Control': 'no-cache', // 防止缓存
                        'Pragma': 'no-cache',
                        'Access-Control-Allow-Origin': '*'
                    },
                    mode: 'cors' // 尝试启用跨域请求
                };
                
                // 构建完整URL
                const apiUrl = `${WordConfig.API.BASE_URL}/user/progress`;
                console.log(`[loadLevelData] 请求URL: ${apiUrl}`);
                
                Promise.race([
                    fetch(apiUrl, fetchOptions),
                    timeoutPromise
                ])
                .then(response => {
                    console.log(`[loadLevelData] 收到响应状态: ${response.status} ${response.statusText}`);
                    if (!response.ok) {
                        throw new Error(`获取进度失败: ${response.status}`);
                    }
                    return response.json();
                })
                .then(data => {
                    if (data && data.success) {
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
                        this.ensureAllLevelsHaveData(serverLevelData);
                        
                        console.log("[loadLevelData] 处理后的服务器数据:", serverLevelData);
                        
                        // 更新关卡数据
                        this.levelData = serverLevelData;
                    } else {
                        console.warn("[loadLevelData] 从服务器加载数据失败:", data ? data.message : "未知错误");
                        // 确保本地数据结构完整（重要）
                        this.createMockLevelData();
                        this.ensureBasicLevelStructure();
                    }
                    
                    WordUtils.LoadingManager.hide();
                })
                .catch(error => {
                    console.warn("[loadLevelData] 从服务器加载数据错误:", error);
                    // 创建模拟数据，确保用户体验
                    this.createMockLevelData();
                    // 确保本地数据结构完整（重要）
                    this.ensureBasicLevelStructure();
                    WordUtils.LoadingManager.hide();
                    
                    // 不显示错误消息给用户，因为我们已经有本地数据作为备选
                    // 用户仍然可以使用本地关卡数据
                });
            } else {
                console.log("[loadLevelData] 用户未登录，使用本地数据");
                // 创建模拟数据
                this.createMockLevelData();
                // 确保本地数据结构完整（重要）
                this.ensureBasicLevelStructure();
            }
        } catch (e) {
            console.error('[loadLevelData] 加载关卡数据失败', e);
            // 重置关卡数据为基本结构
            this.levelData = {
                currentLevel: null,
                levels: {}
            };
            // 创建模拟数据
            this.createMockLevelData();
            // 确保本地数据结构完整（重要）
            this.ensureBasicLevelStructure();
        }
    },
    
    /**
     * 创建模拟关卡数据（当API请求失败或用户未登录时使用）
     */
    createMockLevelData() {
        // 确保有关卡数据用于展示，使用现有的WordDataLoader.excelData创建
        if (WordDataLoader && typeof WordDataLoader.generateMockLevels === 'function') {
            WordDataLoader.generateMockLevels();
        }
        
        // 如果excelData中已有章节数据，把这些章节添加到关卡结构中
        if (WordDataLoader && WordDataLoader.excelData) {
            const chapters = Object.keys(WordDataLoader.excelData);
            chapters.forEach((chapter, index) => {
                if (!this.levelData.levels[chapter]) {
                    this.levelData.levels[chapter] = {
                        unlocked: index === 0, // 第一关解锁
                        completed: false,
                        stars: 0,
                        highScore: 0,
                        bestTime: 0
                    };
                }
            });
        } else {
            // 如果没有章节数据，创建5个默认章节
            for (let i = 1; i <= 5; i++) {
                const chapterId = `第${i}章`;
                if (!this.levelData.levels[chapterId]) {
                    this.levelData.levels[chapterId] = {
                        unlocked: i === 1, // 第一关解锁
                        completed: false,
                        stars: 0,
                        highScore: 0,
                        bestTime: 0
                    };
                }
            }
        }
        
        console.log('[createMockLevelData] 创建了模拟关卡数据:', this.levelData);
    },
    
    /**
     * 确保所有从数据源加载的关卡都有基础数据结构
     * @param {Object} levelData - 关卡数据对象，默认为当前对象的levelData
     */
    ensureAllLevelsHaveData(levelData = this.levelData) {
        if (Object.keys(WordDataLoader.excelData).length > 0) {
            Object.keys(WordDataLoader.excelData).forEach((chapter, index) => {
                if (!levelData.levels[chapter]) {
                    levelData.levels[chapter] = {
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
        const chapters = Object.keys(levelData.levels);
        if (chapters.length > 0) {
            const firstChapter = chapters.sort()[0];
            levelData.levels[firstChapter].unlocked = true;
        }
    },
    
    /**
     * 确保基础关卡数据结构存在
     */
    ensureBasicLevelStructure() {
        // 如果没有levels属性，初始化为空对象
        if (!this.levelData.levels) {
            this.levelData.levels = {};
        }
        
        // 确保所有关卡都有数据
        this.ensureAllLevelsHaveData();
        
        // 保存到本地存储
        this.saveLevelData();
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

        // --- 修改：从传入的参数或WordDataLoader获取总关卡数 ---
        const totalLevels = chapters ? chapters.length : (Object.keys(WordDataLoader.excelData).length || 0);
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
     * 开始指定章节的关卡
     * @param {string} chapter - 章节名称
     */
    startLevel(chapter) {
        console.log(`[startLevel] 开始章节: ${chapter}`);
        
        // 保存当前关卡信息
        this.levelData.currentLevel = chapter;
        this.saveLevelData();
        
        try {
            // 如果存在WordGame对象，调用其startLevel方法
            if (typeof WordGame !== 'undefined' && WordGame.startLevel) {
                WordGame.startLevel(chapter);
            } else {
                console.error('[startLevel] WordGame对象或其startLevel方法不存在');
                // 作为备选方案，直接跳转到游戏页面
                window.location.href = `game.html?chapter=${encodeURIComponent(chapter)}`;
            }
        } catch (error) {
            console.error("[startLevel] 启动关卡失败", error);
            WordUtils.ErrorManager.showToast("启动关卡失败，请稍后再试");
        }
    },

    /**
     * 更新分页控件
     */
    updatePagination() {
        // 计算总页数
        let chapters = [];
        if (WordDataLoader && WordDataLoader.excelData) {
            chapters = Object.keys(WordDataLoader.excelData);
        }
        
        this.totalPages = Math.ceil(chapters.length / this.levelsPerPage);
        
        // 确保当前页在有效范围内
        if (this.currentPage < 1) this.currentPage = 1;
        if (this.currentPage > this.totalPages) this.currentPage = this.totalPages;
        
        console.log(`[updatePagination] 当前页: ${this.currentPage}, 总页数: ${this.totalPages}`);
        
        // 获取分页按钮
        const prevBtn = document.getElementById('prev-page-btn');
        const nextBtn = document.getElementById('next-page-btn');
        const pageIndicator = document.getElementById('page-indicator');
        
        if (!prevBtn || !nextBtn || !pageIndicator) {
            console.warn('[updatePagination] 未找到分页按钮或页码指示器');
            return;
        }
        
        // 更新按钮状态
        prevBtn.disabled = this.currentPage <= 1;
        nextBtn.disabled = this.currentPage >= this.totalPages;
        
        // 更新页码指示器
        pageIndicator.textContent = `第 ${this.currentPage}/${Math.max(1, this.totalPages)} 页`;
        
        // 如果总页数小于等于1，隐藏分页控件
        const pagination = document.querySelector('.level-pagination');
        if (pagination) {
            pagination.style.display = this.totalPages <= 1 ? 'none' : 'flex';
        }
    },
};