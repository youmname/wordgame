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
        custom: {}
    },
    
    // 当前数据源
    currentSource: null,
    
    /**
     * 初始化数据加载器
     */
    init() {
        // 监听Excel文件上传
        document.getElementById('excel-upload').addEventListener('change', this.handleExcelUpload.bind(this));
        
        // 监听数据源选择
        document.querySelectorAll('input[name="data-source"]').forEach(radio => {
            radio.addEventListener('change', this.handleDataSourceChange.bind(this));
        });
        
        // 加载章节数据
        this.updateChapterSelectWithApiData();
        
        // 为"使用示例"按钮添加事件监听
        document.getElementById('sample-btn').addEventListener('click', () => {
            document.getElementById('word-input').value = WordConfig.SAMPLE_DATA;
        });
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
            WordUtils.LoadingManager.show('正在解析Excel...');
            
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
                            WordUtils.ErrorManager.showToast(`工作表 ${sheetName} 格式错误: 未找到单词或定义列`);
                            return;
                        }
                        
                        // 提取单词和定义 - 直接使用原始数据，不尝试重复或凑满特定数量
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
                    
                    WordUtils.LoadingManager.hide();
                    
                    // 计算总单词数
                    const totalWords = Object.values(this.excelData).reduce((sum, words) => sum + words.length, 0);
                    WordUtils.ErrorManager.showToast(`成功加载了 ${totalSheets} 个工作表，共 ${totalWords} 个单词!`, 3000, 'success');
                    
                    // 显示章节选择器
                    document.getElementById('chapter-selector').style.display = 'block';
                    
                } catch (err) {
                    console.error("Excel解析错误:", err);
                    WordUtils.LoadingManager.hide();
                    WordUtils.ErrorManager.showToast('Excel文件解析失败: ' + err.message);
                }
            };
            
            reader.onerror = () => {
                console.error("文件读取错误");
                WordUtils.LoadingManager.hide();
                WordUtils.ErrorManager.showToast('文件读取错误，请重试');
            };
            
            // 读取文件
            reader.readAsArrayBuffer(file);
        }
    },
    
    /**
     * 更新章节选择器
     */
    updateChapterSelector() {
        const chapterSelect = document.getElementById('chapter-select');
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
        WordUtils.EventSystem.trigger('chapters:updated', Object.keys(this.excelData));
    },
    
    /**
     * 从API加载章节列表
     * @returns {Promise} 加载结果Promise
     */
    async loadChapterData() {
        WordUtils.LoadingManager.show('正在加载章节列表...');
        
        try {
            const response = await fetch(WordConfig.API.BASE_URL + WordConfig.API.CHAPTERS_ENDPOINT);
            
            if (!response.ok) {
                throw new Error(`获取章节失败: ${response.status}`);
            }
            
            const chapters = await response.json();
            
            // 清空现有选项
            const chapterSelect = document.getElementById('chapter-select');
            chapterSelect.innerHTML = '';
            
            // 添加新选项
            chapters.forEach(chapter => {
                const option = document.createElement('option');
                option.value = `第${chapter.id}章`;
                option.textContent = `第${chapter.id}章${chapter.word_count ? ` (${chapter.word_count}词)` : ''}`;
                chapterSelect.appendChild(option);
            });
            
            // 触发事件
            WordUtils.EventSystem.trigger('chapters:updated', chapters);
            
            WordUtils.LoadingManager.hide();
            return true;
        } catch (error) {
            console.error('获取章节列表失败:', error);
            WordUtils.ErrorManager.showToast('获取章节列表失败，请稍后再试');
            WordUtils.LoadingManager.hide();
            return false;
        }
    },

    /**
     * 从API按章节获取单词数据
     * @param {string} chapter - 章节名称
     * @returns {Promise<Array>} 单词数组Promise
     */
    async loadChapterWords(chapter) {
        // 从章节名提取ID（例如"第1章" -> 1）
        const chapterId = parseInt(chapter.match(/\d+/)?.[0]) || 1;
        console.log("正在尝试加载章节ID:", chapterId);
        
        WordUtils.LoadingManager.show('正在加载单词数据...');
        
        try {
            // 构建API请求URL
            const endpoint = WordConfig.API.WORDS_ENDPOINT.replace('{id}', chapterId);
            const fullUrl = WordConfig.API.BASE_URL + endpoint;
            console.log("API请求URL:", fullUrl);
            
            const response = await fetch(fullUrl);
            
            // 检查响应状态
            if (!response.ok) {
                const errorText = await response.text();
                console.error(`API响应错误(${response.status}):`, errorText);
                throw new Error(`获取单词失败: ${response.status} - ${response.statusText}`);
            }
            
            const words = await response.json();
            console.log("API返回的单词数据:", words);
            
            // 验证返回的数据格式
            if (!Array.isArray(words)) {
                console.error("API返回的不是数组:", words);
                throw new Error("API返回的数据格式不正确");
            }
            
            if (words.length === 0) {
                console.warn("API返回的单词数组为空");
                WordUtils.ErrorManager.showToast('该章节没有单词数据，请选择其他章节');
                WordUtils.LoadingManager.hide();
                return null;
            }
            
            // 转换为游戏需要的格式
            const wordPairs = words.map(word => ({
                word: word.word || "未知单词",
                definition: word.meaning || "未知定义"
            }));
            
            console.log("转换后的单词对:", wordPairs);
            
            if (wordPairs.length < 2) {
                WordUtils.ErrorManager.showToast('该章节单词数量不足，请选择其他章节');
                WordUtils.LoadingManager.hide();
                return null;
            }
            
            // 打乱顺序
            const shuffledPairs = WordUtils.shuffle(wordPairs);
            
            WordUtils.LoadingManager.hide();
            return shuffledPairs;
        } catch (error) {
            console.error(`加载章节${chapterId}单词失败:`, error);
            WordUtils.ErrorManager.showToast(`加载章节数据失败: ${error.message}`);
            WordUtils.LoadingManager.hide();
            return null;
        }
    },

    /**
     * 从API更新章节选择器
     * @returns {Promise<boolean>} 加载成功与否
     */
    async updateChapterSelectWithApiData() {
        console.log("Attempting to fetch chapters..."); // 调试信息
        try {
            // --- 修改这里的 URL ---
            const response = await fetch('https://sanjinai.cn:5000/api/chapters', { // 使用正确的、包含域名的完整URL
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    // 如果你的API需要认证才能获取章节，需要添加 Authorization 头
                    // 'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                },
                credentials: 'include' // 如果需要跨域传递cookie或认证信息
            });
            // --- URL 修改结束 ---

            console.log("Fetch response status:", response.status); // 调试信息

            if (!response.ok) {
                // 如果HTTP状态码不是2xx，抛出错误
                throw new Error(`HTTP error! status: ${response.status}, statusText: ${response.statusText}`);
            }

            const data = await response.json();
            console.log("Received chapter data:", data); // 调试信息

            // --- 确保后端返回的数据结构包含 success 和 chapters 字段 ---
            if (!data || !data.success || !Array.isArray(data.chapters)) {
                 // 如果后端返回的数据格式不符合预期，也抛出错误
                console.error("Invalid data format received from /api/chapters:", data);
                throw new Error('从服务器获取的章节数据格式无效');
            }
            // --- 数据结构检查结束 ---

            const chapters = data.chapters;
            const selectElement = document.getElementById('chapter-select');

            if (!selectElement) {
                console.warn('未能找到ID为 chapter-select 的下拉选择框元素');
                return; // 如果找不到元素，直接返回，避免后续错误
            }

            // 清空现有选项
            selectElement.innerHTML = '<option value="" disabled selected>请选择章节</option>'; // 添加一个默认提示选项

            // 添加从API获取的新选项
            if (chapters.length === 0) {
                console.warn("API返回的章节列表为空");
                 const option = document.createElement('option');
                 option.value = "";
                 option.textContent = "暂无可用章节";
                 option.disabled = true;
                 selectElement.appendChild(option);
            } else {
                chapters.forEach(chapter => {
                    const option = document.createElement('option');
                    option.value = chapter.id; // 假设后端返回的章节对象有 id 字段
                    // 尝试使用 chapter.name，如果不存在则使用 order_num
                    option.textContent = chapter.name || `章节 ${chapter.order_num || chapter.id}`; // 假设有 name 或 order_num 字段
                    selectElement.appendChild(option);
                });
                console.log("Chapter select dropdown populated.");
            }

            // 如果使用了Materialize CSS的下拉框，需要重新初始化
            if (typeof M !== 'undefined' && M.FormSelect) {
                M.FormSelect.init(selectElement);
                console.log("Materialize FormSelect re-initialized.");
            }

        } catch (error) {
            // 捕获 fetch 错误或上面抛出的错误
            console.error('获取或处理章节列表失败:', error);
            // 在UI上给用户提示
            const errorToast = document.getElementById('error-toast'); // 假设你有一个显示错误信息的元素
            if (errorToast) {
                errorToast.textContent = `加载章节失败: ${error.message}`;
                errorToast.style.display = 'block';
                setTimeout(() => { errorToast.style.display = 'none'; }, 5000); // 5秒后自动隐藏
            }
             // 也可以禁用章节选择相关的UI
             const chapterSelectorDiv = document.getElementById('chapter-selector');
             if (chapterSelectorDiv) chapterSelectorDiv.innerHTML = "<p style='color: red;'>加载章节失败，请刷新页面重试。</p>";
        }
    },

    /**
     * 从API随机获取单词数据
     * @param {number} count - 随机获取的数量，默认为32
     * @returns {Promise<Array|null>} 单词数组Promise或null
     */
    async getRandomWords(count = 32) {
        // 设置固定章节数和每章节单词数
        const chaptersToGet = 4; // 获取4个章节
        const wordsPerChapter = 8; // 每章节8个单词
        
        WordUtils.LoadingManager.show('正在获取随机单词...');
        
        try {
            // 1. 尝试获取所有章节列表
            console.log("开始获取所有章节列表...");
            const chaptersResponse = await fetch(WordConfig.API.BASE_URL + WordConfig.API.CHAPTERS_ENDPOINT, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                timeout: 5000 // 设置5秒超时
            });
            
            if (!chaptersResponse.ok) {
                throw new Error(`获取章节失败: ${chaptersResponse.status}`);
            }
            
            const chaptersData = await chaptersResponse.json();
            console.log("API返回的章节数据:", chaptersData);
            
            // 确保从API返回的数据格式正确
            let chapters = [];
            if (Array.isArray(chaptersData)) {
                chapters = chaptersData;
            } else if (chaptersData && chaptersData.chapters && Array.isArray(chaptersData.chapters)) {
                chapters = chaptersData.chapters;
            } else if (chaptersData && chaptersData.data && Array.isArray(chaptersData.data)) {
                chapters = chaptersData.data;
            } else {
                console.error("API返回的章节数据格式不正确:", chaptersData);
                throw new Error("章节数据格式错误");
            }
            
            console.log(`成功获取${chapters.length}个章节`);
            
            if (!chapters || chapters.length === 0) {
                throw new Error("未找到任何章节");
            }
            
            // 2. 随机选择4个不同章节（或所有章节，如果总数少于4个）
            const shuffledChapters = WordUtils.shuffle([...chapters]);
            const selectedChapters = shuffledChapters.slice(0, Math.min(chaptersToGet, chapters.length));
            
            console.log(`随机选择了${selectedChapters.length}个章节: ${selectedChapters.map(ch => ch.id).join(', ')}`);
            
            // 3. 从每个选定章节中获取单词
            const allWords = [];
            
            for (const chapter of selectedChapters) {
                console.log(`开始获取章节${chapter.id}的单词...`);
                const endpoint = WordConfig.API.WORDS_ENDPOINT.replace('{id}', chapter.id);
                
                try {
                    const wordResponse = await fetch(WordConfig.API.BASE_URL + endpoint, {
                        method: 'GET',
                        headers: {
                            'Content-Type': 'application/json',
                            'Access-Control-Allow-Origin': '*'
                        },
                        timeout: 5000
                    });
                    
                    if (!wordResponse.ok) {
                        console.warn(`获取章节${chapter.id}单词失败: ${wordResponse.status}`);
                        continue; // 跳过这个章节，尝试下一个
                    }
                    
                    const wordsData = await wordResponse.json();
                    console.log(`从章节${chapter.id}获取的原始单词数据:`, wordsData);
                    
                    // 处理不同的返回格式
                    let chapterWords = [];
                    if (Array.isArray(wordsData)) {
                        chapterWords = wordsData;
                    } else if (wordsData && wordsData.words && Array.isArray(wordsData.words)) {
                        chapterWords = wordsData.words;
                    } else if (wordsData && wordsData.data && Array.isArray(wordsData.data)) {
                        chapterWords = wordsData.data;
                    } else {
                        console.warn(`章节${chapter.id}返回的单词数据格式不正确，跳过`);
                        continue;
                    }
                    
                    console.log(`从章节${chapter.id}获取到${chapterWords.length}个单词`);
                    
                    if (chapterWords.length > 0) {
                        // 随机选择该章节的单词
                        const shuffledChapterWords = WordUtils.shuffle(chapterWords);
                        const selectedWords = shuffledChapterWords.slice(0, 
                            Math.min(wordsPerChapter, chapterWords.length));
                        
                        // 将选中的单词转换为游戏需要的格式
                        const formattedWords = selectedWords.map(word => ({
                            word: word.word || word.name || "未知单词",
                            definition: word.meaning || word.definition || word.chinese || "未知定义",
                            chapterId: chapter.id
                        }));
                        
                        allWords.push(...formattedWords);
                        console.log(`已选择${formattedWords.length}个单词从章节${chapter.id}`);
                    }
                } catch (err) {
                    console.error(`处理章节${chapter.id}时出错:`, err);
                    // 继续处理其他章节
                }
            }
            
            console.log(`总共获取到${allWords.length}个单词`);
            
            if (allWords.length < 2) {
                // 如果API获取失败，使用示例数据
                console.warn("API获取单词失败，使用示例数据替代");
                throw new Error("获取的单词数量不足，将使用示例数据");
            }
            
            // 如果获取的单词少于目标数量，给出警告
            if (allWords.length < count) {
                console.warn(`获取的单词数量(${allWords.length})少于请求数量(${count})`);
            }
            
            WordUtils.LoadingManager.hide();
            return allWords;
        } catch (error) {
            console.error('随机获取单词失败:', error);
            WordUtils.ErrorManager.showToast(`获取词库失败，使用默认词库`);
            WordUtils.LoadingManager.hide();
            
            // 解析示例数据作为备选
            console.log("使用示例数据作为备选");
            const samplePairs = WordUtils.parseCustomInput(WordConfig.SAMPLE_DATA);
            
            // 确保至少有默认数据可用
            if (samplePairs && samplePairs.length >= 2) {
                console.log(`成功加载${samplePairs.length}个示例单词`);
                return samplePairs;
            }
            
            // 如果连示例数据都解析失败，构造一些基本单词
            console.warn("示例数据也无法使用，使用硬编码的基础单词");
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
        const dataSource = document.querySelector('input[name="data-source"]:checked').value;
        let wordPairs = [];
        
        if (dataSource === 'custom') {
            // 使用用户输入的内容
            const wordInput = document.getElementById('word-input');
            const pairs = WordUtils.parseCustomInput(wordInput.value);
            
            if (pairs.length < 2) {
                WordUtils.ErrorManager.showToast('请至少输入两组单词和定义！');
                return null;
            }
            
            wordPairs = pairs;
        } 
        else if (dataSource === 'chapter') {
            // 从API按章节加载数据
            const chapter = document.getElementById('chapter-select').value;
            wordPairs = await this.loadChapterWords(chapter);
            
            if (!wordPairs) return null;
        } 
        else if (dataSource === 'random') {
            // 从Excel随机加载数据
            const count = parseInt(document.getElementById('random-count').value);
            wordPairs = await this.getRandomWords(count);
            
            if (!wordPairs) return null;
        }
        
        // 打乱顺序
        wordPairs = WordUtils.shuffle(wordPairs);
        
        // 限制单词对数量
        if (wordPairs.length > maxPairs) {
            wordPairs = wordPairs.slice(0, maxPairs);
        }
        
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
    }
};