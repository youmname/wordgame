/**
 * 游戏模式模块
 * 提供各种游戏模式的动态算法，支持自适应难度调整
 */

/**
 * 游戏难度管理器
 * 基于玩家表现动态调整难度
 */
export class DifficultyManager {
  constructor(options = {}) {
    this.baseLevel = options.baseLevel || 1;
    this.maxLevel = options.maxLevel || 10;
    this.currentLevel = this.baseLevel;
    this.adaptiveRate = options.adaptiveRate || 0.3; // 难度适应速率
    
    // 玩家表现历史数据
    this.performanceHistory = [];
    this.historyLimit = options.historyLimit || 10;
    
    // 难度调整因子
    this.timeWeightFactor = options.timeWeightFactor || 0.4;
    this.accuracyWeightFactor = options.accuracyWeightFactor || 0.4;
    this.streakWeightFactor = options.streakWeightFactor || 0.2;
    
    // 是否启用难度回退预防（防止难度波动）
    this.preventRegression = options.preventRegression || false;
    
    // 初始化
    this.reset();
  }
  
  /**
   * 重置难度状态
   */
  reset() {
    this.currentLevel = this.baseLevel;
    this.performanceHistory = [];
    this.lastAdjustmentTime = Date.now();
    this.completedLevels = new Set();
  }
  
  /**
   * 更新玩家表现数据并调整难度
   * @param {Object} performance 玩家表现数据
   * @returns {Number} 调整后的难度级别
   */
  updatePerformance(performance) {
    // 记录表现
    this.performanceHistory.push({
      ...performance,
      timestamp: Date.now()
    });
    
    // 保持历史记录限制
    if (this.performanceHistory.length > this.historyLimit) {
      this.performanceHistory.shift();
    }
    
    // 计算新难度
    const newLevel = this.calculateNextLevel();
    
    // 记录已完成的难度级别
    if (performance.completed) {
      this.completedLevels.add(this.currentLevel);
    }
    
    // 如果启用了难度回退预防，只允许提高难度
    if (this.preventRegression && newLevel < this.currentLevel) {
      return this.currentLevel;
    }
    
    // 更新当前难度，确保在合理范围内
    this.currentLevel = Math.max(
      this.baseLevel,
      Math.min(newLevel, this.maxLevel)
    );
    
    return this.currentLevel;
  }
  
  /**
   * 计算下一个难度级别
   * @returns {Number} 建议的难度级别
   */
  calculateNextLevel() {
    if (this.performanceHistory.length < 1) {
      return this.currentLevel;
    }
    
    // 获取最近的表现数据
    const recentPerformance = this.performanceHistory.slice(-3);
    
    // 计算加权得分
    let weightedScore = 0;
    let totalWeight = 0;
    
    recentPerformance.forEach((perf, index) => {
      const recencyWeight = (index + 1) / recentPerformance.length;
      
      // 计算时间效率分数（越快越好）
      const timeScore = perf.timeEfficiency !== undefined
        ? perf.timeEfficiency
        : (perf.optimalTime && perf.actualTime)
          ? Math.min(1, perf.optimalTime / perf.actualTime)
          : 0.5;
      
      // 计算准确度分数
      const accuracyScore = perf.accuracy !== undefined
        ? perf.accuracy
        : (perf.totalMoves && perf.correctMoves)
          ? perf.correctMoves / perf.totalMoves
          : 0.5;
      
      // 计算连续成功分数
      const streakScore = perf.streak !== undefined
        ? Math.min(1, perf.streak / 5)
        : 0.5;
      
      // 综合得分（加权）
      const perfScore = (
        timeScore * this.timeWeightFactor +
        accuracyScore * this.accuracyWeightFactor +
        streakScore * this.streakWeightFactor
      );
      
      weightedScore += perfScore * recencyWeight;
      totalWeight += recencyWeight;
    });
    
    // 归一化得分
    const normalizedScore = weightedScore / totalWeight;
    
    // 将得分转换为难度调整
    // 得分 > 0.8 显著提高难度
    // 得分 0.6-0.8 轻微提高难度
    // 得分 0.4-0.6 保持难度
    // 得分 < 0.4 降低难度
    let adjustment = 0;
    if (normalizedScore > 0.8) {
      adjustment = 1;
    } else if (normalizedScore > 0.6) {
      adjustment = 0.5;
    } else if (normalizedScore < 0.4) {
      adjustment = -0.5;
    }
    
    // 应用适应率和四舍五入
    return Math.round(this.currentLevel + adjustment * this.adaptiveRate);
  }
  
  /**
   * 获取特定参数的难度系数
   * @param {String} paramName 参数名称
   * @returns {Number} 难度系数
   */
  getDifficultyFactor(paramName) {
    const level = this.currentLevel;
    
    switch(paramName) {
      case 'timeLimit':
        // 随难度降低可用时间，基础值100秒，每级减少5%
        return 100 * Math.pow(0.95, level - 1);
        
      case 'boardSize':
        // 随难度增加棋盘大小，基础值4x4
        if (level <= 3) return 4;
        if (level <= 6) return 6;
        if (level <= 9) return 8;
        return 10;
        
      case 'wordComplexity':
        // 词汇复杂度0-1范围
        return (level - 1) / (this.maxLevel - 1);
        
      case 'distractions':
        // 每级干扰数量
        return Math.floor((level - 1) / 2);
        
      case 'penaltyTime':
        // 错误惩罚时间（秒）
        return 2 + level;
        
      case 'revealTime':
        // 卡片显示时间（毫秒），随难度降低
        return 2000 * Math.pow(0.85, level - 1);
        
      default:
        // 默认返回难度级别本身的归一化值
        return level / this.maxLevel;
    }
  }
}

/**
 * 极速模式配置生成器
 * 根据玩家水平动态生成适合的挑战难度
 */
export class SpeedModeGenerator {
  constructor(difficultyManager) {
    this.difficultyManager = difficultyManager;
  }
  
  /**
   * 生成游戏配置
   * @param {Object} playerStats 玩家统计数据
   * @returns {Object} 游戏配置
   */
  generateConfig(playerStats) {
    const level = this.difficultyManager.currentLevel;
    
    // 基础词汇数量，随难度增加
    const baseWordCount = 6 + (level * 2);
    
    // 根据玩家统计数据调整词汇数量
    const masteredWords = playerStats.masteredWords || 0;
    const masteryFactor = Math.min(1, masteredWords / 500);
    
    // 最终词汇数量
    const wordCount = Math.floor(baseWordCount * (1 + 0.5 * masteryFactor));
    
    // 时间限制参数
    const timeLimit = this.difficultyManager.getDifficultyFactor('timeLimit');
    
    // 词汇复杂度
    const wordComplexity = this.difficultyManager.getDifficultyFactor('wordComplexity');
    
    // 板面配置
    const boardConfig = this.generateBoardConfig(level);
    
    return {
      mode: 'speed',
      level,
      wordCount,
      timeLimit,
      wordComplexity,
      board: boardConfig,
      bonusTimePerMatch: 3 * Math.pow(0.9, level - 1), // 每次匹配奖励时间，随难度降低
      minTimeBetweenMatches: 0.5 * level, // 匹配间隔时间要求
      penaltyTime: this.difficultyManager.getDifficultyFactor('penaltyTime')
    };
  }
  
  /**
   * 生成棋盘配置
   * @param {Number} level 难度级别
   * @returns {Object} 棋盘配置
   */
  generateBoardConfig(level) {
    const boardSize = this.difficultyManager.getDifficultyFactor('boardSize');
    const rows = boardSize;
    const cols = boardSize;
    
    // 每个匹配的卡片是否应该相邻（更高难度下不要求相邻）
    const requireAdjacent = level <= 5;
    
    // 每级添加一种特殊卡片类型
    const specialTileTypes = Math.min(4, Math.floor((level - 1) / 2));
    
    return {
      rows,
      cols,
      requireAdjacent,
      specialTileTypes,
      shuffleInterval: level > 7 ? 30 : 0, // 高难度时，每30秒随机重排一次
      initialRevealTime: this.difficultyManager.getDifficultyFactor('revealTime')
    };
  }
  
  /**
   * 处理游戏结果，更新难度
   * @param {Object} result 游戏结果数据
   * @returns {Number} 更新后的难度级别
   */
  processResult(result) {
    const performance = {
      accuracy: result.matchesFound / result.totalMatches,
      timeEfficiency: result.optimalTimeToComplete / result.actualTime,
      completed: result.completed,
      streak: result.longestStreak || 0
    };
    
    return this.difficultyManager.updatePerformance(performance);
  }
}

/**
 * 拼图模式生成器
 * 生成拼图类型的连连看挑战
 */
export class PuzzleModeGenerator {
  constructor(difficultyManager) {
    this.difficultyManager = difficultyManager;
  }
  
  /**
   * 生成拼图模式配置
   * @param {Object} playerStats 玩家统计数据
   * @returns {Object} 游戏配置
   */
  generateConfig(playerStats) {
    const level = this.difficultyManager.currentLevel;
    
    // 拼图尺寸
    const gridSize = this.calculateGridSize(level);
    
    // 基础时间限制，秒
    const baseTimeLimit = 180 - (level * 10);
    const timeLimit = Math.max(60, baseTimeLimit);
    
    // 单词复杂度增加
    const wordComplexity = this.difficultyManager.getDifficultyFactor('wordComplexity');
    
    // 根据难度决定是否使用动态布局
    const useDynamicLayout = level > 5;
    
    // 移动卡片后锁定时间
    const lockTime = 1000 * Math.pow(0.9, level - 1);
    
    return {
      mode: 'puzzle',
      level,
      grid: {
        rows: gridSize,
        cols: gridSize,
        dynamicLayout: useDynamicLayout
      },
      timeLimit,
      wordComplexity,
      moves: this.calculateMaxMoves(gridSize, level),
      hintCost: level, // 使用提示的惩罚移动数
      lockTime,
      showSolution: level <= 3, // 前三级显示最终解决方案
      revealPairTime: this.difficultyManager.getDifficultyFactor('revealTime')
    };
  }
  
  /**
   * 计算网格尺寸
   * @param {Number} level 难度级别
   * @returns {Number} 网格尺寸
   */
  calculateGridSize(level) {
    // 基础3x3，每2级增加1
    return 3 + Math.floor((level - 1) / 2);
  }
  
  /**
   * 计算最大移动次数
   * @param {Number} gridSize 网格尺寸
   * @param {Number} level 难度级别
   * @returns {Number} 最大移动次数
   */
  calculateMaxMoves(gridSize, level) {
    // 最优解所需移动数
    const optimalMoves = gridSize * gridSize;
    
    // 允许的额外移动，随难度减少
    const extraMoveFactor = 1 - (level - 1) / (this.difficultyManager.maxLevel - 1) * 0.5;
    const extraMoves = Math.ceil(optimalMoves * extraMoveFactor);
    
    return optimalMoves + extraMoves;
  }
  
  /**
   * 处理游戏结果，更新难度
   * @param {Object} result 游戏结果数据
   * @returns {Number} 更新后的难度级别
   */
  processResult(result) {
    // 移动效率 (最优移动数 / 实际移动数)
    const moveEfficiency = result.optimalMoves / result.actualMoves;
    
    // 完成时间效率
    const timeEfficiency = result.timeLeft / result.timeLimit;
    
    const performance = {
      accuracy: moveEfficiency,
      timeEfficiency: timeEfficiency,
      completed: result.completed,
      hintsUsed: result.hintsUsed || 0
    };
    
    // 使用提示会影响难度评估
    if (result.hintsUsed > 0) {
      performance.accuracy *= (1 - result.hintsUsed * 0.1);
    }
    
    return this.difficultyManager.updatePerformance(performance);
  }
}

/**
 * 生存模式生成器
 * 生成无限挑战的生存模式
 */
export class SurvivalModeGenerator {
  constructor(difficultyManager) {
    this.difficultyManager = difficultyManager;
    
    // 波次计数
    this.currentWave = 1;
    
    // 生存时间（秒）
    this.survivalTime = 0;
  }
  
  /**
   * 生成生存模式配置
   * @param {Object} playerStats 玩家统计数据
   * @returns {Object} 游戏配置
   */
  generateConfig(playerStats) {
    const level = this.difficultyManager.currentLevel;
    
    // 波次难度（结合当前难度和波次数）
    const effectiveLevel = Math.min(
      this.difficultyManager.maxLevel,
      level + Math.floor(this.currentWave / 3)
    );
    
    // 每波次的单词数量
    const wordsPerWave = 4 + Math.floor(this.currentWave * 1.5);
    
    // 波次时间限制（秒），随波次减少，最低20秒
    const waveTimeLimit = Math.max(
      20,
      60 - (this.currentWave * 3)
    );
    
    // 单词复杂度
    const wordComplexity = Math.min(
      1,
      this.difficultyManager.getDifficultyFactor('wordComplexity') + 
      (this.currentWave - 1) * 0.05
    );
    
    // 棋盘大小
    const boardSize = this.calculateBoardSize(effectiveLevel, this.currentWave);
    
    // 特殊卡片和障碍物
    const specialTiles = this.generateSpecialTiles(effectiveLevel, this.currentWave);
    
    return {
      mode: 'survival',
      level: effectiveLevel,
      wave: this.currentWave,
      survivalTime: this.survivalTime,
      wordCount: wordsPerWave,
      timeLimit: waveTimeLimit,
      wordComplexity,
      board: {
        rows: boardSize,
        cols: boardSize,
        specialTiles
      },
      bonusTimePerMatch: 2, // 每次匹配奖励2秒
      pointMultiplier: 1 + (this.currentWave - 1) * 0.1, // 得分倍率随波次提高
      revealTime: this.difficultyManager.getDifficultyFactor('revealTime') * 
                  Math.pow(0.95, this.currentWave - 1) // 随波次减少显示时间
    };
  }
  
  /**
   * 计算棋盘大小
   * @param {Number} level 难度级别
   * @param {Number} wave 波次
   * @returns {Number} 棋盘大小
   */
  calculateBoardSize(level, wave) {
    // 基础大小基于难度
    const baseSize = 4 + Math.floor(level / 3);
    
    // 每4波增加棋盘大小，最大10x10
    const waveBonus = Math.floor((wave - 1) / 4);
    
    return Math.min(10, baseSize + waveBonus);
  }
  
  /**
   * 生成特殊卡片配置
   * @param {Number} level 难度级别
   * @param {Number} wave 波次
   * @returns {Array} 特殊卡片配置
   */
  generateSpecialTiles(level, wave) {
    const specialTiles = [];
    
    // 障碍物数量（从第5波开始）
    if (wave >= 5) {
      const obstacleCount = Math.min(8, Math.floor((wave - 5) / 2) + 1);
      
      for (let i = 0; i < obstacleCount; i++) {
        specialTiles.push({ type: 'obstacle' });
      }
    }
    
    // 从第7波开始添加移动卡片
    if (wave >= 7) {
      const movingTileCount = Math.min(4, Math.floor((wave - 7) / 3) + 1);
      
      for (let i = 0; i < movingTileCount; i++) {
        specialTiles.push({ 
          type: 'moving',
          moveInterval: 5000 - (wave * 300) // 移动间隔随波次减少
        });
      }
    }
    
    // 从第10波开始添加隐形卡片
    if (wave >= 10) {
      const invisibleCount = Math.min(6, Math.floor((wave - 10) / 2) + 1);
      
      for (let i = 0; i < invisibleCount; i++) {
        specialTiles.push({ type: 'invisible' });
      }
    }
    
    return specialTiles;
  }
  
  /**
   * 处理波次结果，更新难度和波次计数
   * @param {Object} result 波次结果数据
   * @returns {Object} 更新后的状态
   */
  processWaveResult(result) {
    // 更新生存总时间
    this.survivalTime += result.waveTime || 0;
    
    // 计算性能分数
    const performance = {
      accuracy: result.matchesFound / result.totalMatches,
      timeEfficiency: result.timeRemaining / result.timeLimit,
      completed: result.wavePassed,
      streak: result.streak || 0
    };
    
    // 更新难度
    const newLevel = this.difficultyManager.updatePerformance(performance);
    
    // 如果通过波次，增加波次计数
    if (result.wavePassed) {
      this.currentWave++;
    }
    
    return {
      level: newLevel,
      wave: this.currentWave,
      survivalTime: this.survivalTime,
      gameOver: !result.wavePassed
    };
  }
  
  /**
   * 重置生存模式
   */
  reset() {
    this.currentWave = 1;
    this.survivalTime = 0;
    this.difficultyManager.reset();
  }
}

/**
 * 路径检测算法
 * 用于连连看游戏中检测两点之间是否可连通
 */
export class PathFinder {
  constructor(rows, cols) {
    this.rows = rows;
    this.cols = cols;
    this.grid = Array(rows).fill().map(() => Array(cols).fill(0));
  }
  
  /**
   * 设置网格数据
   * @param {Array} grid 二维网格
   */
  setGrid(grid) {
    this.grid = grid;
  }
  
  /**
   * 检查两点间是否可以连通（最多两个拐点）
   * @param {Object} p1 起点坐标 {row, col}
   * @param {Object} p2 终点坐标 {row, col}
   * @returns {Array|null} 如果可连通，返回路径点数组，否则返回null
   */
  findPath(p1, p2) {
    // 如果两点相同，无需查找路径
    if (p1.row === p2.row && p1.col === p2.col) {
      return null;
    }
    
    // 如果两点有一个不是空位置，无法连接
    if (this.grid[p1.row][p1.col] === 0 || this.grid[p2.row][p2.col] === 0) {
      return null;
    }
    
    // 检查两点是否可以直接连线（无拐点）
    const directPath = this.checkDirectPath(p1, p2);
    if (directPath) {
      return directPath;
    }
    
    // 检查单拐点路径
    const singleBendPath = this.checkSingleBendPath(p1, p2);
    if (singleBendPath) {
      return singleBendPath;
    }
    
    // 检查双拐点路径
    return this.checkDoubleBendPath(p1, p2);
  }
  
  /**
   * 检查是否可以直线连接
   * @param {Object} p1 起点 {row, col}
   * @param {Object} p2 终点 {row, col}
   * @returns {Array|null} 路径数组或null
   */
  checkDirectPath(p1, p2) {
    if (p1.row === p2.row) {
      // 水平直线检查
      const minCol = Math.min(p1.col, p2.col);
      const maxCol = Math.max(p1.col, p2.col);
      
      // 检查路径上是否有障碍
      for (let col = minCol + 1; col < maxCol; col++) {
        if (this.grid[p1.row][col] !== 0) {
          return null;
        }
      }
      
      // 返回路径
      return [
        { row: p1.row, col: p1.col },
        { row: p2.row, col: p2.col }
      ];
    } 
    
    if (p1.col === p2.col) {
      // 垂直直线检查
      const minRow = Math.min(p1.row, p2.row);
      const maxRow = Math.max(p1.row, p2.row);
      
      // 检查路径上是否有障碍
      for (let row = minRow + 1; row < maxRow; row++) {
        if (this.grid[row][p1.col] !== 0) {
          return null;
        }
      }
      
      // 返回路径
      return [
        { row: p1.row, col: p1.col },
        { row: p2.row, col: p2.col }
      ];
    }
    
    // 不在同一行或同一列
    return null;
  }
  
  /**
   * 检查是否可以使用单个拐点连接
   * @param {Object} p1 起点 {row, col}
   * @param {Object} p2 终点 {row, col}
   * @returns {Array|null} 路径数组或null
   */
  checkSingleBendPath(p1, p2) {
    // 检查两个可能的拐点
    const corners = [
      { row: p1.row, col: p2.col }, // 拐点1
      { row: p2.row, col: p1.col }  // 拐点2
    ];
    
    for (const corner of corners) {
      // 拐点必须是空位置
      if (this.grid[corner.row][corner.col] !== 0) {
        continue;
      }
      
      // 检查从p1到拐点的路径
      const path1 = this.checkDirectPath(p1, corner);
      if (!path1) continue;
      
      // 检查从拐点到p2的路径
      const path2 = this.checkDirectPath(corner, p2);
      if (!path2) continue;
      
      // 返回完整路径（去除重复的拐点）
      return [path1[0], corner, path2[1]];
    }
    
    return null;
  }
  
  /**
   * 检查是否可以使用双拐点连接
   * @param {Object} p1 起点 {row, col}
   * @param {Object} p2 终点 {row, col}
   * @returns {Array|null} 路径数组或null
   */
  checkDoubleBendPath(p1, p2) {
    // 检查所有可能的中间点
    for (let row = 0; row < this.rows; row++) {
      // 先尝试水平方向，再加一个拐点
      // 中间点1：(p1.row, row)
      const mid1 = { row: p1.row, col: row };
      
      // 跳过不是空位置的中间点
      if (row !== p1.col && row !== p2.col && this.grid[mid1.row][mid1.col] !== 0) {
        continue;
      }
      
      // 中间点2：(p2.row, row)
      const mid2 = { row: p2.row, col: row };
      
      // 跳过不是空位置的中间点
      if (this.grid[mid2.row][mid2.col] !== 0) {
        continue;
      }
      
      // 检查三段路径
      const path1 = this.checkDirectPath(p1, mid1);
      if (!path1) continue;
      
      const path2 = this.checkDirectPath(mid1, mid2);
      if (!path2) continue;
      
      const path3 = this.checkDirectPath(mid2, p2);
      if (!path3) continue;
      
      // 返回完整路径
      return [path1[0], mid1, mid2, path3[1]];
    }
    
    // 尝试垂直方向
    for (let col = 0; col < this.cols; col++) {
      // 中间点1：(col, p1.col)
      const mid1 = { row: col, col: p1.col };
      
      // 跳过不是空位置的中间点
      if (col !== p1.row && col !== p2.row && this.grid[mid1.row][mid1.col] !== 0) {
        continue;
      }
      
      // 中间点2：(col, p2.col)
      const mid2 = { row: col, col: p2.col };
      
      // 跳过不是空位置的中间点
      if (this.grid[mid2.row][mid2.col] !== 0) {
        continue;
      }
      
      // 检查三段路径
      const path1 = this.checkDirectPath(p1, mid1);
      if (!path1) continue;
      
      const path2 = this.checkDirectPath(mid1, mid2);
      if (!path2) continue;
      
      const path3 = this.checkDirectPath(mid2, p2);
      if (!path3) continue;
      
      // 返回完整路径
      return [path1[0], mid1, mid2, path3[1]];
    }
    
    return null;
  }
  
  /**
   * 更新网格中的值
   * @param {Number} row 行
   * @param {Number} col 列
   * @param {any} value 值
   */
  updateGrid(row, col, value) {
    if (row >= 0 && row < this.rows && col >= 0 && col < this.cols) {
      this.grid[row][col] = value;
    }
  }
  
  /**
   * 生成网格初始状态（自动保证有解）
   * @param {Number} pairCount 需要配对的单词数量
   * @returns {Array} 网格数据
   */
  generateSolvableGrid(pairCount) {
    // 重置网格
    this.grid = Array(this.rows).fill().map(() => Array(this.cols).fill(0));
    
    // 计算网格总数
    const totalCells = this.rows * this.cols;
    
    // 确保有足够的空间
    if (pairCount * 2 > totalCells) {
      pairCount = Math.floor(totalCells / 2);
    }
    
    // 生成卡片ID (1到pairCount，每个出现两次)
    const cards = [];
    for (let i = 1; i <= pairCount; i++) {
      cards.push(i, i);
    }
    
    // 随机洗牌
    this.shuffleArray(cards);
    
    // 放置卡片
    let cardIndex = 0;
    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        if (cardIndex < cards.length) {
          this.grid[row][col] = cards[cardIndex++];
        }
      }
    }
    
    return this.grid;
  }
  
  /**
   * 随机洗牌算法
   * @param {Array} array 要洗牌的数组
   */
  shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }
} 