/**
 * 主入口模块
 * 负责初始化整个应用
 */
(function() {
    // 在DOM加载完成后初始化
    document.addEventListener('DOMContentLoaded', () => {
        console.log("Main.js: DOM fully loaded and parsed"); // 调试信息

        // 检查是否需要登录验证，但这应该在 index.html 的 <script> 块中处理了

        // 初始化各个模块
        WordSoundManager.init();
        WordDataLoader.init();
        WordUI.init();
        WordLevelSystem.init();
        WordGame.init();
        
        // 添加级别分类按钮事件处理
        setupLevelCategoryButtons();
        
        // 添加关卡选择事件处理
        setupLevelItems();
        
        // 添加返回主菜单按钮事件处理
        document.getElementById('back-to-menu-btn').addEventListener('click', () => {
            document.getElementById('level-screen').style.display = 'none';
            document.getElementById('start-screen').style.display = 'block';
        });

        // 设置数据源按钮组
        setupDataSourceButtons();
        
        // 给DOM完全加载的时间，然后再初始化控制按钮
        setTimeout(() => {
            // 初始化控制按钮
            if(typeof initControlButtons === 'function') {
                try {
                    console.log("Starting control buttons initialization...");
                    initControlButtons();
                } catch (error) {
                    console.error("Error during button initialization:", error);
                }
            }
        }, 300);
        
        console.log('单词连连看游戏初始化完成!');
        
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
        const gameScreen = document.getElementById('game-screen');
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
 * 设置级别分类按钮的事件处理
 */
function setupLevelCategoryButtons() {
    const categoryButtons = document.querySelectorAll('.level-category');
    categoryButtons.forEach(button => {
        button.addEventListener('click', function() {
            // 移除所有按钮的active类
            categoryButtons.forEach(btn => btn.classList.remove('active'));
            
            // 给当前点击的按钮添加active类
            this.classList.add('active');
            
            // 获取选中的类别
            const category = this.getAttribute('data-category');
            console.log('选择的单词分类:', category);
            
            // 可以在这里根据类别更新关卡数据
            // 目前是演示，所以所有类别都使用相同的关卡数据
        });
    });
}

/**
 * 设置关卡项的事件处理
 */
function setupLevelItems() {
    const levelItems = document.querySelectorAll('.level-item');
    levelItems.forEach(item => {
        item.addEventListener('click', function() {
            // 获取关卡编号
            const level = this.getAttribute('data-level');
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
        });
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