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