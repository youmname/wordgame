/**
 * 能力雷达图模块
 * 可视化用户在不同能力维度上的水平
 */

export class SkillRadar {
  constructor(canvasEl, dimensions) {
    // 如果传入的是id字符串，获取元素
    this.canvas = typeof canvasEl === 'string' 
      ? document.getElementById(canvasEl) 
      : canvasEl;
      
    if (!this.canvas) {
      throw new Error('Canvas元素不存在');
    }
    
    // 设置能力维度
    this.dimensions = dimensions || [
      { key: 'vocabulary', label: '词汇量', color: '#FF80AB' },
      { key: 'memory', label: '记忆力', color: '#82B1FF' },
      { key: 'speed', label: '反应速度', color: '#B9F6CA' },
      { key: 'accuracy', label: '准确度', color: '#FFFF8D' },
      { key: 'consistency', label: '学习恒心', color: '#EA80FC' }
    ];
    
    // 初始化canvas
    this.ctx = this.canvas.getContext('2d');
    this.resize();
    
    // 数据点动画状态
    this.animatedValues = this.dimensions.map(() => 0);
    this.targetValues = this.dimensions.map(() => 0);
    
    // 动画相关
    this.animating = false;
    this.animationDuration = 1000; // 毫秒
    this.animationStartTime = 0;
    
    // 绑定响应式设计
    this.setupResize();
    
    // 添加交互效果
    this.setupInteractions();
    
    // 默认数据
    this.data = {};
    
    // 主题颜色
    this.updateThemeColors();
    
    // 首次渲染
    this.draw();
  }
  
  /**
   * 更新主题颜色
   */
  updateThemeColors() {
    const style = getComputedStyle(document.documentElement);
    
    this.colors = {
      background: style.getPropertyValue('--card-bg').trim() || '#FFFFFF',
      text: style.getPropertyValue('--text').trim() || '#4A4A4A',
      primary: style.getPropertyValue('--primary').trim() || '#FFB3C1',
      accent: style.getPropertyValue('--accent').trim() || '#FF80AB',
      grid: 'rgba(0, 0, 0, 0.1)',
      shadow: 'rgba(0, 0, 0, 0.1)'
    };
  }
  
  /**
   * 处理画布大小调整
   */
  resize() {
    // 获取父元素尺寸
    const parent = this.canvas.parentElement;
    const width = parent.clientWidth;
    const height = parent.clientHeight || width;
    
    // 设置画布尺寸，考虑设备像素比
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = width * dpr;
    this.canvas.height = height * dpr;
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    
    // 缩放上下文以匹配设备像素比
    this.ctx.scale(dpr, dpr);
    
    // 保存可用绘图区域尺寸
    this.width = width;
    this.height = height;
    
    // 计算中心点和半径
    this.centerX = this.width / 2;
    this.centerY = this.height / 2;
    this.radius = Math.min(this.centerX, this.centerY) * 0.8;
    
    // 重新绘制
    this.draw();
  }
  
  /**
   * 设置响应式绘图
   */
  setupResize() {
    // 使用ResizeObserver监听尺寸变化
    if (window.ResizeObserver) {
      const resizeObserver = new ResizeObserver(entries => {
        for (const entry of entries) {
          if (entry.target === this.canvas.parentElement) {
            this.resize();
          }
        }
      });
      
      resizeObserver.observe(this.canvas.parentElement);
      this.resizeObserver = resizeObserver;
    } else {
      // 降级方案：使用window resize事件
      const handleResize = () => this.resize();
      window.addEventListener('resize', handleResize);
      this.resizeHandler = handleResize;
    }
  }
  
  /**
   * 设置交互效果
   */
  setupInteractions() {
    // 悬停提示变量
    this.hoverIndex = -1;
    this.showTooltip = false;
    this.tooltipX = 0;
    this.tooltipY = 0;
    
    // 鼠标移动事件
    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      // 检查是否悬停在数据点上
      this.checkHover(x, y);
      
      // 保存提示位置
      this.tooltipX = x;
      this.tooltipY = y;
      
      if (this.hoverIndex !== -1) {
        this.canvas.style.cursor = 'pointer';
      } else {
        this.canvas.style.cursor = 'default';
      }
      
      this.draw();
    });
    
    // 鼠标离开事件
    this.canvas.addEventListener('mouseleave', () => {
      this.hoverIndex = -1;
      this.showTooltip = false;
      this.canvas.style.cursor = 'default';
      this.draw();
    });
    
    // 点击事件
    this.canvas.addEventListener('click', () => {
      if (this.hoverIndex !== -1) {
        const dimension = this.dimensions[this.hoverIndex];
        
        // 触发维度点击事件
        const event = new CustomEvent('dimensionClick', {
          detail: {
            dimension: dimension.key,
            label: dimension.label,
            value: this.data[dimension.key] || 0
          }
        });
        this.canvas.dispatchEvent(event);
      }
    });
  }
  
  /**
   * 检查鼠标是否悬停在数据点上
   */
  checkHover(x, y) {
    const oldHoverIndex = this.hoverIndex;
    this.hoverIndex = -1;
    this.showTooltip = false;
    
    // 计算到中心的距离
    const distToCenter = Math.sqrt(
      Math.pow(x - this.centerX, 2) + 
      Math.pow(y - this.centerY, 2)
    );
    
    // 如果距离太远，不在雷达图内
    if (distToCenter > this.radius) {
      return;
    }
    
    // 检查每个数据点
    this.dimensions.forEach((dim, i) => {
      const value = this.animatedValues[i];
      const normValue = value / 100; // 归一化到0-1
      
      // 计算角度和数据点坐标
      const angle = (Math.PI * 2 * i) / this.dimensions.length - Math.PI / 2;
      const pointX = this.centerX + Math.cos(angle) * this.radius * normValue;
      const pointY = this.centerY + Math.sin(angle) * this.radius * normValue;
      
      // 检查是否在数据点附近
      const distToPoint = Math.sqrt(
        Math.pow(x - pointX, 2) + 
        Math.pow(y - pointY, 2)
      );
      
      if (distToPoint < 15) { // 鼠标悬停区域大小
        this.hoverIndex = i;
        this.showTooltip = true;
      }
    });
    
    // 如果悬停状态变化，重绘
    if (oldHoverIndex !== this.hoverIndex) {
      this.draw();
    }
  }
  
  /**
   * 设置数据
   * @param {Object} data 能力值数据对象
   */
  setData(data) {
    this.data = data || {};
    
    // 更新目标值
    this.dimensions.forEach((dim, i) => {
      this.targetValues[i] = this.data[dim.key] || 0;
    });
    
    // 启动动画
    this.startAnimation();
  }
  
  /**
   * 启动数据动画
   */
  startAnimation() {
    this.animating = true;
    this.animationStartTime = Date.now();
    this.animationFrame = requestAnimationFrame(() => this.updateAnimation());
  }
  
  /**
   * 更新动画帧
   */
  updateAnimation() {
    const currentTime = Date.now();
    const elapsed = currentTime - this.animationStartTime;
    
    if (elapsed >= this.animationDuration) {
      // 动画结束，设置为最终值
      this.animatedValues = [...this.targetValues];
      this.animating = false;
      this.draw();
      return;
    }
    
    // 计算动画进度 (0-1范围)
    const progress = elapsed / this.animationDuration;
    
    // 使用缓动函数使动画更自然
    const easedProgress = this.easeOutCubic(progress);
    
    // 更新当前动画值
    this.dimensions.forEach((dim, i) => {
      const startValue = this.animatedValues[i];
      const targetValue = this.targetValues[i];
      this.animatedValues[i] = startValue + (targetValue - startValue) * easedProgress;
    });
    
    // 绘制当前帧
    this.draw();
    
    // 继续下一帧
    this.animationFrame = requestAnimationFrame(() => this.updateAnimation());
  }
  
  /**
   * 缓出三次方缓动函数
   * @param {Number} t 进度 (0-1)
   * @returns {Number} 缓动值
   */
  easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }
  
  /**
   * 绘制雷达图
   */
  draw() {
    const ctx = this.ctx;
    const centerX = this.centerX;
    const centerY = this.centerY;
    const radius = this.radius;
    
    // 清除画布
    ctx.clearRect(0, 0, this.width, this.height);
    
    // 绘制背景（可选）
    ctx.fillStyle = this.colors.background;
    ctx.fillRect(0, 0, this.width, this.height);
    
    // 绘制网格线
    this.drawGrid();
    
    // 绘制数据多边形
    this.drawDataPolygon();
    
    // 绘制数据点
    this.drawDataPoints();
    
    // 绘制坐标轴和标签
    this.drawAxesAndLabels();
    
    // 绘制提示框
    if (this.showTooltip && this.hoverIndex !== -1) {
      this.drawTooltip();
    }
  }
  
  /**
   * 绘制网格线
   */
  drawGrid() {
    const ctx = this.ctx;
    const centerX = this.centerX;
    const centerY = this.centerY;
    const radius = this.radius;
    
    // 绘制同心圆
    const levelCount = 5; // 网格层级数
    
    for (let i = 1; i <= levelCount; i++) {
      const levelRadius = (radius * i) / levelCount;
      
      ctx.beginPath();
      ctx.arc(centerX, centerY, levelRadius, 0, Math.PI * 2);
      ctx.strokeStyle = this.colors.grid;
      ctx.lineWidth = 1;
      ctx.stroke();
      
      // 添加刻度值（可选）
      if (i < levelCount) {
        const value = (i * 100) / levelCount;
        ctx.fillStyle = this.colors.text;
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(value.toString(), centerX, centerY - levelRadius - 5);
      }
    }
    
    // 绘制轴线
    this.dimensions.forEach((dim, i) => {
      const angle = (Math.PI * 2 * i) / this.dimensions.length - Math.PI / 2;
      const lineEndX = centerX + Math.cos(angle) * radius;
      const lineEndY = centerY + Math.sin(angle) * radius;
      
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(lineEndX, lineEndY);
      ctx.strokeStyle = this.colors.grid;
      ctx.lineWidth = 1;
      ctx.stroke();
    });
  }
  
  /**
   * 绘制数据多边形
   */
  drawDataPolygon() {
    const ctx = this.ctx;
    const centerX = this.centerX;
    const centerY = this.centerY;
    const radius = this.radius;
    
    if (this.dimensions.length < 3 || this.animatedValues.some(isNaN)) {
      return;
    }
    
    // 绘制填充多边形
    ctx.beginPath();
    
    this.dimensions.forEach((dim, i) => {
      const value = this.animatedValues[i];
      const normValue = value / 100; // 归一化到0-1
      
      const angle = (Math.PI * 2 * i) / this.dimensions.length - Math.PI / 2;
      const x = centerX + Math.cos(angle) * radius * normValue;
      const y = centerY + Math.sin(angle) * radius * normValue;
      
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    
    ctx.closePath();
    
    // 渐变填充
    const gradient = ctx.createRadialGradient(
      centerX, centerY, 0,
      centerX, centerY, radius
    );
    gradient.addColorStop(0, `${this.colors.primary}88`); // 半透明
    gradient.addColorStop(1, `${this.colors.accent}44`); // 更透明
    
    ctx.fillStyle = gradient;
    ctx.fill();
    
    // 多边形边缘
    ctx.strokeStyle = this.colors.accent;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  
  /**
   * 绘制数据点
   */
  drawDataPoints() {
    const ctx = this.ctx;
    const centerX = this.centerX;
    const centerY = this.centerY;
    const radius = this.radius;
    
    this.dimensions.forEach((dim, i) => {
      const value = this.animatedValues[i];
      const normValue = value / 100; // 归一化到0-1
      
      const angle = (Math.PI * 2 * i) / this.dimensions.length - Math.PI / 2;
      const x = centerX + Math.cos(angle) * radius * normValue;
      const y = centerY + Math.sin(angle) * radius * normValue;
      
      // 绘制数据点阴影
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.shadowColor = this.colors.shadow;
      ctx.shadowBlur = 5;
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 1;
      ctx.fillStyle = this.colors.background;
      ctx.fill();
      ctx.shadowColor = 'transparent';
      
      // 绘制数据点
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      
      // 悬停状态突出显示
      if (i === this.hoverIndex) {
        ctx.fillStyle = dim.color || this.colors.accent;
        
        // 绘制脉冲效果
        ctx.save();
        const pulseSize = 8 + Math.sin(Date.now() / 200) * 2;
        ctx.beginPath();
        ctx.arc(x, y, pulseSize, 0, Math.PI * 2);
        ctx.fillStyle = `${dim.color || this.colors.accent}33`; // 透明版本
        ctx.fill();
        ctx.restore();
      } else {
        ctx.fillStyle = dim.color || this.colors.primary;
      }
      
      ctx.fill();
      ctx.strokeStyle = this.colors.background;
      ctx.lineWidth = 1;
      ctx.stroke();
    });
  }
  
  /**
   * 绘制坐标轴和标签
   */
  drawAxesAndLabels() {
    const ctx = this.ctx;
    const centerX = this.centerX;
    const centerY = this.centerY;
    const radius = this.radius;
    
    ctx.font = '12px Arial';
    ctx.fillStyle = this.colors.text;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    this.dimensions.forEach((dim, i) => {
      const angle = (Math.PI * 2 * i) / this.dimensions.length - Math.PI / 2;
      
      // 标签位置稍微超出图表
      const labelDistance = radius * 1.15;
      const x = centerX + Math.cos(angle) * labelDistance;
      const y = centerY + Math.sin(angle) * labelDistance;
      
      // 调整标签对齐方式，避免文本超出画布
      if (angle < -Math.PI * 0.25 && angle > -Math.PI * 0.75) {
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
      } else if (angle >= -Math.PI * 0.25 && angle <= Math.PI * 0.25) {
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
      } else if (angle > Math.PI * 0.25 && angle < Math.PI * 0.75) {
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
      } else {
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
      }
      
      // 绘制标签
      ctx.fillText(dim.label, x, y);
    });
  }
  
  /**
   * 绘制提示框
   */
  drawTooltip() {
    const ctx = this.ctx;
    const dimension = this.dimensions[this.hoverIndex];
    const value = this.animatedValues[this.hoverIndex];
    
    const tooltipText = `${dimension.label}: ${Math.round(value)}`;
    const textWidth = ctx.measureText(tooltipText).width;
    
    const tooltipWidth = textWidth + 20;
    const tooltipHeight = 30;
    
    let tooltipX = this.tooltipX + 10;
    let tooltipY = this.tooltipY - 10;
    
    // 确保提示框在画布内
    if (tooltipX + tooltipWidth > this.width) {
      tooltipX = this.tooltipX - tooltipWidth - 10;
    }
    
    if (tooltipY - tooltipHeight < 0) {
      tooltipY = this.tooltipY + 20;
    }
    
    // 绘制提示框背景
    ctx.fillStyle = this.colors.background;
    ctx.shadowColor = this.colors.shadow;
    ctx.shadowBlur = 10;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    ctx.beginPath();
    this.roundRect(
      ctx, 
      tooltipX, 
      tooltipY - tooltipHeight, 
      tooltipWidth, 
      tooltipHeight, 
      5
    );
    ctx.fill();
    ctx.shadowColor = 'transparent';
    
    // 绘制提示框边框
    ctx.strokeStyle = dimension.color || this.colors.primary;
    ctx.lineWidth = 1;
    ctx.stroke();
    
    // 绘制提示文本
    ctx.fillStyle = this.colors.text;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '12px Arial';
    ctx.fillText(
      tooltipText, 
      tooltipX + tooltipWidth / 2, 
      tooltipY - tooltipHeight / 2
    );
  }
  
  /**
   * 绘制圆角矩形
   */
  roundRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.arcTo(x + width, y, x + width, y + radius, radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.arcTo(x + width, y + height, x + width - radius, y + height, radius);
    ctx.lineTo(x + radius, y + height);
    ctx.arcTo(x, y + height, x, y + height - radius, radius);
    ctx.lineTo(x, y + radius);
    ctx.arcTo(x, y, x + radius, y, radius);
    ctx.closePath();
  }
  
  /**
   * 更新单个维度的值
   * @param {String} key 维度键名
   * @param {Number} value 新值
   * @param {Boolean} animate 是否动画过渡
   */
  updateDimension(key, value, animate = true) {
    const index = this.dimensions.findIndex(dim => dim.key === key);
    if (index === -1) return;
    
    this.data[key] = value;
    
    if (animate) {
      this.targetValues[index] = value;
      this.startAnimation();
    } else {
      this.targetValues[index] = value;
      this.animatedValues[index] = value;
      this.draw();
    }
  }
  
  /**
   * 清理资源
   */
  destroy() {
    // 停止动画
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }
    
    // 清除事件监听器
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    } else if (this.resizeHandler) {
      window.removeEventListener('resize', this.resizeHandler);
    }
    
    // 清除画布
    this.ctx.clearRect(0, 0, this.width, this.height);
  }
  
  /**
   * 获取当前数据的导出版本
   * @returns {Object} 数据对象
   */
  getDataSnapshot() {
    return { ...this.data };
  }
  
  /**
   * 保存图表为图片
   * @returns {String} 图片的Data URL
   */
  saveAsImage() {
    return this.canvas.toDataURL('image/png');
  }
} 