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
  theme: localStorage.getItem('word_link_theme') || 'feminine',
  
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
    gameMode: 'normal'
  }
};

// 创建状态管理器
const { getState, setState, subscribe } = createStateManager(initialState);

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

/**
 * 重置所有状态到初始值
 */
function resetState() {
  setState(() => initialState);
}

// 导出全局状态管理API
export const store = {
  getState,
  setState,
  subscribe,
  updateUserData,
  updateTheme,
  updateSystemSettings,
  updateLearningData,
  updateUiState,
  updateGameState,
  resetState
};

/**
 * 状态选择器 - 获取用户数据
 * @returns {Object|null} 用户数据对象或null
 */
export function selectUserData() {
  return store.getState().userData;
}

/**
 * 状态选择器 - 获取加载状态
 * @returns {boolean} 是否正在加载
 */
export function selectLoading() {
  return store.getState().loading;
}

/**
 * 状态选择器 - 获取错误状态
 * @returns {string|null} 错误信息或null
 */
export function selectError() {
  return store.getState().error;
}

/**
 * 状态选择器 - 获取当前主题
 * @returns {string} 当前主题名称
 */
export function selectTheme() {
  return store.getState().theme;
}

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