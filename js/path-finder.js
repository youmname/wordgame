/**
 * 路径查找模块
 * 实现连连看游戏中的路径查找算法
 */
const WordPathFinder = {
    // 路径缓存，用于优化性能
    pathCache: {},
    
    // 游戏板引用
    boardMatrix: null,
    boardSize: 0,
    
    /**
     * 初始化路径查找器
     * @param {Array} boardMatrix - 游戏板矩阵
     * @param {number} boardSize - 游戏板大小
     */
    init(boardMatrix, boardSize) {
        this.boardMatrix = boardMatrix;
        this.boardSize = boardSize;
        this.clearCache();
    },
    
    /**
     * 清除路径缓存
     */
    clearCache() {
        this.pathCache = {};
    },
    
    /**
     * 查找两点间的最短路径
     * @param {number} startRow - 起点行
     * @param {number} startCol - 起点列
     * @param {number} endRow - 终点行
     * @param {number} endCol - 终点列
     * @returns {Array|null} 路径数组或null
     */
    findPath(startRow, startCol, endRow, endCol) {
        // 如果起点和终点相同，返回null
        if (startRow === endRow && startCol === endCol) {
            return null;
        }
        
        // 创建缓存键
        const cacheKey = `${startRow},${startCol}-${endRow},${endCol}`;
        const reverseCacheKey = `${endRow},${endCol}-${startRow},${startCol}`;
        
        // 先检查路径缓存
        if (this.pathCache[cacheKey]) {
            return this.pathCache[cacheKey];
        }
        if (this.pathCache[reverseCacheKey]) {
            return this.pathCache[reverseCacheKey];
        }
        
        // 使用BFS查找最短路径
        const path = this.findShortestPath(startRow, startCol, endRow, endCol);
        
        // 验证路径是否有效（最多2个拐点）
        if (path && this.isValidPath(path)) {
            // 如果找到有效路径，存入缓存
            this.pathCache[cacheKey] = path;
            return path;
        }
        
        return null;
    },
    
    /**
     * 使用广度优先搜索(BFS)寻找两点间的最短路径
     * @param {number} startRow - 起点行
     * @param {number} startCol - 起点列
     * @param {number} endRow - 终点行
     * @param {number} endCol - 终点列
     * @returns {Array|null} 路径数组或null
     */
    findShortestPath(startRow, startCol, endRow, endCol) {
        // 创建表示方块状态的网格 (true表示可通行, false表示不可通行)
        const passableGrid = this.createPassableGrid();
        
        // 将起点和终点标记为可通行(以确保起点和终点被包含在路径计算中)
        passableGrid[startRow][startCol] = true;
        passableGrid[endRow][endCol] = true;
        
        // 方向数组: 上、右、下、左
        const dx = [0, 1, 0, -1];
        const dy = [-1, 0, 1, 0];
        
        // 路径队列
        const queue = [];
        // 已访问的单元格
        const visited = Array(this.boardSize + 2).fill().map(() => Array(this.boardSize + 2).fill(false));
        // 保存每个单元格的前驱，用于重建路径
        const parent = Array(this.boardSize + 2).fill().map(() => Array(this.boardSize + 2).fill().map(() => null));
        
        // 将起点加入队列
        queue.push({row: startRow, col: startCol, turns: 0, dir: null});
        visited[startRow][startCol] = true;
        
        // 设置最大搜索深度，避免无限扩展
        const maxDepth = (this.boardSize + 2) * 2;
        let depth = 0;
        
        // BFS搜索
        while (queue.length > 0 && depth < maxDepth) {
            const size = queue.length;
            
            // 每次只处理当前深度的节点
            for (let s = 0; s < size; s++) {
                const current = queue.shift();
                
                // 如果到达终点
                if (current.row === endRow && current.col === endCol) {
                    // 重建路径
                    return this.reconstructPath(parent, startRow, startCol, endRow, endCol);
                }
                
                // 尝试四个方向
                for (let i = 0; i < 4; i++) {
                    const nextRow = current.row + dy[i];
                    const nextCol = current.col + dx[i];
                    
                    // 检查边界
                    if (nextRow < 0 || nextRow >= this.boardSize + 2 || 
                        nextCol < 0 || nextCol >= this.boardSize + 2) {
                        continue;
                    }
                    
                    // 确定方向
                    const nextDir = i % 2 === 0 ? 'vertical' : 'horizontal';
                    
                    // 计算转弯次数
                    let nextTurns = current.turns;
                    if (current.dir !== null && current.dir !== nextDir) {
                        nextTurns++;
                        // 如果转弯次数超过2，不考虑这条路径
                        if (nextTurns > 2) {
                            continue;
                        }
                    }
                    
                    // 如果该单元格可通行且未访问过
                    if (passableGrid[nextRow][nextCol] && !visited[nextRow][nextCol]) {
                        visited[nextRow][nextCol] = true;
                        parent[nextRow][nextCol] = {row: current.row, col: current.col};
                        queue.push({row: nextRow, col: nextCol, turns: nextTurns, dir: nextDir});
                    }
                }
            }
            
            depth++;
        }
        
        // 如果没有找到路径，返回null
        return null;
    },
    
    /**
     * 从parent数组重建路径
     * @param {Array} parent - 前驱数组
     * @param {number} startRow - 起点行
     * @param {number} startCol - 起点列
     * @param {number} endRow - 终点行
     * @param {number} endCol - 终点列
     * @returns {Array} 路径数组
     */
    reconstructPath(parent, startRow, startCol, endRow, endCol) {
        const path = [{row: endRow, col: endCol}];
        let current = {row: endRow, col: endCol};
        
        // 从终点回溯到起点
        while (!(current.row === startRow && current.col === startCol)) {
            current = parent[current.row][current.col];
            if (!current) break; // 安全检查
            path.unshift({row: current.row, col: current.col});
        }
        
        return path;
    },
    
    /**
     * 创建表示方块状态的网格
     * @returns {Array} 网格数组
     */
    createPassableGrid() {
        const passableGrid = Array(this.boardSize + 2).fill().map(() => Array(this.boardSize + 2).fill(false));
        
        // 遍历所有方块
        for (let r = 0; r < this.boardSize + 2; r++) {
            for (let c = 0; c < this.boardSize + 2; c++) {
                const cell = this.boardMatrix[r][c];
                if (cell) {
                    // 空方块或已匹配方块可以通行
                    if (cell.isEmpty === true || cell.matched === true) {
                        passableGrid[r][c] = true;
                    }
                }
            }
        }
        
        return passableGrid;
    },
    
    /**
     * 检查路径是否有效 (最多只能有两个拐点)
     * @param {Array} path - 路径数组
     * @returns {boolean} 是否有效
     */
    isValidPath(path) {
        if (!path || path.length < 2) {
            return false;
        }
        
        // 如果只有两个点，检查是否在同一行或同一列
        if (path.length === 2) {
            const start = path[0];
            const end = path[1];
            
            // 检查是否在同一行或列
            const sameRow = start.row === end.row;
            const sameCol = start.col === end.col;
            
            if (!(sameRow || sameCol)) {
                return false; // 不在同一行或列
            }
            
            // 检查路径上是否有障碍物
            if (sameRow) {
                const minCol = Math.min(start.col, end.col);
                const maxCol = Math.max(start.col, end.col);
                for (let c = minCol + 1; c < maxCol; c++) {
                    const cell = this.boardMatrix[start.row]?.[c];
                    if (!cell || (!cell.isEmpty && !cell.matched)) {
                        return false; // 有障碍物
                    }
                }
            } else { // sameCol
                const minRow = Math.min(start.row, end.row);
                const maxRow = Math.max(start.row, end.row);
                for (let r = minRow + 1; r < maxRow; r++) {
                    const cell = this.boardMatrix[r]?.[start.col];
                    if (!cell || (!cell.isEmpty && !cell.matched)) {
                        return false; // 有障碍物
                    }
                }
            }
            
            return true;
        }
        
        // 计算方向变化次数
        let directionChanges = 0;
        let prevDirection = null;
        
        for (let i = 1; i < path.length; i++) {
            const current = path[i];
            const prev = path[i-1];
            
            // 检查中间是否有障碍物
            if (current.row === prev.row) {
                // 水平移动
                const minCol = Math.min(current.col, prev.col);
                const maxCol = Math.max(current.col, prev.col);
                for (let c = minCol + 1; c < maxCol; c++) {
                    const cell = this.boardMatrix[current.row]?.[c];
                    if (!cell || (!cell.isEmpty && !cell.matched)) {
                        return false; // 有障碍物
                    }
                }
            } else if (current.col === prev.col) {
                // 垂直移动
                const minRow = Math.min(current.row, prev.row);
                const maxRow = Math.max(current.row, prev.row);
                for (let r = minRow + 1; r < maxRow; r++) {
                    const cell = this.boardMatrix[r]?.[current.col];
                    if (!cell || (!cell.isEmpty && !cell.matched)) {
                        return false; // 有障碍物
                    }
                }
            } else {
                // 斜向移动是不允许的
                return false;
            }
            
            // 确定当前方向
            let currentDirection;
            if (current.row === prev.row) {
                currentDirection = 'horizontal';
            } else {
                currentDirection = 'vertical';
            }
            
            // 检测方向变化
            if (prevDirection !== null && currentDirection !== prevDirection) {
                directionChanges++;
                
                // 如果超过2个拐点，则路径无效
                if (directionChanges > 2) {
                    return false;
                }
            }
            
            prevDirection = currentDirection;
        }
        
        return true;
    },
    
    /**
     * 检查是否有可能的匹配
     * @returns {boolean} 是否有可能的匹配
     */
    checkForPossibleMatches() {
        if (!this.boardMatrix) return false;
        
        // 按ID对卡片进行分组，提高匹配效率
        const cardGroups = {};
        
        // 寻找所有未匹配的卡片并分组
        for (let r = 0; r < this.boardSize + 2; r++) {
            for (let c = 0; c < this.boardSize + 2; c++) {
                const cell = this.boardMatrix[r]?.[c];
                if (cell && cell.matched === false && cell.isEmpty === false && cell.id) {
                    if (!cardGroups[cell.id]) {
                        cardGroups[cell.id] = [];
                    }
                    cardGroups[cell.id].push({
                        row: r,
                        col: c,
                        type: cell.type
                    });
                }
            }
        }
        
        // 只检查有至少两张卡片的组
        for (const id in cardGroups) {
            const cards = cardGroups[id];
            if (cards.length >= 2) {
                // 检查每对卡片
                for (let i = 0; i < cards.length; i++) {
                    for (let j = i + 1; j < cards.length; j++) {
                        if (cards[i].type !== cards[j].type) {
                            const path = this.findPath(cards[i].row, cards[i].col, cards[j].row, cards[j].col);
                            if (path) {
                                return true;
                            }
                        }
                    }
                }
            }
        }
        
        return false;
    },
    
    /**
     * 寻找一对可连接的卡片
     * @returns {Object|null} 包含卡片和路径信息的对象，或null
     */
    findConnectablePair() {
        if (!this.boardMatrix) return null;
        
        // 按ID对卡片进行分组
        const cardGroups = {};
        
        // 寻找所有未匹配的卡片并分组
        for (let r = 0; r < this.boardSize + 2; r++) {
            for (let c = 0; c < this.boardSize + 2; c++) {
                const cell = this.boardMatrix[r]?.[c];
                if (cell && cell.matched === false && cell.isEmpty === false && cell.id) {
                    if (!cardGroups[cell.id]) {
                        cardGroups[cell.id] = [];
                    }
                    cardGroups[cell.id].push({
                        row: r,
                        col: c,
                        id: cell.id,
                        type: cell.type,
                        element: cell.element
                    });
                }
            }
        }
        
        // 只检查有至少两张卡片的组
        for (const id in cardGroups) {
            const cards = cardGroups[id];
            if (cards.length >= 2) {
                // 检查每对卡片
                for (let i = 0; i < cards.length; i++) {
                    for (let j = i + 1; j < cards.length; j++) {
                        const card1 = cards[i];
                        const card2 = cards[j];
                        
                        if (card1.type !== card2.type) {
                            const path = this.findPath(card1.row, card1.col, card2.row, card2.col);
                            
                            if (path) {
                                return {
                                    card1,
                                    card2,
                                    path
                                };
                            }
                        }
                    }
                }
            }
        }
        
        return null;
    }
};