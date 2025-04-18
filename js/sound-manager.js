/**
 * 音效管理模块
 * 负责加载和播放游戏中的音效
 */
const WordSoundManager = {
    // 音效对象
    sounds: {},
    
    // 音效是否开启
    soundEnabled: true,
    
    /**
     * 初始化音效系统
     */
    init() {
        this.preloadSounds();
        this.createSoundToggle();
    },
    
    /**
     * 预加载所有音效
     */
    preloadSounds() {
        console.log("初始化音效...");
        
        // 预加载所有音效
        for (const [name, path] of Object.entries(WordConfig.SOUND_FILES)) {
            this.sounds[name] = new Audio(path);
            
            // 添加加载失败事件监听
            this.sounds[name].addEventListener('error', (e) => {
                console.error(`音效 ${name} 加载失败:`, e);
            });
            
            // 添加加载成功事件监听
            this.sounds[name].addEventListener('canplaythrough', () => {
                console.log(`音效 ${name} 加载成功`);
            });
        }
    },
    
    /**
     * 创建音效开关按钮
     */
    createSoundToggle() {
        const soundToggle = document.createElement('button');
        soundToggle.className = 'btn sound-toggle';
        soundToggle.innerHTML = '🔊';
        soundToggle.title = "音效开关";
        
        soundToggle.addEventListener('click', () => {
            this.soundEnabled = !this.soundEnabled;
            soundToggle.innerHTML = this.soundEnabled ? '🔊' : '🔇';
            if (this.soundEnabled) {
                this.play('click');
            }
        });
        
        document.querySelector('.container').appendChild(soundToggle);
    },
    
    /**
     * 播放指定类型的音效
     * @param {string} type - 音效类型
     */
    play(type) {
        if (!this.soundEnabled) return;
        
        const sound = this.sounds[type];
        if (!sound) {
            console.error(`音效 ${type} 不存在`);
            return;
        }
        
        try {
            // 确保音频重置到开始
            sound.currentTime = 0;
            sound.play().catch(e => {
                console.error(`播放音效 ${type} 失败:`, e);
            });
        } catch (e) {
            console.error(`播放音效出错:`, e);
        }
    },
    
    /**
     * 测试所有音效
     */
    testAllSounds() {
        console.log("测试所有音效...");
        const soundTypes = Object.keys(this.sounds);
        
        // 序列播放所有音效，每个间隔1秒
        let index = 0;
        
        function playNext() {
            if (index < soundTypes.length) {
                const type = soundTypes[index];
                console.log(`测试音效: ${type}`);
                this.play(type);
                index++;
                setTimeout(playNext.bind(this), 1000);
            } else {
                console.log("所有音效测试完成");
            }
        }
        
        // 开始测试
        playNext.bind(this)();
    }
};