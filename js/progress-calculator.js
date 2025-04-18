// Web Worker用于后台计算性能密集型任务
self.onmessage = function(e) {
  // 接收主线程发送的数据
  const stats = e.data;
  
  // 复杂计算逻辑
  const result = {
    streak: calculateStreakProgress(stats.streakDays),
    mastery: calculateMasteryProgress(stats.masteredWords),
    estimatedCompletionDays: calculateEstimatedCompletion(stats.masteredWords, stats.todayCompleted)
  };
  
  // 将结果发送回主线程
  self.postMessage(result);
};

// 计算连续学习进度
function calculateStreakProgress(days) {
  const target = 10;
  const percentage = Math.min(days / target * 100, 100);
  return {
    percentage,
    daysLeft: Math.max(target - days, 0),
    isComplete: days >= target
  };
}

// 计算掌握单词进度
function calculateMasteryProgress(words) {
  const target = 1000;
  const percentage = Math.min(words / target * 100, 100);
  return {
    percentage,
    wordsLeft: Math.max(target - words, 0),
    isComplete: words >= target,
    milestones: [
      { at: 100, reached: words >= 100, badge: "初学者" },
      { at: 300, reached: words >= 300, badge: "进阶者" },
      { at: 600, reached: words >= 600, badge: "专家" },
      { at: 1000, reached: words >= 1000, badge: "大师" }
    ]
  };
}

// 计算估计完成天数
function calculateEstimatedCompletion(masteredWords, dailyRate) {
  if (dailyRate <= 0) return Infinity;
  const wordsLeft = 1000 - masteredWords;
  return Math.ceil(wordsLeft / dailyRate);
} 