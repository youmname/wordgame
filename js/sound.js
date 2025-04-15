/**
 * 音效管理模块
 * 提供音效的加载、播放和管理功能
 */

/**
 * 创建音效管理器
 * @returns {Object} 音效管理器API对象
 */
export function createSoundManager() {
  // 音效缓存
  const sounds = new Map();
  
  // 是否已启用音效
  let enabled = true;
  
  // 主音量 (0.0 - 1.0)
  let masterVolume = 0.5;
  
  /**
   * 预加载音效
   * @param {Object} soundMap - 音效名称和URL映射表
   * @returns {Promise<void>} 加载完成的Promise
   */
  async function preload(soundMap) {
    const loadPromises = [];
    
    for (const [name, url] of Object.entries(soundMap)) {
      const loadPromise = new Promise((resolve, reject) => {
        const audio = new Audio();
        
        audio.addEventListener('canplaythrough', () => {
          sounds.set(name, audio);
          resolve();
        }, { once: true });
        
        audio.addEventListener('error', (err) => {
          console.error(`加载音效失败: ${name}`, err);
          reject(err);
        });
        
        audio.src = url;
        audio.load();
      });
      
      loadPromises.push(loadPromise);
    }
    
    return Promise.all(loadPromises).catch(err => {
      console.error('部分音效加载失败', err);
    });
  }
  
  /**
   * 播放音效
   * @param {string} name - 音效名称
   * @param {Object} options - 播放选项
   * @param {number} options.volume - 音量 (0.0 - 1.0)
   * @param {number} options.rate - 播放速率
   * @returns {HTMLAudioElement|null} 音频元素或null
   */
  function play(name, options = {}) {
    if (!enabled) return null;
    
    const sound = sounds.get(name);
    if (!sound) {
      console.warn(`未找到音效: ${name}`);
      return null;
    }
    
    // 创建音效克隆以支持重叠播放
    const soundInstance = sound.cloneNode();
    
    // 设置音量
    const volume = typeof options.volume === 'number' ? options.volume : 1.0;
    soundInstance.volume = volume * masterVolume;
    
    // 设置播放速率
    if (typeof options.rate === 'number') {
      soundInstance.playbackRate = options.rate;
    }
    
    // 播放完成后释放资源
    soundInstance.addEventListener('ended', () => {
      soundInstance.src = '';
    }, { once: true });
    
    // 播放音效
    try {
      const playPromise = soundInstance.play();
      
      // 处理可能的播放错误
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          console.warn(`音效播放失败: ${name}`, error);
        });
      }
    } catch (error) {
      console.warn(`音效播放出错: ${name}`, error);
      return null;
    }
    
    return soundInstance;
  }
  
  /**
   * 停止指定音效
   * @param {string} name - 音效名称
   */
  function stop(name) {
    const sound = sounds.get(name);
    if (sound) {
      sound.pause();
      sound.currentTime = 0;
    }
  }
  
  /**
   * 停止所有音效
   */
  function stopAll() {
    sounds.forEach(sound => {
      sound.pause();
      sound.currentTime = 0;
    });
  }
  
  /**
   * 设置主音量
   * @param {number} volume - 音量值 (0.0 - 1.0)
   */
  function setVolume(volume) {
    if (typeof volume === 'number' && volume >= 0 && volume <= 1) {
      masterVolume = volume;
    }
  }
  
  /**
   * 获取当前主音量
   * @returns {number} 主音量值
   */
  function getVolume() {
    return masterVolume;
  }
  
  /**
   * 启用或禁用音效
   * @param {boolean} value - 是否启用
   */
  function setEnabled(value) {
    enabled = Boolean(value);
    if (!enabled) {
      stopAll();
    }
  }
  
  /**
   * 检查音效是否已启用
   * @returns {boolean} 是否启用
   */
  function isEnabled() {
    return enabled;
  }
  
  // 返回公共API
  return {
    preload,
    play,
    stop,
    stopAll,
    setVolume,
    getVolume,
    setEnabled,
    isEnabled
  };
}

/**
 * 初始化音效系统
 */
async function initSoundSystem() {
    try {
        // 使用状态中的音效设置
        const { soundEnabled } = store.getState().system;
        soundManager.setEnabled(soundEnabled);
        
        // 预加载音效 - 修正路径
        await soundManager.preload({
            click: './assets/sounds/click.mp3',
            success: './assets/sounds/success.mp3',
            fail: './assets/sounds/fail.mp3',
            level_complete: './assets/sounds/level_complete.mp3',
            badge_unlock: './assets/sounds/badge_unlock.mp3'
        });
        
        console.log('音效系统初始化成功');
    } catch (error) {
        console.warn('音效系统初始化失败，将使用无声模式', error);
        // 出错时禁用音效
        soundManager.setEnabled(false);
    }
} 