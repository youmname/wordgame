// 章节完成
async function onChapterComplete(chapterId) {
    // 获取章节信息
    const chapter = await getChapterInfo(chapterId);
    
    // 更新进度
    await ProgressManager.updateChapterProgress(chapter.level_id, chapter.order_num);
    
    // 刷新界面
    renderChapters(chapter.level_id);
    
    // 显示解锁动画
    showUnlockEffect(chapter.order_num + 1);
  }