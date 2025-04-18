// 页面加载时执行
document.addEventListener('DOMContentLoaded', function() {
    // 初始化用户数据
    loadUserData();
    
    // 初始化关卡分类
    initCategories();
    
    // 初始化动画效果
    initAnimations();
    
    // 绑定事件监听器
    bindEventListeners();
    
    // 初始化GSAP动画
    initGSAPAnimations();
});

// 加载用户数据
function loadUserData() {
    // 模拟从API获取数据
    const userData = {
        name: "学习达人",
        avatar: "assets/images/default-avatar.png",
        score: 1280,
        minutes: 1200,
        level: "Lv.12",
        stats: {
            todayCompleted: 12,
            streakDays: 7,
            masteredWords: 364
        },
        badges: ["🥉", "⏱️", "📚", "⚡", "🧠"]
    };
    
    // 更新用户信息显示
    document.getElementById('user-name').textContent = `👑 ${userData.name}`;
    document.getElementById('user-score').textContent = userData.score;
    document.getElementById('user-minutes').textContent = userData.minutes;
    document.getElementById('user-avatar').src = userData.avatar;
    
    // 更新学习数据
    document.getElementById('streak-days').textContent = userData.stats.streakDays;
    document.getElementById('mastered-words').textContent = userData.stats.masteredWords;
    
    // 更新进度条
    document.getElementById('streak-progress').style.width = (userData.stats.streakDays / 10 * 100) + '%';
    document.getElementById('mastery-progress').style.width = (userData.stats.masteredWords / 1000 * 100) + '%';
    
    // 触发数字增长动画
    setTimeout(() => {
        animateValue('streak-days', 0, userData.stats.streakDays, 1500);
        animateValue('mastered-words', 0, userData.stats.masteredWords, 2000);
        animateValue('user-score', 0, userData.score, 2000);
        animateValue('user-minutes', 0, userData.minutes, 2500);
    }, 500);
}

// 初始化分类按钮
function initCategories() {
    // 绑定分类按钮点击事件
    const categoryBtns = document.querySelectorAll('.category-btn');
    categoryBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            // 先移除所有按钮的active状态
            categoryBtns.forEach(b => b.classList.remove('active'));
            // 为当前点击的按钮添加active状态
            this.classList.add('active');
            
            // 获取分类ID和名称
            const levelId = this.getAttribute('data-level-id');
            const category = this.getAttribute('data-category');
            
            // 切换分类
            changeCategory(levelId, category);
            
            // 添加点击特效
            addClickEffect(this);
        });
    });
}

// 添加点击特效
function addClickEffect(element) {
    // 创建波纹元素
    const ripple = document.createElement('span');
    ripple.classList.add('ripple-effect');
    element.appendChild(ripple);
    
    // 设置波纹位置和大小
    const rect = element.getBoundingClientRect();
    ripple.style.width = ripple.style.height = Math.max(rect.width, rect.height) + 'px';
    
    // 动画结束后移除波纹元素
    setTimeout(() => {
        ripple.remove();
    }, 600);
}

// 初始化动画效果
function initAnimations() {
    // 设置徽章动画
    const badges = document.querySelectorAll('.badge');
    badges.forEach(badge => {
        badge.addEventListener('mouseenter', function() {
            this.style.transform = 'rotate(0) scale(1.2)';
        });
        
        badge.addEventListener('mouseleave', function() {
            if (this.classList.contains('unlocked')) {
                this.style.transform = 'rotate(-5deg) scale(1)';
            } else {
                this.style.transform = 'scale(1)';
            }
        });
    });
    
    // 设置日历方块悬停效果
    const calendarDays = document.querySelectorAll('.calendar-day');
    calendarDays.forEach(day => {
        day.addEventListener('mouseenter', function() {
            this.style.transform = 'scale(1.15)';
        });
        
        day.addEventListener('mouseleave', function() {
            this.style.transform = 'scale(1)';
        });
    });
}

// 初始化GSAP动画
function initGSAPAnimations() {
    // 为用户卡片添加入场动画
    gsap.from(".user-card", {
        duration: 0.8,
        y: -50,
        opacity: 0,
        ease: "back.out(1.7)"
    });
    
    // 为功能卡片添加逐个入场动画
    gsap.from(".func-card", {
        duration: 0.8,
        y: 30,
        opacity: 0,
        stagger: 0.15,
        ease: "power3.out"
    });
    
    // 为分类按钮添加动画
    gsap.from(".category-btn", {
        duration: 0.5,
        opacity: 0,
        y: 20,
        stagger: 0.1,
        delay: 0.5
    });
    
    // 为手账区域添加动画
    gsap.from(".data-journal", {
        duration: 1,
        opacity: 0,
        y: 50,
        delay: 0.8
    });
    
    // 为数据项添加动画
    gsap.from(".stats-item", {
        duration: 0.6,
        opacity: 0,
        y: 30,
        stagger: 0.2,
        delay: 1.2
    });
    
    // 胶带动画
    gsap.from([".deco-tape-right", ".deco-tape-left"], {
        duration: 1,
        rotation: "random(-60, 60)",
        opacity: 0,
        scale: 0.5,
        delay: 0.3,
        ease: "elastic.out(1, 0.3)"
    });
    
    // 回形针动画
    gsap.from(".deco-clip", {
        duration: 0.8,
        rotation: "random(-90, 90)",
        y: -30,
        opacity: 0,
        delay: 1,
        ease: "bounce.out"
    });
}

// 绑定事件监听器
function bindEventListeners() {
    // 为全局作用域提供函数
    window.startChapter = startChapter;
    window.startRandomChallenge = startRandomChallenge;
    window.showCustomWordbank = showCustomWordbank;
    window.startTodayChallenge = startTodayChallenge;
    window.showSettings = showSettings;
    window.showHome = showHome;
    window.showProfile = showProfile;
    window.changeCategory = changeCategory;
    
    // 为功能卡片添加点击特效
    const funcCards = document.querySelectorAll('.func-card');
    funcCards.forEach(card => {
        card.addEventListener('mousedown', function() {
            this.style.transform = 'translateY(2px) rotate(0)';
        });
        
        card.addEventListener('mouseup', function() {
            this.style.transform = '';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = '';
        });
    });
}

// 启动章节
function startChapter(chapterId) {
    // 创建纸张翻页效果
    createPageTurnEffect();
    
    // 延迟跳转
    setTimeout(() => {
        window.location.href = `index.html?chapter=${chapterId}`;
    }, 600);
}

// 随机挑战
function startRandomChallenge() {
    // 随机挑战前的粒子特效
    createParticleEffect();
    
    // 延迟跳转
    setTimeout(() => {
        window.location.href = 'index.html?mode=random';
    }, 800);
}

// 粒子特效
function createParticleEffect() {
    // 创建一个粒子容器
    const particleContainer = document.createElement('div');
    particleContainer.className = 'particle-container';
    document.body.appendChild(particleContainer);
    
    // 创建30个粒子
    for(let i = 0; i < 30; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.left = '50%';
        particle.style.top = '50%';
        particle.style.backgroundColor = getRandomColor();
        particle.style.setProperty('--size', Math.random() * 10 + 5 + 'px');
        particle.style.setProperty('--rotation', Math.random() * 360 + 'deg');
        particle.style.setProperty('--x', (Math.random() * 200 - 100) + 'px');
        particle.style.setProperty('--y', (Math.random() * 200 - 100) + 'px');
        particle.style.setProperty('--delay', Math.random() * 0.2 + 's');
        particleContainer.appendChild(particle);
    }
    
    // 600ms后移除粒子容器
    setTimeout(() => {
        particleContainer.remove();
    }, 600);
}

// 获取随机颜色
function getRandomColor() {
    const colors = ['#FFB3C1', '#C4E4D4', '#B5B8E3', '#FFD6A5', '#FFA5A5'];
    return colors[Math.floor(Math.random() * colors.length)];
}

// 纸张翻页效果
function createPageTurnEffect() {
    // 创建一个纸张翻页容器
    const pageTurn = document.createElement('div');
    pageTurn.className = 'page-turn';
    document.body.appendChild(pageTurn);
    
    // 添加动画类
    setTimeout(() => {
        pageTurn.classList.add('animate');
    }, 10);
    
    // 600ms后移除纸张翻页容器
    setTimeout(() => {
        pageTurn.remove();
    }, 600);
}

// 显示自定义词库
function showCustomWordbank() {
    window.location.href = 'index.html?mode=custom';
}

// 今日推荐
function startTodayChallenge() {
    // 今日推荐卡片突出效果
    gsap.to('.func-card[onclick="startTodayChallenge()"]', {
        duration: 0.3,
        scale: 1.05,
        boxShadow: "0 10px 20px rgba(0,0,0,0.15)",
        yoyo: true,
        repeat: 1
    });
    
    setTimeout(() => {
        window.location.href = 'index.html?mode=daily';
    }, 600);
}

// 系统设置
function showSettings() {
    gsap.to('.settings-button', {
        duration: 0.5,
        rotation: 180,
        ease: "power2.out"
    });
    
    // 这里可以显示设置对话框
    alert('打开系统设置');
    
    // 重置旋转
    gsap.to('.settings-button', {
        duration: 0.5,
        rotation: 0,
        delay: 0.5
    });
}

// 显示首页
function showHome() {
    // 已经在首页，不做操作
}

// 显示个人资料
function showProfile() {
    alert('打开个人资料');
}

// 切换词汇类别
function changeCategory(levelId, category) {
    // 这里模拟从API获取数据并更新关卡地图
    console.log(`切换到${category}词汇，ID: ${levelId}`);
    
    // 使用GSAP为切换添加动画
    const staggerEffect = gsap.timeline();
    
    // 使用GSAP创建收缩和展开的动画效果
    staggerEffect.to('.category-selector', {
        duration: 0.3,
        scale: 0.97,
        ease: "power2.inOut"
    }).to('.category-selector', {
        duration: 0.5,
        scale: 1,
        ease: "elastic.out(1, 0.3)"
    });
}

// 数字增长动画
function animateValue(id, start, end, duration) {
    // 检查元素是否存在
    const obj = document.getElementById(id);
    if (!obj) return;
    
    // 计算步长
    let stepTime = 20;
    let steps = duration / stepTime;
    let step = (end - start) / steps;
    let current = start;
    let timer;
    
    // 使用requestAnimationFrame优化动画
    function updateValue() {
        current += step;
        if ((step > 0 && current >= end) || (step < 0 && current <= end)) {
            current = end;
            cancelAnimationFrame(timer);
        }
        obj.textContent = Math.floor(current);
        if (current !== end) {
            timer = requestAnimationFrame(updateValue);
        }
    }
    
    timer = requestAnimationFrame(updateValue);
}

// CSS样式注入 - 为动态创建的元素添加样式
function injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
        /* 粒子特效 */
        .particle-container {
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            pointer-events: none;
            z-index: 9999;
        }
        
        .particle {
            position: absolute;
            width: var(--size);
            height: var(--size);
            border-radius: 50%;
            transform: translate(-50%, -50%) rotate(var(--rotation));
            animation: particle-animation 0.6s ease-out forwards;
            animation-delay: var(--delay);
            opacity: 0;
        }
        
        @keyframes particle-animation {
            0% {
                opacity: 1;
                transform: translate(-50%, -50%) rotate(var(--rotation));
            }
            100% {
                opacity: 0;
                transform: translate(calc(-50% + var(--x)), calc(-50% + var(--y))) rotate(calc(var(--rotation) + 180deg));
            }
        }
        
        /* 纸张翻页效果 */
        .page-turn {
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background-color: #fff;
            z-index: 9999;
            transform-origin: left center;
            transform: scaleX(0);
            pointer-events: none;
        }
        
        .page-turn.animate {
            animation: page-turn 0.6s ease-in-out forwards;
        }
        
        @keyframes page-turn {
            0% {
                transform: scaleX(0);
            }
            50% {
                transform: scaleX(1);
            }
            100% {
                transform: scaleX(0);
                transform-origin: right center;
            }
        }
        
        /* 点击波纹效果 */
        .ripple-effect {
            position: absolute;
            border-radius: 50%;
            background-color: rgba(255, 255, 255, 0.3);
            animation: ripple 0.6s ease-out;
            pointer-events: none;
            transform: translate(-50%, -50%);
            top: 50%;
            left: 50%;
        }
        
        @keyframes ripple {
            0% {
                width: 0;
                height: 0;
                opacity: 0.5;
            }
            100% {
                width: 100%;
                height: 100%;
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(style);
}

// 调用样式注入函数
injectStyles();