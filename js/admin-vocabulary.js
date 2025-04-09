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
let token = localStorage.getItem('admin_token');
let currentPage = 1;
let pageSize = 20;
let totalWords = 0;
let vocabularyLevels = [];
let currentLevelId = null;
let excelData = null;

/**
 * 页面加载时初始化
 */
document.addEventListener('DOMContentLoaded', () => {
    // 初始化MaterializeCSS组件
    initializeMaterialize();
    
    // 检查登录状态
    checkLoginStatus();
    
    // 设置事件监听器
    setupEventListeners();
    
    // 加载初始数据
    loadInitialData();
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
    
    // 初始化文本域
    const textareas = document.querySelectorAll('.materialize-textarea');
    M.textareaAutoResize(textareas);
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
        localStorage.removeItem('admin_token');
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
}

/**
 * 加载初始数据
 */
function loadInitialData() {
    showLoading('加载数据中...');
    
    // 加载词汇级别
    loadVocabularyLevels()
        .then(() => {
            // 更新所有级别选择框
            updateLevelDropdowns();
            
            // 加载单词数据
            return loadWords();
        })
        .then(() => {
            // 加载章节数据
            return loadChapters();
        })
        .catch(error => {
            console.error('加载初始数据失败:', error);
            showToast('加载数据失败: ' + error.message, 'error');
        })
        .finally(() => {
            hideLoading();
        });
}

/**
 * 加载词汇级别列表
 * @returns {Promise} Promise对象
 */
function loadVocabularyLevels() {
    return fetch(API_BASE_URL + API_ENDPOINTS.VOCABULARY_LEVELS)
        .then(response => {
            if (!response.ok) {
                throw new Error('获取词汇级别失败');
            }
            return response.json();
        })
        .then(data => {
            vocabularyLevels = data.levels || [];
            console.log('已加载词汇级别:', vocabularyLevels);
            return vocabularyLevels;
        });
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
    // 构建URL
    let url = API_BASE_URL + API_ENDPOINTS.WORDS_SEARCH + `?page=${page}&size=${size}`;
    
    // 添加过滤条件
    if (filters.query) {
        url += `&query=${encodeURIComponent(filters.query)}`;
    }
    if (filters.levelId) {
        url += `&levelId=${filters.levelId}`;
    }
    if (filters.chapterId) {
        url += `&chapterId=${filters.chapterId}`;
    }
    
    // 显示加载动画
    showLoading('加载单词...');
    
    return fetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error('获取单词失败');
            }
            return response.json();
        })
        .then(data => {
            // 更新总记录数
            totalWords = data.total || 0;
            
            // 清空表格
            const tbody = document.getElementById('vocabulary-tbody');
            tbody.innerHTML = '';
            
            // 填充表格
            const words = data.words || [];
            words.forEach(word => {
                const tr = document.createElement('tr');
                
                // ID
                const tdId = document.createElement('td');
                tdId.textContent = word.id;
                tr.appendChild(tdId);
                
                // 单词
                const tdWord = document.createElement('td');
                tdWord.textContent = word.word;
                tr.appendChild(tdWord);
                
                // 音标
                const tdPhonetic = document.createElement('td');
                tdPhonetic.textContent = word.phonetic || '-';
                tr.appendChild(tdPhonetic);
                
                // 含义
                const tdDefinition = document.createElement('td');
                tdDefinition.textContent = word.definition;
                tr.appendChild(tdDefinition);
                
                // 所属章节
                const tdChapter = document.createElement('td');
                tdChapter.textContent = word.chapter_name || '-';
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
            
            // 更新分页
            updatePagination(page, Math.ceil(totalWords / size));
            
            return words;
        })
        .catch(error => {
            console.error('加载单词失败:', error);
            showToast('加载单词失败: ' + error.message, 'error');
        })
        .finally(() => {
            hideLoading();
        });
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
    // 获取筛选条件
    const levelId = document.getElementById('level-filter').value;
    const chapterId = document.getElementById('chapter-filter').value;
    const query = document.getElementById('word-search').value;
    
    // 构建过滤条件对象
    const filters = {};
    if (query) filters.query = query;
    if (levelId) filters.levelId = levelId;
    if (chapterId) filters.chapterId = chapterId;
    
    // 重新加载单词列表
    loadWords(1, pageSize, filters);
}

/**
 * 搜索单词
 */
function searchWords() {
    filterWords();
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
    localStorage.removeItem('admin_token');
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
        meaning: word.definition, // 确保使用后端接受的字段名"meaning"
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
    const chapterId = document.getElementById('word-chapter').value;
    
    if (!word || !definition || !chapterId) {
        showToast('单词、释义和章节不能为空', 'error');
        return;
    }
    
    // 准备请求数据，确保字段名与后端一致
    const requestData = {
        word: word,
        phonetic: phonetic || '',
        definition: definition, // 前端使用definition字段
        chapter_id: parseInt(chapterId)
    };
    
    // ... 其余部分保持不变
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