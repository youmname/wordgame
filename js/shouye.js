/**
 * 主页面入口文件
 * 负责初始化和协调各个模块
de7783fd-94dc-4fcf-b57a-9fb7ad14c74a 
 */

// 导入依赖模块
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

// --- 新增：新的徽章配置 ---
const badgesConfig = [
    // --- 单词量徽章 ---
    {
        id: 'word_100',         // 唯一ID
        name: '百词斩',
        description: '累计掌握 100 个单词，初窥门径！',
        icon: '📖',
        criteria: 'words',      // 解锁标准类型 ('words', 'streak', 'points')
        threshold: 100          // 解锁阈值
    },
    {
        id: 'word_500',
        name: '五百词霸',
        description: '累计掌握 500 个单词，小有所成！',
        icon: '📚',
        criteria: 'words',
        threshold: 500
    },
    {
        id: 'word_1000',
        name: '千词通',
        description: '累计掌握 1000 个单词，渐入佳境！',
        icon: '🎓',
        criteria: 'words',
        threshold: 1000
    },
     {
        id: 'word_5000',
        name: '万卷通晓',
        description: '累计掌握 5000 个单词，学识渊博！',
        icon: '🌟',
        criteria: 'words',
        threshold: 5000
    },
    // --- 连续打卡天数徽章 ---
    {
        id: 'days_3',
        name: '小试牛刀',
        description: '连续打卡 3 天，好习惯的开始！',
        icon: '🥉',
        criteria: 'streak',
        threshold: 3
    },
    {
        id: 'days_7',
        name: '持之以恒',
        description: '连续打卡 7 天，坚持就是胜利！',
        icon: '📅',
        criteria: 'streak',
        threshold: 7
    },
    {
        id: 'days_30',
        name: '月度学霸',
        description: '连续打卡 30 天，毅力惊人！',
        icon: '🏆',
        criteria: 'streak',
        threshold: 30
    },
    {
        id: 'days_100',
        name: '百日筑基',
        description: '连续打卡 100 天，学无止境！',
        icon: '💯',
        criteria: 'streak',
        threshold: 100
    },
    // --- 积分徽章 ---
    {
        id: 'points_1000',
        name: '积分新星',
        description: '累计获得 1000 积分，崭露头角！',
        icon: '✨',
        criteria: 'points',
        threshold: 1000
    },
    {
        id: 'points_5000',
        name: '积分达人',
        description: '累计获得 5000 积分，实力不凡！',
        icon: '🌟',
        criteria: 'points',
        threshold: 5000
    },
    {
        id: 'points_10000',
        name: '积分王者',
        description: '累计获得 10000 积分，登峰造极！',
        icon: '👑',
        criteria: 'points',
        threshold: 10000
    },
     {
        id: 'points_50000',
        name: '荣誉殿堂',
        description: '累计获得 50000 积分，无上荣耀！',
        icon: '💎',
        criteria: 'points',
        threshold: 50000
    },
];
// --- 新增结束 ---

// --- 新增：存储用户统计数据的全局变量（或使用状态管理） ---
let userStats = {
    words: null,
    streak: null,
    points: null
};
// --- 新增结束 ---

/**
 * 保存游戏模式到localStorage
 * @param {string} mode 游戏模式
 */
function saveGameMode(mode) {
    // 使用store.updateGameMode代替直接操作localStorage
    if (window.store && typeof window.store.updateGameMode === 'function') {
        window.store.updateGameMode(mode);
    } else {
        // 回退方案，直接保存到localStorage
        localStorage.setItem('gameMode', mode);
    }
}

/**
 * 从localStorage获取游戏模式
 * @returns {string} 游戏模式
 */
function getGameMode() {
    // 优先从store获取
    if (window.store && window.store.getState) {
        const state = window.store.getState();
        if (state && state.game && state.game.gameMode) {
            return state.game.gameMode;
        }
    }
    // 回退方案，从localStorage获取
    return localStorage.getItem('gameMode') || 'jiyiMode';
}

/**
 * 设置游戏内容模式
 * @param {string} mode 游戏内容模式 (normal/random/imported/recommended)
 */
function setPlayMode(mode) {
    // 使用store.updatePlayMode更新游戏内容模式
    if (window.store && typeof window.store.updatePlayMode === 'function') {
        window.store.updatePlayMode(mode);
    } else {
        // 回退方案，直接保存到localStorage
        localStorage.setItem('playMode', mode);
    }
    console.log(`已设置游戏内容模式: ${mode}`);
}

/**
 * 获取当前游戏内容模式
 * @returns {string} 游戏内容模式
 */
function getPlayMode() {
    // 优先从store获取
    if (window.store && window.store.getState) {
        const state = window.store.getState();
        if (state && state.game && state.game.playMode) {
            return state.game.playMode;
        }
    }
    // 回退方案，从localStorage获取
    return localStorage.getItem('playMode') || 'normal';
}

/**
 * 加载用户积分数据并更新UI
 */
async function loadUserPoints() {
    const authToken = localStorage.getItem('authToken');
    if (!authToken) {
        console.error('无法加载用户积分：未找到 authToken');
        // Optionally update UI to show error or 0 points
        const userScoreEl = document.getElementById('user-score');
        if (userScoreEl) userScoreEl.textContent = 'N/A';
        return;
    }

    try {
        const response = await fetch('/api/user/points', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json' // Optional, but good practice
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`服务器错误: ${response.status} - ${errorText}`);
        }

        const data = await response.json();

        if (data.success && data.pointsData) {
            const userScoreEl = document.getElementById('user-score');
            const userPoints = data.pointsData.total_points !== null ? data.pointsData.total_points : 0;
            if (userScoreEl) {
                // Update the score display using total_points from the response
                userScoreEl.textContent = userPoints;
            } else {
                console.error('未能找到ID为 user-score 的元素来更新积分');
            }
            // ---> 添加这一行，将获取的积分存入全局 userStats <--- 
            userStats.points = userPoints;
            
            // 下面这行可以保留（用于积分获取后的即时更新）或移除，因为 DOMContentLoaded 最后会统一更新
            // updateBadgesBasedOnStats({ points: userPoints }); // Optional: keep for immediate update
        } else {
            console.error('获取用户积分失败:', data.message || '未知错误');
            const userScoreEl = document.getElementById('user-score');
            if (userScoreEl) userScoreEl.textContent = '加载失败';
        }

    } catch (error) {
        console.error('加载用户积分时出错:', error);
        showErrorAlert(`加载用户积分时出错: ${error.message}`);
        const userScoreEl = document.getElementById('user-score');
        if (userScoreEl) userScoreEl.textContent = '错误';
    }
}

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
        
        // 2. 加载用户基础数据和统计数据
        mark('load_data_start');
        // 注意：调整加载顺序，确保所有需要的统计数据加载完毕后再更新徽章
        const userDataPromise = loadUserData(); // 基础数据
        const userPointsPromise = loadUserPoints(); // 积分
        const completedWordsPromise = loadAndDisplayCompletedWordCount(); // 单词数
        const calendarDataPromise = loadCalendarData(heatmapCalendar); // 加载日历数据以获取 streak
        const totalWordsPromise = loadTotalWordCount(); // <-- 添加：调用获取总单词数的函数
        
        // 等待所有数据加载完成
        const [, , , , totalWordsResult] = await Promise.all([ // Destructure results
            userDataPromise, 
            userPointsPromise, 
            completedWordsPromise, 
            calendarDataPromise,
            totalWordsPromise // Wait for total words count
        ]);

        console.log('所有初始数据加载完成，最终 userStats:', userStats);
        console.log('获取到的总单词数结果:', totalWordsResult); 

        // 假设 totalWordsResult 结构为 { success: true, totalWords: N } 或 null/undefined on error
        const totalWordsInDB = (totalWordsResult && totalWordsResult.success) ? totalWordsResult.totalWords : null;
        console.log('解析后的数据库总单词数:', totalWordsInDB);

        // --- 在所有数据加载后，统一更新 UI --- 
        // 更新徽章墙 (这个位置是正确的)
        updateBadgesBasedOnStats(userStats); 
        
        // --- 更新 "已掌握单词" 模块 --- 
        const currentWords = userStats.words !== null ? userStats.words : 0;
        // const wordBadges = badgesConfig.filter(b => b.criteria === 'words').sort((a, b) => a.threshold - b.threshold);
        
        // 使用从后端获取的总单词数作为目标
        let wordSuffix = "";
        let masteryProgressMax = 1000; // Default if total count fails

        if (totalWordsInDB !== null && totalWordsInDB > 0) {
            wordSuffix = `/ ${totalWordsInDB}`;
            masteryProgressMax = totalWordsInDB;
        } else {
             console.warn('未能获取有效的总单词数，进度条和目标将使用默认值或当前值。');
             // Fallback: Use current words as max if total count is unavailable?
             wordSuffix = ''; // Or maybe show '/ ?'
             masteryProgressMax = Math.max(currentWords, 1000); // Ensure max is at least current or 1000
        }

        updateStatValue('.stats-container .data-module:nth-child(2)', currentWords, wordSuffix);
        // Add detailed logging before updating the progress bar
        console.log(`[Progress Update] Updating mastery-progress: currentWords=${currentWords}, masteryProgressMax=${masteryProgressMax}`);
        updateProgressBar('mastery-progress', currentWords, masteryProgressMax);
        // --- 结束 "已掌握单词" 更新 ---
        
        // --- 更新 "连续学习" 模块 (保持动态目标) ---
        const currentStreak = userStats.streak !== null ? userStats.streak : 0;
        const streakBadges = badgesConfig.filter(b => b.criteria === 'streak').sort((a, b) => a.threshold - b.threshold);
        
        let nextStreakGoal = null;
        let highestStreakGoal = 0;

        if (streakBadges.length > 0) {
            highestStreakGoal = streakBadges[streakBadges.length - 1].threshold;
            for (const badge of streakBadges) {
                if (currentStreak < badge.threshold) {
                    nextStreakGoal = badge.threshold;
                    break;
                }
            }
        } else {
            highestStreakGoal = Math.max(7, currentStreak); // Default base goal for streak
        }
        
        let streakProgressMax = highestStreakGoal; // Default to highest goal
        if(nextStreakGoal !== null) {
            streakProgressMax = nextStreakGoal; // Scale to next goal if one exists
        }

        updateStatValue('.stats-container .data-module:nth-child(1)', currentStreak, '天 🔥');
        updateProgressBar('streak-progress', currentStreak, streakProgressMax);
        // --- 结束 "连续学习" 更新 ---
        
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
        
        // // 应用初始化动画
        // animatePageLoad();

        // 最后统一显示
        requestAnimationFrame(() => {
            if (typeof revealElements === 'function') {
                revealElements([
                    '.stats-container',
                    '.user-profile',
                    '.features-grid'
                ]);
            } else {
                console.warn('revealElements function not found.');
                document.querySelectorAll('.stats-container, .user-profile, .features-grid').forEach(el => {
                    el.style.opacity = '1';
                });
            }
        });
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
    const { soundEnabled } = window.store.getState().system;
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
        window.store.updateUiState({ loading: true });
    const userData = await simulateFetch('/api/user', {
            method: 'GET',
            credentials: 'include'
    });
    
    // 更新状态
        window.store.updateUserData(userData);
    
        return userData;
  } catch (error) {
    console.error('加载用户数据失败:', error);
        showErrorAlert('加载用户数据失败，请检查网络连接');
    } finally {
        window.store.updateUiState({ loading: false });
    }
}

/**
 * 加载徽章数据 - 这个函数现在不再需要从API加载，改为基于用户统计更新
 * 我们保留函数名，但修改其逻辑，或者创建一个新函数 updateBadgesBasedOnStats
 */
/* // 旧的 loadBadges 函数，将被替换或移除
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
*/

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
    
    // --- 修改：调用真实的后端 API --- 
    // 获取存储的 token
    const authToken = localStorage.getItem('authToken'); 
    if (!authToken) {
        console.error('无法加载日历数据：未找到 authToken');
        // 可以选择显示登录提示或不加载日历
        return; 
    }

    fetch('/api/activity/heatmap', { // 使用标准的 fetch
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${authToken}` // 添加 Authorization header
        }
        // credentials: 'include' // 如果使用 cookie-based session 且跨域，可能需要
    }).then(response => {
        // 首先检查响应是否成功
        if (!response.ok) {
            // 如果状态码不是 2xx，抛出错误
            return response.text().then(text => { 
                throw new Error(`服务器错误: ${response.status} - ${text}`); 
            });
        }
        return response.json(); // 解析 JSON 数据
    })
    .then(apiData => { // 处理解析后的 JSON 数据
        // 确保 apiData 是预期的格式 { success: true, heatmapData: {...} }
        if (apiData && apiData.success && apiData.heatmapData) {
            const heatmapData = apiData.heatmapData;
            // **设置日历数据应该在这里**
            const calendarData = {};
            Object.keys(heatmapData).forEach(dateStr => {
                calendarData[dateStr] = heatmapData[dateStr];
            });
            if (calendar) { // 确保 calendar 实例存在
                 calendar.setData(calendarData);
            }
            
            // ---> 计算 streak 并更新 userStats <--- 
            const currentStreak = calculateMaxStreak(heatmapData);
            userStats.streak = currentStreak;
            // updateBadgesBasedOnStats(userStats); // No longer strictly needed here as it runs later
            
            // --- Remove summary calculation and update --- 
            /*
            // 计算并更新摘要信息
            const summary = {
                activeDays: Object.values(heatmapData).filter(v => v > 0).length,
                maxStreak: currentStreak,
                totalActiveDays: Object.values(heatmapData).filter(v => v > 0).length // 使用总活跃天数
            };
            
            // 更新热力图摘要信息
            updateHeatmapSummary(summary);
            */
            // --- End remove summary --- 
            
            // 记录性能结束点
            measure('开始加载日历数据', '日历数据加载完成');
        } else {
            // 处理 apiData.success 为 false 或数据格式不正确的情况
            console.error('获取日历数据失败:', apiData ? apiData.message : '响应格式错误');
            // 可以选择显示错误提示给用户
        }
    }).catch(error => {
        console.error('获取日历数据出错:', error);
        // 显示错误提示给用户，例如使用 showErrorAlert
        showErrorAlert(`加载日历数据时出错: ${error.message}`);
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
    
    // 绑定移动端菜单切换，控制侧边导航栏显示/隐藏
    const mobileNavToggle = document.querySelector('.mobile-nav-toggle');
    const sideNav = document.querySelector('.side-nav');
    
    if (mobileNavToggle && sideNav) {
        mobileNavToggle.addEventListener('click', () => {
            sideNav.classList.toggle('show');
            soundManager.play('click');
        });
    }
    
    // 绑定右侧面板切换，控制右侧面板显示/隐藏
    const panelToggle = document.querySelector('.panel-toggle');
    const rightPanel = document.querySelector('.right-panel');
    
    if (panelToggle && rightPanel) {
        panelToggle.addEventListener('click', () => {
            rightPanel.classList.toggle('show');
            soundManager.play('click');
        });
    }
    
    // 绑定分类按钮事件，用于切换单词分类
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
            
            // 获取分类ID，点击后调用loadChapters(categoryId)加载相应分类的章节
            const categoryId = btn.getAttribute('data-category');
            loadChapters(categoryId);
        });
    });

    // 确保所有主菜单项可点击，点击后更新按钮状态，移除所有active类再添加到当前按钮
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
        window.store.updateUiState({ loading: true });
        
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
        window.store.updateUiState({ loading: false });
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
    if (!progressBar) {
        console.warn(`进度条未找到: #${id}`);
        return;
    }
    
    // 确保 max 大于 0 以避免除零错误
    if (max === null || max === undefined || max <= 0) {
        console.warn(`进度条 #${id} 的最大值无效: ${max}，将设置为 100%`);
        max = value; // Or set a default max like 1? Let's use value itself to make it 100% if max is invalid.
        if (max <= 0) max = 1; // Prevent division by zero if value is also 0
    }

    // 计算百分比，确保 value 不会超过 max (视觉上最多 100%)
    const percentage = Math.min(100, Math.max(0, (value / max) * 100));
    console.log(`更新进度条 #${id}: value=${value}, max=${max}, percentage=${percentage.toFixed(2)}%`);

    const progressFill = progressBar.querySelector('.progress-fill');
    if (progressFill) {
        // 直接设置 CSS 变量，让 CSS transition 处理动画
        progressBar.style.setProperty('--progress-percent', `${percentage}%`);
    } else {
        console.warn(`进度条填充元素未找到: #${id} .progress-fill`);
    }

    // --- 移除复杂的 requestAnimationFrame 逻辑 --- 
    /*
     // 添加初始化标记
     if (!progressBar.dataset.initialized) {
        progressBar.style.setProperty('--progress-percent', '0%');
        progressBar.dataset.initialized = true;
    }

    // 分阶段更新
    requestAnimationFrame(() => {
        progressFill.style.transition = 'none';
        progressBar.style.setProperty('--progress-percent', `${percentage}%`);
        
        requestAnimationFrame(() => {
            progressFill.style.transition = '';
            progressBar.style.setProperty('--progress-percent', `${percentage}%`);
        });
    });
    */
}

// js/shouye.js
function revealElement(element) {
    // 先准备DOM
    element.style.opacity = '0';
    element.removeAttribute('data-hidden');
    
    // 分阶段显示
    requestAnimationFrame(() => {
        element.style.transition = 'opacity 0.5s ease';
        element.style.opacity = '1';
        
        // 延迟触发进度条动画
        setTimeout(() => {
            element.querySelectorAll('.progress-bar').forEach(bar => {
                bar.style.setProperty('--progress-percent', 
                    bar.style.getPropertyValue('--progress-percent'));
            });
        }, 300);
    });
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
 * 显示徽章详情 - 实现新的模态框逻辑
 */
function showBadgeDetail(badgeData) { 
    // 播放点击音效 (假设 soundManager 已初始化)
    if (soundManager) soundManager.play('click');
    
    const modal = document.getElementById('badge-detail-modal');
    const iconEl = document.getElementById('badge-detail-icon');
    const titleEl = document.getElementById('badge-detail-title');
    const descEl = document.getElementById('badge-detail-description');
    const closeBtn = document.getElementById('close-badge-detail-btn');

    if (!modal || !iconEl || !titleEl || !descEl || !closeBtn) {
        console.error('徽章详情模态框元素未找到!');
        return;
    }

    // 填充内容
    iconEl.textContent = badgeData.icon;
    titleEl.textContent = badgeData.name;
    descEl.textContent = badgeData.description;

    // 定义关闭函数
    const closeModal = () => {
        modal.style.display = 'none';
        // 移除事件监听器，避免内存泄漏
        closeBtn.removeEventListener('click', closeModal);
        modal.removeEventListener('click', closeModalOutside);
    };

    // 定义点击外部关闭函数
    const closeModalOutside = (event) => {
        if (event.target === modal) { // 仅当点击背景遮罩时关闭
            closeModal();
        }
    };

    // 添加事件监听器
    closeBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', closeModalOutside); 

    // 显示模态框
    modal.style.display = 'flex'; // 使用 flex 居中
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
    
    // 从localStorage获取当前游戏模式
    const gameMode = getGameMode();
    
    // 设置内容模式为normal(章节学习)
    setPlayMode('normal');
    
    // 更新游戏状态
    window.store.updateGameState({
        currentChapter: chapterId,
        playMode: 'normal',
        gameMode: gameMode // 添加游戏模式
    });
    
    // 延迟跳转，等待动画完成
    setTimeout(() => {
        // 根据游戏模式决定跳转到哪个页面
        let targetUrl;
        switch(gameMode) {
            case 'lianxianMode':
                targetUrl = `game_1_lianxian.html?chapter=${chapterId}&mode=normal`;
                break;
            case 'pipeiMode':
                targetUrl = `game_2_pipei.html?chapter=${chapterId}&mode=normal`;
                break;
            case 'jiyiMode':
                targetUrl = `game_3_jiyi.html?chapter=${chapterId}&mode=normal`;
                break;
            default:
                targetUrl = `game_3_jiyi.html?chapter=${chapterId}&mode=normal`;
        }
        
        window.location.href = targetUrl;
    }, 800);
}

/**
 * 开始随机挑战
 */
function startRandomChallenge() {
    console.log('~~~~~~~~~~~~~~~~~开始随机挑战~~~~~~~~~~~~~~~~~');
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
    
    // 从localStorage获取当前游戏模式
    const gameMode = getGameMode();
    
    // 设置内容模式为random(随机挑战)
    setPlayMode('random');
    
    // 更新游戏状态 - 使用与data-loader一致的变量命名
    window.store.updateGameState({
        playMode: 'random',
        gameMode: gameMode // 添加游戏模式
    });
    
    // 设置WordDataLoader游戏类型为随机 - 不指定具体级别，让其从所有级别获取单词
    if (window.WordDataLoader) {
        try {
            window.WordDataLoader.setPlayMode('random', { 
                levelId: 'all',   // 特殊值，表示所有级别
                wordCount: 20
            });
            console.log('成功设置随机挑战模式，将从所有级别随机获取单词');
        } catch (error) {
            console.error('设置随机挑战模式失败:', error);
        }
    }
    
    console.log(`随机挑战：使用游戏模式 ${gameMode}`);
    
    // 延迟跳转
    setTimeout(() => {
        // 根据游戏模式直接跳转到对应的游戏页面，而不是级别选择页面
        let targetUrl;
        switch (gameMode) {
            case 'lianxianMode':
                targetUrl = 'game_1_lianxian.html?chapter=random&mode=random';
                break;
            case 'pipeiMode':
                targetUrl = 'game_2_pipei.html?chapter=random&mode=random';
                break;
            case 'jiyiMode':
                targetUrl = 'game_3_jiyi.html?chapter=random&mode=random';
                break;
            default:
                // 默认使用记忆模式
                targetUrl = 'game_3_jiyi.html?chapter=random&mode=random';
                break;
        }
        
        window.location.href = targetUrl;
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
    
    // 设置内容模式为imported(用户导入)
    setPlayMode('imported');
    
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
    
    // 设置内容模式为recommended(今日推荐)
    setPlayMode('recommended');
    
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

// 将全局gameMode和playMode相关函数暴露给HTML
window.getGameMode = getGameMode;
window.saveGameMode = saveGameMode;
window.getPlayMode = getPlayMode;
window.setPlayMode = setPlayMode;

// --- 新增：加载并显示已完成单词总数 --- 
async function loadAndDisplayCompletedWordCount() {
    const authToken = localStorage.getItem('authToken');
    if (!authToken) {
        console.error('无法加载单词统计：未找到 authToken');
        // 可以选择在此处更新UI显示错误或0
        // updateCompletedWordCountDisplay(0, '无法加载'); 
        return;
    }

    try {
        const response = await fetch('/api/user/stats/completed-word-count', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`服务器错误: ${response.status} - ${errorText}`);
        }

        const data = await response.json();

        if (data.success) {
            userStats.words = data.totalCompletedWords; // <--- 更新 userStats (Keep this for badges)
            // updateCompletedWordCountDisplay(data.totalCompletedWords, '单词总量'); // <-- Remove this call
            // updateBadgesBasedOnStats(userStats); // Optional: keep for immediate update
        } else {
            console.error('获取单词统计失败:', data.message);
            // updateCompletedWordCountDisplay(0, '加载失败'); // <-- Remove this call
        }
    } catch (error) {
        console.error('加载单词统计出错:', error);
        showErrorAlert(`加载单词统计时出错: ${error.message}`);
        // updateCompletedWordCountDisplay(0, '错误'); // <-- Remove this call
    }
}

// --- 新增：根据用户统计数据更新徽章状态 --- 
function updateBadgesBasedOnStats(stats) {
    console.log("Updating badges based on stats:", stats);
    const badgeWall = document.querySelector('.badge-wall');
    if (!badgeWall) return;
    
    badgeWall.innerHTML = ''; // 清空现有徽章
    
    badgesConfig.forEach(badge => {
        let isUnlocked = false;
        let currentValue = 0;
        
        // 检查用户统计数据是否满足徽章条件
        switch (badge.criteria) {
            case 'words':
                currentValue = stats.words !== null ? stats.words : 0;
                isUnlocked = currentValue >= badge.threshold;
                break;
            case 'streak':
                currentValue = stats.streak !== null ? stats.streak : 0;
                isUnlocked = currentValue >= badge.threshold;
                break;
            case 'points':
                currentValue = stats.points !== null ? stats.points : 0;
                isUnlocked = currentValue >= badge.threshold;
                break;
        }
        
        // 创建徽章元素
        const badgeElement = document.createElement('div');
        // Add 'unlocked' class based on the condition
        badgeElement.className = `badge-item ${isUnlocked ? 'unlocked' : 'locked'}`;
        badgeElement.title = `${badge.name} (${isUnlocked ? '已解锁' : `需 ${badge.threshold} ${getCriteriaUnit(badge.criteria)}`})`; // 添加更详细的 title
        
        // --- 修改开始: 使用图片 --- 
        const iconContainer = document.createElement('div');
        iconContainer.className = 'badge-icon';
        
        const imgElement = document.createElement('img');
        const imgBaseName = badge.id; // Use badge ID as base for image name
        // **修改：始终加载彩色图片路径**
        imgElement.src = `assets/badges/${imgBaseName}.png`; 
        imgElement.alt = badge.name;
        // Handle image loading errors (still useful if the color image is missing)
        imgElement.onerror = () => {
            console.warn(`图片加载失败: ${imgElement.src}`);
            // Fallback: CSS now handles the visual style for the empty container
            // iconContainer.textContent = '?'; // Remove this line
            // iconContainer.style.fontSize = '1.5em'; // Remove this line
            // iconContainer.style.color = '#ccc'; // Remove this line
        };

        iconContainer.appendChild(imgElement);
        // --- 修改结束 --- 

        const titleElement = document.createElement('div');
        titleElement.className = 'badge-title';
        titleElement.textContent = badge.name;

        badgeElement.appendChild(iconContainer);
        badgeElement.appendChild(titleElement);
        
        // 为已解锁的徽章添加点击事件 (保持不变)
        if (isUnlocked) {
            badgeElement.addEventListener('click', () => {
                showBadgeDetail(badge); // 传递徽章配置数据
            });
        } else {
             // Optionally make locked badges non-clickable or show a message
             badgeElement.style.cursor = 'not-allowed';
        }
        
        badgeWall.appendChild(badgeElement);
    });
}

// 辅助函数：获取标准单位
function getCriteriaUnit(criteria) {
    switch(criteria) {
        case 'words': return '单词';
        case 'streak': return '连续打卡';
        case 'points': return '积分';
        default: return '';
    }
}
// --- 新增结束 ---

/**
 * 更新统计模块的文本显示
 * @param {string} moduleSelector - 统计模块的 CSS 选择器 (e.g., '.data-module:nth-child(1)')
 * @param {string|number} value - 要显示的值
 * @param {string} [suffix=''] - 值的后缀 (e.g., '天 🔥', ' / 1000')
 */
function updateStatValue(moduleSelector, value, suffix = '') {
    const valueEl = document.querySelector(`${moduleSelector} .data-value`);
    if (valueEl) {
        // 清空原始内容，避免重复添加后缀
        valueEl.innerHTML = ''; 
        // 直接设置文本内容
        valueEl.textContent = value;
        // 如果有后缀，可以添加 span 或直接拼接，这里简单拼接
        if (suffix) {
             // 尝试移除旧的后缀 span (如果存在)
             const oldSuffix = valueEl.querySelector('.suffix-span');
             if(oldSuffix) oldSuffix.remove();

             // 创建新的 span 添加后缀 (更灵活控制样式)
             const suffixSpan = document.createElement('span');
             suffixSpan.className = 'suffix-span'; // Add class for potential styling
             // 注意：如果后缀包含 HTML (如 🔥)，需要用 innerHTML
             if (suffix.includes('<') || suffix.includes('&')) { 
                 suffixSpan.innerHTML = ` ${suffix}`; // Add space before suffix
             } else {
                 suffixSpan.textContent = ` ${suffix}`; // Add space before suffix
             }
             valueEl.appendChild(suffixSpan);
        } 
    } else {
        console.warn(`更新统计值失败：找不到元素 ${moduleSelector} .data-value`);
    }
}

/**
 * 【模拟/需要后端实现】加载数据库中的总单词数量
 * @returns {Promise<Object|null>} Promise resolves with { success: true, totalWords: N } or null on error
 */
async function loadTotalWordCount() {
    console.log('调用接口获取总单词数...');
    // **注意：后端需要实现 /api/stats/total-word-count 接口**
    const endpoint = '/api/stats/total-word-count'; 
    try {
        const response = await fetch(endpoint, {
            method: 'GET',
            // 可能需要认证? 如果是公开统计数据则不需要
            // headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
        });

        if (!response.ok) {
            // Handle HTTP errors (4xx, 5xx)
            const errorText = await response.text();
            console.error(`获取总单词数失败 (${response.status}): ${errorText}`);
            throw new Error(`服务器错误: ${response.status}`);
        }

        const data = await response.json();

        if (data && data.success && typeof data.totalWords === 'number') {
            console.log('成功获取总单词数:', data.totalWords);
            return data; // 返回 { success: true, totalWords: N }
        } else {
            // Handle cases where response is ok but data is invalid
            console.error('获取总单词数失败：无效的响应数据', data);
            return { success: false, message: '无效的响应数据' }; // Return failure object
        }
    } catch (error) {
        console.error('加载总单词数时出错:', error);
        // Optionally show an alert to the user
        // showErrorAlert(`加载总单词统计时出错: ${error.message}`);
        return null; // Return null to indicate failure
    }
}

// --- 新增：今日任务 功能 --- 
document.addEventListener('DOMContentLoaded', () => {
    const taskContainer = document.querySelector('.task-container');
    const taskList = document.getElementById('taskList');
    const newTaskInput = document.querySelector('.new-task-input');
    const emptyStateMessage = taskContainer.querySelector('.empty-state-message');
    let tasks = []; // 存储任务数据的数组
    let draggedItem = null;
    let dragOverPlaceholder = null;

    if (!taskContainer || !taskList || !newTaskInput || !emptyStateMessage) {
        console.warn('今日任务模块缺少必要的元素，功能可能无法正常工作。');
        return;
    }

    const TASKS_STORAGE_KEY = 'wordgame_tasks_v2'; // 使用新 key 避免旧数据冲突

    // --- 排序、保存、加载 --- 
    const sortTasksArray = () => {
        tasks.sort((a, b) => a.checked - b.checked);
    };

    const saveTasks = () => {
        try {
            localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(tasks));
            checkEmptyState();
        } catch (error) {
            console.error('保存任务到 localStorage 失败:', error);
            // showErrorAlert('无法保存任务列表...'); // showErrorAlert 可能未定义，暂时注释
        }
    };

    const loadTasks = () => {
        try {
            const savedTasks = localStorage.getItem(TASKS_STORAGE_KEY);
            tasks = savedTasks ? JSON.parse(savedTasks) : [];
            sortTasksArray(); // 加载后立即排序
            renderTaskList();
        } catch (error) {
            console.error('从 localStorage 加载任务失败:', error);
            tasks = [];
            renderTaskList();
        }
    };

    // --- 渲染 --- 
    const renderTaskList = () => {
        taskList.innerHTML = '';
        tasks.forEach(taskData => {
            const taskElement = renderTaskItem(taskData);
            taskList.appendChild(taskElement);
        });
        checkEmptyState();
    };

    const renderTaskItem = (taskData) => {
        const taskItem = document.createElement('div');
        taskItem.className = 'task-item';
        taskItem.setAttribute('draggable', 'true');
        taskItem.dataset.taskId = taskData.id;
        if (taskData.checked) {
            taskItem.classList.add('checked');
        }
        // 注意：不再需要设置背景色变量，颜色由 border-left-color 控制
        taskItem.innerHTML = `
          <input type="checkbox" class="task-check" ${taskData.checked ? 'checked' : ''} title="${taskData.checked ? '标记为未完成' : '标记为已完成'}">
          <span class="task-text editable" contenteditable>${escapeHtml(taskData.text)}</span>
          <button class="delete-btn" title="删除任务">×</button>
          `;
           // 移除颜色选择器和指示器的相关代码
        return taskItem;
    };

    // --- 任务操作 --- 
    const addTask = (text) => {
        const trimmedText = text.trim();
        if (!trimmedText) return;

        const newTaskData = {
            id: Date.now().toString(),
            text: trimmedText,
            // color: getRandomSoftColor(), // 不再需要颜色
            checked: false
        };
        tasks.unshift(newTaskData);
        sortTasksArray(); // 添加后也要排序，确保新任务在未完成列表顶部
        saveTasks();
        renderTaskList();
        newTaskInput.value = '';
    };

    const updateTask = (id, updates) => {
        let taskUpdated = false;
        tasks = tasks.map(task => {
            if (task.id === id) {
                // 检查是否有实际变化
                if (Object.keys(updates).some(key => task[key] !== updates[key])) {
                    taskUpdated = true;
                    return { ...task, ...updates };
                }
            }
            return task;
        });
        // 只有在数据实际改变时才保存
        if (taskUpdated) {
            // 不需要在这里排序，因为 updateTask 主要是改文本，勾选会单独处理排序和渲染
            saveTasks(); 
        }
        return taskUpdated; // 返回是否更新了
    };

    const deleteTask = (id) => {
        const initialLength = tasks.length;
        tasks = tasks.filter(task => task.id !== id);
        if (tasks.length < initialLength) { // 确认有任务被删除
           saveTasks(); // 保存更改
           const elementToRemove = taskList.querySelector(`[data-task-id="${id}"]`);
           if (elementToRemove) {
               elementToRemove.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
               elementToRemove.style.opacity = '0';
               elementToRemove.style.transform = 'translateX(-20px)';
               setTimeout(() => {
                   elementToRemove.remove();
                   checkEmptyState(); // 移除后再检查空状态
               }, 300);
           } else {
              renderTaskList(); // Fallback
           }
        } else {
             checkEmptyState(); // 以防万一
        }
    };

    // --- 工具函数 --- 
    const checkEmptyState = () => {
        if (tasks.length === 0) {
            emptyStateMessage.style.display = 'block';
            taskList.style.display = 'none';
        } else {
            emptyStateMessage.style.display = 'none';
            taskList.style.display = 'block';
        }
    };
    
    // getRandomSoftColor 不再需要
    
    const escapeHtml = (unsafe) => {
        // ... (保持不变) ...
         return unsafe
             .replace(/&/g, "&amp;")
             .replace(/</g, "&lt;")
             .replace(/>/g, "&gt;")
             .replace(/"/g, "&quot;")
             .replace(/'/g, "&#039;");
    };

    // --- 事件监听 --- 
    newTaskInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault(); // 防止可能的表单提交行为
            addTask(newTaskInput.value);
        }
    });

    taskList.addEventListener('change', (e) => {
        const target = e.target;
        if (target.classList.contains('task-check')) {
            const taskItem = target.closest('.task-item');
            const taskId = taskItem?.dataset.taskId;
            if (taskId) {
                // 1. 更新内存中任务的状态 (直接修改 checked)
                const task = tasks.find(t => t.id === taskId);
                if(task) task.checked = target.checked;
                // 2. 对内存中的 tasks 数组进行排序
                sortTasksArray();
                // 3. 保存排序后的数组到 localStorage
                saveTasks();
                // 4. 根据排序后的数组重新渲染整个列表
                renderTaskList(); 
            }
        }
         // 移除颜色选择器相关的 change 监听
    });

    taskList.addEventListener('click', (e) => {
        const target = e.target;
        if (target.classList.contains('delete-btn')) {
            const taskItem = target.closest('.task-item');
            const taskId = taskItem?.dataset.taskId;
            if (taskId) {
                deleteTask(taskId);
            }
        }
        // 移除颜色指示器相关的 click 监听
    });

    taskList.addEventListener('blur', (e) => {
        const target = e.target;
        if (target.classList.contains('task-text') && target.hasAttribute('contenteditable')) {
            const taskItem = target.closest('.task-item');
            const taskId = taskItem?.dataset.taskId;
            const newText = target.textContent.trim(); // 使用 textContent 更安全
            
            if (taskId) {
                 if (!newText) {
                     deleteTask(taskId);
                 } else {
                    // updateTask 内部会检查是否真的改变了并保存
                    updateTask(taskId, { text: newText });
                    // 不需要手动更新 DOM 的 textContent，因为 blur 后内容已更新
                 }
            }
        }
    }, true);

    // --- 拖放事件处理 --- 
    taskList.addEventListener('dragstart', (e) => {
        if (e.target.classList.contains('task-item')) {
            draggedItem = e.target;
            const dragImage = draggedItem.cloneNode(true);
            // ... (setDragImage 代码保持不变) ...
            dragImage.style.position = 'absolute';
            dragImage.style.top = '-9999px'; 
            dragImage.style.width = draggedItem.offsetWidth + 'px';
            dragImage.style.opacity = '0.8'; 
            dragImage.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
            document.body.appendChild(dragImage);
            e.dataTransfer.setDragImage(dragImage, 10, 10);
            requestAnimationFrame(() => { 
                if(document.body.contains(dragImage)) {
                    document.body.removeChild(dragImage);
                }
            });
            
            setTimeout(() => draggedItem?.classList.add('dragging'), 0);
        }
    });

    taskList.addEventListener('dragend', (e) => {
        if (draggedItem) {
             draggedItem.classList.remove('dragging');
            if (dragOverPlaceholder) {
                dragOverPlaceholder.remove();
                dragOverPlaceholder = null;
            }
            // 获取当前 DOM 顺序
            const newOrderedIds = Array.from(taskList.querySelectorAll('.task-item')).map(item => item.dataset.taskId);
            // 根据 DOM 顺序重排内存中的 tasks 数组
            tasks = newOrderedIds.map(id => tasks.find(t => t.id === id)).filter(Boolean);
            // 强制按完成状态排序
            sortTasksArray();
            // 保存最终结果
            saveTasks();
            // 重新渲染以确保视觉和数据一致
            renderTaskList(); 
            draggedItem = null;
        }
    });

    taskList.addEventListener('dragover', (e) => {
        e.preventDefault();
        const afterElement = getDragAfterElement(taskList, e.clientY);
        const currentDragging = document.querySelector('.dragging');
        if (!currentDragging) return;

        if (!dragOverPlaceholder) {
            dragOverPlaceholder = document.createElement('div');
            dragOverPlaceholder.classList.add('drag-over-placeholder');
        }

        if (afterElement == null) {
            if (taskList.lastElementChild !== dragOverPlaceholder && taskList.lastElementChild !== currentDragging) {
                 taskList.appendChild(dragOverPlaceholder);
            }
        } else {
             if (afterElement.previousSibling !== dragOverPlaceholder && afterElement !== currentDragging) {
                taskList.insertBefore(dragOverPlaceholder, afterElement);
             }
        }
    });
    
    taskList.addEventListener('drop', (e) => {
        e.preventDefault();
        if (dragOverPlaceholder && draggedItem) { 
            taskList.insertBefore(draggedItem, dragOverPlaceholder);
        }
    });

    taskList.addEventListener('dragleave', (e) => {
        // 移除占位符，如果鼠标移出了列表区域
        if (dragOverPlaceholder && !taskList.contains(e.relatedTarget)) {
             if (dragOverPlaceholder.parentNode === taskList) { // 确保还在 taskList 中
                 dragOverPlaceholder.remove();
             }
             dragOverPlaceholder = null;
        }
    });

    // 辅助函数：获取拖动位置下方的元素
    function getDragAfterElement(container, y) {
        // ... (保持不变) ...
        const draggableElements = [...container.querySelectorAll('.task-item:not(.dragging)')];
        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }

    // --- 初始化 --- 
    loadTasks(); 
});
// --- 今日任务 功能结束 ---