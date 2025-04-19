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
     * @param {number|string} chapterId - 章节ID
     * @returns {Promise<Array>} 单词数组
     */
    getAllWordsByChapter: async function(chapterId) {
        if (!chapterId) {
            console.error('WordDataLoader.getAllWordsByChapter: 未提供章节ID');
            return [];
        }
        
        try {
            console.log(`WordDataLoader: 开始获取章节${chapterId}的所有单词`);
            // 使用新的API端点 - allwords
            // const url = `${this.API_BASE_URL}/api/chapters/${chapterId}/allwords`;
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
                definition: word.meaning || '',
                id: word.id,
                phonetic: word.phonetic || '',
                phrase: word.phrase || '',
                example: word.example || '',
                note: word.note || ''
            })).filter(pair => pair.word && pair.definition);
            
            console.log(`格式化后的单词数: ${formattedWords.length}`);
            return formattedWords;
        } catch (error) {
            console.error(`WordDataLoader.getAllWordsByChapter(${chapterId}) 错误:`, error);
            // 返回空数组，让调用者处理
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
        
        // 测试API连接
        this.testConnection();
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
    }
};

// window.WordDataLoader = WordDataLoader;

// 初始化数据加载器
document.addEventListener('DOMContentLoaded', function() {
    WordDataLoader.init();
});
