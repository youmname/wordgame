/**
 * 游戏配置模块
 * 包含游戏各种配置参数和常量
 */
const WordConfig = {
    // 基础配置
    SAMPLE_DATA: `请输入32对哦~~🎊
abandon    放弃，抛弃
achieve    实现，达成
believe    相信，信任
challenge    挑战，质疑
develop    发展，开发
enhance    提高，增强
focus    集中，关注
generate    产生，生成
highlight    强调，突出
improve    改进，提高
journey    旅行，旅程
knowledge    知识，学问
language    语言，表达方式
manage    管理，控制
negotiate    谈判，协商
observe    观察，遵守
perform    表演，执行
quality    质量，品质`,

    // 难度配置
    DIFFICULTY: {
        easy: {
            timeLimit: 180,
            scoreMultiplier: 0.8
        },
        normal: {
            timeLimit: 120,
            scoreMultiplier: 1.0
        },
        hard: {
            timeLimit: 90,
            scoreMultiplier: 1.5
        }
    },
    
    // 音效文件配置
    SOUND_FILES: {
        click: 'assets/sounds/click.mp3',
        correct: 'assets/sounds/correct.mp3',
        incorrect: 'assets/sounds/incorrect.mp3',
        hint: 'assets/sounds/hint.mp3',
        shuffle: 'assets/sounds/shuffle.mp3',
        win: 'assets/sounds/win.mp3',
        gameover: 'assets/sounds/gameover.mp3'
    },
    
    // API配置
    API: {
        // 动态API基础URL
        get BASE_URL() {
            // 根据当前环境判断使用哪个基础URL
            const isLocalhost = window.location.hostname === 'localhost' || 
                                window.location.hostname === '127.0.0.1';
                                
            if (isLocalhost) {
                // 本地开发环境使用标准端口
                return window.location.protocol + '//' + window.location.hostname + ':5000/api';
            } else {
                // 生产环境直接使用相对路径 /api
                return 'http://175.24.181.59/api';
            }
        },
        VOCABULARY_LEVELS_ENDPOINT: '/chapters',
        LEVEL_CHAPTERS_ENDPOINT: '/chapters/{id}/chapters',
        CHAPTERS_ENDPOINT: '/chapters',
        WORDS_ENDPOINT: '/chapters/{id}/words'
    },
    
    // 游戏板配置
    BOARD: {
        DEFAULT_SIZE: 8, // 8x8
        MAX_PAIRS: 32
    },
    
    // 本地存储键名
    STORAGE_KEYS: {
        LEVEL_DATA: 'word-game-level-data',
        THEME: 'preferred-theme',
        CUSTOM_BG: 'custom-background'
    },

    // 新增安全配置
    SECURITY: {
        MAX_CHAPTER_JUMP: 2,    // 允许的最大章节跳跃数
        MIN_PLAY_TIME: 30,      // 最小章节完成时间(秒)
        ALLOW_DEVICE_CHANGE: false
    }
};