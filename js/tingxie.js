// 全局变量定义
let words = [];                    // 单词列表
let currentWordIndex = 0;          // 当前单词索引
let currentWordData = null;        // 当前单词数据对象
let needsClear = false;            // 标记是否需要清空输入框

// 播放相关
let currentVoice = null;          // 当前选择的语音
let currentRate = 1.0;            // 当前语速
let currentRepeat = 2;            // 当前重复次数
let currentInterval = 1500;       // 播放间隔(毫秒)
let isPlaying = false;            // 是否正在播放

// DOM元素引用
let wordInput = null;
let feedbackArea = null;
let playAudioBtn = null;
let prevWordBtn = null;
let nextWordBtn = null;
let checkBtn = null;
let progressBar = null;
let progressText = null;
let playingStatus = null;
let playingWord = null;

// 模拟数据
const mockData = {
        levels: [
        { id: 'level1', name: '初级词汇' },
        { id: 'level2', name: '中级词汇' },
        { id: 'level3', name: '高级词汇' }
    ],
    chapters: {
        'level1': [
            { id: 'chapter1-1', name: '第1章 - 日常用语' },
            { id: 'chapter1-2', name: '第2章 - 食物' },
            { id: 'chapter1-3', name: '第3章 - 颜色' }
        ],
        'level2': [
            { id: 'chapter2-1', name: '第1章 - 自然' },
            { id: 'chapter2-2', name: '第2章 - 科技' },
            { id: 'chapter2-3', name: '第3章 - 商务' }
        ],
        'level3': [
            { id: 'chapter3-1', name: '第1章 - 学术' },
            { id: 'chapter3-2', name: '第2章 - 文学' },
            { id: 'chapter3-3', name: '第3章 - 专业术语' }
        ]
    },
    words: {
        'chapter1-1': [
            { word: 'hello', meaning: '你好' },
            { word: 'goodbye', meaning: '再见' },
            { word: 'thanks', meaning: '谢谢' }
        ],
        'chapter1-2': [
            { word: 'apple', meaning: '苹果' },
            { word: 'banana', meaning: '香蕉' },
            { word: 'orange', meaning: '橙子' },
            { word: 'pear', meaning: '梨' },
            { word: 'pineapple', meaning: '菠萝' },
            { word: 'strawberry', meaning: '草莓' },
            { word: 'watermelon', meaning: '西瓜' },
            { word: 'grape', meaning: '葡萄' },
            { word: 'mango', meaning: '芒果' },
            { word: 'kiwi', meaning: '奇异果' },
            { word: 'peach', meaning: '桃子' },
            { word: 'cherry', meaning: '樱桃' },
            { word: 'lemon', meaning: '柠檬' },
            { word: 'lime', meaning: '酸橙' },
            { word: 'mango', meaning: '芒果' },
            
            
        ],
        'chapter1-3': [
            { word: 'red', meaning: '红色' },
            { word: 'blue', meaning: '蓝色' },
            { word: 'green', meaning: '绿色' }
        ],
        'chapter2-1': [
            { word: 'mountain', meaning: '山' },
            { word: 'river', meaning: '河流' },
            { word: 'forest', meaning: '森林' }
        ],
        'chapter2-2': [
            { word: 'computer', meaning: '电脑' },
            { word: 'phone', meaning: '手机' },
            { word: 'internet', meaning: '互联网' }
        ],
        'chapter2-3': [
            { word: 'meeting', meaning: '会议' },
            { word: 'report', meaning: '报告' },
            { word: 'contract', meaning: '合同' }
        ],
        'chapter3-1': [
            { word: 'theory', meaning: '理论' },
            { word: 'experiment', meaning: '实验' },
            { word: 'research', meaning: '研究' }
        ],
        'chapter3-2': [
            { word: 'novel', meaning: '小说' },
            { word: 'poem', meaning: '诗歌' },
            { word: 'essay', meaning: '散文' }
        ],
        'chapter3-3': [
            { word: 'algorithm', meaning: '算法' },
            { word: 'paradigm', meaning: '范式' },
            { word: 'synthesis', meaning: '合成' }
        ]
    }
};

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', () => {
    console.log('页面加载完成，初始化听写应用');
    initializeApp();
});

// 初始化应用
function initializeApp() {
    // 获取DOM元素
    getDOMElements();
    
    // 添加额外样式
    addAdditionalStyles();
    
    // 初始化语音合成
    initSpeechSynthesis();
    
    // 绑定事件
    bindEvents();
    
    // 加载设置
        loadSettings();
    
    // 检查URL参数
    checkUrlParameters();
    
    // 填充级别列表
    populateLevels();
}

// 获取DOM元素
function getDOMElements() {
    wordInput = document.getElementById('wordInput');
    feedbackArea = document.getElementById('feedbackArea');
    playAudioBtn = document.getElementById('playAudioBtn');
    prevWordBtn = document.getElementById('prevWordBtn');
    nextWordBtn = document.getElementById('nextWordBtn');
    checkBtn = document.getElementById('checkBtn');
    progressBar = document.querySelector('.progress-bar');
    progressText = document.getElementById('progressText');
    playingStatus = document.getElementById('playingStatus');
    playingWord = document.getElementById('playingWord');
    
    console.log('DOM元素获取完成');
}

// 添加额外样式
function addAdditionalStyles() {
    // 检查是否已添加样式
    if (document.getElementById("additionalStyles")) {
        return;
    }
    
    const style = document.createElement("style");
    style.id = "additionalStyles";
    style.textContent = `
        .active-pulse {
            animation: button-pulse 1.5s infinite;
        }
        
        @keyframes button-pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.05); box-shadow: 0 0 10px rgba(24, 144, 255, 0.5); }
            100% { transform: scale(1); }
        }
    `;
    document.head.appendChild(style);
    console.log('添加额外样式完成');
}

// 初始化语音合成
function initSpeechSynthesis() {
    if (!window.speechSynthesis) {
        console.error('浏览器不支持语音合成API');
        showFeedback('浏览器不支持语音合成功能', 'error');
        return false;
    }
    
    // 获取可用语音列表
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = populateVoiceList;
    }
    
    populateVoiceList();
    console.log('语音合成初始化完成');
    return true;
}

// 填充语音列表
function populateVoiceList() {
    const voiceSelect = document.getElementById('voiceSelect');
    if (!voiceSelect) return;
    
    voiceSelect.innerHTML = '';
    
    const voices = window.speechSynthesis.getVoices();
    
    // 过滤中文和英文语音
    const filteredVoices = voices.filter(voice => 
        voice.lang.includes('zh') || voice.lang.includes('en')
    );
    
    console.log(`找到${filteredVoices.length}个适用语音`);
    
    if (filteredVoices.length === 0) {
        voiceSelect.innerHTML = '<option value="" disabled>未找到合适的语音</option>';
            return;
        }
    
    // 添加语音选项
    filteredVoices.forEach(voice => {
                    const option = document.createElement('option');
        option.value = voice.name;
        option.textContent = `${voice.name} (${voice.lang})`;
        option.setAttribute('data-lang', voice.lang);
        voiceSelect.appendChild(option);
    });
    
    // 尝试恢复保存的语音
    const savedVoice = localStorage.getItem('tingxieVoice');
    if (savedVoice) {
        for (let i = 0; i < voiceSelect.options.length; i++) {
            if (voiceSelect.options[i].value === savedVoice) {
                voiceSelect.selectedIndex = i;
                break;
            }
        }
            } else {
        // 选择默认语音
        selectDefaultVoice();
    }
    
    // 设置当前语音
    setCurrentVoice();
}

// 选择默认语音
function selectDefaultVoice() {
    const voiceSelect = document.getElementById('voiceSelect');
    if (!voiceSelect || voiceSelect.options.length === 0) return;
    
    let chineseIndex = -1;
    let englishIndex = -1;
    
    // 优先选择中文语音
    for (let i = 0; i < voiceSelect.options.length; i++) {
        const lang = voiceSelect.options[i].getAttribute('data-lang');
        if (lang && lang.startsWith('zh')) {
            chineseIndex = i;
            break;
        } else if (lang && lang.startsWith('en')) {
            englishIndex = i;
        }
    }
    
    // 按优先级选择
    if (chineseIndex >= 0) {
        voiceSelect.selectedIndex = chineseIndex;
    } else if (englishIndex >= 0) {
        voiceSelect.selectedIndex = englishIndex;
    } else if (voiceSelect.options.length > 0) {
        voiceSelect.selectedIndex = 0;
    }
}

// 设置当前语音
function setCurrentVoice() {
    const voiceSelect = document.getElementById('voiceSelect');
    if (!voiceSelect || voiceSelect.selectedIndex < 0) return;
    
    const selectedName = voiceSelect.value;
    if (!selectedName) return;
    
    const voices = window.speechSynthesis.getVoices();
    currentVoice = voices.find(voice => voice.name === selectedName);
    
    if (currentVoice) {
        localStorage.setItem('tingxieVoice', selectedName);
        console.log(`设置当前语音: ${selectedName}`);
    }
}

// 加载设置
function loadSettings() {
    // 加载语速
    const savedRate = localStorage.getItem('tingxieSpeechRate');
    if (savedRate) {
        currentRate = parseFloat(savedRate);
        const rateInput = document.getElementById('speechRateInput');
        const rateValue = document.getElementById('speechRateValue');
        if (rateInput) rateInput.value = currentRate;
        if (rateValue) rateValue.textContent = currentRate.toFixed(1);
    }
    
    // 加载重复次数
    const savedRepeat = localStorage.getItem('tingxieRepeatCount');
    if (savedRepeat) {
        currentRepeat = parseInt(savedRepeat);
        const repeatInput = document.getElementById('repeatCountInput');
        if (repeatInput) repeatInput.value = currentRepeat;
    }
    
    // 加载间隔时间
    const savedInterval = localStorage.getItem('tingxieInterval');
    if (savedInterval) {
        currentInterval = parseFloat(savedInterval) * 1000;
        const intervalInput = document.getElementById('intervalInput');
        if (intervalInput) intervalInput.value = (currentInterval/1000).toFixed(1);
    }
    
    console.log('设置加载完成');
}

// 保存设置
function saveSettings() {
    // 保存语音
    if (currentVoice) {
        localStorage.setItem('tingxieVoice', currentVoice.name);
    }
    
    // 保存语速
    localStorage.setItem('tingxieSpeechRate', currentRate.toString());
    
    // 保存重复次数
    localStorage.setItem('tingxieRepeatCount', currentRepeat.toString());
    
    // 保存间隔时间
    localStorage.setItem('tingxieInterval', (currentInterval/1000).toString());
    
    console.log('设置保存完成');
}

// 绑定事件
function bindEvents() {
    // 绑定按钮事件
    bindButtonEvents();
    
    // 绑定设置面板事件
    bindSettingsPanelEvents();
    
    console.log('事件绑定完成');
}

// 绑定按钮事件
function bindButtonEvents() {
    // 播放按钮
    if (playAudioBtn) {
        playAudioBtn.addEventListener('click', () => {
            if (isPlaying) {
                stopPlaying();
             } else {
                playCurrentWord();
            }
        });
    }
    
    // 检查按钮
    if (checkBtn) {
        checkBtn.addEventListener('click', handleSubmit);
    }
    
    // 上一个按钮
    if (prevWordBtn) {
        prevWordBtn.addEventListener('click', goToPrevWord);
    }
    
    // 下一个按钮
    if (nextWordBtn) {
        nextWordBtn.addEventListener('click', goToNextWord);
    }
    
    // 切换提示按钮
    const toggleHintBtn = document.getElementById('toggleHintBtn');
    if (toggleHintBtn) {
        toggleHintBtn.addEventListener('click', toggleHint);
    }
    
    // 输入框回车事件
    if (wordInput) {
        wordInput.addEventListener('keypress', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                handleSubmit();
            }
        });
        
        // 添加输入框输入事件，处理错误答案后的输入清空
        wordInput.addEventListener('input', handleInputChange);
    }
}

// 绑定设置面板事件
function bindSettingsPanelEvents() {
    // 获取设置面板元素
    const settingsBtn = document.getElementById('settingsBtn');
    const settingsPanel = document.getElementById('settingsPanelOverlay');
    const closeBtn = document.getElementById('closeSettingsBtn');
    
    // 打开设置面板
    if (settingsBtn && settingsPanel) {
        settingsBtn.addEventListener('click', () => {
            settingsPanel.classList.add('visible');
        });
    }
    
    // 关闭设置面板
    if (closeBtn && settingsPanel) {
        closeBtn.addEventListener('click', () => {
            settingsPanel.classList.remove('visible');
            saveSettings();
        });
    }
    
    // 点击空白区域关闭面板
    if (settingsPanel) {
        settingsPanel.addEventListener('click', (event) => {
            if (event.target === settingsPanel) {
                settingsPanel.classList.remove('visible');
                saveSettings();
            }
        });
    }
    
    // 语音选择事件
    const voiceSelect = document.getElementById('voiceSelect');
    if (voiceSelect) {
        voiceSelect.addEventListener('change', setCurrentVoice);
    }
    
    // 语速调整事件
    const speechRateInput = document.getElementById('speechRateInput');
    const speechRateValue = document.getElementById('speechRateValue');
    if (speechRateInput && speechRateValue) {
        speechRateInput.addEventListener('input', () => {
            currentRate = parseFloat(speechRateInput.value);
            speechRateValue.textContent = currentRate.toFixed(1);
        });
    }
    
    // 重复次数事件
    const repeatInput = document.getElementById('repeatCountInput');
    if (repeatInput) {
        repeatInput.addEventListener('input', () => {
            currentRepeat = parseInt(repeatInput.value);
        });
    }
    
    // 间隔时间事件
    const intervalInput = document.getElementById('intervalInput');
    if (intervalInput) {
        intervalInput.addEventListener('input', () => {
            currentInterval = parseFloat(intervalInput.value) * 1000;
        });
    }
}

// 检查URL参数
function checkUrlParameters() {
    const urlParams = new URLSearchParams(window.location.search);
    const levelParam = urlParams.get('level');
    const chapterParam = urlParams.get('chapter');
    
    if (levelParam && chapterParam) {
        console.log(`从URL加载参数: 级别=${levelParam}, 章节=${chapterParam}`);
        
        // 等待级别和章节加载后处理
        setTimeout(() => {
            const levelSelect = document.getElementById('levelSelect');
            const chapterSelect = document.getElementById('chapterSelect');
            
            if (levelSelect) {
                for (let i = 0; i < levelSelect.options.length; i++) {
                    if (levelSelect.options[i].value === levelParam) {
                        levelSelect.selectedIndex = i;
                        // 触发级别变更
                        const event = new Event('change');
                        levelSelect.dispatchEvent(event);
                        
                        // 等待章节加载
                        setTimeout(() => {
                            if (chapterSelect) {
                                for (let j = 0; j < chapterSelect.options.length; j++) {
                                    if (chapterSelect.options[j].value === chapterParam) {
                                        chapterSelect.selectedIndex = j;
                                        // 触发章节变更
                                        const event = new Event('change');
                                        chapterSelect.dispatchEvent(event);
                                        break;
                                    }
                                }
                            }
                        }, 300);
                        break;
                    }
                }
            }
        }, 500);
    }
}

// 填充级别列表
function populateLevels() {
    const levelSelect = document.getElementById('levelSelect');
    if (!levelSelect) return;
    
    // 清空现有选项
    levelSelect.innerHTML = '<option value="">选择级别</option>';
    
    // 从WordDataLoader获取级别数据
    if (window.WordDataLoader && typeof window.WordDataLoader.getLevels === 'function') {
        console.log('使用WordDataLoader获取级别数据');
        
        // 显示加载中
        showFeedback("加载级别数据中...", "info");
        
        window.WordDataLoader.getLevels().then(levels => {
            if (levels && levels.length > 0) {
                // 添加从API获取的级别选项
                levels.forEach(level => {
                    const option = document.createElement('option');
                    option.value = level.id;
                    option.textContent = level.name;
                    levelSelect.appendChild(option);
                });
                
                clearFeedback();
                console.log('成功从API加载级别列表');
            } else {
                console.warn('从API获取级别数据为空，使用备用数据');
                // 回退到模拟数据
                useMockLevels(levelSelect);
            }
        }).catch(error => {
            console.error('获取级别数据出错:', error);
            // 回退到模拟数据
            useMockLevels(levelSelect);
        });
    } else {
        console.warn('WordDataLoader不可用，使用备用数据');
        // 回退到模拟数据
        useMockLevels(levelSelect);
    }
    
    // 绑定级别变更事件
    levelSelect.addEventListener('change', function() {
        const levelId = this.value;
        if (!levelId) return;
        
        handleLevelChange(levelId);
    });
    
    console.log('级别列表填充初始化完成');
}

// 使用模拟数据填充级别列表（备用方案）
function useMockLevels(levelSelect) {
    mockData.levels.forEach(level => {
        const option = document.createElement('option');
        option.value = level.id;
        option.textContent = level.name;
        levelSelect.appendChild(option);
    });
    console.log('使用备用数据填充级别列表');
}

// 处理级别变更
function handleLevelChange(levelId) {
    const chapterSelect = document.getElementById('chapterSelect');
    if (!chapterSelect) return;
    
    // 清空章节选项
    chapterSelect.innerHTML = '<option value="">选择章节</option>';
    chapterSelect.disabled = true;
    
    // 显示加载中
    showFeedback("加载章节数据中...", "info");
    
    // 从WordDataLoader获取章节数据
    if (window.WordDataLoader && typeof window.WordDataLoader.getChaptersByLevel === 'function') {
        console.log(`使用WordDataLoader获取级别${levelId}的章节数据`);
        
        window.WordDataLoader.getChaptersByLevel(levelId).then(chapters => {
            if (chapters && chapters.length > 0) {
                // 启用选择器
                chapterSelect.disabled = false;
                
                // 添加从API获取的章节选项
                chapters.forEach(chapter => {
                    const option = document.createElement('option');
                    option.value = chapter.id;
                    option.textContent = chapter.name || `第${chapter.id}章`;
                    chapterSelect.appendChild(option);
                });
                
                clearFeedback();
                console.log(`成功从API加载级别${levelId}的章节列表`);
            } else {
                console.warn(`从API获取级别${levelId}的章节数据为空，使用备用数据`);
                // 回退到模拟数据
                useMockChapters(levelId, chapterSelect);
            }
        }).catch(error => {
            console.error(`获取级别${levelId}的章节数据出错:`, error);
            // 回退到模拟数据
            useMockChapters(levelId, chapterSelect);
        });
    } else {
        console.warn('WordDataLoader不可用，使用备用数据');
        // 回退到模拟数据
        useMockChapters(levelId, chapterSelect);
    }
    
    // 绑定章节变更事件
    chapterSelect.addEventListener('change', function() {
        const chapterId = this.value;
        if (!chapterId) return;
        
        loadWordsForChapter(chapterId);
    });
}

// 使用模拟数据填充章节列表（备用方案）
function useMockChapters(levelId, chapterSelect) {
    const chapters = mockData.chapters[levelId];
    if (!chapters || chapters.length === 0) {
        chapterSelect.innerHTML = '<option value="">没有可用章节</option>';
        chapterSelect.disabled = true;
        return;
    }
    
    // 启用选择器
    chapterSelect.disabled = false;
    
    // 添加章节选项
    chapters.forEach(chapter => {
        const option = document.createElement('option');
        option.value = chapter.id;
        option.textContent = chapter.name;
        chapterSelect.appendChild(option);
    });
    
    console.log(`使用备用数据填充级别${levelId}的章节列表`);
}

// 加载章节单词
function loadWordsForChapter(chapterId) {
    // 显示加载中
    showFeedback("加载单词数据中...", "info");
    
    // 从WordDataLoader获取单词数据
    if (window.WordDataLoader && typeof window.WordDataLoader.getWordsByChapter === 'function') {
        console.log(`使用WordDataLoader获取章节${chapterId}的单词数据`);
        
        window.WordDataLoader.getWordsByChapter(chapterId).then(wordList => {
            if (wordList && wordList.length > 0) {
                // 标准化单词格式
                const formattedWords = wordList.map(word => ({
                    word: word.word || '',
                    meaning: word.meaning || word.definition || word.chinese || ''
                })).filter(w => w.word && w.meaning);
                
                if (formattedWords.length > 0) {
                    // 初始化听写
                    words = formattedWords;
                    currentWordIndex = 0;
                    currentWordData = words[currentWordIndex];
                    
                    // 更新界面
                    initializeInterface();
                    
                    clearFeedback();
                    console.log(`成功从API加载章节${chapterId}单词，共${words.length}个单词`);
                    return;
                }
            }
            
            console.warn(`从API获取章节${chapterId}的单词数据为空或格式不正确，使用备用数据`);
            useMockWords(chapterId);
        }).catch(error => {
            console.error(`获取章节${chapterId}的单词数据出错:`, error);
            useMockWords(chapterId);
        });
    } else {
        console.warn('WordDataLoader不可用，使用备用数据');
        useMockWords(chapterId);
    }
}

// 使用模拟数据加载单词（备用方案）
function useMockWords(chapterId) {
    // 从模拟数据获取单词
    const chapterWords = mockData.words[chapterId];
    
    if (!chapterWords || chapterWords.length === 0) {
        console.warn(`章节${chapterId}没有可用备用单词`);
        showNoWordsMessage();
        return;
    }

    // 初始化听写
    words = [...chapterWords];
    currentWordIndex = 0;
    currentWordData = words[currentWordIndex];
    
    // 更新界面
    initializeInterface();
    
    console.log(`使用备用数据加载章节${chapterId}单词，共${words.length}个单词`);
}

// 显示无单词消息
function showNoWordsMessage() {
    const hintText = document.getElementById('hintText');
    if (hintText) {
        hintText.textContent = '当前章节没有可用单词';
    }
    
    if (feedbackArea) {
        feedbackArea.innerHTML = '<div class="alert alert-warning">当前章节没有可用单词，请选择其他章节</div>';
        feedbackArea.classList.add('feedback-visible');
    }
    
    disableControls();
}

// 禁用控制按钮
function disableControls() {
    if (playAudioBtn) playAudioBtn.disabled = true;
    if (checkBtn) checkBtn.disabled = true;
    if (prevWordBtn) prevWordBtn.disabled = true;
    if (nextWordBtn) nextWordBtn.disabled = true;
    if (wordInput) wordInput.disabled = true;
}

// 启用控制按钮
function enableControls() {
    if (playAudioBtn) playAudioBtn.disabled = false;
    if (checkBtn) checkBtn.disabled = false;
    if (wordInput) {
        wordInput.disabled = false;
        wordInput.focus();
    }
    
    updateNavigationButtons();
}

// 初始化听写界面
function initializeInterface() {
    if (!words || words.length === 0) {
        showNoWordsMessage();
        return;
    }
    
    currentWordData = words[currentWordIndex];
    
    updateWordInterface();
    updateProgressBar();
    enableControls();
    
    // 自动播放当前单词
    setTimeout(() => {
        playCurrentWord();
    }, 300);
    
    console.log('听写界面初始化完成');
}

// 更新单词界面
function updateWordInterface() {
    if (!words || words.length === 0 || currentWordIndex < 0 || currentWordIndex >= words.length) {
        console.error('无法更新单词界面：数据无效');
            return;
        }

        currentWordData = words[currentWordIndex];
    
    // 更新中文提示
    const hintText = document.getElementById('hintText');
    if (hintText && currentWordData) {
        hintText.textContent = currentWordData.meaning || '（无释义）';
    }
    
    // 清空输入框
    if (wordInput) {
        wordInput.value = '';
        wordInput.disabled = false;
        wordInput.focus();
        wordInput.classList.remove('correct', 'incorrect');
    }
    
    // 清空反馈
    clearFeedback();
    
    // 更新进度
        updateProgressBar();
    
    // 更新导航按钮
    updateNavigationButtons();
    
    console.log(`更新单词界面：${currentWordData.word}`);
    }

// 更新进度条
    function updateProgressBar() {
    if (!words || words.length === 0) {
        if (progressText) progressText.textContent = '0/0';
        return;
    }
    
    // 计算进度百分比
    const progress = ((currentWordIndex + 1) / words.length) * 100;
    
    // 更新进度条
    if (progressBar) {
        document.documentElement.style.setProperty('--progress-width', `${progress}%`);
    }
    
    // 更新进度文本
    if (progressText) {
        progressText.textContent = `${currentWordIndex + 1}/${words.length}`;
    }
}

// 更新导航按钮
function updateNavigationButtons() {
    if (!words || words.length === 0) {
        if (prevWordBtn) prevWordBtn.disabled = true;
        if (nextWordBtn) nextWordBtn.disabled = true;
        return;
    }
    
    // 更新上一个按钮
    if (prevWordBtn) {
        prevWordBtn.disabled = currentWordIndex <= 0;
    }
    
    // 更新下一个按钮
    if (nextWordBtn) {
        nextWordBtn.disabled = currentWordIndex >= words.length - 1;
    }
}

// 切换提示显示
function toggleHint() {
    const hintText = document.getElementById('hintText');
    const toggleBtn = document.getElementById('toggleHintBtn');
    
    if (!hintText) return;
    
    if (hintText.classList.contains('blurred')) {
        hintText.classList.remove('blurred');
        if (toggleBtn) toggleBtn.innerHTML = '<i class="fas fa-eye-slash"></i>';
            } else {
        hintText.classList.add('blurred');
        if (toggleBtn) toggleBtn.innerHTML = '<i class="fas fa-eye"></i>';
    }
}

// 播放当前单词
function playCurrentWord() {
    if (!currentWordData) {
        console.error("没有单词数据");
        return;
    }

    if (!window.speechSynthesis) {
        console.error("浏览器不支持语音合成");
        return;
    }

    // 停止之前的语音
    stopPlaying();
    isPlaying = true;

    // 添加播放状态视觉效果
    if (playAudioBtn) {
        playAudioBtn.classList.add("active-pulse");
    }

    // 显示正在播放状态
    if (playingStatus && playingWord) {
        playingWord.textContent = currentWordData.word;
        playingStatus.style.display = "block";
    }

    const utterance = new SpeechSynthesisUtterance(currentWordData.word);
    
    if (currentVoice) {
        utterance.voice = currentVoice;
    }
    
    utterance.rate = currentRate;
    
    console.log(`播放单词: ${currentWordData.word}, 语速: ${currentRate}`);
    
    let playCount = 0;
    const maxPlayCount = currentRepeat || 1;
    
    utterance.onend = function() {
        playCount++;
        
        if (playCount < maxPlayCount) {
            // 继续播放
            setTimeout(() => {
                window.speechSynthesis.speak(utterance);
            }, currentInterval);
        } else {
            // 播放完成
            isPlaying = false;
            
            // 移除播放状态
            if (playAudioBtn) {
                playAudioBtn.classList.remove("active-pulse");
            }
            
            if (playingStatus) {
                playingStatus.style.display = "none";
            }
            
            // 聚焦输入框
            if (wordInput) {
                wordInput.focus();
            }
        }
    };
    
    utterance.onerror = function(event) {
        console.error("播放错误:", event);
        isPlaying = false;
        
        // 移除播放状态
        if (playAudioBtn) {
            playAudioBtn.classList.remove("active-pulse");
        }
        
        if (playingStatus) {
            playingStatus.style.display = "none";
        }
    };
    
    try {
        window.speechSynthesis.speak(utterance);
    } catch (error) {
        console.error("播放失败:", error);
        isPlaying = false;
        
        // 移除播放状态
        if (playAudioBtn) {
            playAudioBtn.classList.remove("active-pulse");
        }
        
        if (playingStatus) {
            playingStatus.style.display = "none";
        }
    }
}

// 停止播放
function stopPlaying() {
    if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
    }
    
    isPlaying = false;
    
    // 移除播放状态
    if (playAudioBtn) {
        playAudioBtn.classList.remove("active-pulse");
    }
    
    if (playingStatus) {
        playingStatus.style.display = "none";
    }
}

// 处理输入框输入事件
function handleInputChange(event) {
    // 如果标记为需要清空，则清空输入框并重置标记
    if (needsClear) {
        wordInput.value = '';
        needsClear = false;
        
        // 因为我们刚刚清空了输入框，而用户的输入也被清空了
        // 所以我们需要把用户刚刚输入的字符重新添加回来
        const char = event.data;
        if (char) {
            wordInput.value = char;
        }
    }
}

// 处理提交答案
function handleSubmit() {
    if (!wordInput || !currentWordData) return;
    
    const userInput = wordInput.value.trim();
    
    if (!userInput) {
        showFeedback("请输入答案", "warning");
            return;
        }
    
    // 检查答案是否正确
    const isCorrect = userInput.toLowerCase() === currentWordData.word.toLowerCase();
    
    if (isCorrect) {
        // 答案正确
        wordInput.classList.add('correct');
        wordInput.classList.remove('incorrect');
        
        showFeedback("回答正确！", "success");
        
        // 禁用输入和检查按钮
        wordInput.disabled = true;
        if (checkBtn) checkBtn.disabled = true;
        
        // 延迟后进入下一个单词
        setTimeout(() => {
            goToNextWord();
        }, 1500);
    } else {
        // 答案错误
        wordInput.classList.add('incorrect');
        wordInput.classList.remove('correct');
        
        showFeedback(`答案错误，正确答案是: ${currentWordData.word}`, "error");
        
        // 设置标记，表示下次输入时需要清空
        needsClear = true;
        
        // 确保检查按钮可用
        if (checkBtn) checkBtn.disabled = false;
        
        // 聚焦输入框准备重试
        setTimeout(() => {
            // 如果错误反馈仍然显示，在用户开始新输入前移除它
            setTimeout(() => {
                const feedbackVisible = feedbackArea && feedbackArea.classList.contains('feedback-visible');
                if (feedbackVisible && wordInput && wordInput.value === '') {
                    clearFeedback();
                }
            }, 3000);
            
            wordInput.focus();
        }, 1500);
    }
}

// 前往下一个单词
function goToNextWord() {
    stopPlaying();
    
    if (!words || words.length === 0 || currentWordIndex >= words.length - 1) {
        showCompletionMessage();
        return;
    }
    
    currentWordIndex++;
    currentWordData = words[currentWordIndex];
    
    updateWordInterface();
    
    // 自动播放新单词
    setTimeout(() => {
        playCurrentWord();
    }, 300);
}

// 前往上一个单词
function goToPrevWord() {
    stopPlaying();
    
    if (!words || words.length === 0 || currentWordIndex <= 0) {
        showFeedback("已经是第一个单词", "info");
            return;
        }

    currentWordIndex--;
    currentWordData = words[currentWordIndex];
    
    updateWordInterface();
    
    // 自动播放新单词
    setTimeout(() => {
        playCurrentWord();
    }, 300);
}

// 显示完成消息
function showCompletionMessage() {
    const hintText = document.getElementById('hintText');
    if (hintText) {
        hintText.textContent = '听写完成!';
        hintText.classList.remove('blurred');
    }
    
    if (wordInput) {
        wordInput.disabled = true;
        wordInput.value = '';
    }
    
    if (feedbackArea) {
        feedbackArea.innerHTML = `
            <div class="completion-message">
                <i class="fas fa-trophy"></i>
                <h3>恭喜，你已完成所有单词!</h3>
                <button id="restartBtn" class="btn btn-primary">重新开始</button>
                <button id="backToHomeBtn" class="btn btn-secondary">返回首页</button>
            </div>
        `;
        feedbackArea.classList.add('feedback-visible');
        
        // 绑定重新开始按钮事件
        const restartBtn = document.getElementById('restartBtn');
        if (restartBtn) {
            restartBtn.addEventListener('click', restartDictation);
        }
        
        // 绑定返回首页按钮事件
        const backToHomeBtn = document.getElementById('backToHomeBtn');
        if (backToHomeBtn) {
            backToHomeBtn.addEventListener('click', () => {
                window.location.href = 'shouye.html';
            });
        }
    }
    
    disableControls();
}

// 重新开始听写
function restartDictation() {
    currentWordIndex = 0;
    currentWordData = words[currentWordIndex];
    
    initializeInterface();
}

// 显示反馈信息
function showFeedback(message, type) {
    if (!feedbackArea) return;
    
    let iconClass = '';
    let typeClass = '';
    
    switch (type) {
        case 'success':
            iconClass = 'fa-check-circle';
            typeClass = 'correct-answer';
            break;
        case 'error':
            iconClass = 'fa-times-circle';
            typeClass = 'incorrect-answer';
            break;
        case 'warning':
            iconClass = 'fa-exclamation-circle';
            typeClass = 'warning-answer';
            break;
        case 'info':
        default:
            iconClass = 'fa-info-circle';
            typeClass = 'info-feedback';
            break;
    }
    
    feedbackArea.innerHTML = `<div class="${typeClass}"><i class="fas ${iconClass}"></i> ${message}</div>`;
    feedbackArea.classList.add('feedback-visible');
}

// 清除反馈
function clearFeedback() {
    if (!feedbackArea) return;
    
    feedbackArea.innerHTML = '';
    feedbackArea.classList.remove('feedback-visible');
}

