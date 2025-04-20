// js/global.d.ts
// 全局类型扩展
declare global {
  interface Window {
    store?: {
      getState: () => any; // 考虑使用更具体的类型
      updateGameMode: (mode: string) => void;
      updatePlayMode: (mode: string) => void;
      updateUiState: (state: { loading: boolean }) => void;
      updateUserData: (data: any) => void;
      updateGameState: (state: any) => void;
      // ... 其他 store 方法
    };
    WordDataLoader?: {
      setPlayMode: (mode: string, options: { levelId: string; wordCount: number }) => void;
      getLevels: () => Promise<Array<any>>;
      getChaptersByLevel: (levelId: string | number) => Promise<Array<any>>;
      getAllWordsByChapter: (chapterId: string | number) => Promise<Array<any>>;
      getRandomWordsFromLevel: (levelId: string | number, count?: number) => Promise<Array<any>>;
      getImportedWords: () => Promise<Array<any>>;
      getDailyRecommendedWords: () => Promise<Array<any>>;
      // ... 其他 WordDataLoader 方法
    };
    startChapter?: (chapterId: string) => void;
    startRandomChallenge?: () => void;
    openWordLibrary?: () => void;
    showTodayRecommend?: () => void;
    toggleTheme?: (theme: string) => void;
    setTheme?: (theme: string) => void;
    getGameMode?: () => string;
    saveGameMode?: (mode: string) => void;
    getPlayMode?: () => string;
    setPlayMode?: (mode: string) => void;
    showCalendar?: () => void; // Added based on shouye.html usage
    showBadges?: () => void; // Added based on shouye.html usage
    // 其他可能添加到 window 的全局函数或对象
  }
}

// 添加一个空的 export {} 来确保这个文件被视为模块文件
// 这对于 declare global 是必需的，以避免污染全局命名空间
export {}; 