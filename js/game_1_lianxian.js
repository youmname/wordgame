/**
 * 单词连连看游戏核心模块
 * 包含游戏逻辑、界面管理、路径算法和数据处理
 * 设计为模块化结构，保持代码清晰和可维护
 */

// 立即执行函数，创建模块化结构并避免全局变量污染
(function() {
    //'use strict';
    
    // 创建全局命名空间，使其他文件可以访问核心对象
    window.WordGame = {};
    
    /**
     * 工具模块 - 提供通用工具函数
     */
    const WordUtils = {
        /**
         * 事件系统 - 用于模块间通信的发布-订阅模式
         * @type {Object}
         */
        EventSystem: {
            events: {}, // 存储事件和订阅者
            
            /**
             * 订阅事件
             * @param {string} eventName - 事件名称
             * @param {Function} fn - 事件处理函数
             */
            on: function(eventName, fn) {
                this.events[eventName] = this.events[eventName] || [];
                this.events[eventName].push(fn);
            },
            
            /**
             * 取消订阅事件
             * @param {string} eventName - 事件名称
             * @param {Function} fn - 要取消的事件处理函数
             */
            off: function(eventName, fn) {
                if (this.events[eventName]) {
                    if (fn) {
                        this.events[eventName] = this.events[eventName].filter(handler => handler !== fn);
                    } else {
                        delete this.events[eventName];
                    }
                }
            },
            
            /**
             * 触发事件
             * @param {string} eventName - 事件名称
             * @param {Object} data - 事件数据
             */
            emit: function(eventName, data) {
                if (this.events[eventName]) {
                    this.events[eventName].forEach(fn => fn(data));
                }
            },
            
            /**
             * 别名：触发事件（兼容性）
             */
            trigger: function(eventName, data) {
                this.emit(eventName, data);
            }
        },
        
        /**
         * 加载管理器 - 处理游戏加载状态
         */
        LoadingManager: {
            loadingElement: null,
            
            /**
             * 初始化加载管理器
             */
            init: function() {
                // 创建加载元素（如果不存在）
                if (!this.loadingElement) {
                    this.loadingElement = document.createElement('div');
                    this.loadingElement.className = 'loading-overlay';
                    this.loadingElement.innerHTML = `
                        <div class="loading-spinner"></div>
                        <div class="loading-text">加载中...</div>
                    `;
                    
                    // 设置初始样式 - 确保默认是隐藏的
                    this.loadingElement.style.position = 'fixed';
                    this.loadingElement.style.top = '0';
                    this.loadingElement.style.left = '0';
                    this.loadingElement.style.width = '100%';
                    this.loadingElement.style.height = '100%';
                    this.loadingElement.style.backgroundColor = 'rgba(0,0,0,0.7)';
                    this.loadingElement.style.display = 'flex';
                    this.loadingElement.style.justifyContent = 'center';
                    this.loadingElement.style.alignItems = 'center';
                    this.loadingElement.style.zIndex = '9999';
                    this.loadingElement.style.opacity = '0';
                    this.loadingElement.style.visibility = 'hidden';
                    this.loadingElement.style.transition = 'opacity 0.3s, visibility 0.3s';
                    
                    document.body.appendChild(this.loadingElement);
                }
                
                // 确保初始化时是隐藏状态
                this.hide();
            },
            
            /**
             * 显示加载提示
             * @param {string} message - 加载消息
             */
            show: function(message) {
                if (!this.loadingElement) {
                    this.init();
                }
                
                const textElement = this.loadingElement.querySelector('.loading-text');
                if (textElement && message) {
                    textElement.textContent = message;
                }
                
                // 显示加载遮罩
                this.loadingElement.style.opacity = '1';
                this.loadingElement.style.visibility = 'visible';
                this.loadingElement.classList.add('active');
            },
            
            /**
             * 隐藏加载提示
             */
            hide: function() {
                if (this.loadingElement) {
                    // 隐藏加载遮罩
                    this.loadingElement.style.opacity = '0';
                    this.loadingElement.style.visibility = 'hidden';
                    this.loadingElement.classList.remove('active');
                }
            }
        },
        
        /**
         * 随机打乱数组
         * @param {Array} array - 要打乱的数组
         * @returns {Array} - 打乱后的新数组
         */
        shuffle: function(array) {
            const newArray = [...array];
            for (let i = newArray.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
            }
            return newArray;
        },
        
        /**
         * 创建DOM元素
         * @param {string} tag - 标签名
         * @param {Object} attributes - 属性对象
         * @param {string|Node|Array} children - 子元素
         * @returns {HTMLElement} - 创建的DOM元素
         */
        createElement: function(tag, attributes = {}, children = null) {
            const element = document.createElement(tag);
            
            // 设置属性
            Object.entries(attributes).forEach(([key, value]) => {
                if (key === 'class' || key === 'className') {
                    element.className = value;
                } else if (key === 'style' && typeof value === 'object') {
                    Object.assign(element.style, value);
                } else {
                    element.setAttribute(key, value);
                }
            });
            
            // 添加子元素
            if (children) {
                if (Array.isArray(children)) {
                    children.forEach(child => {
                        if (child instanceof Node) {
                            element.appendChild(child);
                        } else if (typeof child === 'string') {
                            element.appendChild(document.createTextNode(child));
                        }
                    });
                } else if (children instanceof Node) {
                    element.appendChild(children);
                } else if (typeof children === 'string') {
                    element.textContent = children;
                }
            }
            
            return element;
        },
        
        /**
         * 深度克隆对象
         * @param {Object} obj - 要克隆的对象
         * @returns {Object} - 克隆的对象
         */
        deepClone: function(obj) {
            if (obj === null || typeof obj !== 'object') {
                return obj;
            }
            
            if (Array.isArray(obj)) {
                return obj.map(item => this.deepClone(item));
            }
            
            const clonedObj = {};
            for (const key in obj) {
                if (Object.prototype.hasOwnProperty.call(obj, key)) {
                    clonedObj[key] = this.deepClone(obj[key]);
                }
            }
            
            return clonedObj;
        },
        
        /**
         * 创建防抖函数
         * @param {Function} func - 要执行的函数
         * @param {number} wait - 等待时间(ms)
         * @returns {Function} - 防抖后的函数
         */
        debounce(func, wait) {
            let timeout;
            return function(...args) {
                const context = this;
                clearTimeout(timeout);
                timeout = setTimeout(() => func.apply(context, args), wait);
            };
        }
    };
    
    // 输出到全局对象
    window.WordUtils = WordUtils;
    
    /**
     * 配置模块 - 存储游戏配置
     */
    const WordConfig = {
        DIFFICULTY: {
            EASY: {
                timeLimit: 300, // 秒
                hintLimit:10000,
                shuffleLimit: 10000,
                scoreMatch: 10,
                scoreCombo: 2,
                scoreTimeBonus: 0.5,
                scoreHintPenalty: 5
            },
            MEDIUM: {
                timeLimit: 240,
                hintLimit: 10000,
                shuffleLimit: 10000,
                scoreMatch: 20,
                scoreCombo: 5,
                scoreTimeBonus: 1,
                scoreHintPenalty: 10
            },
            HARD: {
                timeLimit: 180,
                hintLimit: 10000,
                shuffleLimit: 10000,
                scoreMatch: 30,
                scoreCombo: 10,
                scoreTimeBonus: 2,
                scoreHintPenalty: 15
            }
        },
        
        ANIMATION_SPEED: 300, // 毫秒
        
        // 示例单词数据
        SAMPLE_WORDS: [
            { id: '1', word: '1', meaning: '1' },
            { id: '2', word: '2', meaning: '2' },
            { id: '3', word: '3', meaning: '3' },
            { id: '4', word: '4', meaning: '4' },
            { id: '5', word: '5', meaning: '5' },
            { id: '6', word: '6', meaning: '6' },
            { id: '7', word: '7', meaning: '7' },
            { id: '8', word: '8', meaning: '8' },  
            { id: '9', word: '9', meaning: '9' },
            { id: '10', word: '10', meaning: '10' },
            { id: '11', word: '11', meaning: '11' },
            { id: '12', word: '12', meaning: '12' },
            { id: '13', word: '13', meaning: '13' },
            { id: '14', word: '14', meaning: '14' },
            { id: '15', word: '15', meaning: '15' },
            { id: '16', word: '16', meaning: '16' },
            { id: '17', word: '17', meaning: '17' },
            { id: '18', word: '18', meaning: '18' },
            { id: '19', word: '19', meaning: '19' },
            { id: '20', word: '20', meaning: '20' },
            { id: '21', word: '21', meaning: '21' },
            { id: '22', word: '22', meaning: '22' },
            { id: '23', word: '23', meaning: '23' },
            { id: '24', word: '24', meaning: '24' },
            { id: '25', word: '25', meaning: '25' },
            { id: '26', word: '26', meaning: '26' },
            { id: '27', word: '27', meaning: '27' },
            { id: '28', word: '28', meaning: '28' },
            { id: '29', word: '29', meaning: '29' },
            { id: '30', word: '30', meaning: '30' },
            { id: '31', word: '31', meaning: '31' },
            { id: '32', word: '32', meaning: '32' },
            
        ]
    };
    
    // 输出到全局对象
    window.WordConfig = WordConfig;
    
    /**
     * 数据加载模块 - 负责获取和处理游戏数据
     */
    const game_1WordDataLoader = {
        // 已加载的词库
        loadedWordbanks: {},
        
        // 当前使用的单词对
        currentWordPairs: [],
        
        /**
         * 初始化数据加载器
         */
        init: function() {
            console.log('数据加载模块初始化...');
            // 预加载默认词库
            this.loadSampleWords();
        },
        
        /**
         * 加载示例单词
         * @returns {Array} 单词对数组
         */
        loadSampleWords: function() {
            this.currentWordPairs = WordConfig.SAMPLE_WORDS;
            return this.currentWordPairs;
        },
        
        /**
         * 从API获取单词数据
         * @param {string} levelId - 级别ID
         * @param {string} chapterId - 章节ID
         * @returns {Promise<Array>} 单词对Promise
         */
        fetchWordData: async function(levelId, chapterId) {
            try {
                // 构建缓存键
                const cacheKey = `${levelId}_${chapterId}`;
                
                // 检查缓存
                if (this.loadedWordbanks[cacheKey]) {
                    console.log('使用缓存的单词数据');
                    this.currentWordPairs = this.loadedWordbanks[cacheKey];
                    return this.currentWordPairs;
                }
                
                // 显示加载提示
                WordUtils.LoadingManager.show('正在获取单词数据...');
                
                // 构建API URL
                const apiUrl = `/api/words?level=${levelId}&chapter=${chapterId}`;
                
                // 发起请求
                const response = await fetch(apiUrl);
                
                if (!response.ok) {
                    throw new Error(`API请求失败: ${response.status}`);
                }
                
                const data = await response.json();
                
                // 格式化数据
                const wordPairs = data.words.map(word => ({
                    id: word.id,
                    word: word.word,
                    meaning: word.meaning
                }));
                
                // 缓存数据
                this.loadedWordbanks[cacheKey] = wordPairs;
                this.currentWordPairs = wordPairs;
                
                // 隐藏加载提示
                WordUtils.LoadingManager.hide();
                
                return wordPairs;
            } catch (error) {
                console.error('获取单词数据失败:', error);
                // 隐藏加载提示
                WordUtils.LoadingManager.hide();
                
                // 失败时使用示例数据
                console.log('使用示例单词数据作为备用');
                return this.loadSampleWords();
            }
        },
        
        /**
         * 获取随机单词数据
         * @param {number} count - 单词对数量
         * @returns {Promise<Array>} 单词对Promise
         */
        fetchRandomWords: async function(count = 20) {
            try {
                // 显示加载提示
                WordUtils.LoadingManager.show('正在获取随机单词...');
                
                // 构建API URL
                const apiUrl = `/api/words/random?count=${count}`;
                
                // 发起请求
                const response = await fetch(apiUrl);
                
                if (!response.ok) {
                    throw new Error(`API请求失败: ${response.status}`);
                }
                
                const data = await response.json();
                
                // 格式化数据
                const wordPairs = data.words.map(word => ({
                    id: word.id,
                    word: word.word,
                    meaning: word.meaning
                }));
                
                this.currentWordPairs = wordPairs;
                
                // 隐藏加载提示
                WordUtils.LoadingManager.hide();
                
                return wordPairs;
            } catch (error) {
                console.error('获取随机单词失败:', error);
                // 隐藏加载提示
                WordUtils.LoadingManager.hide();
                
                // 失败时使用示例数据
                console.log('使用示例单词数据作为备用');
                return this.loadSampleWords();
            }
        },
        
        /**
         * 获取当前使用的单词对数组
         * @returns {Array} 单词对数组
         */
        getCurrentWordPairs: function() {
            return this.currentWordPairs;
        },
        
        /**
         * 按难度或标签筛选单词
         * @param {string} difficulty - 难度级别
         * @param {Array} tags - 标签数组
         * @returns {Array} 筛选后的单词对
         */
        filterWordsByDifficulty: function(difficulty, tags = []) {
            // 这里可以实现具体的筛选逻辑
            // 当前简单返回所有单词
            return this.currentWordPairs;
        }
    };
    
    // 输出到全局对象
    window.game_1WordDataLoader = game_1WordDataLoader;
    
    /**
     * 声音管理模块 - 处理游戏所有音效
     */
    const WordSoundManager = {
        // 音效对象存储
        sounds: {},
        
        // 音效文件路径
        soundFiles: {
            click: 'assets/sounds/click.mp3',
            badge_unlock: 'assets/sounds/badge_unlock.mp3',
            gameover: 'assets/sounds/gameover.mp3',
            level_complete: 'assets/sounds/level_complete.mp3',
            correct: 'assets/sounds/correct.mp3',
            incorrect: 'assets/sounds/incorrect.mp3',
            hint: 'assets/sounds/hint.mp3',
            shuffle: 'assets/sounds/shuffle.mp3',
            success: 'assets/sounds/success.mp3',
            fail: 'assets/sounds/fail.mp3',
            win: 'assets/sounds/win.mp3',
        },
        
        // 是否静音
        isMuted: false,
        
        /**
         * 初始化音效管理器
         */
        init() {
            console.log('音效管理器初始化...');
            
            // 预加载所有音效
            this.preloadSounds();
            
            // 初始化静音按钮
            this.initMuteButton();
            
            console.log('音效管理器初始化完成');
        },
        
        /**
         * 预加载音效文件
         */
        preloadSounds() {
            try {
                // 为每个音效创建Audio对象
                Object.keys(this.soundFiles).forEach(key => {
                    const audio = new Audio(this.soundFiles[key]);
                    audio.preload = 'auto';
                    
                    // 存储音效对象
                    this.sounds[key] = audio;
                    
                    // 添加错误处理
                    audio.addEventListener('error', (e) => {
                        console.warn(`音效 "${key}" 加载失败:`, e);
                        
                        // 创建备用音效对象
                        this.sounds[key] = {
                            play: function() {
                                console.log(`播放音效(备用): ${key}`);
                            }
                        };
                    });
                });
                
                console.log('音效预加载完成');
            } catch (e) {
                console.error('音效预加载失败:', e);
                
                // 创建备用音效对象
                Object.keys(this.soundFiles).forEach(key => {
                    this.sounds[key] = {
                        play: function() {
                            console.log(`播放音效(备用): ${key}`);
                        }
                    };
                });
            }
        },
        
        /**
         * 初始化静音按钮
         */
        initMuteButton() {
            const muteBtn = document.getElementById('mute-btn');
            if (muteBtn) {
                // 设置初始状态
                this.updateMuteButton(muteBtn);
                
                // 添加点击事件
                muteBtn.addEventListener('click', () => {
                    this.toggleMute();
                    this.updateMuteButton(muteBtn);
                });
            }
        },
        
        /**
         * 更新静音按钮状态
         * @param {HTMLElement} button - 静音按钮元素
         */
        updateMuteButton(button) {
            if (this.isMuted) {
                button.classList.add('muted');
                button.setAttribute('title', '开启音效');
            } else {
                button.classList.remove('muted');
                button.setAttribute('title', '关闭音效');
            }
        },
        
        /**
         * 播放指定音效
         * @param {string} soundName - 音效名称
         */
        play(soundName) {
            // 如果已静音或音效不存在，不播放
            if (this.isMuted || !this.sounds[soundName]) {
                return;
            }
            
            try {
                const sound = this.sounds[soundName];
                
                // 判断是否为Audio对象
                if (sound instanceof Audio) {
                    // 重置到开始位置
                    sound.currentTime = 0;
                    
                    // 尝试播放
                    sound.play().catch(e => {
                        console.warn(`音效 "${soundName}" 播放失败:`, e);
                    });
                } else {
                    // 使用备用方法
                    sound.play();
                }
                
                console.log(`播放音效: ${soundName}`);
            } catch (e) {
                console.error(`音效 "${soundName}" 播放出错:`, e);
            }
        },
        
        /**
         * 切换静音状态
         * @returns {boolean} - 当前静音状态
         */
        toggleMute() {
            this.isMuted = !this.isMuted;
            console.log(`音效已${this.isMuted ? '关闭' : '开启'}`);
            return this.isMuted;
        },
        
        /**
         * 设置静音状态
         * @param {boolean} muted - 是否静音
         */
        setMute(muted) {
            this.isMuted = !!muted;
            
            // 更新静音按钮
            const muteBtn = document.getElementById('mute-btn');
            if (muteBtn) {
                this.updateMuteButton(muteBtn);
            }
            
            console.log(`音效已${this.isMuted ? '关闭' : '开启'}`);
        }
    };
    
    // 输出到全局对象
    window.WordSoundManager = WordSoundManager;
    
    /**
     * 改进的路径查找模块
     */
    const ImprovedPathFinder = {
        // 游戏板矩阵 (0=可通过, 1=有卡片)
        grid: null,
        
        // 实际游戏板尺寸
        boardSize: 0,
        
        // 扩展边界大小 (每边额外添加的单元格数)
        borderSize: 2,
        
        // 调试模式
        debug: true,
        
        /**
         * 初始化路径查找器
         * @param {number} boardSize - 游戏板尺寸
         * @param {Array} cards - 卡片元素数组
         */
        init(boardSize, cards) {
            this.boardSize = boardSize;
            
            // 创建扩展边界的网格 (boardSize + 2*borderSize)
            const gridSize = boardSize + 2 * this.borderSize;
            this.grid = Array(gridSize).fill().map(() => Array(gridSize).fill(0));
            
            // 将卡片位置标记为1
            cards.forEach(card => {
                if (!card.classList.contains('matched') && !card.classList.contains('empty-card')) {
                    const row = parseInt(card.dataset.row) + this.borderSize;
                    const col = parseInt(card.dataset.col) + this.borderSize;
                    this.grid[row][col] = 1;
                }
            });
            
            if (this.debug) {
                console.log('路径查找器初始化完成，网格大小:', gridSize, '×', gridSize);
                this.printGrid();
            }
        },
        
        /**
         * 更新卡片状态
         * @param {HTMLElement} card - 卡片元素
         * @param {boolean} matched - 是否已匹配
         */
        updateCardState(card, matched) {
            const row = parseInt(card.dataset.row) + this.borderSize;
            const col = parseInt(card.dataset.col) + this.borderSize;
            
            // 匹配后的卡片标记为可通过(0)
            this.grid[row][col] = matched ? 0 : 1;
            
            if (this.debug) {
                console.log(`更新卡片状态: (${row-this.borderSize},${col-this.borderSize}) 设为 ${matched ? '已匹配' : '未匹配'}`);
            }
        },
        
        /**
         * 检查两张卡片是否可连接
         * @param {number} row1 - 第一张卡片的行
         * @param {number} col1 - 第一张卡片的列
         * @param {number} row2 - 第二张卡片的行
         * @param {number} col2 - 第二张卡片的列
         * @returns {Array|null} - 连接路径或null
         */
        findPath(row1, col1, row2, col2) {
            // 转换为扩展网格中的位置
            const p1 = {
                row: row1 + this.borderSize,
                col: col1 + this.borderSize
            };
            
            const p2 = {
                row: row2 + this.borderSize,
                col: col2 + this.borderSize
            };
            
            if (this.debug) {
                console.log(`寻找路径: (${row1},${col1}) 到 (${row2},${col2})`);
                console.log(`扩展网格位置: (${p1.row},${p1.col}) 到 (${p2.row},${p2.col})`);
            }
            
            // 检查直线连接
            const directPath = this.checkDirectPath(p1, p2);
            if (directPath) {
                if (this.debug) console.log("找到直线路径:", directPath);
                return this.convertPath(directPath);
            }
            
            // 检查一次拐弯连接
            const oneCornerPath = this.checkOneCornerPath(p1, p2);
            if (oneCornerPath) {
                if (this.debug) console.log("找到一次拐弯路径:", oneCornerPath);
                return this.convertPath(oneCornerPath);
            }
            
            // 检查两次拐弯连接
            const twoCornerPath = this.checkTwoCornerPath(p1, p2);
            if (twoCornerPath) {
                if (this.debug) console.log("找到两次拐弯路径:", twoCornerPath);
                return this.convertPath(twoCornerPath);
            }
            
            if (this.debug) {
                console.log(`未找到从 (${row1},${col1}) 到 (${row2},${col2}) 的路径`);
            }
            
            return null;
        },
        
        /**
         * 将内部网格坐标转换为游戏板坐标
         * @param {Array} path - 内部路径
         * @returns {Array} - 转换后的路径
         */
        convertPath(path) {
            return path.map(point => ({
                row: point.row - this.borderSize,
                col: point.col - this.borderSize
            }));
        },
        
        /**
         * 检查直线路径
         * @param {Object} p1 - 起点
         * @param {Object} p2 - 终点
         * @returns {Array|null} - 路径或null
         */
        checkDirectPath(p1, p2) {
            // 如果不在同一行也不在同一列，不可能直线连接
            if (p1.row !== p2.row && p1.col !== p2.col) return null;
            
            // 检查同行
            if (p1.row === p2.row) {
                const row = p1.row;
                const minCol = Math.min(p1.col, p2.col);
                const maxCol = Math.max(p1.col, p2.col);
                
                // 检查中间是否有障碍
                for (let col = minCol + 1; col < maxCol; col++) {
                    if (this.grid[row][col] === 1) return null;
                }
                
                return [p1, p2];
            }
            
            // 检查同列
            if (p1.col === p2.col) {
                const col = p1.col;
                const minRow = Math.min(p1.row, p2.row);
                const maxRow = Math.max(p1.row, p2.row);
                
                // 检查中间是否有障碍
                for (let row = minRow + 1; row < maxRow; row++) {
                    if (this.grid[row][col] === 1) return null;
                }
                
                return [p1, p2];
            }
            
            return null;
        },
        
        /**
         * 检查一次拐弯路径
         * @param {Object} p1 - 起点
         * @param {Object} p2 - 终点
         * @returns {Array|null} - 路径或null
         */
        checkOneCornerPath(p1, p2) {
            // 尝试两个可能的拐点
            const corner1 = { row: p1.row, col: p2.col };
            const corner2 = { row: p2.row, col: p1.col };
            
            // 检查拐点1是否可行
            if (this.grid[corner1.row][corner1.col] === 0) {
                const path1 = this.checkDirectPath(p1, corner1);
                const path2 = this.checkDirectPath(corner1, p2);
                
                if (path1 && path2) {
                    return [p1, corner1, p2];
                }
            }
            
            // 检查拐点2是否可行
            if (this.grid[corner2.row][corner2.col] === 0) {
                const path1 = this.checkDirectPath(p1, corner2);
                const path2 = this.checkDirectPath(corner2, p2);
                
                if (path1 && path2) {
                    return [p1, corner2, p2];
                }
            }
            
            return null;
        },
        
        /**
         * 检查两次拐弯路径
         * @param {Object} p1 - 起点
         * @param {Object} p2 - 终点
         * @returns {Array|null} - 路径或null
         */
        checkTwoCornerPath(p1, p2) {
            const gridSize = this.grid.length;
            
            // 尝试所有可能的中间行
            for (let row = 0; row < gridSize; row++) {
                // 跳过与p1和p2相同的行
                if (row === p1.row || row === p2.row) continue;
                
                const corner1 = { row: row, col: p1.col };
                const corner2 = { row: row, col: p2.col };
                
                // 检查两个拐点是否都可通行
                if (this.grid[corner1.row][corner1.col] === 0 && 
                    this.grid[corner2.row][corner2.col] === 0) {
                    
                    // 检查三段路径是否都通畅
                    const path1 = this.checkDirectPath(p1, corner1);
                    const path2 = this.checkDirectPath(corner1, corner2);
                    const path3 = this.checkDirectPath(corner2, p2);
                    
                    if (path1 && path2 && path3) {
                        return [p1, corner1, corner2, p2];
                    }
                }
            }
            
            // 尝试所有可能的中间列
            for (let col = 0; col < gridSize; col++) {
                // 跳过与p1和p2相同的列
                if (col === p1.col || col === p2.col) continue;
                
                const corner1 = { row: p1.row, col: col };
                const corner2 = { row: p2.row, col: col };
                
                // 检查两个拐点是否都可通行
                if (this.grid[corner1.row][corner1.col] === 0 && 
                    this.grid[corner2.row][corner2.col] === 0) {
                    
                    // 检查三段路径是否都通畅
                    const path1 = this.checkDirectPath(p1, corner1);
                    const path2 = this.checkDirectPath(corner1, corner2);
                    const path3 = this.checkDirectPath(corner2, p2);
                    
                    if (path1 && path2 && path3) {
                        return [p1, corner1, corner2, p2];
                    }
                }
            }
            
            return null;
        },
        
        /**
         * 查找一对可连接的卡片（用于提示）
         * @returns {Object|null} - 包含卡片和路径的对象，或null
         */
        findConnectablePair() {
            // 收集所有未匹配的卡片
            const unmatchedCards = [];
            
            for (let row = 0; row < this.boardSize; row++) {
                for (let col = 0; col < this.boardSize; col++) {
                    const rowIndex = row + this.borderSize;
                    const colIndex = col + this.borderSize;
                    
                    // 跳过空位置或可通行位置
                    if (this.grid[rowIndex][colIndex] !== 1) continue;
                    
                    // 找到对应的DOM元素
                    const card = document.querySelector(`.card[data-row="${row}"][data-col="${col}"]:not(.matched)`);
                    if (card) {
                        unmatchedCards.push({
                            row: row,
                            col: col,
                            id: card.dataset.id,
                            type: card.dataset.type,
                            element: card
                        });
                    }
                }
            }
            
            // 随机打乱卡片顺序
            unmatchedCards.sort(() => Math.random() - 0.5);
            
            // 查找可连接的对
            for (let i = 0; i < unmatchedCards.length; i++) {
                for (let j = i + 1; j < unmatchedCards.length; j++) {
                    const card1 = unmatchedCards[i];
                    const card2 = unmatchedCards[j];
                    
                    // 检查ID是否相同但类型不同（单词与含义配对）
                    if (card1.id === card2.id && card1.type !== card2.type) {
                        // 寻找连接路径
                        const path = this.findPath(card1.row, card1.col, card2.row, card2.col);
                        
                        if (path) {
                            return {
                                card1: card1,
                                card2: card2,
                                path: path
                            };
                        }
                    }
                }
            }
            
            return null;
        },
        
        /**
         * 检查游戏板上是否还有可连接的卡片对
         * @returns {boolean} - 是否有可连接的对
         */
        checkForPossibleMatches() {
            return this.findConnectablePair() !== null;
        },
        
        /**
         * 绘制连接路径
         * @param {Array} path - 路径点数组
         * @param {HTMLElement} boardElement - 游戏板元素
         */
        drawPath(path, boardElement) {
            if (this.debug) {
                console.log("绘制路径:", path);
            }
            
            // 移除现有连接线
            const existingCanvas = boardElement.querySelector('.connector-canvas');
            if (existingCanvas) existingCanvas.remove();
            
            // 创建Canvas元素
            const canvas = document.createElement('canvas');
            canvas.className = 'connector-canvas';
            canvas.width = boardElement.offsetWidth;
            canvas.height = boardElement.offsetHeight;
            canvas.style.position = 'absolute';
            canvas.style.top = '0';
            canvas.style.left = '0';
            canvas.style.pointerEvents = 'none';
            canvas.style.zIndex = '100';
            
            boardElement.appendChild(canvas);
            
            const ctx = canvas.getContext('2d');
            
            // 获取游戏板的位置信息
            const boardRect = boardElement.getBoundingClientRect();
            
            // 计算所有点的坐标
            const pointCoords = [];
            
            // 计算路径上每个点的精确坐标
            for (let i = 0; i < path.length; i++) {
                const point = path[i];
                let x, y;
                
                // 尝试获取当前点对应的卡片
                const card = document.querySelector(`.card[data-row="${point.row}"][data-col="${point.col}"]`);
                
                if (card) {
                    // 如果是卡片位置，使用卡片中心点
                    const cardRect = card.getBoundingClientRect();
                    x = cardRect.left + cardRect.width/2 - boardRect.left;
                    y = cardRect.top + cardRect.height/2 - boardRect.top;
                } else {
                    // 如果是拐点（非卡片位置），精确计算拐点坐标
                    const cardSize = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--card-size')) || 80;
                    const gap = 10; // 卡片间距
                    
                    // 使用游戏板上的其他卡片作为参考确定网格位置
                    const refCards = Array.from(document.querySelectorAll('.card:not(.matched)'));
                    
                    if (refCards.length > 0) {
                        // 查找离拐点最近的参考卡片
                        let refCard = null;
                        let minDistance = Infinity;
                        
                        for (const card of refCards) {
                            const cardRow = parseInt(card.dataset.row);
                            const cardCol = parseInt(card.dataset.col);
                            const distance = Math.abs(cardRow - point.row) + Math.abs(cardCol - point.col);
                            
                            if (distance < minDistance) {
                                minDistance = distance;
                                refCard = card;
                            }
                        }
                        
                        if (refCard) {
                            const refRect = refCard.getBoundingClientRect();
                            const refRow = parseInt(refCard.dataset.row);
                            const refCol = parseInt(refCard.dataset.col);
                            
                            // 根据参考卡片计算拐点位置
                            const rowDiff = point.row - refRow;
                            const colDiff = point.col - refCol;
                            
                            // 计算拐点位置
                            x = refRect.left + refRect.width/2 - boardRect.left + colDiff * (cardSize + gap);
                            y = refRect.top + refRect.height/2 - boardRect.top + rowDiff * (cardSize + gap);
                        } else {
                            // 回退方法：基于游戏板尺寸计算位置
                            const totalRows = this.boardSize + 2 * this.borderSize;
                            const totalCols = this.boardSize + 2 * this.borderSize;
                            const gridUnitWidth = boardElement.offsetWidth / totalCols;
                            const gridUnitHeight = boardElement.offsetHeight / totalRows;
                            
                            x = point.col * gridUnitWidth + gridUnitWidth/2;
                            y = point.row * gridUnitHeight + gridUnitHeight/2;
                        }
                    } else {
                        // 如果没有参考卡片，使用简单的网格估计
                        const totalRows = this.boardSize + 2 * this.borderSize;
                        const totalCols = this.boardSize + 2 * this.borderSize;
                        const gridUnitWidth = boardElement.offsetWidth / totalCols;
                        const gridUnitHeight = boardElement.offsetHeight / totalRows;
                        
                        x = point.col * gridUnitWidth + gridUnitWidth/2;
                        y = point.row * gridUnitHeight + gridUnitHeight/2;
                    }
                }
                
                pointCoords.push({x, y});
                
                if (this.debug) {
                    console.log(`路径点 ${i}: 网格位置(${point.row},${point.col}), 画布坐标(${x.toFixed(1)},${y.toFixed(1)})`);
                }
            }
            
            // 创建渐变色
            // const gradient = ctx.createLinearGradient(
            //     pointCoords[0].x, pointCoords[0].y,
            //     pointCoords[pointCoords.length-1].x, pointCoords[pointCoords.length-1].y
            // );
            // gradient.addColorStop(0, '#ff3366');  // 更亮的粉红色开始
            // gradient.addColorStop(0.5, '#ffcc33'); // 黄色中间过渡
            // gradient.addColorStop(1, '#33ccff');  // 蓝色结束
            
            // 设置线条样式
            ctx.strokeStyle = '#33ccff';
            ctx.lineWidth = 8;  // 加粗线条
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            
            // 给线条添加阴影
            ctx.shadowColor = 'rgba(252, 252, 252, 0.8)';
            ctx.shadowBlur = 15;  // 增强阴影模糊效果
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;
            
            // 绘制路径线段
            ctx.beginPath();
            ctx.moveTo(pointCoords[0].x, pointCoords[0].y);
            
            // 逐点绘制，确保线条准确跟随路径
            for (let i = 1; i < pointCoords.length; i++) {
                ctx.lineTo(pointCoords[i].x, pointCoords[i].y);
            }
            
            // 绘制线条
            ctx.stroke();
            
            // 重置阴影设置以绘制点
            ctx.shadowBlur = 0;
            
            // 绘制点
            for (let i = 0; i < pointCoords.length; i++) {
                const grd = ctx.createRadialGradient(
                    pointCoords[i].x, pointCoords[i].y, 0,
                    pointCoords[i].x, pointCoords[i].y, 6
                );
                grd.addColorStop(0, 'rgba(252, 252, 252, 0.8)');
                grd.addColorStop(0.5, 'rgba(252, 252, 252, 0.8)');
                
                ctx.fillStyle = grd;
                ctx.beginPath();
                ctx.arc(pointCoords[i].x, pointCoords[i].y, 6, 0, Math.PI * 2);
                ctx.fill();
                
                // 添加发光效果
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(pointCoords[i].x, pointCoords[i].y, 8, 0, Math.PI * 2);
                ctx.stroke();
            }
            
            // 设置定时器移除连接线
            setTimeout(() => {
                canvas.remove();
            }, 1000);
        },
        
        /**
         * 打印当前网格状态（调试用）
         */
        printGrid() {
            if (!this.debug) return;
            
            console.log('当前网格状态:');
            for (let row = 0; row < this.grid.length; row++) {
                console.log(this.grid[row].join(' '));
            }
        },
        
        /**
         * 开启或关闭调试模式
         * @param {boolean} enable - 是否启用调试
         */
        setDebug(enable) {
            this.debug = enable;
            console.log(`路径查找器调试模式: ${enable ? '开启' : '关闭'}`);
        }
    };
    
    // 输出到全局对象
    window.ImprovedPathFinder = ImprovedPathFinder;
    
    /**
     * 游戏板模块 - 负责创建和管理游戏板
     */
    const WordBoard = {
        // 游戏板DOM元素
        boardElement: null,
        boardContainer: null,
        
        // 游戏板数据
        boardMatrix: [],
        boardSize: 0,
        
        // 网格参数
        columns: 0, // 动态计算
        rows: 0,    // 动态计算
        cardSize: 0,
        gap: 10,    // 卡片间距
        
        // 连接线
        connectors: [],
        
        // 当前选中的卡片
        firstSelection: null,
        secondSelection: null,

        // 添加动画控制标志
        animationInProgress: false,
        isShuffling: false,  // 洗牌动画控制标志
        
        /**
         * 初始化游戏
         * @param {number} size - 游戏板大小（不再用于设置行列数）
         */
        init(size) {
            this.boardSize = size || 6; // 仅用于兼容性，不再用于设置行列数
            this.boardElement = document.getElementById('game-board');
            this.boardContainer = document.getElementById('game-board-container');
            this.loadingElement = document.getElementById('loading-overlay');
            
            if (!this.boardElement || !this.boardContainer) {
                console.error('找不到游戏板元素');
                return;
            }
            
            // 开启路径查找器调试模式
            if (window.ImprovedPathFinder) {
                ImprovedPathFinder.setDebug(true);
            }
            
            // 清空游戏板
            this.boardElement.innerHTML = '';
            
            // 初始化游戏板矩阵
            this.initBoardMatrix();
            
            // 重置选择状态
            this.firstSelection = null;
            this.secondSelection = null;
            this.animationInProgress = false;
            this.isShuffling = false;
            
            // 重置连接线
            this.connectors = [];
            
            // 设置初始卡片大小
            this.cardSize = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--card-size')) || 80;
            
            // 添加窗口大小变化监听器
            this.addResizeListener();
            
            // 保存容器初始尺寸
            this.cachedContainerWidth = this.boardContainer.clientWidth;
            this.cachedContainerHeight = this.boardContainer.clientHeight;
            
            console.log('游戏板初始化完成');
        },
        
        /**
         * 计算最佳卡片尺寸
         */
        calculateCardSize() {
            // console.log('计算卡片尺寸');
            
            // 保存当前容器尺寸状态，用于后续比较
            const containerWidth = this.boardContainer.clientWidth;
            const containerHeight = this.boardContainer.clientHeight;
            // console.log(`容器尺寸: ${containerWidth}px × ${containerHeight}px`);
            
            // 如果已经有缓存的尺寸，且尺寸变化不大(小于5%)，直接使用已计算的值
            if (this.cachedContainerWidth && this.cachedContainerHeight && this.cachedCardSize) {
                const widthDiff = Math.abs(containerWidth - this.cachedContainerWidth) / this.cachedContainerWidth;
                const heightDiff = Math.abs(containerHeight - this.cachedContainerHeight) / this.cachedContainerHeight;
                
                if (widthDiff < 0.05 && heightDiff < 0.05) {
                    // console.log(`使用缓存的卡片尺寸: ${this.cachedCardSize}px (容器尺寸变化较小)`);
                    this.cardSize = this.cachedCardSize;
                    return this.cardSize;
                }
            }
            
            // 网格参数信息
            // console.log(`网格参数: ${this.rows}行 × ${this.columns}列, 间距: ${this.gap}px`);
            
            // 计算每张卡片可用的最大宽度和高度
            // 注意：需要减去两边的间距
            const availableWidth = (containerWidth - this.gap * (this.columns + 1)) / this.columns;
            const availableHeight = (containerHeight - this.gap * (this.rows + 1)) / this.rows;
            // console.log(`每卡可用空间: 宽度=${availableWidth.toFixed(2)}px, 高度=${availableHeight.toFixed(2)}px`);
            
            const standardCardSize = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--card-size')) || 100;
            // console.log(`标准卡片尺寸: ${standardCardSize}px`);
            
            // 使用宽度和高度的较小值确保卡片能够适应盒子
            const calculatedSize = Math.floor(Math.min(availableWidth, availableHeight));
            // console.log(`计算出的卡片尺寸: ${calculatedSize}px (标准尺寸的${(calculatedSize/standardCardSize*100).toFixed(1)}%)`);
            
            // 如果计算的尺寸小于最小可接受尺寸，显示警告
            const minAcceptableSize = 40;
            if (calculatedSize < minAcceptableSize) {
                console.warn(`警告：计算的卡片尺寸 (${calculatedSize}px) 过小，可能影响游戏体验!`);
            }
            
            // 确定限制因素
            let limitingFactor = '';
            if (availableWidth <= availableHeight) {
                limitingFactor = '宽度';
                // console.log(`限制因素: 宽度 (宽度=${availableWidth.toFixed(2)}px < 高度=${availableHeight.toFixed(2)}px)`);
            } else {
                limitingFactor = '高度';
                // console.log(`限制因素: 高度 (高度=${availableHeight.toFixed(2)}px <= 宽度=${availableWidth.toFixed(2)}px)`);
            }
            
            // 输出额外的容器样式信息，帮助调试
            const style = window.getComputedStyle(this.boardContainer);
            // console.log(`容器计算样式详情:`);
            // console.log(`- padding: ${style.paddingTop} ${style.paddingRight} ${style.paddingBottom} ${style.paddingLeft}`);
            // console.log(`- border: ${style.borderTopWidth} ${style.borderRightWidth} ${style.borderBottomWidth} ${style.borderLeftWidth}`);
            // console.log(`- box-sizing: ${style.boxSizing}`);
            // console.log(`- margin: ${style.marginTop} ${style.marginRight} ${style.marginBottom} ${style.marginLeft}`);
            // console.log(`- width/height: ${style.width}/${style.height}`);
            
            // 缓存当前计算值，避免不必要的重复计算
            this.cardSize = calculatedSize;
            this.cachedContainerWidth = containerWidth;
            this.cachedContainerHeight = containerHeight;
            this.cachedCardSize = calculatedSize;
            this.cachedLimitingFactor = limitingFactor;
            
            return this.cardSize;
        },
        
        /**
         * 计算最佳网格尺寸
         * 该方法尝试找到最优的行列数和卡片尺寸，遵循以下原则：
         * 1. 优先使用标准尺寸(80px)的卡片
         * 2. 如果标准尺寸放不下所有卡片，尝试逐渐缩小尺寸
         * 3. 确保布局均衡，尽量接近容器的宽高比
         * 4. 确保卡片尺寸不小于最小可接受值(60px)
         * 
         * @param {number} cardCount - 需要放置的卡片总数
         */
        calculateOptimalGridSize(cardCount) {
            // console.group('计算最佳网格尺寸');
            
            // ====== 第1步：获取容器信息 ======
            // 获取容器尺寸和样式信息，用于计算可用空间
            const containerWidth = this.boardContainer.clientWidth;
            const containerHeight = this.boardContainer.clientHeight;
            const containerRatio = containerWidth / containerHeight; // 容器宽高比，用于评估布局均衡性
            
            // 记录容器的详细信息，用于调试
            const containerStyle = window.getComputedStyle(this.boardContainer);
            // console.log('容器详细参数:');
            // console.log(`- 元素ID: ${this.boardContainer.id}`);
            // console.log(`- clientWidth × clientHeight: ${containerWidth}px × ${containerHeight}px`);
            // console.log(`- offsetWidth × offsetHeight: ${this.boardContainer.offsetWidth}px × ${this.boardContainer.offsetHeight}px`);
            // console.log(`- scrollWidth × scrollHeight: ${this.boardContainer.scrollWidth}px × ${this.boardContainer.scrollHeight}px`);
            // console.log(`- getBoundingClientRect(): width=${this.boardContainer.getBoundingClientRect().width}px, height=${this.boardContainer.getBoundingClientRect().height}px`);
            // console.log(`- CSS width/height: ${containerStyle.width}/${containerStyle.height}`);
            // console.log(`- 显示模式: ${containerStyle.display}, 定位: ${containerStyle.position}`);
            // console.log(`- padding: ${containerStyle.padding}, border: ${containerStyle.border}, margin: ${containerStyle.margin}`);
            // console.log(`- box-sizing: ${containerStyle.boxSizing}`);
            // console.log(`- 容器宽高比: ${containerRatio.toFixed(2)}`);
            
            // ====== 第2步：确定标准卡片尺寸 ======
            // 从CSS变量获取标准卡片尺寸，如果获取失败则默认为80px
            const standardCardSize = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--card-size')) || 80;
            // console.log(`标准卡片尺寸: ${standardCardSize}px (最大允许尺寸)`);
            
            // 卡片之间的间隙，影响可放置的卡片数量
            const gap = this.gap;
            
            // ====== 第3步：检查标准尺寸是否足够 ======
            // 计算使用标准尺寸时能放置的最大行列数和卡片总数
            const maxColsAtStandardSize = Math.floor((containerWidth - gap) / (standardCardSize + gap));
            const maxRowsAtStandardSize = Math.floor((containerHeight - gap) / (standardCardSize + gap));
            const maxCardsAtStandardSize = maxColsAtStandardSize * maxRowsAtStandardSize;
            
            // console.log(`以标准尺寸(${standardCardSize}px)计算: 容器最多容纳 ${maxColsAtStandardSize}列 × ${maxRowsAtStandardSize}行 = ${maxCardsAtStandardSize}张卡片`);
            // console.log(`需要放置的卡片数量: ${cardCount}张`);
            
            // 初始化最佳布局记录
            let bestLayout = {
                rows: 0,
                cols: 0,
                cardSize: 0,
                score: -Infinity
            };
            
            // ====== 第4步：如果标准尺寸能放下所有卡片，寻找最均衡布局 ======
            if (maxCardsAtStandardSize >= cardCount) {
                // console.log('✓ 标准尺寸能容纳所有卡片，尝试找最佳布局');
                
                // 4.1 尝试不同的行列组合，找出最均衡的布局
                const layouts = [];
                
                // 尝试从1行到maxRows的所有行数
                for (let rows = 1; rows <= maxRowsAtStandardSize; rows++) {
                    // 根据行数和卡片总数计算需要的列数
                    const cols = Math.ceil(cardCount / rows); // 向上取整确保能放下所有卡片
                    
                    // 如果计算出的列数不超过容器能放置的最大列数，则为有效布局
                    if (cols <= maxColsAtStandardSize) {
                        // 4.2 计算布局评分参数
                        
                        // 均衡度 - 衡量行列比与容器宽高比的接近程度
                        // 值越大表示布局越均衡（最大为1）
                        const balanceScore = 1 / (1 + Math.abs(cols/rows - containerRatio));
                        
                        // 空间利用率 - 卡片总面积占容器面积的比例
                        // 值越大表示空间利用越充分
                        const spaceUtilization = (cols * rows * standardCardSize * standardCardSize) / (containerWidth * containerHeight);
                        
                        // 综合评分 - 标准尺寸时均衡度更重要
                        // 均衡度权重为2，空间利用率权重为1
                        const totalScore = balanceScore * 2 + spaceUtilization;
                        
                        // 记录此布局
                        layouts.push({
                            rows: rows,
                            cols: cols,
                            cardSize: standardCardSize,
                            score: totalScore
                        });
                        
                        // console.log(`- ${rows}行 × ${cols}列: 卡片尺寸=${standardCardSize}px, 均衡度: ${balanceScore.toFixed(2)}, 空间利用率: ${(spaceUtilization*100).toFixed(1)}%, 得分: ${totalScore.toFixed(2)}`);
                    }
                }
                
                // 4.3 选择评分最高的布局
                if (layouts.length > 0) {
                    // 按总评分从高到低排序
                    layouts.sort((a, b) => b.score - a.score);
                    
                    bestLayout = layouts[0];
                    // console.log(`✓ 选择标准尺寸最佳布局: ${bestLayout.cols}列 × ${bestLayout.rows}行, 卡片尺寸=${bestLayout.cardSize}px`);
                }
            }
            
            // ====== 第5步：如果标准尺寸不足，搜索更小尺寸 ======
            if (bestLayout.cardSize === 0) {
                // console.log('标准尺寸无法容纳所有卡片或没有找到合适布局，尝试调整卡片尺寸');
                
                // 5.1 降序尺寸搜索 - 寻找能放下所有卡片的最大可能尺寸
                // 从标准尺寸开始，每次减少5px，直到达到最小可接受尺寸(60px)
                // 参数解释：
                // - standardCardSize: 标准卡片尺寸，默认80px
                // - 60: 最小可接受的卡片尺寸，可以根据需要调整
                // - 5: 步长，每次尺寸减少的像素数
                for (let size = standardCardSize; size >= 80; size -= 5) {
                    // 5.2 计算当前尺寸下能放置的最大行列数和卡片总数
                    const maxCols = Math.floor((containerWidth - gap) / (size + gap));
                    const maxRows = Math.floor((containerHeight - gap) / (size + gap));
                    const maxCards = maxCols * maxRows;
                    
                    // console.log(`尝试卡片尺寸 ${size}px: 容纳 ${maxCols}列 × ${maxRows}行 = ${maxCards}张卡片`);
                    
                    // 5.3 如果当前尺寸能放下所有卡片，寻找最佳布局
                    if (maxCards >= cardCount) {
                        // 尝试不同的行列组合，找出最优布局
                        const layouts = [];
                        
                        // 尝试从1行到maxRows的所有行数
                        for (let rows = 1; rows <= maxRows; rows++) {
                            const cols = Math.ceil(cardCount / rows);
                            
                            if (cols <= maxCols) {
                                // 5.4 计算实际卡片尺寸和评分参数
                                
                                // 计算在此行列数下的实际可用空间
                                const widthPerCard = (containerWidth - gap * (cols + 1)) / cols;
                                const heightPerCard = (containerHeight - gap * (rows + 1)) / rows;
                                
                                // 实际卡片尺寸取较小值，并确保不超过当前尝试的尺寸
                                const actualSize = Math.min(Math.floor(Math.min(widthPerCard, heightPerCard)), size);
                                
                                // 均衡度评分 - 与标准尺寸时相同计算方法
                                const balanceScore = 1 / (1 + Math.abs(cols/rows - containerRatio));
                                
                                // 尺寸得分 - 尺寸越接近标准尺寸越好，最大为1
                                const sizeScore = actualSize / standardCardSize;
                                
                                // 空间利用率 - 卡片总面积占容器面积的比例
                                const spaceUtilization = (cols * rows * actualSize * actualSize) / (containerWidth * containerHeight);
                                
                                // 综合评分 - 尺寸占主导地位
                                // 尺寸权重为3，均衡度权重为1，空间利用率权重为1
                                const totalScore = sizeScore * 3 + balanceScore + spaceUtilization;
                                
                                layouts.push({
                                    rows: rows,
                                    cols: cols,
                                    cardSize: actualSize,
                                    score: totalScore
                                });
                            }
                        }
                        
                        // 5.5 选择当前尺寸下评分最高的布局
                        if (layouts.length > 0) {
                            // 按总评分从高到低排序
                            layouts.sort((a, b) => b.score - a.score);
                            
                            // 记录此尺寸下的最佳布局
                            const topLayout = layouts[0];
                            // console.log(`在尺寸 ${size}px 下找到最佳布局: ${topLayout.cols}列 × ${topLayout.rows}行, 实际卡片尺寸=${topLayout.cardSize}px (${(topLayout.cardSize/standardCardSize*100).toFixed(1)}% 标准尺寸), 得分: ${topLayout.score.toFixed(2)}`);
                            
                            // 如果比当前最佳布局更好，则更新最佳布局
                            if (topLayout.score > bestLayout.score) {
                                bestLayout = topLayout;
                            }
                            
                            // 找到可接受的布局后停止搜索
                            // 由于是从大到小搜索，第一个能放下所有卡片的尺寸通常是最优的
                            break;
                        }
                    }
                }
            }
            
            // ====== 第6步：应用最佳布局 ======
            if (bestLayout.cardSize > 0) {
                this.rows = bestLayout.rows;
                this.columns = bestLayout.cols;
                this.cardSize = bestLayout.cardSize;
                
                // console.log(`✓ 选择最佳布局: ${this.columns}列 × ${this.rows}行, 卡片尺寸=${this.cardSize}px (${(this.cardSize/standardCardSize*100).toFixed(1)}% 标准尺寸)`);
                console.groupEnd();
                return;
            }
            
            // ====== 第7步：回退方案 ======
            // 如果所有尝试都失败，使用基于平方根的基本布局方案
            // console.log('未找到合适的布局，回退到基本方案');
            
            // 7.1 计算接近容器宽高比的行列数
            // 使用平方根作为起点，并根据容器宽高比调整
            const optimalRows = Math.ceil(Math.sqrt(cardCount * containerHeight / containerWidth));
            const optimalCols = Math.ceil(cardCount / optimalRows);
            
            // 7.2 计算在这个行列数下可能的最大卡片尺寸
            const widthPerCard = (containerWidth - gap * (optimalCols + 1)) / optimalCols;
            const heightPerCard = (containerHeight - gap * (optimalRows + 1)) / optimalRows;
            const sizePerCard = Math.min(widthPerCard, heightPerCard);
            
            // 7.3 应用计算结果，但确保不超过标准尺寸
            this.rows = optimalRows;
            this.columns = optimalCols;
            this.cardSize = Math.floor(Math.min(sizePerCard, standardCardSize)); // 确保不超过标准尺寸
            
            // console.log(`✓ 基本布局: ${this.columns}列 × ${this.rows}行, 卡片尺寸=${this.cardSize}px (${(this.cardSize/standardCardSize*100).toFixed(1)}% 标准尺寸)`);
            console.groupEnd();
        },
        
        /**
         * 初始化游戏板矩阵
         */
        initBoardMatrix() {
            this.boardMatrix = [];
            for (let i = 0; i < this.rows; i++) {
                this.boardMatrix[i] = [];
                for (let j = 0; j < this.columns; j++) {
                    this.boardMatrix[i][j] = null;
                }
            }
        },
        
        /**
         * 设置游戏板
         * @param {Array} wordPairs - 单词对数组
         */
        setupBoard(wordPairs) {
            console.log(`设置游戏板: 使用 ${wordPairs.length} 对单词，共 ${wordPairs.length * 2} 张卡片`);
            
            // 清空现有卡片
            this.cards = [];
            this.selectedCards = [];
            this.boardElement.innerHTML = '';
            this.matched = 0;
            
            // 计算布局前锁定游戏板状态
            this.isBoardLocked = false;
            
            // 计算最佳网格尺寸
            this.calculateOptimalGridSize(wordPairs.length * 2);
            
            // 初始化板矩阵
            this.initBoardMatrix();
            
            // 创建卡片
            this.createCards(wordPairs);
            
            // 更新游戏板尺寸和样式
            this.updateBoardAndCards();

            // 初始化改进的路径查找器
            ImprovedPathFinder.init(Math.max(this.rows, this.columns), document.querySelectorAll('.card'));
            
            // 在设置完成后锁定布局，防止窗口调整时重新计算行列数
            this.isBoardLocked = true;
            
            console.log('游戏板设置完成');
            
            return this.cards;
        },
        
        /**
         * 添加窗口大小变化监听器
         */
        addResizeListener() {
            // 使用防抖函数避免频繁触发
            let resizeTimeout;
            
            window.addEventListener('resize', () => {
                clearTimeout(resizeTimeout);
                resizeTimeout = setTimeout(() => {
                    this.handleResize();
                }, 200);
            });
        },
        
        /**
         * 处理窗口大小变化
         */
        handleResize() {
            // 添加防抖逻辑，避免频繁触发
            if (this.resizeTimeout) {
                clearTimeout(this.resizeTimeout);
            }
            
            this.resizeTimeout = setTimeout(() => {
                console.log('窗口大小变化，调整游戏板');
                
                // 记录调整前的容器尺寸
                const oldWidth = this.cachedContainerWidth;
                const oldHeight = this.cachedContainerHeight;
                
                // 获取当前容器尺寸
                const newWidth = this.boardContainer.clientWidth;
                const newHeight = this.boardContainer.clientHeight;
                
                // 计算容器尺寸的变化百分比
                const widthChange = Math.abs(newWidth - oldWidth) / oldWidth * 100;
                const heightChange = Math.abs(newHeight - oldHeight) / oldHeight * 100;
                
                // console.log(`容器尺寸变化: ${oldWidth}x${oldHeight} => ${newWidth}x${newHeight} (宽度变化: ${widthChange.toFixed(1)}%, 高度变化: ${heightChange.toFixed(1)}%)`);
                
                // 只有当尺寸变化超过10%才重新计算布局
                if (widthChange > 10 || heightChange > 10) {
                    // 重新计算最佳网格布局
                    if (!this.isBoardLocked) {
                        console.log('尺寸变化显著，重新计算最佳网格布局');
                        this.calculateOptimalGridSize(this.cards.length);
                    } else {
                        console.log('游戏板已锁定，保持当前行列数，只调整卡片尺寸');
                    }
                } else {
                    console.log('尺寸变化不大，仅调整卡片尺寸');
                }
                
                // 重新计算卡片尺寸
                const newCardSize = this.calculateCardSize();
                
                // 更新游戏板和卡片尺寸
                this.updateBoardAndCards();
                
                // 清除超时标记
                this.resizeTimeout = null;
            }, 250); // 250ms防抖
        },
        
        /**
         * 设置游戏板大小（行列数）
         * @param {number} rows - 行数
         * @param {number} columns - 列数
         */
        setBoardSize(rows, columns) {
            if (rows > 0 && columns > 0) {
                this.rows = rows;
                this.columns = columns;
                console.log(`设置游戏板大小: ${columns}x${rows}`);
            }
        },
        
        /**
         * 创建卡片
         * @param {Array} wordPairs - 单词对数组
         */
        createCards(wordPairs) {
            const cards = [];
            
            // 创建单词和定义卡片对
            wordPairs.forEach(pair => {
                // 创建单词卡片
                cards.push({
                    id: pair.id,
                    type: 'word',
                    content: pair.word
                });
                
                // 创建含义卡片
                cards.push({
                    id: pair.id,
                    type: 'meaning',
                    content: pair.meaning
                });
            });
            
            // 打乱卡片顺序
            const shuffledCards = WordUtils.shuffle ? WordUtils.shuffle(cards) : this.shuffleArray(cards);
            
            // 将卡片放置到游戏板上
            shuffledCards.forEach((cardData, index) => {
                // 计算行列位置
                const row = Math.floor(index / this.columns);
                const col = index % this.columns;
                
                // 确保不超出边界
                if (row < this.rows && col < this.columns) {
                    this.createCardElement(cardData, row, col);
                }
            });
        },
        
        /**
         * 打乱数组（备用方法）
         * @param {Array} array - 原数组
         * @returns {Array} - 打乱后的数组
         */
        shuffleArray(array) {
            const newArray = [...array];
            for (let i = newArray.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
            }
            return newArray;
        },
        
        /**
         * 创建卡片元素
         * @param {Object} cardData - 卡片数据
         * @param {number} row - 行索引
         * @param {number} col - 列索引
         */
        createCardElement(cardData, row, col) {
            const card = document.createElement('div');
            card.className = 'card';
            card.dataset.row = row;
            card.dataset.col = col;
            card.dataset.id = cardData.id;
            card.dataset.type = cardData.type;
            
            // 设置卡片尺寸样式
            card.style.width = `${this.cardSize}px`;
            card.style.height = `${this.cardSize}px`;
            card.style.minWidth = 'auto';
            card.style.minHeight = 'auto';
            
            // 设置卡片在网格中的位置
            card.style.gridRow = row + 1;
            card.style.gridColumn = col + 1;
            
            // 设置卡片内容
            if (cardData.type === 'word') {
                card.innerHTML = `
                    <div class="card-front">
                        <div class="card-word">${cardData.content}</div>
                    </div>
                `;
            } else {
                card.innerHTML = `
                    <div class="card-front">
                        <div class="card-meaning">${cardData.content}</div>
                    </div>
                `;
            }
            
            // 添加点击事件
            card.addEventListener('click', () => {
                this.selectCard(card);
            });
            
            // 添加到游戏板
            this.boardElement.appendChild(card);
            
            // 更新游戏板矩阵
            this.boardMatrix[row][col] = {
                element: card,
                id: cardData.id,
                type: cardData.type,
                isEmpty: false,
                matched: false
            };
        },
        
        /**
         * 选择卡片
         * @param {HTMLElement} card - 卡片元素
         */
        selectCard(card) {
            // 如果动画正在进行或游戏已结束，不处理点击
            if (card.classList.contains('matched') || this.animationInProgress || this.isShuffling) {
                return;
            }
            
            // 播放点击音效
            if (window.WordSoundManager) {
                window.WordSoundManager.play('click');
            }
            
            // 如果是第一次选择卡片
            if (!this.firstSelection) {
                // 设置为第一次选择的卡片
                this.firstSelection = card;
                card.classList.add('selected');
            } 
            // 如果再次点击同一张卡片，取消选择
            else if (this.firstSelection === card) {
                card.classList.remove('selected');
                this.firstSelection = null;
            }
            // 如果已经有第一张卡片且点击了不同的卡片，进行匹配
            else {
                // 设置为第二次选择的卡片
                this.secondSelection = card;
                card.classList.add('selected');
                
                // 检查是否匹配
                this.checkMatch();
            }
        },
        
        /**
         * 检查两张卡片是否匹配
         */
        checkMatch() {
            const card1 = this.firstSelection;
            const card2 = this.secondSelection;
            
            // 设置动画进行中标志
            this.animationInProgress = true;
            
            // 获取卡片位置
            const row1 = parseInt(card1.dataset.row);
            const col1 = parseInt(card1.dataset.col);
            const row2 = parseInt(card2.dataset.row);
            const col2 = parseInt(card2.dataset.col);
            
            // 检查ID是否相同但类型不同（单词与含义配对）
            if (card1.dataset.id === card2.dataset.id && 
                card1.dataset.type !== card2.dataset.type) {
                
                // 寻找连接路径
                const path = ImprovedPathFinder.findPath(row1, col1, row2, col2);
                
                if (path) {
                    // 匹配成功
                    this.handleMatchSuccess(path);
                } else {
                    // 路径不可连接
                    this.handleMismatch();
                }
            } else {
                // 不匹配
                this.handleMismatch();
            }
        },
        
        /**
         * 处理匹配成功的情况
         * @param {Array} path - 连接路径
         */
        handleMatchSuccess(path) {
            // 播放匹配成功音效
            if (window.WordSoundManager) {
                window.WordSoundManager.play('correct');
            }
            
            // 显示连接路径
            this.drawConnectionPath(path);
            
            setTimeout(() => {
                // 添加消失动画
                this.firstSelection.style.animation = "disappear 0.5s forwards";
                this.secondSelection.style.animation = "disappear 0.5s forwards";
                
                // 延时更新卡片状态
                setTimeout(() => {
                    // 移除连接线
                    this.removeConnectors();
                    
                    this.firstSelection.classList.add('matched');
                    this.secondSelection.classList.add('matched');
                    this.firstSelection.classList.remove('selected');
                    this.secondSelection.classList.remove('selected');
                    
                    // 更新游戏板矩阵
                    const row1 = parseInt(this.firstSelection.dataset.row);
                    const col1 = parseInt(this.firstSelection.dataset.col);
                    const row2 = parseInt(this.secondSelection.dataset.row);
                    const col2 = parseInt(this.secondSelection.dataset.col);
                    
                    this.boardMatrix[row1][col1].matched = true;
                    this.boardMatrix[row2][col2].matched = true;
                    
                    // 更新路径查找器中卡片的状态
                    ImprovedPathFinder.updateCardState(this.firstSelection, true);
                    ImprovedPathFinder.updateCardState(this.secondSelection, true);
                    
                    // 更新游戏状态 - 使用事件系统通知游戏核心
                    if (window.WordUtils && window.WordUtils.EventSystem) {
                        window.WordUtils.EventSystem.emit('cards:matched');
                    }
                    
                    // 清除选择状态
                    this.clearSelections();
                }, 300);
            }, 500);
        },
        
        /**
         * 处理匹配失败的情况
         */
        handleMismatch() {
            // 播放错误音效
            if (window.WordSoundManager) {
                window.WordSoundManager.play('incorrect');
            }
            
            // 添加错误动画类
            this.firstSelection.classList.add('incorrect');
            this.secondSelection.classList.add('incorrect');
            
            // 延迟后恢复卡片
            setTimeout(() => {
                this.firstSelection.classList.remove('selected', 'incorrect');
                this.secondSelection.classList.remove('selected', 'incorrect');
                
                // 更新游戏状态 - 使用事件系统通知游戏核心
                if (window.WordUtils && window.WordUtils.EventSystem) {
                    window.WordUtils.EventSystem.emit('cards:mismatched');
                }
                
                // 清除选择状态
                this.clearSelections();
            }, 1000);
        },
        
        /**
         * 清除卡片选择状态
         */
        clearSelections() {
            this.firstSelection = null;
            this.secondSelection = null;
            this.animationInProgress = false;
        },
        
        /**
         * 绘制连接路径
         * @param {Array} path - 路径点数组
         */
        drawConnectionPath(path) {
            // 清除之前的连接线
            this.removeConnectors();
            
            // 如果没有路径，直接返回
            if (!path || path.length < 2) {
                return;
            }
            
            // 使用ImprovedPathFinder绘制路径
            ImprovedPathFinder.drawPath(path, this.boardElement);
        },
        
        /**
         * 移除所有连接线
         */
        removeConnectors() {
            this.connectors.forEach(connector => {
                if (connector && connector.parentNode) {
                    connector.parentNode.removeChild(connector);
                }
            });
            this.connectors = [];
        },
        
        /**
         * 显示提示
         * @returns {boolean} 是否成功找到提示
         */
        showHint() {
            console.log("WordBoard.showHint被调用");
            
            // 播放提示音效（可选，由GameCore控制）
            // if (window.WordSoundManager) {
            //     window.WordSoundManager.play('hint');
            // }
            
            // 移除已有的提示高亮
            const highlightedCards = document.querySelectorAll('.card.hint');
            highlightedCards.forEach(card => card.classList.remove('hint'));
            
            // 寻找可连接的卡片对
            const hintPair = ImprovedPathFinder.findConnectablePair();
            console.log("找到提示卡片对:", hintPair);
            
            if (hintPair) {
                // 高亮显示卡片，但不显示连接线
                hintPair.card1.element.classList.add('hint');
                hintPair.card2.element.classList.add('hint');
                
                // 延时恢复
                setTimeout(() => {
                    if (hintPair.card1.element) hintPair.card1.element.classList.remove('hint');
                    if (hintPair.card2.element) hintPair.card2.element.classList.remove('hint');
                }, 3000); // 3秒后消失
                
                // 触发提示事件（已经由GameCore监听并处理）
                if (window.WordUtils && window.WordUtils.EventSystem) {
                    window.WordUtils.EventSystem.emit('board:hint-used');
                }
                
                return true;
            } else {
                console.log("没有找到可连接的卡片对");
                return false;
            }
        },
        
        /**
         * 洗牌
         */
        shuffleBoard() {
            // 如果游戏结束或正在洗牌，不处理
            if (window.WordGame && (window.WordGame.isGameOver || window.WordGame.isLoading)) {
                console.log("游戏已结束或正在加载，无法洗牌");
                return;
            }
            
            // 设置正在洗牌状态
            this.isShuffling = true;
            
            console.log("WordBoard.shuffleBoard被调用");
            
            // 播放洗牌音效
            if (window.WordSoundManager) {
                window.WordSoundManager.play('shuffle');
            }
            
            // 清除当前选择
            if (this.firstSelection) {
                this.firstSelection.classList.remove('selected');
                this.firstSelection = null;
            }
            
            if (this.secondSelection) {
                this.secondSelection.classList.remove('selected');
                this.secondSelection = null;
            }
            
            // 收集所有未匹配的卡片
            const unmatchedCards = [];
            const positions = [];
            
            for (let row = 0; row < this.rows; row++) {
                for (let col = 0; col < this.columns; col++) {
                    const cell = this.boardMatrix[row][col];
                    if (cell && !cell.matched) {
                        unmatchedCards.push(cell.element);
                        positions.push({ row, col });
                    }
                }
            }
            
            // 先让所有卡片淡出
            unmatchedCards.forEach(card => {
                card.classList.add('shuffling');
            });
            
            // 延迟执行实际洗牌操作，让动画有时间显示
            setTimeout(() => {
                // 随机打乱位置
                if (window.WordUtils) {
                    positions.sort(() => Math.random() - 0.5);
                } else {
                    for (let i = positions.length - 1; i > 0; i--) {
                        const j = Math.floor(Math.random() * (i + 1));
                        [positions[i], positions[j]] = [positions[j], positions[i]];
                    }
                }
                
                // 重新分配卡片位置
                unmatchedCards.forEach((card, i) => {
                    const newPos = positions[i];
                    card.dataset.row = newPos.row;
                    card.dataset.col = newPos.col;
                    
                    // 更新游戏板矩阵
                    this.boardMatrix[newPos.row][newPos.col] = {
                        element: card,
                        id: card.dataset.id,
                        type: card.dataset.type,
                        matched: false
                    };
                    
                    // 更新CSS Grid位置
                    card.style.gridRow = newPos.row + 1;
                    card.style.gridColumn = newPos.col + 1;
                });
                
                // 重新初始化路径查找器
                ImprovedPathFinder.init(Math.max(this.rows, this.columns), document.querySelectorAll('.card'));
                
                // 让卡片淡入显示
                setTimeout(() => {
                    unmatchedCards.forEach(card => {
                        // 移除类以触发动画
                        card.classList.remove('shuffling');
                    });
                    
                    // ---- 修改：使用固定延迟重置状态 ----
                    // 设置一个略长于动画时间的延迟 (例如 1000ms)
                    setTimeout(() => {
                        // 触发洗牌完成事件
                                if (window.WordUtils && window.WordUtils.EventSystem) {
                                    window.WordUtils.EventSystem.emit('board:shuffled');
                                }
                                // 取消洗牌状态
                                this.isShuffling = false;
                        console.log("洗牌动画完成，isShuffling 设置为 false");
                    }, 500); // 假设动画总时长小于1秒
                    // ---- 结束修改 ----
                }, 200);
            }, 600);
        },
        
        updateBoardAndCards() {
            // 设置游戏板网格
            this.setBoardSize(this.rows, this.columns);
            
            // 更新卡片尺寸
            this.cards.forEach(card => {
                card.element.style.width = `${this.cardSize}px`;
                card.element.style.height = `${this.cardSize}px`;
                
                // 根据卡片尺寸调整字体大小
                const cardBackElement = card.element.querySelector('.card-back');
                if (cardBackElement) {
                    const fontSize = Math.max(12, Math.min(16, Math.floor(this.cardSize / 5)));
                    cardBackElement.style.fontSize = `${fontSize}px`;
                }
            });
        }
    };
    
    // 输出到全局对象
    window.WordBoard = WordBoard;

    /**
     * 游戏核心模块 - 管理游戏状态和逻辑
     */
    const GameCore = {
        wordPairs: [],        // 单词对数组
        matchedPairs: 0,      // 已匹配的对数
        totalPairs: 0,        // 总对数
        score: 0,             // 得分
        combo: 0,             // 连击数
        maxCombo: 0,          // 最大连击数
        timeLeft: 60,         // 剩余时间
        timer: null,          // 计时器
        isGameOver: false,    // 游戏是否结束
        isLoading: false,     // 游戏是否正在加载
        
        // 游戏控制元素
        difficulty: 'MEDIUM', // 当前难度
        hintCount: 3,         // 提示次数
        shuffleCount: 2,      // 洗牌次数
        
        /**
         * 初始化游戏
         */
        init() {
            console.log('初始化游戏核心...');
            
            // 初始化UI元素引用
            this.initUIElements();
            
            // 设置按钮事件
            this.initEventListeners();
            
            // 初始化数据加载模块
            if (window.WordDataLoader) {
                window.WordDataLoader.init();
            }
            
            // 初始化音效系统
            if (window.WordSoundManager) {
                window.WordSoundManager.init();
            }
            
            // 初始化工具加载管理器
            if (window.WordUtils && window.WordUtils.LoadingManager) {
                window.WordUtils.LoadingManager.init();
            }
            
            // 开始游戏
            this.startGame();
        },
        
        /**
         * 初始化UI元素引用
         */
        initUIElements() {
            this.timeElement = document.getElementById('time');
            this.scoreElement = document.getElementById('score');
            this.comboElement = document.getElementById('combo');
            this.matchedPairsElement = document.getElementById('matched-pairs');
            this.totalPairsElement = document.getElementById('total-pairs');
            this.progressElement = document.getElementById('progress-fill');
            this.hintCountElement = document.getElementById('hint-count');
            this.shuffleCountElement = document.getElementById('shuffle-count');
        },
        
        /**
         * 初始化事件监听
         */
        initEventListeners() {
            // 游戏控制按钮
            document.getElementById('hint-btn').addEventListener('click', this.showHint.bind(this));
            document.getElementById('shuffle-btn').addEventListener('click', this.shuffleBoard.bind(this));
            document.getElementById('restart-btn').addEventListener('click', this.restartGame.bind(this));
            document.getElementById('back-btn').addEventListener('click', this.backToMenu.bind(this));
            
            // 帮助按钮
            const helpBtn = document.getElementById('help-btn');
            if (helpBtn) {
                helpBtn.addEventListener('click', () => {
                    document.getElementById('help-modal').classList.add('active');
                    // 添加按钮高亮效果
                    this.highlightButton('help-btn');
                });
            }
            
            // 帮助模态框关闭按钮
            document.getElementById('close-help-btn').addEventListener('click', () => {
                document.getElementById('help-modal').classList.remove('active');
            });
            
            // 结果模态框按钮
            document.getElementById('play-again-btn').addEventListener('click', this.restartGame.bind(this));
            document.getElementById('next-level-btn').addEventListener('click', this.nextLevel.bind(this));
            document.getElementById('menu-btn').addEventListener('click', this.backToMenu.bind(this));
            
            // 提示模态框按钮
            document.getElementById('close-hint-btn').addEventListener('click', () => {
                document.getElementById('hint-modal').classList.remove('active');
            });
            
            // 设置事件监听
            WordUtils.EventSystem.on('cards:matched', this.handleMatch.bind(this));
            WordUtils.EventSystem.on('cards:mismatched', this.handleMismatch.bind(this));
            WordUtils.EventSystem.on('board:hint-used', this.handleHintUsed.bind(this));
            WordUtils.EventSystem.on('board:shuffled', this.handleShuffleUsed.bind(this));

            // 添加用户首次交互监听
            this.setupFirstInteractionSound();
            
            // 添加键盘快捷键
            this.setupKeyboardShortcuts();
        },
        
        /**
         * 设置首次交互音效
         */
        setupFirstInteractionSound() {
            // 标记是否已经播放了开始音效
            this.startSoundPlayed = false;
            
            // 监听整个文档的用户交互
            const playStartSound = () => {
                if (!this.startSoundPlayed && window.WordSoundManager) {
                    window.WordSoundManager.play('click');
                    this.startSoundPlayed = true;
                    // 交互后移除事件监听
                    document.removeEventListener('click', playStartSound);
                    document.removeEventListener('touchstart', playStartSound);
                }
            };
            
            // 添加点击和触摸事件监听
            document.addEventListener('click', playStartSound);
            document.addEventListener('touchstart', playStartSound);
        },
        
        /**
         * 设置键盘快捷键
         */
        setupKeyboardShortcuts() {
            document.addEventListener('keydown', (event) => {
                // 如果游戏已结束或在加载中，不处理键盘事件
                if (this.isGameOver || this.isLoading) {
                    return;
                }
                
                // 如果当前焦点在输入框或文本区域，不处理键盘事件
                if (document.activeElement.tagName === 'INPUT' || 
                    document.activeElement.tagName === 'TEXTAREA') {
                    return;
                }
                
                // 检查按键并执行相应操作
                switch (event.key.toLowerCase()) {
                    case 't':  // T键触发提示
                        this.showHint();
                        // 添加按钮高亮效果
                        this.highlightButton('hint-btn');
                        break;
                        
                    case ' ':  // 空格键触发洗牌
                        this.shuffleBoard();
                        // 添加按钮高亮效果
                        this.highlightButton('shuffle-btn');
                        // 阻止滚动
                        event.preventDefault();
                        break;
                        
                    case 'r':  // R键重启游戏
                        this.restartGame();
                        // 添加按钮高亮效果
                        this.highlightButton('restart-btn');
                        break;
                        
                    case 'h':  // H键显示帮助
                        document.getElementById('help-modal').classList.add('active');
                        break;
                }
            });
        },
        
        /**
         * 高亮按钮提供视觉反馈
         * @param {string} buttonId - 按钮ID
         */
        highlightButton(buttonId) {
            const button = document.getElementById(buttonId);
            if (!button) return;
            
            // 添加高亮类
            button.classList.add('button-highlight');
            
            // 300毫秒后移除高亮
            setTimeout(() => {
                button.classList.remove('button-highlight');
            }, 300);
        },
        
        /**
         * 开始游戏
         */
        startGame() {
            console.log('开始游戏...');
            
            // 设置加载状态
            this.isLoading = true;
            
            // 重置游戏状态
            this.resetGame();
            
            // 根据难度设置游戏参数
            this.setDifficulty(this.difficulty);
            
            // 加载单词数据（异步）
            this.loadWordData().then(() => {
                // 更新UI
                this.updateUI();
                
                // 初始化游戏板
                if (window.WordBoard) {
                    const boardSize = 6; // 默认6x6
                    window.WordBoard.init(boardSize);
                    window.WordBoard.setupBoard(this.wordPairs);
                } else {
                    console.warn('WordBoard模块未加载，使用备用初始化方法');
                    this.initGameBoard();
                }
                
                // 清除加载状态
                this.isLoading = false;
                
                // 开始计时器
                this.startTimer();
                
                // 注意：音效在游戏初始化完成后不要自动播放，
                // 改为在第一次用户交互时播放，以避免浏览器阻止自动播放
            });
        },
        
        /**
         * 加载单词数据
         * @returns {Promise<Array>} - 加载完成后的单词数组
         */
        async loadWordData() {
            try {
                console.log('开始加载单词数据...');
                
                // 解析URL参数
                const urlParams = new URLSearchParams(window.location.search);
                const chapterId = urlParams.get('chapter'); // 章节ID
                const mode = urlParams.get('mode'); // 获取模式
                const levelId = urlParams.get('category'); // 级别ID (从 level.html 传递过来)
                this.currentLevelId = levelId; // 直接存储 levelId
                this.currentChapterOrderNum = null; // 初始化 orderNum
                
                console.log('加载参数:', {
                    chapterId,
                    mode,
                    levelId
                });

                // 如果是普通模式，尝试获取章节的 order_num
                if (mode === 'normal' && chapterId && typeof window.WordDataLoader !== 'undefined') {
                    try {
                        console.log(`尝试获取章节 ${chapterId} 的详情...`);
                        const chapterDetails = await window.WordDataLoader.getChapterDetails(chapterId);
                        if (chapterDetails && chapterDetails.order_num !== undefined) {
                            this.currentChapterOrderNum = chapterDetails.order_num;
                            console.log(`成功获取章节 ${chapterId} 的 order_num: ${this.currentChapterOrderNum}`);
                        } else {
                            console.warn(`未能获取章节 ${chapterId} 的 order_num。`);
                        }
                    } catch (error) {
                        console.error(`获取章节 ${chapterId} 详情时出错:`, error);
                    }
                }

                
                // 检查WordDataLoader是否可用
                if (typeof window.WordDataLoader !== 'undefined') {
                    // 如果是导入模式，直接获取导入的单词
                    if (mode === 'imported') {
                        console.log('检测到导入模式，直接获取导入的单词...');
                        try {
                            // 调用getImportedWords而不需要章节ID
                            const words = await window.WordDataLoader.getImportedWords();
                            console.log(`成功获取导入的单词:`, words);
                            
                            if (words && words.length > 0) {
                                this.wordPairs = words;
                                console.log(`获取到${words.length}个单词对`);
                                
                                // 打印单词示例
                                if (words.length > 0) {
                                    console.log('单词示例:');
                                    for (let i = 0; i < Math.min(3, words.length); i++) {
                                        console.log(`- ${words[i].word || '单词'}: ${words[i].meaning || words[i].definition || '含义'}`);
                                    }
                                }
                                this.totalPairs = this.wordPairs.length;
                                return words; // 成功获取导入单词，提前返回
                            }
                        } catch (error) {
                            console.error('获取导入单词时出错:', error);
                            // 继续执行，使用备用数据
                        }
                    }
                    // 普通章节模式，需要chapter参数
                    else if (mode === 'normal' && chapterId) { // 确保 chapterId 存在
                        console.log(`使用WordDataLoader获取章节${chapterId}的单词数据...`);
                        
                        try {
                            // 使用数据加载模块获取单词 - 使用新方法获取所有单词
                            const words = await window.WordDataLoader.getAllWordsByChapter(chapterId, mode);
                            console.log(`成功获取章节${chapterId}的单词数据:`, words);
                            
                            if (words && words.length > 0) {
                                this.wordPairs = words;
                                console.log(`获取到${words.length}个单词对`);
                                
                                // 打印单词示例
                                if (words.length > 0) {
                                    console.log('单词示例:');
                                    for (let i = 0; i < Math.min(3, words.length); i++) {
                                        console.log(`- ${words[i].word || '单词'}: ${words[i].definition || words[i].meaning || '含义'}`);
                                    }
                                }
                                this.totalPairs = this.wordPairs.length;
                                return words; // 成功获取单词，提前返回
                            }
                        } catch (error) {
                            console.error('调用WordDataLoader时出错:', error);
                            // 继续执行，使用备用数据
                        }
                    }else if(mode === 'random'){
                        console.log('~~~~~~~~~判断中mode的值为:~~~~~~~~~~~~~', mode);
                        try{
                            const words = await window.WordDataLoader.getRandomWordsFromLevel("all", 20);
                            console.log('~~~~~~~~~words的值yesyes为:~~~~~~~~~~~~~ ', words);
                            this.wordPairs = words;
                            this.totalPairs = this.wordPairs.length;
                            return words; // 成功获取单词，提前返回
                        }catch(error){
                            console.error('获取随机单词时出错:', error);
                        }
                    }
                }
            } catch (error) {
                console.error('加载单词数据失败:', error);
                // 使用示例数据作为备用
                this.wordPairs = WordConfig.SAMPLE_WORDS;
                this.totalPairs = this.wordPairs.length;
                return this.wordPairs;
            } finally {
                // 确保在所有路径（包括错误）后都能获取到单词对
                if (!this.wordPairs || this.wordPairs.length === 0) {
                   console.warn('最终未能加载任何单词，将使用示例数据。');
                   this.wordPairs = WordConfig.SAMPLE_WORDS;
                   this.totalPairs = this.wordPairs.length;
                }
                // 可以在这里添加额外的日志记录
                console.log(`loadWordData 结束，最终单词对数量: ${this.totalPairs}`);
            }
        },
        
        
        /**
         * 设置游戏难度
         * @param {string} level - 难度等级：EASY, MEDIUM, HARD
         */
        setDifficulty(level) {
            this.difficulty = level;
            const difficulty = WordConfig.DIFFICULTY[level] || WordConfig.DIFFICULTY.MEDIUM;
            
            this.timeLeft = difficulty.timeLimit;
            this.hintCount = difficulty.hintLimit;
            this.shuffleCount = difficulty.shuffleLimit;
            
            // 更新UI显示
            if (this.hintCountElement) {
                this.hintCountElement.textContent = this.hintCount;
            }
            
            if (this.shuffleCountElement) {
                this.shuffleCountElement.textContent = this.shuffleCount;
            }
            
            console.log(`设置难度: ${level}`);
        },
        
        /**
         * 初始化游戏板（备用方法，如果board.js未加载）
         */
        initGameBoard() {
            const gameBoard = document.getElementById('game-board');
            if (!gameBoard) {
                console.error('找不到游戏板元素');
                return;
            }
            
            gameBoard.innerHTML = '';
            
            // 设置游戏板网格
            const columns = 8;
            const rows = 4;
            
            gameBoard.style.gridTemplateColumns = `repeat(${columns}, 1fr)`;
            gameBoard.style.gridTemplateRows = `repeat(${rows}, 1fr)`;
            
            // 创建卡片
            const cards = [];
            this.wordPairs.forEach(pair => {
                cards.push({
                    id: pair.id,
                    type: 'word',
                    content: pair.word
                });
                
                cards.push({
                    id: pair.id,
                    type: 'meaning',
                    content: pair.meaning
                });
            });
            
            // 打乱卡片顺序
            const shuffledCards = WordUtils.shuffle(cards);
            
            // 重置游戏状态
            gameBoard.firstCard = null;
            gameBoard.secondCard = null;
            gameBoard.isAnimating = false;
            
            // 创建卡片元素
            shuffledCards.slice(0, columns * rows).forEach((cardData, index) => {
                const row = Math.floor(index / columns);
                const col = index % columns;
                
                const card = document.createElement('div');
                card.className = 'card';
                card.dataset.id = cardData.id;
                card.dataset.type = cardData.type;
                card.dataset.row = row;
                card.dataset.col = col;
                
                card.innerHTML = `
                    <div class="card-front">
                        <div class="${cardData.type === 'word' ? 'card-word' : 'card-meaning'}">
                            ${cardData.content}
                        </div>
                    </div>
                `;
                
                // 添加点击事件
                card.addEventListener('click', this.handleCardClick.bind(this, card));
                
                gameBoard.appendChild(card);
            });
            
            // 更新UI
            this.totalPairs = Math.min(cards.length / 2, columns * rows / 2);
            if (this.totalPairsElement) {
                this.totalPairsElement.textContent = this.totalPairs;
            }
        },
        
        /**
         * 处理卡片点击（备用方法，如果board.js未加载）
         */
        handleCardClick(card) {
            const gameBoard = document.getElementById('game-board');
            
            // 如果游戏结束或卡片已匹配或动画进行中，不处理点击
            if (this.isGameOver || card.classList.contains('matched') || gameBoard.isAnimating) {
                return;
            }
            
            // 播放点击音效
            if (window.WordSoundManager) {
                window.WordSoundManager.play('click');
            }
            
            // 如果是第一次选择卡片
            if (!gameBoard.firstCard) {
                gameBoard.firstCard = card;
                card.classList.add('selected');
            } 
            // 如果再次点击同一张卡片，取消选择
            else if (gameBoard.firstCard === card) {
                card.classList.remove('selected');
                gameBoard.firstCard = null;
            }
            // 如果已经有第一张卡片且点击了不同的卡片，进行匹配
            else {
                gameBoard.secondCard = card;
                card.classList.add('selected');
                
                // 检查匹配
                this.checkCardMatch(gameBoard.firstCard, gameBoard.secondCard);
            }
        },
        
        /**
         * 检查卡片匹配（备用方法，如果board.js未加载）
         */
        checkCardMatch(card1, card2) {
            const gameBoard = document.getElementById('game-board');
            gameBoard.isAnimating = true;
            
            // 检查ID是否相同但类型不同
            if (card1.dataset.id === card2.dataset.id && 
                card1.dataset.type !== card2.dataset.type) {
                
                // 获取卡片位置
                const row1 = parseInt(card1.dataset.row);
                const col1 = parseInt(card1.dataset.col);
                const row2 = parseInt(card2.dataset.row);
                const col2 = parseInt(card2.dataset.col);
                
                // 使用改进的路径查找器寻找连接路径
                const path = ImprovedPathFinder.findPath(row1, col1, row2, col2);
                
                if (path) {
                    // 播放匹配成功音效
                    if (window.WordSoundManager) {
                        window.WordSoundManager.play('correct');
                    }
                    
                    // 显示连接路径
                    ImprovedPathFinder.drawPath(path, gameBoard);
                    
                    // 添加消失动画
                    setTimeout(() => {
                        card1.style.animation = 'disappear 0.5s forwards';
                        card2.style.animation = 'disappear 0.5s forwards';
                        
                        setTimeout(() => {
                            card1.classList.add('matched');
                            card2.classList.add('matched');
                            card1.classList.remove('selected');
                            card2.classList.remove('selected');
                            
                            // 更新路径查找器中卡片的状态
                            ImprovedPathFinder.updateCardState(card1, true);
                            ImprovedPathFinder.updateCardState(card2, true);
                            
                            // 清除选择状态
                            gameBoard.firstCard = null;
                            gameBoard.secondCard = null;
                            gameBoard.isAnimating = false;
                            
                            // 触发匹配成功事件
                            WordUtils.EventSystem.emit('cards:matched');
                        }, 300);
                    }, 300);
                } else {
                    // 没有找到有效路径，视为匹配失败
                    this.handleMismatchBackup(card1, card2, gameBoard);
                }
            } else {
                // 卡片ID不同或类型相同，视为匹配失败
                this.handleMismatchBackup(card1, card2, gameBoard);
            }
        },
        
        /**
         * 处理匹配失败的备用方法
         */
        handleMismatchBackup(card1, card2, gameBoard) {
            // 播放错误音效
            if (window.WordSoundManager) {
                window.WordSoundManager.play('incorrect');
            }
            
            // 添加错误动画
            card1.classList.add('incorrect');
            card2.classList.add('incorrect');
            
            setTimeout(() => {
                card1.classList.remove('selected', 'incorrect');
                card2.classList.remove('selected', 'incorrect');
                
                // 清除选择状态
                gameBoard.firstCard = null;
                gameBoard.secondCard = null;
                gameBoard.isAnimating = false;
                
                // 触发匹配失败事件
                WordUtils.EventSystem.emit('cards:mismatched');
            }, 1000);
        },
        
        /**
         * 重置游戏状态
         */
        resetGame() {
            // 停止计时器
            if (this.timer) {
                clearInterval(this.timer);
                this.timer = null;
            }
            
            // 重置游戏状态
            this.matchedPairs = 0;
            this.score = 0;
            this.combo = 0;
            this.maxCombo = 0;
            this.isGameOver = false;
        },
        
        /**
         * 开始计时器
         */
        startTimer() {
            this.timer = setInterval(() => {
                this.timeLeft--;
                this.updateUI();
                
                // 检查游戏是否结束
                if (this.timeLeft <= 0) {
                    this.gameOver(false);
                }
            }, 1000);
        },
        
        /**
         * 更新UI显示
         */
        updateUI() {
            if (this.timeElement) this.timeElement.textContent = this.timeLeft;
            if (this.scoreElement) this.scoreElement.textContent = this.score;
            if (this.comboElement) this.comboElement.textContent = this.combo;
            if (this.matchedPairsElement) this.matchedPairsElement.textContent = this.matchedPairs;
            if (this.totalPairsElement) this.totalPairsElement.textContent = this.totalPairs;
            if (this.hintCountElement) this.hintCountElement.textContent = this.hintCount;
            if (this.shuffleCountElement) this.shuffleCountElement.textContent = this.shuffleCount;
            
            // 更新进度条
            const progress = (this.matchedPairs / this.totalPairs) * 100;
            if (this.progressElement) this.progressElement.style.width = `${progress}%`;
        },
        
        /**
         * 处理匹配成功
         */
        handleMatch() {
            // 增加匹配对数
            this.matchedPairs++;
            
            // 增加连击数
            this.combo++;
            this.maxCombo = Math.max(this.maxCombo, this.combo);
            
            // 不再每次匹配就增加分数，只记录连击次数
            // this.score += difficultyConfig.scoreMatch + (this.combo * difficultyConfig.scoreCombo);
            
            // 更新UI
            this.updateUI();
            
            // 检查游戏是否胜利
            if (this.matchedPairs >= this.totalPairs) {
                this.gameOver(true);
                return;
            }
            
            // 检查是否还有可匹配的卡片对
            setTimeout(() => {
                if (ImprovedPathFinder && !ImprovedPathFinder.checkForPossibleMatches()) {
                    console.log("没有可匹配的卡片对，自动洗牌");
                    
                    // 播放提示音效
                    if (window.WordSoundManager) {
                        window.WordSoundManager.play('shuffle');
                    }
                    
                    // 显示提示信息
                    const messageElement = document.createElement('div');
                    messageElement.className = 'auto-shuffle-message';
                    messageElement.textContent = '没有可匹配的卡片，正在自动洗牌...';
                    document.body.appendChild(messageElement);
                    
                    // 2秒后自动洗牌
                    setTimeout(() => {
                        if (window.WordBoard && typeof window.WordBoard.shuffleBoard === 'function') {
                            window.WordBoard.shuffleBoard();
                        }
                        
                        // 移除提示信息
                        setTimeout(() => {
                            if (document.body.contains(messageElement)) {
                                document.body.removeChild(messageElement);
                            }
                        }, 1000);
                    }, 2000);
                }
            }, 1000); // 延迟1秒检查，确保动画已完成
        },
        
        /**
         * 处理匹配失败
         */
        handleMismatch() {
            // 重置连击
            this.combo = 0;
            
            // 更新UI
            this.updateUI();
        },
        
        /**
         * 处理提示使用
         */
        handleHintUsed() {
            // 减少提示次数
            if (this.hintCount > 0) {
                this.hintCount--;
                
                // 获取当前难度的分数设置
                const difficultyConfig = WordConfig.DIFFICULTY[this.difficulty];
                
                // 减少分数
                this.score = Math.max(0, this.score - difficultyConfig.scoreHintPenalty);
            }
            
            // 更新UI
            this.updateUI();
        },
        
        /**
         * 处理洗牌使用
         */
        handleShuffleUsed() {
            // 减少洗牌次数
            if (this.shuffleCount > 0) {
                this.shuffleCount--;
            }
            
            // 更新UI
            this.updateUI();
        },
        
        /**
         * 游戏结束
         * @param {boolean} isWin - 是否胜利
         */
        gameOver(isWin) {
            // 停止计时器
            if (this.timer) {
                clearInterval(this.timer);
                this.timer = null;
            }
            
            // 设置游戏结束标志
            this.isGameOver = true;
            
            // 只在游戏胜利时计算最终得分
            if (isWin) {
                // 基础分 - 完成关卡固定10分
                const baseScore = 10;
            
                // 计算连击奖励 (最多5分)
                const comboBonus = Math.min(5, Math.floor(this.maxCombo / 2));
                
                // 计算时间奖励 (最多5分)
                const timeBonus = Math.min(5, Math.floor(this.timeLeft / 30));
                
                // 最终分数 = 基础分 + 连击奖励 + 时间奖励
                this.score = baseScore + comboBonus + timeBonus;
                
                // 记录各项得分详情，用于显示
                this.scoreDetails = {
                    baseScore,
                    comboBonus,
                    timeBonus,
                    totalScore: this.score
                };
                
                console.log('游戏得分详情:', this.scoreDetails);
            }
            
            // 设置结果数据
            document.getElementById('final-score').textContent = this.score;
            document.getElementById('time-left').textContent = `${this.timeLeft}s`;
            document.getElementById('max-combo').textContent = this.maxCombo;
            
            // 添加分数详情显示
            const scoreDetailsElement = document.getElementById('score-details');
            if (scoreDetailsElement && isWin && this.scoreDetails) {
                scoreDetailsElement.innerHTML = `
                    <div class="score-detail-item">基础分: ${this.scoreDetails.baseScore}</div>
                    <div class="score-detail-item">连击奖励: +${this.scoreDetails.comboBonus}</div>
                    <div class="score-detail-item">时间奖励: +${this.scoreDetails.timeBonus}</div>
                    <div class="score-detail-total">总分: ${this.scoreDetails.totalScore}</div>
                `;
                scoreDetailsElement.style.display = 'block';
            } else if (scoreDetailsElement) {
                scoreDetailsElement.style.display = 'none';
            }
            
            // 根据得分设置星级
            const maxScore = 20; // 满分20分 (基础分10 + 连击奖励5 + 时间奖励5)
            const scorePercent = this.score / maxScore;
            
            const stars = document.querySelectorAll('.star');
            stars.forEach(star => star.classList.remove('active'));
            
            if (scorePercent >= 0.3) stars[0].classList.add('active');
            if (scorePercent >= 0.6) stars[1].classList.add('active');
            if (scorePercent >= 0.8) stars[2].classList.add('active');
            
            // 播放结果音效
            if (window.WordSoundManager) {
                window.WordSoundManager.play(isWin ? 'level_complete' : 'gameover');
            }
            
            // 显示结果模态框
            setTimeout(() => {
                document.getElementById('result-modal').classList.add('active');
                document.getElementById('result-title').textContent = 
                    isWin ? '恭喜通关！' : '游戏结束';
            }, 500);
            
            // 记录游戏结果
            this.saveGameResult(isWin);

            // --- 在胜利且有关卡信息时才更新积分 ---
            if (isWin && this.currentLevelId && this.currentChapterOrderNum !== null && this.currentChapterOrderNum !== undefined) {
                const authToken = localStorage.getItem('authToken');

                if (!authToken) {
                    console.warn('无法更新积分：未找到 authToken');
                    return;
                }

                console.log(`准备更新积分: levelId=${this.currentLevelId}, completedOrderNum=${this.currentChapterOrderNum}, 获得积分=${this.score}`);

                // 使用现有的 complete-chapter API 更新积分
                fetch('/api/progress/complete-chapter', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${authToken}`
                    },
                    body: JSON.stringify({
                        levelId: this.currentLevelId,
                        completedOrderNum: this.currentChapterOrderNum,
                        totalScore: this.score // 添加总分数参数
                    })
                })
                .then(response => {
                    if (!response.ok) {
                        return response.text().then(text => { 
                            throw new Error(`服务器错误: ${response.status} - ${text}`);
                        });
                    }
                    return response.json();
                })
                .then(data => {
                    if (data.success) {
                        console.log(`用户积分更新成功！获得积分: ${data.pointsEarned}`);
                        
                        // 如果API返回了获得的积分，更新分数详情显示
                        if (scoreDetailsElement) {
                            const totalPointsElement = document.createElement('div');
                            totalPointsElement.className = 'score-detail-added';
                            // 使用我们计算的总积分(this.score)而不是API返回的值
                            totalPointsElement.textContent = `已加入总积分: +${this.score}`;
                            scoreDetailsElement.appendChild(totalPointsElement);
                        }
                    } else {
                        console.error('更新用户积分失败:', data.message);
                    }
                })
                .catch(error => {
                    console.error('调用积分更新接口时出错:', error);
                });
            } else if (isWin) {
                console.log('胜利，但缺少关卡信息，跳过积分更新 (可能是随机模式或导入模式)');
            }
        },
        
        /**
         * 保存游戏结果
         * @param {boolean} isWin - 是否胜利
         */
        saveGameResult(isWin) {
            // 这里可以实现保存游戏结果到服务器或本地存储的逻辑
            console.log('游戏结束', {
                isWin: isWin,
                score: this.score,
                timeLeft: this.timeLeft,
                maxCombo: this.maxCombo,
                matchedPairs: this.matchedPairs,
                totalPairs: this.totalPairs,
                difficulty: this.difficulty
            });
        },
        
        /**
         * 显示提示
         */
        showHint() {
            console.log("GameCore.showHint被调用");
            
            // 如果没有提示次数，不处理
            if (this.hintCount <= 0) {
                // 提示次数用尽，播放错误提示音效
                if (window.WordSoundManager) {
                    window.WordSoundManager.play('error');
                }
                console.log("提示次数用尽");
                return false;
            }
            
            // 播放提示音效
            if (window.WordSoundManager) {
                window.WordSoundManager.play('hint');
            }
            
            // 调用WordBoard的提示方法
            if (window.WordBoard && typeof window.WordBoard.showHint === 'function') {
                // 如果提示成功，减少次数
                if (window.WordBoard.showHint()) {
                    this.handleHintUsed();
                    return true;
                }
            } else {
                console.warn('WordBoard模块不存在，提示功能不可用');
            }
            
            return false;
        },
        
        /**
         * 洗牌
         */
        shuffleBoard() {
            console.log("GameCore.shuffleBoard被调用");
            
            // 如果游戏结束或没有洗牌次数，不处理
            if (this.isGameOver || this.shuffleCount <= 0) {
                // 洗牌次数用尽，播放错误提示音效
                if (this.shuffleCount <= 0 && window.WordSoundManager) {
                    window.WordSoundManager.play('error');
                }
                console.log("洗牌次数用尽或游戏已结束");
                return false;
            }
            
            // 调用WordBoard的洗牌方法
            if (window.WordBoard && typeof window.WordBoard.shuffleBoard === 'function') {
                window.WordBoard.shuffleBoard();
                // 减少洗牌次数
                this.handleShuffleUsed();
                return true;
            } else {
                console.warn('WordBoard模块不存在，洗牌功能不可用');
                return false;
            }
        },
        
        /**
         * 重新开始游戏
         */
        restartGame() {
            // 隐藏模态框
            document.getElementById('result-modal').classList.remove('active');
            
            // 开始新游戏
            this.startGame();
        },
        
        /**
         * 返回菜单
         */
        backToMenu() {
            // 在实际游戏中，这里会返回到主菜单页面
            // 简单示例：重定向到首页
            window.location.href = 'shouye.html';
        },
        
        /**
         * 下一关
         */
        async nextLevel() {
            console.log('[连线游戏] "下一关"按钮点击');
            // 隐藏模态框 (恢复使用原生JS和原始ID)
            // $('#levelCompleteModal').modal('hide');
            const resultModal = document.getElementById('result-modal');
            if (resultModal) {
                resultModal.classList.remove('active');
            } else {
                console.warn('未能找到 ID 为 result-modal 的模态框');
                // 尝试备用ID（如果存在）
                const levelCompleteModal = document.getElementById('levelCompleteModal');
                if (levelCompleteModal) {
                     levelCompleteModal.classList.remove('active'); // 假设它也用 active 类
                     // 或者如果它是 Bootstrap 模态框，原生 JS 关闭方式复杂，最好确认是否真的需要关闭
                }
            }

            // 验证必要信息是否存在
            if (!this.currentLevelId || this.currentChapterOrderNum === undefined || this.currentChapterOrderNum === null) {
                console.error('[连线游戏] 缺少 currentLevelId 或 currentChapterOrderNum 无法进入下一关');
                alert('无法确定当前关卡信息，请刷新页面或重新选择关卡。');
                return;
            }

            const currentNum = parseInt(this.currentChapterOrderNum, 10);
            if (isNaN(currentNum)) {
                 console.error('[连线游戏] currentChapterOrderNum 无效:', this.currentChapterOrderNum);
                 alert('关卡序号无效，无法进入下一关。');
                 return;
            }

            const nextOrderNum = currentNum + 1;
            // 构造预期的下一章节标识符 (基于 "级别名称第X章" 的模式)
            const predictedChapterId = `${this.currentLevelId}第${nextOrderNum}章`;
            console.log(`[连线游戏] 尝试构造并检查下一章节: ${predictedChapterId}`);

            const authToken = localStorage.getItem('authToken');
            if (!authToken) {
                console.error('[连线游戏] 未找到认证令牌');
                alert('请先登录！');
                window.location.href = '/login.html'; // 或者其他登录页面
                return;
            }

            try {
                WordUtils.LoadingManager.show('检查下一关是否存在...'); // 显示加载提示

                // 尝试获取下一关的单词，以此判断章节是否存在
                const checkUrl = `/api/chapters/${encodeURIComponent(predictedChapterId)}/allwords`;
                const response = await fetch(checkUrl, {
                    headers: {
                        'Authorization': `Bearer ${authToken}`
                    }
                });

                WordUtils.LoadingManager.hide(); // 隐藏加载提示

                if (response.ok) {
                    // 章节存在，构建跳转 URL
                    console.log(`[连线游戏] 找到下一章节 ${predictedChapterId}，准备跳转...`);
                    // 注意：这里需要根据您的 URL 结构来确定如何跳转
                    // 假设所有连线游戏都使用 game_1_lianxian.html
                    // 并且通过 chapterId 参数传递章节标识符 (修正：使用 category 和 chapter 参数名)
                    // const nextLevelUrl = `game_1_lianxian.html?levelId=${encodeURIComponent(this.currentLevelId)}&chapterId=${encodeURIComponent(predictedChapterId)}`;
                    const nextLevelUrl = `game_1_lianxian.html?category=${encodeURIComponent(this.currentLevelId)}&chapter=${encodeURIComponent(predictedChapterId)}&mode=normal`; // 添加 mode=normal
                    window.location.href = nextLevelUrl;

                } else if (response.status === 404) {
                    // 章节不存在，说明已经是最后一关
                    console.log(`[连线游戏] 未找到章节 ${predictedChapterId}，判定为最后一关。`);
                    // 可以根据需要显示不同的提示
                     Swal.fire({
                        title: '恭喜通关！',
                        text: `您已完成 "${this.currentLevelId}" 级别的所有连线关卡！`,
                        icon: 'success',
                        confirmButtonText: '返回首页',
                        allowOutsideClick: false,
                        allowEscapeKey: false
                    }).then((result) => {
                        if (result.isConfirmed) {
                            window.location.href = '/shouye.html'; // 跳转到首页或其他页面
                        }
                    });
                } else {
                    // 其他错误
                    console.error(`[连线游戏] 检查下一关时发生错误，状态码: ${response.status}`);
                    const errorData = await response.json().catch(() => ({ message: '无法解析错误信息' }));
                    alert(`加载下一关失败: ${errorData.message || response.statusText}`);
                }

            } catch (error) {
                WordUtils.LoadingManager.hide(); // 隐藏加载提示
                console.error('[连线游戏] 请求下一关信息时网络或处理错误:', error);
                alert(`加载下一关时出错: ${error.message}`);
            }
        }
    };
    
    // 输出到全局对象
    window.WordGame = GameCore;
    
    // 当文档加载完成后初始化游戏
    document.addEventListener('DOMContentLoaded', () => {
        console.log('文档加载完成，初始化游戏...');
        GameCore.init();
    });
})();

