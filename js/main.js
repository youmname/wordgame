/**
 * 主入口模块
 * 负责初始化整个应用
 */
(function() {
    // 在DOM加载完成后初始化
    document.addEventListener('DOMContentLoaded', () => {
        console.log("Main.js: DOM fully loaded and parsed"); // 调试信息

        // 检查是否需要登录验证，但这应该在 index.html 的 <script> 块中处理了

        // 确保应用正确的主题
        ensureThemeApplied();
        
        // 初始化各个模块
        if (window.WordSoundManager) WordSoundManager.init();
        if (window.WordUI) WordUI.init();
        if (window.WordLevelSystem) WordLevelSystem.init();
        if (window.WordDataLoader) WordDataLoader.init();
        if (window.WordGame) WordGame.init();
        
        // 应用主题
        applyTheme();
        
        // 初始化控制按钮
        initControlButtons();
        
        // 根据是否显示游戏屏幕，更新游戏信息和控制的可见性
        const gameScreen = document.getElementById('game-screen');
        if (gameScreen) {
            updateGameInfoVisibility(gameScreen.style.display !== 'none');
        }
        
        // 初始化单词级别选择
        setTimeout(() => {
            initVocabularyLevels();
        }, 500);
        
        // 设置级别分类按钮事件
        setupLevelCategoryButtons();
        
        // 设置关卡项事件
        setupLevelItems();
        
        // 设置数据源按钮事件
        setupDataSourceButtons();
        
        // 应用内联样式来修复UI显示问题
        applyStyleFixes();
        
        // 添加返回主菜单按钮事件处理
        document.getElementById('back-to-menu-btn').addEventListener('click', () => {
            document.getElementById('level-screen').style.display = 'none';
            document.getElementById('start-screen').style.display = 'block';
        });
        
        console.log('页面初始化完成');
        
        // 添加容器淡入效果
        document.querySelector('.container').classList.add('fade-in');

        // 强制隐藏游戏信息和控制按钮
        const outerInfo = document.querySelector('.outer-info');
        const outerControls = document.querySelector('.outer-controls');
        
        // 直接设置 display: none
        if (outerInfo) {
            outerInfo.style.cssText = 'display:none !important';
        }
        if (outerControls) {
            outerControls.style.cssText = 'display:none !important';
        }
        
        // 监听游戏屏幕变化
        if (gameScreen) {
            // 创建一个 MutationObserver 监听游戏屏幕的 display 变化
            const observer = new MutationObserver(function(mutations) {
                checkGameScreenDisplay();
            });
            
            observer.observe(gameScreen, { 
                attributes: true, 
                attributeFilter: ['style'] 
            });
            
            // 初始检查
            checkGameScreenDisplay();
            
            // 设置更明确的屏幕显示检查函数
            function checkGameScreenDisplay() {
                // 严格检查游戏屏幕是否显示
                const isVisible = (gameScreen.style.display === 'block');
                
                if (isVisible) {
                    // 游戏屏幕显示时，显示游戏信息和控制按钮
                    console.log("游戏界面显示，显示游戏信息和控制按钮");
                    if (outerInfo) {
                        outerInfo.style.cssText = 'display:flex !important; opacity:1 !important; visibility:visible !important';
                    }
                    if (outerControls) {
                        outerControls.style.cssText = 'display:flex !important; opacity:1 !important; visibility:visible !important';
                    }
                } else {
                    // 游戏屏幕隐藏时，隐藏游戏信息和控制按钮
                    console.log("游戏界面隐藏，隐藏游戏信息和控制按钮");
                    if (outerInfo) {
                        outerInfo.style.cssText = 'display:none !important';
                    }
                    if (outerControls) {
                        outerControls.style.cssText = 'display:none !important';
                    }
                }
            }
        }
        
        // 直接监听相关按钮的点击事件
        document.querySelectorAll('.btn').forEach(btn => {
            btn.addEventListener('click', function() {
                // 给一点延迟，让屏幕切换完成
                setTimeout(() => {
                    const gameScreenVisible = (document.getElementById('game-screen').style.display === 'block');
                    
                    if (!gameScreenVisible) {
                        // 如果游戏屏幕不可见，立即隐藏游戏信息和控制按钮
                        if (outerInfo) {
                            outerInfo.style.cssText = 'display:none !important';
                        }
                        if (outerControls) {
                            outerControls.style.cssText = 'display:none !important';
                        }
                    }
                }, 100);
            });
        });

        console.log("Main.js: Initial setup finished.");
    });
})();

/**
 * 确保主题正确应用
 */
function ensureThemeApplied() {
    try {
        const savedTheme = localStorage.getItem(WordConfig.STORAGE_KEYS.THEME) || 'default';
        const themeSelector = document.getElementById('theme-selector');
        
        if (themeSelector) {
            themeSelector.value = savedTheme;
        }
        
        // 清除所有可能的主题类
        document.body.className = '';
        
        // 添加当前主题类
        if (savedTheme !== 'default') {
            document.body.classList.add('theme-' + savedTheme);
            console.log('已应用主题:', savedTheme);
        }
        
        // 处理自定义背景
        if (savedTheme === 'custom') {
            const customBgUpload = document.getElementById('custom-bg-upload');
            if (customBgUpload) {
                customBgUpload.style.display = 'block';
            }
            
            // 尝试应用保存的自定义背景
            const customBg = localStorage.getItem(WordConfig.STORAGE_KEYS.CUSTOM_BG);
            if (customBg) {
                document.body.style.background = `url(${customBg})`;
            }
        }
    } catch (e) {
        console.warn('主题应用失败:', e);
    }
}

/**
 * 应用CSS修复，确保UI正确显示
 */
function applyStyleFixes() {
    // 修复级别选择卡片样式
    const levelCategories = document.querySelectorAll('.level-category');
    levelCategories.forEach(category => {
        // 确保背景色正确
        category.style.backgroundColor = 'rgba(255, 255, 255, 0.15)';
        category.style.borderRadius = '12px';
        category.style.transition = 'all 0.3s ease';
        category.style.border = '2px solid transparent';
        
        // 添加阴影和悬停效果
        category.addEventListener('mouseenter', () => {
            category.style.transform = 'translateY(-3px)';
            category.style.backgroundColor = 'rgba(255, 255, 255, 0.25)';
            category.style.boxShadow = '0 5px 15px rgba(0, 0, 0, 0.1)';
        });
        
        category.addEventListener('mouseleave', () => {
            if (!category.classList.contains('active')) {
                category.style.transform = '';
                category.style.backgroundColor = 'rgba(255, 255, 255, 0.15)';
                category.style.boxShadow = '';
            }
        });
        
        // 设置活跃状态样式
        if (category.classList.contains('active')) {
            category.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
            category.style.borderColor = 'rgba(243, 156, 18, 0.7)';
            category.style.boxShadow = '0 0 10px rgba(243, 156, 18, 0.4)';
        }
    });
    
    // 修复数据源按钮样式
    const sourceButtons = document.querySelectorAll('.source-btn');
    sourceButtons.forEach(btn => {
        if (btn.classList.contains('active')) {
            btn.style.backgroundColor = '#ffe066';
            btn.style.borderColor = '#f1c40f';
            btn.style.boxShadow = '0 0 5px 1px rgba(241, 196, 15, 0.5), 0 0 8px 2px rgba(243, 156, 18, 0.3)';
        }
    });
    
    // 确保外部控制按钮和信息面板样式正确应用
    const outerInfo = document.querySelector('.outer-info');
    const outerControls = document.querySelector('.outer-controls');
    
    if (outerInfo) {
        // 确保信息面板样式
        outerInfo.style.zIndex = '1000';
        outerInfo.style.transition = 'opacity 0.5s ease';
    }
    
    if (outerControls) {
        // 确保控制按钮样式
        outerControls.style.zIndex = '1001';
        outerControls.style.transition = 'opacity 0.5s ease';
    }
}

function updateUI() {
    const userType = localStorage.getItem('userType');
    
    // 隐藏所有特权元素
    document.querySelectorAll('[data-role]').forEach(el => {
        el.style.display = 'none';
    });
    
    // 根据用户类型显示对应元素
    if (userType === 'admin') {
        document.querySelectorAll('[data-role="admin"]').forEach(el => {
            el.style.display = 'block';
        });
    } else if (userType === 'vip') {
        document.querySelectorAll('[data-role="vip"]').forEach(el => {
            el.style.display = 'block';
        });
    }
    
    // 所有登录用户可见
    document.querySelectorAll('[data-role="user"]').forEach(el => {
        el.style.display = 'block';
    });
}

/**
 * 初始化单词级别选择
 */
async function initVocabularyLevels() {
    try {
        // 获取所有单词级别
        const levels = await WordDataLoader.loadVocabularyLevels();
        console.log('加载到的单词级别:', levels);
        
        if (levels.length === 0) {
            console.warn('没有找到单词级别数据');
            return;
        }
        
        // 获取所有现有的级别卡片
        const existingCategories = document.querySelectorAll('.level-category');
        
        // 为每个级别卡片设置对应的level_id数据属性
        existingCategories.forEach(category => {
            const categoryName = category.getAttribute('data-category');
            
            // 在数据库中查找匹配的级别
            const matchingLevel = levels.find(level => level.name === categoryName);
            
            if (matchingLevel) {
                // 找到匹配的级别，设置ID
                category.setAttribute('data-level-id', matchingLevel.id);
                console.log(`为级别 ${categoryName} 设置ID: ${matchingLevel.id}`);
                
                // 显示该级别卡片
                category.style.display = 'flex';
            } else {
                // 没有找到匹配的级别，隐藏该卡片
                console.warn(`数据库中没有找到级别: ${categoryName}`);
                category.style.display = 'none';
            }
        });
        
        // 确保有一个默认选中的级别
        let hasActive = false;
        existingCategories.forEach(category => {
            if (category.classList.contains('active') && category.style.display !== 'none') {
                hasActive = true;
                
                // 加载该级别的章节
                const levelId = category.getAttribute('data-level-id');
                if (levelId) {
                    loadChaptersForLevel(levelId);
                }
            }
        });
        
        // 如果没有选中的级别，选择第一个可见的级别
        if (!hasActive) {
            for (const category of existingCategories) {
                if (category.style.display !== 'none') {
                    category.classList.add('active');
                    
                    // 触发该级别的加载
                    const levelId = category.getAttribute('data-level-id');
                    if (levelId) {
                        loadChaptersForLevel(levelId);
                    }
                    break;
                }
            }
        }
    } catch (error) {
        console.error('初始化单词级别选择失败:', error);
    }
}

/**
 * 设置级别分类按钮的事件处理
 */
function setupLevelCategoryButtons() {
    document.addEventListener('click', function(e) {
        // 使用事件委托，处理所有.level-category按钮的点击
        if (e.target && e.target.closest('.level-category')) {
            // 获取点击的级别元素（支持点击内部元素）
            const categoryElement = e.target.closest('.level-category');
            
            // 忽略被禁用或隐藏的级别
            if (categoryElement.classList.contains('disabled') || categoryElement.style.display === 'none') {
                 console.log('Clicked on a disabled or hidden level category.');
                 return; // 如果是禁用或隐藏的，不执行任何操作
            }
            
            // 移除所有按钮的active类
            document.querySelectorAll('.level-category').forEach(btn => {
                btn.classList.remove('active');
                // 不再需要JS设置样式，这些应由CSS处理
                // btn.style.transform = '';
                // btn.style.backgroundColor = 'rgba(255, 255, 255, 0.15)';
                // btn.style.boxShadow = '';
                // btn.style.borderColor = 'transparent';
            });
            
            // 给当前点击的按钮添加active类
            categoryElement.classList.add('active');
            
            // 不再需要JS设置选中样式，CSS会处理 .active 类
            // categoryElement.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
            // categoryElement.style.borderColor = 'rgba(243, 156, 18, 0.7)';
            // categoryElement.style.boxShadow = '0 0 10px rgba(243, 156, 18, 0.4)';
            
            // 获取选中的级别ID和名称
            const levelId = categoryElement.getAttribute('data-level-id');
            const categoryName = categoryElement.getAttribute('data-category');
            
            if (levelId) {
                console.log(`选择的级别: ${categoryName}，ID: ${levelId}`);
                
                // 加载该级别的章节
                loadChaptersForLevel(levelId);
                
                // 保存当前选择的级别(如果需要)
                if (window.WordLevelSystem) {
                    WordLevelSystem.currentCategory = categoryName;
                    WordLevelSystem.currentLevelId = levelId;
                }
            } else {
                console.warn(`级别卡片 ${categoryName} 没有有效的data-level-id属性，无法加载数据`);
                // 可能需要清空章节列表或其他处理
                // clearChapterSelection();
            }
        }
    });
}

/**
 * 根据级别ID加载章节
 * @param {number} levelId - 级别ID
 */
async function loadChaptersForLevel(levelId) {
    try {
        // 加载章节数据
        const chapters = await WordDataLoader.loadLevelChapters(levelId);
        console.log(`加载到级别${levelId}的章节:`, chapters);
        
        // 渲染关卡选择界面
        renderLevelItems(chapters);
    } catch (error) {
        console.error(`加载级别${levelId}的章节失败:`, error);
    }
}

/**
 * 渲染关卡选择项
 * @param {Array} chapters - 章节数组
 */
function renderLevelItems(chapters) {
    // 获取关卡网格容器
    const levelGrid = document.getElementById('level-grid');
    
    // 清空现有内容
    if (levelGrid) {
        levelGrid.innerHTML = '';
        
        // 添加关卡项
        chapters.forEach(chapter => {
            const levelItem = document.createElement('div');
            levelItem.className = 'level-item';
            levelItem.setAttribute('data-level', chapter.id);
            
            const levelTitle = document.createElement('h3');
            levelTitle.textContent = chapter.name;
            
            const levelDesc = document.createElement('p');
            levelDesc.textContent = chapter.description || chapter.name;
            
            levelItem.appendChild(levelTitle);
            levelItem.appendChild(levelDesc);
            levelGrid.appendChild(levelItem);
        });
    }
}

/**
 * 设置关卡项的事件处理
 */
function setupLevelItems() {
    // 使用事件委托处理关卡项点击
    document.addEventListener('click', function(e) {
        // 找到被点击的关卡项元素
        let levelItem = e.target;
        
        // 向上查找直到找到.level-item元素或null
        while (levelItem && !levelItem.classList.contains('level-item')) {
            levelItem = levelItem.parentElement;
        }
        
        if (levelItem && levelItem.hasAttribute('data-level')) {
            // 获取关卡编号
            const level = levelItem.getAttribute('data-level');
            console.log('选择的关卡:', level);
            
            // 保存所选关卡索引
            WordLevelSystem.levelData.currentLevel = parseInt(level);
            WordLevelSystem.saveLevelData();
            
            // 隐藏关卡选择界面
            document.getElementById('level-screen').style.display = 'none';
            
            // 显示游戏界面
            document.getElementById('game-screen').style.display = 'block';
            
            // 开始游戏
            WordGame.startGame();
        }
    });
}

/**
 * 设置数据源按钮的事件处理
 */
function setupDataSourceButtons() {
    const sourceButtons = document.querySelectorAll('.source-btn');
    const selectedSourceInput = document.getElementById('selected-source');
    
    sourceButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            // 移除所有按钮的active类
            sourceButtons.forEach(b => b.classList.remove('active'));
            
            // 给当前点击的按钮添加active类
            this.classList.add('active');
            
            // 更新隐藏的input值
            const sourceValue = this.getAttribute('data-source');
            selectedSourceInput.value = sourceValue;
            
            // 隐藏所有选项区域
            document.getElementById('upload-selector').style.display = 'none';
            document.getElementById('random-selector').style.display = 'none';
            document.getElementById('custom-input').style.display = 'none';
            document.getElementById('chapter-selector').style.display = 'none';
            
            // 显示对应的选项区域
            if (sourceValue === 'upload') {
                document.getElementById('upload-selector').style.display = 'block';
            } else if (sourceValue === 'random') {
                document.getElementById('random-selector').style.display = 'block';
            } else if (sourceValue === 'custom') {
                document.getElementById('custom-input').style.display = 'block';
            } else if (sourceValue === 'chapter') {
                document.getElementById('chapter-selector').style.display = 'block';
            }
        });
    });
}

/**
 * 根据游戏屏幕可见性更新游戏信息和控制的显示
 */
function updateGameInfoVisibility(isGameVisible) {
    const gameInfo = document.querySelector('.game-info');
    const gameControls = document.querySelector('.game-controls');
    
    if (gameInfo) {
        gameInfo.style.display = isGameVisible ? 'flex' : 'none';
    }
    
    if (gameControls) {
        gameControls.style.display = isGameVisible ? 'flex' : 'none';
    }
    
    // 如果WordUI存在，更新UI状态
    if (window.WordUI) {
        // 检查是否有updateUIState方法
        if (typeof WordUI.updateUIState === 'function') {
            WordUI.updateUIState();
        }
    }
}