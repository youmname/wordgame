// 全局变量定义
let words = [];                    // 单词列表
let currentWordIndex = 0;          // 当前单词索引
let currentWordData = null;        // 当前单词数据对象
let needsClear = false;            // 标记是否需要清空输入框
let customWordsData = null;        // 自定义上传的单词数据
let isUsingCustomData = false;     // 是否使用自定义数据
let wordResults = [];              // 存储每个单词的答题情况
let currentChapterName = "";       // 当前章节名称

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
    
    // 初始化Excel解析器
    initExcelParser();
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
    
    // 绑定自定义上传事件
    bindCustomUploadEvents();
    
    console.log('事件绑定完成');
    
    // 添加到现有的bindEvents函数中
    function enhanceMobileExperience() {
      // 检测触摸设备
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      
      if (isTouchDevice) {
        document.body.classList.add('touch-device');
        
        // 增强移动端播放体验
        const playBtn = document.getElementById('playAudioBtn');
        if (playBtn) {
          // 允许触摸拖动时仍能触发播放
          playBtn.addEventListener('touchstart', function(event) {
            if (!this.disabled) {
              event.preventDefault();
              playCurrentWord();
            }
          });
        }
        
        // 优化键盘显示
        const wordInput = document.getElementById('wordInput');
        if (wordInput) {
          // iOS上点击时自动聚焦
          wordInput.addEventListener('touchend', function() {
            if (!this.disabled) {
              this.focus();
            }
          });
          
          // 处理虚拟键盘问题
          wordInput.addEventListener('focus', function() {
            // 滚动到可见位置
            setTimeout(() => {
              window.scrollTo(0, 0);
              document.body.scrollTop = 0;
            }, 300);
          });
        }
      }
      
      // 处理屏幕方向变化
      window.addEventListener('orientationchange', function() {
        // 延迟执行以确保DOM更新
        setTimeout(() => {
          // 重新调整UI
          const dictationCard = document.querySelector('.dictation-card');
          if (dictationCard) {
            // 根据方向微调布局
            if (window.orientation === 0 || window.orientation === 180) {
              // 竖屏模式
              dictationCard.style.height = '70vh';
            } else {
              // 横屏模式
              dictationCard.style.height = 'auto';
              dictationCard.style.minHeight = '85vh';
            }
          }
        }, 300);
      });
    }
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
    // 如果正在使用自定义数据，则不加载章节单词
    if (isUsingCustomData) {
        console.log('当前使用自定义数据，忽略章节单词加载请求');
        return;
    }
    
    // 显示加载中
    showFeedback("加载单词数据中...", "info");
    
    // 重置结果数组
    wordResults = [];
    
    // 从WordDataLoader获取单词数据
    if (window.WordDataLoader && typeof window.WordDataLoader.getWordsByChapter === 'function') {
        console.log(`使用WordDataLoader获取章节${chapterId}的单词数据`);
        
        // 尝试获取章节名称
        if (window.WordDataLoader.getChapterDetails) {
            window.WordDataLoader.getChapterDetails(chapterId)
                .then(details => {
                    if (details && details.name) {
                        currentChapterName = details.name;
             } else {
                        currentChapterName = `第${chapterId}章`;
                    }
                })
                .catch(() => {
                    currentChapterName = `第${chapterId}章`;
                 });
             } else {
            currentChapterName = `第${chapterId}章`;
        }

        window.WordDataLoader.getWordsByChapter(chapterId).then(wordList => {
            if (wordList && wordList.length > 0) {
                // 标准化单词格式
                const formattedWords = wordList.map(word => {
                    // 处理单词格式
                    const processedWord = processWordFormat(word.word || '');
                    
                    return {
                        word: word.word || '', // 保留原始单词
                        meaning: word.meaning || word.definition || word.chinese || '',
                        readableWord: processedWord.readableForm, // 用于朗读的形式 
                        acceptableAnswers: processedWord.acceptableForms // 可接受的答案形式
                    };
                }).filter(w => w.word && w.meaning);
                
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

    // 重置结果数组
    wordResults = [];
    
    // 设置章节名称
    const chapterObj = Object.values(mockData.chapters)
        .flat()
        .find(chapter => chapter.id === chapterId);
    
    currentChapterName = chapterObj ? chapterObj.name : `章节${chapterId}`;

    // 处理模拟数据单词格式
    const processedWords = chapterWords.map(word => {
        const processedWord = processWordFormat(word.word || '');
        return {
            word: word.word || '',
            meaning: word.meaning || '',
            readableWord: processedWord.readableForm,
            acceptableAnswers: processedWord.acceptableForms
        };
    });

    // 初始化听写
    words = processedWords;
                currentWordIndex = 0;
    currentWordData = words[currentWordIndex];
    
    // 更新界面
    initializeInterface();
    
    console.log(`使用备用数据加载章节${chapterId}单词，共${words.length}个单词`);
}

/**
 * 处理单词格式，提取可读形式和可接受的答案形式
 * 处理如下格式：
 * 1. "word(s)" -> 可读形式: "word", 可接受形式: ["word", "words"]
 * 2. "word/phrase" -> 可读形式: "word", 可接受形式: ["word", "phrase"]
 * @param {string} word 原始单词
 * @returns {object} {readableForm: string, acceptableForms: array}
 */
function processWordFormat(word) {
    if (!word) return { readableForm: '', acceptableForms: [] };
    
    const result = {
        readableForm: word,
        acceptableForms: [word]
    };
    
    // 处理括号形式: "word(s)" -> ["word", "words"]
    if (word.includes('(') && word.includes(')')) {
        try {
            const regex = /([^(]+)\(([^)]+)\)(.*)$/;
            const matches = word.match(regex);
            
            if (matches && matches.length >= 4) {
                const prefix = matches[1];
                const inBrackets = matches[2];
                const suffix = matches[3];
                
                // 第一个形式 (不含括号内容)
                const form1 = prefix + suffix;
                // 第二个形式 (含括号内容)
                const form2 = prefix + inBrackets + suffix;
                
                result.readableForm = form1.trim();
                result.acceptableForms = [form1.trim(), form2.trim()];
                
                console.log(`处理括号格式: "${word}" -> 可读: "${result.readableForm}", 可接受: ${JSON.stringify(result.acceptableForms)}`);
            }
        } catch (e) {
            console.error(`处理括号格式出错: ${word}`, e);
        }
    }
    // 处理斜杠形式: "word/phrase" -> ["word", "phrase"]
    else if (word.includes('/')) {
        try {
            const parts = word.split('/').map(part => part.trim());
            
            if (parts.length >= 2) {
                result.readableForm = parts[0]; // 使用第一个形式进行朗读
                result.acceptableForms = parts;
                
                console.log(`处理斜杠格式: "${word}" -> 可读: "${result.readableForm}", 可接受: ${JSON.stringify(result.acceptableForms)}`);
            }
        } catch (e) {
            console.error(`处理斜杠格式出错: ${word}`, e);
        }
    }
    
    return result;
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

    // 停止之前的语音 - 确保彻底停止
    stopPlaying();
    
    // 给浏览器一点时间来完全清理之前的语音合成
    setTimeout(() => {
        isPlaying = true;
    
        // 添加播放状态视觉效果
        if (playAudioBtn) {
            playAudioBtn.classList.add("active-pulse");
        }
    
        // 显示正在播放状态
        if (playingStatus && playingWord) {
            // 不显示单词内容，只显示"正在播放"
            playingWord.textContent = ""; // 不显示单词
            playingStatus.style.display = "none";
        }
    
        // 使用可读形式朗读
        const wordToSpeak = currentWordData.readableWord || currentWordData.word;
        const utterance = new SpeechSynthesisUtterance(wordToSpeak);
        
        if (currentVoice) {
            utterance.voice = currentVoice;
        }
        
        utterance.rate = currentRate;
        
        // 存储当前朗读的单词索引，用于验证
        const currentIndex = currentWordIndex;
        
        console.log(`播放单词: ${wordToSpeak}, 语速: ${currentRate}`);
        
        let playCount = 0;
        const maxPlayCount = currentRepeat || 1;
        
        utterance.onend = function() {
            // 确认仍然在同一个单词，否则不继续
            if (currentWordIndex !== currentIndex) {
                console.log('单词已切换，取消后续朗读');
            return;
        }

            playCount++;
            
            if (playCount < maxPlayCount) {
                // 继续播放
                setTimeout(() => {
                    // 再次检查是否仍在同一个单词
                    if (currentWordIndex === currentIndex && isPlaying) {
                        window.speechSynthesis.speak(utterance);
                    }
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
    }, 50); // 短暂延迟确保之前的语音已完全停止
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
    
    // 检查答案是否正确 - 支持多种可接受答案形式
    let isCorrect = false;
    
    if (currentWordData.acceptableAnswers && Array.isArray(currentWordData.acceptableAnswers)) {
        // 与所有可接受的答案形式比较
        isCorrect = currentWordData.acceptableAnswers.some(answer => 
            userInput.toLowerCase() === answer.toLowerCase()
        );
        console.log(`检查答案: "${userInput}" 与可接受答案 ${JSON.stringify(currentWordData.acceptableAnswers)}, 结果: ${isCorrect}`);
    } else {
        // 回退到原始检查逻辑
        isCorrect = userInput.toLowerCase() === currentWordData.word.toLowerCase();
    }
    
    // 记录答题情况
    if (!wordResults[currentWordIndex]) {
        wordResults[currentWordIndex] = {
            word: currentWordData.word,
            meaning: currentWordData.meaning,
            attempts: 1,
            correctOnFirstTry: isCorrect, // 记录是否一次答对
            correct: isCorrect
        };
    } else {
        wordResults[currentWordIndex].attempts++;
        // 只有第一次尝试才更新correctOnFirstTry
        wordResults[currentWordIndex].correct = isCorrect;
        }

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
        
        // 显示原始单词作为正确答案
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
    // 先停止当前朗读
    stopPlaying();
    
    if (!words || words.length === 0 || currentWordIndex >= words.length - 1) {
        showHeatmapResultsModal();
        return;
    }
    
    currentWordIndex++;
    currentWordData = words[currentWordIndex];
    
    updateWordInterface();
    
    // 自动播放新单词前添加短暂延迟，确保朗读队列已清空
    setTimeout(() => {
        playCurrentWord();
    }, 300);
}

// 前往上一个单词
function goToPrevWord() {
    // 先停止当前朗读
    stopPlaying();
    
    if (!words || words.length === 0 || currentWordIndex <= 0) {
        showFeedback("已经是第一个单词", "info");
        return;
    }

    currentWordIndex--;
    currentWordData = words[currentWordIndex];
    
    updateWordInterface();
    
    // 自动播放新单词前添加短暂延迟，确保朗读队列已清空
    setTimeout(() => {
        playCurrentWord();
    }, 300);
}

// 显示完成消息
function showCompletionMessage() {
    const resultsContainer = document.createElement('div');
    resultsContainer.className = 'completion-message';
    
    const accuracy = correctCount / words.length * 100;
    const grade = getGradeByAccuracy(accuracy);
    
    resultsContainer.innerHTML = `
        <h2>听写完成！</h2>
        <div class="stats">
            <div class="stat">
                <span class="label">正确率:</span>
                <span class="value">${accuracy.toFixed(2)}%</span>
            </div>
            <div class="stat">
                <span class="label">评分:</span>
                <span class="value">${grade}</span>
            </div>
            <div class="stat">
                <span class="label">正确词数:</span>
                <span class="value">${correctCount}/${words.length}</span>
            </div>
        </div>
        <div class="completion-buttons">
            <button id="restart-btn" class="action-button">重新开始</button>
            <button id="next-level-btn" class="action-button success-button">下一关</button>
        </div>
    `;
    
    document.body.appendChild(resultsContainer);
    
    // 为按钮添加事件监听
    document.getElementById('restart-btn').addEventListener('click', () => {
        resultsContainer.remove();
        restartDictation();
    });
    
    document.getElementById('next-level-btn').addEventListener('click', async () => {
        // 先更新数据库中的进度
        const currentLevelId = levelSelect.value;
        const currentChapterId = chapterSelect.value;
        
        // 从chapterId中提取章节序号
        const chapterOrderNumMatch = currentChapterId.match(/第(\d+)章$/);
        if (chapterOrderNumMatch) {
            const currentChapterOrderNum = parseInt(chapterOrderNumMatch[1], 10);
            if (!isNaN(currentChapterOrderNum)) {
                // 计算得分 - 基于正确率
                const score = Math.round(accuracy / 10); // 转换到0-10分范围
                
                // 调用API更新进度
                await updateChapterProgress(currentLevelId, currentChapterOrderNum, score);
                console.log(`[听写游戏] 已更新进度: 级别=${currentLevelId}, 章节序号=${currentChapterOrderNum}, 得分=${score}`);
            }
        }
        
        // 关闭结果显示并进入下一关
        resultsContainer.remove();
        nextLevel();
    });
    
    // 自定义评分函数
    function getGradeByAccuracy(accuracy) {
        if (accuracy >= 95) return 'A+';
        if (accuracy >= 90) return 'A';
        if (accuracy >= 85) return 'B+';
        if (accuracy >= 80) return 'B';
        if (accuracy >= 75) return 'C+';
        if (accuracy >= 70) return 'C';
        if (accuracy >= 60) return 'D';
        return 'F';
    }
}

// 添加结果模态框样式
function addResultsModalStyles() {
    if (document.getElementById('resultsModalStyles')) {
            return;
        }

    const style = document.createElement('style');
    style.id = 'resultsModalStyles';
    style.textContent = `
        :root {
            --primary-color: #ff385c;
            --success-color: #00c16e;
            --warning-color: #ff9500;
            --error-color: #ff385c;
            --background-color: #ffffff;
            --card-background: #ffffff;
            --text-primary: #333333;
            --text-secondary: #737373;
            --border-color: #f0f0f0;
            --shadow-color: rgba(0, 0, 0, 0.08);
        }
        
        .results-modal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.5);
            backdrop-filter: blur(4px);
            z-index: 2000;
            display: flex;
            justify-content: center;
            align-items: center;
            opacity: 0;
            visibility: hidden;
            transition: opacity 0.3s, visibility 0.3s;
        }
        
        .results-modal.visible {
            opacity: 1;
            visibility: visible;
        }
        
        .results-modal-content {
            background-color: var(--card-background);
            border-radius: 24px;
            box-shadow: 0 10px 40px var(--shadow-color);
            width: 90%;
            max-width: 800px;
            max-height: 85vh;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            padding: 0;
            transform: scale(0.95);
            transition: transform 0.3s;
        }
        
        .results-modal.visible .results-modal-content {
            transform: scale(1);
        }
        
        .results-modal h2 {
            margin: 0;
            padding: 24px 30px;
            background: linear-gradient(135deg, #ff385c, #ff9f4a);
            color: white;
            font-size: 1.5rem;
            font-weight: 600;
            text-align: center;
            letter-spacing: 0.5px;
        }
        
        .chapter-info {
            padding: 24px 30px;
            background-color: var(--card-background);
            border-bottom: 1px solid var(--border-color);
        }
        
        .chapter-info h3 {
            margin: 0 0 16px 0;
            font-size: 1.3rem;
            color: var(--text-primary);
            font-weight: 600;
        }
        
        .stats-summary {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
            gap: 20px;
        }
        
        .stat-item {
            display: flex;
            flex-direction: column;
            align-items: flex-start;
            gap: 5px;
            background-color: #f9f9f9;
            padding: 16px;
            border-radius: 16px;
            transition: transform 0.2s;
        }
        
        .stat-item:hover {
            transform: translateY(-3px);
        }
        
        .stat-label {
            color: var(--text-secondary);
            font-size: 0.9rem;
            font-weight: 500;
        }
        
        .stat-value {
            font-weight: 600;
            font-size: 1.5rem;
            color: var(--text-primary);
        }
        
        .heatmap-container {
            padding: 24px 30px;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            flex-grow: 1;
        }
        
        .heatmap-container h4 {
            margin: 0 0 16px 0;
            font-size: 1.1rem;
            color: var(--text-primary);
            font-weight: 600;
        }
        
        .word-heatmap {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
            gap: 12px;
            max-height: 40vh;
            overflow-y: auto;
            padding-right: 10px;
            scrollbar-width: thin;
        }
        
        .word-heatmap::-webkit-scrollbar {
            width: 6px;
        }
        
        .word-heatmap::-webkit-scrollbar-thumb {
            background-color: rgba(0, 0, 0, 0.2);
            border-radius: 10px;
        }
        
        .heatmap-cell {
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 16px 12px;
            border-radius: 16px;
            font-weight: 500;
            color: white;
            text-align: center;
            overflow: hidden;
            text-overflow: ellipsis;
            cursor: pointer;
            transition: all 0.3s;
            min-height: 45px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
        }
        
        .heatmap-cell:hover {
            transform: translateY(-4px);
            box-shadow: 0 8px 20px rgba(0, 0, 0, 0.12);
        }
        
        .heatmap-cell.correct-first-try {
            background: linear-gradient(135deg, #00c16e, #00e676);
        }
        
        .heatmap-cell.incorrect-try {
            background: linear-gradient(135deg, #ff385c, #ff7676);
        }
        
        .heatmap-cell.unattempted {
            background: linear-gradient(135deg, #9e9e9e, #bdbdbd);
        }
        
        .results-buttons {
            padding: 24px 30px;
            display: flex;
            justify-content: center;
            flex-wrap: wrap;
            gap: 16px;
            background-color: var(--card-background);
            border-top: 1px solid var(--border-color);
        }
        
        .results-buttons .action-btn {
            padding: 14px 20px;
            border-radius: 50px;
            border: none;
            font-size: 1rem;
            font-weight: 500;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 8px;
            transition: all 0.3s;
            min-width: 140px;
            justify-content: center;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
        }
        
        .results-buttons .action-btn:hover {
            transform: translateY(-3px);
            box-shadow: 0 8px 15px rgba(0, 0, 0, 0.1);
        }
        
        .restart-btn {
            background: linear-gradient(135deg, #3a86ff, #4a90e2);
            color: white;
        }
        
        .next-chapter-btn {
            background: linear-gradient(135deg, #00c16e, #00e676);
            color: white;
        }
        
        .export-btn {
            background: linear-gradient(135deg, #ff9500, #ffbe0b);
            color: white;
        }
        
        .close-btn {
            background: #f0f0f0;
            color: var(--text-primary);
        }
        
        @media (max-width: 768px) {
            .results-modal-content {
                width: 95%;
                max-height: 90vh;
                border-radius: 20px;
            }
            
            .chapter-info, .heatmap-container, .results-buttons {
                padding: 20px;
            }
            
            .stats-summary {
                grid-template-columns: repeat(2, 1fr);
                gap: 12px;
            }
            
            .stat-item {
                padding: 12px;
            }
            
            .stat-value {
                font-size: 1.2rem;
            }
            
            .word-heatmap {
                grid-template-columns: repeat(auto-fill, minmax(90px, 1fr));
                gap: 10px;
            }
            
            .heatmap-cell {
                padding: 14px 10px;
                font-size: 0.9rem;
            }
            
            .results-buttons .action-btn {
                padding: 12px 16px;
                font-size: 0.95rem;
                min-width: 130px;
            }
        }
        
        @media (max-width: 480px) {
            .word-heatmap {
                grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
                gap: 8px;
            }
            
            .stats-summary {
                grid-template-columns: 1fr;
            }
            
            .results-buttons .action-btn {
                flex: 1 0 45%;
                min-width: 0;
            }
        }
    `;
    
    document.head.appendChild(style);
}

// 创建并显示热力图结果模态框
function showHeatmapResultsModal() {
    // 移除现有模态框
    const existingModal = document.getElementById('resultsModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // 计算统计数据
        const totalWords = words.length;
    const attemptedWords = wordResults.filter(r => r).length;
    const correctOnFirstTry = wordResults.filter(r => r && r.correctOnFirstTry).length;
    const incorrectWords = wordResults.filter(r => r && !r.correctOnFirstTry).length;
    const completionRate = Math.round((attemptedWords / totalWords) * 100);
    const firstTryRate = attemptedWords > 0 ? Math.round((correctOnFirstTry / attemptedWords) * 100) : 0;
    
    // 创建模态框
    const modal = document.createElement('div');
    modal.id = 'resultsModal';
    modal.className = 'results-modal';
    
    modal.innerHTML = `
        <div class="results-modal-content">
            <h2>✨ 听写成绩单 ✨</h2>
            <div class="chapter-info">
                <h3>${currentChapterName || '当前章节'}</h3>
                <div class="stats-summary">
                    <div class="stat-item">
                        <span class="stat-label">完成度</span>
                        <span class="stat-value">${completionRate}%</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">一次答对率</span>
                        <span class="stat-value">${firstTryRate}%</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">单词数</span>
                        <span class="stat-value">${attemptedWords}/${totalWords}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">错题数</span>
                        <span class="stat-value">${incorrectWords}</span>
                    </div>
                </div>
            </div>
            
            <div class="heatmap-container">
                <h4>📝 单词掌握情况</h4>
                <div class="word-heatmap">
                    ${generateWordHeatmapHTML()}
                </div>
            </div>
            
            <div class="results-buttons">
                <button id="restartBtn" class="action-btn restart-btn">
                    <i class="fas fa-redo"></i> 再来一次
                </button>
                ${!isUsingCustomData ? 
                    `<button id="nextChapterBtn" class="action-btn next-chapter-btn">
                        <i class="fas fa-forward"></i> 下一关
                    </button>` : ''
                }
                <button id="exportIncorrectBtn" class="action-btn export-btn">
                    <i class="fas fa-file-export"></i> 导出错题
                </button>
                <button id="closeResultsBtn" class="action-btn close-btn">
                    <i class="fas fa-times"></i> 关闭
                </button>
            </div>
        </div>
    `;
    
    // 添加到DOM
    document.body.appendChild(modal);
    
    // 添加样式
    addResultsModalStyles();
    
    // 绑定按钮事件
    bindResultsModalEvents();
    
    // 显示模态框
    setTimeout(() => {
        modal.classList.add('visible');
    }, 100);
}

// 生成单词热力图HTML
function generateWordHeatmapHTML() {
    let html = '';
    
    // 创建热力图格子
    for (let i = 0; i < words.length; i++) {
        const result = wordResults[i];
        const word = words[i];
        
        // 确定单元格颜色类名
        let colorClass = 'unattempted'; // 默认灰色（未作答）
        
        if (result) {
            colorClass = result.correctOnFirstTry ? 'correct-first-try' : 'incorrect-try';
        }
        
        html += `
            <div class="heatmap-cell ${colorClass}" title="${word.word} - ${word.meaning}">
                ${word.word}
            </div>
        `;
    }
    
    return html;
}

// 绑定结果模态框按钮事件
function bindResultsModalEvents() {
    const modal = document.getElementById('resultsModal');
    const restartBtn = document.getElementById('restartBtn');
    const nextChapterBtn = document.getElementById('nextChapterBtn');
    const closeBtn = document.getElementById('closeResultsBtn');
    const exportIncorrectBtn = document.getElementById('exportIncorrectBtn');
    
    if (restartBtn) {
        restartBtn.addEventListener('click', () => {
            closeResultsModal();
            // 短暂延迟后重新开始，确保模态框已关闭
            setTimeout(() => {
                restartDictation();
            }, 300);
        });
    }
    
    if (nextChapterBtn) {
        nextChapterBtn.addEventListener('click', () => {
            closeResultsModal();
            // 短暂延迟后加载下一章节，确保模态框已关闭
            setTimeout(() => {
                goToNextChapter();
            }, 300);
        });
    }
    
    if (exportIncorrectBtn) {
        exportIncorrectBtn.addEventListener('click', exportIncorrectWords);
    }
    
    if (closeBtn) {
        closeBtn.addEventListener('click', closeResultsModal);
    }
    
    // 点击背景关闭
    if (modal) {
        modal.addEventListener('click', (event) => {
            if (event.target === modal) {
                closeResultsModal();
            }
        });
    }
}

// 关闭结果模态框
function closeResultsModal() {
    const modal = document.getElementById('resultsModal');
    if (modal) {
        modal.classList.remove('visible');
        setTimeout(() => {
            modal.remove();
        }, 300);
    }
}

// 前往下一个章节
function goToNextChapter() {
    // 获取当前章节和级别信息
    const levelSelect = document.getElementById('levelSelect');
    const chapterSelect = document.getElementById('chapterSelect');
    
    if (!levelSelect || !chapterSelect) {
            return;
        }

    const currentLevelId = levelSelect.value;
    const currentChapterId = chapterSelect.value;
    
    if (!currentLevelId || !currentChapterId) {
        return;
    }
    
    // 尝试找到下一个章节
    let nextChapterIndex = -1;
    for (let i = 0; i < chapterSelect.options.length; i++) {
        if (chapterSelect.options[i].value === currentChapterId) {
            nextChapterIndex = i + 1;
            break;
        }
    }
    
    // 如果找到下一个章节，则加载它
    if (nextChapterIndex >= 0 && nextChapterIndex < chapterSelect.options.length) {
        chapterSelect.selectedIndex = nextChapterIndex;
        
        // 获取新的章节ID
        const nextChapterId = chapterSelect.value;
        if (nextChapterId) {
            loadWordsForChapter(nextChapterId);
        }
        } else {
        // 如果没有下一个章节，返回主页或尝试下一个级别
        window.location.href = 'shouye.html';
    }
}

// 重新开始听写
function restartDictation() {
    // 完全重置所有答题数据
    wordResults = [];
        currentWordIndex = 0;
        currentWordData = words[currentWordIndex];
    
    // 重置UI状态
    if (wordInput) {
        wordInput.value = '';
        wordInput.classList.remove('correct', 'incorrect');
    }
    
    // 清空反馈
    clearFeedback();
    
    // 更新界面
    initializeInterface();
    
    console.log('重新开始听写');
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

// 初始化Excel解析器
function initExcelParser() {
    // 检查是否已加载xlsx库
    if (window.XLSX) {
        console.log('XLSX库已加载，可以解析Excel文件');
    } else {
        console.warn('XLSX库未加载，将动态加载');
        loadXlsxLibrary();
    }
}

// 动态加载XLSX库
function loadXlsxLibrary() {
    const script = document.createElement('script');
    // 使用本地文件路径
    script.src = 'js/xlsx.full.min.js';
    script.async = true;
    script.onload = function() {
        console.log('本地XLSX库加载成功');
    };
    script.onerror = function() {
        console.error('本地XLSX库加载失败，请确认文件存在于js目录');
        showFeedback('本地Excel解析库加载失败，请确认xlsx.full.min.js文件已放置在js目录', 'error');
    };
    document.head.appendChild(script);
}

// 从备用源加载XLSX库
function loadXlsxFromBackupSource() {
    const backupScript = document.createElement('script');
    backupScript.src = 'https://unpkg.com/xlsx@0.18.5/dist/xlsx.full.min.js';
    backupScript.async = true;
    backupScript.onload = function() {
        console.log('从备用CDN加载XLSX库成功');
    };
    backupScript.onerror = function() {
        // 所有CDN都失败，尝试本地备用方案
        tryOfflineFallback();
    };
    document.head.appendChild(backupScript);
}

// 尝试离线备用方案
function tryOfflineFallback() {
    console.warn('所有CDN加载XLSX库失败，尝试使用内置简易解析器');
    // 显示提示
    showFeedback('外部Excel库加载失败，切换到简易解析模式（仅支持基本文本格式）', 'warning');
    
    // 定义全局XLSX对象，提供最简化的Excel文本解析功能
    window.XLSX = {
        read: function(data, opts) {
            console.log('使用简易解析器处理数据');
            return {
                SheetNames: ['Sheet1'],
                Sheets: {
                    'Sheet1': {
                        '!ref': 'A1:B100', // 默认范围
                        // 这里不实现完整功能，只提供sheet_to_json方法
                    }
                }
            };
        },
        utils: {
            sheet_to_json: function(sheet) {
                // 简易CSV解析方案
                try {
                    // 尝试仅用于文本文件解析
                    const text = new TextDecoder().decode(new Uint8Array(sheet));
                    const lines = text.split(/\r?\n/);
                    const result = [];
                    
                    // 假设第一行是标题
                    const headers = lines[0].split(',').map(h => h.trim());
                    
                    for (let i = 1; i < lines.length; i++) {
                        if (!lines[i].trim()) continue;
                        
                        const values = lines[i].split(',').map(v => v.trim());
                        const obj = {};
                        
                        for (let j = 0; j < headers.length; j++) {
                            obj[headers[j]] = values[j] || '';
                        }
                        
                        result.push(obj);
                    }
                    
                    return result;
                } catch (e) {
                    console.error('简易解析失败:', e);
                    return [];
                }
            }
        }
    };
}

// 绑定自定义上传事件
function bindCustomUploadEvents() {
    // 首先检查并创建自定义上传按钮
    createCustomUploadUI();
    
    // 绑定自定义上传按钮点击事件
    const customBtn = document.getElementById('customUploadBtn');
    const fileInput = document.getElementById('excelFileInput');
    const uploadModal = document.getElementById('uploadModal');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const confirmUploadBtn = document.getElementById('confirmUploadBtn');
    
    if (customBtn && fileInput) {
        customBtn.addEventListener('click', function() {
            if (uploadModal) {
                uploadModal.style.display = 'flex';
            } else {
                fileInput.click();
            }
        });
    }
    
    if (fileInput) {
        fileInput.addEventListener('change', handleExcelFileSelected);
    }
    
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', function() {
            if (uploadModal) {
                uploadModal.style.display = 'none';
            }
        });
    }
    
    if (confirmUploadBtn) {
        confirmUploadBtn.addEventListener('click', function() {
            if (customWordsData && customWordsData.length > 0) {
                // 使用自定义数据并关闭模态窗
                useCustomWordsData();
                if (uploadModal) {
                    uploadModal.style.display = 'none';
                }
        } else {
                showFeedback('请先选择有效的Excel文件', 'warning');
            }
        });
    }
    
    // 点击模态窗口背景关闭
    if (uploadModal) {
        uploadModal.addEventListener('click', function(event) {
            if (event.target === uploadModal) {
                uploadModal.style.display = 'none';
            }
        });
    }
}

// 创建自定义上传UI
function createCustomUploadUI() {
    // 创建自定义上传按钮
    let levelChapterContainer = document.querySelector('.level-chapter-select');
    
    // 如果容器不存在，创建一个
    if (!levelChapterContainer) {
        const dictationCard = document.querySelector('.dictation-card');
        if (dictationCard) {
            levelChapterContainer = document.createElement('div');
            levelChapterContainer.className = 'level-chapter-select';
            dictationCard.insertBefore(levelChapterContainer, dictationCard.firstChild);
        }
    }
    
    // 如果已经存在自定义按钮则不再创建
    if (document.getElementById('customUploadBtn')) {
            return;
        }
    
    if (levelChapterContainer) {
        // 创建自定义按钮
        const customBtn = document.createElement('button');
        customBtn.id = 'customUploadBtn';
        customBtn.className = 'custom-upload-btn';
        customBtn.innerHTML = '<i class="fas fa-upload"></i> 自定义单词';
        
        // 创建文件输入框(隐藏)
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.id = 'excelFileInput';
        fileInput.accept = '.xlsx, .xls';
        fileInput.style.display = 'none';
        
        // 将自定义按钮插入到级别选择前面
        levelChapterContainer.insertBefore(customBtn, levelChapterContainer.firstChild);
        document.body.appendChild(fileInput);
        
        // 创建上传模态窗口
        createUploadModal();
        
        // 添加自定义按钮样式
        addCustomUploadStyles();
    }
}

// 创建上传模态窗口
function createUploadModal() {
    // 检查是否已存在
    if (document.getElementById('uploadModal')) {
        return;
    }
    
    const modal = document.createElement('div');
    modal.id = 'uploadModal';
    modal.className = 'upload-modal';
    
    modal.innerHTML = `
        <div class="upload-modal-content">
            <h3>上传自定义单词表</h3>
            <p>请选择Excel文件(.xlsx或.xls)，文件应包含两列：单词和释义</p>
            <div class="file-upload-area">
                <input type="file" id="modalFileInput" accept=".xlsx, .xls" />
                <label for="modalFileInput" class="file-upload-label">
                    <i class="fas fa-file-excel"></i> 选择Excel文件
                </label>
                <span id="selectedFileName">未选择文件</span>
            </div>
            <div id="previewArea" class="preview-area" style="display:none;">
                <h4>预览 (<span id="wordCount">0</span>个单词)</h4>
                <div id="wordsPreview" class="words-preview"></div>
            </div>
            <div class="modal-buttons">
                <button id="confirmUploadBtn" class="confirm-upload-btn" disabled>确认使用</button>
                <button id="closeModalBtn" class="close-modal-btn">取消</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // 绑定模态窗口中的文件输入事件
    const modalFileInput = document.getElementById('modalFileInput');
    if (modalFileInput) {
        modalFileInput.addEventListener('change', function(event) {
            const fileName = event.target.files[0]?.name || '未选择文件';
            const fileNameSpan = document.getElementById('selectedFileName');
            if (fileNameSpan) {
                fileNameSpan.textContent = fileName;
            }
            
            handleExcelFileSelected(event);
        });
    }
}

// 添加自定义上传样式
function addCustomUploadStyles() {
    if (document.getElementById('customUploadStyles')) {
        return;
    }
    
    const style = document.createElement('style');
    style.id = 'customUploadStyles';
    style.textContent = `
        .custom-upload-btn {
            background-color: #ff9800;
            color: white;
            border: none;
            border-radius: 4px;
            padding: 8px 12px;
            cursor: pointer;
            font-size: 0.9rem;
            display: flex;
            align-items: center;
            gap: 5px;
            transition: background-color 0.3s;
        }
        .custom-upload-btn:hover {
            background-color: #f57c00;
        }
        
        .upload-modal {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0,0,0,0.5);
            z-index: 1000;
            justify-content: center;
            align-items: center;
        }
        
        .upload-modal-content {
            background-color: white;
            border-radius: 8px;
            padding: 20px;
            width: 80%;
            max-width: 600px;
            max-height: 80vh;
            overflow-y: auto;
        }
        
        .file-upload-area {
            margin: 20px 0;
            display: flex;
            align-items: center;
            gap: 10px;
            flex-wrap: wrap;
        }
        
        .file-upload-area input[type="file"] {
            display: none;
        }
        
        .file-upload-label {
            background-color: #4a90e2;
            color: white;
            padding: 8px 15px;
            border-radius: 4px;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            gap: 5px;
            transition: background-color 0.3s;
        }
        
        .file-upload-label:hover {
            background-color: #3a80d2;
        }
        
        #selectedFileName {
            color: #666;
            flex-grow: 1;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        
        .preview-area {
            margin: 15px 0;
            border: 1px solid #e0e0e0;
            border-radius: 4px;
            padding: 10px;
            max-height: 200px;
            overflow-y: auto;
        }
        
        .words-preview {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
            gap: 8px;
        }
        
        .word-preview-item {
            padding: 5px;
            border-bottom: 1px solid #f0f0f0;
            display: flex;
            justify-content: space-between;
        }
        
        .word-preview-item span:first-child {
            font-weight: 500;
        }
        
        .word-preview-item span:last-child {
            color: #666;
        }
        
        .modal-buttons {
            display: flex;
            justify-content: flex-end;
            gap: 10px;
            margin-top: 20px;
        }
        
        .confirm-upload-btn {
            background-color: #4caf50;
            color: white;
            border: none;
            border-radius: 4px;
            padding: 8px 15px;
            cursor: pointer;
            transition: background-color 0.3s;
        }
        
        .confirm-upload-btn:hover:not(:disabled) {
            background-color: #43a047;
        }
        
        .confirm-upload-btn:disabled {
            background-color: #a5d6a7;
            cursor: not-allowed;
        }
        
        .close-modal-btn {
            background-color: #f44336;
            color: white;
            border: none;
            border-radius: 4px;
            padding: 8px 15px;
            cursor: pointer;
            transition: background-color 0.3s;
        }
        
        .close-modal-btn:hover {
            background-color: #e53935;
        }
        
        @media (max-width: 768px) {
            .upload-modal-content {
                width: 95%;
                padding: 15px;
            }
            
            .words-preview {
                grid-template-columns: 1fr;
            }
        }
    `;
    
    document.head.appendChild(style);
}

// 处理Excel文件选择
function handleExcelFileSelected(event) {
    const file = event.target.files[0];
    if (!file) {
        return;
    }
    
    // 检查是否为Excel文件
    const fileExtension = file.name.split('.').pop().toLowerCase();
    if (fileExtension !== 'xlsx' && fileExtension !== 'xls') {
        showFeedback('请选择正确的Excel文件(.xlsx或.xls)', 'error');
        return;
    }
    
    // 显示加载中
    showFeedback('正在处理Excel文件...', 'info');
    
    // 检查XLSX库是否可用
    if (!window.XLSX) {
        showFeedback('Excel解析库未加载，请刷新页面重试', 'error');
        return;
    }
    
    const reader = new FileReader();
    
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, {type: 'array'});
            
            // 获取第一个工作表
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            
            // 将工作表转换为JSON
            const jsonData = XLSX.utils.sheet_to_json(worksheet);
            
            // 处理数据
            processExcelData(jsonData);
        } catch (error) {
            console.error('处理Excel文件时出错:', error);
            showFeedback('处理Excel文件时出错: ' + error.message, 'error');
        }
    };
    
    reader.onerror = function() {
        showFeedback('读取文件失败', 'error');
    };
    
    reader.readAsArrayBuffer(file);
}

// 处理Excel数据
function processExcelData(jsonData) {
    if (!jsonData || jsonData.length === 0) {
        showFeedback('Excel文件中未找到数据', 'error');
        return;
    }
    
    try {
        // 获取字段名
        const firstRow = jsonData[0];
        const keys = Object.keys(firstRow);
        
        // 检查是否包含必要字段
        const wordKey = keys.find(key => 
            key.toLowerCase().includes('word') || 
            key.toLowerCase().includes('单词')
        );
        
        const meaningKey = keys.find(key => 
            key.toLowerCase().includes('meaning') || 
            key.toLowerCase().includes('译') || 
            key.toLowerCase().includes('定义') || 
            key.toLowerCase().includes('释义')
        );
        
        if (!wordKey || !meaningKey) {
            showFeedback('Excel文件格式不正确，需要包含单词和释义列', 'error');
            return;
        }

        // 转换数据格式
        const formattedData = jsonData.map(row => {
            // 处理单词格式
            const wordValue = row[wordKey] || '';
            const meaningValue = row[meaningKey] || '';
            
            // 确保数据是字符串
            const wordStr = wordValue.toString();
            const meaningStr = meaningValue.toString();
            
            if (!wordStr || !meaningStr) {
                return null; // 跳过空行
            }
            
            const processedWord = processWordFormat(wordStr);
            
            return {
                word: wordStr,
                meaning: meaningStr,
                readableWord: processedWord.readableForm,
                acceptableAnswers: processedWord.acceptableForms
            };
        }).filter(item => item !== null);
        
        if (formattedData.length === 0) {
            showFeedback('未从Excel中提取到有效单词数据', 'error');
            return;
        }
        
        // 保存处理后的数据
        customWordsData = formattedData;
        
        // 显示成功消息
        showFeedback(`成功读取${formattedData.length}个单词`, 'success');
        console.log('解析的Excel数据:', formattedData);
        
        // 更新预览区域
        updateWordsPreview(formattedData);
        
        // 启用确认按钮
        const confirmBtn = document.getElementById('confirmUploadBtn');
        if (confirmBtn) {
            confirmBtn.disabled = false;
        }
    } catch (error) {
        console.error('处理Excel数据时出错:', error);
        showFeedback('处理Excel数据时出错: ' + error.message, 'error');
    }
}

// 更新单词预览区域
function updateWordsPreview(words) {
    const previewArea = document.getElementById('previewArea');
    const wordsPreview = document.getElementById('wordsPreview');
    const wordCount = document.getElementById('wordCount');
    
    if (!previewArea || !wordsPreview || !wordCount) {
        return;
    }
    
    // 更新单词数量
    wordCount.textContent = words.length;
    
    // 清空预览区域
    wordsPreview.innerHTML = '';
    
    // 添加预览项目(最多显示20个)
    const displayLimit = Math.min(20, words.length);
    for (let i = 0; i < displayLimit; i++) {
        const wordItem = document.createElement('div');
        wordItem.className = 'word-preview-item';
        
        const wordSpan = document.createElement('span');
        wordSpan.textContent = words[i].word;
        
        const meaningSpan = document.createElement('span');
        meaningSpan.textContent = words[i].meaning;
        
        wordItem.appendChild(wordSpan);
        wordItem.appendChild(meaningSpan);
        wordsPreview.appendChild(wordItem);
    }
    
    // 如果有更多单词，显示省略信息
    if (words.length > displayLimit) {
        const ellipsisItem = document.createElement('div');
        ellipsisItem.className = 'word-preview-item';
        ellipsisItem.textContent = `... 还有${words.length - displayLimit}个单词`;
        wordsPreview.appendChild(ellipsisItem);
    }
    
    // 显示预览区域
    previewArea.style.display = 'block';
}

// 使用自定义单词数据
function useCustomWordsData() {
    if (!customWordsData || customWordsData.length === 0) {
        showFeedback('没有可用的自定义单词数据', 'error');
        return;
    }
    
    // 重置结果数组
    wordResults = [];
    
    // 设置章节名称
    currentChapterName = "自定义单词";
    
    // 设置使用自定义数据标志
    isUsingCustomData = true;
    
    // 初始化听写
    words = [...customWordsData];
    currentWordIndex = 0;
    currentWordData = words[currentWordIndex];
    
    // 更新界面
    initializeInterface();
    
    // 显示成功消息
    showFeedback(`正在使用${words.length}个自定义单词`, 'success');
    console.log(`使用自定义单词数据，共${words.length}个单词`);
    
    // 更新选择器状态
    updateSelectorsForCustomMode();
}

// 更新选择器状态为自定义模式
function updateSelectorsForCustomMode() {
    // 禁用级别和章节选择器
    const levelSelect = document.getElementById('levelSelect');
    const chapterSelect = document.getElementById('chapterSelect');
    
    if (levelSelect) {
        levelSelect.disabled = true;
        levelSelect.selectedIndex = 0;
    }
    
    if (chapterSelect) {
        chapterSelect.disabled = true;
        chapterSelect.selectedIndex = 0;
    }
}

// 导出未一次答对的单词为Excel
function exportIncorrectWords() {
    // 检查XLSX库是否可用
    if (!window.XLSX) {
        showFeedback('Excel导出库不可用，请重新加载页面', 'error');
        return;
    }
    
    try {
        // 过滤出未一次答对的单词
        const incorrectWords = words.filter((word, index) => {
            const result = wordResults[index];
            return result && !result.correctOnFirstTry;
        });
        
        // 如果没有未一次答对的单词
        if (incorrectWords.length === 0) {
            showFeedback('没有需要导出的错题', 'warning');
            return;
        }
        
        // 格式化数据为上传时的格式
        const exportData = incorrectWords.map(word => ({
            word: word.word,
            meaning: word.meaning
        }));
        
        // 创建工作表
        const ws = XLSX.utils.json_to_sheet(exportData);
        
        // 创建工作簿并添加工作表
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "错题");
        
        // 设置列宽
        ws['!cols'] = [
            { wch: 20 }, // word列宽
            { wch: 30 }  // meaning列宽
        ];
        
        // 生成Excel文件名
        const fileName = `错题集_${currentChapterName || '自定义'}_${new Date().toLocaleDateString().replace(/\//g, '-')}.xlsx`;
        
        // 导出Excel文件
        XLSX.writeFile(wb, fileName);
        
        showFeedback(`成功导出${incorrectWords.length}个错题`, 'success');
    } catch (error) {
        console.error('导出错题失败:', error);
        showFeedback('导出错题失败: ' + error.message, 'error');
    }
}

/**
 * 下一关功能
 * 处理关卡完成后的进度更新与跳转
 */
async function nextLevel() {
    console.log('[听写游戏] "下一关"按钮点击');
    
    // 如果有结果模态框，先关闭它
    const resultModal = document.getElementById('result-modal');
    if (resultModal) {
        resultModal.classList.remove('active');
    }

    // --- 游客限制检查 ---
    const userType = localStorage.getItem('userType');
    const guestLimit = 5; // 游客最多玩到第5关

    const currentLevelId = levelSelect.value;
    const currentChapterId = chapterSelect.value;
    
    // 从chapterId中提取章节序号 (例如: "初级词汇第3章" -> 3)
    const chapterOrderNumMatch = currentChapterId.match(/第(\d+)章$/);
    if (!chapterOrderNumMatch) {
        console.error('[听写游戏] 无法从章节ID中提取序号:', currentChapterId);
        alert('无法确定当前关卡序号，请刷新页面或重新选择关卡。');
        return;
    }
    
    const currentChapterOrderNum = parseInt(chapterOrderNumMatch[1], 10);
    
    if (userType === 'guest' && currentChapterOrderNum !== undefined && currentChapterOrderNum !== null) {
        if (!isNaN(currentChapterOrderNum) && currentChapterOrderNum >= guestLimit) {
            console.log(`[听写游戏] 游客达到限制 (关卡 ${currentChapterOrderNum})，阻止进入下一关。`);
            // 使用 SweetAlert (如果项目已集成)
            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    title: '试玩结束',
                    text: '免费试玩已结束，请登录或注册以解锁更多关卡！',
                    icon: 'info',
                    confirmButtonText: '去登录',
                    showCancelButton: true,
                    cancelButtonText: '取消'
                }).then((result) => {
                    if (result.isConfirmed) {
                        window.location.href = '页面.html'; // 跳转到登录页
                    }
                });
            } else {
                // 备用 alert 提示
                alert('免费试玩已结束，请登录或注册以解锁更多关卡！');
            }
            return; // 阻止后续代码执行
        }
    }

    // 验证必要信息是否存在
    if (!currentLevelId || !currentChapterId) {
        console.error('[听写游戏] 缺少 currentLevelId 或 currentChapterId，无法进入下一关');
        alert('无法确定当前关卡信息，请刷新页面或重新选择关卡。');
        return;
    }

    if (isNaN(currentChapterOrderNum)) {
        console.error('[听写游戏] currentChapterOrderNum 无效:', currentChapterOrderNum);
        alert('关卡序号无效，无法进入下一关。');
        return;
    }

    const nextOrderNum = currentChapterOrderNum + 1;
    // 构造预期的下一章节标识符 (基于 "级别名称第X章" 的模式)
    const predictedChapterId = `${currentLevelId}第${nextOrderNum}章`;
    console.log(`[听写游戏] 尝试构造并检查下一章节: ${predictedChapterId}`);

    const authToken = localStorage.getItem('authToken');
    if (!authToken) {
        console.error('[听写游戏] 未找到认证令牌');
        alert('请先登录！');
        window.location.href = '/login.html'; // 或者其他登录页面
        return;
    }

    try {
        // 显示加载提示
        if (window.WordUtils && window.WordUtils.LoadingManager) {
            window.WordUtils.LoadingManager.show('检查下一关是否存在...');
        } else {
            // 简单的加载提示
            const loadingDiv = document.createElement('div');
            loadingDiv.id = 'simple-loading';
            loadingDiv.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;';
            loadingDiv.innerHTML = '<div style="color:white;font-size:18px;background:#333;padding:20px;border-radius:10px;">检查下一关是否存在...</div>';
            document.body.appendChild(loadingDiv);
        }

        // 先更新当前关卡的完成状态
        await updateChapterProgress(currentLevelId, currentChapterOrderNum);

        // 尝试获取下一关的单词，以此判断章节是否存在
        const checkUrl = `/api/chapters/${encodeURIComponent(predictedChapterId)}/allwords`;
        const response = await fetch(checkUrl, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        // 隐藏加载提示
        if (window.WordUtils && window.WordUtils.LoadingManager) {
            window.WordUtils.LoadingManager.hide();
        } else {
            const loadingDiv = document.getElementById('simple-loading');
            if (loadingDiv) loadingDiv.remove();
        }

        if (response.ok) {
            // 章节存在，构建跳转 URL
            console.log(`[听写游戏] 找到下一章节 ${predictedChapterId}，准备跳转...`);
            const nextLevelUrl = `tingxie.html?category=${encodeURIComponent(currentLevelId)}&chapter=${encodeURIComponent(predictedChapterId)}&mode=normal`;
            window.location.href = nextLevelUrl;
        } else if (response.status === 404) {
            // 章节不存在，说明已经是最后一关
            console.log(`[听写游戏] 未找到章节 ${predictedChapterId}，判定为最后一关。`);
            
            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    title: '恭喜通关！',
                    text: `您已完成 "${currentLevelId}" 级别的所有听写关卡！`,
                    icon: 'success',
                    confirmButtonText: '返回首页',
                    allowOutsideClick: false,
                    allowEscapeKey: false
                }).then((result) => {
                    if (result.isConfirmed) {
                        window.location.href = 'shouye.html';
                    }
                });
            } else {
                alert(`恭喜！您已完成 "${currentLevelId}" 级别的所有听写关卡！`);
                window.location.href = 'shouye.html';
            }
        } else {
            // 其他错误
            console.error(`[听写游戏] 检查下一关时发生错误，状态码: ${response.status}`);
            const errorData = await response.json().catch(() => ({ message: '无法解析错误信息' }));
            alert(`加载下一关失败: ${errorData.message || response.statusText}`);
        }
    } catch (error) {
        // 隐藏加载提示
        if (window.WordUtils && window.WordUtils.LoadingManager) {
            window.WordUtils.LoadingManager.hide();
        } else {
            const loadingDiv = document.getElementById('simple-loading');
            if (loadingDiv) loadingDiv.remove();
        }
        console.error('[听写游戏] 请求下一关信息时网络或处理错误:', error);
        alert(`加载下一关时出错: ${error.message}`);
    }
}

/**
 * 更新关卡进度
 * @param {string} levelId 关卡ID
 * @param {number} chapterOrderNum 章节序号
 * @param {number} score 得分，默认为10
 */
async function updateChapterProgress(levelId, chapterOrderNum, score = 10) {
    const authToken = localStorage.getItem('authToken');
    if (!authToken) {
        console.warn('[听写游戏] 无法更新进度：未找到 authToken');
        return false;
    }

    try {
        console.log(`[听写游戏] 准备更新进度: levelId=${levelId}, completedOrderNum=${chapterOrderNum}, totalScore=${score}`);
        
        // 调用API更新关卡完成状态
        const response = await fetch('/api/progress/complete-chapter', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({
                levelId: levelId,
                completedOrderNum: chapterOrderNum,
                totalScore: score
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`服务器错误: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        if (data.success) {
            console.log(`[听写游戏] 用户进度更新成功！获得积分: ${data.pointsEarned || score}`);
            return true;
        } else {
            console.error('[听写游戏] 更新用户进度失败:', data.message);
            return false;
        }
    } catch (error) {
        console.error('[听写游戏] 调用进度更新接口时出错:', error);
        return false;
    }
}

// 绑定"下一关"按钮事件
function bindNextLevelButton() {
    const nextLevelBtn = document.getElementById('next-level-btn');
    if (nextLevelBtn) {
        nextLevelBtn.addEventListener('click', nextLevel);
        console.log('[听写游戏] 已绑定"下一关"按钮事件');
    } else {
        console.log('[听写游戏] 未找到"下一关"按钮');
    }
}

// 在初始化界面时绑定"下一关"按钮
function addNextLevelFeature() {
    // 确保有完成界面的容器
    const completeContainer = document.querySelector('.complete-container') || document.getElementById('result-modal');
    
    if (completeContainer) {
        // 如果已经有下一关按钮，直接绑定事件
        if (document.getElementById('next-level-btn')) {
            bindNextLevelButton();
            return;
        }
        
        // 否则创建下一关按钮
        const nextLevelBtn = document.createElement('button');
        nextLevelBtn.id = 'next-level-btn';
        nextLevelBtn.className = 'next-level-button';
        nextLevelBtn.textContent = '下一关';
        nextLevelBtn.style.cssText = 'background-color: #4caf50; color: white; border: none; padding: 10px 20px; margin: 10px; border-radius: 5px; cursor: pointer; font-size: 16px;';
        
        // 添加到完成界面
        completeContainer.appendChild(nextLevelBtn);
        
        // 绑定事件
        bindNextLevelButton();
        console.log('[听写游戏] 已创建并绑定"下一关"按钮');
    }
}

// 在页面加载完成后或初始化界面时调用
document.addEventListener('DOMContentLoaded', function() {
    // 初始化时可能需要调整调用时机，取决于页面结构
    setTimeout(addNextLevelFeature, 1000); // 延迟一秒确保其他元素已加载
});

