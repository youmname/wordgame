/**
 * 单词学习章节选择页面
 * INS风格交互逻辑
 */

document.addEventListener('DOMContentLoaded', function() {
    'use strict';

    // 主章节数据 (初始化为空，将从API获取)
    let categories = [];
    
    // 子章节数据 - 按主章节ID分组 (初始化为空，将从API获取)
    let subchapters = {};

    // 当前选中的主章节ID
    let currentCategoryId = null;
    // 当前查看级别的进度信息 (用于 modal)
    let currentLevelProgressInfo = null; 
    
    // 分页状态 - 级别
    const categoryPagination = {
        currentPage: 1,
        itemsPerPage: 6,
        totalPages: 1,
        
        // 计算总页数
        calculateTotalPages: function(totalItems) {
            return Math.ceil(totalItems / this.itemsPerPage);
        },
        
        // 更新分页状态
        update: function(totalItems) {
            this.totalPages = this.calculateTotalPages(totalItems);
            // 确保当前页不超过总页数
            if (this.currentPage > this.totalPages) {
                this.currentPage = this.totalPages;
            }
            if (this.currentPage < 1) {
                this.currentPage = 1;
            }
        },
        
        // 获取当前页的数据
        getCurrentPageItems: function(items) {
            const startIndex = (this.currentPage - 1) * this.itemsPerPage;
            const endIndex = startIndex + this.itemsPerPage;
            return items.slice(startIndex, endIndex);
        },
        
        // 前往上一页
        prevPage: function() {
            if (this.currentPage > 1) {
                this.currentPage--;
                return true;
            }
            return false;
        },
        
        // 前往下一页
        nextPage: function() {
            if (this.currentPage < this.totalPages) {
                this.currentPage++;
                return true;
            }
            return false;
        },
        
        // 前往指定页
        goToPage: function(pageNum) {
            if (pageNum >= 1 && pageNum <= this.totalPages) {
                this.currentPage = pageNum;
                return true;
            }
            return false;
        }
    };
    
    // 分页状态 - 章节
    const subchapterPagination = {
        currentPage: 1,
        itemsPerPage: 6,
        totalPages: 1,
        
        // 计算总页数
        calculateTotalPages: function(totalItems) {
            return Math.ceil(totalItems / this.itemsPerPage);
        },
        
        // 更新分页状态
        update: function(totalItems) {
            this.totalPages = this.calculateTotalPages(totalItems);
            // 确保当前页不超过总页数
            if (this.currentPage > this.totalPages) {
                this.currentPage = this.totalPages;
            }
            if (this.currentPage < 1) {
                this.currentPage = 1;
            }
        },
        
        // 获取当前页的数据
        getCurrentPageItems: function(items) {
            const startIndex = (this.currentPage - 1) * this.itemsPerPage;
            const endIndex = startIndex + this.itemsPerPage;
            return items.slice(startIndex, endIndex);
        },
        
        // 前往上一页
        prevPage: function() {
            if (this.currentPage > 1) {
                this.currentPage--;
                return true;
            }
            return false;
        },
        
        // 前往下一页
        nextPage: function() {
            if (this.currentPage < this.totalPages) {
                this.currentPage++;
                return true;
            }
            return false;
        },
        
        // 前往指定页
        goToPage: function(pageNum) {
            if (pageNum >= 1 && pageNum <= this.totalPages) {
                this.currentPage = pageNum;
                return true;
            }
            return false;
        }
    };

    let gameMode = new URLSearchParams(window.location.search).get('action') || 'jiyiMode'; // 默认记忆模式
    console.log('当前游戏模式:', gameMode);

    // 初始化函数
    function init() {
        // 检查WordDataLoader是否已初始化
        if (typeof WordDataLoader !== 'undefined') {
            // 显示加载状态
            const grid = document.getElementById('chapterGrid');
            if (grid) {
                grid.innerHTML = '<div class="loading-message">正在加载级别数据...</div>';
            }
            
            console.log('开始加载级别数据...');
            
            // 先尝试直接加载级别数据
            loadCategoriesFromAPI();
        } else {
            console.error('WordDataLoader未加载，使用默认数据');
            // 使用默认数据作为后备
            useDefaultData();
        }
        
        setupEventListeners();
        animateDecoElements();
        
        // 加载分页样式
        loadPaginationStyles();
    }
    
    // 加载分页样式
    function loadPaginationStyles() {
        // 检查是否已加载
        if (document.getElementById('pagination-styles')) {
            return;
        }
        
        // 创建link元素
        const link = document.createElement('link');
        link.id = 'pagination-styles';
        link.rel = 'stylesheet';
        link.href = 'css/pagination.css';
        
        // 添加到head
        document.head.appendChild(link);
    }
    
    // 从API加载级别数据
    async function loadCategoriesFromAPI() {
        try {
            console.log('开始从API加载级别数据');
            
            // 使用WordDataLoader获取级别数据
            const apiCategories = await WordDataLoader.getLevels();
            
            console.log('API返回的级别数据:', apiCategories);
            
            if (apiCategories && apiCategories.length > 0) {
                console.log(`从API获取到${apiCategories.length}个级别`);
                
                // 转换API数据格式为我们需要的格式
                categories = apiCategories.map(cat => {
                    return {
                        id: cat.id,
                        title: cat.name || `级别${cat.id}`,
                        description: cat.description || `${cat.name || `级别${cat.id}`}的词汇`,
                        totalChapters: cat.chapter_count || 0,
                        completedChapters: cat.completed_chapters || 0,
                        progress: cat.progress || 0,
                        locked: cat.locked === true,
                        difficulty: cat.difficulty || 1
                    };
                });
                
                // 更新分页状态
                categoryPagination.update(categories.length);
                
                // 渲染级别
                renderCategories();
                
                // 预加载第一个级别的章节数据
                if (categories.length > 0) {
                    loadSubchaptersForCategory(categories[0].id);
                }
            } else {
                console.warn('API返回的级别数据为空，尝试创建示例级别数据');
                createSampleCategories();
                
                // 更新分页状态
                categoryPagination.update(categories.length);
                
                renderCategories();
            }
        } catch (error) {
            console.error('加载级别数据失败:', error);
            // 使用示例数据作为后备
            createSampleCategories();
            
            // 更新分页状态
            categoryPagination.update(categories.length);
            
            renderCategories();
        }
    }
    
    // 创建示例级别数据，确保有内容显示
    function createSampleCategories() {
        categories = [
            {
                id: 1,
                title: "初级英语",
                description: "适合英语初学者的基础词汇",
                totalChapters: 8,
                completedChapters: 3,
                progress: 0.38,
                locked: false,
                difficulty: 1
            },
            {
                id: 2,
                title: "四级英语",
                description: "大学英语四级必备词汇",
                totalChapters: 10,
                completedChapters: 4,
                progress: 0.4,
                locked: false,
                difficulty: 2
            },
            {
                id: 3,
                title: "六级英语",
                description: "大学英语六级必备词汇",
                totalChapters: 12,
                completedChapters: 2,
                progress: 0.17,
                locked: false,
                difficulty: 3
            },
            {
                id: 4,
                title: "雅思词汇",
                description: "雅思考试核心词汇",
                totalChapters: 15,
                completedChapters: 0,
                progress: 0,
                locked: true,
                difficulty: 4
            },
            {
                id: 5,
                title: "托福词汇",
                description: "托福考试必备词汇",
                totalChapters: 15,
                completedChapters: 0,
                progress: 0,
                locked: true,
                difficulty: 4
            },
            {
                id: 6,
                title: "专业术语",
                description: "各领域专业英语词汇",
                totalChapters: 20,
                completedChapters: 0,
                progress: 0,
                locked: true,
                difficulty: 5
            },
            {
                id: 7,
                title: "商务英语",
                description: "商务场景常用词汇",
                totalChapters: 12,
                completedChapters: 0,
                progress: 0,
                locked: true,
                difficulty: 3
            },
            {
                id: 8,
                title: "旅游英语",
                description: "旅行必备英语词汇",
                totalChapters: 10,
                completedChapters: 0,
                progress: 0,
                locked: true,
                difficulty: 2
            }
        ];
        
        // 创建示例章节数据，以便点击级别时有内容显示
        createSampleChapters();
    }
    
    // 创建示例章节数据
    function createSampleChapters() {
        subchapters = {
            // 初级英语的子章节
            1: [
                {
                    id: "1-1",
                    title: "基础单词",
                    wordCount: 32,
                    masteredCount: 24,
                    progress: 0.75,
                    locked: false,
                    difficulty: 1
                },
                {
                    id: "1-2",
                    title: "交通出行",
                    wordCount: 40,
                    masteredCount: 30,
                    progress: 0.75,
                    locked: false,
                    difficulty: 1
                },
                {
                    id: "1-3",
                    title: "饮食健康",
                    wordCount: 36,
                    masteredCount: 20,
                    progress: 0.56,
                    locked: false,
                    difficulty: 1
                },
                {
                    id: "1-4",
                    title: "工作职场",
                    wordCount: 45,
                    masteredCount: 15,
                    progress: 0.33,
                    locked: false,
                    difficulty: 2
                },
                {
                    id: "1-5",
                    title: "科技数码",
                    wordCount: 38,
                    masteredCount: 8,
                    progress: 0.21,
                    locked: false,
                    difficulty: 2
                },
                {
                    id: "1-6",
                    title: "文化艺术",
                    wordCount: 42,
                    masteredCount: 0,
                    progress: 0,
                    locked: true,
                    difficulty: 2
                },
                {
                    id: "1-7",
                    title: "环境生态",
                    wordCount: 35,
                    masteredCount: 0,
                    progress: 0,
                    locked: true,
                    difficulty: 3
                },
                {
                    id: "1-8",
                    title: "教育学术",
                    wordCount: 48,
                    masteredCount: 0,
                    progress: 0,
                    locked: true,
                    difficulty: 3
                }
            ],
            // 四级英语的子章节
            2: [
                {
                    id: "2-1",
                    title: "四级核心词汇",
                    wordCount: 50,
                    masteredCount: 45,
                    progress: 0.90,
                    locked: false,
                    difficulty: 2
                },
                {
                    id: "2-2",
                    title: "学术词汇",
                    wordCount: 45,
                    masteredCount: 38,
                    progress: 0.84,
                    locked: false,
                    difficulty: 2
                },
                {
                    id: "2-3",
                    title: "日常交流",
                    wordCount: 40,
                    masteredCount: 30,
                    progress: 0.75,
                    locked: false,
                    difficulty: 2
                },
                {
                    id: "2-4",
                    title: "社会文化",
                    wordCount: 55,
                    masteredCount: 25,
                    progress: 0.45,
                    locked: false,
                    difficulty: 3
                },
                {
                    id: "2-5",
                    title: "科技发展",
                    wordCount: 60,
                    masteredCount: 0,
                    progress: 0,
                    locked: true,
                    difficulty: 3
                }
            ],
            // 六级英语的子章节
            3: [
                {
                    id: "3-1",
                    title: "六级基础词汇",
                    wordCount: 60,
                    masteredCount: 45,
                    progress: 0.75,
                    locked: false,
                    difficulty: 3
                },
                {
                    id: "3-2",
                    title: "高频词汇",
                    wordCount: 70,
                    masteredCount: 35,
                    progress: 0.50,
                    locked: false,
                    difficulty: 3
                },
                {
                    id: "3-3",
                    title: "学术写作",
                    wordCount: 65,
                    masteredCount: 0,
                    progress: 0,
                    locked: true,
                    difficulty: 4
                }
            ]
        };
    }
    
    // 加载特定级别的章节数据
    async function loadSubchaptersForCategory(categoryId) {
        try {
            console.log(`开始从API加载级别${categoryId}的章节数据`);

            // 使用WordDataLoader获取章节数据，现在期望返回包含 last_accessed_order 的对象
            // const apiChapters = await WordDataLoader.getChaptersByLevel(categoryId); // 旧方法，只返回章节数组

            // 假设 WordDataLoader.getChaptersByLevel 现在能处理并返回完整响应
            // 或者我们直接在这里调用 fetch (如果 WordDataLoader 不方便修改)
            // 为了演示，我们假设可以直接获取带 last_accessed_order 的数据
            const authToken = localStorage.getItem('authToken'); // 需要 Token
            if (!authToken) {
                console.error('无法加载章节数据: 未找到认证令牌');
                // 可以选择显示错误消息或跳转登录
                return;
            }

            const response = await fetch(`/api/vocabulary-levels/${categoryId}/chapters`, {
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            });

            if (!response.ok) {
                throw new Error(`API 请求失败: ${response.status}`);
            }

            const responseData = await response.json();
            if (!responseData.success) {
                throw new Error(responseData.message || '获取章节数据失败');
            }

            const apiChapters = responseData.chapters; // 章节数组
            const lastUnlockedOrder = responseData.last_unlocked_order; 
            const lastAccessedOrder = responseData.last_accessed_order; 
            console.log(`API返回: last_unlocked_order = ${lastUnlockedOrder}, last_accessed_order = ${lastAccessedOrder}`);
            const progressInfo = { lastUnlockedOrder, lastAccessedOrder }; 
            currentLevelProgressInfo = progressInfo; // <-- 存储进度信息

            console.log('API返回的章节数据:', apiChapters);

            if (apiChapters && apiChapters.length > 0) {
                console.log(`从API获取到级别${categoryId}的${apiChapters.length}个章节`);

                // 转换API数据格式为我们需要的格式
                subchapters[categoryId] = apiChapters.map(chap => {
                    const category = categories.find(c => c.id == categoryId);
                    const categoryName = category ? category.title : `级别${categoryId}`;
                    return {
                        id: `${categoryId}-${chap.id}`, 
                        originalId: chap.id,
                        categoryId: categoryId,
                        categoryName: categoryName,
                        title: chap.name || `章节${chap.id}`,
                        wordCount: chap.word_count || 0,
                        masteredCount: chap.mastered_count || 0,
                        progress: chap.progress || 0,
                        locked: chap.locked === true,
                        difficulty: chap.difficulty || 1,
                        orderNum: chap.order_num // 确保 order_num 存在，以便计算页码
                    };
                });

                console.log(`loadSubchaptersForCategory: 处理后的级别 ${categoryId} 章节数据 (检查 locked 状态):`, subchapters[categoryId]);

                // --- 新增：计算并设置目标页码 ---
                if (lastAccessedOrder > 0 && subchapterPagination.itemsPerPage > 0) {
                    // 根据 last_accessed_order 找到对应的章节在列表中的索引
                    // 注意：这里的 lastAccessedOrder 是 order_num，不是数组索引
                    const targetChapterIndex = subchapters[categoryId].findIndex(chap => chap.orderNum === lastAccessedOrder);
                    if (targetChapterIndex !== -1) {
                         // 计算目标页码 (索引从0开始，页码从1开始)
                         const targetPage = Math.ceil((targetChapterIndex + 1) / subchapterPagination.itemsPerPage);
                         console.log(`计算目标页码: lastAccessedOrder=${lastAccessedOrder}, targetChapterIndex=${targetChapterIndex}, itemsPerPage=${subchapterPagination.itemsPerPage}, targetPage=${targetPage}`);
                         // 设置分页组件的当前页
                         if (targetPage >= 1) {
                            subchapterPagination.currentPage = targetPage;
                         } else {
                            subchapterPagination.currentPage = 1; // 默认为第一页
                         }
                    } else {
                        console.warn(`未能根据 lastAccessedOrder=${lastAccessedOrder} 找到对应章节索引，将显示第一页`);
                        subchapterPagination.currentPage = 1;
                    }
                } else {
                    // 如果没有有效的 lastAccessedOrder 或 itemsPerPage，重置为第一页
                    subchapterPagination.currentPage = 1;
                }
                // --- 结束新增代码 ---

                // 更新分页状态 (总页数和确保当前页有效)
                subchapterPagination.update(subchapters[categoryId].length);
                console.log(`更新分页状态: currentPage=${subchapterPagination.currentPage}, totalPages=${subchapterPagination.totalPages}`);

                // 如果当前选中的是这个级别，则渲染章节 (现在会渲染计算出的目标页)
                if (currentCategoryId === categoryId) {
                    renderSubchapters(categoryId);
                }
            } else {
                console.warn(`API返回的级别${categoryId}章节数据为空，创建示例章节数据`);
                
                // 如果该级别没有示例章节数据，创建一些
                if (!subchapters[categoryId] || subchapters[categoryId].length === 0) {
                    createSampleChaptersForCategory(categoryId);
                }
                
                // 更新分页状态
                subchapterPagination.currentPage = 1; // 重置为第一页
                subchapterPagination.update(subchapters[categoryId].length);
                
                // 如果当前选中的是这个级别，则渲染章节
                if (currentCategoryId === categoryId) {
                    renderSubchapters(categoryId);
                }
            }
        } catch (error) {
            console.error(`加载级别${categoryId}的章节数据失败:`, error);
            
            // 如果该级别没有示例章节数据，创建一些
            if (!subchapters[categoryId] || subchapters[categoryId].length === 0) {
                createSampleChaptersForCategory(categoryId);
            }
            
            // 更新分页状态
            subchapterPagination.currentPage = 1; // 重置为第一页
            subchapterPagination.update(subchapters[categoryId].length);
            
            // 如果当前选中的是这个级别，则渲染章节
            if (currentCategoryId === categoryId) {
                renderSubchapters(categoryId);
            }
        }
    }
    
    // 为指定级别创建示例章节数据
    function createSampleChaptersForCategory(categoryId) {
        // 如果已有示例数据，直接返回
        if (subchapters[categoryId] && subchapters[categoryId].length > 0) {
            return;
        }
        
        // 获取级别名称
        const category = categories.find(c => c.id == categoryId);
        const categoryName = category ? category.title : `级别${categoryId}`;
        
        // 创建5个示例章节
        subchapters[categoryId] = [];
        
        const chapterNames = [
            "基础词汇", "常用表达", "日常对话", 
            "专业术语", "学术写作", "阅读理解"
        ];
        
        for (let i = 1; i <= 5; i++) {
            // 随机选择一个章节名称，或使用默认名称
            const title = chapterNames[i % chapterNames.length] || `${categoryName}章节${i}`;
            // 随机生成单词数量(30-60)
            const wordCount = Math.floor(Math.random() * 30) + 30;
            // 随机生成已掌握单词数量(0到wordCount)
            const masteredCount = Math.floor(Math.random() * wordCount);
            // 计算进度
            const progress = wordCount > 0 ? masteredCount / wordCount : 0;
            
            subchapters[categoryId].push({
                id: `${categoryId}-${i}`,
                originalId: i.toString(),
                categoryId: categoryId,
                categoryName: categoryName,
                title: title,
                wordCount: wordCount,
                masteredCount: masteredCount,
                progress: progress,
                locked: i > 3, // 前3个解锁，后面锁定
                difficulty: Math.ceil(i / 2) // 难度逐渐增加
            });
        }
    }
    
    // 使用默认数据作为后备
    function useDefaultData() {
        // 创建示例级别数据
        createSampleCategories();
        
        // 更新分页状态
        categoryPagination.update(categories.length);
        
        // 渲染级别
        renderCategories();
    }

    // 渲染主章节卡片
    function renderCategories() {
        const grid = document.getElementById('chapterGrid');
        if (!grid) return;

        grid.innerHTML = '';
        
        console.log('渲染级别数据:', categories);

        if (categories.length === 0) {
            grid.innerHTML = '<div class="no-data-message">暂无级别数据，请稍后刷新</div>';
            return;
        }

        // 获取当前页的数据
        const currentPageCategories = categoryPagination.getCurrentPageItems(categories);
        
        currentPageCategories.forEach((category, index) => {
            // 创建章节卡片
            const card = document.createElement('div');
            card.className = 'chapter-card';
            card.dataset.id = category.id;
            card.dataset.progress = category.progress;
            card.style.setProperty('--index', index);

            // 星级难度
            const stars = '⭐'.repeat(category.difficulty);
            
            // 卡片内容
            card.innerHTML = `
                <div class="deco-leaf" style="top: ${Math.random() * 60 + 20}%; left: ${Math.random() * 60 + 20}%">🍃</div>
                <h3>${category.title}</h3>
                <p class="word-count">${category.description}</p>
                <p class="difficulty">${stars}</p>
                <div class="lock-status" data-locked="${category.locked}">${category.locked ? '🔒' : '🔓'}</div>
            `;

            // 如果章节锁定，添加锁定样式
            if (category.locked) {
                card.classList.add('locked');
            }

            // 添加到网格
            grid.appendChild(card);
        });
        
        // 添加分页控件
        renderCategoryPagination();
    }
    
    // 渲染级别分页控件
    function renderCategoryPagination() {
        // 检查是否已存在分页容器，如果不存在则创建
        let paginationContainer = document.getElementById('category-pagination');
        if (!paginationContainer) {
            paginationContainer = document.createElement('div');
            paginationContainer.id = 'category-pagination';
            paginationContainer.className = 'pagination-container';
            
            // 将分页容器添加到级别容器中
            const categoryContainer = document.getElementById('category-container');
            if (categoryContainer) {
                categoryContainer.appendChild(paginationContainer);
            }
        }
        
        // 清空分页容器
        paginationContainer.innerHTML = '';
        
        // 如果只有一页，不显示分页控件
        if (categoryPagination.totalPages <= 1) {
            paginationContainer.style.display = 'none';
            return;
        }
        
        paginationContainer.style.display = 'flex';
        
        // 创建上一页按钮
        const prevButton = document.createElement('button');
        prevButton.className = 'pagination-btn prev-btn';
        prevButton.innerHTML = '« 上一页';
        prevButton.disabled = categoryPagination.currentPage === 1;
        prevButton.addEventListener('click', function() {
            if (categoryPagination.prevPage()) {
                renderCategories();
            }
        });
        
        // 创建页码指示器
        const pageIndicator = document.createElement('div');
        pageIndicator.className = 'pagination-indicator';
        pageIndicator.textContent = `${categoryPagination.currentPage} / ${categoryPagination.totalPages}`;
        
        // 创建下一页按钮
        const nextButton = document.createElement('button');
        nextButton.className = 'pagination-btn next-btn';
        nextButton.innerHTML = '下一页 »';
        nextButton.disabled = categoryPagination.currentPage === categoryPagination.totalPages;
        nextButton.addEventListener('click', function() {
            if (categoryPagination.nextPage()) {
                renderCategories();
            }
        });
        
        // 添加到分页容器
        paginationContainer.appendChild(prevButton);
        paginationContainer.appendChild(pageIndicator);
        paginationContainer.appendChild(nextButton);
    }

    // 渲染子章节卡片
    function renderSubchapters(categoryId) {
        // --- 新增日志：确认渲染时的 currentPage --- 
        console.log(`[renderSubchapters ENTRY] Rendering for category ${categoryId}. Current page is: ${subchapterPagination.currentPage}`);
        // --- 结束新增 --- 

        const categoryData = categories.find(c => c.id == categoryId);
        if (!categoryData) return;

        // 更新子章节标题和徽章
        document.getElementById('selected-category-title').textContent = categoryData.title;
        document.getElementById('selected-category-badge').textContent = categoryData.description;
        
        // 更新进度条
        document.getElementById('category-progress-fill').style.width = `${categoryData.progress * 100}%`;
        document.getElementById('completed-chapters').textContent = categoryData.completedChapters;
        document.getElementById('total-chapters').textContent = categoryData.totalChapters;

        // 获取子章节数据
        const chapterList = subchapters[categoryId] || [];
        
        // 获取网格
        const grid = document.getElementById('subchapterGrid');
        if (!grid) return;

        grid.innerHTML = '';
        
        console.log(`渲染级别${categoryId}的章节数据:`, chapterList);

        if (chapterList.length === 0) {
            grid.innerHTML = '<div class="no-data-message">该级别暂无章节数据</div>';
            return;
        }

        // 获取当前页的数据
        const currentPageChapters = subchapterPagination.getCurrentPageItems(chapterList);
        
        currentPageChapters.forEach((chapter, index) => {
            // 创建章节卡片
            const card = document.createElement('div');
            card.className = 'chapter-card';
            card.dataset.id = chapter.id;
            card.dataset.progress = chapter.progress;
            card.style.setProperty('--index', index);

            // 星级难度
            const stars = '⭐'.repeat(chapter.difficulty);
            const chapterIcon = getChapterIcon(chapter, currentLevelProgressInfo);
            // 卡片内容
            card.innerHTML = `
                <div class="deco-leaf" style="top: ${Math.random() * 60 + 20}%; left: ${Math.random() * 60 + 20}%">🍃</div>
                <h3>${chapter.title}</h3>
                <p class="word-count">📖 ${chapter.wordCount} 个单词</p>
                <div style="display: flex; align-items: center; justify-content: space-between;">
                    <p class="difficulty" style="margin: 0;">${chapter.locked ? '加油💪' : '⭐⭐⭐'}</p>
                    <div class="lock-status" data-locked="${chapter.locked}">${chapter.locked ? '🔒' : '🥇'}</div>
                    
                    <div class="chapter-completion-icon" style="pointer-events: none; margin-left: 8px;">${chapter.locked ? '✒️' : '🎉'}</div>
                </div>
                <div class="chapter-icon">${chapterIcon}</div>
                
                
            `;

            //<div class="chapter-icon">${getChapterIcon(chapter, currentLevelProgressInfo)}</div>

            // 如果章节锁定，添加锁定样式
            if (chapter.locked) {
                card.classList.add('locked');
            }

            // 添加到网格
            grid.appendChild(card);
        });

        // 添加分页控件
        renderSubchapterPagination();
        
        // 显示子章节容器，隐藏主章节容器
        document.getElementById('category-container').style.display = 'none';
        document.getElementById('subchapter-container').style.display = 'block';
    }
    
    // 渲染章节分页控件
    function renderSubchapterPagination() {
        // 检查是否已存在分页容器，如果不存在则创建
        let paginationContainer = document.getElementById('subchapter-pagination');
        if (!paginationContainer) {
            paginationContainer = document.createElement('div');
            paginationContainer.id = 'subchapter-pagination';
            paginationContainer.className = 'pagination-container';
            
            // 将分页容器添加到章节容器中
            const subchapterContainer = document.getElementById('subchapter-container');
            if (subchapterContainer) {
                subchapterContainer.appendChild(paginationContainer);
            }
        }
        
        // 清空分页容器
        paginationContainer.innerHTML = '';
        
        // 如果只有一页，不显示分页控件
        if (subchapterPagination.totalPages <= 1) {
            paginationContainer.style.display = 'none';
            return;
        }
        
        paginationContainer.style.display = 'flex';
        
        // 创建上一页按钮
        const prevButton = document.createElement('button');
        prevButton.className = 'pagination-btn prev-btn';
        prevButton.innerHTML = '« 上一页';
        prevButton.disabled = subchapterPagination.currentPage === 1;
        prevButton.addEventListener('click', function() {
            if (subchapterPagination.prevPage()) {
                renderSubchapters(currentCategoryId);
            }
        });
        
        // 创建页码指示器
        const pageIndicator = document.createElement('div');
        pageIndicator.className = 'pagination-indicator';
        pageIndicator.textContent = `${subchapterPagination.currentPage} / ${subchapterPagination.totalPages}`;
        
        // 创建下一页按钮
        const nextButton = document.createElement('button');
        nextButton.className = 'pagination-btn next-btn';
        nextButton.innerHTML = '下一页 »';
        nextButton.disabled = subchapterPagination.currentPage === subchapterPagination.totalPages;
        nextButton.addEventListener('click', function() {
            if (subchapterPagination.nextPage()) {
                renderSubchapters(currentCategoryId);
            }
        });
        
        // 添加到分页容器
        paginationContainer.appendChild(prevButton);
        paginationContainer.appendChild(pageIndicator);
        paginationContainer.appendChild(nextButton);
    }

    // 设置事件监听器
    function setupEventListeners() {
        console.log("setupEventListeners: 尝试获取 chapterGrid:", document.getElementById('chapterGrid'));

        // 主章节卡片点击事件
        document.getElementById('chapterGrid').addEventListener('click', function(e) {
            // 找到最近的卡片元素
            const card = e.target.closest('.chapter-card');
            if (!card) return;
            
            // 检查是否锁定
            if (card.classList.contains('locked')) {
                showLockedMessage(card);
                return;
            }
            
            // 获取章节ID
            const categoryId = card.dataset.id;
            if (!categoryId) return;
            
            // 保存当前选中的主章节ID
            currentCategoryId = categoryId;
            
            // 如果该级别的章节数据还未加载，先加载
            if (!subchapters[categoryId] || subchapters[categoryId].length === 0) {
                // 显示加载提示
                document.getElementById('subchapterGrid').innerHTML = '<div class="loading-message">正在加载章节数据...</div>';
                // 显示子章节容器，隐藏主章节容器
                document.getElementById('category-container').style.display = 'none';
                document.getElementById('subchapter-container').style.display = 'block';
                // 加载章节数据
                loadSubchaptersForCategory(categoryId);
            } else {
                // 如果数据已加载，直接渲染
                console.log(`[chapterGrid Click] 级别 ${categoryId} 数据已加载，直接渲染。`); // 添加日志确认
                // 更新分页状态（总页数，不重置当前页）
                subchapterPagination.update(subchapters[categoryId].length);
                // 直接渲染子章节 (应使用 loadSubchaptersForCategory 中设置好的 currentPage)
                renderSubchapters(categoryId);
            }
            
            // 添加点击效果
            addClickEffect(card);
        });

        console.log("setupEventListeners: 尝试获取 subchapterGrid:", document.getElementById('subchapterGrid'));

        // 子章节卡片点击事件
        document.getElementById('subchapterGrid').addEventListener('click', function(e) {
            // 找到最近的卡片元素
            const card = e.target.closest('.chapter-card');
            if (!card) return;
            
            // 检查是否锁定
            if (card.classList.contains('locked')) {
                showLockedMessage(card);
                return;
            }
            
            // 获取章节ID
            const chapterId = card.dataset.id;
            if (!chapterId) return;
            
            // 获取章节数据
            const chapterData = findChapterById(chapterId);
            if (!chapterData) return;
            
            // 显示章节详情模态框
            showChapterModal(chapterData);
            
            // 添加点击效果
            addClickEffect(card);
        });

        // 返回上级按钮点击事件
        const backToCategoryBtn = document.getElementById('back-to-category-btn');
        if (backToCategoryBtn) {
            backToCategoryBtn.addEventListener('click', function() {
                // 隐藏子章节容器，显示主章节容器
                document.getElementById('subchapter-container').style.display = 'none';
                document.getElementById('category-container').style.display = 'block';
                // 清除当前选中的主章节ID
                currentCategoryId = null;
            });
        }

        // 返回首页按钮点击事件
        const backButton = document.getElementById('back-btn');
        if (backButton) {
            backButton.addEventListener('click', function() {
                window.location.href = 'shouye.html';
            });
        }

        // 关闭模态框按钮点击事件
        const closeModalBtn = document.getElementById('close-modal-btn');
        if (closeModalBtn) {
            closeModalBtn.addEventListener('click', closeChapterModal);
        }

        // 开始游戏按钮点击事件
        const playBtn = document.getElementById('play-btn');
        if (playBtn) {
            playBtn.addEventListener('click', function() {
                const chapterId = this.dataset.chapterId;
                startGame(chapterId);
            });
        }

        // 复习单词按钮点击事件
        const reviewBtn = document.getElementById('review-btn');
        if (reviewBtn) {
            reviewBtn.addEventListener('click', function() {
                const chapterId = this.dataset.chapterId;
                reviewWords(chapterId);
            });
        }
    }

    // 通过ID查找章节数据
    function findChapterById(chapterId) {
        // 如果是子章节ID (例如"1-2")
        if (chapterId.includes('-')) {
            const categoryId = chapterId.split('-')[0];
            const categoryChapters = subchapters[categoryId] || [];
            return categoryChapters.find(chapter => chapter.id === chapterId);
        }
        // 如果是主章节ID
        return categories.find(category => category.id == chapterId);
    }

    // 绘制进度环 (添加 colorOverride 参数)
    function drawProgressRing(canvas, progress, colorOverride) {
        const ctx = canvas.getContext('2d');
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const radius = Math.min(centerX, centerY) - 5;
        
        // 清除画布
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // 绘制背景圆环
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(200, 200, 200, 0.3)';
        ctx.lineWidth = 4;
        ctx.stroke();
        
        // 绘制进度圆环
        if (progress > 0) {
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, -Math.PI/2, (Math.PI*2)*progress - Math.PI/2);
            // --- 修改：直接使用传入的 colorOverride --- 
            ctx.strokeStyle = colorOverride; // 直接使用传入的颜色
            // --- 结束修改 ---
            ctx.lineWidth = 4;
            ctx.lineCap = 'round';
            ctx.stroke();
        }
    }

    // 绘制大进度环（用于模态框）
    function drawLargeProgressRing(canvas, progress) {
        const ctx = canvas.getContext('2d');
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const radius = Math.min(centerX, centerY) - 10;
        
        // 清除画布
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // // 绘制背景圆环
        // ctx.beginPath();
        // ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        // ctx.strokeStyle = 'rgba(200, 200, 200, 0.3)';
        // ctx.lineWidth = 8;
        // ctx.stroke();
        
        // // 绘制进度圆环
        // if (progress > 0) {
        //     ctx.beginPath();
        //     ctx.arc(centerX, centerY, radius, -Math.PI/2, (Math.PI*2)*progress - Math.PI/2);
        //     // 根据进度调整颜色
        //     const hue = progress < 0.3 ? 0 : (progress < 0.7 ? 40 : 146);
        //     ctx.strokeStyle = `hsl(${hue}, ${30 + progress*20}%, ${60 + progress*10}%)`;
        //     ctx.lineWidth = 8;
        //     ctx.lineCap = 'round';
        //     ctx.stroke();
        // }
    }

    // 显示章节详情模态框
    function showChapterModal(chapter) {
        const modal = document.getElementById('chapter-modal');
        if (!modal) {
            console.error("Modal element #chapter-modal not found!");
            return;
        }
        
        // --- 修改：使用 subchapters 和 currentLevelProgressInfo 计算级别进度 ---
        let categoryProgress = 0;
        const chapterList = subchapters[chapter.categoryId];
        
        if (chapterList && currentLevelProgressInfo) {
            const totalChapters = chapterList.length;
            if (totalChapters > 0) {
                const completedChapters = chapterList.filter(chap => chap.orderNum < currentLevelProgressInfo.lastAccessedOrder).length;
                categoryProgress = completedChapters / totalChapters;
                console.log(`[showChapterModal] Calculated category progress: ${completedChapters}/${totalChapters} = ${categoryProgress}`);
            } else {
                console.warn(`[showChapterModal] No chapters found for category ${chapter.categoryId} in subchapters data.`);
            }
        } else {
            console.warn(`[showChapterModal] Missing chapterList or currentLevelProgressInfo, cannot calculate category progress.`, { chapterList, currentLevelProgressInfo });
        }
        // --- 结束修改 ---
        
        // --- 修改：更新模态框内容，并添加空值检查 --- 
        const chapterTitleEl = document.getElementById('chapter-title');
        if (chapterTitleEl) chapterTitleEl.textContent = chapter.title;
        else console.error("Element #chapter-title not found!");

        const wordCountEl = document.getElementById('word-count');
        if (wordCountEl) wordCountEl.textContent = chapter.wordCount;
        else console.error("Element #word-count not found!");
        
        const masteredCountEl = document.getElementById('mastered-count');
        if (masteredCountEl) masteredCountEl.textContent = chapter.masteredCount;
        else console.error("Element #mastered-count not found!");

        const difficultyEl = document.getElementById('difficulty');
        if (difficultyEl) difficultyEl.textContent = '⭐'.repeat(chapter.difficulty);
        else console.error("Element #difficulty not found!");
        
        const playBtnEl = document.getElementById('play-btn');
        if (playBtnEl) playBtnEl.dataset.chapterId = chapter.id;
        else console.error("Element #play-btn not found!");

        const reviewBtnEl = document.getElementById('review-btn');
        if (reviewBtnEl) reviewBtnEl.dataset.chapterId = chapter.id;
        else console.error("Element #review-btn not found!");
        // --- 结束修改 ---
        
        // 显示模态框
        modal.classList.add('active');
        
        // 添加弹出动画
        const modalContent = modal.querySelector('.modal-content');
        if (modalContent) {
            modalContent.style.animation = 'none';
            setTimeout(() => {
                modalContent.style.animation = 'cardEntrance 0.4s var(--transition-bounce) forwards';
            }, 10);
        }
    }

    // 关闭章节详情模态框
    function closeChapterModal() {
        const modal = document.getElementById('chapter-modal');
        if (modal) {
            modal.classList.remove('active');
        }
    }

    // 显示锁定消息
    function showLockedMessage(card) {
        // 创建提示元素
        const tooltip = document.createElement('div');
        tooltip.className = 'locked-tooltip';
        tooltip.textContent = '请先完成前面的章节';
        tooltip.style.position = 'absolute';
        tooltip.style.top = '0';
        tooltip.style.left = '50%';
        tooltip.style.transform = 'translate(-50%, -100%)';
        tooltip.style.backgroundColor = 'rgba(0,0,0,0.7)';
        tooltip.style.color = 'white';
        tooltip.style.padding = '8px 12px';
        tooltip.style.borderRadius = '6px';
        tooltip.style.fontSize = '14px';
        tooltip.style.zIndex = '10';
        tooltip.style.whiteSpace = 'nowrap';
        tooltip.style.pointerEvents = 'none';
        tooltip.style.opacity = '0';
        tooltip.style.transition = 'opacity 0.3s, transform 0.3s';
        
        // 加入卡片
        card.style.position = 'relative';
        card.appendChild(tooltip);
        
        // 动画显示
        setTimeout(() => {
            tooltip.style.opacity = '1';
            tooltip.style.transform = 'translate(-50%, -120%)';
        }, 10);
        
        // 动画隐藏
        setTimeout(() => {
            tooltip.style.opacity = '0';
            tooltip.style.transform = 'translate(-50%, -100%)';
            
            // 移除元素
            setTimeout(() => {
                if (card.contains(tooltip)) {
                    card.removeChild(tooltip);
                }
            }, 300);
        }, 2000);
    }

    // 添加点击效果
    function addClickEffect(element) {
        // 创建涟漪元素
        const ripple = document.createElement('div');
        ripple.className = 'ripple';
        ripple.style.position = 'absolute';
        ripple.style.top = '50%';
        ripple.style.left = '50%';
        ripple.style.width = '120%';
        ripple.style.height = '120%';
        ripple.style.transform = 'translate(-50%, -50%) scale(0)';
        ripple.style.borderRadius = '50%';
        ripple.style.background = 'radial-gradient(circle, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0) 70%)';
        ripple.style.pointerEvents = 'none';
        ripple.style.transition = 'transform 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
        ripple.style.opacity = '1';
        ripple.style.zIndex = '1';
        
        // 添加到元素
        element.appendChild(ripple);
        
        // 触发动画
        setTimeout(() => {
            ripple.style.transform = 'translate(-50%, -50%) scale(1)';
            ripple.style.opacity = '0';
        }, 10);
        
        // 动画结束后移除
        setTimeout(() => {
            if (element.contains(ripple)) {
                element.removeChild(ripple);
            }
        }, 500);
    }

    // 动画装饰元素
    function animateDecoElements() {
        // 如果有装饰元素，可以在这里添加额外的动画效果
    }

    // 渲染章节
    async function renderChapters(levelId) {
        const chapters = await loadChapters(levelId);
        const progress = await ProgressManager.getChapterProgress(levelId);
      
        const container = document.querySelector('.chapters-container');
        container.innerHTML = chapters.map(chapter => `
          <div class="chapter-item ${chapter.order_num > progress.lastUnlocked ? 'locked' : ''}" 
               data-order="${chapter.order_num}"
               onclick="${chapter.order_num <= progress.lastUnlocked ? `startChapter('${chapter.id}')` : ''}">
            <div class="chapter-icon">${getChapterIcon(chapter, progress)}</div>
            <div class="chapter-info">
              <div class="chapter-name">${chapter.name}</div>
              ${progress.lastAccessed === chapter.order_num ? '<div class="last-played">上次游玩</div>' : ''}
            </div>
          </div>
        `).join('');
      }
    
    // 获取章节图标
    function getChapterIcon(chapter, progress) {
        // 1. 已完成 (且上次访问)
        if (chapter.order_num === progress.lastAccessed) {
            return '👑'; // Crown icon (Completed and last accessed)
        }
        // 2. 已完成 (且非上次访问)
        if (chapter.order_num < progress.lastUnlocked) {
            return '✅'; // Checkmark icon (Completed)
        }
        // 3. 可玩 (已解锁，非上次访问，非已完成) - 返回空字符串，不显示图标
        // return '📘'; // Book icon (Available to play)
        return '📘'; // Return empty string for available state
    }

    // 开始游戏
    function startGame(chapterId) {
        const chapter = findChapterById(chapterId);
        if (!chapter) {
            console.error(`找不到章节: ${chapterId}`);
            return;
        }
        let playMode = window.getPlayMode ? window.getPlayMode() : 'normal'; // 使用全局函数，并提供默认值
        console.log(`开始游戏：章节=${chapter.title}, 模式=${gameMode}, chapterId=${chapterId},playMode=${playMode}`);
        
        // 根据data-action跳转
        if (gameMode === 'lianxianMode') {
            window.location.href = `game_1_lianxian.html?chapter=${chapter.originalId}&category=${chapter.categoryId}&chapterName=${encodeURIComponent(chapter.title)}&mode=${playMode}`;
        } else if (gameMode === 'pipeiMode') {
            window.location.href = `game_2_pipei.html?chapter=${chapter.originalId}&category=${chapter.categoryId}&chapterName=${encodeURIComponent(chapter.title)}&mode=${playMode}`;
        } else if (gameMode === 'jiyiMode') {
            window.location.href = `game_3_jiyi.html?chapter=${chapter.originalId}&category=${chapter.categoryId}&chapterName=${encodeURIComponent(chapter.title)}&mode=${playMode}`;
        }
    }

    // 复习单词
    function reviewWords(chapterId) {
        console.log(`复习单词：章节 ${chapterId}`);
        // 这里可以跳转到复习页面或打开复习模式
        alert(`复习章节 ${chapterId} 的单词`);
    }

    // 立即初始化
    init();
});
