function initGuestUser() {
    // 生成临时游客ID
    const guestId = `guest_${Date.now()}`;
    localStorage.setItem('guestId', guestId);
    
    // 设置权限
    fetch('/api/init-guest', {
      method: 'POST',
      body: JSON.stringify({ guestId })
    });
    
    return {
      id: guestId,
      type: 'guest',
      accessibleLevel: 'cet4',
      maxChapter: 5,
      accessibleModes: ['normal']
    };
  }