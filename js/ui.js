/**
 * 切换显示的屏幕
 * @param {string} screenId - 要显示的屏幕ID
 */
function switchScreen(screenId) {
    // 隐藏所有屏幕
    document.querySelectorAll('.screen').forEach(screen => {
        screen.style.display = 'none';
    });
    
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