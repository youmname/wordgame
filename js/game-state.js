class ProgressManager {
    // 获取用户当前进度
    static async getChapterProgress(levelId) {
      try {
        // 新增设备指纹验证
        const deviceFingerprint = await getDeviceFingerprint(); 
        
        const response = await fetch(`/api/progress?level=${levelId}&fingerprint=${deviceFingerprint}`);
        const data = await response.json();
        
        // 游客特殊处理
        if (window.userType === 'guest') {
          data.maxChapter = Math.min(data.lastUnlocked, 5);
        }
        
        return data;
      } catch (error) {
        console.error('获取进度失败:', error);
        return { lastUnlocked: 1, lastAccessed: 1 };
      }
    }
  
    // 更新章节进度
    static async updateChapterProgress(levelId, chapterOrder) {
      try {
        // 新增进度验证
        if (chapterOrder > currentProgress + 1) {
          throw new Error('非法进度更新');
        }
        const response = await fetch('/api/progress', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ levelId, chapterOrder })
        });
        return await response.json();
      } catch (error) {
        console.error('更新进度失败:', error);
      }
    }
  }