# 性能优化与错误监控模块使用文档

本文档提供对项目中性能优化和错误监控模块的使用说明。

## 目录

1. [快速开始](#快速开始)
2. [性能优化模块](#性能优化模块)
   - [缓存数据](#缓存数据)
   - [虚拟滚动器](#虚拟滚动器)
   - [性能监控器](#性能监控器)
   - [任务调度器](#任务调度器)
3. [错误监控模块](#错误监控模块)
   - [错误捕获](#错误捕获)
   - [错误上报](#错误上报)
   - [用户反馈收集](#用户反馈收集)
4. [集成监控](#集成监控)
   - [初始化监控](#初始化监控)
   - [性能标记](#性能标记)
   - [错误记录](#错误记录)
   - [配置项](#配置项)
5. [最佳实践](#最佳实践)

## 快速开始

要快速集成性能和错误监控，在应用启动时添加以下代码：

```javascript
import { registerPerformanceMonitoring } from './modules/monitoring.js';

// 注册监控（性能和错误）
registerPerformanceMonitoring({
  performance: {
    sampleRate: 0.1,  // 10%用户进行性能采样
    reportURL: '/api/metrics/performance'
  },
  error: {
    enabled: true,
    reportURL: '/api/metrics/errors'
  },
  debug: false  // 开发环境可设为true
});
```

## 性能优化模块

性能优化模块位于 `js/modules/performance.js`，提供以下功能：

### 缓存数据

`CachedData` 类用于高效缓存数据，避免内存泄漏和重复计算。

```javascript
import { CachedData } from './modules/performance.js';

// 创建缓存实例
const cache = new CachedData({
  ttl: 5 * 60 * 1000, // 缓存5分钟
  gcInterval: 10 * 60 * 1000 // 10分钟清理一次
});

// 存储数据
cache.set('userProfile', userProfileData);

// 获取数据，支持回调函数作为默认值
const profile = cache.get('userProfile', () => fetchUserProfile());

// 检查是否存在有效缓存
if (cache.has('userProfile')) {
  // ...
}

// 删除缓存
cache.delete('userProfile');

// 销毁缓存管理器
cache.destroy();
```

### 虚拟滚动器

`VirtualScroller` 类用于高效渲染长列表，只渲染可见区域内容。

```javascript
import { VirtualScroller } from './modules/performance.js';

// 创建虚拟滚动器
const scroller = new VirtualScroller(
  '.list-container', // 容器选择器或DOM元素
  40, // 每个项目的高度(px)
  {
    overscan: 5, // 可视区域外额外渲染的项目数
    renderItem: (item) => {
      // 自定义项目渲染函数
      const div = document.createElement('div');
      div.textContent = item.name;
      return div;
    }
  }
);

// 设置数据
scroller.setItems(largeDataArray);

// 滚动到指定索引
scroller.scrollToIndex(50, { smooth: true });

// 滚动到指定key的项目
scroller.scrollToKey('item-123');

// 销毁滚动器
scroller.destroy();
```

### 性能监控器

`PerformanceMonitor` 类用于收集和上报性能指标。通常不需要直接使用，而是通过集成监控模块使用。

```javascript
import { PerformanceMonitor } from './modules/performance.js';

// 创建性能监控器
const monitor = new PerformanceMonitor({
  sampleRate: 0.1, // 10%用户进行采样
  reportURL: '/api/metrics'
});

// 获取收集的指标
const pageLoadMetrics = monitor.getMetrics('pageLoads');

// 停止监控
monitor.stop();
```

### 任务调度器

`IdleTaskScheduler` 类用于在浏览器空闲时执行非关键任务。

```javascript
import { IdleTaskScheduler } from './modules/performance.js';

// 创建任务调度器
const scheduler = new IdleTaskScheduler();

// 添加任务
const taskId = scheduler.scheduleTask(() => {
  // 在浏览器空闲时执行的任务
  processLargeData();
}, 'process-data');

// 取消任务
scheduler.cancelTask(taskId);

// 立即执行所有待处理任务
scheduler.runAllTasksNow();
```

## 错误监控模块

错误监控模块位于 `js/modules/error-monitoring.js`，提供全面的错误捕获和处理能力。

### 错误捕获

```javascript
import { 
  initErrorMonitoring, 
  ErrorType, 
  ErrorSeverity,
  monitorPromise
} from './modules/error-monitoring.js';

// 初始化错误监控
const errorMonitor = initErrorMonitoring({
  reportURL: '/api/errors',
  sampleRate: 1.0, // 100%用户
  ignoredErrors: [
    /Script error/i, // 忽略跨域脚本错误
    /ResizeObserver loop limit exceeded/i // 忽略特定错误
  ]
});

// 手动捕获异常
errorMonitor.captureException(new Error('自定义错误'), {
  type: ErrorType.LOGIC,
  severity: ErrorSeverity.MEDIUM,
  context: { additionalData: 'error context' }
});

// 捕获消息
errorMonitor.captureMessage('警告：配置不完整', {
  severity: ErrorSeverity.LOW
});

// 监控Promise
monitorPromise(fetchData(), 'data-fetch')
  .then(data => {
    // 处理数据
  });
```

### 错误上报

默认情况下，错误会根据设置的间隔自动上报，也可以手动触发上报：

```javascript
// 强制立即上报所有错误
errorMonitor.reportErrors(true);

// 获取存储的错误
const recentErrors = errorMonitor.getStoredErrors(10); // 最近10条错误
```

### 用户反馈收集

配置用户反馈以收集更多错误信息：

```javascript
const errorMonitor = initErrorMonitoring({
  userFeedbackEnabled: true, // 启用用户反馈
  // 其他配置...
});
```

## 集成监控

集成监控模块位于 `js/modules/monitoring.js`，它整合了性能监控和错误监控。

### 初始化监控

```javascript
import { 
  registerPerformanceMonitoring, 
  markPerformance,
  measurePerformance,
  logError,
  logMessage
} from './modules/monitoring.js';

// 注册性能和错误监控
const monitoring = registerPerformanceMonitoring({
  performance: {
    enabled: true,
    sampleRate: 0.1
  },
  error: {
    enabled: true,
    sampleRate: 1.0
  },
  debug: true // 开发环境启用调试输出
});
```

### 性能标记

使用性能标记测量代码执行时间：

```javascript
// 标记开始
markPerformance('renderStart');

// 执行耗时操作
renderComplexUI();

// 标记结束
markPerformance('renderEnd');

// 测量两个标记之间的时间
const duration = measurePerformance('rendering', 'renderStart', 'renderEnd');
console.log(`渲染耗时: ${duration}ms`);
```

### 错误记录

使用集成API记录错误和消息：

```javascript
try {
  // 可能出错的代码
  JSON.parse(invalidJson);
} catch (error) {
  // 记录错误
  logError(error, {
    source: 'dataProcessor',
    severity: 'medium'
  });
}

// 记录消息或警告
logMessage('用户会话即将到期', {
  severity: 'low'
});
```

### 配置项

监控模块支持的完整配置选项：

```javascript
registerPerformanceMonitoring({
  // 性能监控配置
  performance: {
    enabled: true,
    sampleRate: 0.1,
    reportURL: '/api/metrics/performance',
    reportInterval: 60000, // ms
    autoStart: true,
    maxEntries: 100
  },
  
  // 错误监控配置
  error: {
    enabled: true,
    sampleRate: 1.0,
    reportURL: '/api/metrics/errors',
    reportInterval: 30000, // ms
    enableConsoleCapture: true,
    userFeedbackEnabled: true,
    ignoredErrors: [/Script error/i]
  },
  
  // 通用配置
  appVersion: '1.0.0',
  environment: 'production', // 'development', 'staging', 'production'
  debug: false
});
```

## 最佳实践

1. **采样率控制**：生产环境中，建议将性能监控采样率设置在5%-10%，错误监控可以设置为100%。

2. **监控关键用户旅程**：在重要页面和关键用户操作前后添加性能标记。

3. **错误分类**：为不同类型的错误设置合适的严重性级别，避免普通错误触发关键警报。

4. **上下文信息**：捕获错误时添加足够的上下文信息，帮助排查问题。

5. **定期清理**：定期分析并清理忽略规则列表，确保重要错误不被忽略。

6. **资源开销**：监控功能本身会带来一定的性能开销，确保在低端设备上测试过。

7. **数据隐私**：确保错误上报不包含敏感用户信息，遵守隐私法规。 