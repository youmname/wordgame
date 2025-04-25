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
    
    /**
     * 获取包含认证Token的请求头
     * 如果没有Token，则跳转到登录页
     * @returns {object | null} 返回请求头对象，或者在未登录时返回null
     */
    _getAuthHeaders: function() {
        const token = localStorage.getItem('authToken');
        if (!token) {
            console.warn('WordDataLoader: 未找到 authToken，用户未登录或登录已过期，将跳转到登录页。');
            // 直接跳转到登录页面
            window.location.href = '页面.html'; // 假设登录页面是 页面.html
            return null; // 返回null表示不应继续发送请求
        }
        return {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json' // 根据需要添加其他默认头
        };
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
        
        const headers = this._getAuthHeaders(); // 获取认证头
        if (!headers) { // 如果未登录（已跳转），则直接返回
            return [];
        }
        console.log('getChaptersByLevel: 读取到的 authToken:', localStorage.getItem('authToken'));
        
        try {
            console.log(`WordDataLoader: 开始获取级别${levelId}的章节`);
            const url = `${this.API_BASE_URL}${this.API_ENDPOINTS.LEVEL_CHAPTERS.replace('{id}', levelId)}`;
            const response = await fetch(url, { headers: headers });
            
            if (!response.ok) {
                // 如果是 401 Unauthorized，可能是 Token 过期，也跳转登录
                if (response.status === 401) {
                    console.warn('WordDataLoader: 获取章节时收到 401 Unauthorized，Token 可能已过期，将跳转到登录页。');
                    localStorage.removeItem('authToken'); // 清除可能无效的 Token
                    window.location.href = '页面.html';
                    return [];
                }
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
            // 获取当前游戏类型 - 从store获取
            let playMode = 'normal';
            if (window.store && typeof window.store.getState === 'function') {
                playMode = window.store.getState().game.playMode || 'normal';
            }
            if(chapterId === 'random'){
                console.log('~~~~~~~~~chapterId的值为:~~~~~~~~~~~~~ ', chapterId);
                console.log("~~~~~~~~~playMode的值为:~~~~~~~~~~~~~",playMode);
                return await this.getRandomWordsFromLevel(chapterId, 20);
            }
            console.log(`WordDataLoader: 当前游戏类型 [${playMode}]`);
            
            // 根据游戏类型返回不同的单词数据，强制使用对应的数据源
            switch (playMode) {
                case 'random':                  
                    // 随机挑战模式 - 强制使用随机数据源
                    const levelId = window.store.getState().game.currentLevel || 'all';
                    const wordCount = 20;
                    console.log(`WordDataLoader: 随机挑战模式，从级别[${levelId}]获取[${wordCount}]个单词`);
                    return await this.getRandomWordsFromLevel(levelId, wordCount);
                    
                case 'imported':
                    // 导入单词模式 - 强制使用本地导入数据
                    console.log(`WordDataLoader: 导入单词模式`);
                    return await this.getImportedWords();
                    
                case 'daily':
                    // 今日推荐模式 - 强制使用推荐数据
                    console.log('WordDataLoader: 今日推荐模式');
                    return await this.getDailyRecommendedWords();
                    
                default:
                    // 闯关模式（正常模式）- 从指定章节获取单词
                    if (!chapterId) {
                        console.error('WordDataLoader.getAllWordsByChapter: 未提供章节ID');
                        return [];
                    }
                    
                    console.log(`WordDataLoader: 闯关(章节)模式，获取章节[${chapterId}]的单词`);
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
            // 返回空数组，不再尝试其他数据源
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
    
    /**
     * 获取导入的单词
     * @returns {Promise<Array>} 单词数组
     */
    getImportedWords: async function() {
        try {
            // 检查当前是否为imported模式
            let playMode = this.getPlayMode();
            if (window.store && typeof window.store.getState === 'function') {
                playMode = window.store.getState().game.playMode;
            }
            
            if (playMode !== 'imported') {
                console.log('当前不是导入模式，不使用本地导入数据');
                return [];
            }
            
            console.log(`WordDataLoader: 获取导入的单词`);
            
            // 首先检查全局变量是否有导入的单词数据
            if (window.importedWordPairs && Array.isArray(window.importedWordPairs) && window.importedWordPairs.length > 0) {
                console.log(`从全局变量获取到${window.importedWordPairs.length}个导入单词`);
                return window.importedWordPairs;
            }
            
            // 获取当前设置的数据源类型
            const dataSourceType = localStorage.getItem('wordgame_data_source_type') || 'latest';
            console.log(`当前数据源类型: ${dataSourceType}`);
            
            // 根据数据源类型获取单词
            let localImportedWords;
            
            if (dataSourceType === 'excel') {
                // 优先使用Excel导入的单词
                localImportedWords = this.getLocalImportedWords('excel_import');
                if (localImportedWords && localImportedWords.length > 0) {
                    console.log(`从Excel导入获取到${localImportedWords.length}个单词`);
                    return localImportedWords;
                }
            } 
            else if (dataSourceType === 'input') {
                // 优先使用手动输入的单词
                localImportedWords = this.getLocalImportedWords('custom_input');
                if (localImportedWords && localImportedWords.length > 0) {
                    console.log(`从手动输入获取到${localImportedWords.length}个单词`);
                    return localImportedWords;
                }
            }
            else {
                // 使用最新的导入单词，不管来源
                localImportedWords = this.getLocalImportedWords('latest');
                if (localImportedWords && localImportedWords.length > 0) {
                    console.log(`从最新导入获取到${localImportedWords.length}个单词`);
                    return localImportedWords;
                }
            }
            
            // 如果指定类型没有找到数据，尝试其他来源
            
            // 尝试Excel导入
            if (dataSourceType !== 'excel') {
                localImportedWords = this.getLocalImportedWords('excel_import');
                if (localImportedWords && localImportedWords.length > 0) {
                    console.log(`从Excel导入获取到${localImportedWords.length}个单词（备选）`);
                    return localImportedWords;
                }
            }
            
            // 尝试手动输入
            if (dataSourceType !== 'input') {
                localImportedWords = this.getLocalImportedWords('custom_input');
                if (localImportedWords && localImportedWords.length > 0) {
                    console.log(`从手动输入获取到${localImportedWords.length}个单词（备选）`);
                    return localImportedWords;
                }
            }
            
            // 如果还没找到数据，尝试latest
            localImportedWords = this.getLocalImportedWords('latest');
            if (localImportedWords && localImportedWords.length > 0) {
                console.log(`从最新导入获取到${localImportedWords.length}个单词（备选）`);
                return localImportedWords;
            }
            
            // 如果没有找到任何导入单词，返回一些默认单词
            console.warn('未找到导入的单词，使用默认单词');
            return [
                { word: "apple", meaning: "苹果", id: "default_1" },
                { word: "banana", meaning: "香蕉", id: "default_2" },
                { word: "orange", meaning: "橙子", id: "default_3" },
                { word: "grape", meaning: "葡萄", id: "default_4" },
                { word: "strawberry", meaning: "草莓", id: "default_5" },
                { word: "computer", meaning: "电脑", id: "default_6" },
                { word: "phone", meaning: "手机", id: "default_7" },
                { word: "table", meaning: "桌子", id: "default_8" },
                { word: "chair", meaning: "椅子", id: "default_9" },
                { word: "book", meaning: "书", id: "default_10" }
            ];
        } catch (error) {
            console.error(`WordDataLoader.getImportedWords错误:`, error);
            // 发生错误时返回一些简单的单词
            return [
                { word: "hello", meaning: "你好", id: "error_1" },
                { word: "world", meaning: "世界", id: "error_2" },
                { word: "study", meaning: "学习", id: "error_3" },
                { word: "word", meaning: "单词", id: "error_4" },
                { word: "game", meaning: "游戏", id: "error_5" }
            ];
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
            
            // 获取当前激活的卡片类型
            const isUploadCardActive = document.querySelector('.upload-card.active') !== null;
            const isInputCardActive = document.querySelector('.input-card.active') !== null;
            
            // 设置数据源类型
            let dataSourceType = 'latest';
            if (isUploadCardActive && sourceId !== 'custom_input') {
                dataSourceType = 'excel';
                // 同时保存到excel_import
                const excelKey = 'imported_words_excel_import';
                const excelData = {
                    timestamp: Date.now(),
                    words: words
                };
                localStorage.setItem(excelKey, JSON.stringify(excelData));
                console.log(`已保存${words.length}个单词到Excel导入存储`);
            } else if (isInputCardActive || sourceId === 'custom_input') {
                dataSourceType = 'input';
                // 同时保存到custom_input
                const inputKey = 'imported_words_custom_input';
                const inputData = {
                    timestamp: Date.now(),
                    words: words
                };
                localStorage.setItem(inputKey, JSON.stringify(inputData));
                console.log(`已保存${words.length}个单词到手动输入存储`);
            }
            
            // 保存数据源类型
            localStorage.setItem('wordgame_data_source_type', dataSourceType);
            console.log(`设置当前数据源类型: ${dataSourceType}`);
            
            // 保存到latest
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
                    if (window.store && typeof window.store.updatePlayMode === 'function') {
                        window.store.updatePlayMode('normal');
                        console.log('WordDataLoader: 已设置为普通闯关模式');
                    }
                    
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
                    if (window.store && typeof window.store.updatePlayMode === 'function') {
                        window.store.updatePlayMode('random');
                        console.log('WordDataLoader: 已设置为随机挑战模式');
                    }
                    
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
                    if (window.store && typeof window.store.updatePlayMode === 'function') {
                        window.store.updatePlayMode('imported');
                        console.log('WordDataLoader: 已设置为导入单词模式');
                    }
                    
                    // 执行原始点击事件（如果有）
                    if (typeof originalOnClick === 'function') {
                        originalOnClick.call(importCard, e);
                    }
                };
            }
            
            // 监听"今日推荐"卡片点击
            const dailyCard = document.querySelector('.func-card[data-type="secondary"]:nth-child(4)');
            if (dailyCard) {
                // 新增：直接跳转到 card.html
                dailyCard.onclick = (e) => {
                    e.preventDefault(); // 阻止可能的默认行为
                    console.log('WordDataLoader: 点击今日推荐，跳转到 card.html');
                    window.location.href = 'card.html'; // 确保 card.html 路径正确
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

    // 获取当前游戏类型
    getPlayMode: function() {
        // 优先从store获取
        if (window.store && typeof window.store.getState === 'function') {
            try {
                const storePlayMode = window.store.getState().game.playMode;
                if (storePlayMode) {
                    // 同步到本地状态
                    this.playMode = storePlayMode;
                    console.log(`从store获取游戏模式: [${storePlayMode}]`);
                    return storePlayMode;
                }
            } catch (error) {
                console.warn('尝试从store获取游戏模式时出错:', error);
            }
        }
        
        // 回退到localStorage
        if (!this.playMode || this.playMode === 'normal') {
            // 尝试从两个可能的键名中获取
            const savedMode = localStorage.getItem('PlayMode');
            if (savedMode) {
                this.playMode = savedMode;
                
                // 恢复参数
                try {
                    const savedParams = localStorage.getItem('playModeParams');
                    if (savedParams) {
                        this.playParams = JSON.parse(savedParams);
                    }
                } catch (error) {
                    console.error('恢复游戏参数失败:', error);
                }
                
                console.log(`从localStorage恢复游戏类型 [${this.playMode}], 参数:`, this.playParams);
                
                // 同步到store
                this.syncToStore(this.playMode);
            }
        }
        
        return this.playMode || 'normal';
    },

    // 设置游戏类型
    setPlayMode: function(mode, params = {}) {
        // 记录上一个模式
        const previousMode = this.playMode;
        
        this.playMode = mode || 'normal';
        
        // 如果切换了模式，清除上一个模式的状态
        if (previousMode !== this.playMode) {
            console.log(`游戏模式从 [${previousMode}] 切换到 [${this.playMode}]`);
            
            // 如果从imported模式切换出来，清除内存数据
            if (previousMode === 'imported') {
                window.importedWordPairs = [];
                console.log('已清除导入模式的内存数据');
            }
        }
        
        // 更新参数
        if (params.levelId) this.playParams.levelId = params.levelId;
        if (params.chapterId) this.playParams.chapterId = params.chapterId;
        if (params.wordCount) this.playParams.wordCount = params.wordCount;
        if (params.sourceId) this.playParams.sourceId = params.sourceId;
        
        // 保存到localStorage以便在页面跳转后恢复
        localStorage.setItem('PlayMode', this.playMode);
        localStorage.setItem('playModeParams', JSON.stringify(this.playParams));
        
        // 同步到store（更新store中的状态）
        if(window.store && typeof window.store.updatePlayMode === 'function'){
            window.store.updatePlayMode(mode);
        }
        //保存到localStorage
        localStorage.setItem('PlayMode', this.playMode);
        
        console.log(`WordDataLoader: 已设置游戏类型为 [${this.playMode}], 参数:`, this.playParams);
        return this;
    },
    
    // 同步到store的辅助方法
    syncToStore: function(mode) {
        // 同步到store
        if (window.store && typeof window.store.updatePlayMode === 'function') {
            
        }
    },

    // Excel数据存储
    excelData: {},
    
    /**
     * 处理Excel文件上传
     * @param {File} file - 上传的Excel文件
     * @returns {Promise<Array>} 处理后的单词数组
     */
    handleExcelUpload: async function(file) {
        if (!file) {
            console.error('WordDataLoader.handleExcelUpload: 未提供文件');
            return [];
        }
        
        return new Promise((resolve, reject) => {
            try {
                console.log('WordDataLoader: 开始处理Excel文件', file.name);
                
                // 检查是否加载了XLSX库
                if (typeof XLSX === 'undefined') {
                    console.warn('XLSX库未加载，尝试动态加载');
                    
                    // 如果XLSX未定义，动态加载
                    const script = document.createElement('script');
                    script.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
                    script.onload = () => {
                        console.log('XLSX库加载成功，重新处理Excel');
                        this.processExcelFile(file).then(resolve).catch(reject);
                    };
                    script.onerror = () => {
                        const error = new Error('无法加载XLSX库');
                        console.error(error);
                        reject(error);
                    };
                    document.head.appendChild(script);
                    return;
                }
                
                this.processExcelFile(file).then(resolve).catch(reject);
            } catch (error) {
                console.error('Excel处理错误:', error);
                reject(error);
            }
        });
    },
    
    /**
     * 处理Excel文件
     * @private
     */
    processExcelFile: async function(file) {
        return new Promise((resolve, reject) => {
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
                    
                    console.log("Excel文件包含以下工作表:", workbook.SheetNames);
                    
                    // 清空现有数据
                    this.excelData = {};
                    
                    // 所有有效单词列表
                    let allWords = [];
                    
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
                        
                        // 找出表头列名
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
                            return;
                        }
                        
                        // 提取单词和定义
                        const wordList = [];
                        json.forEach((row, index) => {
                            const word = (row[wordColumnName] || '').toString().trim();
                            let meaning = (row[defColumnName] || '').toString().trim();
                            
                            // 处理HTML标签
                            meaning = meaning.replace(/<[^>]*>/g, ' ');
                            
                            // 添加调试信息
                            if (index < 5) { // 只打印前5行作为示例
                                console.log(`行${index + 1}: 单词="${word}", 定义="${meaning}"`);
                            }
                            
                            // 确保单词和定义非空
                            if (word && meaning) {
                                // 使用与data-loader.js相同的属性名
                                wordList.push({
                                    word: word,
                                    meaning: meaning,
                                    id: `excel_${sheetName}_${index}`,
                                    phonetic: row.phonetic || '',
                                    example: row.example || ''
                                });
                            } else {
                                console.log(`跳过行${index + 1}: 单词或定义为空`);
                            }
                        });
                        
                        if (wordList.length > 0) {
                            console.log(`工作表${sheetName}提取到${wordList.length}个有效单词`);
                            this.excelData[sheetName] = wordList;
                            // 添加到总列表
                            allWords = allWords.concat(wordList);
                        } else {
                            console.warn(`工作表${sheetName}没有有效单词`);
                        }
                    });
                    
                    // 检查是否成功解析了数据
                    if (allWords.length === 0) {
                        throw new Error("未能从Excel中提取有效数据，请检查文件格式");
                    }
                    
                    // 保存到本地存储
                    this.setLocalImportedWords(allWords, 'excel_import');
                    
                    // 设置为导入模式
                    if (window.store && typeof window.store.updatePlayMode === 'function') {
                        window.store.updatePlayMode('imported');
                        console.log('已更新store为导入模式');
                    }
                    
                    console.log(`Excel处理完成，共提取${allWords.length}个单词`);
                    resolve(allWords);
                    
                } catch (err) {
                    console.error("Excel解析错误:", err);
                    reject(err);
                }
            };
            
            reader.onerror = () => {
                const error = new Error("文件读取错误");
                console.error(error);
                reject(error);
            };
            
            // 读取文件
            reader.readAsArrayBuffer(file);
        });
    },
    
    /**
     * 处理自定义输入的单词
     * @param {string} inputText - 用户输入的文本
     * @returns {Array} 处理后的单词对象数组
     */
    processCustomInput: function(inputText) {
        if (!inputText || typeof inputText !== 'string') {
            console.error('WordDataLoader.processCustomInput: 无效的输入文本');
            return [];
        }
        
        try {
            console.log('WordDataLoader: 处理自定义输入文本');
            
            // 按行分割
            const lines = inputText.split(/\r?\n/).filter(line => line.trim());
            
            // 存储结果
            const wordPairs = [];
            
            // 检测分隔符模式
            let separator = '';
            
            // 尝试检测最常见的分隔符
            const testLine = lines[0] || '';
            if (testLine.includes(':')) separator = ':';
            else if (testLine.includes('：')) separator = '：';
            else if (testLine.includes('-')) separator = '-';
            else if (testLine.includes('=')) separator = '=';
            else if (testLine.includes('\t')) separator = '\t';
            else separator = ' ';  // 默认使用空格
            
            console.log(`检测到分隔符: "${separator}"`);
            
            // 处理每一行
            lines.forEach((line, index) => {
                // 移除多余空格并按分隔符划分
                const parts = line.split(separator).map(part => part.trim());
                
                // 如果分割后有两个以上部分，取第一个作为单词，其余拼接作为定义
                if (parts.length >= 2) {
                    const word = parts[0].trim();
                    const meaning = parts.slice(1).join(' ').trim();
                    
                    if (word && meaning) {
                        wordPairs.push({
                            word: word,
                            meaning: meaning,
                            id: `custom_${index}`,
                            phonetic: '',
                            example: ''
                        });
                    }
                } else if (parts.length === 1 && parts[0].trim()) {
                    // 只有一个部分，仍然添加到列表（可能用于手动指定定义）
                    wordPairs.push({
                        word: parts[0].trim(),
                        meaning: '(未提供释义)',
                        id: `custom_${index}`,
                        phonetic: '',
                        example: ''
                    });
                }
            });
            
            console.log(`从自定义输入中提取了${wordPairs.length}个单词`);
            
            // 保存到本地存储
            if (wordPairs.length > 0) {
                this.setLocalImportedWords(wordPairs, 'custom_input');
                
                // 设置为导入模式
                if (window.store && typeof window.store.updatePlayMode === 'function') {
                    window.store.updatePlayMode('imported');
                    console.log('已更新store为导入模式');
                }
            }
            
            return wordPairs;
            
        } catch (error) {
            console.error('处理自定义输入错误:', error);
            return [];
        }
    },

    /**
     * 新增：获取特定章节的详细信息
     * @param {string} chapterId - 章节ID (注意：这里传入的可能是原始章节名，需要与API对应)
     * @returns {Promise<Object|null>} - 章节详情对象或null
     */
    async getChapterDetails(chapterId) {
        if (!chapterId) {
            console.error('WordDataLoader.getChapterDetails: chapterId is required.');
            return null;
        }
        // 确保使用 encodeURIComponent 处理可能包含特殊字符的 chapterId
        const apiUrl = `${this.API_BASE_URL}/api/chapters/${encodeURIComponent(chapterId)}`;
        console.log(`WordDataLoader: Fetching details for chapter ${chapterId} from ${apiUrl}`);
        try {
            const response = await fetch(apiUrl, {
                headers: this._getAuthHeaders() // 复用获取认证头的方法
            });
            if (!response.ok) {
                throw new Error(`API request failed: ${response.status} ${response.statusText}`);
            }
            const data = await response.json();
            if (data.success && data.chapter) {
                console.log(`WordDataLoader: Successfully fetched details for chapter ${chapterId}`);
                return data.chapter; // 返回包含 order_num 的章节对象
            } else {
                console.warn(`WordDataLoader: API call successful but no chapter details found for ${chapterId}. Message: ${data.message}`);
                return null;
            }
        } catch (error) {
            console.error(`WordDataLoader: Error fetching chapter details for ${chapterId}:`, error);
            return null;
        }
    },

    /**
     * 获取特定级别的所有章节列表
     */
    getChaptersByLevelList: async function(levelId) {
        if (!levelId) {
            console.error('WordDataLoader.getChaptersByLevelList: 未提供级别ID');
            return [];
        }
        
        const headers = this._getAuthHeaders(); // 获取认证头
        if (!headers) { // 如果未登录（已跳转），则直接返回
            return [];
        }
        console.log('getChaptersByLevelList: 读取到的 authToken:', localStorage.getItem('authToken'));
        
        try {
            console.log(`WordDataLoader: 开始获取级别${levelId}的章节列表`);
            const url = `${this.API_BASE_URL}${this.API_ENDPOINTS.LEVEL_CHAPTERS.replace('{id}', levelId)}`;
            const response = await fetch(url, { headers: headers });
            
            if (!response.ok) {
                // 如果是 401 Unauthorized，可能是 Token 过期，也跳转登录
                if (response.status === 401) {
                    console.warn('WordDataLoader: 获取章节列表时收到 401 Unauthorized，Token 可能已过期，将跳转到登录页。');
                    localStorage.removeItem('authToken'); // 清除可能无效的 Token
                    window.location.href = '页面.html';
                    return [];
                }
                throw new Error(`获取章节列表失败: ${response.status} ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.message || '获取章节列表失败');
            }
            
            console.log(`WordDataLoader: 成功获取级别${levelId}的章节列表`, data.chapters);
            return data.chapters || [];
        } catch (error) {
            console.error(`WordDataLoader.getChaptersByLevelList(${levelId}) 错误:`, error);
            // 返回空数组，让调用者处理
            return [];
        }
    }
};

// window.WordDataLoader = WordDataLoader;

// 初始化数据加载器
document.addEventListener('DOMContentLoaded', function() {
    WordDataLoader.init();
});
