/**
 * 简单的状态管理模块
 * 提供创建状态存储的函数，支持状态订阅和更新
 */

/**
 * 创建状态管理器
 * @param {Object} initialState - 初始状态对象
 * @returns {Object} 状态管理API对象
 */
export function createStateManager(initialState = {}) {
  // 当前状态
  let state = { ...initialState };
  
  // 监听器数组
  const listeners = [];
  
  /**
   * 获取当前状态的副本
   * @returns {Object} 状态对象的副本
   */
  function getState() {
    return { ...state };
  }
  
  /**
   * 更新状态
   * @param {Object|Function} update - 状态更新对象或更新函数
   */
  function setState(update) {
    const prevState = { ...state };
    
    if (typeof update === 'function') {
      state = { ...state, ...update(state) };
    } else {
      state = { ...state, ...update };
    }
    
    // 如果状态有变化才通知监听器
    if (JSON.stringify(prevState) !== JSON.stringify(state)) {
      notifyListeners(state, prevState);
    }
  }
  
  /**
   * 通知所有监听器状态已更新
   * @param {Object} newState - 新状态
   * @param {Object} oldState - 旧状态
   * @private
   */
  function notifyListeners(newState, oldState) {
    listeners.forEach(listener => {
      try {
        listener(newState, oldState);
      } catch (error) {
        console.error('状态更新监听器执行错误:', error);
      }
    });
  }
  
  /**
   * 订阅状态变化
   * @param {Function} listener - 状态变化监听器函数
   * @returns {Function} 取消订阅函数
   */
  function subscribe(listener) {
    if (typeof listener !== 'function') {
      throw new Error('监听器必须是函数');
    }
    
    listeners.push(listener);
    
    // 返回取消订阅函数
    return function unsubscribe() {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    };
  }
  
  /**
   * 重置状态为初始状态
   */
  function resetState() {
    setState(initialState);
  }
  
  // 返回公共API
  return {
    getState,
    setState,
    subscribe,
    resetState
  };
}

// 数值动画函数
function animateValues(userData) {
    // 动画显示用户积分
    animateValue('user-score', 0, userData.score, 1500);
    
    // 动画显示学习时间
    animateValue('user-minutes', 0, userData.minutes, 1500);
    
    // 动画显示连续学习天数
    animateValue('streak-days', 0, userData.stats.streakDays, 1000);
    
    // 动画显示已掌握单词数
    animateValue('mastered-words', 0, userData.stats.masteredWords, 1000);
  }