/**
 * 性能优化模块
 * 提供性能监控、优化和内存管理功能
 */

/**
 * 使用WeakRef实现的缓存数据结构
 * 避免内存泄漏，并支持过期机制
 */
export class CachedData {
  constructor(options = {}) {
    this.cache = new Map();
    this.expiryMap = new Map();
    this.defaultTTL = options.ttl || 3600000; // 默认1小时
    this.gcInterval = options.gcInterval || 300000; // 默认5分钟执行一次垃圾回收
    
    // 定期清理过期数据
    this.gcTimer = setInterval(() => this.garbageCollect(), this.gcInterval);
  }
  
  /**
   * 存储数据到缓存
   * @param {string} key 缓存键
   * @param {any} value 缓存值
   * @param {number} ttl 生存时间（毫秒）
   */
  set(key, value, ttl = this.defaultTTL) {
    // 使用WeakRef包装值，允许GC回收
    const ref = new WeakRef(value);
    
    // 保存到缓存
    this.cache.set(key, ref);
    this.expiryMap.set(key, Date.now() + ttl);
    
    // 如果支持FinalizationRegistry，注册终结器
    if (typeof FinalizationRegistry !== 'undefined') {
      this.registry = this.registry || new FinalizationRegistry(key => {
        this.cache.delete(key);
        this.expiryMap.delete(key);
      });
      
      this.registry.register(value, key);
    }
    
    return this;
  }
  
  /**
   * 获取缓存的数据
   * @param {string} key 缓存键
   * @param {Function} fallback 缓存未命中时的回调函数
   * @returns {any} 缓存的值或fallback结果
   */
  get(key, fallback = null) {
    // 检查是否已过期
    const expiry = this.expiryMap.get(key);
    if (!expiry || Date.now() > expiry) {
      this.delete(key);
      return fallback ? fallback() : null;
    }
    
    // 获取引用
    const ref = this.cache.get(key);
    if (!ref) return fallback ? fallback() : null;
    
    // 如果对象已被垃圾回收，ref.deref()将返回undefined
    const value = ref.deref();
    if (value === undefined) {
      this.delete(key);
      return fallback ? fallback() : null;
    }
    
    return value;
  }
  
  /**
   * 检查键是否存在且未过期
   * @param {string} key 缓存键
   * @returns {boolean} 是否存在有效缓存
   */
  has(key) {
    if (!this.cache.has(key)) return false;
    
    const expiry = this.expiryMap.get(key);
    if (!expiry || Date.now() > expiry) return false;
    
    const ref = this.cache.get(key);
    const value = ref.deref();
    
    return value !== undefined;
  }
  
  /**
   * 删除缓存
   * @param {string} key 缓存键
   */
  delete(key) {
    this.cache.delete(key);
    this.expiryMap.delete(key);
  }
  
  /**
   * 清理过期缓存
   */
  garbageCollect() {
    const now = Date.now();
    
    for (const [key, expiry] of this.expiryMap.entries()) {
      if (now > expiry) {
        this.delete(key);
        continue;
      }
      
      // 检查引用是否已被回收
      const ref = this.cache.get(key);
      if (ref && ref.deref() === undefined) {
        this.delete(key);
      }
    }
  }
  
  /**
   * 清除所有缓存
   */
  clear() {
    this.cache.clear();
    this.expiryMap.clear();
  }
  
  /**
   * 销毁缓存管理器
   */
  destroy() {
    if (this.gcTimer) {
      clearInterval(this.gcTimer);
      this.gcTimer = null;
    }
    
    this.clear();
  }
}

/**
 * 虚拟滚动器
 * 优化长列表渲染性能
 */
export class VirtualScroller {
  constructor(container, itemHeight, options = {}) {
    this.container = typeof container === 'string'
      ? document.querySelector(container)
      : container;
      
    if (!this.container) {
      throw new Error('容器元素不存在');
    }
    
    this.itemHeight = itemHeight;
    this.items = [];
    this.visibleItems = [];
    this.observer = null;
    
    this.options = {
      overscan: options.overscan || 3, // 视口外额外渲染的项目数
      batchSize: options.batchSize || 10, // 批量渲染数量
      debounceTime: options.debounceTime || 100, // 滚动防抖时间
      useResizeObserver: options.useResizeObserver !== false,
      itemKey: options.itemKey || 'id' // 项目唯一标识的属性名
    };
    
    // 创建滚动容器
    this.viewport = document.createElement('div');
    this.viewport.className = 'virtual-scroller-viewport';
    this.viewport.style.position = 'relative';
    this.viewport.style.height = '100%';
    this.viewport.style.width = '100%';
    this.viewport.style.overflow = 'auto';
    
    // 创建内容容器
    this.content = document.createElement('div');
    this.content.className = 'virtual-scroller-content';
    this.content.style.position = 'relative';
    
    // 组装DOM结构
    this.viewport.appendChild(this.content);
    this.container.appendChild(this.viewport);
    
    // 绑定事件处理
    this.lastScrollTop = 0;
    this.scrolling = false;
    this.scrollTimer = null;
    
    this.handleScroll = this.handleScroll.bind(this);
    this.updateVisibleItems = this.updateVisibleItems.bind(this);
    
    this.viewport.addEventListener('scroll', this.handleScroll, { passive: true });
    
    // 监听容器大小变化
    if (this.options.useResizeObserver && window.ResizeObserver) {
      this.observer = new ResizeObserver(() => {
        this.updateVisibleItems();
      });
      this.observer.observe(this.container);
    }
    
    // 渲染器函数
    this.renderItem = options.renderItem || this.defaultRenderItem;
    
    // 触发初始渲染
    if (options.items) {
      this.setItems(options.items);
    }
  }
  
  /**
   * 默认项目渲染函数
   * @param {Object} item 项目数据
   * @returns {HTMLElement} 渲染的DOM元素
   */
  defaultRenderItem(item) {
    const div = document.createElement('div');
    div.textContent = JSON.stringify(item);
    div.style.height = `${this.itemHeight}px`;
    return div;
  }
  
  /**
   * 处理滚动事件
   */
  handleScroll() {
    if (!this.scrolling) {
      requestAnimationFrame(() => this.updateVisibleItems());
      this.scrolling = true;
    }
    
    if (this.scrollTimer) {
      clearTimeout(this.scrollTimer);
    }
    
    this.scrollTimer = setTimeout(() => {
      this.scrolling = false;
      this.lastScrollTop = this.viewport.scrollTop;
    }, this.options.debounceTime);
  }
  
  /**
   * 设置项目数据
   * @param {Array} items 项目数据数组
   */
  setItems(items) {
    this.items = items;
    
    // 更新内容高度
    this.content.style.height = `${items.length * this.itemHeight}px`;
    
    // 更新可见项
    this.updateVisibleItems();
  }
  
  /**
   * 更新可见项目
   */
  updateVisibleItems() {
    const { scrollTop, clientHeight } = this.viewport;
    
    // 计算可见范围
    const startIndex = Math.floor(scrollTop / this.itemHeight);
    const endIndex = Math.ceil((scrollTop + clientHeight) / this.itemHeight);
    
    // 添加过扫描，使滚动更平滑
    const overscan = this.options.overscan;
    const visibleStart = Math.max(0, startIndex - overscan);
    const visibleEnd = Math.min(this.items.length - 1, endIndex + overscan);
    
    // 清除现有DOM元素
    this.content.innerHTML = '';
    
    // 使用文档片段减少回流
    const fragment = document.createDocumentFragment();
    
    // 渲染可见项目
    for (let i = visibleStart; i <= visibleEnd; i++) {
      const item = this.items[i];
      if (!item) continue;
      
      const el = this.renderItem(item);
      
      // 设置定位
      el.style.position = 'absolute';
      el.style.top = `${i * this.itemHeight}px`;
      el.style.width = '100%';
      
      // 添加数据属性用于识别
      el.dataset.index = i;
      el.dataset.key = item[this.options.itemKey];
      
      fragment.appendChild(el);
    }
    
    this.content.appendChild(fragment);
    
    // 记录当前可见范围
    this.visibleRange = { start: visibleStart, end: visibleEnd };
    
    // 触发渲染完成事件
    this.dispatchEvent('rendered', {
      visibleRange: this.visibleRange,
      scrollTop,
      clientHeight
    });
  }
  
  /**
   * 触发自定义事件
   * @param {string} name 事件名称
   * @param {Object} detail 事件详情
   */
  dispatchEvent(name, detail = {}) {
    const event = new CustomEvent(`virtualScroller:${name}`, { detail });
    this.container.dispatchEvent(event);
  }
  
  /**
   * 获取指定索引的项目数据
   * @param {number} index 项目索引
   * @returns {Object} 项目数据
   */
  getItemAtIndex(index) {
    return this.items[index];
  }
  
  /**
   * 通过key查找项目索引
   * @param {string} key 项目键
   * @returns {number} 项目索引，未找到则返回-1
   */
  findIndexByKey(key) {
    return this.items.findIndex(item => item[this.options.itemKey] === key);
  }
  
  /**
   * 滚动到指定索引
   * @param {number} index 目标索引
   * @param {Object} options 滚动选项
   */
  scrollToIndex(index, options = {}) {
    if (index < 0 || index >= this.items.length) return;
    
    const top = index * this.itemHeight;
    this.viewport.scrollTo({
      top,
      behavior: options.smooth ? 'smooth' : 'auto'
    });
  }
  
  /**
   * 滚动到指定KEY的项目
   * @param {string} key 项目键
   * @param {Object} options 滚动选项
   */
  scrollToKey(key, options = {}) {
    const index = this.findIndexByKey(key);
    if (index !== -1) {
      this.scrollToIndex(index, options);
    }
  }
  
  /**
   * 销毁虚拟滚动器
   */
  destroy() {
    // 移除事件监听
    this.viewport.removeEventListener('scroll', this.handleScroll);
    
    // 清理定时器
    if (this.scrollTimer) {
      clearTimeout(this.scrollTimer);
    }
    
    // 断开ResizeObserver
    if (this.observer) {
      this.observer.disconnect();
    }
    
    // 清理DOM
    if (this.viewport.parentNode === this.container) {
      this.container.removeChild(this.viewport);
    }
  }
}

/**
 * 性能监控器
 * 收集和分析应用性能数据
 */
export class PerformanceMonitor {
  /**
   * 创建性能监控器实例
   * @param {Object} options 配置选项
   */
  constructor(options = {}) {
    this.options = {
      enabled: true,
      sampleRate: 1.0,
      maxEntriesPerType: 100,
      reportingInterval: 60000, // 1分钟
      ...options
    };
    
    // 生成会话标识符
    this.sessionId = `session_${Date.now()}`;
    this.pageId = `page_${Math.random().toString(36).substring(2, 15)}`;
    
    // 初始化指标收集对象
    this.metrics = {
      marks: {},
      measures: [],
      resources: [],
      errors: [],
      interactions: []
    };
    
    // 初始化性能观察器
    this.observers = {};
    
    // 定时器句柄
    this.reportTimer = null;
    
    // 初始化状态
    this.isRunning = false;
    
    // 自动启动
    if (this.options.enabled) {
      this.start();
    }
  }
  
  /**
   * 启动性能监控
   */
  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    
    // 设置定期报告
    if (this.options.reportingInterval > 0) {
      this.reportTimer = setInterval(() => {
        this.reportMetrics();
      }, this.options.reportingInterval);
    }
    
    // 记录页面加载时间
    if (document.readyState === 'complete') {
      this.recordPageLoadTime();
    } else {
      window.addEventListener('load', () => this.recordPageLoadTime(), { once: true });
    }
    
    console.log('性能监控已启动');
  }
  
  /**
   * 停止性能监控
   */
  stop() {
    if (!this.isRunning) return;
    this.isRunning = false;
    
    // 停止所有观察器
    Object.values(this.observers).forEach(observer => {
      if (observer && typeof observer.disconnect === 'function') {
        observer.disconnect();
      }
    });
    
    // 清除定时报告
    if (this.reportTimer) {
      clearInterval(this.reportTimer);
      this.reportTimer = null;
    }
    
    console.log('性能监控已停止');
  }
  
  /**
   * 记录性能标记
   * @param {string} name 标记名称
   */
  mark(name) {
    if (!this.isRunning) return;
    
    try {
      // 使用浏览器性能API
      if (window.performance && window.performance.mark) {
        const markName = `mark_${name}`;
        window.performance.mark(markName);
        this.metrics.marks[name] = Date.now();
        return markName;
      }
    } catch (e) {
      console.warn(`创建性能标记失败 ${name}:`, e);
    }
    
    // 降级方案：直接记录时间戳
    this.metrics.marks[name] = Date.now();
    return name;
  }
  
  /**
   * 测量两个标记之间的性能
   * @param {string} name 测量名称
   * @param {string} startMark 开始标记
   * @param {string} endMark 结束标记
   * @returns {number|null} 测量结果(毫秒)或null
   */
  measure(name, startMark, endMark) {
    if (!this.isRunning) return null;
    
    try {
      // 使用浏览器性能API
      if (window.performance && window.performance.measure) {
        const startMarkName = startMark ? `mark_${startMark}` : undefined;
        const endMarkName = endMark ? `mark_${endMark}` : undefined;
        
        window.performance.measure(`measure_${name}`, startMarkName, endMarkName);
        const entries = window.performance.getEntriesByName(`measure_${name}`);
        
        if (entries.length > 0) {
          const duration = entries[0].duration;
          this.addMeasure(name, startMark, endMark, duration);
          return duration;
        }
      }
    } catch (e) {
      console.warn(`性能测量失败 ${name}:`, e);
    }
    
    // 降级方案：使用记录的时间戳
    if (startMark && endMark && this.metrics.marks[startMark] && this.metrics.marks[endMark]) {
      const duration = this.metrics.marks[endMark] - this.metrics.marks[startMark];
      this.addMeasure(name, startMark, endMark, duration);
      return duration;
    }
    
    return null;
  }
  
  /**
   * 添加测量结果到指标集合
   * @private
   */
  addMeasure(name, startMark, endMark, duration) {
    this.metrics.measures.push({
      name,
      startMark,
      endMark,
      duration,
      timestamp: Date.now()
    });
    
    // 保持数组大小在限制内
    if (this.metrics.measures.length > this.options.maxEntriesPerType) {
      this.metrics.measures.shift();
    }
  }
  
  /**
   * 记录页面加载时间
   * @private
   */
  recordPageLoadTime() {
    if (!window.performance || !window.performance.timing) return;
    
    const timing = window.performance.timing;
    
    const loadTime = timing.loadEventEnd - timing.navigationStart;
    const domReadyTime = timing.domComplete - timing.domLoading;
    const networkTime = timing.responseEnd - timing.fetchStart;
    
    this.metrics.pageLoad = {
      loadTime,
      domReadyTime,
      networkTime,
      redirectTime: timing.redirectEnd - timing.redirectStart,
      dnsTime: timing.domainLookupEnd - timing.domainLookupStart,
      tcpTime: timing.connectEnd - timing.connectStart,
      requestTime: timing.responseEnd - timing.requestStart,
      timestamp: Date.now()
    };
  }
  
  /**
   * 获取当前性能指标
   * @returns {Object} 性能指标对象
   */
  getMetrics() {
    return {
      ...this.metrics,
      timestamp: Date.now(),
      sessionId: this.sessionId,
      pageId: this.pageId,
      url: window.location.href
    };
  }
  
  /**
   * 报告性能指标
   * @param {boolean} forced 是否强制报告
   * @private
   */
  reportMetrics(forced = false) {
    if (!this.isRunning && !forced) return;
    
    // 此处可实现将性能数据发送到服务器的逻辑
    // console.log('性能指标:', this.getMetrics());
  }
  
  /**
   * 销毁监控器
   */
  destroy() {
    this.stop();
    this.metrics = {
      marks: {},
      measures: [],
      resources: [],
      errors: [],
      interactions: []
    };
  }
}

/**
 * 使用Idle Until Urgent策略优化任务调度
 */
export class IdleTaskScheduler {
  constructor() {
    this.tasks = new Map();
    this.nextId = 1;
    this.scheduled = false;
  }
  
  /**
   * 添加任务到调度器
   * @param {Function} fn 要执行的函数
   * @param {string} name 任务名称（用于调试）
   * @returns {number} 任务ID
   */
  scheduleTask(fn, name = '') {
    const id = this.nextId++;
    this.tasks.set(id, { fn, name, scheduled: Date.now() });
    
    // 如果还没有安排调度，则安排一个
    if (!this.scheduled) {
      this.scheduleNextRun();
    }
    
    return id;
  }
  
  /**
   * 安排下一次运行
   */
  scheduleNextRun() {
    // 如果支持requestIdleCallback，使用它
    if (window.requestIdleCallback) {
      this.scheduled = true;
      requestIdleCallback(deadline => this.runTasks(deadline));
    } else {
      // 降级为setTimeout
      this.scheduled = true;
      setTimeout(() => this.runTasks({ timeRemaining: () => 10 }), 0);
    }
  }
  
  /**
   * 执行任务
   * @param {IdleDeadline} deadline requestIdleCallback提供的截止时间
   */
  runTasks(deadline) {
    this.scheduled = false;
    
    // 当浏览器有空闲时间且还有任务要执行时
    while (deadline.timeRemaining() > 0 && this.tasks.size > 0) {
      const taskId = this.getNextTaskId();
      if (taskId === null) break;
      
      const task = this.tasks.get(taskId);
      this.tasks.delete(taskId);
      
      try {
        task.fn();
      } catch (e) {
        console.error(`执行任务(${task.name || taskId})失败:`, e);
      }
    }
    
    // 如果还有剩余任务，继续调度
    if (this.tasks.size > 0) {
      this.scheduleNextRun();
    }
  }
  
  /**
   * 获取下一个要执行的任务ID
   * @returns {number|null} 任务ID或null
   */
  getNextTaskId() {
    if (this.tasks.size === 0) return null;
    
    // 按添加顺序返回第一个任务
    return this.tasks.keys().next().value;
  }
  
  /**
   * 立即执行指定任务
   * @param {number} id 任务ID
   * @returns {boolean} 是否成功执行
   */
  runTaskNow(id) {
    const task = this.tasks.get(id);
    if (!task) return false;
    
    this.tasks.delete(id);
    
    try {
      task.fn();
      return true;
    } catch (e) {
      console.error(`执行任务(${task.name || id})失败:`, e);
      return false;
    }
  }
  
  /**
   * 立即执行所有待处理任务
   */
  runAllTasksNow() {
    const taskIds = Array.from(this.tasks.keys());
    
    for (const id of taskIds) {
      this.runTaskNow(id);
    }
  }
  
  /**
   * 取消任务
   * @param {number} id 任务ID
   * @returns {boolean} 是否成功取消
   */
  cancelTask(id) {
    return this.tasks.delete(id);
  }
  
  /**
   * 获取所有待处理任务
   * @returns {Array} 待处理任务数组
   */
  getPendingTasks() {
    return Array.from(this.tasks.entries()).map(([id, task]) => ({
      id,
      name: task.name,
      scheduledAt: task.scheduled,
      waitingTime: Date.now() - task.scheduled
    }));
  }
} 