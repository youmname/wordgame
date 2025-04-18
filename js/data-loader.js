/**
 * 数据加载模块
 * 负责从各种源加载单词数据，包括API、Excel文件等
 */
const WordDataLoader = {
    // 存储Excel数据
    excelData: {},
    
    // 存储不同数据源的数据
    sourceData: {
        chapter: {},
        upload: {},
        random: {},
        custom: {},
        diy: {} // 添加diy数据源类型
    },
    
    // 当前数据源
    currentSource: null,
    
    // 当前选中的级别ID
    currentLevelId: null,
    
    // 存储所有级别数据
    levelsData: [],
    
    // API端点设置
    apiSettings: {
        baseUrl: 'http://175.24.181.59', // 默认API基础URL
        endpoints: {
            levels: '/api/levels',           // 获取级别列表
            chapters: '/api/chapters',       // 获取章节列表
            levelChapters: '/api/levels/{id}/chapters', // 获取指定级别下的章节
            words: '/api/chapters/{id}/words' // 获取指定章节下的单词
        }
    },
    
    /**
     * 初始化数据加载器
     */
    init(options = {}) {
        // 合并API配置
        if (options.apiUrl) {
            this.apiSettings.baseUrl = options.apiUrl;
        }
        
        // 监听Excel文件上传
        const excelUploadElem = document.getElementById('excel-upload');
        if (excelUploadElem) {
            excelUploadElem.addEventListener('change', this.handleExcelUpload.bind(this));
        }
        
        // 监听DIY页面的Excel上传
        const diyExcelUploadElem = document.getElementById('excelUpload');
        if (diyExcelUploadElem) {
            diyExcelUploadElem.addEventListener('change', this.handleDiyExcelUpload.bind(this));
            console.log('DIY页面Excel上传功能已初始化');
        }

        // DIY页面确认按钮
        const confirmBtn = document.querySelector('.confirm-btn');
        if (confirmBtn) {
            confirmBtn.addEventListener('click', this.handleDiyConfirmInput.bind(this));
            console.log('DIY页面确认按钮功能已初始化');
        }
        
        // 监听数据源选择
        const sourceInputs = document.querySelectorAll('input[name="data-source"]');
        if (sourceInputs.length > 0) {
            sourceInputs.forEach(radio => {
            radio.addEventListener('change', this.handleDataSourceChange.bind(this));
        });
        } else {
            console.log('没有找到数据源选择按钮');
        }
        
        // 寻找级别选择器
        const levelSelect = document.getElementById('level-select');
        if (levelSelect) {
            // 如果找到级别选择器，首先加载级别数据
            levelSelect.addEventListener('change', this.handleLevelChange.bind(this));
            this.loadAndDisplayLevels();
        } else {
            // 如果没有找到级别选择器，则直接加载章节数据（兼容旧版）
            this.updateChapterSelectWithApiData();
        }
        
        // 为"使用示例"按钮添加事件监听
        const sampleBtn = document.getElementById('sample-btn');
        if (sampleBtn) {
            sampleBtn.addEventListener('click', () => {
                const wordInput = document.getElementById('word-input');
                if (wordInput) {
                    wordInput.value = WordConfig.SAMPLE_DATA;
                }
            });
        }
        
        console.log('WordDataLoader初始化完成', this.apiSettings);
    },
    
    /**
     * 处理DIY页面的Excel上传
     */
    handleDiyExcelUpload(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        console.log('DIY页面接收到Excel文件:', file.name);
        
        // 显示加载状态
        const button = document.querySelector('.confirm-btn');
        if (button) button.classList.add('loading');
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                if (typeof XLSX === 'undefined') {
                    console.error('XLSX库未加载');
                    alert('Excel解析库未加载，请刷新页面重试');
                    if (button) button.classList.remove('loading');
                    return;
                }
                
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, {
                    type: 'array',
                    cellDates: true
                });
                
                // 清空现有数据
                this.sourceData.diy = {};
                
                // 处理每个工作表
                workbook.SheetNames.forEach(sheetName => {
                    const sheet = workbook.Sheets[sheetName];
                    const json = XLSX.utils.sheet_to_json(sheet);
                    
                    if (json.length === 0) {
                        console.warn(`工作表 ${sheetName} 没有数据，跳过`);
                        return;
                    }
                    
                    // 检查第一行数据的格式
                    const firstRow = json[0];
                    
                    // 找出表头列名
                    let wordColumnName = null;
                    let defColumnName = null;
                    
                    // 尝试常见名称
                    const wordKeywords = ['单词', 'word', '词汇', 'term', 'vocabulary'];
                    const defKeywords = ['定义', 'definition', 'def', '释义', '解释', '中文', 'meaning', '翻译', 'translation'];
                    
                    // 尝试查找匹配的列名
                    for (const key of Object.keys(firstRow)) {
                        const keyLower = key.toLowerCase();
                        
                        // 检查是否匹配任何单词关键词
                        if (!wordColumnName && wordKeywords.some(keyword => keyLower.includes(keyword))) {
                            wordColumnName = key;
                        }
                        
                        // 检查是否匹配任何定义关键词
                        if (!defColumnName && defKeywords.some(keyword => keyLower.includes(keyword))) {
                            defColumnName = key;
                        }
                    }
                    
                    // 如果没找到匹配，尝试使用第一列和第二列
                    if (!wordColumnName && !defColumnName && Object.keys(firstRow).length >= 2) {
                        const keys = Object.keys(firstRow);
                        wordColumnName = keys[0];
                        defColumnName = keys[1];
                    }
                    
                    if (!wordColumnName || !defColumnName) {
                        console.error(`工作表 ${sheetName} 缺少单词或定义列`);
                        return;
                    }
                    
                    // 提取单词和定义
                    const wordList = [];
                    json.forEach(row => {
                        const word = (row[wordColumnName] || '').toString();
                        let definition = (row[defColumnName] || '').toString();
                        
                        // 处理HTML标签
                        definition = definition.replace(/<br>/g, ' ');
                        
                        if (word && definition) {
                            wordList.push({ word, definition });
                        }
                    });
                    
                    if (wordList.length > 0) {
                        this.sourceData.diy[sheetName] = wordList;
                    }
                });
                
                // 检查是否成功解析了数据
                const totalSheets = Object.keys(this.sourceData.diy).length;
                if (totalSheets === 0) {
                    throw new Error("未能从Excel中提取有效数据，请检查文件格式");
                }
                
                // 计算总单词数
                const totalWords = Object.values(this.sourceData.diy).reduce((sum, words) => sum + words.length, 0);
                
                // 显示成功提示
                const filePreview = document.querySelector('.file-preview');
                if (filePreview) {
                    filePreview.textContent = `导入成功! 共${totalSheets}个表格，${totalWords}个单词`;
                    filePreview.classList.add('active');
                }
                
                // 完成导入后，保存到localStorage
                this.saveDiyDataToStorage();
            } catch (err) {
                console.error("Excel解析错误:", err);
                alert('Excel文件解析失败: ' + err.message);
            } finally {
                if (button) button.classList.remove('loading');
            }
        };
        
        reader.onerror = () => {
            console.error("文件读取错误");
            alert('文件读取错误，请重试');
            if (button) button.classList.remove('loading');
        };
        
        // 读取文件
        reader.readAsArrayBuffer(file);
    },
    
    /**
     * 处理DIY页面的手动输入确认
     */
    handleDiyConfirmInput() {
        const textarea = document.querySelector('.ins-textarea');
        if (!textarea || textarea.value.trim().length === 0) return;
        
        const button = document.querySelector('.confirm-btn');
        if (button) button.classList.add('loading');
        
        try {
            const input = textarea.value.trim();
            // 分析输入内容
            const wordPairs = this.parseCustomInput(input);
            
            if (wordPairs.length === 0) {
                throw new Error('未能解析出有效的单词对');
            }
            
            // 保存到自定义数据源
            this.sourceData.diy = {
                '手动输入': wordPairs
            };
            
            // 显示成功消息
            alert(`成功创建词单，包含${wordPairs.length}个单词`);
            
            // 保存到localStorage
            this.saveDiyDataToStorage();
        } catch (err) {
            console.error('处理自定义输入失败:', err);
            alert('处理失败: ' + err.message);
        } finally {
            if (button) button.classList.remove('loading');
        }
    },
    
    /**
     * 保存DIY数据到localStorage
     */
    saveDiyDataToStorage() {
        try {
            localStorage.setItem('diyWordData', JSON.stringify(this.sourceData.diy));
            console.log('DIY数据已保存到localStorage');
        } catch (err) {
            console.error('保存DIY数据失败:', err);
        }
    },
    
    /**
     * 从localStorage加载DIY数据
     */
    loadDiyDataFromStorage() {
        try {
            const storedData = localStorage.getItem('diyWordData');
            if (storedData) {
                this.sourceData.diy = JSON.parse(storedData);
                console.log('已从localStorage加载DIY数据');
                return true;
            }
        } catch (err) {
            console.error('加载DIY数据失败:', err);
        }
        return false;
    },
    
    /**
     * 解析自定义输入的单词
     * @param {string} input - 用户输入的文本
     * @returns {Array} 单词对象数组
     */
    parseCustomInput(input) {
        if (!input || typeof input !== 'string') {
            return [];
        }
        
        // 尝试多种分隔符
        const lines = input.split(/\r?\n/);
        const wordPairs = [];
        
        lines.forEach(line => {
            if (!line.trim()) return;
            
            // 尝试多种分隔符：制表符、多个空格、逗号、分号等
            let parts = line.split(/\t+/);
            if (parts.length < 2) {
                parts = line.split(/\s{2,}/);
            }
            if (parts.length < 2) {
                parts = line.split(/[,，;；]/);
            }
            if (parts.length < 2) {
                parts = line.split(/\s+/);
            }
            
            if (parts.length >= 2) {
                const word = parts[0].trim();
                // 合并剩余部分作为定义
                const definition = parts.slice(1).join(' ').trim();
                
                if (word && definition) {
                    wordPairs.push({ word, definition });
                }
            }
        });
        
        return wordPairs;
    },
    
    /**
     * 处理数据源选择变更
     */
    handleDataSourceChange(event) {
        // 隐藏所有选择器
        document.getElementById('chapter-selector').style.display = 'none';
        document.getElementById('random-selector').style.display = 'none';
        document.getElementById('custom-input').style.display = 'none';
        document.getElementById('upload-selector').style.display = 'none';
        
        // 显示选中的选择器
        const value = event.target.value;
        
        // 切换数据源前保存当前数据
        if (this.currentSource) {
            console.log(`保存 ${this.currentSource} 数据源的数据`);
            this.sourceData[this.currentSource] = {...this.excelData};
        }
        
        // 切换到新数据源
        this.currentSource = value;
        
        // 恢复该数据源的数据
        if (this.sourceData[value]) {
            console.log(`恢复 ${value} 数据源的数据`);
            this.excelData = {...this.sourceData[value]};
        }
        
        if (value === 'chapter') {
            document.getElementById('chapter-selector').style.display = 'block';
            // 如果没有章节数据，尝试加载
            if (Object.keys(this.excelData).length === 0) {
                this.updateChapterSelectWithApiData();
            }
        } else if (value === 'random') {
            document.getElementById('random-selector').style.display = 'block';
        } else if (value === 'custom') {
            document.getElementById('custom-input').style.display = 'block';
        } else if (value === 'upload') {
            document.getElementById('upload-selector').style.display = 'block';
            // 如果有Excel数据，更新章节选择器
            if (Object.keys(this.excelData).length > 0) {
                this.updateChapterSelector();
            }
        }
    },
    
    /**
     * 处理Excel文件上传
     */
    handleExcelUpload(e) {
        const file = e.target.files[0];
        if (file) {
            // 显示加载动画
            if (WordUtils && WordUtils.LoadingManager) {
            WordUtils.LoadingManager.show('正在解析Excel...');
            }
            
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, {
                        type: 'array',
                        cellDates: true,
                        cellNF: true,
                        cellText: true
                    });
                    
                    console.log("上传的Excel文件包含以下工作表:", workbook.SheetNames);
                    
                    // 清空现有数据
                    this.excelData = {};
                    
                    // 处理每个工作表
                    workbook.SheetNames.forEach(sheetName => {
                        const sheet = workbook.Sheets[sheetName];
                        const json = XLSX.utils.sheet_to_json(sheet);
                        
                        console.log(`工作表 ${sheetName} 数据行数: ${json.length}`);
                        
                        if (json.length === 0) {
                            console.warn(`工作表 ${sheetName} 没有数据，跳过`);
                            return;
                        }
                        
                        // 检查第一行数据的格式
                        const firstRow = json[0];
                        console.log("第一行数据:", firstRow);
                        
                        // 找出表头列名（增强版）
                        let wordColumnName = null;
                        let defColumnName = null;
    
                        // 先尝试常见名称
                        const wordKeywords = ['单词', 'word', '词汇', 'term', 'vocabulary'];
                        const defKeywords = ['定义', 'definition', 'def', '释义', '解释', '中文', 'meaning', '翻译', 'translation'];
    
                        // 尝试查找匹配的列名
                        for (const key of Object.keys(firstRow)) {
                            const keyLower = key.toLowerCase();
                            
                            // 检查是否匹配任何单词关键词
                            if (!wordColumnName && wordKeywords.some(keyword => keyLower.includes(keyword))) {
                                wordColumnName = key;
                            }
                            
                            // 检查是否匹配任何定义关键词
                            if (!defColumnName && defKeywords.some(keyword => keyLower.includes(keyword))) {
                                defColumnName = key;
                            }
                        }
    
                        // 如果没找到匹配，尝试使用第一列和第二列
                        if (!wordColumnName && !defColumnName && Object.keys(firstRow).length >= 2) {
                            console.log("未找到匹配的列名，尝试使用前两列");
                            const keys = Object.keys(firstRow);
                            wordColumnName = keys[0];
                            defColumnName = keys[1];
                        }
    
                        console.log(`选择的单词列: ${wordColumnName}, 定义列: ${defColumnName}`);
                        
                        if (!wordColumnName || !defColumnName) {
                            console.error(`工作表 ${sheetName} 缺少单词或定义列`);
                            if (WordUtils && WordUtils.ErrorManager) {
                            WordUtils.ErrorManager.showToast(`工作表 ${sheetName} 格式错误: 未找到单词或定义列`);
                            }
                            return;
                        }
                        
                        // 提取单词和定义
                        const wordList = [];
                        json.forEach((row, index) => {
                            const word = (row[wordColumnName] || '').toString();
                            let definition = (row[defColumnName] || '').toString();
                            
                            // 处理HTML标签
                            definition = definition.replace(/<br>/g, ' ');
                            
                            // 添加调试信息
                            if (index < 5) { // 只打印前5行作为示例
                                console.log(`行${index + 1}: 单词="${word}", 定义="${definition}"`);
                            }
                            
                            if (word && definition) {
                                wordList.push({ word, definition });
                            } else {
                                console.log(`跳过行${index + 1}: 单词或定义为空`);
                            }
                        });
                        
                        if (wordList.length > 0) {
                            console.log(`工作表${sheetName}提取到${wordList.length}个有效单词`);
                            this.excelData[sheetName] = wordList;
                        } else {
                            console.warn(`工作表${sheetName}没有有效单词`);
                        }
                    });
                    
                    // 检查是否成功解析了数据
                    const totalSheets = Object.keys(this.excelData).length;
                    if (totalSheets === 0) {
                        throw new Error("未能从Excel中提取有效数据，请检查文件格式");
                    }
                    
                    // 更新章节选择器
                    this.updateChapterSelector();
                    
                    if (WordUtils && WordUtils.LoadingManager) {
                    WordUtils.LoadingManager.hide();
                    }
                    
                    // 计算总单词数
                    const totalWords = Object.values(this.excelData).reduce((sum, words) => sum + words.length, 0);
                    if (WordUtils && WordUtils.ErrorManager) {
                    WordUtils.ErrorManager.showToast(`成功加载了 ${totalSheets} 个工作表，共 ${totalWords} 个单词!`, 3000, 'success');
                    }
                    
                    // 显示章节选择器
                    document.getElementById('chapter-selector').style.display = 'block';
                    
                } catch (err) {
                    console.error("Excel解析错误:", err);
                    if (WordUtils && WordUtils.LoadingManager) {
                    WordUtils.LoadingManager.hide();
                    }
                    if (WordUtils && WordUtils.ErrorManager) {
                    WordUtils.ErrorManager.showToast('Excel文件解析失败: ' + err.message);
                    }
                }
            };
            
            reader.onerror = () => {
                console.error("文件读取错误");
                if (WordUtils && WordUtils.LoadingManager) {
                WordUtils.LoadingManager.hide();
                }
                if (WordUtils && WordUtils.ErrorManager) {
                WordUtils.ErrorManager.showToast('文件读取错误，请重试');
                }
            };
            
            // 读取文件
            reader.readAsArrayBuffer(file);
        }
    },

    /**
     * 设置API配置
     * @param {object} config - API配置对象
     */
    setApiConfig(config) {
        if (config.baseUrl) {
            this.apiSettings.baseUrl = config.baseUrl;
        }
        if (config.endpoints) {
            this.apiSettings.endpoints = {...this.apiSettings.endpoints, ...config.endpoints};
        }
        console.log('API配置已更新:', this.apiSettings);
    },
    
    /**
     * 获取API端点URL
     * @param {string} endpointName - 端点名称
     * @param {object} params - 替换参数
     * @returns {string} 完整的API URL
     */
    getApiUrl(endpointName, params = {}) {
        let endpoint = this.apiSettings.endpoints[endpointName];
        
        if (!endpoint) {
            console.error(`未找到端点名称: ${endpointName}`);
            return '';
        }
        
        // 替换路径参数 (例如 {id})
        for (const [key, value] of Object.entries(params)) {
            endpoint = endpoint.replace(`{${key}}`, value);
        }
        
        // 构建完整URL
        return `${this.apiSettings.baseUrl}${endpoint}`;
    },

    /**
     * 从API获取级别列表
     * @returns {Promise<Array>} 级别列表
     */
    async getLevels() {
        try {
            const url = this.getApiUrl('levels');
            console.log(`获取级别列表: ${url}`);
            
            const response = await fetch(url, {
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`获取级别失败: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('获取到级别数据:', data);
            
            // 解析不同的API响应格式
            let levels = [];
            if (Array.isArray(data)) {
                levels = data;
            } else if (data && data.levels && Array.isArray(data.levels)) {
                levels = data.levels;
            } else if (data && data.data && Array.isArray(data.data)) {
                levels = data.data;
            } else {
                console.warn('API返回的级别数据格式不标准');
                return this.getFallbackLevels();
            }
            
            // 确保返回的数据不为空
            if (levels.length === 0) {
                console.warn('API返回的级别数据为空，使用示例数据');
                return this.getFallbackLevels();
            }
            
            return levels;
        } catch (error) {
            console.error('获取级别列表失败:', error);
            return this.getFallbackLevels();
        }
    },
    
    /**
     * 获取示例级别数据（当API请求失败时使用）
     * @returns {Array} 级别列表
     */
    getFallbackLevels() {
        return [
            {
                id: 1,
                name: "初级英语",
                description: "适合英语初学者的基础词汇",
                chapter_count: 8,
                completed_chapters: 3,
                progress: 0.38,
                locked: false,
                difficulty: 1
            },
            {
                id: 2,
                name: "四级英语",
                description: "大学英语四级必备词汇",
                chapter_count: 10,
                completed_chapters: 4,
                progress: 0.4,
                locked: false,
                difficulty: 2
            },
            {
                id: 3,
                name: "六级英语",
                description: "大学英语六级必备词汇",
                chapter_count: 12,
                completed_chapters: 2,
                progress: 0.17,
                locked: false,
                difficulty: 3
            },
            {
                id: 4,
                name: "雅思词汇",
                description: "雅思考试核心词汇",
                chapter_count: 15,
                completed_chapters: 0,
                progress: 0,
                locked: true,
                difficulty: 4
            },
            {
                id: 5,
                name: "托福词汇",
                description: "托福考试必备词汇",
                chapter_count: 15,
                completed_chapters: 0,
                progress: 0,
                locked: true,
                difficulty: 4
            },
            {
                id: 6,
                name: "专业术语",
                description: "各领域专业英语词汇",
                chapter_count: 20,
                completed_chapters: 0,
                progress: 0,
                locked: true,
                difficulty: 5
            }
        ];
    },
    
    /**
     * 获取指定级别下的章节
     * @param {number|string} levelId - 级别ID
     * @returns {Promise<Array>} 章节列表
     */
    async getChaptersByLevel(levelId) {
        try {
            const url = this.getApiUrl('levelChapters', { id: levelId });
            console.log(`获取级别${levelId}的章节: ${url}`);
            
            const response = await fetch(url, {
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`获取章节失败: ${response.status}`);
            }
            
            const data = await response.json();
            console.log(`获取到级别${levelId}的章节数据:`, data);
            
            // 解析不同的API响应格式
            let chapters = [];
            if (Array.isArray(data)) {
                chapters = data;
            } else if (data && data.chapters && Array.isArray(data.chapters)) {
                chapters = data.chapters;
            } else if (data && data.data && Array.isArray(data.data)) {
                chapters = data.data;
            } else {
                console.warn('API返回的章节数据格式不标准');
                return this.getFallbackChapters(levelId);
            }
            
            // 确保返回的数据不为空
            if (chapters.length === 0) {
                console.warn(`API返回的级别${levelId}章节数据为空，使用示例数据`);
                return this.getFallbackChapters(levelId);
            }
            
            return chapters;
        } catch (error) {
            console.error(`获取级别${levelId}的章节失败:`, error);
            return this.getFallbackChapters(levelId);
        }
    },
    
    /**
     * 获取示例章节数据（当API请求失败时使用）
     * @param {number|string} levelId - 级别ID
     * @returns {Array} 章节列表
     */
    getFallbackChapters(levelId) {
        // 根据级别ID返回不同的示例章节
        const levelIdInt = parseInt(levelId);
        
        if (levelIdInt === 1) {
            // 初级英语章节
            return [
                {
                    id: 1,
                    name: "基础单词",
                    word_count: 32,
                    mastered_count: 24,
                    progress: 0.75,
                    locked: false,
                    difficulty: 1
                },
                {
                    id: 2,
                    name: "交通出行",
                    word_count: 40,
                    mastered_count: 30,
                    progress: 0.75,
                    locked: false,
                    difficulty: 1
                },
                {
                    id: 3,
                    name: "饮食健康",
                    word_count: 36,
                    mastered_count: 20,
                    progress: 0.56,
                    locked: false,
                    difficulty: 1
                },
                {
                    id: 4,
                    name: "工作职场",
                    word_count: 45,
                    mastered_count: 15,
                    progress: 0.33,
                    locked: false,
                    difficulty: 2
                },
                {
                    id: 5,
                    name: "科技数码",
                    word_count: 38,
                    mastered_count: 8,
                    progress: 0.21,
                    locked: false,
                    difficulty: 2
                },
                {
                    id: 6,
                    name: "文化艺术",
                    word_count: 42,
                    mastered_count: 0,
                    progress: 0,
                    locked: true,
                    difficulty: 2
                },
                {
                    id: 7,
                    name: "环境生态",
                    word_count: 35,
                    mastered_count: 0,
                    progress: 0,
                    locked: true,
                    difficulty: 3
                },
                {
                    id: 8,
                    name: "教育学术",
                    word_count: 48,
                    mastered_count: 0,
                    progress: 0,
                    locked: true,
                    difficulty: 3
                }
            ];
        } else if (levelIdInt === 2) {
            // 四级英语章节
            return [
                {
                    id: 1,
                    name: "四级核心词汇",
                    word_count: 50,
                    mastered_count: 45,
                    progress: 0.90,
                    locked: false,
                    difficulty: 2
                },
                {
                    id: 2,
                    name: "学术词汇",
                    word_count: 45,
                    mastered_count: 38,
                    progress: 0.84,
                    locked: false,
                    difficulty: 2
                },
                {
                    id: 3,
                    name: "日常交流",
                    word_count: 40,
                    mastered_count: 30,
                    progress: 0.75,
                    locked: false,
                    difficulty: 2
                },
                {
                    id: 4,
                    name: "社会文化",
                    word_count: 55,
                    mastered_count: 25,
                    progress: 0.45,
                    locked: false,
                    difficulty: 3
                },
                {
                    id: 5,
                    name: "科技发展",
                    word_count: 60,
                    mastered_count: 0,
                    progress: 0,
                    locked: true,
                    difficulty: 3
                }
            ];
        } else if (levelIdInt === 3) {
            // 六级英语章节
            return [
                {
                    id: 1,
                    name: "六级基础词汇",
                    word_count: 60,
                    mastered_count: 45,
                    progress: 0.75,
                    locked: false,
                    difficulty: 3
                },
                {
                    id: 2,
                    name: "高频词汇",
                    word_count: 70,
                    mastered_count: 35,
                    progress: 0.50,
                    locked: false,
                    difficulty: 3
                },
                {
                    id: 3,
                    name: "学术写作",
                    word_count: 65,
                    mastered_count: 0,
                    progress: 0,
                    locked: true,
                    difficulty: 4
                }
            ];
        } else if (levelIdInt === 4) {
            // 雅思词汇章节
            return [
                {
                    id: 1,
                    name: "雅思听力词汇",
                    word_count: 65,
                    mastered_count: 0,
                    progress: 0,
                    locked: false,
                    difficulty: 4
                },
                {
                    id: 2,
                    name: "雅思阅读词汇",
                    word_count: 80,
                    mastered_count: 0,
                    progress: 0,
                    locked: true,
                    difficulty: 4
                },
                {
                    id: 3,
                    name: "雅思写作词汇",
                    word_count: 70,
                    mastered_count: 0,
                    progress: 0,
                    locked: true,
                    difficulty: 5
                },
                {
                    id: 4,
                    name: "雅思口语词汇",
                    word_count: 60,
                    mastered_count: 0,
                    progress: 0,
                    locked: true,
                    difficulty: 4
                }
            ];
        } else {
            // 通用章节模板
            const chapterCount = 5;
            const chapters = [];
            
            for (let i = 1; i <= chapterCount; i++) {
                chapters.push({
                    id: i,
                    name: `${levelId}级章节${i}`,
                    word_count: 40 + Math.floor(Math.random() * 30),
                    mastered_count: i === 1 ? 10 : 0,
                    progress: i === 1 ? 0.25 : 0,
                    locked: i > 1,
                    difficulty: Math.ceil(i / 2)
                });
            }
            
            return chapters;
        }
    },
    
    /**
     * 获取指定章节的单词
     * @param {number|string} chapterId - 章节ID
     * @returns {Promise<Array>} 单词列表
     */
    async getWordsByChapter(chapterId) {
        try {
            const url = this.getApiUrl('words', { id: chapterId });
            console.log(`获取章节${chapterId}的单词: ${url}`);
            
            const response = await fetch(url, {
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`获取单词失败: ${response.status}`);
            }
            
            const data = await response.json();
            console.log(`获取到章节${chapterId}的单词数据:`, data);
            
            // 解析不同的API响应格式
            let words = [];
            if (Array.isArray(data)) {
                words = data;
            } else if (data && data.words && Array.isArray(data.words)) {
                words = data.words;
            } else if (data && data.data && Array.isArray(data.data)) {
                words = data.data;
            } else {
                console.warn('API返回的单词数据格式不标准');
                return [];
            }
            
            // 标准化单词格式
            return words.map(word => ({
                word: word.word || word.name || '',
                definition: word.meaning || word.definition || ''
            })).filter(pair => pair.word && pair.definition);
        } catch (error) {
            console.error(`获取章节${chapterId}的单词失败:`, error);
            return [];
        }
    },
    
    /**
     * 随机获取多个章节的单词
     * @param {number} totalCount - 需要的单词总数
     * @param {number} chaptersCount - 需要从多少个章节获取
     * @returns {Promise<Array>} 单词列表
     */
    async getRandomWordsFromMultipleChapters(totalCount = 30, chaptersCount = 4) {
        try {
            // 1. 获取所有级别
            const levels = await this.getLevels();
            if (levels.length === 0) {
                throw new Error('无法获取级别数据');
            }
            
            // 2. 随机选择一个级别
            const randomLevel = levels[Math.floor(Math.random() * levels.length)];
            console.log('随机选择级别:', randomLevel);
            
            // 3. 获取该级别下的所有章节
            const chapters = await this.getChaptersByLevel(randomLevel.id);
            if (chapters.length === 0) {
                throw new Error('选择的级别没有章节');
            }
            
            // 4. 随机选择指定数量的章节，或全部章节（如果总数少于要求数量）
            const shuffledChapters = this.shuffleArray([...chapters]);
            const selectedChapters = shuffledChapters.slice(0, Math.min(chaptersCount, chapters.length));
            console.log('随机选择的章节:', selectedChapters);
            
            // 5. 计算每个章节需要的单词数量（平均分配）
            const wordsPerChapter = Math.ceil(totalCount / selectedChapters.length);
            
            // 6. 从每个章节获取单词
            const allWords = [];
            
            for (const chapter of selectedChapters) {
                const chapterWords = await this.getWordsByChapter(chapter.id);
                
                if (chapterWords.length > 0) {
                    // 随机选择该章节的单词
                    const shuffledWords = this.shuffleArray(chapterWords);
                    const selectedWords = shuffledWords.slice(0, Math.min(wordsPerChapter, chapterWords.length));
                    
                    allWords.push(...selectedWords);
                    console.log(`从章节${chapter.id}获取了${selectedWords.length}个单词`);
                }
            }
            
            // 7. 如果获取的单词总数超出了要求，随机截取
            if (allWords.length > totalCount) {
                return this.shuffleArray(allWords).slice(0, totalCount);
            }
            
            return allWords;
        } catch (error) {
            console.error('随机获取单词失败:', error);
            
            // 如果失败，返回示例单词
            return this.getFallbackWords();
        }
    },
    
    /**
     * 返回备用单词数据（当API请求失败时使用）
     * @returns {Array} 单词列表
     */
    getFallbackWords() {
        // 先尝试使用配置的示例数据
        const sampleData = WordConfig && WordConfig.SAMPLE_DATA;
        if (sampleData) {
            const pairs = this.parseCustomInput(sampleData);
            if (pairs.length > 0) {
                return pairs;
            }
        }
        
        // 如果没有可用的示例数据，返回硬编码的基本单词
        return [
            { word: "abandon", definition: "放弃" },
            { word: "ability", definition: "能力" },
            { word: "absence", definition: "缺席" },
            { word: "accept", definition: "接受" },
            { word: "accident", definition: "事故" },
            { word: "accomplish", definition: "完成" },
            { word: "account", definition: "账户" },
            { word: "accurate", definition: "准确的" },
            { word: "achieve", definition: "达成" },
            { word: "acknowledge", definition: "承认" },
            { word: "acquire", definition: "获得" },
            { word: "adapt", definition: "适应" },
            { word: "addition", definition: "加法" },
            { word: "address", definition: "地址" },
            { word: "adequate", definition: "足够的" },
            { word: "adjust", definition: "调整" }
        ];
    },
    
    /**
     * 打乱数组顺序
     * @param {Array} array - 需要打乱的数组
     * @returns {Array} 打乱后的数组
     */
    shuffleArray(array) {
        const newArray = [...array];
        for (let i = newArray.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
        }
        return newArray;
    },
    
    /**
     * 更新章节选择器
     */
    updateChapterSelector() {
        const chapterSelect = document.getElementById('chapter-select');
        if (!chapterSelect) {
            console.warn('未找到章节选择器元素');
            return;
        }
        
        chapterSelect.innerHTML = '';
        
        Object.keys(this.excelData).forEach(chapter => {
            const wordCount = this.excelData[chapter].length;
            const option = document.createElement('option');
            option.value = chapter;
            option.textContent = `${chapter} (${wordCount}词)`;
            chapterSelect.appendChild(option);
        });
        
        // 自动选择第一个章节
        if (chapterSelect.options.length > 0) {
            chapterSelect.selectedIndex = 0;
        }
        
        // 通知事件系统章节已更新
        if (WordUtils && WordUtils.EventSystem) {
        WordUtils.EventSystem.trigger('chapters:updated', Object.keys(this.excelData));
        }
    },
    
    /**
     * 从API加载章节列表
     * @returns {Promise} 加载结果Promise
     */
    async loadChapterData() {
        if (WordUtils && WordUtils.LoadingManager) {
        WordUtils.LoadingManager.show('正在加载章节列表...');
        }
        
        try {
            const apiUrl = this.getApiUrl('chapters');
            console.log("尝试获取章节列表:", apiUrl);
            
            const response = await fetch(apiUrl);
            
            if (!response.ok) {
                throw new Error(`获取章节失败: ${response.status}`);
            }
            
            const jsonData = await response.json();
            console.log("获取到的章节数据:", jsonData);
            
            // 确保数据格式正确
            let chapters = [];
            if (jsonData && jsonData.success && Array.isArray(jsonData.chapters)) {
                chapters = jsonData.chapters;
            } else if (Array.isArray(jsonData)) {
                chapters = jsonData;
            } else {
                console.error("API返回的数据格式无效:", jsonData);
                throw new Error('API返回的章节数据格式无效');
            }
            
            // 清空现有选项
            const chapterSelect = document.getElementById('chapter-select');
            if (!chapterSelect) {
                console.warn("未找到章节选择器元素");
                return false;
            }
            
            chapterSelect.innerHTML = '';
            
            // 添加新选项
            chapters.forEach(chapter => {
                const option = document.createElement('option');
                option.value = `第${chapter.id}章`;
                option.textContent = `第${chapter.id}章${chapter.word_count ? ` (${chapter.word_count}词)` : ''}`;
                chapterSelect.appendChild(option);
            });
            
            // 触发事件
            if (WordUtils && WordUtils.EventSystem) {
            WordUtils.EventSystem.trigger('chapters:updated', chapters);
            }
            
            if (WordUtils && WordUtils.LoadingManager) {
            WordUtils.LoadingManager.hide();
            }
            return true;
        } catch (error) {
            console.error('获取章节列表失败:', error);
            if (WordUtils && WordUtils.ErrorManager) {
            WordUtils.ErrorManager.showToast('获取章节列表失败，请稍后再试');
            }
            if (WordUtils && WordUtils.LoadingManager) {
            WordUtils.LoadingManager.hide();
            }
            return false;
        }
    },

    /**
     * 加载章节单词数据
     * @param {string} chapterId - 章节ID
     * @returns {Promise<Array>} 单词数组的Promise
     */
    async loadChapterWords(chapterId) {
        // 尝试从已加载的Excel数据中获取
        if (this.excelData[chapterId] && this.excelData[chapterId].length > 0) {
            console.log(`[loadChapterWords] 从本地缓存加载章节 ${chapterId} 的单词`);
            return this.excelData[chapterId];
        }
            
            // 显示加载动画
        if (WordUtils && WordUtils.LoadingManager) {
            WordUtils.LoadingManager.show('正在加载单词...');
        }
        
        try {
            // 解析章节ID
            const chapterId_num = chapterId.replace(/^第(\d+)章$/, "$1");
            if (!chapterId_num || isNaN(Number(chapterId_num))) {
                throw new Error('无效的章节ID');
            }
            
            // 从API获取单词数据
            const words = await this.getWordsByChapter(chapterId_num);
                
                if (words.length === 0) {
                    throw new Error('章节不包含单词数据');
                }
                
                // 更新缓存
            this.excelData[chapterId] = words;
                
                // 隐藏加载动画
            if (WordUtils && WordUtils.LoadingManager) {
                WordUtils.LoadingManager.hide();
            }
                
            console.log(`[loadChapterWords] 成功加载章节 ${chapterId} 的单词，共 ${words.length} 对`);
            return words;
            } catch (error) {
                console.error(`[loadChapterWords] 加载章节 ${chapterId} 单词出错:`, error);
            
            if (WordUtils && WordUtils.LoadingManager) {
                WordUtils.LoadingManager.hide();
            }
                
                // 以更友好的方式提示用户
            if (WordUtils && WordUtils.ErrorManager) {
                WordUtils.ErrorManager.showToast(`加载单词数据失败: ${error.message}`);
            }
                
                // 生成示例单词数据
                console.log('[loadChapterWords] 生成示例单词数据作为备选');
            const fallbackWords = this.getFallbackWords();
            
            // 缓存示例数据
            this.excelData[chapterId] = fallbackWords;
            return fallbackWords;
        }
    },

    /**
     * 使用API数据更新章节选择器
     * @returns {Promise<boolean>} 是否成功更新
     */
    async updateChapterSelectWithApiData() {
        console.log("[updateChapterSelectWithApiData] 开始获取章节数据");
        
        // 先尝试查找级别选择器，如果存在则使用新的加载逻辑
        const levelSelect = document.getElementById('level-select');
        if (levelSelect) {
            this.loadAndDisplayLevels();
            return true;
        }
        
        const selectElement = document.getElementById('chapter-select');
        if (!selectElement) {
            console.error("[updateChapterSelectWithApiData] 找不到章节选择器元素");
            return false;
        }
        
        // 显示加载中动画
        if (WordUtils && WordUtils.LoadingManager) {
            WordUtils.LoadingManager.show('正在加载章节数据...');
        }
        
        try {
            // 使用Promise.race添加超时控制
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('请求超时')), 8000)
            );
            
            // 从API获取章节数据
            console.log("从API获取章节数据...");
            const response = await Promise.race([
                fetch(this.getApiUrl('chapters'), {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }),
                timeoutPromise
            ]);
            
            if (!response.ok) {
                throw new Error(`API请求失败: ${response.status} ${response.statusText}`);
            }
            
            const data = await response.json();
            console.log("[updateChapterSelectWithApiData] API返回数据:", data);
            
            let chapters = [];
            if (Array.isArray(data)) {
                chapters = data;
            } else if (data && data.data && Array.isArray(data.data)) {
                chapters = data.data;
            } else if (data && data.chapters && Array.isArray(data.chapters)) {
                chapters = data.chapters;
            } else {
                console.error("API返回的数据格式不正确:", data);
                throw new Error("API数据格式错误");
            }
            
            // 清空现有选项
            selectElement.innerHTML = '';
            
            // 如果没有章节数据，添加一个提示选项和模拟数据
            if (chapters.length === 0) {
                const option = document.createElement('option');
                option.value = '';
                option.textContent = "暂无可用章节";
                option.disabled = true;
                selectElement.appendChild(option);
                console.warn("[updateChapterSelectWithApiData] 没有可用章节");
                
                // 生成模拟章节数据用于展示功能
                this.generateMockLevels();
                console.log("[updateChapterSelectWithApiData] 已生成模拟章节数据:", Object.keys(this.excelData));
            } else {
                // 同时更新excelData，用于关卡系统
                // 清空原有API数据
                this.excelData = {};
                
                chapters.forEach((chapter, index) => {
                    const option = document.createElement('option');
                    // 使用章节ID作为value
                    const chapterId = chapter.id || index + 1;
                    option.value = `第${chapterId}章`;
                    option.textContent = chapter.name || `第${chapterId}章`;
                    selectElement.appendChild(option);
                    
                    // 将章节ID添加到excelData中，作为关卡系统的数据源
                    this.excelData[`第${chapterId}章`] = [];
                });
                
                console.log("[updateChapterSelectWithApiData] 章节加载完成，已添加到excelData:", Object.keys(this.excelData));
            }

            // 重新初始化下拉框
            if (typeof M !== 'undefined' && M.FormSelect) {
                M.FormSelect.init(selectElement);
            }
            
            // 通知事件系统章节已更新
            if (WordUtils && WordUtils.EventSystem) {
                WordUtils.EventSystem.trigger('chapters:updated', Object.keys(this.excelData));
            }
            
            // 如果关卡系统已初始化，更新关卡页面
            if (window.WordLevelSystem) {
                console.log("[updateChapterSelectWithApiData] 尝试更新关卡页面...");
                try {
                    // 生成关卡并渲染关卡页面
                    WordLevelSystem.generateLevelsFromChapters();
                    WordLevelSystem.renderLevelPage();
                    WordLevelSystem.updatePageIndicator();
                    console.log("[updateChapterSelectWithApiData] 关卡页面已更新");
                } catch (error) {
                    console.error("[updateChapterSelectWithApiData] 更新关卡页面失败:", error);
                }
            }
            
            if (WordUtils && WordUtils.LoadingManager) {
                WordUtils.LoadingManager.hide();
            }
            return Object.keys(this.excelData).length > 0;
        } catch (error) {
            console.error('[updateChapterSelectWithApiData] 获取章节失败:', error);
            
            // 生成模拟章节数据并继续
            this.generateMockLevels();
            console.log("[updateChapterSelectWithApiData] 已生成模拟章节数据:", Object.keys(this.excelData));
            
            // 通知事件系统章节已更新
            if (WordUtils && WordUtils.EventSystem) {
                WordUtils.EventSystem.trigger('chapters:updated', Object.keys(this.excelData));
            }
            
            // 如果关卡系统已初始化，更新关卡页面
            if (window.WordLevelSystem) {
                console.log("[updateChapterSelectWithApiData] 尝试更新关卡页面...");
                try {
                    // 生成关卡并渲染关卡页面
                    WordLevelSystem.generateLevelsFromChapters();
                    WordLevelSystem.renderLevelPage();
                    WordLevelSystem.updatePageIndicator();
                    console.log("[updateChapterSelectWithApiData] 关卡页面已更新");
                } catch (error) {
                    console.error("[updateChapterSelectWithApiData] 更新关卡页面失败:", error);
                }
            }
            
            if (WordUtils && WordUtils.LoadingManager) {
                WordUtils.LoadingManager.hide();
            }
            return Object.keys(this.excelData).length > 0;
        }
    },
    
    /**
     * 生成模拟章节数据（当API请求失败时使用）
     */
    generateMockLevels() {
        // 如果excelData已经有数据，不覆盖
        if (Object.keys(this.excelData).length > 0) {
            return;
        }
        
        // 生成5个章节
        for (let i = 1; i <= 5; i++) {
            this.excelData[`第${i}章`] = [];
        }
    },

    /**
     * 从API随机获取单词数据
     * @param {number} count - 随机获取的数量，默认为32
     * @returns {Promise<Array|null>} 单词数组Promise或null
     */
    async getRandomWords(count = 32) {
        if (WordUtils && WordUtils.LoadingManager) {
        WordUtils.LoadingManager.show('正在获取随机单词...');
        }
        
        try {
            // 使用优化后的随机获取方法
            const allWords = await this.getRandomWordsFromMultipleChapters(count, 4);
            
            console.log(`总共获取到${allWords.length}个单词`);
            
            if (allWords.length < 2) {
                throw new Error("获取的单词数量不足");
            }
            
            // 如果获取的单词少于目标数量，给出警告
            if (allWords.length < count) {
                console.warn(`获取的单词数量(${allWords.length})少于请求数量(${count})`);
            }
            
            if (WordUtils && WordUtils.LoadingManager) {
            WordUtils.LoadingManager.hide();
            }
            return allWords;
        } catch (error) {
            console.error('随机获取单词失败:', error);
            
            if (WordUtils && WordUtils.ErrorManager) {
            WordUtils.ErrorManager.showToast(`获取词库失败，使用默认词库`);
            }
            
            if (WordUtils && WordUtils.LoadingManager) {
                WordUtils.LoadingManager.hide();
            }
            
            // 返回备用单词
            return this.getFallbackWords();
        }
    },

    /**
     * 获取指定章节的单词数据
     * @param {string} chapter - 章节名称
     * @returns {Array|null} 单词数组或null
     */
    getChapterWords(chapter) {
        if (this.excelData[chapter]) {
            return this.excelData[chapter];
        }
        return null;
    },

    /**
     * 准备游戏所需的单词数据
     * @param {number} maxPairs - 最大单词对数量
     * @returns {Promise<Array>} 单词数组Promise
     */
    async prepareWordData(maxPairs) {
        // 获取数据源
        let dataSource = 'chapter'; // 默认使用章节
        
        // 尝试从radio获取
        const dataSourceRadio = document.querySelector('input[name="data-source"]:checked');
        if (dataSourceRadio) {
            dataSource = dataSourceRadio.value;
        } else {
            // 尝试从隐藏input获取
            const hiddenInput = document.getElementById('selected-source');
            if (hiddenInput) {
                dataSource = hiddenInput.value;
            }
        }
        
        console.log(`准备单词数据，数据源: ${dataSource}, 最大对数: ${maxPairs}`);
        
        let wordPairs = [];
        
        if (dataSource === 'custom') {
            // 使用用户输入的内容
            const wordInput = document.getElementById('word-input');
            if (!wordInput) {
                console.error('未找到单词输入框');
                return null;
            }
            
            const pairs = this.parseCustomInput(wordInput.value);
            
            if (pairs.length < 2) {
                if (WordUtils && WordUtils.ErrorManager) {
                WordUtils.ErrorManager.showToast('请至少输入两组单词和定义！');
                }
                return null;
            }
            
            wordPairs = pairs;
        } 
        else if (dataSource === 'chapter') {
            // 从API按章节加载数据
            const chapterSelect = document.getElementById('chapter-select');
            if (!chapterSelect) {
                console.error('未找到章节选择器');
                return null;
            }
            
            const chapter = chapterSelect.value;
            wordPairs = await this.loadChapterWords(chapter);
            
            if (!wordPairs || wordPairs.length < 2) {
                if (WordUtils && WordUtils.ErrorManager) {
                    WordUtils.ErrorManager.showToast('选择的章节没有足够的单词数据');
                }
                return null;
            }
        } 
        else if (dataSource === 'random') {
            // 随机加载数据
            const countInput = document.getElementById('random-count');
            const count = countInput ? parseInt(countInput.value) : 32;
            wordPairs = await this.getRandomWords(count);
            
            if (!wordPairs || wordPairs.length < 2) {
                if (WordUtils && WordUtils.ErrorManager) {
                    WordUtils.ErrorManager.showToast('无法获取随机单词数据');
                }
                return null;
            }
        }
        else if (dataSource === 'upload') {
            // 从上传的Excel获取数据
            if (Object.keys(this.excelData).length === 0) {
                if (WordUtils && WordUtils.ErrorManager) {
                    WordUtils.ErrorManager.showToast('请先上传Excel文件');
                }
                return null;
            }
            
            // 使用第一个工作表的数据
            const firstSheet = Object.keys(this.excelData)[0];
            wordPairs = this.excelData[firstSheet];
            
            if (!wordPairs || wordPairs.length < 2) {
                if (WordUtils && WordUtils.ErrorManager) {
                    WordUtils.ErrorManager.showToast('上传的Excel文件没有足够的单词数据');
                }
                return null;
            }
        }
        else if (dataSource === 'diy') {
            // 从DIY页面获取数据
            this.loadDiyDataFromStorage();
            
            if (Object.keys(this.sourceData.diy).length === 0) {
                if (WordUtils && WordUtils.ErrorManager) {
                    WordUtils.ErrorManager.showToast('请先在DIY页面创建词单');
                }
                return null;
            }
            
            // 使用第一个工作表的数据
            const firstSheet = Object.keys(this.sourceData.diy)[0];
            wordPairs = this.sourceData.diy[firstSheet];
            
            if (!wordPairs || wordPairs.length < 2) {
                if (WordUtils && WordUtils.ErrorManager) {
                    WordUtils.ErrorManager.showToast('DIY词单没有足够的单词数据');
                }
                return null;
            }
        }
        
        // 打乱顺序
        wordPairs = this.shuffleArray(wordPairs);
        
        // 限制单词对数量
        if (wordPairs.length > maxPairs) {
            wordPairs = wordPairs.slice(0, maxPairs);
        }
        
        console.log(`成功准备 ${wordPairs.length} 对单词数据`);
        return wordPairs;
    },

    /**
     * 检查已加载的Excel数据(调试用)
     */
    checkExcelData() {
        console.log("===== 当前加载的Excel数据 =====");
        console.log(`工作表数量: ${Object.keys(this.excelData).length}`);
        
        Object.entries(this.excelData).forEach(([sheet, words]) => {
            console.log(`工作表 "${sheet}": ${words.length} 个单词`);
            if (words.length > 0) {
                console.log("前3个单词示例:");
                words.slice(0, 3).forEach((item, i) => {
                    console.log(`  ${i+1}. 单词: "${item.word}", 定义: "${item.definition}"`);
                });
            }
        });
        
        return this.excelData;
    },

    /**
     * 切换数据源
     * @param {string} source - 数据源类型
     */
    switchDataSource(source) {
        // 保存当前数据源的数据
        if (this.currentSource) {
            this.sourceData[this.currentSource] = this.excelData;
        }
        
        // 切换到新数据源
        this.currentSource = source;
        
        // 恢复该数据源的数据
        this.excelData = this.sourceData[source] || {};
    },

    /**
     * 加载所有单词级别
     * @returns {Promise<Array>} 单词级别数组Promise
     */
    async loadVocabularyLevels() {
        try {
            const response = await fetch(WordConfig.API.BASE_URL + WordConfig.API.VOCABULARY_LEVELS_ENDPOINT);
            
            if (!response.ok) {
                throw new Error(`获取单词级别失败: ${response.status}`);
            }
            
            const data = await response.json();
            console.log("获取到的单词级别数据:", data);
            
            return data.levels || [];
        } catch (error) {
            console.error('加载单词级别失败:', error);
            WordUtils.ErrorManager.showToast('无法加载单词级别，请稍后再试');
            return [];
        }
    },
    
    /**
     * 按级别加载章节
     * @param {number} levelId - 级别ID
     * @returns {Promise<Array>} 章节数组Promise
     */
    async loadLevelChapters(levelId) {
        WordUtils.LoadingManager.show('正在加载章节...');
        
        try {
            const endpoint = WordConfig.API.LEVEL_CHAPTERS_ENDPOINT.replace('{id}', levelId);
            const response = await fetch(WordConfig.API.BASE_URL + endpoint);
            
            if (!response.ok) {
                throw new Error(`获取章节失败: ${response.status}`);
            }
            
            const data = await response.json();
            console.log(`获取到级别${levelId}的章节数据:`, data);
            
            WordUtils.LoadingManager.hide();
            return data.chapters || [];
        } catch (error) {
            console.error(`加载级别${levelId}的章节失败:`, error);
            WordUtils.ErrorManager.showToast('无法加载章节，请稍后再试');
            WordUtils.LoadingManager.hide();
            return [];
        }
    },

    /**
     * 处理级别选择变更
     * @param {Event} event - 变更事件
     */
    handleLevelChange(event) {
        const levelId = event.target.value;
        if (!levelId) return;
        
        this.currentLevelId = levelId;
        console.log(`选择了级别ID: ${levelId}`);
        
        // 加载该级别下的章节
        this.loadChaptersByLevelId(levelId);
    },
    
    /**
     * 加载并显示所有级别
     */
    async loadAndDisplayLevels() {
        const levelSelect = document.getElementById('level-select');
        if (!levelSelect) {
            console.warn('未找到级别选择器元素');
            return;
        }
        
        if (WordUtils && WordUtils.LoadingManager) {
            WordUtils.LoadingManager.show('正在加载级别数据...');
        }
        
        try {
            // 获取所有级别
            const levels = await this.getLevels();
            this.levelsData = levels; // 保存级别数据
            
            // 清空选择器
            levelSelect.innerHTML = '';
            
            if (levels.length === 0) {
                // 如果没有级别数据，添加一个提示选项
                const option = document.createElement('option');
                option.value = '';
                option.textContent = '暂无可用级别';
                option.disabled = true;
                levelSelect.appendChild(option);
                
                if (WordUtils && WordUtils.ErrorManager) {
                    WordUtils.ErrorManager.showToast('未找到级别数据');
                }
            } else {
                // 添加提示选项
                const defaultOption = document.createElement('option');
                defaultOption.value = '';
                defaultOption.textContent = '请选择级别';
                defaultOption.disabled = true;
                defaultOption.selected = true;
                levelSelect.appendChild(defaultOption);
                
                // 添加所有级别选项
                levels.forEach(level => {
                    const option = document.createElement('option');
                    option.value = level.id;
                    option.textContent = level.name || `${level.id}级`;
                    levelSelect.appendChild(option);
                });
                
                console.log(`加载了${levels.length}个级别`);
            }
            
            // 重新初始化下拉框
            if (typeof M !== 'undefined' && M.FormSelect) {
                M.FormSelect.init(levelSelect);
            }
            
            // 触发事件
            if (WordUtils && WordUtils.EventSystem) {
                WordUtils.EventSystem.trigger('levels:updated', levels);
            }
        } catch (error) {
            console.error('加载级别数据失败:', error);
            if (WordUtils && WordUtils.ErrorManager) {
                WordUtils.ErrorManager.showToast('加载级别数据失败，请稍后再试');
            }
        } finally {
            if (WordUtils && WordUtils.LoadingManager) {
                WordUtils.LoadingManager.hide();
            }
        }
    },
    
    /**
     * 根据级别ID加载章节数据
     * @param {string|number} levelId - 级别ID
     */
    async loadChaptersByLevelId(levelId) {
        const chapterSelect = document.getElementById('chapter-select');
        if (!chapterSelect) {
            console.warn('未找到章节选择器元素');
            return;
        }
        
        if (WordUtils && WordUtils.LoadingManager) {
            WordUtils.LoadingManager.show('正在加载章节数据...');
        }
        
        try {
            // 获取该级别下的所有章节
            const chapters = await this.getChaptersByLevel(levelId);
            
            // 清空选择器
            chapterSelect.innerHTML = '';
            
            if (chapters.length === 0) {
                // 如果没有章节数据，添加一个提示选项
                const option = document.createElement('option');
                option.value = '';
                option.textContent = '该级别暂无章节';
                option.disabled = true;
                chapterSelect.appendChild(option);
                
                if (WordUtils && WordUtils.ErrorManager) {
                    WordUtils.ErrorManager.showToast('该级别下没有章节数据');
                }
            } else {
                // 添加提示选项
                const defaultOption = document.createElement('option');
                defaultOption.value = '';
                defaultOption.textContent = '请选择章节';
                defaultOption.disabled = true;
                defaultOption.selected = true;
                chapterSelect.appendChild(defaultOption);
                
                // 清空原有的章节数据缓存
                this.excelData = {};
                
                // 添加所有章节选项
                chapters.forEach(chapter => {
                    const option = document.createElement('option');
                    const chapterId = chapter.id;
                    const chapterKey = `第${chapterId}章`;
                    
                    option.value = chapterKey;
                    option.textContent = chapter.name || chapterKey;
                    
                    if (chapter.word_count) {
                        option.textContent += ` (${chapter.word_count}词)`;
                    }
                    
                    chapterSelect.appendChild(option);
                    
                    // 初始化章节数据占位，实际数据会在loadChapterWords中加载
                    this.excelData[chapterKey] = [];
                });
                
                console.log(`加载了级别${levelId}下的${chapters.length}个章节`);
            }
            
            // 重新初始化下拉框
            if (typeof M !== 'undefined' && M.FormSelect) {
                M.FormSelect.init(chapterSelect);
            }
            
            // 触发事件
            if (WordUtils && WordUtils.EventSystem) {
                WordUtils.EventSystem.trigger('chapters:updated', chapters);
            }
            
            // 如果关卡系统已初始化，更新关卡页面
            if (window.WordLevelSystem) {
                console.log("尝试更新关卡页面...");
                try {
                    WordLevelSystem.generateLevelsFromChapters();
                    WordLevelSystem.renderLevelPage();
                    WordLevelSystem.updatePageIndicator();
                } catch (error) {
                    console.error("更新关卡页面失败:", error);
                }
            }
        } catch (error) {
            console.error(`加载级别${levelId}下的章节失败:`, error);
            if (WordUtils && WordUtils.ErrorManager) {
                WordUtils.ErrorManager.showToast('加载章节失败，请稍后再试');
            }
        } finally {
            if (WordUtils && WordUtils.LoadingManager) {
                WordUtils.LoadingManager.hide();
            }
        }
    },
};