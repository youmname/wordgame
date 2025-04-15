/**
 * 错误监控模块
 * 提供全局错误捕获和上报功能
 */

/**
 * 错误类型枚举
 */
export const ErrorType = {
  JAVASCRIPT: 'javascript',
  NETWORK: 'network',
  RESOURCE: 'resource',
  PROMISE: 'promise',
  CUSTOM: 'custom'
};

/**
 * 错误严重性级别
 */
export const ErrorSeverity = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
};

/**
 * 错误监控器类
 */
export class ErrorMonitor {
  /**
   * 构造函数
   * @param {Object} config 配置选项
   */
  constructor(config = {}) {
    // 默认配置
    this.config = {
      enabled: true,
      captureGlobalErrors: true,
      captureRejections: true,
      captureResourceErrors: true,
      stackTraceLimit: 10,
      maxErrorsPerMinute: 10,
      blacklistedErrors: [],
      reportingUrl: null,
      sampleRate: 1.0,
      ...config
    };
    
    // 错误收集数组
    this.errors = [];
    
    // 用户上下文信息
    this.userContext = {};
    
    // 错误限流计数器
    this.minuteErrorCount = 0;
    this.lastMinuteReset = Date.now();
    
    // 修改Error对象栈追踪深度
    if (Error.stackTraceLimit !== undefined) {
      this.originalStackTraceLimit = Error.stackTraceLimit;
      Error.stackTraceLimit = this.config.stackTraceLimit;
    }
    
    // 初始化
    if (this.config.enabled) {
      this.setupErrorListeners();
    }
  }
  
  /**
   * 设置错误监听器
   * @private
   */
  setupErrorListeners() {
    if (this.config.captureGlobalErrors) {
      // 全局JavaScript错误
      window.addEventListener('error', (event) => {
        // 判断是否是资源加载错误
        if (event.target && (event.target.tagName === 'SCRIPT' || 
                            event.target.tagName === 'LINK' || 
                            event.target.tagName === 'IMG')) {
          if (this.config.captureResourceErrors) {
            this.captureResourceError(event);
          }
        } else {
          this.captureException(event.error || new Error(event.message), {
            type: ErrorType.JAVASCRIPT,
            lineNumber: event.lineno,
            columnNumber: event.colno,
            fileName: event.filename
          });
        }
        
        // 不阻止默认行为，让控制台仍然显示错误
        return true;
      }, true);
    }
    
    if (this.config.captureRejections) {
      // 未处理的Promise拒绝
      window.addEventListener('unhandledrejection', (event) => {
        const error = event.reason instanceof Error ? 
          event.reason : 
          new Error(`Unhandled Promise rejection: ${String(event.reason)}`);
        
        this.captureException(error, {
          type: ErrorType.PROMISE
        });
        
        // 不阻止默认行为
        return true;
      });
    }
  }
  
  /**
   * 捕获资源加载错误
   * @param {ErrorEvent} event 错误事件
   * @private
   */
  captureResourceError(event) {
    const target = event.target;
    const resourceType = target.tagName === 'SCRIPT' ? 'script' : 
                        target.tagName === 'LINK' ? 'stylesheet' : 
                        target.tagName === 'IMG' ? 'image' : 'resource';
    
    const url = target.src || target.href || 'unknown';
    
    this.captureError(`Failed to load ${resourceType}: ${url}`, {
      type: ErrorType.RESOURCE,
      severity: ErrorSeverity.MEDIUM,
      tags: {
        resourceType,
        url
      }
    });
  }
  
  /**
   * 捕获异常
   * @param {Error} exception 异常对象
   * @param {Object} options 附加选项
   */
  captureException(exception, options = {}) {
    if (!this.config.enabled) return null;
    
    try {
      // 检查是否应该忽略这个错误
      if (this.shouldIgnoreError(exception)) {
        return null;
      }
      
      // 检查错误限流
      if (this.checkRateLimit()) {
        return null;
      }
      
      const errorData = {
        timestamp: Date.now(),
        type: options.type || ErrorType.JAVASCRIPT,
        message: exception.message || String(exception),
        name: exception.name || 'Error',
        stack: exception.stack || null,
        severity: options.severity || ErrorSeverity.MEDIUM,
        url: window.location.href,
        userAgent: navigator.userAgent,
        ...options
      };
      
      // 添加用户上下文
      if (Object.keys(this.userContext).length > 0) {
        errorData.userContext = this.userContext;
      }
      
      // 添加到错误数组
      this.errors.push(errorData);
      
      // 如果有上报URL，进行上报
      if (this.config.reportingUrl) {
        this.reportError(errorData);
      }
      
      return errorData;
    } catch (e) {
      // 防止错误监控自身出错导致无限循环
      console.error('Error monitoring failed:', e);
      return null;
    }
  }
  
  /**
   * 捕获错误
   * @param {Error|string} error 错误对象或消息
   * @param {Object} options 附加选项
   */
  captureError(error, options = {}) {
    if (error instanceof Error) {
      return this.captureException(error, options);
    }
    
    // 将字符串错误转换为Error对象
    const errorObj = new Error(error);
    return this.captureException(errorObj, options);
  }
  
  /**
   * 捕获消息
   * @param {string} message 消息内容
   * @param {string} level 消息级别
   * @param {Object} context 附加上下文
   */
  captureMessage(message, level = 'info', context = {}) {
    if (!this.config.enabled) return null;
    
    const messageData = {
      timestamp: Date.now(),
      type: ErrorType.CUSTOM,
      level,
      message,
      url: window.location.href,
      context
    };
    
    // 添加用户上下文
    if (Object.keys(this.userContext).length > 0) {
      messageData.userContext = this.userContext;
    }
    
    // 如果级别是错误，添加到错误数组
    if (level === 'error') {
      this.errors.push(messageData);
    }
    
    // 如果有上报URL，进行上报
    if (this.config.reportingUrl) {
      this.reportMessage(messageData);
    }
    
    return messageData;
  }
  
  /**
   * 设置用户上下文
   * @param {Object} context 用户上下文信息
   */
  setUserContext(context) {
    this.userContext = { ...this.userContext, ...context };
  }
  
  /**
   * 检查是否应该忽略错误
   * @param {Error} error 错误对象
   * @returns {boolean} 是否应该忽略
   * @private
   */
  shouldIgnoreError(error) {
    // 检查黑名单错误
    if (this.config.blacklistedErrors && this.config.blacklistedErrors.length > 0) {
      const errorMessage = error.message || String(error);
      
      for (const blacklisted of this.config.blacklistedErrors) {
        if (typeof blacklisted === 'string' && errorMessage.includes(blacklisted)) {
          return true;
        }
        
        if (blacklisted instanceof RegExp && blacklisted.test(errorMessage)) {
          return true;
        }
      }
    }
    
    // 应用采样率
    if (Math.random() > this.config.sampleRate) {
      return true;
    }
    
    return false;
  }
  
  /**
   * 检查错误限流
   * @returns {boolean} 是否应该限流
   * @private
   */
  checkRateLimit() {
    const now = Date.now();
    
    // 重置每分钟计数器
    if (now - this.lastMinuteReset > 60000) {
      this.lastMinuteReset = now;
      this.minuteErrorCount = 0;
    }
    
    // 增加计数并检查是否达到限制
    this.minuteErrorCount++;
    
    return this.minuteErrorCount > this.config.maxErrorsPerMinute;
  }
  
  /**
   * 上报错误
   * @param {Object} errorData 错误数据
   * @private
   */
  reportError(errorData) {
    // 使用fetch API上报错误
    try {
      fetch(this.config.reportingUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(errorData),
        // 使用keepalive以确保在页面关闭时也能发送请求
        keepalive: true
      }).catch(err => {
        console.warn('Error reporting failed:', err);
      });
    } catch (e) {
      console.warn('Error reporting failed:', e);
    }
  }
  
  /**
   * 上报消息
   * @param {Object} messageData 消息数据
   * @private
   */
  reportMessage(messageData) {
    try {
      fetch(this.config.reportingUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(messageData),
        keepalive: true
      }).catch(err => {
        console.warn('Message reporting failed:', err);
      });
    } catch (e) {
      console.warn('Message reporting failed:', e);
    }
  }
  
  /**
   * 获取错误统计数据
   * @returns {Object} 错误统计
   */
  getErrorStats() {
    // 按类型分组错误
    const byType = {};
    const bySeverity = {};
    
    for (const error of this.errors) {
      // 按类型统计
      if (!byType[error.type]) {
        byType[error.type] = 0;
      }
      byType[error.type]++;
      
      // 按严重性统计
      if (error.severity) {
        if (!bySeverity[error.severity]) {
          bySeverity[error.severity] = 0;
        }
        bySeverity[error.severity]++;
      }
    }
    
    return {
      total: this.errors.length,
      byType,
      bySeverity,
      recentErrors: this.errors.slice(-10)
    };
  }
  
  /**
   * 销毁错误监控器
   */
  destroy() {
    // 恢复Error对象栈追踪深度
    if (this.originalStackTraceLimit !== undefined) {
      Error.stackTraceLimit = this.originalStackTraceLimit;
    }
    
    // 清空错误数组
    this.errors = [];
  }
}

/**
 * 为Promise添加错误处理
 * @param {Promise} promise 要监控的Promise
 * @param {string} source 来源标识
 * @returns {Promise} 带错误处理的Promise
 */
export function monitorPromise(promise, source = 'unknown') {
  return promise.catch(error => {
    if (window.errorMonitor) {
      window.errorMonitor.captureException(error, {
        source: source,
        type: ErrorType.PROMISE
      });
    }
    throw error; // 继续传播错误
  });
}

/**
 * 全局实例化
 * @param {Object} options 配置选项
 * @returns {ErrorMonitor} 错误监控器实例
 */
export function initErrorMonitoring(options = {}) {
  const errorMonitor = new ErrorMonitor(options);
  
  // 全局访问
  window.errorMonitor = errorMonitor;
  
  // 添加全局辅助方法
  window.captureException = (error, options) => errorMonitor.captureException(error, options);
  window.captureMessage = (message, options) => errorMonitor.captureMessage(message, options);
  
  return errorMonitor;
}

// 添加默认CSS样式
function addErrorMonitoringStyles() {
  if (document.getElementById('error-monitor-styles')) return;
  
  const style = document.createElement('style');
  style.id = 'error-monitor-styles';
  style.textContent = `
    .error-feedback-modal {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.75);
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      transition: opacity 0.3s ease;
    }
    
    .error-feedback-modal.show {
      opacity: 1;
    }
    
    .error-feedback-modal.closing {
      opacity: 0;
    }
    
    .error-feedback-content {
      background-color: #fff;
      border-radius: 8px;
      width: 90%;
      max-width: 500px;
      max-height: 90vh;
      overflow-y: auto;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
      transform: translateY(20px);
      transition: transform 0.3s ease;
    }
    
    .error-feedback-modal.show .error-feedback-content {
      transform: translateY(0);
    }
    
    .error-header {
      padding: 15px 20px;
      border-bottom: 1px solid #eee;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .error-header h2 {
      margin: 0;
      font-size: 1.5rem;
      color: #e74c3c;
    }
    
    .close-feedback-btn {
      background: none;
      border: none;
      font-size: 1.5rem;
      cursor: pointer;
      color: #666;
    }
    
    .error-body {
      padding: 20px;
    }
    
    .error-message {
      padding: 10px;
      background-color: #f8d7da;
      border-radius: 4px;
      color: #721c24;
      margin: 10px 0 20px;
      word-break: break-word;
    }
    
    .feedback-form h3 {
      margin-top: 0;
      font-size: 1.2rem;
    }
    
    #error-feedback-text {
      width: 100%;
      min-height: 100px;
      padding: 10px;
      border: 1px solid #ddd;
      border-radius: 4px;
      margin-bottom: 15px;
      resize: vertical;
    }
    
    .contact-label {
      display: flex;
      align-items: center;
      margin-bottom: 15px;
      cursor: pointer;
    }
    
    #contact-info {
      margin-bottom: 15px;
    }
    
    #contact-email {
      width: 100%;
      padding: 8px 10px;
      border: 1px solid #ddd;
      border-radius: 4px;
    }
    
    .error-actions {
      display: flex;
      gap: 10px;
    }
    
    .primary-btn {
      background-color: #4CAF50;
      color: white;
      border: none;
      padding: 10px 15px;
      border-radius: 4px;
      cursor: pointer;
    }
    
    #reload-page-btn {
      background-color: #f8f9fa;
      color: #333;
      border: 1px solid #ddd;
      padding: 10px 15px;
      border-radius: 4px;
      cursor: pointer;
    }
    
    .thank-you-message {
      text-align: center;
      padding: 20px 0;
    }
    
    .thank-you-message h3 {
      color: #4CAF50;
    }
  `;
  
  document.head.appendChild(style);
}

// 自动添加样式
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', addErrorMonitoringStyles);
  } else {
    addErrorMonitoringStyles();
  }
} 