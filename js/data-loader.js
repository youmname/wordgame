/**
 * 单词数据加载器
 * 负责从API获取单词级别和章节数据
 */

// WordDataLoader对象
window.WordDataLoader = {
    // API基础URL - 动态获取
    API_BASE_URL: window.location.protocol + '//' + window.location.hostname + ':5000',
    
    // API端点
    API_ENDPOINTS: {
        VOCABULARY_LEVELS: '/api/vocabulary-levels',
        LEVEL_CHAPTERS: '/api/vocabulary-levels/{id}/chapters',
        CHAPTERS: '/api/chapters',
        WORDS: '/api/words'
    },
    
    // 游戏类型 - 默认为normal(闯关模式)
    // 可选值: normal(闯关), random(随机), imported(导入), daily(今日推荐)
    currentPlayMode: 'normal',
    
    // 当前游戏参数
    playParams: {
        levelId: null,
        chapterId: null,
        wordCount: 20,
        sourceId: null
    },
    
    /**
     * 获取所有词汇级别
     * @returns {Promise<Array>} 词汇级别数组
     */
    getLevels: async function() {
        try {
            console.log('WordDataLoader: 开始获取词汇级别');
            const response = await fetch(`${this.API_BASE_URL}${this.API_ENDPOINTS.VOCABULARY_LEVELS}`);
            
            if (!response.ok) {
                throw new Error(`获取词汇级别失败: ${response.status} ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.message || '获取词汇级别失败');
            }
            
            console.log('WordDataLoader: 成功获取词汇级别', data.levels);
            return data.levels || [];
        } catch (error) {
            console.error('WordDataLoader.getLevels 错误:', error);
            // 返回空数组，让调用者处理
            return [];
        }
    },

    /**
     * 获取特定级别的所有章节
     * @param {number|string} levelId - 级别ID
     * @returns {Promise<Array>} 章节数组
     */
    getChaptersByLevel: async function(levelId) {
        if (!levelId) {
            console.error('WordDataLoader.getChaptersByLevel: 未提供级别ID');
        return [];
        }
        
        try {
            console.log(`WordDataLoader: 开始获取级别${levelId}的章节`);
            const url = `${this.API_BASE_URL}${this.API_ENDPOINTS.LEVEL_CHAPTERS.replace('{id}', levelId)}`;
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`获取章节失败: ${response.status} ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.message || '获取章节失败');
            }
            
            console.log(`WordDataLoader: 成功获取级别${levelId}的章节`, data.chapters);
            return data.chapters || [];
        } catch (error) {
            console.error(`WordDataLoader.getChaptersByLevel(${levelId}) 错误:`, error);
            // 返回空数组，让调用者处理
            return [];
        }
    },
    
    /**
     * 获取特定章节的所有单词
     * @param {number|string} chapterId - 章节ID
     * @returns {Promise<Array>} 单词数组
     */
    getWordsByChapter: async function(chapterId) {
        if (!chapterId) {
            console.error('WordDataLoader.getWordsByChapter: 未提供章节ID');
            return [];
        }
        
        try {
            console.log(`WordDataLoader: 开始获取章节${chapterId}的单词`);
            const url = `${this.API_BASE_URL}${this.API_ENDPOINTS.CHAPTERS}/${chapterId}/allwords`;
            const response = await fetch(url);
            console.log("我运行到这个了，说明是获取成功了，单词的，且内容为",response);
            
            if (!response.ok) {
                throw new Error(`获取单词失败: ${response.status} ${response.statusText}`);
            }
            
            const data = await response.json();
            console.log("我运行到这个了，说明是获取成功了，单词的，且内容为",data);
            
            if (!data.success) {
                throw new Error(data.message || '获取单词失败');
            }
            
            console.log(`WordDataLoader: 成功获取章节${chapterId}的单词`, data.words);
            return data.words || [];
        } catch (error) {
            console.error(`WordDataLoader.getWordsByChapter(${chapterId}) 错误:`, error);
            // 返回空数组，让调用者处理
            return [];
        }
    },

    /**
     * 获取特定章节的所有单词（不分页）
     * 根据当前游戏类型智能返回相应的单词数据
     * @param {number|string} chapterId - 章节ID
     * @returns {Promise<Array>} 单词数组
     */
    getAllWordsByChapter: async function(chapterId) {
        try {
            // 特殊处理：如果chapter是random，直接调用随机单词获取逻辑
            if (chapterId === 'random') {
                console.log('WordDataLoader: 检测到随机章节ID，将调用随机单词获取逻辑');
                return await this.getRandomWordsFromLevel('all', 20);
            }
            
            // 获取当前游戏类型
            const playMode = this.getPlayMode();
            console.log(`WordDataLoader: 当前游戏类型 [${playMode}]`);
            
            // 根据游戏类型返回不同的单词数据
            switch (playMode) {
                case 'random':
                    // 随机挑战模式
                    const levelId = this.playParams.levelId || 'all';
                    const wordCount = this.playParams.wordCount || 20;
                    console.log(`WordDataLoader: 随机挑战模式，从级别[${levelId}]获取[${wordCount}]个单词`);
                    return await this.getRandomWordsFromLevel(levelId, wordCount);
                    
                case 'imported':
                    // 导入单词模式
                    const sourceId = this.playParams.sourceId || '';
                    console.log(`WordDataLoader: 导入单词模式，来源ID[${sourceId}]`);
                    return await this.getImportedWords(sourceId);
                    
                case 'daily':
                    // 今日推荐模式
                    console.log('WordDataLoader: 今日推荐模式');
                    return await this.getDailyRecommendedWords();
                    
                default:
                    // 闯关模式（正常模式）- 从指定章节获取单词
                    if (!chapterId) {
                        console.error('WordDataLoader.getAllWordsByChapter: 未提供章节ID');
                        return [];
                    }
                    
                    console.log(`WordDataLoader: 闯关模式，获取章节[${chapterId}]的单词`);
                    const url = `${this.API_BASE_URL}${this.API_ENDPOINTS.CHAPTERS}/${chapterId}/allwords`;
                    console.log('请求URL:', url);
                    
                    const response = await fetch(url);
                    console.log('API响应状态:', response.status, response.statusText);
                    
                    if (!response.ok) {
                        throw new Error(`获取单词失败: ${response.status} ${response.statusText}`);
                    }
                    
                    const data = await response.json();
                    console.log(`获取到的数据结构:`, Object.keys(data));
                    
                    if (!data.success) {
                        throw new Error(data.message || '获取单词失败');
                    }
                    
                    console.log(`WordDataLoader: 成功获取章节${chapterId}的全部单词`, data.words.length);
                    
                    // 标准化单词格式
                    const formattedWords = data.words.map(word => ({
                        word: word.word || '',
                        meaning: word.meaning || '',
                        id: word.id,
                        phonetic: word.phonetic || '',
                        phrase: word.phrase || '',
                        example: word.example || '',
                        note: word.note || ''
                    })).filter(pair => pair.word && pair.meaning);
                    
                    console.log(`格式化后的单词数: ${formattedWords.length}`);
                    return formattedWords;
            }
        } catch (error) {
            console.error(`WordDataLoader.getAllWordsByChapter 错误:`, error);
            // 返回空数组，让调用者处理
            return [];
        }
    },

    // 根据游戏类型获取单词数据
    getWordsByPlayMode: async function(mode, params = {}) {
        console.log(`WordDataLoader: 根据游戏类型[${mode}]获取单词，参数:`, params);
        
        try {
            let words = [];
            
            switch(mode) {
                case 'normal': // 开始闯关模式
                    if (!params.chapterId) {
                        throw new Error('开始闯关模式需要提供章节ID');
                    }
                    words = await this.getAllWordsByChapter(params.chapterId);
                    break;
                    
                case 'random': // 随机挑战模式
                    if (!params.levelId) {
                        throw new Error('随机挑战模式需要提供级别ID');
                    }
                    words = await this.getRandomWordsFromLevel(params.levelId, params.wordCount || 20);
                    break;
                    
                case 'imported': // 导入单词模式
                    words = await this.getImportedWords(params.sourceId);
                    break;
                    
                case 'daily': // 今日推荐模式
                    words = await this.getDailyRecommendedWords();
                    break;
                    
                default:
                    throw new Error(`未知的游戏类型: ${mode}`);
            }
            
            console.log(`游戏类型[${mode}]获取到${words.length}个单词`);
            return words;
        } catch (error) {
            console.error(`WordDataLoader.getWordsByPlayMode错误:`, error);
            return [];
        }
    },
    
    // 从特定级别随机抽取单词
    getRandomWordsFromLevel: async function(levelId, count = 20) {
        try {
            console.log(`WordDataLoader: 随机抽取${count}个单词，级别ID: ${levelId}`);
            
            // 设置固定章节数和每章节单词数
            const chaptersToGet = 4; // 获取4个章节
            const wordsPerChapter = Math.ceil(count / chaptersToGet); // 每章节平均单词数
            
            // 如果levelId是'all'，则从所有级别中随机获取
            let chapters = [];
            
            if (levelId === 'all') {
                console.log('将从所有级别随机获取单词');
                
                // 1. 先获取所有级别
                const levels = await this.getLevels();
                if (!levels || levels.length === 0) {
                    throw new Error('未找到任何级别');
                }
                
                console.log(`获取到${levels.length}个级别`);
                
                // 2. 从每个级别中获取部分章节
                const allChapters = [];
                for (const level of levels) {
                    try {
                        const levelChapters = await this.getChaptersByLevel(level.id);
                        if (levelChapters && levelChapters.length > 0) {
                            allChapters.push(...levelChapters);
                        }
                    } catch (error) {
                        console.warn(`获取级别${level.id}的章节失败:`, error);
                        // 继续尝试其他级别
                    }
                }
                
                // 如果获取到了章节，则随机选择
                if (allChapters.length > 0) {
                    chapters = allChapters;
                    console.log(`从所有级别获取到${chapters.length}个章节`);
                } else {
                    throw new Error('从所有级别获取章节失败');
                }
            } else {
                // 使用指定级别
                chapters = await this.getChaptersByLevel(levelId);
                if (!chapters || chapters.length === 0) {
                    throw new Error(`未找到级别${levelId}的章节`);
                }
                console.log(`从级别${levelId}获取到${chapters.length}个章节`);
            }
            
            // 随机打乱章节并选择一部分
            const shuffleArray = (array) => {
                for (let i = array.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [array[i], array[j]] = [array[j], array[i]];
                }
                return array;
            };
            
            const shuffledChapters = shuffleArray([...chapters]);
            const selectedChapters = shuffledChapters.slice(0, Math.min(chaptersToGet, chapters.length));
            
            console.log(`随机选择了${selectedChapters.length}个章节: ${selectedChapters.map(ch => ch.id || ch.name).join(', ')}`);
            
            // 3. 从每个选定章节中获取单词
            const allWords = [];
            
            for (const chapter of selectedChapters) {
                console.log(`开始获取章节${chapter.id || chapter.name}的单词...`);
                
                try {
                    // 使用我们已有的API获取章节的所有单词
                    const url = `${this.API_BASE_URL}${this.API_ENDPOINTS.CHAPTERS}/${chapter.id}/allwords`;
                    console.log('请求URL:', url);
                    
                    const response = await fetch(url);
                    
                    if (!response.ok) {
                        console.warn(`获取章节${chapter.id}单词失败: ${response.status} ${response.statusText}`);
                        continue; // 跳过这个章节，尝试下一个
                    }
                    
                    const data = await response.json();
                    
                    if (!data.success) {
                        console.warn(`获取章节${chapter.id}单词失败: ${data.message || '未知错误'}`);
                        continue;
                    }
                    
                    // 确保words字段存在并是数组
                    if (!data.words || !Array.isArray(data.words)) {
                        console.warn(`章节${chapter.id}返回的单词数据格式不正确，跳过`);
                        continue;
                    }
                    
                    console.log(`从章节${chapter.id}获取到${data.words.length}个单词`);
                    
                    if (data.words.length > 0) {
                        // 随机选择该章节的单词
                        const shuffledChapterWords = shuffleArray([...data.words]);
                        const selectedWords = shuffledChapterWords.slice(0, 
                            Math.min(wordsPerChapter, shuffledChapterWords.length));
                        
                        // 将选中的单词转换为标准格式
                        const formattedWords = selectedWords.map(word => ({
                            word: word.word || '',
                            meaning: word.meaning || '',
                            id: word.id,
                            phonetic: word.phonetic || '',
                            phrase: word.phrase || '',
                            example: word.example || '',
                            note: word.note || '',
                            chapterId: chapter.id
                        })).filter(pair => pair.word && pair.meaning);
                        
                        allWords.push(...formattedWords);
                        console.log(`已选择${formattedWords.length}个单词从章节${chapter.id}`);
                    }
                } catch (error) {
                    console.error(`处理章节${chapter.id || chapter.name}时出错:`, error);
                    // 继续处理其他章节
                }
            }
            
            console.log(`总共获取到${allWords.length}个单词`);
            
            // 如果API获取的单词太少，使用默认单词
            if (allWords.length < Math.min(count / 2, 10)) {
                console.warn(`获取的单词数量(${allWords.length})不足，使用默认单词`);
                
                // 使用今日推荐单词作为备选
                const defaultWords = await this.getDailyRecommendedWords();
                
                // 如果今日推荐单词也不足，添加一些基础单词
                if (defaultWords.length < 10) {
                    console.warn("今日推荐单词也不足，添加基础单词");
                    const baseWords = [
                        { word: "abandon", meaning: "放弃", id: "b1", phonetic: "/əˈbændən/" },
                        { word: "ability", meaning: "能力", id: "b2", phonetic: "/əˈbɪləti/" },
                        { word: "absence", meaning: "缺席", id: "b3", phonetic: "/ˈæbsəns/" },
                        { word: "accept", meaning: "接受", id: "b4", phonetic: "/əkˈsept/" },
                        { word: "accident", meaning: "事故", id: "b5", phonetic: "/ˈæksɪdənt/" },
                        { word: "accomplish", meaning: "完成", id: "b6", phonetic: "/əˈkɑːmplɪʃ/" },
                        { word: "account", meaning: "账户", id: "b7", phonetic: "/əˈkaʊnt/" },
                        { word: "accurate", meaning: "准确的", id: "b8", phonetic: "/ˈækjərət/" },
                        { word: "achieve", meaning: "达成", id: "b9", phonetic: "/əˈtʃiːv/" },
                        { word: "acknowledge", meaning: "承认", id: "b10", phonetic: "/əkˈnɑːlɪdʒ/" },
                        { word: "acquire", meaning: "获得", id: "b11", phonetic: "/əˈkwaɪər/" },
                        { word: "adapt", meaning: "适应", id: "b12", phonetic: "/əˈdæpt/" },
                        { word: "addition", meaning: "加法", id: "b13", phonetic: "/əˈdɪʃn/" },
                        { word: "address", meaning: "地址", id: "b14", phonetic: "/əˈdres/" },
                        { word: "adequate", meaning: "足够的", id: "b15", phonetic: "/ˈædɪkwət/" },
                        { word: "adjust", meaning: "调整", id: "b16", phonetic: "/əˈdʒʌst/" }
                    ];
                    allWords.push(...baseWords);
                } else {
                    allWords.push(...defaultWords);
                }
            }
            
            // 随机打乱所有单词并限制数量
            const finalWords = shuffleArray(allWords).slice(0, count);
            console.log(`最终返回${finalWords.length}个随机单词`);
            
            return finalWords;
        } catch (error) {
            console.error(`WordDataLoader.getRandomWordsFromLevel 错误:`, error);
            
            // 发生错误时返回样例单词
            const sampleWords = [
                { word: "diligent", meaning: "勤奋的", id: "d1", phonetic: "/ˈdɪlɪdʒənt/", example: "She is a diligent student." },
                { word: "perseverance", meaning: "毅力", id: "d2", phonetic: "/ˌpɜːsɪˈvɪərəns/", example: "His perseverance helped him succeed." },
                { word: "eloquent", meaning: "雄辩的", id: "d3", phonetic: "/ˈeləkwənt/", example: "She gave an eloquent speech." },
                { word: "ubiquitous", meaning: "无所不在的", id: "d4", phonetic: "/juːˈbɪkwɪtəs/", example: "Mobile phones are ubiquitous these days." },
                { word: "pragmatic", meaning: "务实的", id: "d5", phonetic: "/præɡˈmætɪk/", example: "We need a pragmatic approach to this problem." },
                { word: "benevolent", meaning: "仁慈的", id: "d6", phonetic: "/bəˈnevələnt/", example: "She is known for her benevolent nature." },
                { word: "meticulous", meaning: "一丝不苟的", id: "d7", phonetic: "/məˈtɪkjələs/", example: "He is meticulous about details." },
                { word: "prudent", meaning: "谨慎的", id: "d8", phonetic: "/ˈpruːdnt/", example: "It's prudent to save money for emergencies." },
                { word: "tenacious", meaning: "坚持的", id: "d9", phonetic: "/təˈneɪʃəs/", example: "She is tenacious in pursuing her goals." },
                { word: "versatile", meaning: "多才多艺的", id: "d10", phonetic: "/ˈvɜːrsətl/", example: "He is a versatile musician who plays many instruments." },
                { word: "ambiguous", meaning: "模棱两可的", id: "d11", phonetic: "/æmˈbɪɡjuəs/", example: "The statement was ambiguous and could be interpreted in different ways." },
                { word: "concise", meaning: "简洁的", id: "d12", phonetic: "/kənˈsaɪs/", example: "His explanation was concise and clear." },
                { word: "enhance", meaning: "提高", id: "d13", phonetic: "/ɪnˈhæns/", example: "Regular exercise can enhance your overall health." },
                { word: "feasible", meaning: "可行的", id: "d14", phonetic: "/ˈfiːzəbl/", example: "The project seems feasible within our budget." },
                { word: "innovation", meaning: "创新", id: "d15", phonetic: "/ˌɪnəˈveɪʃn/", example: "The company is known for its innovation in technology." },
                { word: "jurisdiction", meaning: "管辖权", id: "d16", phonetic: "/ˌdʒʊrɪsˈdɪkʃn/", example: "This case falls under the jurisdiction of the federal court." },
                { word: "lucrative", meaning: "有利可图的", id: "d17", phonetic: "/ˈluːkrətɪv/", example: "He found a lucrative position at a new company." },
                { word: "sentiment", meaning: "情感", id: "d18", phonetic: "/ˈsentɪmənt/", example: "There is a growing sentiment that changes are needed." },
                { word: "versatility", meaning: "多功能性", id: "d19", phonetic: "/ˌvɜːrsəˈtɪləti/", example: "The versatility of this tool makes it very useful." },
                { word: "skeptical", meaning: "怀疑的", id: "d20", phonetic: "/ˈskeptɪkl/", example: "I remain skeptical about their claims without evidence." }
            ];
            
            return sampleWords.slice(0, count);
        }
    },
    
    // 获取导入的单词
    getImportedWords: async function(sourceId) {
        try {
            console.log(`WordDataLoader: 获取导入的单词，来源ID: ${sourceId}`);
            
            // 如果有本地存储的导入单词数据，优先使用
            const localImportedWords = this.getLocalImportedWords(sourceId);
            if (localImportedWords && localImportedWords.length > 0) {
                console.log(`从本地存储获取到${localImportedWords.length}个导入单词`);
                return localImportedWords;
            }
            
            // 否则从服务器获取
            const url = `${this.API_BASE_URL}/api/imported/${sourceId || 'latest'}`;
            console.log('导入单词请求URL:', url);
            
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`获取导入单词失败: ${response.status} ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.message || '获取导入单词失败');
            }
            
            // 标准化单词格式
            const formattedWords = data.words.map(word => ({
                word: word.word || '',
                meaning: word.meaning || '',
                id: word.id,
                phonetic: word.phonetic || '',
                phrase: word.phrase || '',
                example: word.example || '',
                note: word.note || ''
            })).filter(pair => pair.word && pair.meaning);
            
            console.log(`获取到${formattedWords.length}个导入单词`);
            return formattedWords;
        } catch (error) {
            console.error(`WordDataLoader.getImportedWords错误:`, error);
            return [];
        }
    },
    
    // 从本地存储获取导入的单词
    getLocalImportedWords: function(sourceId) {
        try {
            // 从localStorage获取导入的单词
            const key = sourceId ? `imported_words_${sourceId}` : 'imported_words_latest';
            const storedData = localStorage.getItem(key);
            
            if (!storedData) {
                return null;
            }
            
            const parsedData = JSON.parse(storedData);
            return parsedData.words || [];
        } catch (error) {
            console.error('获取本地导入单词错误:', error);
            return null;
        }
    },
    
    // 设置本地导入单词
    setLocalImportedWords: function(words, sourceId) {
        try {
            if (!words || !Array.isArray(words)) {
                console.error('无效的单词数据');
                return false;
            }
            
            const key = sourceId ? `imported_words_${sourceId}` : 'imported_words_latest';
            const data = {
                timestamp: Date.now(),
                words: words
            };
            
            localStorage.setItem(key, JSON.stringify(data));
            console.log(`已保存${words.length}个单词到本地存储，键名: ${key}`);
            return true;
        } catch (error) {
            console.error('保存本地导入单词错误:', error);
            return false;
        }
    },
    
    // 获取今日推荐单词
    getDailyRecommendedWords: async function() {
        try {
            console.log('WordDataLoader: 获取今日推荐单词');
            
            // TODO: 实现今日推荐功能
            // 临时返回样例单词
            const sampleWords = [
                { word: "diligent", meaning: "勤奋的", id: "d1", phonetic: "/ˈdɪlɪdʒənt/", example: "She is a diligent student." },
                { word: "perseverance", meaning: "毅力", id: "d2", phonetic: "/ˌpɜːsɪˈvɪərəns/", example: "His perseverance helped him succeed." },
                { word: "eloquent", meaning: "雄辩的", id: "d3", phonetic: "/ˈeləkwənt/", example: "She gave an eloquent speech." },
                { word: "ubiquitous", meaning: "无所不在的", id: "d4", phonetic: "/juːˈbɪkwɪtəs/", example: "Mobile phones are ubiquitous these days." },
                { word: "pragmatic", meaning: "务实的", id: "d5", phonetic: "/præɡˈmætɪk/", example: "We need a pragmatic approach to this problem." }
            ];
            
            console.log('返回今日推荐样例单词');
            return sampleWords;
        } catch (error) {
            console.error('WordDataLoader.getDailyRecommendedWords错误:', error);
            return [];
        }
    },

    /**
     * 初始化数据加载器
     * 检查API连接并设置基础URL
     */
    init: function() {
        console.log('WordDataLoader: 初始化数据加载器');
        
        // 检测环境，调整API基础URL
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            // 本地开发环境
            this.API_BASE_URL = 'http://localhost:5000';
        } else if (window.location.hostname === '175.24.181.59') {
            // 服务器环境
            this.API_BASE_URL = 'https://175.24.181.59:5000';
        } else if (window.location.hostname === 'sanjinai.cn' || window.location.hostname === 'www.sanjinai.cn') {
            // 生产环境
            this.API_BASE_URL = 'https://sanjinai.cn:5000';
        }
        
        console.log(`WordDataLoader: API基础URL设置为 ${this.API_BASE_URL}`);
        
        // 恢复之前保存的游戏类型
        this.getPlayMode();
        
        // 设置首页功能卡片点击事件处理
        this.setupFunctionCardListeners();
        
        // 测试API连接
        this.testConnection();
    },
    
    /**
     * 设置首页功能卡片监听器
     * 当用户点击功能卡片时，自动设置相应的游戏类型
     */
    setupFunctionCardListeners: function() {
        try {
            // 仅在shouye.html页面执行
            if (!document.querySelector('.features-grid')) {
                return;
            }
            
            console.log('WordDataLoader: 设置首页功能卡片监听器');
            
            // 监听"开始闯关"卡片点击
            const startLevelCard = document.querySelector('.func-card[data-type="primary"]');
            if (startLevelCard) {
                const originalOnClick = startLevelCard.onclick;
                startLevelCard.onclick = (e) => {
                    // 设置为普通闯关模式
                    this.setPlayMode('normal');
                    console.log('WordDataLoader: 已设置为普通闯关模式');
                    
                    // 执行原始点击事件（如果有）
                    if (typeof originalOnClick === 'function') {
                        originalOnClick.call(startLevelCard, e);
                    }
                };
            }
            
            // 监听"随机挑战"卡片点击
            const randomCard = document.querySelector('.func-card[data-type="secondary"]:nth-child(2)');
            if (randomCard) {
                const originalOnClick = randomCard.onclick;
                randomCard.onclick = (e) => {
                    // 设置为随机挑战模式
                    this.setPlayMode('random', { wordCount: 20 });
                    console.log('WordDataLoader: 已设置为随机挑战模式');
                    
                    // 执行原始点击事件（如果有）
                    if (typeof originalOnClick === 'function') {
                        originalOnClick.call(randomCard, e);
                    }
                };
            }
            
            // 监听"导入单词"卡片点击
            const importCard = document.querySelector('.func-card[data-type="secondary"]:nth-child(3)');
            if (importCard) {
                const originalOnClick = importCard.onclick;
                importCard.onclick = (e) => {
                    // 设置为导入单词模式
                    this.setPlayMode('imported');
                    console.log('WordDataLoader: 已设置为导入单词模式');
                    
                    // 执行原始点击事件（如果有）
                    if (typeof originalOnClick === 'function') {
                        originalOnClick.call(importCard, e);
                    }
                };
            }
            
            // 监听"今日推荐"卡片点击
            const dailyCard = document.querySelector('.func-card[data-type="secondary"]:nth-child(4)');
            if (dailyCard) {
                const originalOnClick = dailyCard.onclick;
                dailyCard.onclick = (e) => {
                    // 设置为今日推荐模式
                    this.setPlayMode('daily');
                    console.log('WordDataLoader: 已设置为今日推荐模式');
                    
                    // 执行原始点击事件（如果有）
                    if (typeof originalOnClick === 'function') {
                        originalOnClick.call(dailyCard, e);
                    }
                };
            }
            
            console.log('WordDataLoader: 首页功能卡片监听器设置完成');
        } catch (error) {
            console.error('WordDataLoader: 设置功能卡片监听器出错', error);
        }
    },
    
    /**
     * 测试API连接
     * @returns {Promise<boolean>} 连接是否成功
     */
    testConnection: async function() {
        try {
            console.log('WordDataLoader: 测试API连接');
            const response = await fetch(`${this.API_BASE_URL}/`);
            
            if (response.ok) {
                console.log('WordDataLoader: API连接成功');
                return true;
            } else {
                console.warn(`WordDataLoader: API连接失败 - ${response.status} ${response.statusText}`);
                return false;
            }
        } catch (error) {
            console.error('WordDataLoader: API连接测试错误', error);
            return false;
        }
    },

    // 设置游戏类型
    setPlayMode: function(mode, params = {}) {
        this.currentPlayMode = mode || 'normal';
        
        // 更新参数
        if (params.levelId) this.playParams.levelId = params.levelId;
        if (params.chapterId) this.playParams.chapterId = params.chapterId;
        if (params.wordCount) this.playParams.wordCount = params.wordCount;
        if (params.sourceId) this.playParams.sourceId = params.sourceId;
        
        // 保存到localStorage以便在页面跳转后恢复
        localStorage.setItem('wordgame_mode', this.currentPlayMode);
        localStorage.setItem('wordgame_params', JSON.stringify(this.playParams));
        
        console.log(`WordDataLoader: 已设置游戏类型为 [${this.currentPlayMode}], 参数:`, this.playParams);
        return this;
    },
    
    // 获取当前游戏类型
    getPlayMode: function() {
        // 尝试从localStorage恢复模式设置
        if (!this.currentPlayMode || this.currentPlayMode === 'normal') {
            const savedMode = localStorage.getItem('wordgame_mode');
            if (savedMode) {
                this.currentPlayMode = savedMode;
                
                // 恢复参数
                try {
                    const savedParams = localStorage.getItem('wordgame_params');
                    if (savedParams) {
                        this.playParams = JSON.parse(savedParams);
                    }
                } catch (error) {
                    console.error('恢复游戏参数失败:', error);
                }
                
                console.log(`WordDataLoader: 已恢复游戏类型 [${this.currentPlayMode}], 参数:`, this.playParams);
            }
        }
        
        return this.currentPlayMode;
    }
};

// window.WordDataLoader = WordDataLoader;

// 初始化数据加载器
document.addEventListener('DOMContentLoaded', function() {
    WordDataLoader.init();
});
