/**
 * 粒子效果管理模块
 * 提供创建和管理视觉粒子特效的功能
 */

/**
 * 创建粒子管理器
 * @param {string|HTMLElement} container 粒子容器元素或ID
 * @returns {Object} 粒子管理器API对象
 */
export function createParticleManager(container = 'body') {
  // 私有变量
  let containerElement = null;
  let containerWidth = 0;
  let containerHeight = 0;
  let particles = [];
  let resizeObserver = null;
  let isInitialized = false;
  
  /**
   * 初始化粒子管理器
   */
  function init() {
    // 获取容器元素
    if (typeof container === 'string') {
      containerElement = container === 'body' ? document.body : document.getElementById(container);
    } else {
      containerElement = container;
    }
    
    if (!containerElement) {
      console.error('粒子容器不存在');
      return;
    }
    
    // 设置容器样式
    if (containerElement === document.body) {
      containerElement.style.overflow = 'hidden';
    }
    
    // 更新容器尺寸
    updateContainerSize();
    
    // 监听窗口调整大小
    if (window.ResizeObserver) {
      resizeObserver = new ResizeObserver(() => {
        updateContainerSize();
      });
      resizeObserver.observe(containerElement);
    } else {
      window.addEventListener('resize', updateContainerSize);
    }
    
    isInitialized = true;
  }
  
  /**
   * 更新容器尺寸
   */
  function updateContainerSize() {
    if (!containerElement) return;
    
    if (containerElement === document.body) {
      containerWidth = window.innerWidth;
      containerHeight = window.innerHeight;
    } else {
      const rect = containerElement.getBoundingClientRect();
      containerWidth = rect.width;
      containerHeight = rect.height;
    }
  }
  
  /**
   * 创建爆炸效果
   * @param {Object} options 配置选项
   * @param {number} options.x 爆炸中心x坐标
   * @param {number} options.y 爆炸中心y坐标
   * @param {number} options.count 粒子数量
   * @param {Array<string>} options.colors 粒子颜色数组
   * @param {number} options.size 粒子大小
   * @param {number} options.duration 动画持续时间(ms)
   * @param {number} options.spread 扩散范围
   * @param {number} options.gravity 重力加速度
   * @param {number} options.friction 摩擦系数
   */
  function createExplosion(options = {}) {
    if (!isInitialized) {
      init();
    }
    
    // 默认配置
    const config = {
      x: containerWidth / 2,
      y: containerHeight / 2,
      count: 30,
      colors: ['#f44336', '#2196f3', '#ffeb3b', '#4caf50', '#9c27b0'],
      size: 8,
      duration: 1000,
      spread: 100,
      gravity: 0.1,
      friction: 0.95,
      ...options
    };
    
    // 创建粒子
    for (let i = 0; i < config.count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * config.spread / 10;
      const size = Math.random() * config.size * 0.5 + config.size * 0.5;
      const color = config.colors[Math.floor(Math.random() * config.colors.length)];
      
      // 设置初始速度
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      
      // 创建粒子
      createParticle({
        x: config.x,
        y: config.y,
        vx,
        vy,
        size,
        color,
        gravity: config.gravity,
        friction: config.friction,
        duration: config.duration * (0.8 + Math.random() * 0.4),
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 10
      });
    }
  }
  
  /**
   * 创建漂浮粒子
   * @param {Object} options 配置选项
   * @param {number} options.count 粒子数量
   * @param {Array<string>} options.colors 粒子颜色数组
   * @param {Array<number>} options.sizeRange 粒子大小范围[最小值,最大值]
   * @param {Array<number>} options.speedRange 粒子速度范围[最小值,最大值]
   * @param {number} options.duration 持续时间(ms)，为0则持续显示
   * @param {string} options.area 粒子区域，可选值：'full'(全屏)、'top'(顶部)、'bottom'(底部)
   */
  function createFloatingParticles(options = {}) {
    if (!isInitialized) {
      init();
    }
    
    // 默认配置
    const config = {
      count: 20,
      colors: ['#f44336', '#2196f3', '#ffeb3b', '#4caf50', '#9c27b0'],
      sizeRange: [3, 8],
      speedRange: [0.5, 2],
      duration: 0, // 0表示持续显示
      area: 'full',
      ...options
    };
    
    // 确定粒子生成区域
    let minX = 0;
    let maxX = containerWidth;
    let minY = 0;
    let maxY = containerHeight;
    
    switch (config.area) {
      case 'top':
        maxY = containerHeight * 0.3;
        break;
      case 'bottom':
        minY = containerHeight * 0.7;
        break;
    }
    
    // 创建粒子
    for (let i = 0; i < config.count; i++) {
      const size = config.sizeRange[0] + Math.random() * (config.sizeRange[1] - config.sizeRange[0]);
      const speed = config.speedRange[0] + Math.random() * (config.speedRange[1] - config.speedRange[0]);
      const color = config.colors[Math.floor(Math.random() * config.colors.length)];
      
      // 随机位置
      const x = minX + Math.random() * (maxX - minX);
      const y = minY + Math.random() * (maxY - minY);
      
      // 创建粒子
      createParticle({
        x,
        y,
        vx: (Math.random() - 0.5) * speed * 2,
        vy: (Math.random() - 0.5) * speed,
        size,
        color,
        gravity: 0,
        friction: 0.99,
        duration: config.duration,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 5,
        fadeOut: config.duration > 0
      });
    }
  }
  
  /**
   * 创建单个粒子
   * @param {Object} options 粒子配置选项
   */
  function createParticle(options = {}) {
    if (!isInitialized) {
      init();
    }
    
    // 默认配置
    const config = {
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      size: 5,
      color: '#ffffff',
      duration: 1000,
      gravity: 0,
      friction: 0.95,
      rotation: 0,
      rotationSpeed: 0,
      fadeOut: true,
      ...options
    };
    
    // 创建粒子元素
    const particle = document.createElement('div');
    particle.className = 'particle';
    particle.style.position = 'absolute';
    particle.style.left = `${config.x}px`;
    particle.style.top = `${config.y}px`;
    particle.style.width = `${config.size}px`;
    particle.style.height = `${config.size}px`;
    particle.style.backgroundColor = config.color;
    particle.style.borderRadius = '50%';
    particle.style.pointerEvents = 'none';
    particle.style.transform = `rotate(${config.rotation}deg)`;
    particle.style.zIndex = '9999';
    
    // 添加到容器
    containerElement.appendChild(particle);
    
    // 粒子状态
    const state = {
      x: config.x,
      y: config.y,
      vx: config.vx,
      vy: config.vy,
      size: config.size,
      rotation: config.rotation,
      opacity: 1,
      element: particle,
      createdAt: Date.now()
    };
    
    // 将粒子添加到数组
    particles.push(state);
    
    // 设置动画
    let animationFrameId;
    const animate = () => {
      // 应用物理效果
      state.vx *= config.friction;
      state.vy += config.gravity;
      state.vy *= config.friction;
      
      // 更新位置
      state.x += state.vx;
      state.y += state.vy;
      
      // 更新旋转
      state.rotation += config.rotationSpeed;
      
      // 计算不透明度
      if (config.fadeOut && config.duration > 0) {
        const elapsed = Date.now() - state.createdAt;
        state.opacity = Math.max(0, 1 - elapsed / config.duration);
      }
      
      // 更新样式
      particle.style.left = `${state.x}px`;
      particle.style.top = `${state.y}px`;
      particle.style.transform = `rotate(${state.rotation}deg)`;
      particle.style.opacity = state.opacity;
      
      // 检查是否结束动画
      const isOutOfBounds = state.x < -state.size * 2 || 
                          state.x > containerWidth + state.size * 2 || 
                          state.y < -state.size * 2 || 
                          state.y > containerHeight + state.size * 2;
      
      const isExpired = config.duration > 0 && Date.now() - state.createdAt >= config.duration;
      
      if (isOutOfBounds || isExpired || state.opacity <= 0.01) {
        // 移除粒子
        containerElement.removeChild(particle);
        particles = particles.filter(p => p !== state);
        cancelAnimationFrame(animationFrameId);
        return;
      }
      
      // 继续动画循环
      animationFrameId = requestAnimationFrame(animate);
    };
    
    // 开始动画
    animate();
  }
  
  /**
   * 清除所有粒子
   */
  function clear() {
    // 清除所有粒子元素
    particles.forEach(particle => {
      if (particle.element && particle.element.parentNode) {
        particle.element.parentNode.removeChild(particle.element);
      }
    });
    
    // 清空数组
    particles = [];
  }
  
  /**
   * 销毁管理器
   */
  function destroy() {
    // 移除所有粒子
    clear();
    
    // 取消监听器
    if (resizeObserver) {
      resizeObserver.disconnect();
      resizeObserver = null;
    } else {
      window.removeEventListener('resize', updateContainerSize);
    }
    
    // 重置状态
    containerElement = null;
    isInitialized = false;
  }
  
  // 返回公共API
  return {
    init,
    createExplosion,
    createFloatingParticles,
    createParticle,
    clear,
    destroy
  };
}