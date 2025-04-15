/**
 * 主题管理模块
 * 提供主题切换、持久化和应用功能
 */

// 可用主题列表
const THEMES = {
  FEMININE: 'feminine',  // 柔和主题
  MASCULINE: 'masculine' // 刚硬主题
};

// 默认主题
const DEFAULT_THEME = THEMES.FEMININE;

// 主题存储键名
const THEME_STORAGE_KEY = 'word_link_theme';

/**
 * 初始化主题系统
 * 从本地存储加载主题并应用
 */
export function initTheme() {
  const savedTheme = localStorage.getItem(THEME_STORAGE_KEY) || DEFAULT_THEME;
  applyTheme(savedTheme);
  
  // 绑定主题切换按钮事件
  const themeButtons = document.querySelectorAll('.theme-btn');
  themeButtons.forEach(button => {
    const theme = button.getAttribute('data-theme');
    if (theme) {
      button.addEventListener('click', () => {
        setTheme(theme);
        // 给用户视觉反馈
        button.classList.add('active');
        setTimeout(() => {
          button.classList.remove('active');
        }, 300);
      });
    }
    
    // 标记当前活动主题按钮
    if (button.getAttribute('data-theme') === savedTheme) {
      button.classList.add('current');
    }
  });
}

/**
 * 设置主题并保存到本地存储
 * @param {string} theme - 主题名称
 */
export function setTheme(theme) {
  if (!Object.values(THEMES).includes(theme)) {
    console.warn(`未知主题: ${theme}，将使用默认主题`);
    theme = DEFAULT_THEME;
  }
  
  localStorage.setItem(THEME_STORAGE_KEY, theme);
  applyTheme(theme);
  
  // 更新当前主题按钮状态
  document.querySelectorAll('.theme-btn').forEach(button => {
    if (button.getAttribute('data-theme') === theme) {
      button.classList.add('current');
    } else {
      button.classList.remove('current');
    }
  });
  
  // 触发主题变更事件，便于其他组件响应
  const event = new CustomEvent('themeChange', { detail: { theme } });
  document.dispatchEvent(event);
}

/**
 * 应用主题到DOM
 * @param {string} theme - 主题名称
 */
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  
  // 主题加载后触发动画
  document.body.classList.remove('theme-transition');
  // 触发重排以应用过渡动画
  void document.body.offsetWidth;
  document.body.classList.add('theme-transition');
}

/**
 * 获取当前主题
 * @returns {string} 当前主题名称
 */
export function getCurrentTheme() {
  return localStorage.getItem(THEME_STORAGE_KEY) || DEFAULT_THEME;
}

/**
 * 切换到下一个主题
 * 在可用主题间循环切换
 */
export function toggleNextTheme() {
  const currentTheme = getCurrentTheme();
  const themes = Object.values(THEMES);
  const currentIndex = themes.indexOf(currentTheme);
  const nextIndex = (currentIndex + 1) % themes.length;
  setTheme(themes[nextIndex]);
}

// 导出主题常量
export { THEMES }; 