document.addEventListener('DOMContentLoaded', async () => {
    console.log('[Card Page] DOM Content Loaded. Initializing...');
    
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
        
        // if (!prevButton || !nextButton) return; // 旧的检查移除
        if (prevButtons.length === 0 && nextButtons.length === 0) {
            console.warn("[Nav Buttons] No navigation buttons found to update state.");
            return;
        } 

        const isPrevDisabled = currentWordIndex <= 0; // 使用全局 currentWordIndex
        const isNextDisabled = currentWordIndex >= currentWordList.length - 1; // 使用全局 currentWordList

        // 遍历并更新所有按钮
        prevButtons.forEach(button => button.classList.toggle('disabled', isPrevDisabled));
        nextButtons.forEach(button => button.classList.toggle('disabled', isNextDisabled));

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
                levels.forEach((level, index) => {
                    const li = document.createElement('li');
                    li.textContent = level.name; 
                    li.dataset.value = level.id; 
                    optionsList.appendChild(li);
                    if (index === 0) {
                        selectedOptionSpan.textContent = level.name;
                        customSelectWrapper.dataset.value = level.id;
                        li.classList.add('selected');
                    }
                });
                setupLevelSelection();
                if (firstLevelId) {
                    await populateChapters(firstLevelId);
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
                        // 非游客用户 或 游客但未锁定的章节
                        if (firstActiveChapterId === null) {
                            div.classList.add('active');
                            firstActiveChapterId = chapter.id;
                            console.log('[Card Page] Default active chapter:', firstActiveChapterId);
                            // --- 修改点：加载第一个激活章节的单词 ---
                            // await loadWordsForChapter(firstActiveChapterId); // <-- 添加调用
                        }
                    }
                    chapterList.appendChild(div);
                });
                
                // --- 修改点：将加载单词移到循环外，确保 DOM 更新后再加载 ---
                if (firstActiveChapterId) {
                     console.log(`[Card Page] Loading initial words for chapter ${firstActiveChapterId}`);
                     await loadWordsForChapter(firstActiveChapterId); // <--- 在这里调用
                } else if (chapters.length > 0) { // 只有在有章节但全锁定时才警告
                     console.warn('[Card Page] All chapters are locked for the current user.');
                     chapterList.innerHTML = '<li class="empty-placeholder">当前无已解锁章节</li>';
                      // 清空卡片内容或显示提示
                      const wordDisplay = wordCard?.querySelector('.word');
                      const meaningDisplay = wordCard?.querySelector('.definition');
                      if(wordDisplay) wordDisplay.textContent = '';
                      if(meaningDisplay) meaningDisplay.textContent = '请先解锁章节';
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
        // --- 移除函数末尾的导航更新调用，因为已在 try/catch/else 中处理 ---\
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

    // --- 新增：初始化颜色选择器 ---
    function setupColorPickers() {
        const darkPickers = document.querySelectorAll('.text-dark-picker');
        const lightPickers = document.querySelectorAll('.text-light-picker');
        const rootStyle = document.documentElement.style;
        let currentDarkColor = '', currentLightColor = '';

        try { // 初始化共享状态和 Pickers
            currentDarkColor = getComputedStyle(document.documentElement).getPropertyValue('--text-dark').trim();
            currentLightColor = getComputedStyle(document.documentElement).getPropertyValue('--text-light').trim();
            darkPickers.forEach(p => p.value = currentDarkColor);
            lightPickers.forEach(p => p.value = currentLightColor);
        } catch (e) { console.error('Error init color pickers', e); }

        darkPickers.forEach(picker => {
            picker.addEventListener('input', (event) => {
                currentDarkColor = event.target.value; // 更新共享状态
                rootStyle.setProperty('--text-dark', currentDarkColor);
                // 同步其他 picker
                darkPickers.forEach(p => { if (p !== picker) p.value = currentDarkColor; });
                console.log(`[Color Picker] Dark color updated to: ${currentDarkColor}`);
            });
        });
        lightPickers.forEach(picker => {
            picker.addEventListener('input', (event) => {
                 currentLightColor = event.target.value; // 更新共享状态
                 rootStyle.setProperty('--text-light', currentLightColor);
                 // 同步其他 picker
                 lightPickers.forEach(p => { if (p !== picker) p.value = currentLightColor; });
                 console.log(`[Color Picker] Light color updated to: ${currentLightColor}`);
            });
        });
        console.log('[Color Pickers] Listeners attached for both modes.');
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

    // --- 初始化调用 ---
    //setupSidebarToggle(); // 这些已在 DOMContentLoaded 内部的其他地方调用或不再需要独立调用
    //setupResizeListener();
    setupStyleSelector(); // 确保样式选择器逻辑被初始化
    //setupGlobalClickListener();
    setupContentToggles(); // <-- 新增：内容开关初始化
    setupColorPickers(); // <-- 新增：调用颜色选择器初始化
    setupFrostControl(); // <-- 调用更新后的函数
    setupNavigationButtons(); // <-- 新增：调用导航按钮初始化
    setupModeSwitcher(); // 初始化模式切换
    setupAudioButtons(); // <-- 新增：初始化喇叭按钮
    await populateLevels(); // 开始加载级别和章节
    console.log('[Card Page] Final Initialization steps complete.');

    // 初始屏幕状态检查 (保持不变)
    if (isMobile) {
       sidebar.classList.remove('collapsed');
       sidebar.style.transform = 'translateX(-100%)';
    } 

});
