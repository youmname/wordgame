/**
 * 词汇管理系统 JavaScript
 * 用于管理词汇数据、级别和章节
 */

// API基础URL
const API_BASE_URL = window.location.protocol + '//' + window.location.hostname + ':5000/api';

// API端点
const API_ENDPOINTS = {
    VOCABULARY_LEVELS: '/vocabulary-levels',
    LEVEL_CHAPTERS: '/vocabulary-levels/{id}/chapters',
    CHAPTERS: '/chapters',
    WORDS: '/chapters/{id}/words',
    IMPORT_WORDS: '/import-words',
    WORDS_SEARCH: '/words/search',
    WORDS_MANAGE: '/words',
    CREATE_CHAPTER: '/chapters'
};

// 全局变量
let token = localStorage.getItem('authToken');
let currentPage = 1;
let pageSize = 20;
let totalWords = 0;
let vocabularyLevels = [];
let currentLevelId = null;
let excelData = null;

// 删除模拟数据
const MOCK_VOCABULARY_DATA = null;
const MOCK_CHAPTER_DATA = null;
const MOCK_LEVEL_DATA = null;

/**
 * 页面加载时初始化
 */
document.addEventListener('DOMContentLoaded', async () => {
    // 初始化MaterializeCSS组件
    initializeMaterialize();
    
    // 检查登录状态
    checkLoginStatus();
    
    // 设置事件监听器
    setupEventListeners();
    
    try {
        // 等待初始化完成
        await initializeVocabularyManager();
        console.log('初始化完成，页面已加载');
    } catch(error) {
        console.error('初始化过程中发生错误:', error);
        showToast('初始化失败: ' + error.message, 'error');
    }
});

/**
 * 初始化MaterializeCSS组件
 */
function initializeMaterialize() {
    // 初始化选择器
    const selects = document.querySelectorAll('select');
    M.FormSelect.init(selects);
    
    // 初始化选项卡
    const tabs = document.querySelectorAll('.tabs');
    M.Tabs.init(tabs);
    
    // 初始化模态框
    const modals = document.querySelectorAll('.modal');
    M.Modal.init(modals);
    
    // 初始化文本域 - 修复textareaAutoResize调用
    const textareas = document.querySelectorAll('textarea.materialize-textarea');
    if (textareas.length > 0) {
        textareas.forEach(textarea => {
            M.textareaAutoResize(textarea);
        });
    }
}

/**
 * 检查管理员登录状态
 */
function checkLoginStatus() {
    if (!token) {
        // 未登录，重定向到登录页
        showToast('请先登录', 'error');
        setTimeout(() => {
            window.location.href = 'admin.html';
        }, 1500);
        return;
    }
    
    // 验证token
    fetch(API_BASE_URL + '/verify-token', {
        method: 'GET',
        headers: {
            'Authorization': 'Bearer ' + token
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('登录已过期');
        }
        return response.json();
    })
    .then(data => {
        console.log('登录状态有效:', data);
    })
    .catch(error => {
        console.error('验证失败:', error);
        showToast('登录已过期，请重新登录', 'error');
        localStorage.removeItem('authToken');
        setTimeout(() => {
            window.location.href = 'admin.html';
        }, 1500);
    });
}

/**
 * 设置页面事件监听器
 */
function setupEventListeners() {
    // 退出登录
    document.querySelector('.logout-btn').addEventListener('click', handleLogout);
    
    // Excel文件上传处理
    document.getElementById('excel-upload').addEventListener('change', handleExcelUpload);
    
    // 导入数据
    document.getElementById('btn-import-excel').addEventListener('click', importExcelData);
    
    // 创建新章节选项切换
    document.getElementById('create-new-chapter').addEventListener('change', toggleNewChapterForm);
    
    // 级别筛选变化时更新章节下拉框
    document.getElementById('import-level-select').addEventListener('change', updateChapterDropdown);
    document.getElementById('word-level').addEventListener('change', updateWordChapterDropdown);
    
    // 添加按钮点击事件
    document.getElementById('btn-add-word').addEventListener('click', showAddWordModal);
    document.getElementById('btn-add-level').addEventListener('click', showAddLevelModal);
    document.getElementById('btn-add-chapter').addEventListener('click', showAddChapterModal);
    
    // 保存按钮点击事件
    document.getElementById('btn-save-word').addEventListener('click', saveWord);
    document.getElementById('btn-save-level').addEventListener('click', saveLevel);
    document.getElementById('btn-save-chapter').addEventListener('click', saveChapter);
    
    // 单词搜索
    document.getElementById('word-search').addEventListener('input', debounce(searchWords, 500));
    
    // 级别筛选
    document.getElementById('level-filter').addEventListener('change', filterWords);
    
    // 章节筛选
    document.getElementById('chapter-filter').addEventListener('change', filterWords);
    
    // 章节级别筛选
    document.getElementById('chapter-level-filter').addEventListener('change', filterChapters);
    
    // 添加测试API按钮
    const buttonContainer = document.querySelector('.action-buttons');
    if (buttonContainer) {
        const testButton = document.createElement('button');
        testButton.className = 'btn waves-effect waves-light';
        testButton.innerHTML = '<i class="material-icons left">bug_report</i>测试API';
        testButton.onclick = () => directAPITest();
        buttonContainer.appendChild(testButton);
    }
}

/**
 * 加载初始数据
 */
async function loadInitialData() {
    try {
        // 检查登录状态
        const token = localStorage.getItem('authToken');
        if (!token) {
            throw new Error('未登录');
        }

        // 先加载词汇级别
        await loadVocabularyLevels();
        
        // 更新级别下拉框
        await updateLevelDropdowns();
        
        // 加载单词数据
        await loadWords();
        
        return true;
    } catch (error) {
        console.error('加载初始数据失败:', error);
        if (error.message === '未登录') {
            window.location.href = 'login.html';
        }
        return false;
    }
}

/**
 * 加载词汇级别
 */
async function loadVocabularyLevels() {
    try {
        const response = await fetch(`${API_BASE_URL}/vocabulary-levels`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });
        const data = await response.json();
        
        if (!data.success || !data.levels) {
            throw new Error('获取词汇级别失败');
        }

        const levelSelect = document.getElementById('level-filter');
        levelSelect.innerHTML = '<option value="">所有级别</option>';
        
        // 添加所有级别选项
        data.levels.forEach(level => {
            const option = document.createElement('option');
            option.value = level.id;
            option.textContent = level.name;
            levelSelect.appendChild(option);
        });

        // 初始化 Materialize 下拉菜单
        M.FormSelect.init(levelSelect);
        
        // 默认选中第一个级别并加载其章节
        if (data.levels.length > 0) {
            levelSelect.value = data.levels[0].id;
            M.FormSelect.init(levelSelect);
            await loadChapters(data.levels[0].id);
        }
    } catch (error) {
        console.error('加载词汇级别失败:', error);
        showToast('加载词汇级别失败', 'error');
    }
}

/**
 * 更新所有级别下拉框
 */
function updateLevelDropdowns() {
    // 获取所有需要更新的下拉框
    const levelSelects = [
        document.getElementById('level-filter'),
        document.getElementById('import-level-select'),
        document.getElementById('word-level'),
        document.getElementById('chapter-level-select'),
        document.getElementById('chapter-level-filter')
    ];
    
    // 清空并重新填充每个下拉框
    levelSelects.forEach(select => {
        if (!select) return;
        
        // 清空现有选项（保留第一个）
        while (select.options.length > 1) {
            select.remove(1);
        }
        
        // 添加级别选项
        vocabularyLevels.forEach(level => {
            const option = document.createElement('option');
            option.value = level.id;
            option.textContent = level.name;
            select.appendChild(option);
        });
        
        // 刷新MaterializeCSS组件
        M.FormSelect.init(select);
    });
}

/**
 * 根据级别ID更新章节下拉框
 * @param {Event} e - 事件对象
 */
function updateChapterDropdown(e) {
    const levelId = e.target.value;
    const chapterSelect = document.getElementById('import-chapter-select');
    
    if (!levelId) {
        // 清空章节选择器
        while (chapterSelect.options.length > 1) {
            chapterSelect.remove(1);
        }
        M.FormSelect.init(chapterSelect);
        return;
    }
    
    // 显示加载指示器
    showLoading('加载章节...');
    
    // 获取该级别的章节
    const url = `${API_BASE_URL}/vocabulary-levels/${levelId}/chapters`;
    
    fetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error('获取章节失败');
            }
            return response.json();
        })
        .then(data => {
            // 清空现有选项（保留第一个）
            while (chapterSelect.options.length > 1) {
                chapterSelect.remove(1);
            }
            
            // 添加章节选项
            const chapters = data.chapters || [];
            chapters.forEach(chapter => {
                const option = document.createElement('option');
                option.value = chapter.id;
                option.textContent = chapter.name;
                chapterSelect.appendChild(option);
            });
            
            // 刷新MaterializeCSS组件
            M.FormSelect.init(chapterSelect);
        })
        .catch(error => {
            console.error('加载章节失败:', error);
            showToast('加载章节失败: ' + error.message, 'error');
        })
        .finally(() => {
            hideLoading();
        });
}

/**
 * 词汇单词编辑模态框中，根据级别ID更新章节下拉框
 * @param {Event} e - 事件对象
 */
function updateWordChapterDropdown(e) {
    const levelId = e.target.value;
    const chapterSelect = document.getElementById('word-chapter');
    
    if (!levelId) {
        // 清空章节选择器
        while (chapterSelect.options.length > 1) {
            chapterSelect.remove(1);
        }
        M.FormSelect.init(chapterSelect);
        return;
    }
    
    // 获取该级别的章节
    const url = API_BASE_URL + API_ENDPOINTS.LEVEL_CHAPTERS.replace('{id}', levelId);
    
    fetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error('获取章节失败');
            }
            return response.json();
        })
        .then(data => {
            // 清空现有选项（保留第一个）
            while (chapterSelect.options.length > 1) {
                chapterSelect.remove(1);
            }
            
            // 添加章节选项
            const chapters = data.chapters || [];
            chapters.forEach(chapter => {
                const option = document.createElement('option');
                option.value = chapter.id;
                option.textContent = chapter.name;
                chapterSelect.appendChild(option);
            });
            
            // 刷新MaterializeCSS组件
            M.FormSelect.init(chapterSelect);
        })
        .catch(error => {
            console.error('加载章节失败:', error);
            showToast('加载章节失败: ' + error.message, 'error');
        });
}

/**
 * 加载单词列表
 * @param {number} page - 页码
 * @param {number} size - 每页大小
 * @param {Object} filters - 过滤条件
 * @returns {Promise} Promise对象
 */
function loadWords(page = 1, size = 20, filters = {}) {
    // 显示加载动画
    showLoading('加载单词...');
    
    // 构建API URL
    let url;
    let queryParams = new URLSearchParams();
    
    // 添加分页参数
    queryParams.append('page', page);
    queryParams.append('size', size);
    
    // 如果有筛选条件，添加到查询参数
    if (filters.levelId) {
        queryParams.append('levelId', filters.levelId);
    }
    if (filters.levelName) {
        queryParams.append('levelName', filters.levelName);
    }
    if (filters.chapterId) {
        queryParams.append('chapterId', filters.chapterId);
    }
    if (filters.query) {
        queryParams.append('query', filters.query);
    }
    
    // 使用/api/words/search端点
    url = `${API_BASE_URL}/words/search?${queryParams.toString()}`;
    
    console.log('请求URL:', url);
    
    // 发送API请求
    return fetch(url, {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
        }
    })
    .then(response => {
        if (!response.ok) {
            return response.text().then(text => {
                console.error('API错误:', text);
                throw new Error(`获取单词失败：${response.status}`);
            });
        }
        return response.json();
    })
    .then(data => {
        console.log('获取单词成功:', data);
        
        if (!data.success) {
            throw new Error(data.message || '获取单词失败');
        }
        
        // 更新总记录数
        totalWords = data.total;
        
        // 处理并显示单词
        displayWords(data.words);
        
        // 更新分页
        updatePagination(page, Math.ceil(data.total / size));
        
        hideLoading();
        return data.words;
    })
    .catch(error => {
        console.error('加载单词失败:', error);
        
        // 在表格中显示错误信息
        const tbody = document.getElementById('vocabulary-tbody');
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="6" class="center-align red-text">加载失败: ${error.message}</td></tr>`;
        }
        
        showToast('加载单词失败: ' + error.message, 'error');
        hideLoading();
    });
}

/**
 * 处理并显示单词数据
 * @param {Array} words - 单词数据
 * @param {number} page - 页码
 * @param {number} size - 每页大小
 * @param {Object} filters - 过滤条件
 * @returns {Array} 处理后的单词数据
 */
function processAndDisplayWords(words, page, size, filters) {
    console.log('处理并显示单词:', words.length, '页码:', page, '每页:', size);
    
    // 计算总数和分页
    const total = words.length;
    totalWords = total;
    
    // 前端分页
    const start = (page - 1) * size;
    const end = start + size;
    const pagedWords = words.slice(start, end);
    
    // 清空表格
    const tbody = document.getElementById('vocabulary-tbody');
    if (!tbody) {
        console.warn('未找到vocabulary-tbody元素');
        hideLoading();
        return [];
    }
    
    tbody.innerHTML = '';
    
    // 填充表格
    if (pagedWords.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="center-align">暂无单词数据</td></tr>';
    } else {
        pagedWords.forEach(word => {
            const tr = document.createElement('tr');
            
            // ID
            const tdId = document.createElement('td');
            tdId.textContent = word.id || '无ID';
            tr.appendChild(tdId);
            
            // 单词
            const tdWord = document.createElement('td');
            tdWord.textContent = word.word || '无单词';
            tr.appendChild(tdWord);
            
            // 音标 - 处理可能缺失的phonetic字段
            const tdPhonetic = document.createElement('td');
            tdPhonetic.textContent = word.phonetic || '-';
            tr.appendChild(tdPhonetic);
            
            // 含义 - 确保优先使用meaning字段
            const tdDefinition = document.createElement('td');
            tdDefinition.textContent = word.meaning || word.definition || '-';
            tr.appendChild(tdDefinition);
            
            // 所属章节 - 添加默认值
            const tdChapter = document.createElement('td');
            tdChapter.textContent = filters.chapterId ? getChapterNameById(filters.chapterId) : (word.chapter_name || '默认章节');
            tr.appendChild(tdChapter);
            
            // 操作
            const tdActions = document.createElement('td');
            tdActions.className = 'word-actions';
            
            // 编辑按钮
            const editBtn = document.createElement('button');
            editBtn.className = 'btn-small edit';
            editBtn.innerHTML = '<i class="material-icons">edit</i>编辑';
            editBtn.addEventListener('click', () => editWord(word));
            tdActions.appendChild(editBtn);
            
            // 删除按钮
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'btn-small delete';
            deleteBtn.innerHTML = '<i class="material-icons">delete</i>删除';
            deleteBtn.addEventListener('click', () => showDeleteConfirmation('word', word.id, `确定要删除单词 "${word.word}" 吗？`));
            tdActions.appendChild(deleteBtn);
            
            tr.appendChild(tdActions);
            tbody.appendChild(tr);
        });
    }
    
    // 更新分页
    updatePagination(page, Math.ceil(total / size));
    
    hideLoading();
    return pagedWords;
}

/**
 * 根据章节ID获取章节名称
 * @param {string|number} chapterId - 章节ID
 * @returns {string} 章节名称
 */
function getChapterNameById(chapterId) {
    // 尝试从全局缓存中获取章节信息
    if (window.chaptersCache && window.chaptersCache[chapterId]) {
        return window.chaptersCache[chapterId].name;
    }
    
    // 如果没有缓存，则显示ID
    return `章节${chapterId}`;
}

/**
 * 更新分页控件
 * @param {number} currentPage - 当前页码
 * @param {number} totalPages - 总页数
 */
function updatePagination(currentPage, totalPages) {
    const pagination = document.getElementById('vocabulary-pagination');
    pagination.innerHTML = '';
    
    // 前一页
    const prevLi = document.createElement('li');
    prevLi.className = currentPage === 1 ? 'disabled' : 'waves-effect';
    const prevA = document.createElement('a');
    prevA.href = '#!';
    prevA.innerHTML = '<i class="material-icons">chevron_left</i>';
    if (currentPage > 1) {
        prevA.addEventListener('click', () => loadWords(currentPage - 1, pageSize));
    }
    prevLi.appendChild(prevA);
    pagination.appendChild(prevLi);
    
    // 页码
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, startPage + 4);
    if (endPage - startPage < 4) {
        startPage = Math.max(1, endPage - 4);
    }
    
    for (let i = startPage; i <= endPage; i++) {
        const pageLi = document.createElement('li');
        pageLi.className = i === currentPage ? 'active' : 'waves-effect';
        const pageA = document.createElement('a');
        pageA.href = '#!';
        pageA.textContent = i;
        if (i !== currentPage) {
            pageA.addEventListener('click', () => loadWords(i, pageSize));
        }
        pageLi.appendChild(pageA);
        pagination.appendChild(pageLi);
    }
    
    // 后一页
    const nextLi = document.createElement('li');
    nextLi.className = currentPage === totalPages ? 'disabled' : 'waves-effect';
    const nextA = document.createElement('a');
    nextA.href = '#!';
    nextA.innerHTML = '<i class="material-icons">chevron_right</i>';
    if (currentPage < totalPages) {
        nextA.addEventListener('click', () => loadWords(currentPage + 1, pageSize));
    }
    nextLi.appendChild(nextA);
    pagination.appendChild(nextLi);
}

/**
 * 过滤单词列表
 */
function filterWords() {
    const levelSelect = document.getElementById('level-filter');
    const chapterSelect = document.getElementById('chapter-filter');
    const searchInput = document.getElementById('search-input');
    
    // 如果元素不存在，提前返回
    if (!levelSelect || !chapterSelect) {
        console.error('找不到级别或章节选择器元素');
        return;
    }
    
    // 如果选择了特定章节，直接加载该章节的单词
    if (chapterSelect.value) {
        console.log(`已选择章节ID: ${chapterSelect.value}，直接加载该章节单词`);
        loadWordsByChapter(chapterSelect.value);
        return;
    }
    
    // 准备筛选条件
    let filters = {};
    
    // 处理级别筛选
    if (levelSelect.value !== '') {
        filters.levelId = levelSelect.value;
    }
    
    // 处理搜索词
    if (searchInput && searchInput.value) {
        filters.query = searchInput.value.trim();
    }
    
    console.log('应用筛选条件:', filters);
    
    // 加载单词数据
    loadWords(1, 20, filters);
}

/**
 * 搜索单词
 */
function searchWords() {
    const searchInput = document.getElementById('search-input');
    const levelSelect = document.getElementById('level-filter');
    const chapterSelect = document.getElementById('chapter-filter');
    
    const filters = {
        query: searchInput.value.trim(),
        levelId: levelSelect.value !== '' ? levelSelect.value : null,
        chapterId: chapterSelect.value !== '' ? chapterSelect.value : null
    };
    
    console.log('执行搜索:', filters);
    
    // 重置到第一页并加载数据
    loadWords(1, 20, filters);
}

/**
 * 显示搜索结果
 * @param {Array} words - 搜索结果单词数组
 */
function displaySearchResults(words) {
    const wordList = document.getElementById('word-list');
    
    if (!words || words.length === 0) {
        wordList.innerHTML = '<tr><td colspan="5">没有找到匹配的单词</td></tr>';
        return;
    }
    
    let html = '';
    words.forEach(word => {
        html += `
        <tr>
            <td>${word.word}</td>
            <td>${word.phonetic || ''}</td>
            <td>${word.definition || word.meaning || ''}</td>
            <td>${word.chapter_name || ''}</td>
            <td>
                <button class="btn btn-sm btn-primary" onclick="editWord(${word.id})">编辑</button>
                <button class="btn btn-sm btn-danger" onclick="deleteWord(${word.id})">删除</button>
            </td>
        </tr>`;
    });
    
    wordList.innerHTML = html;
}

/**
 * 防抖函数
 * @param {Function} func - 要执行的函数
 * @param {number} wait - 等待时间
 * @returns {Function} 防抖后的函数
 */
function debounce(func, wait) {
    let timeout;
    return function() {
        const context = this;
        const args = arguments;
        clearTimeout(timeout);
        timeout = setTimeout(() => {
            func.apply(context, args);
        }, wait);
    };
}

/**
 * 显示加载动画
 * @param {string} text - 加载文本
 */
function showLoading(text = '正在加载...') {
    const loading = document.getElementById('loading');
    const loadingText = document.getElementById('loading-text');
    
    loadingText.textContent = text;
    loading.style.display = 'flex';
}

/**
 * 隐藏加载动画
 */
function hideLoading() {
    document.getElementById('loading').style.display = 'none';
}

/**
 * 显示提示消息
 * @param {string} message - 消息内容
 * @param {string} type - 消息类型，可选值：info、success、error
 * @param {number} duration - 显示时间（毫秒）
 */
function showToast(message, type = 'info', duration = 3000) {
    let classes = 'rounded';
    
    switch (type) {
        case 'success':
            classes += ' green';
            break;
        case 'error':
            classes += ' red';
            break;
        default:
            classes += ' blue';
    }
    
    M.toast({
        html: message,
        classes: classes,
        displayLength: duration
    });
}

/**
 * 处理退出登录
 */
function handleLogout() {
    localStorage.removeItem('authToken');
    showToast('已退出登录', 'info');
    setTimeout(() => {
        window.location.href = 'admin.html';
    }, 1000);
}

/**
 * 处理Excel文件上传
 * @param {Event} e - 事件对象
 */
function handleExcelUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    // 显示加载动画
    showLoading('正在解析Excel文件...');
    
    // 使用FileReader读取文件
    const reader = new FileReader();
    
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, {
                type: 'array',
                cellDates: true,
                cellNF: true,
                cellText: true
            });
            
            console.log('上传的Excel文件包含以下工作表:', workbook.SheetNames);
            
            // 清空现有数据
            excelData = null;
            
            // 处理每个工作表
            const firstSheetName = workbook.SheetNames[0];
            if (!firstSheetName) {
                throw new Error('Excel文件没有工作表');
            }
            
            const sheet = workbook.Sheets[firstSheetName];
            const json = XLSX.utils.sheet_to_json(sheet);
            
            console.log(`工作表 ${firstSheetName} 数据行数: ${json.length}`);
            
            if (json.length === 0) {
                throw new Error('工作表没有数据');
            }
            
            // 提取列名
            const firstRow = json[0];
            console.log('第一行数据:', firstRow);
            
            // 尝试找出列名
            let wordColumn = null;
            let phoneticColumn = null;
            let definitionColumn = null;
            
            const keys = Object.keys(firstRow);
            
            // 基于常见的列名匹配
            const wordKeywords = ['单词', 'word', '词汇', 'term', 'vocabulary'];
            const phoneticKeywords = ['音标', 'phonetic', 'pronunciation', 'ipa'];
            const defKeywords = ['定义', 'definition', 'def', '释义', '解释', '中文', 'meaning', '翻译', 'translation'];
            
            for (const key of keys) {
                const keyLower = key.toLowerCase();
                
                // 匹配单词列
                if (!wordColumn && wordKeywords.some(keyword => keyLower.includes(keyword))) {
                    wordColumn = key;
                }
                
                // 匹配音标列
                if (!phoneticColumn && phoneticKeywords.some(keyword => keyLower.includes(keyword))) {
                    phoneticColumn = key;
                }
                
                // 匹配定义列
                if (!definitionColumn && defKeywords.some(keyword => keyLower.includes(keyword))) {
                    definitionColumn = key;
                }
            }
            
            // 如果找不到匹配列，则使用前三列
            if (!wordColumn && keys.length >= 1) {
                wordColumn = keys[0];
            }
            
            if (!phoneticColumn && keys.length >= 2) {
                phoneticColumn = keys[1];
            }
            
            if (!definitionColumn && keys.length >= 3) {
                definitionColumn = keys[2];
            } else if (!definitionColumn && keys.length >= 2) {
                // 如果只有两列，使用第二列作为定义
                definitionColumn = keys[1];
                phoneticColumn = null;
            }
            
            console.log(`选择的列: 单词=${wordColumn}, 音标=${phoneticColumn}, 定义=${definitionColumn}`);
            
            if (!wordColumn || !definitionColumn) {
                throw new Error('无法识别单词或定义列');
            }
            
            // 提取单词数据
            const wordList = [];
            
            json.forEach((row, index) => {
                const word = row[wordColumn] ? String(row[wordColumn]).trim() : '';
                const phonetic = phoneticColumn && row[phoneticColumn] ? String(row[phoneticColumn]).trim() : '';
                const definition = row[definitionColumn] ? String(row[definitionColumn]).trim() : '';
                
                if (word && definition) {
                    wordList.push({
                        word,
                        phonetic,
                        definition
                    });
                }
            });
            
            if (wordList.length === 0) {
                throw new Error('没有提取到有效单词');
            }
            
            // 保存提取的数据
            excelData = wordList;
            
            // 显示预览
            updateExcelPreview(wordList);
            
            // 隐藏加载动画
            hideLoading();
            
            showToast(`已从Excel中提取 ${wordList.length} 个单词`, 'success');
        } catch (error) {
            console.error('Excel解析错误:', error);
            hideLoading();
            showToast(`Excel解析失败: ${error.message}`, 'error');
        }
    };
    
    reader.onerror = function() {
        console.error('文件读取错误');
        hideLoading();
        showToast('文件读取错误', 'error');
    };
    
    reader.readAsArrayBuffer(file);
}

/**
 * 更新Excel预览区域
 * @param {Array} wordList - 单词列表
 */
function updateExcelPreview(wordList) {
    const previewDiv = document.getElementById('excel-preview');
    
    if (!wordList || wordList.length === 0) {
        previewDiv.innerHTML = '<p class="center-align">无预览数据</p>';
        return;
    }
    
    // 创建预览表格
    let html = '<table class="striped highlight">';
    
    // 表头
    html += '<thead><tr>';
    html += '<th>单词</th>';
    html += '<th>音标</th>';
    html += '<th>含义</th>';
    html += '</tr></thead>';
    
    // 表体
    html += '<tbody>';
    
    // 最多显示10行作为预览
    const maxPreview = Math.min(wordList.length, 10);
    
    for (let i = 0; i < maxPreview; i++) {
        const word = wordList[i];
        html += '<tr>';
        html += `<td>${word.word}</td>`;
        html += `<td>${word.phonetic || '-'}</td>`;
        html += `<td>${word.definition}</td>`;
        html += '</tr>';
    }
    
    // 如果有更多行，显示提示
    if (wordList.length > maxPreview) {
        html += '<tr><td colspan="3" class="center-align">显示前10行，共 ' + wordList.length + ' 行数据</td></tr>';
    }
    
    html += '</tbody></table>';
    
    previewDiv.innerHTML = html;
}

/**
 * 显示/隐藏新章节表单
 */
function toggleNewChapterForm() {
    const checked = document.getElementById('create-new-chapter').checked;
    const form = document.getElementById('new-chapter-form');
    
    form.style.display = checked ? 'block' : 'none';
    
    // 如果选中，禁用章节选择；否则启用
    document.getElementById('import-chapter-select').disabled = checked;
    M.FormSelect.init(document.getElementById('import-chapter-select'));
}

/**
 * 创建新章节
 * @param {string} name - 章节名称
 * @param {string} description - 章节描述
 * @param {number} levelId - 级别ID
 * @param {number|null} orderNum - 排序序号（可选）
 * @returns {Promise} Promise对象
 */
function createChapter(name, description, levelId, orderNum = null) {
    showLoading('创建章节中...');
    
    // 准备请求数据
    const requestData = {
        name: name,
        description: description,
        level_id: levelId
    };
    
    // 如果提供了orderNum，添加到请求数据中
    if (orderNum !== null) {
        requestData.order_num = orderNum;
    }
    
    // 发送创建章节请求
    return fetch(API_BASE_URL + API_ENDPOINTS.CREATE_CHAPTER, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + token
        },
        body: JSON.stringify(requestData)
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(errorData => {
                throw new Error(errorData.message || '创建章节失败');
            });
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            showToast('章节创建成功', 'success');
            return data;
        } else {
            throw new Error(data.message || '创建章节失败');
        }
    })
    .catch(error => {
        console.error('创建章节错误:', error);
        showToast(error.message, 'error');
        throw error;
    })
    .finally(() => {
        hideLoading();
    });
}

/**
 * 导入单词到章节
 * @param {number} chapterId - 章节ID
 * @param {Array} words - 单词数组
 * @returns {Promise} Promise对象
 */
function importWordsToChapter(chapterId, words) {
    if (!chapterId) {
        return Promise.reject(new Error('未指定章节ID'));
    }
    
    if (!Array.isArray(words) || words.length === 0) {
        return Promise.reject(new Error('无有效单词数据'));
    }
    
    showLoading('导入单词中...');
    
    // 将单词数据格式化，确保使用正确的字段名
    const formattedWords = words.map(word => ({
        word: word.word,
        meaning: word.definition || word.meaning, // 确保使用后端接受的字段名"meaning"
        phonetic: word.phonetic || ''
    }));
    
    // 发送导入单词请求
    return fetch(API_BASE_URL + API_ENDPOINTS.IMPORT_WORDS, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + token
        },
        body: JSON.stringify({
            chapterId,
            words: formattedWords
        })
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(errorData => {
                throw new Error(errorData.message || '导入单词失败');
            });
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            showToast(`成功导入 ${data.imported} 个单词`, 'success');
            
            // 刷新单词列表和章节列表
            loadWords();
            loadChapters();
            
            return data;
        } else {
            throw new Error(data.message || '导入单词失败');
        }
    })
    .catch(error => {
        console.error('导入单词错误:', error);
        showToast(error.message, 'error');
        throw error;
    })
    .finally(() => {
        hideLoading();
    });
}

/**
 * 导入Excel数据
 */
function importExcelData() {
    if (!excelData || !excelData.length) {
        showToast('没有可导入的数据', 'error');
        return;
    }
    
    const createNewChapter = document.getElementById('create-new-chapter').checked;
    
    if (createNewChapter) {
        // 创建新章节
        const chapterName = document.getElementById('new-chapter-name').value.trim();
        const chapterDesc = document.getElementById('new-chapter-description').value.trim();
        const levelId = document.getElementById('import-level-select').value;
        
        if (!chapterName) {
            showToast('请输入章节名称', 'error');
            return;
        }
        
        if (!levelId) {
            showToast('请选择级别', 'error');
            return;
        }
        
        // 创建章节并导入单词
        createChapter(chapterName, chapterDesc, levelId)
            .then(result => {
                if (result && result.chapterId) {
                    return importWordsToChapter(result.chapterId, excelData);
                }
                throw new Error('创建章节失败');
            })
            .then(() => {
                // 清除Excel数据
                excelData = null;
                document.getElementById('excel-preview').innerHTML = '';
                document.getElementById('excel-upload').value = '';
                
                // 关闭模态框
                const modal = M.Modal.getInstance(document.getElementById('import-modal'));
                modal.close();
            })
            .catch(error => {
                console.error('导入过程错误:', error);
                showToast(error.message, 'error');
            });
    } else {
        // 导入到现有章节
        const chapterId = document.getElementById('import-chapter-select').value;
        
        if (!chapterId) {
            showToast('请选择目标章节', 'error');
            return;
        }
        
        // 导入单词
        importWordsToChapter(chapterId, excelData)
            .then(() => {
                // 清除Excel数据
                excelData = null;
                document.getElementById('excel-preview').innerHTML = '';
                document.getElementById('excel-upload').value = '';
                
                // 关闭模态框
                const modal = M.Modal.getInstance(document.getElementById('import-modal'));
                modal.close();
            })
            .catch(error => {
                console.error('导入过程错误:', error);
                showToast(error.message, 'error');
            });
    }
}

/**
 * 删除章节
 * @param {number} chapterId - 要删除的章节ID
 */
function deleteChapter(chapterId) {
    showLoading('删除章节...');
    
    fetch(API_BASE_URL + API_ENDPOINTS.CHAPTERS + '/' + chapterId, {
        method: 'DELETE',
        headers: {
            'Authorization': 'Bearer ' + token
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('删除章节失败');
        }
        return response.json();
    })
    .then(data => {
        hideLoading();
        showToast('章节已删除', 'success');
        
        // 重新加载章节
        loadChapters();
    })
    .catch(error => {
        console.error('删除章节失败:', error);
        hideLoading();
        showToast(`删除失败: ${error.message}`, 'error');
    });
}

/**
 * 加载级别表格
 */
function loadLevels() {
    // 显示加载动画
    showLoading('加载级别...');
    
    // 获取最新的级别数据
    return loadVocabularyLevels()
        .then(levels => {
            // 清空表格
            const tbody = document.getElementById('levels-tbody');
            tbody.innerHTML = '';
            
            // 填充表格
            levels.forEach(level => {
                const tr = document.createElement('tr');
                
                // ID
                const tdId = document.createElement('td');
                tdId.textContent = level.id;
                tr.appendChild(tdId);
                
                // 级别名称
                const tdName = document.createElement('td');
                tdName.textContent = level.name;
                tr.appendChild(tdName);
                
                // 描述
                const tdDescription = document.createElement('td');
                tdDescription.textContent = level.description || '-';
                tr.appendChild(tdDescription);
                
                // 排序顺序
                const tdOrder = document.createElement('td');
                tdOrder.textContent = level.order_num;
                tr.appendChild(tdOrder);
                
                // 创建时间
                const tdCreateTime = document.createElement('td');
                tdCreateTime.textContent = new Date(level.created_at).toLocaleString();
                tr.appendChild(tdCreateTime);
                
                // 操作
                const tdActions = document.createElement('td');
                tdActions.className = 'word-actions';
                
                // 编辑按钮
                const editBtn = document.createElement('button');
                editBtn.className = 'btn-small edit';
                editBtn.innerHTML = '<i class="material-icons">edit</i>编辑';
                editBtn.addEventListener('click', () => editLevel(level));
                tdActions.appendChild(editBtn);
                
                // 删除按钮
                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'btn-small delete';
                deleteBtn.innerHTML = '<i class="material-icons">delete</i>删除';
                deleteBtn.addEventListener('click', () => showDeleteConfirmation('level', level.id, `确定要删除级别 "${level.name}" 吗？`));
                tdActions.appendChild(deleteBtn);
                
                tr.appendChild(tdActions);
                tbody.appendChild(tr);
            });
            
            hideLoading();
            return levels;
        })
        .catch(error => {
            console.error('加载级别失败:', error);
            hideLoading();
            showToast('加载级别失败: ' + error.message, 'error');
        });
}

// 修复模态框ID不一致问题
function handleImportSuccess() {
    // 清除Excel数据
    excelData = null;
    document.getElementById('excel-preview').innerHTML = '';
    document.getElementById('excel-upload').value = '';
    
    // 确保使用正确的模态框ID
    const modal = M.Modal.getInstance(document.getElementById('import-modal'));
    if (modal) {
        modal.close();
    } else {
        console.warn('未找到导入模态框，请检查HTML中的ID是否为import-modal');
    }
    
    // 刷新列表
    loadWords();
    loadChapters();
}

// 增强单词保存功能，确保字段一致性
function saveWord() {
    const wordId = document.getElementById('word-id').value;
    const word = document.getElementById('word-word').value;
    const phonetic = document.getElementById('word-phonetic').value;
    const definition = document.getElementById('word-definition').value;
    const levelId = document.getElementById('word-level').value;
    const chapterId = document.getElementById('word-chapter').value;
    
    if (!word || !definition || !chapterId) {
        showToast('单词、释义和章节不能为空', 'error');
        return;
    }
    
    // 显示加载状态
    showLoading('保存单词...');
    
    // 准备请求数据，确保字段名与后端一致
    const requestData = {
        word: word,
        phonetic: phonetic || '',
        meaning: definition, // 使用meaning字段，与后端一致
        level_id: parseInt(levelId),
        chapter_id: parseInt(chapterId)
    };
    
    let url, method;
    
    if (wordId) {
        // 编辑现有单词
        url = API_BASE_URL + API_ENDPOINTS.WORDS_MANAGE + '/' + wordId;
        method = 'PUT';
    } else {
        // 添加新单词
        url = API_BASE_URL + API_ENDPOINTS.WORDS_MANAGE;
        method = 'POST';
    }
    
    // 发送请求
    fetch(url, {
        method: method,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + token
        },
        body: JSON.stringify(requestData)
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(errorData => {
                throw new Error(errorData.message || '保存单词失败');
            });
        }
        return response.json();
    })
    .then(data => {
        hideLoading();
        
        if (data.success) {
            showToast(wordId ? '单词更新成功' : '单词添加成功', 'success');
            
            // 关闭模态框
            const modal = M.Modal.getInstance(document.getElementById('word-modal'));
            modal.close();
            
            // 重新加载单词列表
            loadWords();
        } else {
            throw new Error(data.message || '保存单词失败');
        }
    })
    .catch(error => {
        console.error('保存单词失败:', error);
        hideLoading();
        showToast(error.message, 'error');
    });
}

// 添加数据验证功能
function validateExcelData(data) {
    if (!Array.isArray(data) || data.length === 0) {
        return {
            valid: false,
            message: '没有可导入的数据'
        };
    }
    
    const invalidEntries = [];
    
    data.forEach((item, index) => {
        if (!item.word || !item.definition) {
            invalidEntries.push(`第${index + 1}行：单词或释义为空`);
        }
    });
    
    return {
        valid: invalidEntries.length === 0,
        message: invalidEntries.length > 0 ? 
            `数据验证失败：${invalidEntries.slice(0, 3).join('; ')}` + 
            (invalidEntries.length > 3 ? `...等${invalidEntries.length}个问题` : '') : 
            '数据验证通过',
        invalidEntries
    };
}

// 增强错误处理
function showValidationErrors(errors) {
    if (!errors || errors.length === 0) return;
    
    let errorHTML = '<div class="validation-errors">';
    errorHTML += '<h5>导入数据存在以下问题：</h5>';
    errorHTML += '<ul class="browser-default">';
    
    // 最多显示10条错误
    const displayErrors = errors.slice(0, 10);
    
    displayErrors.forEach(error => {
        errorHTML += `<li>${error}</li>`;
    });
    
    if (errors.length > 10) {
        errorHTML += `<li>...等共${errors.length}个问题</li>`;
    }
    
    errorHTML += '</ul>';
    errorHTML += '</div>';
    
    // 显示在Excel预览区域下方
    const previewDiv = document.getElementById('excel-preview');
    previewDiv.innerHTML += errorHTML;
}

/**
 * 显示添加单词模态框
 */
function showAddWordModal() {
    // 重置表单
    document.getElementById('word-form').reset();
    document.getElementById('word-id').value = '';
    
    // 更新模态框标题
    document.querySelector('#word-modal .modal-title').textContent = '添加新单词';
    
    // 打开模态框
    const modal = M.Modal.getInstance(document.getElementById('word-modal'));
    modal.open();
}

/**
 * 显示编辑单词模态框
 * @param {Object} word - 要编辑的单词对象
 */
function editWord(word) {
    // 填充表单
    document.getElementById('word-id').value = word.id;
    document.getElementById('word-word').value = word.word;
    document.getElementById('word-phonetic').value = word.phonetic || '';
    document.getElementById('word-definition').value = word.meaning || word.definition || '';
    
    // 选择级别和章节
    if (word.level_id) {
        document.getElementById('word-level').value = word.level_id;
        M.FormSelect.init(document.getElementById('word-level'));
        
        // 加载该级别的章节
        const event = { target: { value: word.level_id } };
        updateWordChapterDropdown(event);
        
        // 延迟设置章节选择
        setTimeout(() => {
            if (word.chapter_id) {
                document.getElementById('word-chapter').value = word.chapter_id;
                M.FormSelect.init(document.getElementById('word-chapter'));
            }
        }, 500);
    }
    
    // 更新标签
    M.updateTextFields();
    
    // 更新模态框标题
    document.querySelector('#word-modal .modal-title').textContent = '编辑单词';
    
    // 打开模态框
    const modal = M.Modal.getInstance(document.getElementById('word-modal'));
    modal.open();
}

/**
 * 显示添加级别模态框
 */
function showAddLevelModal() {
    // 重置表单
    document.getElementById('level-form').reset();
    document.getElementById('level-id').value = '';
    
    // 更新模态框标题
    document.querySelector('#level-modal .modal-title').textContent = '添加新级别';
    
    // 重置字段状态
    M.updateTextFields();
    
    // 打开模态框
    const modal = M.Modal.getInstance(document.getElementById('level-modal'));
    modal.open();
}

/**
 * 显示编辑级别模态框
 * @param {Object} level - 要编辑的级别对象
 */
function editLevel(level) {
    // 填充表单
    document.getElementById('level-id').value = level.id;
    document.getElementById('level-name').value = level.name;
    document.getElementById('level-description').value = level.description || '';
    document.getElementById('level-order').value = level.order_num;
    
    // 更新标签
    M.updateTextFields();
    
    // 更新模态框标题
    document.querySelector('#level-modal .modal-title').textContent = '编辑级别';
    
    // 打开模态框
    const modal = M.Modal.getInstance(document.getElementById('level-modal'));
    modal.open();
}

/**
 * 显示添加章节模态框
 */
function showAddChapterModal() {
    // 重置表单
    document.getElementById('chapter-form').reset();
    document.getElementById('chapter-id').value = '';
    
    // 更新模态框标题
    document.querySelector('#chapter-modal .modal-title').textContent = '添加新章节';
    
    // 重置字段状态
    M.updateTextFields();
    
    // 打开模态框
    const modal = M.Modal.getInstance(document.getElementById('chapter-modal'));
    modal.open();
}

/**
 * 显示编辑章节模态框
 * @param {Object} chapter - 要编辑的章节对象
 */
function editChapter(chapter) {
    // 填充表单
    document.getElementById('chapter-id').value = chapter.id;
    document.getElementById('chapter-name').value = chapter.name;
    document.getElementById('chapter-description').value = chapter.description || '';
    document.getElementById('chapter-order').value = chapter.order_num;
    
    // 选择级别
    if (chapter.level_id) {
        document.getElementById('chapter-level-select').value = chapter.level_id;
        M.FormSelect.init(document.getElementById('chapter-level-select'));
    }
    
    // 更新标签
    M.updateTextFields();
    
    // 更新模态框标题
    document.querySelector('#chapter-modal .modal-title').textContent = '编辑章节';
    
    // 打开模态框
    const modal = M.Modal.getInstance(document.getElementById('chapter-modal'));
    modal.open();
}

/**
 * 保存级别信息
 */
function saveLevel() {
    // 获取表单数据
    const levelId = document.getElementById('level-id').value;
    const name = document.getElementById('level-name').value;
    const description = document.getElementById('level-description').value;
    const orderNum = parseInt(document.getElementById('level-order').value) || 1;
    
    // 验证必填字段
    if (!name) {
        showToast('级别名称不能为空', 'error');
        return;
    }
    
    // 显示加载动画
    showLoading('保存级别...');
    
    // 准备请求数据
    const levelData = {
        name: name,
        description: description,
        order_num: orderNum
    };
    
    // 判断是新增还是更新
    const isUpdate = levelId ? true : false;
    
    // API URL
    let url = API_BASE_URL + API_ENDPOINTS.VOCABULARY_LEVELS;
    if (isUpdate) {
        url += '/' + levelId;
    }
    
    // 发送请求
    fetch(url, {
        method: isUpdate ? 'PUT' : 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + token
        },
        body: JSON.stringify(levelData)
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(errorData => {
                throw new Error(errorData.message || '保存级别失败');
            });
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            showToast(isUpdate ? '级别更新成功' : '级别创建成功', 'success');
            
            // 关闭模态框
            const modal = M.Modal.getInstance(document.getElementById('level-modal'));
            modal.close();
            
            // 重新加载级别列表和下拉框
            loadVocabularyLevels().then(() => {
                updateLevelDropdowns();
                loadLevels();
            });
        } else {
            throw new Error(data.message || '保存级别失败');
        }
    })
    .catch(error => {
        console.error('保存级别失败:', error);
        showToast('保存失败: ' + error.message, 'error');
    })
    .finally(() => {
        hideLoading();
    });
}

/**
 * 保存章节信息
 */
function saveChapter() {
    // 获取表单数据
    const chapterId = document.getElementById('chapter-id').value;
    const name = document.getElementById('chapter-name').value;
    const description = document.getElementById('chapter-description').value;
    const levelId = document.getElementById('chapter-level-select').value;
    const orderNum = parseInt(document.getElementById('chapter-order').value) || 1;
    
    // 验证必填字段
    if (!name) {
        showToast('章节名称不能为空', 'error');
        return;
    }
    
    if (!levelId) {
        showToast('请选择所属级别', 'error');
        return;
    }
    
    // 显示加载动画
    showLoading('保存章节...');
    
    // 准备请求数据
    const chapterData = {
        name: name,
        description: description,
        level_id: parseInt(levelId),
        order_num: orderNum
    };
    
    // 判断是新增还是更新
    const isUpdate = chapterId ? true : false;
    
    // API URL
    let url = API_BASE_URL + API_ENDPOINTS.CHAPTERS;
    if (isUpdate) {
        url += '/' + chapterId;
    }
    
    // 发送请求
    fetch(url, {
        method: isUpdate ? 'PUT' : 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + token
        },
        body: JSON.stringify(chapterData)
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(errorData => {
                throw new Error(errorData.message || '保存章节失败');
            });
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            showToast(isUpdate ? '章节更新成功' : '章节创建成功', 'success');
            
            // 关闭模态框
            const modal = M.Modal.getInstance(document.getElementById('chapter-modal'));
            modal.close();
            
            // 重新加载章节列表
            loadChapters();
        } else {
            throw new Error(data.message || '保存章节失败');
        }
    })
    .catch(error => {
        console.error('保存章节失败:', error);
        showToast('保存失败: ' + error.message, 'error');
    })
    .finally(() => {
        hideLoading();
    });
}

/**
 * 加载章节列表
 * @param {Object} filters - 过滤条件
 * @returns {Promise} Promise对象
 */
function loadChapters(filters = {}) {
    // 显示加载动画
    showLoading('加载章节...');
    
    // 构建URL
    let url = API_BASE_URL + API_ENDPOINTS.CHAPTERS;
    
    // 添加过滤条件
    if (filters.levelId) {
        url += `?levelId=${filters.levelId}`;
    }
    
    return fetch(url, {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('获取章节失败');
        }
        return response.json();
    })
    .then(data => {
        // 清空表格
        const tbody = document.getElementById('chapters-tbody');
        if (!tbody) {
            console.warn('未找到章节表格体元素');
            return [];
        }
        
        tbody.innerHTML = '';
        
        // 填充表格
        const chapters = data.chapters || [];
        
        if (chapters.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="center-align">暂无章节数据</td></tr>';
        } else {
            chapters.forEach(chapter => {
                const tr = document.createElement('tr');
                
                // ID
                const tdId = document.createElement('td');
                tdId.textContent = chapter.id;
                tr.appendChild(tdId);
                
                // 章节名称
                const tdName = document.createElement('td');
                tdName.textContent = chapter.name;
                tr.appendChild(tdName);
                
                // 描述
                const tdDescription = document.createElement('td');
                tdDescription.textContent = chapter.description || '-';
                tr.appendChild(tdDescription);
                
                // 所属级别
                const tdLevel = document.createElement('td');
                const level = vocabularyLevels.find(l => l.id === chapter.level_id);
                tdLevel.textContent = level ? level.name : '未知';
                tr.appendChild(tdLevel);
                
                // 排序顺序
                const tdOrder = document.createElement('td');
                tdOrder.textContent = chapter.order_num;
                tr.appendChild(tdOrder);
                
                // 创建时间
                const tdCreateTime = document.createElement('td');
                tdCreateTime.textContent = new Date(chapter.created_at).toLocaleString();
                tr.appendChild(tdCreateTime);
                
                // 操作
                const tdActions = document.createElement('td');
                tdActions.className = 'word-actions';
                
                // 编辑按钮
                const editBtn = document.createElement('button');
                editBtn.className = 'btn-small edit';
                editBtn.innerHTML = '<i class="material-icons">edit</i>编辑';
                editBtn.addEventListener('click', () => editChapter(chapter));
                tdActions.appendChild(editBtn);
                
                // 删除按钮
                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'btn-small delete';
                deleteBtn.innerHTML = '<i class="material-icons">delete</i>删除';
                deleteBtn.addEventListener('click', () => showDeleteConfirmation('chapter', chapter.id, `确定要删除章节 "${chapter.name}" 吗？`));
                tdActions.appendChild(deleteBtn);
                
                tr.appendChild(tdActions);
                tbody.appendChild(tr);
            });
        }
        
        hideLoading();
        return chapters;
    })
    .catch(error => {
        console.error('加载章节失败:', error);
        
        // 在表格中显示错误信息
        const tbody = document.getElementById('chapters-tbody');
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="6" class="center-align red-text">加载失败: ${error.message}</td></tr>`;
        }
        
        hideLoading();
        showToast('加载章节失败: ' + error.message, 'error');
    });
}

/**
 * 过滤章节列表
 */
function filterChapters() {
    // 获取级别筛选条件
    const levelId = document.getElementById('chapter-level-filter').value;
    
    // 构建过滤条件对象
    const filters = {};
    if (levelId) filters.levelId = levelId;
    
    // 重新加载章节列表
    loadChapters(filters);
}

/**
 * 显示删除确认对话框
 * @param {string} type - 删除类型（word/level/chapter）
 * @param {number} id - 要删除的项ID
 * @param {string} message - 确认消息
 */
function showDeleteConfirmation(type, id, message) {
    // 设置确认消息
    document.getElementById('delete-message').textContent = message;
    
    // 设置确认按钮点击事件
    const confirmButton = document.getElementById('btn-confirm-delete');
    confirmButton.onclick = () => {
        // 关闭模态框
        const modal = M.Modal.getInstance(document.getElementById('delete-modal'));
        modal.close();
        
        // 根据类型执行不同的删除操作
        switch (type) {
            case 'word':
                deleteWord(id);
                break;
            case 'level':
                deleteLevel(id);
                break;
            case 'chapter':
                deleteChapter(id);
                break;
            default:
                showToast('未知删除类型', 'error');
        }
    };
    
    // 打开模态框
    const modal = M.Modal.getInstance(document.getElementById('delete-modal'));
    modal.open();
}

/**
 * 删除单词
 * @param {number} wordId - 要删除的单词ID
 */
function deleteWord(wordId) {
    showLoading('删除单词...');
    
    fetch(API_BASE_URL + API_ENDPOINTS.WORDS_MANAGE + '/' + wordId, {
        method: 'DELETE',
        headers: {
            'Authorization': 'Bearer ' + token
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('删除单词失败');
        }
        return response.json();
    })
    .then(data => {
        hideLoading();
        showToast('单词已删除', 'success');
        
        // 重新加载单词列表
        loadWords(currentPage, pageSize);
    })
    .catch(error => {
        console.error('删除单词失败:', error);
        hideLoading();
        showToast(`删除失败: ${error.message}`, 'error');
    });
}

/**
 * 删除级别
 * @param {number} levelId - 要删除的级别ID
 */
function deleteLevel(levelId) {
    showLoading('删除级别...');
    
    fetch(API_BASE_URL + API_ENDPOINTS.VOCABULARY_LEVELS + '/' + levelId, {
        method: 'DELETE',
        headers: {
            'Authorization': 'Bearer ' + token
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('删除级别失败');
        }
        return response.json();
    })
    .then(data => {
        hideLoading();
        showToast('级别已删除', 'success');
        
        // 重新加载级别列表和下拉框
        loadVocabularyLevels().then(() => {
            updateLevelDropdowns();
            loadLevels();
        });
    })
    .catch(error => {
        console.error('删除级别失败:', error);
        hideLoading();
        showToast(`删除失败: ${error.message}`, 'error');
    });
}

// 添加一个测试函数检测API是否可用
function testDirectAPI() {
    // 显示正在测试的消息
    showLoading('正在测试API...');
    
    // 直接通过fetch测试单词API
    return fetch('https://www.sanjinai.cn:5000/api/chapters/1/words')
        .then(response => {
            if (!response.ok) {
                return response.text().then(text => {
                    console.log('API返回:', text);
                    throw new Error(`API测试失败: ${response.status}`);
                });
            }
            return response.json();
        })
        .then(data => {
            console.log('API测试成功，返回数据:', data);
            hideLoading();
            showToast('API测试成功', 'success');
            
            // 显示数据
            const words = Array.isArray(data) ? data : [];
            
            // 在表格中显示测试结果
            displayWords(words);
            
            return words;
        })
        .catch(error => {
            console.error('API测试失败:', error);
            hideLoading();
            showToast(`API测试失败: ${error.message}`, 'error');
        });
}

/**
 * 针对API问题的解决方案处理和显示单词数据
 * @param {Array} words - 单词数据数组
 */
function displayWords(words) {
    // 更新总记录数
    totalWords = words.length;
    
    // 清空表格
    const tbody = document.getElementById('vocabulary-tbody');
    if (!tbody) {
        console.warn('未找到vocabulary-tbody元素');
        return;
    }
    
    tbody.innerHTML = '';
    
    // 填充表格
    if (words.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="center-align">暂无单词数据</td></tr>';
    } else {
        words.forEach(word => {
            const tr = document.createElement('tr');
            
            // ID
            const tdId = document.createElement('td');
            tdId.textContent = word.id || '无ID';
            tr.appendChild(tdId);
            
            // 单词
            const tdWord = document.createElement('td');
            tdWord.textContent = word.word || '无单词';
            tr.appendChild(tdWord);
            
            // 音标 - 处理可能缺失的phonetic字段
            const tdPhonetic = document.createElement('td');
            tdPhonetic.textContent = word.phonetic || '-';
            tr.appendChild(tdPhonetic);
            
            // 含义 - 确保优先使用meaning字段
            const tdDefinition = document.createElement('td');
            tdDefinition.textContent = word.meaning || word.definition || '-';
            tr.appendChild(tdDefinition);
            
            // 所属章节 - 添加默认值
            const tdChapter = document.createElement('td');
            tdChapter.textContent = word.chapter_name || '默认章节';
            tr.appendChild(tdChapter);
            
            // 操作
            const tdActions = document.createElement('td');
            tdActions.className = 'word-actions';
            
            // 编辑按钮
            const editBtn = document.createElement('button');
            editBtn.className = 'btn-small edit';
            editBtn.innerHTML = '<i class="material-icons">edit</i>编辑';
            editBtn.addEventListener('click', () => editWord(word));
            tdActions.appendChild(editBtn);
            
            // 删除按钮
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'btn-small delete';
            deleteBtn.innerHTML = '<i class="material-icons">delete</i>删除';
            deleteBtn.addEventListener('click', () => showDeleteConfirmation('word', word.id, `确定要删除单词 "${word.word}" 吗？`));
            tdActions.appendChild(deleteBtn);
            
            tr.appendChild(tdActions);
            tbody.appendChild(tr);
        });
    }
    
    // 更新分页
    updatePagination(1, Math.ceil(totalWords / 20));
}

// 添加直接API测试函数
function directAPITest() {
    showLoading('测试API中...');
    
    // 尝试直接用fetch测试API
    fetch('https://www.sanjinai.cn:5000/api/chapters/1/words', {
        method: 'GET', 
        headers: {
            'Accept': 'application/json'
        }
    })
    .then(response => {
        if (!response.ok) {
            return response.text().then(text => {
                console.log('API返回:', text);
                throw new Error(`API测试失败: ${response.status}`);
            });
        }
        return response.json();
    })
    .then(data => {
        console.log('API测试成功，数据:', data);
        
        // 显示测试结果
        const resultContainer = document.getElementById('test-result');
        if (!resultContainer) {
            const container = document.createElement('div');
            container.id = 'test-result';
            container.className = 'card-panel';
            container.style.margin = '20px';
            document.querySelector('.container').appendChild(container);
        }
        
        const container = document.getElementById('test-result');
        container.innerHTML = `
            <h5>API测试结果</h5>
            <p>API状态: <span class="green-text">成功</span></p>
            <p>返回数据: ${JSON.stringify(data, null, 2)}</p>
            <p>解决方法: 修改服务器端app.js，将查询中的w.phonetic改为w.pronunciation</p>
            <pre class="code grey lighten-4 z-depth-1" style="padding: 10px;">
const query = \`
    SELECT w.id, w.word, w.definition, w.pronunciation AS phonetic, wm.order_num
    FROM Words w
    JOIN WordMappings wm ON w.id = wm.word_id
    WHERE wm.chapter_id = ?
    ORDER BY wm.order_num
\`;
            </pre>
        `;
        
        hideLoading();
        showToast('API测试成功', 'success');
    })
    .catch(error => {
        console.error('API测试失败:', error);
        
        // 创建或更新测试结果容器
        const resultContainer = document.getElementById('test-result');
        if (!resultContainer) {
            const container = document.createElement('div');
            container.id = 'test-result';
            container.className = 'card-panel';
            container.style.margin = '20px';
            document.querySelector('.container').appendChild(container);
        }
        
        const container = document.getElementById('test-result');
        container.innerHTML = `
            <h5>API测试结果</h5>
            <p>API状态: <span class="red-text">失败</span></p>
            <p>错误信息: ${error.message}</p>
            <p>原因: 服务器代码中查询使用了不存在的列名 'w.phonetic'，而数据库中的列名是 'w.pronunciation'</p>
            <p>解决方法: 修改服务器端app.js，将查询中的w.phonetic改为w.pronunciation</p>
            <pre class="code grey lighten-4 z-depth-1" style="padding: 10px;">
const query = \`
    SELECT w.id, w.word, w.definition, w.pronunciation AS phonetic, wm.order_num
    FROM Words w
    JOIN WordMappings wm ON w.id = wm.word_id
    WHERE wm.chapter_id = ?
    ORDER BY wm.order_num
\`;
            </pre>
        `;
        
        hideLoading();
        showToast(`API测试失败: ${error.message}`, 'error');
    });
}

// 根据级别加载章节
async function loadChaptersByLevel(levelId) {
    try {
        const chapterSelect = document.getElementById('chapter-filter');
        if (!chapterSelect) {
            console.error('章节选择器元素未找到');
            return;
        }

        // 清空现有选项
        chapterSelect.innerHTML = '<option value="">所有章节</option>';

        // 如果没有选择级别,则不加载章节
        if (!levelId) {
            M.FormSelect.init(chapterSelect);
            return;
        }

        // 移除可能的旧提示按钮
        const existingButton = document.getElementById('quick-add-chapter-btn');
        if (existingButton) {
            existingButton.remove();
        }

        const token = localStorage.getItem('authToken');
        if (!token) {
            throw new Error('未登录');
        }

        console.log(`正在加载级别ID为${levelId}的章节`);
        
        // 使用API获取章节
        const response = await fetch(`${API_BASE_URL}/vocabulary-levels/${levelId}/chapters`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('加载章节失败');
        }

        const data = await response.json();
        if (!data.success) {
            throw new Error(data.message || '加载章节失败');
        }

        console.log(`获取到${data.chapters.length}个章节:`, data.chapters);

        // 检查是否有章节数据
        if (data.chapters.length === 0) {
            // 添加提示信息
            const option = document.createElement('option');
            option.value = "";
            option.textContent = "暂无章节数据，请先创建章节";
            option.disabled = true;
            option.selected = true;
            chapterSelect.appendChild(option);
            
            // 添加快速创建章节按钮
            const chapterDropdownParent = chapterSelect.parentElement;
            const addBtn = document.createElement('button');
            addBtn.id = 'quick-add-chapter-btn';
            addBtn.className = 'btn-small waves-effect waves-light';
            addBtn.style.marginLeft = '10px';
            addBtn.style.height = '36px';
            addBtn.innerHTML = '<i class="material-icons left">add</i>创建章节';
            addBtn.onclick = () => {
                // 重置章节表单
                document.getElementById('chapter-form').reset();
                document.getElementById('chapter-id').value = '';
                
                // 选择正确的级别
                const chapterLevelSelect = document.getElementById('chapter-level-select');
                if (chapterLevelSelect) {
                    chapterLevelSelect.value = levelId;
                    M.FormSelect.init(chapterLevelSelect);
                }
                
                // 打开模态框
                const modal = M.Modal.getInstance(document.getElementById('chapter-modal'));
                modal.open();
            };
            
            chapterDropdownParent.appendChild(addBtn);
            
            // 显示提示
            showToast('当前级别没有章节数据，请先创建章节', 'info');
        } else {
            // 添加章节选项
            data.chapters.forEach(chapter => {
                const option = document.createElement('option');
                option.value = chapter.id;
                option.textContent = chapter.name;
                chapterSelect.appendChild(option);
            });
        }

        // 重新初始化 Materialize 下拉菜单
        M.FormSelect.init(chapterSelect);

    } catch (error) {
        console.error('加载章节失败:', error);
        showToast(error.message, 'error');
    }
}

// 初始化筛选器
async function initializeFilters() {
    try {
        // 获取筛选器元素
        const levelSelect = document.getElementById('level-filter');
        const chapterSelect = document.getElementById('chapter-filter');
        
        // 确保元素存在
        if (!levelSelect || !chapterSelect) {
            console.error('筛选器元素未找到');
            return;
        }

        // 获取token
        const token = localStorage.getItem('authToken');
        if (!token) {
            throw new Error('未登录');
        }

        // 加载词汇级别
        const response = await fetch(`${API_BASE_URL}/vocabulary-levels`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('加载级别失败');
        }

        const data = await response.json();
        if (!data.success) {
            throw new Error(data.message || '加载级别失败');
        }

        // 清空现有选项
        levelSelect.innerHTML = '<option value="">全部级别</option>';
        
        // 添加级别选项
        data.levels.forEach(level => {
            const option = document.createElement('option');
            option.value = level.id;
            option.textContent = level.name;
            levelSelect.appendChild(option);
        });

        // 如果有级别数据,选择第一个级别
        if (data.levels.length > 0) {
            levelSelect.selectedIndex = 1; // 选择第一个实际的级别（索引0是"全部级别"）
            // 加载该级别的章节
            await loadChaptersByLevel(data.levels[0].id);
        }

        // 初始化 Materialize 下拉菜单
        M.FormSelect.init(levelSelect);
        M.FormSelect.init(chapterSelect);

        // 添加事件监听器
        levelSelect.addEventListener('change', async (e) => {
            const levelId = e.target.value;
            await loadChaptersByLevel(levelId);
            filterWords();
        });

        chapterSelect.addEventListener('change', filterWords);
        
        // 为搜索输入框添加防抖
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.addEventListener('input', debounce(filterWords, 500));
        }

    } catch (error) {
        console.error('初始化筛选器失败:', error);
        showToast(error.message, 'error');
    }
}

// 初始化函数
async function initializeVocabularyManager() {
    try {
        showLoading('正在初始化...');
        
        // 检查登录状态
        const token = localStorage.getItem('authToken');
        if (!token) {
            window.location.href = 'login.html';
            return;
        }

        // 初始化 Materialize 组件
        M.AutoInit();
        
        // 加载词汇级别
        const levelResponse = await fetch(`${API_BASE_URL}/vocabulary-levels`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!levelResponse.ok) {
            throw new Error('加载词汇级别失败');
        }
        
        const levelData = await levelResponse.json();
        console.log('加载到的词汇级别数据:', levelData);
        
        if (!levelData.success || !levelData.levels || levelData.levels.length === 0) {
            showToast('没有找到词汇级别数据,请联系管理员', 'error');
            return;
        }

        // 更新全局变量
        vocabularyLevels = levelData.levels || [];
        
        // 同时更新所有级别下拉框
        await updateAllLevelSelects(levelData.levels);

        // 更新级别下拉框
        const levelSelect = document.getElementById('level-filter');
        if (levelSelect) {
            levelSelect.innerHTML = '<option value="">全部级别</option>';
            levelData.levels.forEach(level => {
                const option = document.createElement('option');
                option.value = level.id; // 使用级别ID作为值
                option.textContent = level.name;
                levelSelect.appendChild(option);
            });
            
            // 初始化 Materialize 下拉菜单
            M.FormSelect.init(levelSelect);
            
            // 选择第一个级别
            if (levelData.levels.length > 0) {
                levelSelect.selectedIndex = 1;
                M.FormSelect.init(levelSelect);
                
                // 加载该级别的章节
                const firstLevelId = levelData.levels[0].id;
                await loadChaptersByLevel(firstLevelId);
                
                // 更新事件监听器
                levelSelect.addEventListener('change', async (e) => {
                    const levelId = e.target.value;
                    console.log(`级别选择变更: ${levelId}`);
                    
                    if (levelId) {
                        await loadChaptersByLevel(levelId);
                    }
                    filterWords();
                });
                
                // 章节筛选事件监听
                const chapterSelect = document.getElementById('chapter-filter');
                if (chapterSelect) {
                    chapterSelect.addEventListener('change', filterWords);
                }
                
                // 加载单词数据
                filterWords();
            }
        }
        
        hideLoading();
    } catch (error) {
        console.error('初始化失败:', error);
        showToast(error.message, 'error');
        hideLoading();
    }
}

/**
 * 更新所有级别下拉框
 * @param {Array} levels - 级别数据
 */
async function updateAllLevelSelects(levels) {
    // 获取所有需要更新的下拉框
    const levelSelects = [
        document.getElementById('import-level-select'),
        document.getElementById('word-level'),
        document.getElementById('chapter-level-select'),
        document.getElementById('chapter-level-filter')
    ];
    
    // 清空并重新填充每个下拉框
    levelSelects.forEach(select => {
        if (!select) return;
        
        // 清空现有选项
        select.innerHTML = '';
        
        // 添加默认选项
        const defaultOption = document.createElement('option');
        defaultOption.value = "";
        defaultOption.textContent = "选择级别";
        defaultOption.disabled = true;
        defaultOption.selected = true;
        select.appendChild(defaultOption);
        
        // 添加级别选项
        levels.forEach(level => {
            const option = document.createElement('option');
            option.value = level.id; // 使用级别ID作为值
            option.textContent = level.name;
            select.appendChild(option);
        });
        
        // 刷新MaterializeCSS组件
        M.FormSelect.init(select);
    });
}

/**
 * 加载指定级别的章节
 * @param {number} levelId - 词汇级别ID
 */
async function loadChapters(levelId) {
    // 直接调用已有的loadChaptersByLevel函数
    await loadChaptersByLevel(levelId);
}

function handleChapterChange() {
    const chapterSelect = document.getElementById('chapter-filter');
    const levelSelect = document.getElementById('level-filter');
    
    if (!chapterSelect || !levelSelect) {
        console.error('无法找到章节或级别选择器');
        return;
    }
    
    // 获取当前选中的级别和章节
    const levelId = parseInt(levelSelect.value, 10);
    const chapterId = chapterSelect.value ? parseInt(chapterSelect.value, 10) : null;

    console.log(`筛选条件变更: 级别ID=${levelId}, 章节ID=${chapterId}`);
    
    // 如果有选择章节，则加载该章节的单词
    if (chapterId) {
        loadWordsByChapter(chapterId);
    } 
    // 否则加载整个级别的单词
    else if (levelId) {
        loadWordsByLevel(levelId);
    } 
    // 如果都没有选择，则加载所有单词
    else {
        loadAllWords();
    }
}

/**
 * 加载特定章节的单词
 * @param {number|string} chapterId - 章节ID
 */
function loadWordsByChapter(chapterId) {
    // 显示加载动画
    showLoading('加载章节单词...');
    
    // 确保章节ID是URL编码的
    const encodedChapterId = encodeURIComponent(chapterId);
    
    // 构建API URL
    const url = `${API_BASE_URL}/chapters/${encodedChapterId}/words`;
    
    console.log('请求章节单词URL:', url);
    
    // 发送API请求
    fetch(url, {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
        }
    })
    .then(response => {
        if (!response.ok) {
            return response.text().then(text => {
                try {
                    // 尝试解析为JSON
                    const errorData = JSON.parse(text);
                    console.error('API错误:', errorData);
                    throw new Error(`获取章节单词失败：${response.status} - ${errorData.message || '未知错误'}`);
                } catch (e) {
                    // 如果不是JSON，返回原始文本
                    console.error('API错误:', text);
                    throw new Error(`获取章节单词失败：${response.status}`);
                }
            });
        }
        return response.json();
    })
    .then(data => {
        console.log('获取章节单词成功:', data);
        
        if (!data.success) {
            throw new Error(data.message || '获取章节单词失败');
        }
        
        // 更新总记录数
        totalWords = data.words.length;
        
        // 处理并显示单词
        displayWords(data.words);
        
        // 更新分页
        updatePagination(1, Math.ceil(totalWords / 20));
        
        hideLoading();
        
        // 如果没有单词，显示提示消息
        if (data.words.length === 0) {
            showToast('该章节暂无单词，请先添加单词', 'info');
            
            // 清空表格并显示提示
            const tbody = document.getElementById('vocabulary-tbody');
            if (tbody) {
                tbody.innerHTML = `<tr><td colspan="6" class="center-align">该章节暂无单词，可以点击"添加单词"按钮添加</td></tr>`;
            }
        }
    })
    .catch(error => {
        console.error('加载章节单词失败:', error);
        
        // 在表格中显示错误信息
        const tbody = document.getElementById('vocabulary-tbody');
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="6" class="center-align red-text">加载失败: ${error.message}</td></tr>`;
        }
        
        showToast('加载章节单词失败: ' + error.message, 'error');
        hideLoading();
    });
}