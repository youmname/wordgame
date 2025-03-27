/**
 * 用户界面管理模块
 * 负责处理所有用户界面相关操作和更新
 */
const WordUI = {
    // DOM元素引用
    elements: {
        // 屏幕
        startScreen: null,
        gameScreen: null,
        levelScreen: null,
        
        // 游戏信息
        timeDisplay: null,
        scoreDisplay: null,
        comboDisplay: null,
        matchedPairsDisplay: null,
        totalPairsDisplay: null,
        progressFill: null,
        
        // 按钮
        startBtn: null,
        sampleBtn: null,
        hintBtn: null,
        shuffleBtn: null,
        restartBtn: null,
        backBtn: null,
        playAgainBtn: null,
        nextLevelBtn: null,
        menuBtn: null,
        
        // 模态框
        resultModal: null,
        helpModal: null,
        
        // 结果显示
        resultTitle: null,
        finalScoreDisplay: null,
        timeLeftDisplay: null,
        maxComboDisplay: null,
        star1: null,
        star2: null,
        star3: null
    },
    
    /**
     * 初始化UI
     */
    init() {
        this.cacheElements();
        this.setupEventListeners();
        this.createHelpButton();
        this.initThemeSelector();
    },
    
    /**
     * 缓存DOM元素引用
     */
    cacheElements() {
        // 屏幕
        this.elements.startScreen = document.getElementById('start-screen');
        this.elements.gameScreen = document.getElementById('game-screen');
        this.elements.levelScreen = document.getElementById('level-screen');
        
        // 游戏信息
        this.elements.timeDisplay = document.getElementById('time');
        this.elements.scoreDisplay = document.getElementById('score');
        this.elements.comboDisplay = document.getElementById('combo');
        this.elements.matchedPairsDisplay = document.getElementById('matched-pairs');
        this.elements.totalPairsDisplay = document.getElementById('total-pairs');
        this.elements.progressFill = document.getElementById('progress-fill');
        
        // 按钮
        this.elements.startBtn = document.getElementById('start-btn');
        this.elements.sampleBtn = document.getElementById('sample-btn');
        this.elements.hintBtn = document.getElementById('hint-btn');
        this.elements.shuffleBtn = document.getElementById('shuffle-btn');
        this.elements.restartBtn = document.getElementById('restart-btn');
        this.elements.backBtn = document.getElementById('back-btn');
        this.elements.playAgainBtn = document.getElementById('play-again-btn');
        this.elements.nextLevelBtn = document.getElementById('next-level-btn');
        this.elements.menuBtn = document.getElementById('menu-btn');
        
        // 模态框
        this.elements.resultModal = document.getElementById('result-modal');
        this.elements.helpModal = document.getElementById('help-modal');
        
        // 结果显示
        this.elements.resultTitle = document.getElementById('result-title');
        this.elements.finalScoreDisplay = document.getElementById('final-score');
        this.elements.timeLeftDisplay = document.getElementById('time-left');
        this.elements.maxComboDisplay = document.getElementById('max-combo');
        this.elements.star1 = document.getElementById('star1');
        this.elements.star2 = document.getElementById('star2');
        this.elements.star3 = document.getElementById('star3');
    },
    
    /**
     * 设置事件监听器
     */
    setupEventListeners() {
        // 按钮事件
        this.elements.hintBtn.addEventListener('click', () => WordGame.showHint());
        this.elements.shuffleBtn.addEventListener('click', () => WordGame.shuffleBoard(false));
        this.elements.restartBtn.addEventListener('click', () => WordGame.resetGame());
        this.elements.backBtn.addEventListener('click', () => WordGame.goBack());
        this.elements.playAgainBtn.addEventListener('click', () => WordGame.resetGame());
        this.elements.menuBtn.addEventListener('click', () => WordGame.goBack());
        this.elements.nextLevelBtn.addEventListener('click', () => WordGame.goToNextLevel());
        
        // 主题选择器
        document.getElementById('theme-selector').addEventListener('change', this.handleThemeChange.bind(this));
        
        // 关闭帮助按钮
        document.getElementById('close-help-btn').addEventListener('click', () => {
            this.elements.helpModal.classList.remove('active');
        });
        
        // 自定义背景上传
        document.getElementById('bg-upload').addEventListener('change', this.handleBgUpload.bind(this));
        
        // 事件订阅
        WordUtils.EventSystem.on('game:updateUI', this.updateGameInfo.bind(this));
        WordUtils.EventSystem.on('game:over', this.showGameResult.bind(this));
    },
    
    /**
     * 创建帮助按钮
     */
    createHelpButton() {
        const helpBtn = document.createElement('button');
        helpBtn.className = 'btn help-btn';
        helpBtn.innerHTML = '?';
        helpBtn.title = "查看游戏规则";
        
        helpBtn.addEventListener('click', () => {
            this.elements.helpModal.classList.add('active');
        });
        
        document.querySelector('.container').appendChild(helpBtn);
    },
    
    /**
     * 初始化主题选择器
     */
    initThemeSelector() {
        try {
            const savedTheme = localStorage.getItem(WordConfig.STORAGE_KEYS.THEME);
            const themeSelector = document.getElementById('theme-selector');
            
            if (savedTheme) {
                themeSelector.value = savedTheme;
                document.body.classList.add('theme-' + savedTheme);
                
                if (savedTheme === 'custom') {
                    document.getElementById('custom-bg-upload').style.display = 'block';
                    // 加载保存的自定义背景
                    const customBg = localStorage.getItem(WordConfig.STORAGE_KEYS.CUSTOM_BG);
                    if (customBg) {
                        document.body.style.background = `url(${customBg})`;
                    }
                }
            }
        } catch (e) {
            console.warn('主题加载失败', e);
        }
    },
    
    /**
     * 处理主题变更
     * @param {Event} event - 事件对象
     */
    handleThemeChange(event) {
        const theme = event.target.value;
        const customBgUpload = document.getElementById('custom-bg-upload');
        
        // 重置所有主题相关的类名和背景
        document.body.className = '';
        document.body.style.background = '';
        
        if (theme === 'custom') {
            customBgUpload.style.display = 'block';
            
            // 如果已经有保存的自定义背景，则应用它
            try {
                const customBg = localStorage.getItem(WordConfig.STORAGE_KEYS.CUSTOM_BG);
                if (customBg) {
                    document.body.style.background = `url(${customBg})`;
                    document.body.classList.add('theme-custom');
                }
            } catch (e) {
                WordUtils.ErrorManager.showToast('背景图片加载失败，请重新上传较小的图片');
            }
        } else {
            customBgUpload.style.display = 'none';
            document.body.classList.add('theme-' + theme);
            
            // 保存用户选择的主题
            localStorage.setItem(WordConfig.STORAGE_KEYS.THEME, theme);
        }
    },
    
    /**
     * 处理背景图片上传
     * @param {Event} event - 事件对象
     */
    handleBgUpload(event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    document.body.style.background = `url(${e.target.result})`;
                    document.body.classList.add('theme-custom');
                    
                    // 尝试保存自定义背景
                    try {
                        localStorage.setItem(WordConfig.STORAGE_KEYS.CUSTOM_BG, e.target.result);
                    } catch (error) {
                        console.warn('图片太大，无法保存到localStorage', error);
                        WordUtils.ErrorManager.showToast('图片已应用，但太大无法保存。下次重新加载页面需重新上传。');
                    }
                } catch (error) {
                    console.error('应用背景失败', error);
                    WordUtils.ErrorManager.showToast('背景应用失败，请尝试其他图片');
                }
            }
            reader.readAsDataURL(file);
        }
    },
    
    /**
     * 更新游戏信息显示
     * @param {Object} data - 游戏状态数据
     */
    updateGameInfo(data) {
        if (data.score !== undefined) this.elements.scoreDisplay.textContent = data.score;
        if (data.combo !== undefined) this.elements.comboDisplay.textContent = data.combo;
        if (data.matchedPairs !== undefined) this.elements.matchedPairsDisplay.textContent = data.matchedPairs;
        if (data.totalPairs !== undefined) this.elements.totalPairsDisplay.textContent = data.totalPairs;
        if (data.timeLimit !== undefined) this.elements.timeDisplay.textContent = data.timeLimit;
        
        // 更新进度条
        if (data.matchedPairs !== undefined && data.totalPairs !== undefined) {
            const progress = (data.matchedPairs / data.totalPairs) * 100;
            this.elements.progressFill.style.width = `${progress}%`;
        }
    },
    
    /**
     * 显示加分动画
     * @param {number} points - 得分
     * @param {HTMLElement} card - 卡片元素
     */
    showPointsAnimation(points, card) {
        if (!card) return;
        
        // 获取匹配卡片的位置
        const rect = card.getBoundingClientRect();
        const gameRect = document.getElementById('game-board').getBoundingClientRect();
        
        const pointsElement = document.createElement('div');
        pointsElement.textContent = `+${points}`;
        pointsElement.style.position = 'absolute';
        pointsElement.style.color = '#ffeb3b';
        pointsElement.style.fontWeight = 'bold';
        pointsElement.style.fontSize = '24px';
        pointsElement.style.top = `${rect.top - gameRect.top}px`;
        pointsElement.style.left = `${rect.left - gameRect.left + rect.width/2}px`;
        pointsElement.style.transform = 'translateX(-50%)';
        pointsElement.style.animation = 'pointsFade 1.5s forwards';
        pointsElement.style.zIndex = '1000';
        pointsElement.style.pointerEvents = 'none';
        pointsElement.style.textShadow = '0 0 5px rgba(0, 0, 0, 0.5)';
        
        document.getElementById('game-board').appendChild(pointsElement);
        
        setTimeout(() => {
            pointsElement.remove();
        }, 1500);
    },
    
    /**
     * 创建胜利的彩花效果
     */
    createConfetti() {
        const confettiCount = 150;
        const colors = ['#f39c12', '#e74c3c', '#3498db', '#2ecc71', '#9b59b6'];
        
        for (let i = 0; i < confettiCount; i++) {
            const confetti = document.createElement('div');
            confetti.className = 'confetti';
            confetti.style.left = `${Math.random() * 100}%`;
            confetti.style.top = `${Math.random() * 100}%`;
            confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            confetti.style.width = `${Math.random() * 10 + 5}px`;
            confetti.style.height = `${Math.random() * 10 + 5}px`;
            confetti.style.position = 'fixed';
            confetti.style.zIndex = '1001';
            confetti.style.opacity = '0';
            confetti.style.animation = `confetti-fall ${Math.random() * 3 + 2}s forwards`;
            confetti.style.animationDelay = `${Math.random() * 2}s`;
            
            document.body.appendChild(confetti);
            
            setTimeout(() => {
                confetti.remove();
            }, 5000);
        }
    },
    
    /**
     * 显示游戏结果
     * @param {Object} data - 游戏结果数据
     */
    showGameResult(data) {
        // 更新结果界面
        this.elements.finalScoreDisplay.textContent = data.score;
        this.elements.timeLeftDisplay.textContent = data.timeLimit;
        this.elements.maxComboDisplay.textContent = data.maxCombo;
        
        // 计算星级
        const maxScore = data.totalPairs * 30; // 理想满分
        const percentage = data.score / maxScore;
        
        let stars = 0;
        if (percentage >= 0.3) stars = 1;
        if (percentage >= 0.6) stars = 2;
        if (percentage >= 0.8 || data.isWin) stars = 3;
        
        // 显示星星
        this.elements.star1.classList.toggle('filled', stars >= 1);
        this.elements.star2.classList.toggle('filled', stars >= 2);
        this.elements.star3.classList.toggle('filled', stars >= 3);
        
        // 设置标题
        this.elements.resultTitle.textContent = data.isWin ? "恭喜完成!" : "时间到!";
        
        // 显示/隐藏下一关按钮
        this.elements.nextLevelBtn.style.display = data.nextLevelAvailable ? 'inline-block' : 'none';
        
        // 如果获胜，展示粒子效果
        if (data.isWin) {
            this.createConfetti();
        }
        
        // 显示结果弹窗
        this.elements.resultModal.classList.add('active');
    },

    /**
     * 切换屏幕
     * @param {string} screenId - 要显示的屏幕ID
     */
    switchScreen(screenId) {
        // 隐藏所有屏幕
        document.querySelectorAll('.screen').forEach(screen => {
            screen.style.display = 'none';
        });
        
        // 立即处理游戏信息和控制按钮的显示/隐藏
        const outerInfo = document.querySelector('.outer-info');
        const outerControls = document.querySelector('.outer-controls');
        
        if (screenId === 'game-screen') {
            // 如果切换到游戏屏幕，显示游戏信息和控制按钮
            if (outerInfo) {
                outerInfo.style.cssText = 'display:flex !important; opacity:1 !important; visibility:visible !important';
            }
            if (outerControls) {
                outerControls.style.cssText = 'display:flex !important; opacity:1 !important; visibility:visible !important';
            }
        } else {
            // 否则隐藏
            if (outerInfo) {
                outerInfo.style.cssText = 'display:none !important';
            }
            if (outerControls) {
                outerControls.style.cssText = 'display:none !important';
            }
        }
        
        // 显示目标屏幕
        const targetScreen = document.getElementById(screenId);
        if (targetScreen) {
            targetScreen.style.display = 'block';
            
            // 触发屏幕切换事件
            WordUtils.EventSystem.trigger('screen:changed', { screen: screenId });
            
            // 添加进入动画
            targetScreen.classList.remove('screen-fade-in');
            void targetScreen.offsetWidth; // 触发重排
            targetScreen.classList.add('screen-fade-in');
        }
    }
};