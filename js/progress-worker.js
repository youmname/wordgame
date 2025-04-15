/**
 * 进度计算工作线程
 * 用于在后台计算和更新进度数据
 */

// 监听主线程消息
self.onmessage = function(e) {
  const { type, data } = e.data;
  
  switch (type) {
    case 'calculateProgress':
      const result = calculateProgress(data);
      self.postMessage(result);
      break;
      
    case 'simulateProgress':
      simulateProgressUpdate(data);
      break;
      
    default:
      console.warn('未知消息类型:', type);
  }
};

/**
 * 计算进度数据
 * @param {Object} data 输入数据
 * @returns {Object} 计算后的进度
 */
function calculateProgress(data) {
  // 示例：计算用户连续学习天数进度
  const streakProgress = {
    value: data.streak || 0,
    max: 7,
    percentage: Math.min(100, Math.round(((data.streak || 0) / 7) * 100))
  };
  
  // 示例：计算掌握单词进度
  const masteryProgress = {
    value: data.mastery || 0,
    max: 100,
    percentage: Math.min(100, Math.round(((data.mastery || 0) / 100) * 100))
  };
  
  return {
    streakProgress,
    masteryProgress,
    timestamp: Date.now()
  };
}

/**
 * 模拟进度更新
 * @param {Object} options 配置选项
 */
function simulateProgressUpdate(options = {}) {
  const { duration = 10000, interval = 500, startValue = 0, endValue = 100 } = options;
  const steps = duration / interval;
  const increment = (endValue - startValue) / steps;
  
  let currentValue = startValue;
  let step = 0;
  
  // 定时发送进度更新
  const updateInterval = setInterval(() => {
    step++;
    currentValue += increment;
    
    // 发送当前进度
    self.postMessage({
      type: 'progressUpdate',
      progress: Math.min(endValue, currentValue),
      percentage: Math.min(100, Math.round((currentValue / endValue) * 100)),
      step,
      totalSteps: steps,
      isComplete: step >= steps
    });
    
    // 完成后清除定时器
    if (step >= steps) {
      clearInterval(updateInterval);
    }
  }, interval);
}
