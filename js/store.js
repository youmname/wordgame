/**
 * 全局状态管理模块
 * 提供应用级状态管理，使用发布-订阅模式
 */

import { createStateManager } from './state.js';

// 初始应用状态
const initialState = {
  // 用户相关状态
  user: {
    name: '学习者',
    avatar: null,
    level: 1,
    score: 0,
    minutes: 0,
    streak: 0,
    mastery: 0
  },
  
  // 主题相关
  theme:localStorage.getItem('word_link_theme') || 'feminine',
  
  // 系统相关
  system: {
    soundEnabled: true,
    particleEffectsEnabled: true,
    notificationsEnabled: true
  },
  
  // 学习数据
  learning: {
    dailyGoal: 20,
    dailyCompleted: 0,
    totalWords: 0,
    masteredWords: 0,
    categories: [],
    recentActivity: {}
  },
  
  // UI状态
  ui: {
    loading: false,
    currentView: 'grid',
    menuOpen: false,
    rightPanelOpen: false,
    activeSection: 'home'
  },
  
  // 游戏相关
  game: {
    currentLevel: null,
    currentChapter: null,
    difficulty: 'normal',
    playMode: 'normal',
    gameMode: localStorage.getItem('gameMode') || 'jiyiMode'
  }
};

// 将初始状态存储在window对象中
window.initialState = initialState;

// 创建状态管理器
const { getState, setState, subscribe } = createStateManager(initialState);

// 将状态管理器存储在window对象中
window.getState = getState;
window.setState = setState;
window.subscribe = subscribe;

/**
 * 更新用户数据
 * @param {Object} userData - 用户数据对象
 */
function updateUserData(userData) {
  setState(state => ({
    ...state,
    user: {
      ...state.user,
      ...userData
    }
  }));
}

// 将updateUserData函数存储在window对象中
window.updateUserData = updateUserData;

/**
 * 更新主题
 * @param {string} theme - 主题名称
 */
function updateTheme(theme) {
  setState(state => ({
    ...state,
    theme
  }));
}

// 将updateTheme函数存储在window对象中
window.updateTheme = updateTheme;

/**
 * 更新系统设置
 * @param {Object} settings - 系统设置对象
 */
function updateSystemSettings(settings) {
  setState(state => ({
    ...state,
    system: {
      ...state.system,
      ...settings
    }
  }));
}

// 将updateSystemSettings函数存储在window对象中
window.updateSystemSettings = updateSystemSettings;

/**
 * 更新学习数据
 * @param {Object} learningData - 学习数据对象
 */
function updateLearningData(learningData) {
  setState(state => ({
    ...state,
    learning: {
      ...state.learning,
      ...learningData
    }
  }));
}

// 将updateLearningData函数存储在window对象中
window.updateLearningData = updateLearningData;

/**
 * 更新UI状态
 * @param {Object} uiState - UI状态对象
 */
function updateUiState(uiState) {
  setState(state => ({
    ...state,
    ui: {
      ...state.ui,
      ...uiState
    }
  }));
}

// 将updateUiState函数存储在window对象中
window.updateUiState = updateUiState;

/**
 * 更新游戏状态
 * @param {Object} gameState - 游戏状态对象
 */
function updateGameState(gameState) {
  setState(state => ({
    ...state,
    game: {
      ...state.game,
      ...gameState
    }
  }));
}

// 将updateGameState函数存储在window对象中
window.updateGameState = updateGameState;

/**
 * 更新游戏模式
 * @param {string} gameMode - 游戏模式
 */
function updateGameMode(gameMode) {
  localStorage.setItem('gameMode', gameMode);
  
  setState(state => ({
    ...state,
    game: {
      ...state.game,
      gameMode
    }
  }));
}

// 将updateGameMode函数存储在window对象中
window.updateGameMode = updateGameMode;

/**
 * 更新游戏内容模式
 * @param {string} playMode - 游戏内容模式 (normal/random/imported/recommended)
 */
function updatePlayMode(playMode) {
  localStorage.setItem('playMode', playMode);
  
  setState(state => ({
    ...state,
    game: {
      ...state.game,
      playMode
    }
  }));
}

// 将updatePlayMode函数存储在window对象中
window.updatePlayMode = updatePlayMode;

/**
 * 重置所有状态到初始值
 */
function resetState() {
  setState(() => initialState);
}

// 导出全局状态管理API
export const a = {
  getState,
  setState,
  subscribe,
  updateUserData,
  updateTheme,
  updateSystemSettings,
  updateLearningData,
  updateUiState,
  updateGameState,
  updateGameMode,
  updatePlayMode,
  resetState
};
// 将store对象存储在window对象中
window.store = a;

/**
 * 状态选择器 - 获取用户数据
 * @returns {Object|null} 用户数据对象或null
 */
export function selectUserData() {
  return store.getState().userData;
}
// 将selectUserData函数存储在window对象中
window.selectUserData = selectUserData;

/**
 * 状态选择器 - 获取加载状态
 * @returns {boolean} 是否正在加载
 */
export function selectLoading() {
  return store.getState().loading;
}
// 将selectLoading函数存储在window对象中
window.selectLoading = selectLoading;

/**
 * 状态选择器 - 获取错误状态
 * @returns {string|null} 错误信息或null
 */
export function selectError() {
  return store.getState().error;
}
// 将selectError函数存储在window对象中
window.selectError = selectError;

/**
 * 状态选择器 - 获取当前主题
 * @returns {string} 当前主题名称
 */
export function selectTheme() {
  return store.getState().theme;
}
// 将selectTheme函数存储在window对象中
window.selectTheme = selectTheme;

/**
 * 状态选择器 - 获取当前游戏内容模式
 * @returns {string} 当前游戏内容模式
 */
export function getPlayMode() {
  return store.getState().game.playMode || 'normal';
}
// 将getPlayMode函数存储在window对象中
window.getPlayMode = getPlayMode;

/**
 * 初始化订阅
 * 用于在页面加载时设置全局状态变化监听
 */
export function initStoreSubscriptions() {
  store.subscribe((newState, oldState) => {
    // 主题变化时更新文档属性
    if (newState.theme !== oldState.theme) {
      document.documentElement.setAttribute('data-theme', newState.theme);
    }
    
    // 可以添加其他全局状态变化监听
  });
  
  // 初始化主题
  document.documentElement.setAttribute('data-theme', store.getState().theme);
} 
// 将initStoreSubscriptions函数存储在window对象中
window.initStoreSubscriptions = initStoreSubscriptions;
