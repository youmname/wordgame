/**
 * 热力图日历组件
 * 用于可视化展示用户每日学习情况的热力图日历
 */
class HeatmapCalendar {
  /**
   * 创建热力图日历实例
   * @param {string|HTMLElement} container - 容器元素或ID
   * @param {Object} options - 配置选项
   */
  constructor(container, options = {}) {
    this.container = typeof container === 'string' 
      ? document.getElementById(container) 
      : container;
    
    if (!this.container) {
      console.error('HeatmapCalendar: 容器元素不存在');
      return;
    }
    
    // 默认配置
    this.options = Object.assign({
      locale: 'zh-CN',
      startWeek: 1, // 0 = 周日, 1 = 周一
      levels: 5,     // 热力图等级数量 (0-4)
      colors: null,  // 使用CSS变量中的颜色
      tooltips: true,
      onDayClick: null,
      monthSelector: true,
      weekLabels: ['日', '一', '二', '三', '四', '五', '六']
    }, options);
    
    // 初始状态
    this.currentDate = new Date();
    this.currentMonth = this.currentDate.getMonth();
    this.currentYear = this.currentDate.getFullYear();
    this.data = {};
    
    // 初始化DOM结构
    this._initializeDOM();
    
    // 渲染日历
    this.render();
  }
  
  /**
   * 初始化DOM结构
   * @private
   */
  _initializeDOM() {
    this.container.classList.add('calendar-container');
    
    // 创建日历头部
    this.header = document.createElement('div');
    this.header.className = 'calendar-header';
    
    // 标题 - 移除图标
    this.title = document.createElement('div');
    // this.title.className = 'calendar-title';
    
    // 导航按钮
    this.nav = document.createElement('div');
    this.nav.className = 'calendar-nav';
    
    this.prevBtn = document.createElement('button');
    this.prevBtn.className = 'nav-btn prev-btn';
    this.prevBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';
    this.prevBtn.addEventListener('click', () => this.prevMonth());
    
    this.periodLabel = document.createElement('div');
    this.periodLabel.className = 'current-period';
    
    this.nextBtn = document.createElement('button');
    this.nextBtn.className = 'nav-btn next-btn';
    this.nextBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
    this.nextBtn.addEventListener('click', () => this.nextMonth());
    
    this.nav.appendChild(this.prevBtn);
    this.nav.appendChild(this.periodLabel);
    this.nav.appendChild(this.nextBtn);
    
    this.header.appendChild(this.title);
    this.header.appendChild(this.nav);
    
    // 日历主体
    this.body = document.createElement('div');
    this.body.className = 'calendar-body';
    
    // 星期行
    this.weekdaysRow = document.createElement('div');
    this.weekdaysRow.className = 'weekdays';
    
    // 根据起始星期重新排序星期标签
    let weekDays = [...this.options.weekLabels];
    if (this.options.startWeek === 1) {
      weekDays = [...weekDays.slice(1), weekDays[0]];
    }
    
    for (let i = 0; i < 7; i++) {
      const weekday = document.createElement('div');
      weekday.className = 'weekday';
      weekday.textContent = weekDays[i];
      this.weekdaysRow.appendChild(weekday);
    }
    
    // 日期网格
    this.daysGrid = document.createElement('div');
    this.daysGrid.className = 'days-grid';
    
    this.body.appendChild(this.weekdaysRow);
    this.body.appendChild(this.daysGrid);
    
    // --- 注释掉：移除热力图摘要的创建 --- 
    /*
    this.summary = document.createElement('div');
    this.summary.className = 'heatmap-summary horizontal';
    
    // 添加摘要项
    const summaryItems = [
      { id: 'active-days', label: '活跃天数' },
      { id: 'max-streak', label: '最长连续' },
      { id: 'total-count', label: '总学习量' }
    ];
    
    summaryItems.forEach(item => {
      const summaryItem = document.createElement('div');
      summaryItem.className = 'summary-item';
      summaryItem.id = item.id;
      
      const value = document.createElement('div');
      value.className = 'summary-value';
      value.textContent = '0';
      
      const label = document.createElement('div');
      label.className = 'summary-label';
      label.textContent = item.label;
      
      summaryItem.appendChild(value);
      summaryItem.appendChild(label);
      this.summary.appendChild(summaryItem);
    });
    */
    // --- 结束注释 --- 
    
    /* // --- 注释掉：移除颜色图例的创建 --- ... */ 
    
    // 添加所有元素到容器
    this.container.appendChild(this.header);
    this.container.appendChild(this.body);
    // this.container.appendChild(this.summary); // --- 注释掉：不添加摘要到容器 ---
    // this.container.appendChild(this.legend); // --- 注释掉：不添加图例到容器 ---
  }
  
  /**
   * 设置热力图数据
   * @param {Object} data - 格式为 {YYYY-MM-DD: value} 的数据对象
   */
  setData(data) {
    this.data = data || {};
    // this.updateStats(); // --- 注释掉：不再需要更新统计摘要 ---
    this.render();
    return this;
  }
  
  // --- 注释掉：移除 updateStats 函数 --- 
  /*
  updateStats() {
    if (!this.data) return;
    
    // 活跃天数
    const activeDays = Object.values(this.data).filter(v => v > 0).length;
    document.querySelector('#active-days .summary-value').textContent = activeDays;
    
    // 计算最长连续天数
    let currentStreak = 0;
    let maxStreak = 0;
    let dates = Object.keys(this.data).sort();
    
    for (let i = 0; i < dates.length; i++) {
      if (this.data[dates[i]] > 0) {
        currentStreak++;
        maxStreak = Math.max(maxStreak, currentStreak);
      } else {
        currentStreak = 0;
      }
    }
    
    document.querySelector('#max-streak .summary-value').textContent = maxStreak;
    
    // 总学习量
    const totalCount = Object.values(this.data).reduce((sum, val) => sum + val, 0);
    document.querySelector('#total-count .summary-value').textContent = totalCount;
  }
  */
  // --- 结束注释 --- 
  
  /**
   * 渲染日历
   */
  render() {
    console.log('渲染日历：', this.currentYear, this.currentMonth+1);
    
    // 更新日期标签
    this.periodLabel.textContent = this.formatMonth(this.currentYear, this.currentMonth);
    
    // 清空日期网格
    this.daysGrid.innerHTML = '';
    
    // 获取月份的第一天和最后一天
    const firstDay = new Date(this.currentYear, this.currentMonth, 1);
    const lastDay = new Date(this.currentYear, this.currentMonth + 1, 0);
    
    // 计算第一天是星期几 (0 = 周日, 6 = 周六)
    let firstDayOfWeek = firstDay.getDay();
    // 如果周一为起始日，调整索引
    if (this.options.startWeek === 1) {
      firstDayOfWeek = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
    }
    
    console.log('第一天星期几:', firstDayOfWeek);
    console.log('本月天数:', lastDay.getDate());
    
    // 使用空格子填充第一行前面的空位
    for (let i = 0; i < firstDayOfWeek; i++) {
      const emptyDay = document.createElement('div');
      emptyDay.className = 'calendar-day empty-day';
      emptyDay.setAttribute('data-position', 'empty-'+i);
      this.daysGrid.appendChild(emptyDay);
    }
    
    // 添加当前月的日期 - 确保所有日期都会被渲染
    const today = new Date();
    const isCurrentMonth = (today.getFullYear() === this.currentYear && today.getMonth() === this.currentMonth);
    
    // 创建所有当月日期，注意这里必须显示1到月末的所有日期
    for (let day = 1; day <= lastDay.getDate(); day++) {
      const dayEl = document.createElement('div');
      dayEl.className = 'calendar-day current-month';
      dayEl.setAttribute('data-date', day);
      dayEl.setAttribute('data-position', 'day-'+day);
      dayEl.style.opacity = "1"; // 强制可见
      dayEl.style.display = "flex"; // 确保显示
      
      // 添加日期数字
      const dayNumber = document.createElement('span');
      dayNumber.className = 'day-number';
      dayNumber.textContent = day;
      dayEl.appendChild(dayNumber);
      
      // 检查是否为今天
      if (isCurrentMonth && day === today.getDate()) {
        dayEl.classList.add('today');
      }
      
      // 获取数据
      const dateStr = this.formatDate(this.currentYear, this.currentMonth, day);
      const value = this.data[dateStr] || 0;
      
      // 添加热力图等级
      const level = this.getHeatLevel(value);
      dayEl.classList.add(`level-${level}`);
      
      // 检查是否为未来日期
      const cellDate = new Date(this.currentYear, this.currentMonth, day);
      if (cellDate > today) {
        dayEl.classList.add('future');
      }
      
      // 添加工具提示
      if (this.options.tooltips) {
        dayEl.title = `${dateStr}: ${value} 个单词`;
      }
      
      // 点击事件
      if (this.options.onDayClick) {
        dayEl.addEventListener('click', () => {
          this.options.onDayClick(dateStr, value, dayEl);
        });
      }
      
      this.daysGrid.appendChild(dayEl);
    }
    
    // 输出日历内容以供调试
    console.log('日历网格中的元素数量:', this.daysGrid.children.length);
    console.log('第一行空位数:', firstDayOfWeek);
    console.log('当月日期数:', lastDay.getDate());
    
    // 计算当前行是否已填满（即是否需要添加下个月的日期）
    const daysInGrid = firstDayOfWeek + lastDay.getDate();
    const remainingCells = 7 - (daysInGrid % 7);
    
    console.log('剩余需要填充的单元格:', remainingCells < 7 ? remainingCells : 0);
    
    // 如果当前行未填满，添加下个月的日期以补齐该行
    if (remainingCells < 7) {
      // 添加下个月的头几天，仅补齐最后一行
      for (let day = 1; day <= remainingCells; day++) {
        const emptyDay = document.createElement('div');
        emptyDay.className = 'calendar-day empty-day';
        emptyDay.setAttribute('data-position', 'empty-end-'+day);
        this.daysGrid.appendChild(emptyDay);
      }
    }
    
    // 确认所有日期元素是否已经正确添加到DOM中
    setTimeout(() => {
      const totalCells = this.daysGrid.children.length;
      const currentMonthCells = this.daysGrid.querySelectorAll('.current-month').length;
      console.log(`日历总格子数: ${totalCells}, 当月日期数: ${currentMonthCells}`);
      
      // 检查1号-15号是否存在并可见
      let allElementsFound = true; // 增加一个标记
      for (let day = 1; day <= 15; day++) {
        const dayEl = this.daysGrid.querySelector(`[data-date="${day}"]`);
        if (dayEl) {
          // console.log(`${day}号日期元素存在`);
        } else {
          console.error(`HeatmapCalendar: 检查时发现 ${day}号日期元素不存在!`);
          allElementsFound = false; // 发现错误，设置标记
        }
      }
      // 循环结束后检查标记
      if (allElementsFound) {
          console.log("HeatmapCalendar: 检查完毕，1-15号日期元素均存在。"); // 打印总结信息
      }
    }, 100);
  }
  
  /**
   * 根据值获取热力等级
   * @param {number} value - 热力值
   * @returns {number} 热力等级 (0-4)
   */
  getHeatLevel(value) {
    if (value <= 0) return 0;
    if (value <= 10) return 1;
    if (value <= 30) return 2;
    if (value <= 60) return 3;
    return 4;
  }
  
  /**
   * 格式化日期为 YYYY-MM-DD
   * @param {number} year - 年份
   * @param {number} month - 月份 (0-11)
   * @param {number} day - 日期
   * @returns {string} 格式化的日期字符串
   */
  formatDate(year, month, day) {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }
  
  /**
   * 格式化月份显示
   * @param {number} year - 年份
   * @param {number} month - 月份 (0-11)
   * @returns {string} 格式化的月份字符串
   */
  formatMonth(year, month) {
    return `${year}年${month + 1}月`;
  }
  
  /**
   * 切换到上个月
   */
  prevMonth() {
    this.currentMonth--;
    if (this.currentMonth < 0) {
      this.currentMonth = 11;
      this.currentYear--;
    }
    this.render();
  }
  
  /**
   * 切换到下个月
   */
  nextMonth() {
    this.currentMonth++;
    if (this.currentMonth > 11) {
      this.currentMonth = 0;
      this.currentYear++;
    }
    this.render();
  }
  
  /**
   * 设置月份
   * @param {number} year - 年份
   * @param {number} month - 月份 (0-11)
   */
  setMonth(year, month) {
    this.currentYear = year;
    this.currentMonth = month;
    this.render();
    return this;
  }
  
  /**
   * 重置到当前月份
   */
  resetToCurrentMonth() {
    const now = new Date();
    this.currentMonth = now.getMonth();
    this.currentYear = now.getFullYear();
    this.render();
    return this;
  }
}

// 导出组件
export default HeatmapCalendar; 