document.addEventListener('DOMContentLoaded', async () => {
    console.log('[Card Page] DOM Content Loaded. Initializing...');
    
    // --- URL参数解析 ---
    const urlParams = new URLSearchParams(window.location.search);
    const urlCategoryParam = urlParams.get('category'); // 从URL获取级别ID
    const urlChapterParam = urlParams.get('chapter'); // 从URL获取章节ID
    console.log(`[Card Page] URL参数解析: 级别=${urlCategoryParam}, 章节=${urlChapterParam}`);
    
    // --- 从跳转检查 --- 
    const jumpedFromNextLevel = sessionStorage.getItem('jumpedFromNextLevel') === 'true';
    const forceActiveChapter = sessionStorage.getItem('forceActiveChapter') === 'true';
    const lastSelectedLevel = sessionStorage.getItem('lastSelectedLevel');
    const lastSelectedChapter = sessionStorage.getItem('lastSelectedChapter');
    
    if (jumpedFromNextLevel) {
        console.log(`[Card Page] 检测到从"下一关"按钮跳转, 上一关级别=${lastSelectedLevel}, 章节=${lastSelectedChapter}`);
        // 清除标记，避免影响下次加载
        sessionStorage.removeItem('jumpedFromNextLevel');
    }
    
    if (forceActiveChapter) {
        console.log('[Card Page] 检测到强制激活章节标记，将优先使用URL参数选择章节');
        // 清除标记，避免影响下次加载
        sessionStorage.removeItem('forceActiveChapter');
    }
    
    // --- 0. 检查 WordDataLoader 是否存在 ---
    if (!window.WordDataLoader || typeof window.WordDataLoader._getAuthHeaders !== 'function') {
        console.error('[Card Page] CRITICAL: window.WordDataLoader or necessary methods not found! Ensure data-loader.js is loaded BEFORE card.js.');
        const body = document.querySelector('body');
        if(body) body.innerHTML = '<h1 style="color: red; text-align: center; margin-top: 50px;">页面初始化失败，请联系管理员。</h1><p style="text-align: center;">(错误：数据加载器未准备好)</p>';
        return;
    }
    console.log('[Card Page] WordDataLoader found.');
    
    // --- 1. 认证检查 --- 
    const authHeaders = window.WordDataLoader._getAuthHeaders(); 
    if (!authHeaders) {
        console.warn('[Card Page] Authentication check failed via WordDataLoader._getAuthHeaders(). Stopping initialization.');
        return;
    }
    console.log('[Card Page] Authentication check passed.');

    // --- 2. 获取用户信息 --- 
    let currentUser = null;
    let userType = 'guest';
    try {
        const userInfoString = localStorage.getItem('userInfo'); 
        if (userInfoString) {
            currentUser = JSON.parse(userInfoString);
            userType = currentUser?.userType || 'guest';
            console.log('[Card Page] User info loaded:', currentUser);
        } else {
            console.warn('[Card Page] User info not found in localStorage. Proceeding as guest.');
        }
    } catch (e) {
        console.error('[Card Page] Failed to parse user info:', e);
        console.warn('[Card Page] Proceeding as guest due to parsing error.');
    }
    console.log(`[Card Page] Effective user type: ${userType}`);

    // --- DOM 元素获取 ---
    const sidebar = document.querySelector('.sidebar');
    const toggleBtn = document.querySelector('.sidebar-toggle-btn');
    // const mainContent = document.querySelector('.card-main'); // 可能不再需要直接操作mainContent
    let isMobile = window.innerWidth <= 768;

    // --- DOM 元素获取 ---
    const customSelectWrapper = document.querySelector('.custom-select-wrapper');
    const selectDisplay = customSelectWrapper?.querySelector('.custom-select-display');
    const selectedOptionSpan = selectDisplay?.querySelector('.selected-option');
    const optionsList = customSelectWrapper?.querySelector('.custom-select-options');
    const chapterListContainer = document.querySelector('.chapter-list-container'); // 获取章节列表容器
    const chapterList = chapterListContainer?.querySelector('.chapter-list'); // 获取章节列表ul
    const wordCard = document.querySelector('.word-card'); // <--- 新增：获取单词卡片元素
    const styleSelect = document.getElementById('card-style-select'); // <--- 新增：获取样式下拉菜单
    const customBgInput = document.getElementById('custom-bg-input'); // <--- 新增：获取文件输入框
    console.log('[Card Page - Debug] DOM Elements:', { sidebar, toggleBtn, customSelectWrapper, selectDisplay }); // <-- 添加日志

    // --- 状态变量 ---
    let firstLevelId = null; // 用于存储第一个级别的 ID
    let currentCardStyle = 'default'; // <--- 新增：追踪当前卡片样式
    let customBgDataUrl = null; // <--- 新增：存储自定义背景图片数据
    let currentWordData = null; // <-- 新增：存储当前单词数据
    let currentWordList = []; // 新增：存储当前单词列表
    let currentWordIndex = 0; // 新增：存储当前单词索引
    let currentMode = 'full'; // 新增：追踪当前模式 ('full' 或 'minimalist')

    // --- 更新导航点 --- (定义提前)
    // function updateNavigationDots() {
    //      const dotsContainer = document.querySelector('.nav-dots'); 
    //      if (!dotsContainer) return;
    //      const dots = dotsContainer.querySelectorAll('.dot');
    //      dots.forEach((dot, index) => {
    //          dot.classList.toggle('active', index === currentWordIndex); // 使用全局 currentWordIndex
    //      });
    // }

    // --- 更新导航按钮状态 --- (定义提前)
    function updateNavButtonStates() {
        // 使用 querySelectorAll 获取所有匹配的按钮
        const prevButtons = document.querySelectorAll('.nav-arrow.prev'); 
        const nextButtons = document.querySelectorAll('.nav-arrow.next');
        
        if (prevButtons.length === 0 && nextButtons.length === 0) {
            console.warn("[Nav Buttons] No navigation buttons found to update state.");
            return;
        } 

        const isPrevDisabled = currentWordIndex <= 0; // 使用全局 currentWordIndex
        const isNextDisabled = currentWordIndex >= currentWordList.length - 1; // 使用全局 currentWordList

        // 遍历并更新所有按钮
        prevButtons.forEach(button => button.classList.toggle('disabled', isPrevDisabled));

        // 检查是否是最后一张卡片
        if (isNextDisabled && currentWordList.length > 0) {
            // 当是最后一张卡片时，将"下一个"按钮变为"下一章"按钮
            nextButtons.forEach(button => {
                // 移除disabled类
                button.classList.remove('disabled');
                
                // 如果按钮没有nextChapter类，添加它，并更改内容及样式
                if (!button.classList.contains('next-chapter')) {
                    button.classList.add('next-chapter');
                    
                    // 保存原始文本/图标
                    if (!button.dataset.originalContent) {
                        button.dataset.originalContent = button.innerHTML;
                    }
                    
                    // 更改显示文本/图标
                    button.innerHTML = '下一章 &rarr;';
                    button.style.backgroundColor = '#4caf50';  // 绿色背景
                    button.style.color = 'white';
                    button.style.fontWeight = 'bold';
                    button.style.padding = '5px 10px';
                    
                    // 添加提示
                    button.title = "进入下一章学习";
                    
                    // 移除原来的点击事件
                    const oldClone = button.cloneNode(true);
                    button.parentNode.replaceChild(oldClone, button);
                    
                    // 添加新的点击事件，调用nextLevel函数
                    oldClone.addEventListener('click', async () => {
                        // 先获取当前级别和章节信息
                        await updateCurrentChapterProgress();
                        nextLevel();
                    });
                }
            });
        } else {
            // 如果不是最后一张卡片，恢复原状
            nextButtons.forEach(button => {
                button.classList.toggle('disabled', isNextDisabled);
                
                // 如果有nextChapter类，移除它，并恢复原始内容及样式
                if (button.classList.contains('next-chapter')) {
                    button.classList.remove('next-chapter');
                    
                    // 恢复原始文本/图标
                    if (button.dataset.originalContent) {
                        button.innerHTML = button.dataset.originalContent;
                        delete button.dataset.originalContent;
                    }
                    
                    // 清除添加的样式
                    button.style.backgroundColor = '';
                    button.style.color = '';
                    button.style.fontWeight = '';
                    button.style.padding = '';
                    
                    // 清除提示
                    button.title = "下一个单词";
                    
                    // 移除事件并重新绑定原事件
                    const oldClone = button.cloneNode(true);
                    button.parentNode.replaceChild(oldClone, button);
                    
                    // 重新绑定原始的下一个单词事件
                    oldClone.addEventListener('click', () => {
                        if (currentWordList && currentWordIndex < currentWordList.length - 1) {
                            displayWordAtIndex(currentWordIndex + 1);
                        }
                    });
                }
            });
        }

        console.log(`[Nav Buttons] State Updated: Idx=${currentWordIndex}, Total=${currentWordList.length}, Prev=${isPrevDisabled?'Dis':'En'}, Next=${isNextDisabled?'Dis':'En'} (Applied to ${prevButtons.length} prev, ${nextButtons.length} next buttons)`);
    }

    // --- 加载并填充级别 ---
    async function populateLevels() {
        if (!optionsList || !selectedOptionSpan || !customSelectWrapper) {
            console.error('[Card Page] Level dropdown elements not found.');
            return;
        }
        optionsList.innerHTML = '<li>加载中...</li>'; 
        try {
            // 直接调用 data-loader 的 getLevels (假设它内部不强制要求登录，依赖外层检查)
            // 如果 getLevels 也需要 token (根据你之前的拒绝，假设它不需要)
            const levels = await window.WordDataLoader.getLevels(); 
            optionsList.innerHTML = ''; 
            if (levels && levels.length > 0) {
                firstLevelId = levels[0].id;
                
                // 设置要选择的级别ID（优先使用URL中的参数）
                const targetLevelId = urlCategoryParam || firstLevelId;
                console.log(`[Card Page] 目标级别ID: ${targetLevelId} (URL指定:${!!urlCategoryParam})`);
                
                let levelSelected = false;
                levels.forEach((level, index) => {
                    const li = document.createElement('li');
                    li.textContent = level.name; 
                    li.dataset.value = level.id; 
                    optionsList.appendChild(li);
                    
                    // 如果找到URL中指定的级别，选择该级别
                    if (level.id === targetLevelId) {
                        selectedOptionSpan.textContent = level.name;
                        customSelectWrapper.dataset.value = level.id;
                        li.classList.add('selected');
                        levelSelected = true;
                        console.log(`[Card Page] 根据参数选择级别: ${level.name}`);
                    } else if (index === 0 && !levelSelected) {
                        // 如果找不到指定级别且是第一个级别，则选择该级别
                        selectedOptionSpan.textContent = level.name;
                        customSelectWrapper.dataset.value = level.id;
                        li.classList.add('selected');
                    }
                });
                
                setupLevelSelection();
                
                // 加载章节（优先使用URL中指定的级别）
                const levelToLoad = levelSelected ? targetLevelId : firstLevelId;
                if (levelToLoad) {
                    await populateChapters(levelToLoad);
                }
            } else { 
                optionsList.innerHTML = '<li>无可用级别</li>';
                selectedOptionSpan.textContent = '无可用级别';
             }
        } catch (error) { 
            console.error("[Card Page] 加载级别失败:", error);
            optionsList.innerHTML = '<li>加载级别失败</li>';
            selectedOptionSpan.textContent = '加载失败';
         }
    }

    // --- 加载并填充章节 (根据 userType 处理 locked) ---
    async function populateChapters(levelId) {
        if (!chapterList || !chapterListContainer) {
            console.error('[Card Page] Chapter list elements not found.');
            return;
        }
        chapterList.innerHTML = '<li class="loading-placeholder">加载中...</li>';
        try {
            // 调用 data-loader 的 getChaptersByLevelList (这个函数需要 Token)
            const chapters = await window.WordDataLoader.getChaptersByLevelList(levelId); 
            chapterList.innerHTML = ''; 
            if (chapters && chapters.length > 0) {
                let firstActiveChapterId = null;
                let targetChapterFound = false;
                let targetChapterElement = null;
                let shouldSelectChapter = urlChapterParam || forceActiveChapter || jumpedFromNextLevel;
                
                // 按章节序号排序（如果章节名称包含数字）
                chapters.sort((a, b) => {
                    const aMatch = a.name.match(/第(\d+)章/);
                    const bMatch = b.name.match(/第(\d+)章/);
                    if (aMatch && bMatch) {
                        return parseInt(aMatch[1], 10) - parseInt(bMatch[1], 10);
                    }
                    return 0; // 如果无法提取数字，保持原顺序
                });
                
                // 首先创建所有章节元素，但不设置active状态
                chapters.forEach((chapter) => {
                    const div = document.createElement('div');
                    div.classList.add('chapter-item');
                    div.textContent = chapter.name; 
                    div.dataset.chapterId = chapter.id;

                    // --- 核心解锁逻辑 --- 
                    const isGuestLocked = (userType === 'guest' && chapter.locked === true); 
                    
                    if (isGuestLocked) {
                        div.classList.add('locked'); 
                    } else {
                        // 如果URL指定了章节ID并且是当前章节，并且我们应该选择章节，则标记为找到目标
                        if (shouldSelectChapter && urlChapterParam && chapter.id === urlChapterParam) {
                            targetChapterFound = true;
                            targetChapterElement = div;
                            firstActiveChapterId = chapter.id;
                            div.classList.add('active');
                            console.log(`[Card Page] 根据URL参数选择章节: ${chapter.id}`);
                        } 
                        // 记录第一个未锁定的章节，但不自动设为active
                        else if (firstActiveChapterId === null) {
                            firstActiveChapterId = chapter.id;
                        }
                    }
                    chapterList.appendChild(div);
                });
                
                // 如果需要选择章节但没有找到目标章节，则选择第一个未锁定的章节
                if (shouldSelectChapter && !targetChapterFound && firstActiveChapterId) {
                    const firstChapter = chapterList.querySelector(`.chapter-item[data-chapter-id="${firstActiveChapterId}"]`);
                    if (firstChapter) {
                        firstChapter.classList.add('active');
                        targetChapterElement = firstChapter;
                        console.log(`[Card Page] 未找到URL指定章节，选择第一个可用章节: ${firstActiveChapterId}`);
                    }
                }
                
                // --- 滚动到选定的章节（如果有） ---
                if (targetChapterElement && chapterListContainer) {
                    // 延迟执行，确保DOM渲染完成
                    setTimeout(() => {
                        // 获取章节列表容器的滚动位置
                        const containerRect = chapterListContainer.getBoundingClientRect();
                        const targetRect = targetChapterElement.getBoundingClientRect();
                        
                        // 计算目标元素相对于容器的位置
                        const relativeTop = targetRect.top - containerRect.top;
                        
                        // 滚动到目标位置，使目标居中
                        chapterListContainer.scrollTop = chapterListContainer.scrollTop + relativeTop - 
                            (containerRect.height / 2 - targetRect.height / 2);
                        
                        console.log(`[Card Page] 滚动到目标章节 ${firstActiveChapterId}`);
                    }, 100);
                }
                
                // --- 只有在应该选择章节且找到有效章节时才加载单词 ---
                if (shouldSelectChapter && firstActiveChapterId) {
                    console.log(`[Card Page] 加载章节 ${firstActiveChapterId} 的单词`);
                    await loadWordsForChapter(firstActiveChapterId);
                } else {
                    console.log('[Card Page] 未自动选择任何章节，等待用户选择');
                    // 显示提示，引导用户选择章节
                    const wordDisplay = wordCard?.querySelector('.word');
                    const meaningDisplay = wordCard?.querySelector('.definition');
                    if(wordDisplay) wordDisplay.textContent = '';
                    if(meaningDisplay) meaningDisplay.textContent = '请选择章节开始学习';
                }
                // ---------------------------------------------

                setupChapterSelection(); // 绑定事件到可交互的章节
            } else {
                 chapterList.innerHTML = '<li class="empty-placeholder">该级别下无章节</li>';
                  // 清空卡片内容
                  const wordDisplay = wordCard?.querySelector('.word');
                  const meaningDisplay = wordCard?.querySelector('.definition');
                  if(wordDisplay) wordDisplay.textContent = '';
                  if(meaningDisplay) meaningDisplay.textContent = '请选择级别';
             }
        } catch (error) {
            console.error(`[Card Page] 加载级别 ${levelId} 的章节失败:`, error);
            chapterList.innerHTML = '<li class="error-placeholder">章节加载失败</li>';
              // 清空卡片内容
              const wordDisplay = wordCard?.querySelector('.word');
              const meaningDisplay = wordCard?.querySelector('.definition');
              if(wordDisplay) wordDisplay.textContent = '错误';
              if(meaningDisplay) meaningDisplay.textContent = '章节加载失败';
         }
    }

    // --- 侧边栏切换逻辑 (核心功能) ---
    if (toggleBtn && sidebar) {
        console.log('[Card Page - Debug] Setting up sidebar toggle listener...'); // <-- 添加日志
        toggleBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // 阻止冒泡，特别是在小屏幕点击遮罩时

            if (isMobile) {
                // 小屏幕：切换 .open 类，控制滑入滑出
                sidebar.classList.toggle('open');
                if (sidebar.classList.contains('open')) {
                    addOverlay();
                } else {
                    removeOverlay();
                }
            } else {
                // 大屏幕：切换 .collapsed 类，控制展开收起
                sidebar.classList.toggle('collapsed');
                // 主内容的 margin-left 调整由 CSS 自动处理，无需 JS
            }
        });
        console.log('[Card Page - Debug] Sidebar toggle listener attached.'); // <-- 添加日志
    } else {
        console.error('[Card Page - Debug] Failed to setup sidebar toggle: Button or sidebar not found.', { toggleBtn, sidebar }); // <-- 添加错误日志
    }

    // --- 响应式处理 --- 
    window.addEventListener('resize', () => {
        const newIsMobile = window.innerWidth <= 768;
        if (newIsMobile !== isMobile) {
            isMobile = newIsMobile;
            // 当从大屏切换到小屏时
            if (isMobile) {
                sidebar.classList.remove('collapsed'); // 移除 collapsed 状态
                // 如果侧边栏之前是展开的，确保它是隐藏状态
                if (!sidebar.classList.contains('open')) { 
                    sidebar.style.transform = 'translateX(-100%)';
                }
                 removeOverlay(); // 移除可能存在的遮罩
            } else {
                // 当从小屏切换到大屏时
                sidebar.classList.remove('open'); // 移除 open 状态
                removeOverlay(); // 移除遮罩
                sidebar.style.transform = ''; // 清除 transform
                // 保留之前的 collapsed 状态或默认展开
            }
        }
    });

    // --- 小屏幕遮罩层逻辑 ---
    function addOverlay() {
        let overlay = document.getElementById('sidebar-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'sidebar-overlay';
            document.body.appendChild(overlay);
            overlay.addEventListener('click', closeSidebarAndOverlay);
        } 
        overlay.style.display = 'block'; 
        requestAnimationFrame(() => { overlay.classList.add('visible'); });
    }

    function removeOverlay() {
         const overlay = document.getElementById('sidebar-overlay');
         if (overlay) {
             overlay.classList.remove('visible');
             // 在过渡结束后隐藏元素，避免影响交互
             overlay.addEventListener('transitionend', () => {
                 if (!overlay.classList.contains('visible')) { // 再次检查状态
                    overlay.style.display = 'none';
                 }
             }, { once: true });
         }
    }

    function closeSidebarAndOverlay() {
        if (sidebar) sidebar.classList.remove('open');
        removeOverlay();
    }

    // --- 自定义下拉选择框逻辑 ---
    function setupLevelSelection() {
        const currentOptions = optionsList?.querySelectorAll('li:not(.loading-placeholder):not(.error-placeholder):not(.empty-placeholder)');
        console.log('[Card Page - Debug] Setting up level selection listeners...'); // <-- 添加日志
        if (!customSelectWrapper || !selectDisplay || !optionsList || !currentOptions || currentOptions.length === 0) {
            console.error('[Card Page - Debug] Cannot setup level selection: Missing elements or no options.', { customSelectWrapper, selectDisplay, optionsList, currentOptions }); // <-- 添加错误日志
            return;
        }

        // --- 清理旧监听器 (如果需要更严格的控制) ---
        // selectDisplay.replaceWith(selectDisplay.cloneNode(true)); // 简单粗暴的方式
        // document.removeEventListener('click', closeDropdownOnClickOutside); // 移除旧的全局监听
        // customSelectWrapper.removeEventListener('keydown', handleDropdownKeyDown); // 移除旧的键盘监听
        // currentOptions.forEach(option => { /* 移除旧的 option 点击监听 */ });

        // 使用事件委托可能更优，但这里先用直接绑定并确保在重新setup时覆盖

        const handleDropdownToggle = (e) => {
            e.stopPropagation(); 
            if (!isMobile && sidebar.classList.contains('collapsed')) {
                 sidebar.classList.remove('collapsed');
                 setTimeout(() => customSelectWrapper.classList.toggle('open'), 50); 
            } else {
                 customSelectWrapper.classList.toggle('open');
            }
        };

        const handleOptionClick = async (event) => {
            const option = event.currentTarget; // 获取被点击的 li
            const levelId = option.dataset.value;
            const levelName = option.textContent;

            if (!levelId || !selectedOptionSpan) return;

            selectedOptionSpan.textContent = levelName;
            customSelectWrapper.dataset.value = levelId;
            
            currentOptions.forEach(opt => opt.classList.remove('selected'));
            option.classList.add('selected');
            
            customSelectWrapper.classList.remove('open');

            console.log('选择了级别:', levelName, 'ID:', levelId);
            await populateChapters(levelId);
        };
        
        const closeDropdownOnClickOutside = (e) => {
            if (customSelectWrapper && !customSelectWrapper.contains(e.target)) {
                customSelectWrapper.classList.remove('open');
            }
        };

        const handleDropdownKeyDown = (e) => { 
            if (e.key === 'Enter' || e.key === ' ') { 
                handleDropdownToggle(e); // 复用切换逻辑
                e.preventDefault();
            } else if (e.key === 'Escape' && customSelectWrapper.classList.contains('open')) {
                customSelectWrapper.classList.remove('open');
                e.preventDefault();
            }
        };

        // 绑定新监听器
        selectDisplay.removeEventListener('click', handleDropdownToggle);
        selectDisplay.addEventListener('click', handleDropdownToggle);
        console.log('[Card Page - Debug] Select display listener attached.'); // <-- 添加日志
        currentOptions.forEach(option => {
             option.removeEventListener('click', handleOptionClick);
             option.addEventListener('click', handleOptionClick);
        });
        console.log(`[Card Page - Debug] Option listeners attached for ${currentOptions.length} options.`); // <-- 添加日志
        document.removeEventListener('click', closeDropdownOnClickOutside);
        document.addEventListener('click', closeDropdownOnClickOutside);
        customSelectWrapper.removeEventListener('keydown', handleDropdownKeyDown);
        customSelectWrapper.addEventListener('keydown', handleDropdownKeyDown);
        console.log('[Card Page - Debug] Level selection listeners setup complete.'); // <-- 添加日志
    }

    // --- 章节选择交互 ---
    function setupChapterSelection() {
         const currentChapters = chapterList?.querySelectorAll('.chapter-item:not(.locked)'); // 选择非锁定项
         console.log('[Card Page - Debug] Setting up chapter selection listeners...'); // <-- 添加日志
         if (!currentChapters || currentChapters.length === 0) {
             console.warn('[Card Page - Debug] No interactive chapter items found to attach listeners.'); // <-- 修改日志级别
             return;
         }
         
         // --- 修改点：将 handleChapterClick 声明为 async ---
         const handleChapterClick = async (event) => {
             const item = event.currentTarget;
             // 无需再次检查 locked，因为我们只给非锁定项绑定了监听器
             const currentActive = chapterList?.querySelector('.chapter-item.active');
             if (currentActive) currentActive.classList.remove('active');
             item.classList.add('active');
             const chapterId = item.dataset.chapterId;
             console.log('选择了章节:', item.textContent, 'ID:', chapterId);

             // --- 修改点：调用加载单词的函数 ---
             await loadWordsForChapter(chapterId); // <--- 添加调用
             
             // --- 新增：更新URL，但不刷新页面 ---
             try {
                 // 获取当前级别
                 const levelId = customSelectWrapper?.dataset.value;
                 if (levelId && chapterId) {
                     // 构建新的URL
                     const currentUrl = new URL(window.location.href);
                     const searchParams = new URLSearchParams(currentUrl.search);
                     
                     // 更新参数
                     searchParams.set('category', levelId);
                     searchParams.set('chapter', chapterId);
                     
                     // 替换当前URL，不刷新页面
                     const newUrl = currentUrl.pathname + '?' + searchParams.toString();
                     window.history.replaceState({}, '', newUrl);
                     console.log(`[Card Page] URL已更新: ${newUrl}`);
                 }
             } catch (err) {
                 console.error('[Card Page] 更新URL时出错:', err);
                 // 错误不影响主要功能，所以继续执行
             }

             if (isMobile && sidebar && sidebar.classList.contains('open')) {
                 closeSidebarAndOverlay();
             }
         };
         // ----------------------------------

         currentChapters.forEach(item => {
             item.removeEventListener('click', handleChapterClick); // 清理旧监听器
             item.addEventListener('click', handleChapterClick);
         });
         console.log(`[Card Page - Debug] Chapter listeners attached for ${currentChapters.length} items.`);
    }
    
    // --- 全局点击处理 (合并小屏幕关闭侧边栏) ---
    // 注意：上面的 closeDropdownOnClickOutside 已经处理了关闭下拉框
    // 这里只处理小屏幕点击空白关闭侧边栏
    document.addEventListener('click', (e) => {
        if (isMobile && sidebar && sidebar.classList.contains('open')) {
            // 确保点击目标不是侧边栏本身或切换按钮
            if (!sidebar.contains(e.target) && e.target !== toggleBtn) {
                closeSidebarAndOverlay();
            }
        }
    });

    // --- 确保卡片居中 (由 CSS 处理) ---
    // CSS中的 .word-card-wrapper 使用了 flex: 1, display: flex, justify-content: center, align-items: center
    // 这将使其在 .card-main 的剩余空间内水平垂直居中
    console.log('Card page script initializing...');

    // 初始检查屏幕状态
    if (isMobile) {
       sidebar.classList.remove('collapsed');
       sidebar.style.transform = 'translateX(-100%)'; // 确保初始隐藏
    } else {
       // 可以在这里添加判断，比如从localStorage读取上次是否是收起状态
       // sidebar.classList.add('collapsed'); 
    }

    // --- 新增：卡片样式更新函数 --- (增加日志)
    function applyCardStyle() {
        console.log(`[Apply Style Debug] Function called. Current mode: ${currentMode}`); // 新日志
        const activeModeContainerSelector = currentMode === 'full' ? '.mode-full' : '.mode-minimalist';
        const activeCardSelector = currentMode === 'full' ? '.word-card' : '.minimalist-card-content';
        const activeCardElement = document.querySelector(`${activeModeContainerSelector} ${activeCardSelector}`);
        // 使用正确的 select ID 获取当前模式的 select
        const selectId = currentMode === 'full' ? 'card-style-select-full' : 'card-style-select-minimalist'; 
        const activeStyleSelect = document.getElementById(selectId);
        
        if (!activeCardElement || !activeStyleSelect) { 
            console.error(`[Apply Style Debug] Active elements not found. Card: ${!!activeCardElement}, Select: ${!!activeStyleSelect} (using ID: ${selectId})`); // 增强日志
            return; 
        }
        const selectedStyle = activeStyleSelect.value; // 从当前模式的 select 获取值
        console.log(`[Apply Style Debug] Active Card Element:`, activeCardElement); // 新日志
        console.log(`[Apply Style Debug] Selected Style from #${selectId}: ${selectedStyle}`); // 新日志

        console.log(`[Apply Style Debug] Classes BEFORE removal: ${activeCardElement.className}`); // 新日志
        // 移除所有可能的旧样式类
        const stylesToRemove = ['default', 'elegant', 'simple', 'classic', 'modern', 'vintage', 'nature', 'dreamy', 'sunset', 'monochrome', 'ocean', 'custom'];
        activeCardElement.classList.remove(...stylesToRemove);
        console.log(`[Apply Style Debug] Classes AFTER removal: ${activeCardElement.className}`); // 新日志
        // console.log('[Card Style - Debug] Removed old style classes:', stylesToRemove.join(', '));
        // console.log('[Card Style - Debug] wordCard classes after remove:', activeCardElement.className);

        // 清除可能的内联背景图片
        activeCardElement.style.backgroundImage = '';
        // console.log('[Card Style - Debug] Cleared inline background image.');

        currentCardStyle = selectedStyle; // 更新当前样式记录

        if (selectedStyle === 'custom') {
            activeCardElement.classList.add('custom');
            console.log(`[Apply Style Debug] Adding class: custom`); // 新日志
            if (customBgDataUrl) {
                activeCardElement.style.backgroundImage = `url(${customBgDataUrl})`;
                // console.log('[Card Style - Debug] Applied custom background image.');
            } else {
                // console.log('[Card Style - Debug] Custom style selected, but no customBgDataUrl available yet.');
            }
        } else if (selectedStyle && selectedStyle !== 'default') { // 确保不是空值且不是 default (default 没有特定类)
             // 'default' 样式不需要添加特定类，因为它依赖基础 .word-card 样式
            activeCardElement.classList.add(selectedStyle);
             console.log(`[Apply Style Debug] Adding class: ${selectedStyle}`); // 新日志
             // console.log(`[Card Style - Debug] Added class: ${selectedStyle}`);
        } else {
             // 应用默认样式 (移除其他类后就是默认)
             console.log(`[Apply Style Debug] Applying default style (no specific class added).`); // 新日志
             // console.log('[Card Style - Debug] Applying default style (no specific class added).');
        }
         // console.log('[Card Style - Debug] Final wordCard classes:', activeCardElement.className);
         // console.log('[Card Style - Debug] Final wordCard background image:', activeCardElement.style.backgroundImage);
         console.log(`[Apply Style Debug] Final classes AFTER applying '${selectedStyle}': ${activeCardElement.className}`); // 新日志
    }

    // --- 新增：处理样式选择变化 ---
    function setupStyleSelector() {
        const styleSelects = document.querySelectorAll('.card-style-select'); // 获取所有模式的 select
        const customBgInputs = document.querySelectorAll('.custom-bg-input');

        styleSelects.forEach(select => {
            select.addEventListener('change', () => {
                const selectedValue = select.value;
                currentCardStyle = selectedValue; // 更新全局状态
                // 同步另一个 select 的值
                styleSelects.forEach(otherSelect => { if (otherSelect !== select) otherSelect.value = selectedValue; });

                if (selectedValue === 'custom') {
                    // 触发对应的文件输入
                    const inputId = select.id.replace('card-style-select', 'custom-bg-input'); // 正确逻辑: 替换完整前缀
                    console.log(`[Style Select Debug] Custom selected on '${select.id}'. Attempting to click input '${inputId}'`); // 添加日志
                    const inputElement = document.getElementById(inputId);
                    if (inputElement) {
                         console.log(`[Style Select Debug] Found input element:`, inputElement); // 添加日志
                         inputElement.click(); // Simulate click
                         console.log(`[Style Select Debug] Simulated click on input '${inputId}'.`); // 添加日志
                    } else {
                         console.error(`[Style Select Debug] Could not find input element with ID: '${inputId}'`); // 添加错误日志
                    }
                } else {
                    applyCardStyle(); // 应用样式到当前激活的卡片
                }
            });
        });

        customBgInputs.forEach(input => {
            input.addEventListener('change', (event) => {
                 const file = event.target.files?.[0];
                 if (file) {
                     const reader = new FileReader();
                     reader.onload = (e) => {
                         customBgDataUrl = e.target?.result;
                         currentCardStyle = 'custom'; // 确保状态是 custom
                         // 同步所有 select 为 custom
                         styleSelects.forEach(s => s.value = 'custom');
                         applyCardStyle(); // 应用背景到当前激活卡片
                     };
                     reader.onerror = (e) => {
                          console.error('[Card Style - Debug] Error reading file:', e);
                          alert('读取背景图片失败！');
                          // 重置回之前的样式或默认样式
                          styleSelects.forEach(s => s.value = currentCardStyle !== 'custom' ? currentCardStyle : 'default');
                          applyCardStyle();
                     };
                     reader.readAsDataURL(file);
                 } else {
                      console.log('[Card Style - Debug] No file selected (input change event fired, but no file).'); // <--- 添加日志
                      // 用户可能取消了文件选择，恢复下拉菜单选项
                      if (currentCardStyle === 'custom') { // 只有当前是自定义才需要恢复
                           styleSelects.forEach(s => s.value = 'default'); // 或者恢复到上一个非自定义样式
                           applyCardStyle();
                      }
                 }
                  // 清空 input 的值，允许用户再次选择相同文件
                  input.value = '';
             });
        });
        console.log('[Style Selectors] Listeners attached for both modes.');
    }

    // --- 新增：更新所有可选区域可见性的函数 --- (只处理完整模式)
    function updateAllOptionalSectionsVisibility() {
        // 只在完整模式下执行
        if (currentMode !== 'full') return;
        
        const fullModeCard = document.querySelector('.mode-full .word-card');
        if (!fullModeCard || !currentWordData) { 
            // 如果卡片或当前单词数据不存在，隐藏所有可选区域
            const sections = ['phrase', 'morphology', 'note', 'sentence'];
            sections.forEach(key => {
                const titleSelector = `.${key === 'sentence' ? 'sentence' : key}-title`;
                const contentSelector = `.${key === 'sentence' ? 'sentence' : key}`;
                const titleElem = fullModeCard?.querySelector(titleSelector);
                const contentElem = fullModeCard?.querySelector(contentSelector);
                if(titleElem) titleElem.style.display = 'none';
                if(contentElem) contentElem.style.display = 'none';
            });
            return;
         } 

        const updateSectionVisibility = (sectionKey, dataField) => {
            // 使用完整模式的开关选择器
            const toggleButton = document.querySelector(`#content-toggles-full .toggle-chip[data-controls="${sectionKey}"]`);
            const titleSelector = `.${sectionKey === 'sentence' ? 'sentence' : sectionKey}-title`;
            const contentSelector = `.${sectionKey === 'sentence' ? 'sentence' : sectionKey}`;
            const titleElement = fullModeCard.querySelector(titleSelector);
            const contentElement = fullModeCard.querySelector(contentSelector);
            if (!toggleButton || !titleElement || !contentElement) { return; }
            const hasData = currentWordData && !!currentWordData[dataField];
            const isActive = toggleButton.classList.contains('active');
            const shouldShow = hasData && isActive;
            titleElement.style.display = shouldShow ? 'block' : 'none';
            contentElement.style.display = shouldShow ? 'block' : 'none';
        };
        updateSectionVisibility('phrase', 'phrase');
        updateSectionVisibility('morphology', 'morphology');
        updateSectionVisibility('note', 'note');
        updateSectionVisibility('sentence', 'example'); 
        console.log('[Visibility Update] Updated sections for full mode.');
    }

    // --- 建议：创建一个辅助函数来处理文本格式化 ---
    function formatTextForDisplay(text) {
        if (!text) return ''; // 处理 null 或 undefined
        // 1. 将 \n 替换为 <br>
        let formattedText = text.replace(/\n/g, '<br>');
        // 2. 将 <br> 或 <br/> (不区分大小写) 统一替换为 <br>
        formattedText = formattedText.replace(/<br\s*\/?>/gi, '<br>');
        return formattedText;
    }

    // --- 修改 loadWordsForChapter 函数 ---
    async function loadWordsForChapter(chapterId) {
        // --- 确保核心元素已获取 ---
        if (!wordCard) { console.error('[Load Words] Word card not found.'); return; }
        const wordDisplay = wordCard.querySelector('.word');
        const phoneticDisplay = wordCard.querySelector('.phonetic');
        const definitionDisplay = wordCard.querySelector('.definition');
        // --- 新增：获取其他显示元素 ---
        const phraseDisplay = wordCard.querySelector('.phrase');
        const morphologyDisplay = wordCard.querySelector('.morphology');
        const noteDisplay = wordCard.querySelector('.note');
        const sentenceDisplay = wordCard.querySelector('.sentence');
        // --------------------------
        if (!wordDisplay || !phoneticDisplay || !definitionDisplay) {
            console.error('[Load Words] Core display elements not found.'); return;
        }
        
        currentWordList = []; 
        currentWordIndex = 0; 
        currentWordData = null; 
        
        wordDisplay.textContent = '加载中...';
        phoneticDisplay.textContent = '';
        definitionDisplay.textContent = '';
        // 隐藏可选区域 (不需要在这里隐藏，displayWordAtIndex 会处理)
        // updateAllOptionalSectionsVisibility(); 
        updateNavButtonStates(); // 在加载前禁用

        console.log(`[Card Page] Loading words for chapter: ${chapterId}`);

        try {
            const words = await window.WordDataLoader.getWordsByChapter(chapterId);
            console.log(`[Load Words - Check 1] Raw words received. Is Array: ${Array.isArray(words)}, Length: ${words?.length}`);

            if (Array.isArray(words)) {
                currentWordList = words; // 存储列表
                console.log(`[Load Words - Check 2] currentWordList assigned. Length: ${currentWordList.length}`);

                // --- 生成导航点 --- 
                // const dotsContainer = document.querySelector('.nav-dots');
                // if (dotsContainer) { /* ... 生成点 ... */ }
                // -----------------

                if (currentWordList.length > 0) {
                     console.log('[Load Words - Check 3] Calling displayWordAtIndex(0)...');
                     displayWordAtIndex(0); // 显示第一个单词 (这个函数会更新导航状态)
                } else {
                    // 处理章节没有单词的情况 
                    currentWordData = null;
                    wordDisplay.textContent = '无单词';
                    definitionDisplay.textContent = '该章节无单词数据';
                    phoneticDisplay.textContent = '';
                    updateAllOptionalSectionsVisibility(); // 清空时确保隐藏可选
                    // updateNavigationDots(); // 更新点状态 (应该为空)
                    updateNavButtonStates(); // 更新按钮状态 (应该禁用)
                }
            } else {
                console.error('[Load Words - Check 1 Failed] Received data is not an array:', words);
                currentWordList = []; 
                wordDisplay.textContent = '错误';
                definitionDisplay.textContent = '加载数据格式错误';
                phoneticDisplay.textContent = '';
                updateAllOptionalSectionsVisibility(); // 清空时确保隐藏可选
                // updateNavigationDots(); // 更新点状态
                updateNavButtonStates(); // 更新按钮状态
            }
        } catch (error) { 
            console.error(`[Card Page] Error during loadWordsForChapter for ${chapterId}:`, error); 
            currentWordList = []; 
            wordDisplay.textContent = '错误';
            definitionDisplay.textContent = '加载失败';
            phoneticDisplay.textContent = '';
            updateAllOptionalSectionsVisibility(); // 清空时确保隐藏可选
            // updateNavigationDots(); // 更新点状态
            updateNavButtonStates(); // 更新按钮状态
        }
        // --- 移除函数末尾的导航更新调用，因为已在 try/catch/else 中处理 ---
        // updateNavigationDots();
        // updateNavButtonStates();
    }

    // --- 修改 displayWordAtIndex (模式感知) ---
    function displayWordAtIndex(index) {
        // 使用直接变量 currentWordList
        console.log(`[Display Word] Mode: ${currentMode}. Trying index ${index}. List length: ${currentWordList?.length}.`); 
        if (!currentWordList || index < 0 || index >= currentWordList.length) { /*...*/ return; }
        
        // 根据模式选择正确的容器和元素
        const activeModeContainerSelector = currentMode === 'full' ? '.mode-full' : '.mode-minimalist';
        const activeCardSelector = currentMode === 'full' ? '.word-card' : '.minimalist-card-content';
        const activeCardElement = document.querySelector(`${activeModeContainerSelector} ${activeCardSelector}`);

        if (!activeCardElement) { 
             console.error(`[Display Word] Active card element not found for mode: ${currentMode}`);
             return; 
        }
        
        // 使用激活容器内的选择器
        const wordDisplay = activeCardElement.querySelector(currentMode === 'full' ? '.word' : '.word-minimalist');
        const phoneticDisplay = activeCardElement.querySelector(currentMode === 'full' ? '.phonetic' : '.phonetic-minimalist');
        const definitionDisplay = activeCardElement.querySelector(currentMode === 'full' ? '.definition' : '.definition-minimalist');
        
        if (!wordDisplay || !phoneticDisplay || !definitionDisplay) { 
            console.error(`[Display Word] Core display elements not found in mode: ${currentMode}`);
            return; 
        }
        
        currentWordIndex = index; 
        const wordToShow = currentWordList[index]; 
        currentWordData = wordToShow; 

        // --- 填充内容 --- 
        wordDisplay.textContent = wordToShow.word || 'N/A'; 
        let phoneticText = wordToShow.phonetic || '';
        if (phoneticText.startsWith('/') && phoneticText.endsWith('/')) { phoneticText = phoneticText.slice(1, -1); }
        phoneticDisplay.textContent = phoneticText; 
        
        // 填充定义 (极简模式) 或 完整模式下的所有字段
        if (currentMode === 'minimalist') {
             if (definitionDisplay) definitionDisplay.innerHTML = formatTextForDisplay(wordToShow.meaning); 
        } else {
            // 完整模式填充所有字段
            const phraseDisplay = activeCardElement.querySelector('.phrase');
            const morphologyDisplay = activeCardElement.querySelector('.morphology');
            const noteDisplay = activeCardElement.querySelector('.note');
            const sentenceDisplay = activeCardElement.querySelector('.sentence');

            if (definitionDisplay) definitionDisplay.innerHTML = formatTextForDisplay(wordToShow.meaning);
            if (phraseDisplay) phraseDisplay.innerHTML = formatTextForDisplay(wordToShow.phrase);
            if (morphologyDisplay) morphologyDisplay.innerHTML = formatTextForDisplay(wordToShow.morphology);
            if (noteDisplay) noteDisplay.innerHTML = formatTextForDisplay(wordToShow.note);
            if (sentenceDisplay) { 
                let exampleHTML = formatTextForDisplay(wordToShow.example);
                const wordToHighlight = wordToShow.word?.trim(); // 获取并去除首尾空格
                const wordsToHighlight = new Set(); // 使用 Set 存储需要高亮的词

                if (wordToHighlight) {
                    wordsToHighlight.add(wordToHighlight);
                }

                // --- 新增：解析并添加词形变化 --- 
                const morphologyString = wordToShow.morphology?.trim();
                if (morphologyString) {
                    // 假设词形用逗号、分号或换行符分隔，并去除括号和标签
                    const variations = morphologyString
                        .replace(/\([^)]*\)|<[^>]*>/g, '') // 移除括号内容和HTML标签
                        .split(/[\s,;，；\n]+/); // 按空格、逗号、分号、换行符分割
                    variations.forEach(variation => {
                        const cleanedVariation = variation.trim();
                        if (cleanedVariation && cleanedVariation.length > 1) { // 避免空字符串和单个字母
                            wordsToHighlight.add(cleanedVariation);
                        }
                    });
                    console.log(`[Highlight Debug] Variations to highlight:`, Array.from(wordsToHighlight));
                }
                // ---------------------------------
                
                // --- 修改高亮逻辑以匹配多个词 ---
                if (wordsToHighlight.size > 0 && exampleHTML) { 
                    try {
                        // 将所有需要高亮的词转义并用 | 连接成 OR 条件
                        const escapedWords = Array.from(wordsToHighlight).map(word => 
                            word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
                        );
                        const pattern = `\\b(${escapedWords.join('|')})\\b`; // 构建模式
                        const highlightRegex = new RegExp(pattern, 'gi'); // 创建正则表达式
                        
                        exampleHTML = exampleHTML.replace(highlightRegex, '<span class=\"highlight\">$1</span>');
                        console.log(`[Highlight Debug] Applied regex for multiple words. Pattern: ${pattern}`);
                    } catch (e) {
                        console.error(`[Highlight Debug] Error creating or applying regex for multiple words:`, e);
                    }
                } else {
                    console.log(`[Highlight Debug] Skipping highlight: wordsToHighlight empty or no example.`);
                }
                // --- 结束高亮逻辑 ---

                sentenceDisplay.innerHTML = exampleHTML; // 设置处理后的 HTML
            } 
        }
        
        // 更新可选区域可见性 (仅完整模式需要)
        if (currentMode === 'full') {
            updateAllOptionalSectionsVisibility();
        }
        // updateNavigationDots();
        updateNavButtonStates();
        console.log(`[Display Word] Updated UI for index ${currentWordIndex} in ${currentMode} mode.`); 
    }

    // --- 新增：设置开关按钮交互的函数 --- (只处理完整模式)
    function setupContentToggles() {
        // 只选择完整模式的开关容器
        const toggleContainer = document.getElementById('content-toggles-full'); 

        if (!toggleContainer) {
             console.warn('[Card Page] Full mode content toggle container (#content-toggles-full) not found.');
             return;
        }
        
        // 使用事件委托优化性能
        toggleContainer.addEventListener('click', (event) => {
            const button = event.target.closest('.toggle-chip'); // 寻找被点击的按钮
            if (!button) return; // 如果点击的不是按钮或其子元素，则忽略

            button.classList.toggle('active'); // 切换激活状态

            // 更新图标 (可选，CSS :not(.active) 也能处理)
            const icon = button.querySelector('.toggle-icon');
            if (icon) {
                icon.textContent = button.classList.contains('active') ? '✓' : ''; // 显示勾或空 (配合CSS空框)
            }

            // 更新所有可选区域的可见性 (只会影响完整模式，因为 updateAllOptionalSectionsVisibility 已修改)
            updateAllOptionalSectionsVisibility();
        });

        console.log('[Card Page] Content toggle listeners setup for full mode only.');
    }

    // --- 新增：初始化颜色选择器 --- (添加卡片元素引用和逻辑修改 + 增强日志)
    function setupColorPickers() {
        console.log('[Color Picker] Initializing...'); // <--- 新增日志
        const darkPickers = document.querySelectorAll('.text-dark-picker');
        const lightPickers = document.querySelectorAll('.text-light-picker');
        // --- 修改：使用新变量名，并直接用 picker 默认值初始化 --- 
        let currentCardContentDarkColor = '#2c3e50'; 
        let currentCardContentLightColor = '#7f8c8d'; 
        // ------------------------------------------------------
        
        const fullModeCard = document.querySelector('.mode-full .word-card');
        const minimalistCard = document.querySelector('.mode-minimalist .minimalist-card-content');
        console.log('[Color Picker] Card elements found:', { fullMode: !!fullModeCard, minimalist: !!minimalistCard }); // <--- 新增日志

        // --- 修改：简化初始化，直接从 picker 获取默认值 --- 
        try { 
            if (darkPickers.length > 0) {
                currentCardContentDarkColor = darkPickers[0].value; 
            }
            if (lightPickers.length > 0) {
                currentCardContentLightColor = lightPickers[0].value;
            }
            console.log(`[Color Picker Init] Initial values: Dark=${currentCardContentDarkColor}, Light=${currentCardContentLightColor}`);
            
            // 应用初始颜色到卡片
            if (fullModeCard) {
                fullModeCard.style.setProperty('--card-content-dark', currentCardContentDarkColor);
                fullModeCard.style.setProperty('--card-content-light', currentCardContentLightColor);
            }
            if (minimalistCard) {
                minimalistCard.style.setProperty('--card-content-dark', currentCardContentDarkColor);
                minimalistCard.style.setProperty('--card-content-light', currentCardContentLightColor);
            }

        } catch (e) { 
            console.error('Error initializing color pickers:', e);
            // Fallback in case reading value fails (though unlikely for input type color)
            darkPickers.forEach(p => p.value = currentCardContentDarkColor);
            lightPickers.forEach(p => p.value = currentCardContentLightColor);
        }
        // ------------------------------------------------------

        darkPickers.forEach(picker => {
            picker.addEventListener('input', (event) => {
                currentCardContentDarkColor = event.target.value; // 更新本地变量
                console.log(`[Color Picker Event] Dark picker changed. New value: ${currentCardContentDarkColor}`); 
                // --- 修改：更新 --card-content-dark 变量 --- 
                if (fullModeCard) {
                    fullModeCard.style.setProperty('--card-content-dark', currentCardContentDarkColor);
                    console.log('[Color Picker Event] Set --card-content-dark on fullModeCard'); 
                }
                if (minimalistCard) {
                    minimalistCard.style.setProperty('--card-content-dark', currentCardContentDarkColor);
                    console.log('[Color Picker Event] Set --card-content-dark on minimalistCard'); 
                }
                // -----------------------------------------
                darkPickers.forEach(p => { if (p !== picker) p.value = currentCardContentDarkColor; }); // 同步其他 picker
            });
        });
        lightPickers.forEach(picker => {
            picker.addEventListener('input', (event) => {
                 currentCardContentLightColor = event.target.value; // 更新本地变量
                 console.log(`[Color Picker Event] Light picker changed. New value: ${currentCardContentLightColor}`); 
                 // --- 修改：更新 --card-content-light 变量 --- 
                 if (fullModeCard) {
                     fullModeCard.style.setProperty('--card-content-light', currentCardContentLightColor);
                     console.log('[Color Picker Event] Set --card-content-light on fullModeCard'); 
                 }
                 if (minimalistCard) {
                     minimalistCard.style.setProperty('--card-content-light', currentCardContentLightColor);
                     console.log('[Color Picker Event] Set --card-content-light on minimalistCard'); 
                 }
                 // -----------------------------------------
                 lightPickers.forEach(p => { if (p !== picker) p.value = currentCardContentLightColor; }); // 同步其他 picker
            });
        });
        console.log('[Color Pickers] Listeners attached for card-specific content colors.');
    }

    // --- 重写：设置磨砂控制 ---
    function setupFrostControl() {
        const frostControlWrappers = document.querySelectorAll('.frost-control-wrapper');
        const rootStyle = document.documentElement.style;
        const defaultBlur = 8;
        let isFrostActive = false; // 共享状态
        let currentBlur = 0;      // 共享状态

        frostControlWrappers.forEach(wrapper => {
            const toggleButton = wrapper.querySelector('.frosted-toggle');
            const sliderPopup = wrapper.querySelector('.frost-slider-popup');
            const blurSlider = wrapper.querySelector('.frost-blur-slider');
            const blurValueDisplay = wrapper.querySelector('.blur-value-display');
            const targetSelector = toggleButton?.dataset.target;
            const targetElement = targetSelector ? document.querySelector(targetSelector) : null;

            if (!toggleButton || !sliderPopup || !blurSlider || !blurValueDisplay || !targetElement) return;

            // --- 应用函数 (基于共享状态) ---
            const applyFrost = () => {
                 console.log(`[Frost Apply Debug] Called. Mode: ${currentMode}, Target Selector: ${targetSelector}, Target Element Found: ${!!targetElement}`); // 新日志
                 console.log(`[Frost Apply Debug] State: Active=${isFrostActive}, Blur=${currentBlur}`); // 新日志
                 // 更新 CSS 变量
                 rootStyle.setProperty('--card-frost-blur', `${isFrostActive ? currentBlur : 0}px`);
                 console.log(`[Frost Apply Debug] Set CSS var --card-frost-blur to: ${isFrostActive ? currentBlur : 0}px`); // 新日志
                 
                 // --- 简化目标应用逻辑：直接使用 `targetElement` --- 
                 if (targetElement) {
                    targetElement.classList.toggle('frosted', isFrostActive);
                    console.log(`[Frost Apply Debug] Toggled 'frosted' class (${isFrostActive}) on target:`, targetElement); // 新日志
                 } else {
                    console.error(`[Frost Apply Debug] Target element not found based on selector: ${targetSelector}`);
                 }
                 
                 // 更新所有控件的视觉状态
                 document.querySelectorAll('.frosted-toggle').forEach(btn => {
                     btn.classList.toggle('active', isFrostActive);
                     const icon = btn.querySelector('.toggle-icon');
                     if(icon) icon.textContent = isFrostActive ? '✓' : '';
                 });
                 document.querySelectorAll('.frost-blur-slider').forEach(s => s.value = currentBlur);
                 document.querySelectorAll('.blur-value-display').forEach(d => d.textContent = `${currentBlur}px`);
                 document.querySelectorAll('.frost-slider-popup').forEach(p => p.classList.remove('visible')); // 默认关闭所有弹出
            };

            // --- 初始化控件视觉状态 ---
            toggleButton.classList.toggle('active', isFrostActive);
            const icon = toggleButton.querySelector('.toggle-icon');
            if(icon) icon.textContent = isFrostActive ? '✓' : '';
            blurSlider.value = currentBlur;
            blurValueDisplay.textContent = `${currentBlur}px`;
            sliderPopup.classList.remove('visible');

            // --- 事件监听 --- 
            toggleButton.addEventListener('click', (event) => {
                event.stopPropagation(); // 保留

                if (isFrostActive) { // --- 如果效果已开启 --- 
                    // 只切换弹出层可见性
                    sliderPopup.classList.toggle('visible');
                    console.log(`[Frost Toggle Click] Effect was active. Toggled popup visibility to: ${sliderPopup.classList.contains('visible')}`);
                    // 不改变 isFrostActive，不调用 applyFrost()
                } else { // --- 如果效果已关闭 --- 
                    // 开启效果
                    isFrostActive = true;
                    console.log(`[Frost Toggle Click] Effect was inactive. Setting isFrostActive to true.`);
                    if (currentBlur === 0) {
                        currentBlur = defaultBlur; // 确保有模糊值
                        console.log(`[Frost Toggle Click] Setting blur to default: ${currentBlur}`);
                    }
                    // 应用效果 (但不显示弹出层)
                    applyFrost(); 
                    sliderPopup.classList.remove('visible'); // 确保弹出层是隐藏的
                }

                /* // 移除上一个版本的逻辑
                // 1. 反转激活状态
                isFrostActive = !isFrostActive;
                console.log(`[Frost Toggle Click] New isFrostActive state: ${isFrostActive}`);

                // 2. 根据新状态处理模糊值和弹出层
                if (isFrostActive) { // 如果新状态是开启
                    if (currentBlur === 0) {
                         currentBlur = defaultBlur; // 确保有模糊值
                         console.log(`[Frost Toggle Click] Frost activated with 0 blur, setting to default: ${currentBlur}`);
                    }
                    sliderPopup.classList.add('visible'); // 显示弹出层
                    console.log(`[Frost Toggle Click] Popup should be visible.`);
                } else { // 如果新状态是关闭
                    sliderPopup.classList.remove('visible'); // 隐藏弹出层
                    console.log(`[Frost Toggle Click] Popup should be hidden.`);
                }

                // 3. 应用新的状态 (会更新 CSS 变量和卡片类名)
                applyFrost(); 
                */
            });
            blurSlider.addEventListener('input', () => {
                 if (isFrostActive) { // 只有激活时滑块才有效
                     currentBlur = parseInt(blurSlider.value) || 0; // 更新共享模糊值
                     applyFrost(); // 实时应用
                 }
            });
            // 移除过于笼统的事件阻止
            /* sliderPopup.addEventListener('click', (event) => { 
                console.log("[Frost Popup Click Debug] Click inside popup detected, stopping propagation."); // 新日志
                event.stopPropagation(); 
            }); */
        });

        // 全局点击关闭所有弹出层 (只检查是否点击在 popup 外部)
        document.addEventListener('click', (event) => {
            document.querySelectorAll('.frost-slider-popup.visible').forEach(popup => {
                // 只检查点击是否在弹出层内部
                if (!popup.contains(event.target)) {
                    // 如果点击发生在外部，则关闭该弹出层
                    console.log("[Global Click Debug] Click strictly outside popup detected, closing popup:", popup);
                    popup.classList.remove('visible');
                }
            });
        });

        // 新增：全局键盘监听关闭弹出层
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                const visiblePopups = document.querySelectorAll('.frost-slider-popup.visible');
                if (visiblePopups.length > 0) {
                     console.log("[Global Keydown Debug] Enter key pressed, closing visible popups.");
                     visiblePopups.forEach(popup => {
                         popup.classList.remove('visible');
                     });
                     // 可选：阻止回车键的默认行为（例如表单提交）
                     // event.preventDefault(); 
                }
            }
        });
        
        // 初始化应用一次状态 (确保 CSS 变量和类正确)
        rootStyle.setProperty('--card-frost-blur', '0px'); 
        document.querySelectorAll('.word-card, .minimalist-card-content').forEach(el => el.classList.remove('frosted'));

        console.log('[Frost Controls] Listeners attached for both modes.');
    }

    // --- 新增：设置模式切换 --- 
    function setupModeSwitcher() {
        const modeButtons = document.querySelectorAll('.mode-btn');
        modeButtons.forEach(button => {
            button.addEventListener('click', () => {
                const selectedMode = button.dataset.mode;
                if (selectedMode === currentMode) return; // 点击当前模式无效

                currentMode = selectedMode;
                console.log(`[Mode Switch] Switched to: ${currentMode}`);

                // 更新按钮激活状态
                modeButtons.forEach(btn => {
                    btn.classList.toggle('active', btn.dataset.mode === currentMode);
                });

                // 切换 body 类控制显隐
                document.body.classList.toggle('show-minimalist', currentMode === 'minimalist');

                // 重新渲染当前单词到新模式
                if (currentWordList && currentWordList.length > 0) {
                    displayWordAtIndex(currentWordIndex); 
                }
                
                // 可能需要重新应用样式/效果到新模式的卡片
                applyCardStyle(); 
                // applyFrost(); // Frost 状态会在 displayWordAtIndex 或其他交互中更新
            });
        });
         console.log('[Mode Switcher] Listeners attached.');
    }

    // --- 修改 setupNavigationButtons (使用 querySelectorAll) ---
    function setupNavigationButtons() {
        // 使用 querySelectorAll 获取所有匹配的按钮
        const prevButtons = document.querySelectorAll('.nav-arrow.prev');
        const nextButtons = document.querySelectorAll('.nav-arrow.next');

        if (prevButtons.length === 0 && nextButtons.length === 0) {
            console.warn("[Nav Buttons] No navigation buttons found to attach listeners.");
            return;
        }
        console.log(`[Nav Buttons] Setup: Found ${prevButtons.length} prev buttons and ${nextButtons.length} next buttons.`);

        // 为所有"上一个"按钮添加监听器
        prevButtons.forEach(button => {
            button.addEventListener('click', () => {
                // 逻辑不变，依赖全局状态
                console.log(`[Nav Buttons] Prev Click Check: Index=${currentWordIndex}, ListValid=${!!currentWordList}, ListLength=${currentWordList?.length}`); 
                if (currentWordList && currentWordIndex > 0) { 
                    console.log('[Nav Buttons] Prev condition PASSED. Calling displayWordAtIndex...'); 
                    displayWordAtIndex(currentWordIndex - 1); 
                } else {
                    console.log('[Nav Buttons] Prev condition FAILED.'); 
                }
            });
        });

        // 为所有"下一个"按钮添加监听器
        nextButtons.forEach(button => {
             button.addEventListener('click', () => {
                 // 逻辑不变，依赖全局状态
                 console.log(`[Nav Buttons] Next Click Check: Index=${currentWordIndex}, ListValid=${!!currentWordList}, ListLength=${currentWordList?.length}`); 
                 if (currentWordList && currentWordIndex < currentWordList.length - 1) { 
                     console.log('[Nav Buttons] Next condition PASSED. Calling displayWordAtIndex...'); 
                     displayWordAtIndex(currentWordIndex + 1); 
                 } else {
                      console.log('[Nav Buttons] Next condition FAILED.'); 
                 }
             });
        });
        console.log('[Nav Buttons] Setup: Listeners attached to all found buttons.');
    }

    // --- 新增：单词朗读函数 ---
    function speakWord(wordText) {
        if (!wordText) {
            console.warn('[Speech] No word text provided to speak.');
            return;
        }

        if ('speechSynthesis' in window) {
            // 停止任何可能正在进行的朗读
            window.speechSynthesis.cancel();

            const utterance = new SpeechSynthesisUtterance(wordText);
            
            // 尝试设置语言为英语 (美式优先)
            utterance.lang = 'en-US';
            
            // 可选：尝试查找并设置特定的英语语音
            const voices = window.speechSynthesis.getVoices();
            const englishVoice = voices.find(voice => voice.lang === 'en-US' || voice.lang.startsWith('en-'));
            if (englishVoice) {
                utterance.voice = englishVoice;
                console.log(`[Speech] Using voice: ${englishVoice.name} (${englishVoice.lang})`);
            } else {
                console.warn('[Speech] Could not find a specific English voice, using default.');
            }

            utterance.onerror = (event) => {
                console.error('[Speech] Speech synthesis error:', event.error);
            };

            window.speechSynthesis.speak(utterance);
            console.log(`[Speech] Attempting to speak: "${wordText}"`);
        } else {
            console.error('[Speech] Speech synthesis not supported by this browser.');
            // 可以在这里给用户一个提示，例如 alert()
            alert('抱歉，您的浏览器不支持语音朗读功能。');
        }
    }
    
    // 新增：在语音列表加载后再次尝试设置语音 (处理异步加载)
    if ('speechSynthesis' in window && window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = () => {
            console.log('[Speech] Voices changed/loaded.');
            // 这里可以保留，以便在语音列表变化时更新可用语音信息
            // 但 speakWord 函数内部每次也会获取最新列表
        };
    }

    // --- 新增：设置喇叭按钮交互 ---
    function setupAudioButtons() {
        const audioButtons = document.querySelectorAll('.audio-btn');
        console.log(`[Audio Buttons] Setup: Found ${audioButtons.length} audio buttons.`);
        
        audioButtons.forEach(button => {
            button.addEventListener('click', (event) => {
                event.stopPropagation(); // 防止可能的父级事件冲突
                
                if (currentWordData && currentWordData.word) {
                    speakWord(currentWordData.word);
                } else {
                    console.warn('[Audio Buttons] Clicked, but no current word data available to speak.');
                }
            });
        });
        console.log('[Audio Buttons] Setup: Listeners attached.');
    }

    // --- 新增：设置键盘快捷键 ---
    function setupKeyboardShortcuts() {
        document.addEventListener('keydown', (event) => {
            // 忽略在输入框或可编辑区域内的按键
            if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA' || event.target.isContentEditable) {
                return;
            }

            // 获取当前激活的模式容器的选择器
            const activeModeContainerSelector = currentMode === 'full' ? '.mode-full' : '.mode-minimalist';
            const inactiveMode = currentMode === 'full' ? 'minimalist' : 'full';

            switch (event.key) {
                case 'ArrowLeft':
                    console.log('[Shortcut] ArrowLeft detected.');
                    // 查找当前可见且未禁用的"上一个"按钮并模拟点击
                    const prevButton = document.querySelector(`${activeModeContainerSelector} .nav-arrow.prev:not(.disabled)`);
                    if (prevButton) {
                        console.log('[Shortcut] Clicking previous button.');
                        prevButton.click();
                    } else {
                        console.log('[Shortcut] Previous button not found or disabled.');
                    }
                    break;
                case 'ArrowRight':
                    console.log('[Shortcut] ArrowRight detected.');
                    // 查找当前可见且未禁用的"下一个"按钮并模拟点击
                    const nextButton = document.querySelector(`${activeModeContainerSelector} .nav-arrow.next:not(.disabled)`);
                    if (nextButton) {
                        console.log('[Shortcut] Clicking next button.');
                        nextButton.click();
                    } else {
                        console.log('[Shortcut] Next button not found or disabled.');
                    }
                    break;
                case ' ': // 空格键
                    console.log('[Shortcut] Space detected.');
                    event.preventDefault(); // 阻止默认的页面滚动行为
                    // 查找当前可见的"发音"按钮并模拟点击
                    const audioButton = document.querySelector(`${activeModeContainerSelector} .audio-btn`);
                    if (audioButton) {
                        console.log('[Shortcut] Clicking audio button.');
                        audioButton.click();
                    } else {
                        console.log('[Shortcut] Audio button not found.');
                    }
                    break;
                case 'm':
                case 'M':
                    console.log('[Shortcut] M/m detected.');
                    // 查找代表 *另一个* 模式的切换按钮并模拟点击
                    const modeSwitchButton = document.querySelector(`.mode-btn[data-mode="${inactiveMode}"]`);
                    if (modeSwitchButton) {
                        console.log(`[Shortcut] Clicking mode switch button for ${inactiveMode}.`);
                        modeSwitchButton.click();
                    } else {
                         console.log(`[Shortcut] Mode switch button for ${inactiveMode} not found.`);
                    }
                    break;
            }
        });
         console.log('[Shortcuts] Keyboard shortcut listener attached.');
    }

    // --- 新增：设置全屏切换 ---
    function setupFullscreenToggle() {
        // --- 新增：在手机模式下直接返回，不初始化全屏功能 ---
        if (isMobile) { // isMobile 在文件前面定义，基于 window.innerWidth <= 768
            console.log('[Fullscreen] Fullscreen toggle disabled on mobile view.');
            // 确保按钮也被隐藏 (虽然 CSS 应该已经处理了，但双重保险)
            const fullscreenButton = document.getElementById('floating-fullscreen-btn');
            if (fullscreenButton) {
                fullscreenButton.style.display = 'none';
            }
            return;
        }
        // --- 新增结束 ---

        const fullscreenButton = document.getElementById('floating-fullscreen-btn');
        if (!fullscreenButton) {
            console.warn('[Fullscreen] Floating fullscreen toggle button not found.');
            return;
        }

        function updateFullscreenButtons() {
            const isFullscreen = !!document.fullscreenElement;
            const icon = fullscreenButton.querySelector('svg');

            if (isFullscreen) {
                fullscreenButton.title = '退出全屏';
                if (icon) {
                    icon.innerHTML = `<path fill-rule="evenodd" d="M5.5 0a.5.5 0 0 1 .5.5v4A1.5 1.5 0 0 1 4.5 6h-4a.5.5 0 0 1 0-1h4a.5.5 0 0 0 .5-.5v-4a.5.5 0 0 1 .5-.5zm5 0a.5.5 0 0 1 .5.5v4a.5.5 0 0 0 .5.5h4a.5.5 0 0 1 0 1h-4A1.5 1.5 0 0 1 10 4.5v-4a.5.5 0 0 1 .5-.5zM0 10.5a.5.5 0 0 1 .5-.5h4a.5.5 0 0 0 .5.5v4a.5.5 0 0 1-.5.5h-4a.5.5 0 0 1-.5-.5v-4zm10 0a.5.5 0 0 1 .5-.5h4a1.5 1.5 0 0 1 1.5 1.5v4a.5.5 0 0 1-.5.5h-4a.5.5 0 0 1-.5-.5v-4a.5.5 0 0 0-.5-.5z"/>`;
                }
            } else {
                fullscreenButton.title = '进入全屏';
                if (icon) {
                    icon.innerHTML = `<path fill-rule="evenodd" d="M5.828 10.172a.5.5 0 0 0-.707 0l-4.096 4.096V11.5a.5.5 0 0 0-1 0v3.975a.5.5 0 0 0 .5.5H4.5a.5.5 0 0 0 0-1H1.732l4.096-4.096a.5.5 0 0 0 0-.707zm4.344 0a.5.5 0 0 1 .707 0l4.096 4.096V11.5a.5.5 0 1 1 1 0v3.975a.5.5 0 0 1-.5.5H11.5a.5.5 0 0 1 0-1h2.768l-4.096-4.096a.5.5 0 0 1 0-.707zm0-4.344a.5.5 0 0 0 .707 0l4.096-4.096V4.5a.5.5 0 1 0 1 0V.525a.5.5 0 0 0-.5-.5H11.5a.5.5 0 0 0 0 1h2.768l-4.096 4.096a.5.5 0 0 0 0 .707zm-4.344 0a.5.5 0 0 1-.707 0L1.025 1.732V4.5a.5.5 0 0 1-1 0V.525a.5.5 0 0 1 .5-.5H4.5a.5.5 0 0 1 0 1H1.732l4.096 4.096a.5.5 0 0 1 0 .707z"/>`;
                }
            }
        }

        function toggleFullscreen() {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen()
                    .then(() => console.log('[Fullscreen] Entered fullscreen mode.'))
                    .catch(err => console.error(`[Fullscreen] Error attempting to enable full-screen mode: ${err.message} (${err.name})`));
            } else {
                document.exitFullscreen()
                    .then(() => console.log('[Fullscreen] Exited fullscreen mode.'))
                    .catch(err => console.error(`[Fullscreen] Error attempting to disable full-screen mode: ${err.message} (${err.name})`));
            }
        }

        fullscreenButton.addEventListener('click', toggleFullscreen);
        document.addEventListener('fullscreenchange', updateFullscreenButtons);
        updateFullscreenButtons();
        console.log('[Fullscreen] Floating fullscreen toggle listener attached.');
    }

    // --- 新增：设置移动端菜单切换按钮 --- 
    function setupMobileMenuToggle() {
        console.log('[Mobile Menu] Attempting to setup mobile toggle...');
        const mobileToggleBtn = document.getElementById('mobile-menu-toggle');
        const sidebarEl = document.querySelector('.sidebar'); 
        // 修改这一行，不报错找不到<i>元素
        let mobileToggleIcon = null;
        
        if (mobileToggleBtn) {
            mobileToggleIcon = mobileToggleBtn.querySelector('i') || mobileToggleBtn.querySelector('.fa') || mobileToggleBtn.querySelector('svg');
        }
        
        if (!mobileToggleBtn) {
            console.error('[Mobile Menu] ERROR: Mobile toggle button #mobile-menu-toggle not found!');
            return;
        }
        if (!sidebarEl) {
            console.error('[Mobile Menu] ERROR: Sidebar element .sidebar not found!');
            return;
        }
        
        // 修改：不再显示错误，只记录日志
        if (!mobileToggleIcon) {
            console.log('[Mobile Menu] Notice: Icon element not found inside #mobile-menu-toggle. Icon switching will be disabled.');
        }
        
        console.log('[Mobile Menu] Elements found, attaching listener...');

        mobileToggleBtn.addEventListener('click', (e) => {
            // 移除调试反馈 2
            console.log('[Mobile Menu] Mobile toggle button clicked!');
            // 移除调试反馈 2 结束
            
            e.stopPropagation(); 
            
            const isOpening = !sidebarEl.classList.contains('open');
            sidebarEl.classList.toggle('open'); 
            console.log(`[Mobile Menu] Sidebar 'open' class toggled. Has class now: ${sidebarEl.classList.contains('open')}`);
            
            // 图标切换
            if (mobileToggleIcon) { 
                if (isOpening) {
                    mobileToggleIcon.classList.remove('fa-bars');
                    mobileToggleIcon.classList.add('fa-times');
                } else {
                    mobileToggleIcon.classList.remove('fa-times');
                    mobileToggleIcon.classList.add('fa-bars');
                }
            }
        });

        // 点击外部关闭逻辑 (保持不变)
        const mainContentArea = document.querySelector('.main-content'); 
        const closeMobileSidebar = () => {
            if (sidebarEl.classList.contains('open')) {
                sidebarEl.classList.remove('open');
                if (mobileToggleIcon) {
                    mobileToggleIcon.classList.remove('fa-times');
                    mobileToggleIcon.classList.add('fa-bars');
                }
                console.log('[Mobile Menu] Sidebar closed by clicking outside.');
            }
        };
        sidebarEl.addEventListener('click', (e) => { e.stopPropagation(); });
        if (mainContentArea) { mainContentArea.addEventListener('click', closeMobileSidebar); } else { console.warn('[Mobile Menu] Main content area (.main-content) not found for outside click listener.'); }
        document.body.addEventListener('click', (e) => { if (!mobileToggleBtn.contains(e.target) && sidebarEl.classList.contains('open')) { closeMobileSidebar(); } }, true); 
        // 外部关闭逻辑结束

        console.log('[Mobile Menu] Mobile menu toggle listener attached successfully.');
    }

    // --- 初始化调用 ---
    setupStyleSelector();
    setupContentToggles();
    setupColorPickers();
    setupFrostControl();
    setupNavigationButtons();
    setupModeSwitcher();
    setupAudioButtons();
    setupKeyboardShortcuts();
    setupFullscreenToggle();
    setupMobileMenuToggle(); // <-- 新增：调用移动端菜单切换初始化

    // 异步操作放在最后
    (async () => {
        await populateLevels(); 
        console.log('[Card Page] Final Initialization steps complete.');
        
        // 初始屏幕状态检查
        if (isMobile) {
           if (sidebar) { 
               sidebar.classList.remove('collapsed');
               // 移除 transform，因为手机模式下初始状态由 CSS 控制
               // sidebar.style.transform = 'translateX(-100%)'; 
           }
        } 
    })(); 

    /**
     * 下一关功能
     * 处理关卡完成后的进度更新与跳转
     */
    async function nextLevel() {
        console.log('[卡片游戏] "下一关"按钮点击');
        
        // 如果有结果模态框，先关闭它
        const resultModal = document.getElementById('result-modal');
        if (resultModal) {
            resultModal.classList.remove('active');
        }

        // --- 获取当前级别和章节信息 ---
        let levelId, chapterOrderNum, chapterId;
        
        // 首先尝试从URL参数获取 - 这通常更可靠
        const urlParams = new URLSearchParams(window.location.search);
        const categoryParam = urlParams.get('category');
        const chapterParam = urlParams.get('chapter');
        
        if (categoryParam) {
            levelId = categoryParam;
            console.log(`[卡片游戏] 从URL获取到级别ID: ${levelId}`);
        }
        
        if (chapterParam) {
            chapterId = chapterParam;
            const chapterMatch = chapterParam.match(/第(\d+)章/);
            if (chapterMatch) {
                chapterOrderNum = parseInt(chapterMatch[1], 10);
                console.log(`[卡片游戏] 从URL获取到章节序号: ${chapterOrderNum}`);
            }
        }
        
        // 如果URL中没有，尝试从自定义选择器中获取
        if (!levelId) {
            const customSelectWrapper = document.querySelector('.custom-select-wrapper');
            if (customSelectWrapper && customSelectWrapper.dataset.value) {
                levelId = customSelectWrapper.dataset.value;
                console.log(`[卡片游戏] 从选择器获取到级别ID: ${levelId}`);
            }
        }
        
        // 尝试获取当前激活的章节
        if (!chapterOrderNum || !chapterId) {
            const activeChapter = document.querySelector('.chapter-item.active');
            if (activeChapter) {
                if (activeChapter.dataset.chapterId) {
                    chapterId = activeChapter.dataset.chapterId;
                    console.log(`[卡片游戏] 从激活章节获取到章节ID: ${chapterId}`);
                }
                
                if (activeChapter.textContent) {
                    const chapterText = activeChapter.textContent;
                    const chapterMatch = chapterText.match(/第(\d+)章/);
                    if (chapterMatch) {
                        chapterOrderNum = parseInt(chapterMatch[1], 10);
                        console.log(`[卡片游戏] 从激活章节获取到章节序号: ${chapterOrderNum}`);
                    }
                }
            }
        }

        // --- 游客限制检查 ---
        let userType = localStorage.getItem('userType');
        // 如果未找到userType，尝试从userInfo中获取
        if (!userType) {
            try {
                const userInfoStr = localStorage.getItem('userInfo');
                if (userInfoStr) {
                    const userInfo = JSON.parse(userInfoStr);
                    userType = userInfo.userType;
                }
            } catch (e) {
                console.error("[卡片游戏] 解析用户信息时出错:", e);
            }
        }
        
        const guestLimit = 5; // 游客最多玩到第5关

        if (userType === 'guest' && chapterOrderNum !== undefined && chapterOrderNum !== null) {
            if (!isNaN(chapterOrderNum) && chapterOrderNum >= guestLimit) {
                console.log(`[卡片游戏] 游客达到限制 (关卡 ${chapterOrderNum})，阻止进入下一关。`);
                // 使用 SweetAlert (如果项目已集成)
                if (typeof Swal !== 'undefined') {
                    Swal.fire({
                        title: '试玩结束',
                        text: '免费试玩已结束，请登录或注册以解锁更多关卡！',
                        icon: 'info',
                        confirmButtonText: '去登录',
                        showCancelButton: true,
                        cancelButtonText: '取消'
                    }).then((result) => {
                        if (result.isConfirmed) {
                            window.location.href = 'login.html'; // 跳转到登录页
                        }
                    });
                } else {
                    // 备用 alert 提示
                    alert('免费试玩已结束，请登录或注册以解锁更多关卡！');
                }
                return; // 阻止后续代码执行
            }
        }

        // 验证必要信息是否存在
        if (!levelId || chapterOrderNum === undefined || chapterOrderNum === null) {
            console.error('[卡片游戏] 缺少 levelId 或 chapterOrderNum，无法进入下一关');
            console.log('调试信息:', { levelId, chapterOrderNum, chapterId, urlParams: Object.fromEntries(urlParams.entries()) });
            alert('无法确定当前关卡信息，请刷新页面或重新选择关卡。');
            return;
        }

        const currentNum = parseInt(chapterOrderNum, 10);
        if (isNaN(currentNum)) {
            console.error('[卡片游戏] chapterOrderNum 无效:', chapterOrderNum);
            alert('关卡序号无效，无法进入下一关。');
            return;
        }

        const nextOrderNum = currentNum + 1;
        // 构造预期的下一章节标识符 (基于 "级别名称第X章" 的模式)
        const predictedChapterId = `${levelId}第${nextOrderNum}章`;
        console.log(`[卡片游戏] 尝试构造并检查下一章节: ${predictedChapterId}`);

        // 获取当前URL的基本路径
        const currentUrl = new URL(window.location.href);
        const baseUrl = currentUrl.origin + currentUrl.pathname; // 获取不带查询参数的基本URL

        let authToken = localStorage.getItem('authToken');
        // 如果未找到authToken，尝试从headers中获取
        if (!authToken && window.WordDataLoader && typeof window.WordDataLoader._getAuthHeaders === 'function') {
            const headers = window.WordDataLoader._getAuthHeaders();
            const authHeader = headers.Authorization;
            if (authHeader && authHeader.startsWith('Bearer ')) {
                authToken = authHeader.substring(7); // 移除 'Bearer ' 前缀
            }
        }
        
        if (!authToken) {
            console.error('[卡片游戏] 未找到认证令牌');
            alert('请先登录！');
            window.location.href = 'login.html'; // 或者其他登录页面
            return;
        }

        try {
            // 显示加载提示
            if (window.WordUtils && window.WordUtils.LoadingManager) {
                window.WordUtils.LoadingManager.show('检查下一关是否存在...');
            }

            // 先更新当前关卡的完成状态
            await updateChapterProgress(levelId, currentNum);

            // 尝试获取下一关的单词，以此判断章节是否存在
            const checkUrl = `/api/chapters/${encodeURIComponent(predictedChapterId)}/allwords`;
            console.log(`[卡片游戏] 正在检查下一章节存在性: ${checkUrl}`);
            
            const response = await fetch(checkUrl, {
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            });

            // 隐藏加载提示
            if (window.WordUtils && window.WordUtils.LoadingManager) {
                window.WordUtils.LoadingManager.hide();
            }

            if (response.ok) {
                // 章节存在，构建跳转 URL (保留当前URL的基本部分)
                console.log(`[卡片游戏] 找到下一章节 ${predictedChapterId}，准备跳转...`);
                
                // 构建相对URL，保持当前路径不变
                const searchParams = new URLSearchParams();
                searchParams.set('category', levelId);
                searchParams.set('chapter', predictedChapterId);
                searchParams.set('mode', 'normal');
                
                // 保存当前滚动位置以及当前选择的级别到会话存储，以便在新页面中恢复
                sessionStorage.setItem('lastSelectedLevel', levelId);
                sessionStorage.setItem('lastSelectedChapter', predictedChapterId);
                sessionStorage.setItem('jumpedFromNextLevel', 'true');
                sessionStorage.setItem('forceActiveChapter', 'true'); // 添加标记，表示要强制激活URL中的章节
                
                const nextLevelUrl = baseUrl + '?' + searchParams.toString();
                console.log(`[卡片游戏] 跳转到URL: ${nextLevelUrl}`);
                
                // 使用location.replace而不是location.href，避免浏览器历史堆积
                window.location.replace(nextLevelUrl);
            } else if (response.status === 404) {
                // 章节不存在，说明已经是最后一关
                console.log(`[卡片游戏] 未找到章节 ${predictedChapterId}，判定为最后一关。`);
                
                if (typeof Swal !== 'undefined') {
                    Swal.fire({
                        title: '恭喜通关！',
                        text: `您已完成 "${levelId}" 级别的所有卡片关卡！`,
                        icon: 'success',
                        confirmButtonText: '返回首页',
                        allowOutsideClick: false,
                        allowEscapeKey: false
                    }).then((result) => {
                        if (result.isConfirmed) {
                            // 使用相对路径跳转
                            const homePath = window.location.pathname.includes('/') ? 
                                window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/') + 1) + 'shouye.html' : 
                                'shouye.html';
                            window.location.href = homePath;
                        }
                    });
                } else {
                    alert(`恭喜！您已完成 "${levelId}" 级别的所有卡片关卡！`);
                    // 使用相对路径跳转
                    const homePath = window.location.pathname.includes('/') ? 
                        window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/') + 1) + 'shouye.html' : 
                        'shouye.html';
                    window.location.href = homePath;
                }
            } else {
                // 其他错误
                console.error(`[卡片游戏] 检查下一关时发生错误，状态码: ${response.status}`);
                const errorData = await response.json().catch(() => ({ message: '无法解析错误信息' }));
                alert(`加载下一关失败: ${errorData.message || response.statusText}`);
            }
        } catch (error) {
            // 隐藏加载提示
            if (window.WordUtils && window.WordUtils.LoadingManager) {
                window.WordUtils.LoadingManager.hide();
            }
            console.error('[卡片游戏] 请求下一关信息时网络或处理错误:', error);
            alert(`加载下一关时出错: ${error.message}`);
        }
    }

    /**
     * 更新关卡进度
     * @param {string} levelId 关卡ID
     * @param {number} chapterOrderNum 章节序号
     * @param {number} score 得分，默认为10
     */
    async function updateChapterProgress(levelId, chapterOrderNum, score = 10) {
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            console.warn('[卡片游戏] 无法更新进度：未找到 authToken');
            return false;
        }

        try {
            console.log(`[卡片游戏] 准备更新进度: levelId=${levelId}, completedOrderNum=${chapterOrderNum}, totalScore=${score}`);
            
            // 调用API更新关卡完成状态
            const response = await fetch('/api/progress/complete-chapter', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify({
                    levelId: levelId,
                    completedOrderNum: chapterOrderNum,
                    totalScore: score
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`服务器错误: ${response.status} - ${errorText}`);
            }

            const data = await response.json();
            if (data.success) {
                console.log(`[卡片游戏] 用户进度更新成功！获得积分: ${data.pointsEarned || score}`);
                return true;
            } else {
                console.error('[卡片游戏] 更新用户进度失败:', data.message);
                return false;
            }
        } catch (error) {
            console.error('[卡片游戏] 调用进度更新接口时出错:', error);
            return false;
        }
    }

    // 绑定"下一关"按钮事件
    function bindNextLevelButton() {
        const nextLevelBtn = document.getElementById('next-level-btn');
        if (nextLevelBtn) {
            nextLevelBtn.addEventListener('click', nextLevel);
            console.log('[卡片游戏] 已绑定"下一关"按钮事件');
        }
    }

    // 在页面加载完成后绑定按钮事件
    document.addEventListener('DOMContentLoaded', function() {
        bindNextLevelButton();
    });

    // 添加更新当前章节进度的函数
    async function updateCurrentChapterProgress() {
        // 获取当前级别和章节信息
        let levelId, chapterOrderNum;
        
        try {
            // 尝试从自定义选择器中获取
            const levelSelector = document.querySelector('.custom-select-display .selected-option');
            if (levelSelector && levelSelector.textContent) {
                // 从选择器文本获取级别名称
                levelId = document.querySelector('.custom-select-wrapper')?.dataset.value;
            }
            
            // 尝试获取当前激活的章节
            const activeChapter = document.querySelector('.chapter-item.active');
            if (activeChapter && activeChapter.textContent) {
                // 从章节名称中提取序号 (e.g. "第3章" -> 3)
                const chapterText = activeChapter.textContent;
                const chapterMatch = chapterText.match(/第(\d+)章/);
                if (chapterMatch) {
                    chapterOrderNum = parseInt(chapterMatch[1], 10);
                }
            }
            
            // 如果无法从UI获取，尝试从URL参数获取
            if (!levelId || isNaN(chapterOrderNum)) {
                const urlParams = new URLSearchParams(window.location.search);
                const categoryParam = urlParams.get('category');
                const chapterParam = urlParams.get('chapter');
                
                if (categoryParam) {
                    levelId = categoryParam;
                }
                
                if (chapterParam) {
                    const chapterMatch = chapterParam.match(/第(\d+)章/);
                    if (chapterMatch) {
                        chapterOrderNum = parseInt(chapterMatch[1], 10);
                    }
                }
            }
            
            // 日志记录获取的信息
            console.log(`[Card Page] 获取到的级别ID: ${levelId}, 章节序号: ${chapterOrderNum}`);
            
            // 如果获取成功，更新进度
            if (levelId && !isNaN(chapterOrderNum)) {
                // 调用updateChapterProgress函数
                await updateChapterProgress(levelId, chapterOrderNum);
                return true;
            } else {
                console.warn('[Card Page] 无法获取当前级别或章节信息，无法更新进度');
                return false;
            }
        } catch (error) {
            console.error('[Card Page] 获取当前级别和章节信息时出错:', error);
            return false;
        }
    }

}); // DOMContentLoaded 的结束括号
