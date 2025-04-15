/**
 * 监控模块
 * 整合性能监控和错误监控功能，提供统一的监控接口
 */

import { PerformanceMonitor } from './performance.js';
import * as ErrorMonitoring from './error-monitoring.js';

// 监控管理器单例实例
let monitoringManagerInstance = null;

/**
 * 监控管理器类
 */
class MonitoringManager {
  /**
   * 构造函数
   * @param {Object} config 配置选项
   */
  constructor(config = {}) {
    // 默认配置
    this.defaultConfig = {
      // 性能监控配置
      performance: {
        enabled: true,
        reportingUrl: '/api/performance/report',
        reportingInterval: 60000, // 每分钟上报一次
        maxEntriesPerReport: 100,
        metrics: {
          fps: true,
          memory: true,
          navigation: true,
          resource: true,
          interaction: true
        },
        sampleRate: 1.0 // 采样率
      },
      
      // 错误监控配置
      error: {
        enabled: true,
        reportingUrl: '/api/error/report',
        captureGlobalErrors: true,
        captureRejections: true,
        stackTraceLimit: 10,
        maxErrorsPerMinute: 10,
        blacklistedErrors: [],
        sampleRate: 1.0 // 采样率
      },
      
      // 用户上下文
      userContext: {
        userId: null,
        username: null,
        userAgent: navigator.userAgent,
        screenResolution: `${window.screen.width}x${window.screen.height}`,
        devicePixelRatio: window.devicePixelRatio || 1
      }
    };
    
    // 合并用户配置
    this.config = this._mergeConfig(this.defaultConfig, config);
    
    // 初始化监控实例
    this._initMonitors();
  }
  
  /**
   * 递归合并配置
   * @private
   * @param {Object} target 目标对象
   * @param {Object} source 源对象
   * @returns {Object} 合并后的对象
   */
  _mergeConfig(target, source) {
    const result = { ...target };
    
    for (const key in source) {
      if (source.hasOwnProperty(key)) {
        if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
          // 递归合并嵌套对象
          result[key] = this._mergeConfig(target[key] || {}, source[key]);
        } else {
          // 直接赋值基本类型或数组
          result[key] = source[key];
        }
      }
    }
    
    return result;
  }
  
  /**
   * 初始化监控实例
   * @private
   */
  _initMonitors() {
    // 初始化性能监控
    if (this.config.performance.enabled) {
      this.performanceMonitor = new PerformanceMonitor(this.config.performance);
    }
    
    // 初始化错误监控
    if (this.config.error.enabled) {
      this.errorMonitor = new ErrorMonitoring.ErrorMonitor(this.config.error);
      
      // 设置用户上下文
      this.errorMonitor.setUserContext(this.config.userContext);
    }
  }
  
  /**
   * 启动性能监控
   */
  startPerformanceMonitoring() {
    if (this.performanceMonitor) {
      this.performanceMonitor.start();
    }
  }
  
  /**
   * 停止性能监控
   */
  stopPerformanceMonitoring() {
    if (this.performanceMonitor) {
      this.performanceMonitor.stop();
    }
  }
  
  /**
   * 标记性能点
   * @param {string} name 标记名称
   */
  mark(name) {
    if (this.performanceMonitor) {
      this.performanceMonitor.mark(name);
    }
  }
  
  /**
   * 测量两个标记点之间的性能
   * @param {string} name 测量名称
   * @param {string} startMark 起始标记
   * @param {string} endMark 结束标记
   * @returns {number|null} 测量结果(毫秒)或null
   */
  measure(name, startMark, endMark) {
    if (this.performanceMonitor) {
      return this.performanceMonitor.measure(name, startMark, endMark);
    }
    return null;
  }
  
  /**
   * 记录错误
   * @param {Error|string} error 错误对象或信息
   * @param {Object} options 附加选项
   */
  logError(error, options = {}) {
    if (this.errorMonitor) {
      this.errorMonitor.captureError(error, options);
    }
  }
  
  /**
   * 记录信息
   * @param {string} message 信息内容
   * @param {string} level 日志级别 (info, warning, error, debug)
   * @param {Object} context 上下文信息
   */
  logMessage(message, level = 'info', context = {}) {
    if (this.errorMonitor) {
      this.errorMonitor.captureMessage(message, level, context);
    }
  }
  
  /**
   * 获取监控指标数据
   * @returns {Object} 指标数据
   */
  getMetrics() {
    const metrics = {
      timestamp: Date.now()
    };
    
    // 获取性能指标
    if (this.performanceMonitor) {
      metrics.performance = this.performanceMonitor.getMetrics();
    }
    
    // 获取错误指标
    if (this.errorMonitor) {
      metrics.error = this.errorMonitor.getErrorStats();
    }
    
    return metrics;
  }
  
  /**
   * 设置用户上下文
   * @param {Object} userContext 用户上下文信息
   */
  setUserContext(userContext) {
    this.config.userContext = { ...this.config.userContext, ...userContext };
    
    if (this.errorMonitor) {
      this.errorMonitor.setUserContext(this.config.userContext);
    }
  }
  
  /**
   * 销毁监控管理器
   */
  destroy() {
    // 停止性能监控
    if (this.performanceMonitor) {
      this.performanceMonitor.stop();
      this.performanceMonitor = null;
    }
    
    // 停止错误监控
    if (this.errorMonitor) {
      this.errorMonitor.destroy();
      this.errorMonitor = null;
    }
    
    // 清空配置
    this.config = null;
  }
}

/**
 * 获取监控管理器实例
 * @param {Object} config 配置选项
 * @returns {MonitoringManager} 监控管理器实例
 */
export function getMonitoringManager(config = {}) {
  if (!monitoringManagerInstance) {
    monitoringManagerInstance = new MonitoringManager(config);
  } else if (Object.keys(config).length > 0) {
    // 如果已存在实例但提供了新配置，则应用新配置
    monitoringManagerInstance.config = monitoringManagerInstance._mergeConfig(
      monitoringManagerInstance.defaultConfig,
      config
    );
    
    // 重新初始化监控
    monitoringManagerInstance._initMonitors();
  }
  
  return monitoringManagerInstance;
}

/**
 * 初始化性能监控
 * @param {Object} config 配置选项
 * @returns {MonitoringManager} 监控管理器实例
 */
export function initPerformanceMonitoring(config = {}) {
  const manager = getMonitoringManager(config);
  manager.startPerformanceMonitoring();
  return manager;
}

/**
 * 注册性能监控
 * @param {Object} config 性能监控配置
 * @returns {Object} 性能监控实例
 * @deprecated 使用 initPerformanceMonitoring 代替
 */
export function registerPerformanceMonitoring(config = {}) {
  const manager = getMonitoringManager({
    performance: config,
    error: { enabled: false }
  });
  manager.startPerformanceMonitoring();
  return manager.performanceMonitor;
}

/**
 * 记录性能标记
 * @param {string} name 标记名称
 * @deprecated 使用 mark 代替
 */
export function markPerformance(name) {
  const manager = getMonitoringManager();
  manager.mark(name);
}

/**
 * 测量性能
 * @param {string} name 测量名称
 * @param {string} startMark 开始标记名称
 * @param {string} endMark 结束标记名称
 * @returns {number|null} 测量结果(毫秒)或null
 * @deprecated 使用 measure 代替
 */
export function measurePerformance(name, startMark, endMark) {
  const manager = getMonitoringManager();
  return manager.measure(name, startMark, endMark);
}

/**
 * 记录错误
 * @param {Error|string} error 错误对象或信息
 * @param {Object} options 附加选项
 */
export function logError(error, options = {}) {
  const manager = getMonitoringManager();
  manager.logError(error, options);
}

/**
 * 记录信息
 * @param {string} message 信息内容
 * @param {string} level 日志级别 (info, warning, error, debug)
 * @param {Object} context 上下文信息
 */
export function logMessage(message, level = 'info', context = {}) {
  const manager = getMonitoringManager();
  manager.logMessage(message, level, context);
}

/**
 * 性能标记
 * @param {string} name 标记名称
 */
export function mark(name) {
  const manager = getMonitoringManager();
  manager.mark(name);
}

/**
 * 性能测量
 * @param {string} name 测量名称
 * @param {string} startMark 起始标记
 * @param {string} endMark 结束标记
 * @returns {number|null} 测量结果(毫秒)或null
 */
export function measure(name, startMark, endMark) {
  const manager = getMonitoringManager();
  return manager.measure(name, startMark, endMark);
}

// 错误监控模块占位符
// 在实际实现前，临时创建所需API
// 这是为了确保shouye.js中的调用不会出错

export class ErrorMonitor {
  constructor(config = {}) {
    this.config = config;
    this.errors = [];
    this.userContext = {};
    console.log('错误监控初始化:', config);
  }
  
  captureError(error, options = {}) {
    const errorObj = {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : null,
      timestamp: Date.now(),
      context: options
    };
    
    this.errors.push(errorObj);
    console.error('错误已捕获:', errorObj);
    
    return errorObj;
  }
  
  captureMessage(message, level = 'info', context = {}) {
    const messageObj = {
      message,
      level,
      context,
      timestamp: Date.now()
    };
    
    console.log(`[${level}] ${message}`, context);
    return messageObj;
  }
  
  setUserContext(userContext) {
    this.userContext = { ...this.userContext, ...userContext };
  }
  
  getErrorStats() {
    return {
      total: this.errors.length,
      recent: this.errors.slice(-10)
    };
  }
  
  destroy() {
    this.errors = [];
    this.userContext = {};
  }
}

// 创建默认错误监控实例
const defaultErrorMonitor = new ErrorMonitor(); 