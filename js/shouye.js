/**
 * 主页面入口文件
 * 负责初始化和协调各个模块
 */

// 导入依赖模块
import { store } from './store.js';
import { initTheme } from './theme.js';
import { createParticleManager } from './particles.js';
import { createSoundManager } from './sound.js';
import {  mark, measure } from './monitoring.js';
import HeatmapCalendar from './heatmap-calendar.js';

// 全局变量
let heatmapCalendar = null;
let progressWorker = null;
let particleManager = null;
let soundManager = null;

/**
 * 页面加载完成后初始化应用
 */
document.addEventListener('DOMContentLoaded', async function() {
    try {
        // 1. 初始化基础模块
        mark('init_start');
        
        // 初始化主题系统
        initTheme();
        
        // 初始化音效系统
        soundManager = createSoundManager();
        await initSoundSystem();
        
        // 初始化粒子效果系统
        particleManager = createParticleManager();
        particleManager.init();
        
        // 注册性能监控
        // registerPerformanceMonitoring();
        
        // 注册Service Worker
        registerServiceWorker();
        
        // 2. 加载用户数据
        mark('load_data_start');
        await loadUserData();
        await loadBadges();
        
        // 3. 初始化界面组件
        mark('init_ui_start');
        initCalendar();
        initViewSwitcher();
        bindEventListeners();
  
        // 4. 尝试创建Web Worker
        initWorkers();
        
        // 5. 初始化完成
        mark('init_complete');
        const initTime = measure('total_init', 'init_start', 'init_complete');
        console.log(`初始化耗时: ${initTime.toFixed(2)}ms`);
        
        // 应用初始化动画
        animatePageLoad();
    } catch (error) {
        console.error('初始化过程出错:', error);
        // 显示错误提示
        showErrorAlert('应用初始化失败，请刷新页面重试');
    }
});

/**
 * 初始化Service Worker
 */
function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/service-worker.js')
                .then(registration => {
                    console.log('Service Worker 注册成功:', registration.scope);
                })
                .catch(error => {
                    console.warn('Service Worker 注册失败:', error);
                });
        });
    }
}

/**
 * 初始化音效系统
 */
async function initSoundSystem() {
    // 使用状态中的音效设置
    const { soundEnabled } = store.getState().system;
    soundManager.setEnabled(soundEnabled);
    
    // 预加载音效
    await soundManager.preload({
        click: 'assets/sounds/click.mp3',
        success: 'assets/sounds/success.mp3',
        fail: 'assets/sounds/fail.mp3',
        level_complete: 'assets/sounds/level_complete.mp3',
        badge_unlock: 'assets/sounds/badge_unlock.mp3'
    });
}

/**
 * 初始化Web Worker
 */
function initWorkers() {
    try {
        progressWorker = new Worker('./js/progress-worker.js');
        progressWorker.onmessage = (e) => {
            updateProgressDisplay(e.data);
        };
    } catch (error) {
        console.warn('Web Worker创建失败，将在主线程执行:', error);
    }
}

/**
 * 加载用户数据
 */
async function loadUserData() {
    try {
        store.updateUiState({ loading: true });
    const userData = await simulateFetch('/api/user', {
            method: 'GET',
            credentials: 'include'
    });
    
    // 更新状态
        store.updateUserData(userData);
    
        // 更新界面显示
    updateUserInterface(userData);
    
        return userData;
  } catch (error) {
    console.error('加载用户数据失败:', error);
        showErrorAlert('加载用户数据失败，请检查网络连接');
    } finally {
        store.updateUiState({ loading: false });
    }
}

/**
 * 加载徽章数据
 */
async function loadBadges() {
    try {
        const badges = await simulateFetch('/api/badges', {
            method: 'GET',
            credentials: 'include'
        });
        
        updateBadgeWall(badges);
        return badges;
  } catch (error) {
        console.error('加载徽章数据失败:', error);
    }
}

/**
 * 初始化热力图日历
 */
function initCalendar() {
    const calendarContainer = document.getElementById('calendar-container');
    if (!calendarContainer) {
        console.error('日历容器不存在');
        return null;
    }

    console.log('初始化日历组件...');
    
    // 创建热力图日历实例
    const calendar = new HeatmapCalendar('calendar-container', {
        onDayClick: (dateStr, value) => {
            console.log(`点击了日期: ${dateStr}, 学习量: ${value}`);
            // 显示日期详情弹窗
            showDateDetailPopup(dateStr, value);
        }
    });

    // 保存到全局变量
    heatmapCalendar = calendar;
    
    // 确保日历容器可见
    calendarContainer.style.overflow = 'visible';
    calendarContainer.style.maxHeight = 'none';
    calendarContainer.style.display = 'block';
    
    // 添加调试信息
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
            const days = calendarContainer.querySelectorAll('.calendar-day');
            const currentMonthDays = calendarContainer.querySelectorAll('.calendar-day.current-month');
            console.log(`总日期单元格: ${days.length}, 当月日期: ${currentMonthDays.length}`);
            
            // 检查1-15号是否存在
            for (let i = 1; i <= 15; i++) {
                const day = calendarContainer.querySelector(`.calendar-day[data-date="${i}"]`);
                if (day) {
                    console.log(`${i}号存在，显示状态: ${window.getComputedStyle(day).display}`);
                } else {
                    console.error(`${i}号不存在!`);
                }
            }
        }, 1000);
    });

// 加载日历数据
    loadCalendarData(calendar);

    return calendar;
}

/**
 * 加载日历数据
 * @param {HeatmapCalendar} calendar 日历实例
 */
function loadCalendarData(calendar) {
    // 获取API数据的函数
    mark('开始加载日历数据');
    
    // 模拟API获取学习记录
    simulateFetch('/api/activity/heatmap', {
        method: 'GET',
        credentials: 'include'
    }).then(response => {
        if (response) {
            // 处理响应数据为热力图所需格式
            const calendarData = {};
            
            // 处理数据
            Object.keys(response).forEach(dateStr => {
                calendarData[dateStr] = response[dateStr];
            });
            
            // 设置日历数据
            calendar.setData(calendarData);
            
            // 计算并更新摘要信息
            const summary = {
                activeDays: Object.values(response).filter(v => v > 0).length,
                maxStreak: calculateMaxStreak(response),
                totalWords: Object.values(response).reduce((sum, val) => sum + val, 0)
            };
            
            // 更新热力图摘要信息
            updateHeatmapSummary(summary);
            
            // 记录性能结束点
            measure('开始加载日历数据', '日历数据加载完成');
        } else {
            console.error('获取学习记录失败', '未知错误');
        }
    }).catch(error => {
        console.error('获取日历数据出错:', error);
    });
}

/**
 * 计算最长连续学习天数
 * @param {Object} data 学习数据
 * @returns {number} 最长连续天数
 */
function calculateMaxStreak(data) {
    let currentStreak = 0;
    let maxStreak = 0;
    const dates = Object.keys(data).sort();
    
    for (let i = 0; i < dates.length; i++) {
        if (data[dates[i]] > 0) {
            currentStreak++;
            maxStreak = Math.max(maxStreak, currentStreak);
        } else {
            currentStreak = 0;
        }
    }
    
    return maxStreak;
}

/**
 * 更新热力图摘要信息
 * @param {Object} summary 摘要数据
 */
function updateHeatmapSummary(summary) {
    if (!summary) return;
    
    // 可以在此添加更多摘要信息的展示
    document.querySelector('#active-days .summary-value').textContent = summary.activeDays || '0';
    document.querySelector('#max-streak .summary-value').textContent = summary.maxStreak || '0';
    document.querySelector('#total-count .summary-value').textContent = summary.totalWords || '0';
}

/**
 * 显示日期详情弹窗
 * @param {string} dateStr 日期字符串
 * @param {number} wordCount 单词学习数量
 */
function showDateDetailPopup(dateStr, wordCount) {
    // 创建详情弹窗
    const popup = document.createElement('div');
    popup.className = 'date-detail-popup';
    
    // 格式化日期为更友好的显示
    const date = new Date(dateStr);
    const formattedDate = `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
    
    // 设置弹窗内容
    popup.innerHTML = `
        <div class="popup-header">
            <h3>${formattedDate}学习记录</h3>
            <button class="close-btn"><i class="fas fa-times"></i></button>
        </div>
        <div class="popup-content">
            <div class="summary-item">
                <i class="fas fa-book"></i>
                <span>学习单词: ${wordCount}个</span>
            </div>
            <div class="detail-chart">
                <div class="chart-title">每小时学习分布</div>
                <div class="hour-chart" id="hour-distribution-chart"></div>
            </div>
        </div>
    `;
    
    // 添加到页面
    document.body.appendChild(popup);
    
    // 点击关闭按钮移除弹窗
    popup.querySelector('.close-btn').addEventListener('click', () => {
        popup.classList.add('fade-out');
        setTimeout(() => popup.remove(), 300);
    });
    
    // 点击遮罩层关闭弹窗
    popup.addEventListener('click', (e) => {
        if (e.target === popup) {
            popup.classList.add('fade-out');
            setTimeout(() => popup.remove(), 300);
        }
    });
    
    // 弹出动画
    setTimeout(() => popup.classList.add('show'), 10);
    
    // 模拟加载详细数据
          setTimeout(() => {
        renderHourDistributionChart(dateStr);
    }, 500);
}

/**
 * 渲染小时分布图表
 * @param {string} dateStr 日期字符串
 */
function renderHourDistributionChart(dateStr) {
    const chartContainer = document.getElementById('hour-distribution-chart');
    if (!chartContainer) return;
    
    // 模拟小时分布数据
    const hourData = [];
    for (let i = 0; i < 24; i++) {
        const hour = i;
        const value = Math.floor(Math.random() * 20);
        hourData.push({ hour, value });
    }
    
    // 创建小时分布图
    chartContainer.innerHTML = '';
    
    hourData.forEach(item => {
        const bar = document.createElement('div');
        bar.className = 'hour-bar';
        const height = item.value * 3; // 最大高度100px
        bar.style.height = `${height}px`;
        
        const tooltip = document.createElement('div');
        tooltip.className = 'hour-tooltip';
        tooltip.textContent = `${item.hour}:00 - ${item.value}词`;
        
        bar.appendChild(tooltip);
        chartContainer.appendChild(bar);
        
        // 鼠标悬停显示详情
        bar.addEventListener('mouseenter', () => {
            tooltip.style.opacity = 1;
        });
        
        bar.addEventListener('mouseleave', () => {
            tooltip.style.opacity = 0;
        });
    });
}

/**
 * 初始化视图切换器
 */
function initViewSwitcher() {
    const viewButtons = document.querySelectorAll('.view-btn');
    
    // 如果状态中没有视图类型，默认使用grid
    let currentView = localStorage.getItem('currentView') || 'grid';
    
    // 设置初始视图
    document.body.setAttribute('data-view', currentView);
    
    // 更新features-grid容器的类名
    const featuresGrid = document.querySelector('.features-grid');
    if (featuresGrid) {
        featuresGrid.classList.remove('grid-view', 'list-view', 'timeline-view');
        featuresGrid.classList.add(`${currentView}-view`);
    }
    
    // 标记当前视图按钮
    viewButtons.forEach(button => {
        button.classList.remove('active');
        const viewType = button.getAttribute('data-view');
        if (viewType === currentView) {
            button.classList.add('active');
        }
        
        // 添加切换事件
        button.addEventListener('click', () => {
            const viewType = button.getAttribute('data-view');
            
            // 保存到本地存储
            localStorage.setItem('currentView', viewType);
            
            // 更新视图
            document.body.setAttribute('data-view', viewType);
            
            // 更新features-grid容器的类名
            if (featuresGrid) {
                featuresGrid.classList.remove('grid-view', 'list-view', 'timeline-view');
                featuresGrid.classList.add(`${viewType}-view`);
            }
            
            // 更新按钮状态
            viewButtons.forEach(btn => {
                btn.classList.remove('active');
            });
            button.classList.add('active');
            
            // 播放点击音效
            if (soundManager) {
                soundManager.play('click');
            }
        });
    });
}

/**
 * 绑定事件监听器
 */
function bindEventListeners() {
    // 将全局函数暴露给HTML
    window.startChapter = startChapter;
    window.startRandomChallenge = startRandomChallenge;
    window.openWordLibrary = openWordLibrary;
    window.showTodayRecommend = showTodayRecommend;
    window.toggleTheme = toggleTheme; // 添加主题切换函数
    
    // 绑定移动端菜单切换
    const mobileNavToggle = document.querySelector('.mobile-nav-toggle');
    const sideNav = document.querySelector('.side-nav');
    
    if (mobileNavToggle && sideNav) {
        mobileNavToggle.addEventListener('click', () => {
            sideNav.classList.toggle('show');
            soundManager.play('click');
        });
    }
    
    // 绑定右侧面板切换
    const panelToggle = document.querySelector('.panel-toggle');
    const rightPanel = document.querySelector('.right-panel');
    
    if (panelToggle && rightPanel) {
        panelToggle.addEventListener('click', () => {
            rightPanel.classList.toggle('show');
            soundManager.play('click');
        });
    }
    
    // 绑定分类按钮事件
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault(); // 防止默认行为
            
            document.querySelectorAll('.category-btn').forEach(b => {
                b.classList.remove('active');
            });
            btn.classList.add('active');
            
            try {
                soundManager.play('click');
            } catch (error) {
                console.warn('播放点击音效失败:', error);
            }
            
            // 获取分类ID
            const categoryId = btn.getAttribute('data-category');
            loadChapters(categoryId);
        });
    });

    // 确保所有主菜单项可点击
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            
            // 更新按钮状态，移除所有active类再添加到当前按钮
            document.querySelectorAll('.nav-btn').forEach(navBtn => {
                navBtn.classList.remove('active');
            });
            btn.classList.add('active');
            
            // 保存当前选中的导航项
            const action = btn.getAttribute('data-action');
            if (action) {
                localStorage.setItem('currentNavItem', action);
            }
            
            try {
                soundManager.play('click');
            } catch (error) {
                console.warn('播放点击音效失败:', error);
            }
            
            if (action && window[action] && typeof window[action] === 'function') {
                window[action]();
            }
        });
    });

    // 从本地存储恢复导航状态
    const currentNavItem = localStorage.getItem('currentNavItem');
    if (currentNavItem) {
        const activeNavBtn = document.querySelector(`.nav-btn[data-action="${currentNavItem}"]`);
        if (activeNavBtn) {
            document.querySelectorAll('.nav-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            activeNavBtn.classList.add('active');
        }
    } else {
        // 默认选中第一个导航按钮
        const firstNavBtn = document.querySelector('.nav-btn');
        if (firstNavBtn) {
            firstNavBtn.classList.add('active');
        }
    }
    
    // 确保主题按钮可点击
    document.querySelectorAll('.theme-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const theme = btn.getAttribute('data-theme');
            if (theme) {
                toggleTheme(theme);
            }
        });
    });
}

/**
 * 加载章节数据
 */
async function loadChapters(categoryId) {
    try {
        store.updateUiState({ loading: true });
        
        const chapters = await simulateFetch(`/api/chapters/${categoryId}`, {
            method: 'GET',
            credentials: 'include'
        });
        
        // 显示章节列表
        displayChapters(chapters);
        
    } catch (error) {
        console.error('加载章节数据失败:', error);
        showErrorAlert('加载章节数据失败');
    } finally {
        store.updateUiState({ loading: false });
    }
}

/**
 * 显示章节列表
 */
function displayChapters(chapters) {
    const chaptersContainer = document.querySelector('.chapters-container');
    if (!chaptersContainer) return;
    
    chaptersContainer.innerHTML = '';
    
    if (chapters.length === 0) {
        chaptersContainer.innerHTML = '<div class="empty-state">暂无章节数据</div>';
        return;
    }
    
    const chaptersList = document.createElement('div');
    chaptersList.className = 'chapters-list';
    
    chapters.forEach(chapter => {
        const chapterItem = document.createElement('div');
        chapterItem.className = `chapter-item ${chapter.locked ? 'locked' : ''} ${chapter.passed ? 'passed' : ''}`;
        chapterItem.innerHTML = `
            <div class="chapter-icon">${chapter.locked ? '🔒' : '📚'}</div>
            <div class="chapter-info">
                <div class="chapter-name">${chapter.name}</div>
                <div class="chapter-progress">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${chapter.progress || 0}%"></div>
                    </div>
                    <span class="progress-text">${chapter.progress || 0}%</span>
                </div>
            </div>
        `;
        
        if (!chapter.locked) {
            chapterItem.addEventListener('click', () => {
                startChapter(chapter.id);
            });
        }
        
        chaptersList.appendChild(chapterItem);
    });
    
    chaptersContainer.appendChild(chaptersList);
}

/**
 * 更新用户界面
 */
function updateUserInterface(userData) {
    // 使用requestAnimationFrame避免重排
    requestAnimationFrame(() => {
        // 更新用户信息
        const userNameEl = document.getElementById('user-name');
        const userMinutesEl = document.getElementById('user-minutes');
        const userScoreEl = document.getElementById('user-score');
        const userAvatarEl = document.getElementById('user-avatar');
        
        if (userNameEl) userNameEl.textContent = userData.name;
        if (userMinutesEl) userMinutesEl.textContent = `${userData.minutes}分钟`;
        if (userScoreEl) userScoreEl.textContent = userData.score;
        if (userAvatarEl && userData.avatar) userAvatarEl.src = userData.avatar;
        
        // 更新进度条
        updateProgressBar('streak-progress', userData.streak, 7);
        updateProgressBar('mastery-progress', userData.mastery, 100);
    });
}

/**
 * 更新进度条
 */
function updateProgressBar(id, value, max) {
    const progressBar = document.getElementById(id);
    if (!progressBar) return;
    
    const percentage = Math.min(100, Math.round((value / max) * 100));
    const progressFill = progressBar.querySelector('.progress-fill');
    
    if (progressFill) {
        // 使用CSS变量实现更好的动画
        progressBar.style.setProperty('--progress-percent', `${percentage}%`);
    }
}

/**
 * 更新进度显示
 */
function updateProgressDisplay(data) {
    if (data.streakProgress !== undefined) {
        updateProgressBar('streak-progress', data.streakProgress.value, data.streakProgress.max);
    }
    
    if (data.masteryProgress !== undefined) {
        updateProgressBar('mastery-progress', data.masteryProgress.value, data.masteryProgress.max);
    }
}

/**
 * 更新徽章墙
 */
function updateBadgeWall(badges) {
    const badgeWall = document.querySelector('.badge-wall');
    if (!badgeWall) return;
    
    badgeWall.innerHTML = '';
    
    badges.forEach(badge => {
        const badgeElement = document.createElement('div');
        badgeElement.className = `badge ${badge.unlocked ? 'unlocked' : 'locked'}`;
        badgeElement.innerHTML = `
            <div class="badge-icon">${badge.icon}</div>
            <div class="badge-name">${badge.name}</div>
        `;
        
        // 添加悬停提示
        badgeElement.setAttribute('data-tooltip', badge.description);
        
        // 添加点击事件
        if (badge.unlocked) {
            badgeElement.addEventListener('click', () => {
                showBadgeDetail(badge);
            });
        }
        
        badgeWall.appendChild(badgeElement);
    });
}

/**
 * 显示徽章详情
 */
function showBadgeDetail(badge) {
    // 播放点击音效
    soundManager.play('click');
    
    // 显示徽章详情
    showModal(badge.name, `
        <div class="badge-detail">
            <div class="badge-icon large">${badge.icon}</div>
            <p>${badge.description}</p>
            <p class="badge-date">获得于: ${formatDate(badge.unlockedDate)}</p>
        </div>
    `);
}

/**
 * 开始指定章节
 */
function startChapter(chapterId) {
    // 播放音效
    soundManager.play('click');
    
    // 创建粒子效果
    particleManager.createExplosion({
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
        count: 30,
        colors: ['#FFD700', '#FFA500', '#FF4500'],
        spread: 120
    });
    
    // 更新游戏状态
    store.updateGameState({
        currentChapter: chapterId,
        gameMode: 'normal'
    });
    
    // 延迟跳转，等待动画完成
    setTimeout(() => {
        window.location.href = `index.html?chapter=${chapterId}`;
    }, 800);
}

/**
 * 开始随机挑战
 */
function startRandomChallenge() {
    // 播放音效
    soundManager.play('click');
    
    // 创建粒子效果
    particleManager.createExplosion({
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
        count: 40,
        colors: ['#E91E63', '#9C27B0', '#673AB7'],
        spread: 150
    });
    
    // 更新游戏状态
    store.updateGameState({
        gameMode: 'random'
    });
    
    // 延迟跳转
    setTimeout(() => {
        window.location.href = 'index.html?mode=random';
    }, 800);
}

/**
 * 打开词库管理
 */
function openWordLibrary() {
    // 播放音效
    soundManager.play('click');
    
    // 创建粒子效果
    particleManager.createExplosion({
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
        count: 20,
        colors: ['#4CAF50', '#8BC34A', '#CDDC39'],
        spread: 100
    });
    
    // 延迟跳转
    setTimeout(() => {
        window.location.href = 'word-library.html';
    }, 800);
}

/**
 * 显示今日推荐
 */
function showTodayRecommend() {
    // 播放音效
    soundManager.play('click');
    
    // 创建粒子效果
    particleManager.createExplosion({
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
        count: 25,
        colors: ['#2196F3', '#03A9F4', '#00BCD4'],
        spread: 120
    });
    
    // 显示推荐内容
    showModal('今日推荐', '这里是根据您的学习历史，为您推荐的单词内容。');
}

/**
 * 显示错误提示
 */
function showErrorAlert(message) {
    const alertElement = document.createElement('div');
    alertElement.className = 'alert error';
    alertElement.innerHTML = `
        <span class="alert-icon">⚠️</span>
        <span class="alert-message">${message}</span>
        <button class="alert-close">×</button>
    `;
    
    // 添加关闭事件
    const closeButton = alertElement.querySelector('.alert-close');
    if (closeButton) {
        closeButton.addEventListener('click', () => {
            alertElement.classList.add('fade-out');
            setTimeout(() => {
                if (alertElement.parentNode) {
                    alertElement.parentNode.removeChild(alertElement);
                }
            }, 300);
        });
    }
    
    // 自动关闭
    setTimeout(() => {
        alertElement.classList.add('fade-out');
        setTimeout(() => {
            if (alertElement.parentNode) {
                alertElement.parentNode.removeChild(alertElement);
            }
        }, 300);
    }, 5000);
    
    // 添加到文档
    document.body.appendChild(alertElement);
}

/**
 * 显示模态框
 */
function showModal(title, content) {
    const modalElement = document.createElement('div');
    modalElement.className = 'modal-overlay';
    modalElement.innerHTML = `
        <div class="modal-container">
            <div class="modal-header">
                <h3>${title}</h3>
                <button class="modal-close">×</button>
            </div>
        <div class="modal-content">
                ${content}
            </div>
        </div>
    `;
    
    // 添加关闭事件
    const closeButton = modalElement.querySelector('.modal-close');
    const overlay = modalElement;
    
    const closeModal = () => {
        modalElement.classList.add('fade-out');
        setTimeout(() => {
            if (modalElement.parentNode) {
                modalElement.parentNode.removeChild(modalElement);
            }
        }, 300);
    };
    
    if (closeButton) {
        closeButton.addEventListener('click', closeModal);
    }
    
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            closeModal();
        }
    });
    
    // 添加到文档
    document.body.appendChild(modalElement);
    
    // 添加进入动画
    setTimeout(() => {
        modalElement.classList.add('show');
    }, 10);
}

/**
 * 页面加载动画
 */
function animatePageLoad() {
    const mainContent = document.querySelector('.content-area');
    const sideNav = document.querySelector('.side-nav');
    const rightPanel = document.querySelector('.right-panel');
    
    if (mainContent) {
        mainContent.classList.add('fade-in-up');
    }
    
    if (sideNav) {
        sideNav.classList.add('fade-in-left');
    }
    
    if (rightPanel) {
        rightPanel.classList.add('fade-in-right');
    }
}

/**
 * 格式化日期
 */
function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', { 
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

/**
 * 模拟API请求
 */
async function simulateFetch(url, options = {}) {
    console.log(`模拟请求: ${url}`);
    
    // 模拟延迟
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // 根据请求路径返回模拟数据
    if (url === '/api/user') {
        return {
            name: '学习达人',
            avatar: 'assets/images/default-avatar.png',
            level: 3,
            score: 1250,
            minutes: 135,
            streak: 5,
            mastery: 68
        };
    } else if (url === '/api/badges') {
        return [
            {
                id: 'badge1',
                name: '初学者',
                description: '完成第一次单词学习',
                icon: '🌟',
                unlocked: true,
                unlockedDate: '2023-08-15'
            },
            {
                id: 'badge2',
                name: '专注力',
                description: '连续学习3天',
                icon: '🔥',
                unlocked: true,
                unlockedDate: '2023-08-18'
            },
            {
                id: 'badge3',
                name: '词汇大师',
                description: '掌握500个单词',
                icon: '📚',
                unlocked: false
            },
            {
                id: 'badge4',
                name: '速度之王',
                description: '在极速模式中完成一关',
                icon: '⚡',
                unlocked: true,
                unlockedDate: '2023-08-20'
            },
            {
                id: 'badge5',
                name: '完美主义',
                description: '一次游戏中无错误完成',
                icon: '✨',
                unlocked: false
            },
            {
                id: 'badge6',
                name: '持之以恒',
                description: '连续学习7天',
                icon: '📅',
                unlocked: false
            }
        ];
    } else if (url === '/api/activity/heatmap') {
        // 生成过去90天的热力图数据
        const data = {};
        const today = new Date();
        
        for (let i = 0; i < 90; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() - i);
            const dateString = date.toISOString().split('T')[0];
            
            // 随机活跃度 (0-5)
            let activityLevel = Math.floor(Math.random() * 6);
            
            // 增加某些规律：周末学习较多，最近几天有学习记录
            const dayOfWeek = date.getDay();
            if (dayOfWeek === 0 || dayOfWeek === 6) {
                activityLevel = Math.min(5, activityLevel + 1);
            }
            
            // 最近7天有学习记录
            if (i < 7) {
                activityLevel = Math.max(1, activityLevel);
            }
            
            data[dateString] = activityLevel;
        }
        
        return data;
    } else if (url.startsWith('/api/chapters/')) {
        // 生成模拟章节数据
        const categoryId = url.split('/').pop();
        const chapters = [];
        
        const chapterCount = 20;
        
        for (let i = 1; i <= chapterCount; i++) {
            const progress = i <= 5 ? Math.round(100 - (i * 5)) : 0;
            
            chapters.push({
                id: `${categoryId}_chapter_${i}`,
                name: `第${i}章: ${getCategoryName(categoryId)}单词(${i})`,
                locked: i > 7,
                passed: i <= 3,
                progress: progress
            });
        }
        
        return chapters;
    }
    
    // 默认返回空对象
    return {};
}

/**
 * 获取分类名称
 */
function getCategoryName(categoryId) {
    const categories = {
        'cet4': '四级',
        'cet6': '六级',
        'ielts': '雅思',
        'toefl': '托福',
        'gre': 'GRE'
    };
    
    return categories[categoryId] || '通用';
}

/**
 * 主题切换函数
 * @param {string} theme 主题名称
 */
function toggleTheme(theme) {
    try {
        soundManager.play('click');
        } catch (error) {
        console.warn('播放点击音效失败:', error);
    }
    
    // 主题切换逻辑 - 如果theme.js中已有该函数，则使用那个
    if (typeof window.setTheme === 'function') {
        window.setTheme(theme);
    } else {
        document.body.setAttribute('data-theme', theme);
        
        // 更新按钮状态
        document.querySelectorAll('.theme-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.getAttribute('data-theme') === theme) {
                btn.classList.add('active');
            }
        });
        
        // 存储用户偏好
        localStorage.setItem('preferred-theme', theme);
    }
}