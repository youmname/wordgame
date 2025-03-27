/**
 * 游戏板模块
 * 负责创建和管理游戏板
 */
const WordBoard = {
    // 游戏板DOM元素
    boardElement: null,
    
    // 游戏板数据
    boardMatrix: [],
    boardSize: 0,
    
    // 连接线
    connectors: [],
    
    // 当前选中的卡片
    firstSelection: null,

    // 添加动画控制标志
    animationInProgress: false,
    
    /**
     * 初始化游戏板
     * @param {number} size - 游戏板大小
     */
    init(size) {
        this.boardSize = size;
        this.boardElement = document.getElementById('game-board');
        this.connectors = [];
        this.firstSelection = null;
    },
    
    /**
     * 设置游戏板
     * @param {Array} wordPairs - 单词对数组
     */
    // setupBoard(wordPairs) {
    //     if (!this.boardElement) return;
        
    //     this.boardElement.innerHTML = '';
    //     this.boardElement.style.display = 'grid';
    //     // 添加额外的行和列（上下左右各1行/列）用于路径连接
    //     this.boardElement.style.gridTemplateColumns = `repeat(${this.boardSize + 2}, 100px)`;
    //     this.boardElement.style.gridTemplateRows = `repeat(${this.boardSize + 2}, 100px)`;
    //     this.boardElement.style.gap = '10px';
        
    //     // 初始化游戏板矩阵，包括外围的边界行/列
    //     this.boardMatrix = Array(this.boardSize + 2).fill().map(() => Array(this.boardSize + 2).fill(null));
        
    //     // 创建外围的空方块（上、下、左、右边界）
    //     this.createBorderCells();
        
    //     // 创建实际的卡片
    //     this.createCards(wordPairs);
        
    //     // 初始化路径查找器
    //     WordPathFinder.init(this.boardMatrix, this.boardSize);
        
    //     // 清除已存在的连接线
    //     this.removeConnectors();
    // },

    setupBoard(wordPairs) {
        if (!this.boardElement) return;
        
        this.boardElement.innerHTML = '';
        this.boardElement.style.display = 'grid';
        
        // 创建单词和定义卡片对
        const cards = [];
        wordPairs.forEach(pair => {
            cards.push({
                type: 'word',
                content: pair.word,
                pairId: pair.word
            });
            
            cards.push({
                type: 'definition',
                content: pair.definition,
                pairId: pair.word
            });
        });
        
        // 打乱卡片顺序
        const shuffledCards = WordUtils.shuffle(cards);
        
        // 计算需要的游戏板大小 (确保足够容纳所有卡片)
        // 计算所需的行数和列数，至少保持8x8的大小
        const cardsCount = shuffledCards.length;
        let calculatedSize = Math.ceil(Math.sqrt(cardsCount));
        this.boardSize = Math.max(calculatedSize, 8); // 确保至少8x8大小
        
        // 添加额外的行和列（上下左右各1行/列）用于路径连接
        this.boardElement.style.gridTemplateColumns = `repeat(${this.boardSize + 2}, 100px)`;
        this.boardElement.style.gridTemplateRows = `repeat(${this.boardSize + 2}, 100px)`;
        this.boardElement.style.gap = '10px';
        
        // 初始化游戏板矩阵，包括外围的边界行/列
        this.boardMatrix = Array(this.boardSize + 2).fill().map(() => Array(this.boardSize + 2).fill(null));
        
        // 创建外围的空方块（上、下、左、右边界）
        this.createBorderCells();
        
        // 创建实际的卡片
        this.createCards(wordPairs);
        
        // 初始化路径查找器
        WordPathFinder.init(this.boardMatrix, this.boardSize);
        
        // 清除已存在的连接线
        this.removeConnectors();
    },
    
    /**
     * 创建边界单元格
     */
    createBorderCells() {
        for (let row = 0; row < this.boardSize + 2; row++) {
            for (let col = 0; col < this.boardSize + 2; col++) {
                // 只创建边界方块
                if (row === 0 || row === this.boardSize + 1 || col === 0 || col === this.boardSize + 1) {
                    const emptyCard = document.createElement('div');
                    emptyCard.className = 'card empty-card top-path-card'; // 为路径添加视觉提示
                    emptyCard.dataset.row = row;
                    emptyCard.dataset.col = col;
                    
                    // 设置网格位置
                    emptyCard.style.gridRow = row + 1;
                    emptyCard.style.gridColumn = col + 1;
                    
                    this.boardElement.appendChild(emptyCard);
                    
                    // 更新游戏板矩阵 - 标记为空且可通行的方块
                    this.boardMatrix[row][col] = {
                        element: emptyCard,
                        isEmpty: true,     // 这是一个空方块
                        matched: true,     // 标记为已匹配表示可以通行
                        id: null,          // 没有内容ID
                        type: null         // 没有类型
                    };
                }
            }
        }
    },
    
    /**
     * 创建卡片
     * @param {Array} wordPairs - 单词对数组
     */
    createCards(wordPairs) {
        const cards = [];
        
        // 创建单词和定义卡片对
        wordPairs.forEach(pair => {
            cards.push({
                type: 'word',
                content: pair.word,
                pairId: pair.word
            });
            
            cards.push({
                type: 'definition',
                content: pair.definition,
                pairId: pair.word
            });
        });
        
        // 智能卡片排列算法
        const smartShuffle = (cards) => {
            // 将卡片按匹配对分组
            const pairGroups = {};
            cards.forEach(card => {
                if (!pairGroups[card.pairId]) {
                    pairGroups[card.pairId] = [];
                }
                pairGroups[card.pairId].push(card);
            });
            
            // 准备排列后的卡片数组
            const arranged = [];
            const totalCells = this.boardSize * this.boardSize;
            
            // 为了增加随机性，先创建有序分区，再打乱分区
            const areaCount = Math.min(Math.ceil(this.boardSize/2), Math.ceil(wordPairs.length / 4)); 
            const cellsPerArea = Math.ceil(totalCells / areaCount);
            
            // 对于每个区域，分配一些匹配对
            let pairIds = Object.keys(pairGroups);
            
            // 随机打乱pairIds以增加变化
            pairIds = WordUtils.shuffle(pairIds);
            
            // 分配难度等级 (但比例有变化，减少简单对)
            const easyPairs = pairIds.slice(0, Math.ceil(pairIds.length / 5)); // 只有1/5是简单对
            const mediumPairs = pairIds.slice(Math.ceil(pairIds.length / 5), Math.ceil(pairIds.length * 3 / 5)); // 2/5是中等对
            const hardPairs = pairIds.slice(Math.ceil(pairIds.length * 3 / 5)); // 2/5是困难对
            
            // 处理简单匹配对 - 改变策略，不再放在极近位置
            easyPairs.forEach(pairId => {
                const pair = pairGroups[pairId];
                
                // 找两个位置，确保至少有一定距离
                let pos1 = -1, pos2 = -1;
                
                // 随机选择第一个位置
                pos1 = Math.floor(Math.random() * totalCells);
                
                // 确保位置有效
                while (arranged[pos1] !== undefined) {
                    pos1 = (pos1 + 1) % totalCells;
                }
                
                // 设置最小距离约束，不再是相邻的
                const minDist = 3; // 至少相隔3格
                const maxDist = 7; // 最多相隔7格
                
                // 随机化第二个位置选择
                const possiblePositions = [];
                for (let i = 0; i < totalCells; i++) {
                    if (arranged[i] === undefined && i !== pos1) {
                        // 计算与pos1的曼哈顿距离
                        const row1 = Math.floor(pos1 / this.boardSize);
                        const col1 = pos1 % this.boardSize;
                        const row2 = Math.floor(i / this.boardSize);
                        const col2 = i % this.boardSize;
                        const distance = Math.abs(row1 - row2) + Math.abs(col1 - col2);
                        
                        if (distance >= minDist && distance <= maxDist) {
                            possiblePositions.push(i);
                        }
                    }
                }
                
                // 如果有合适的位置，随机选一个
                if (possiblePositions.length > 0) {
                    pos2 = possiblePositions[Math.floor(Math.random() * possiblePositions.length)];
                } else {
                    // 如果没有符合条件的位置，就找下一个未占用的位置
                    pos2 = (pos1 + minDist) % totalCells;
                    while (arranged[pos2] !== undefined) {
                        pos2 = (pos2 + 1) % totalCells;
                    }
                }
                
                // 放置卡片
                arranged[pos1] = pair[0];
                arranged[pos2] = pair[1];
            });
            
            // 处理中等难度匹配对 - 更加随机的距离
            mediumPairs.forEach(pairId => {
                const pair = pairGroups[pairId];
                
                // 寻找两个有一定距离的空位
                let pos1 = -1, pos2 = -1;
                
                // 找第一个空位
                for (let i = 0; i < totalCells; i++) {
                    if (arranged[i] === undefined) {
                        pos1 = i;
                        break;
                    }
                }
                
                // 增加距离的随机性
                const minDistance = Math.floor(this.boardSize / 2) + Math.floor(Math.random() * 3);
                const maxDistance = this.boardSize + Math.floor(Math.random() * 5);
                
                const possiblePositions = [];
                for (let i = 0; i < totalCells; i++) {
                    if (arranged[i] === undefined && i !== pos1) {
                        // 计算与pos1的曼哈顿距离
                        const row1 = Math.floor(pos1 / this.boardSize);
                        const col1 = pos1 % this.boardSize;
                        const row2 = Math.floor(i / this.boardSize);
                        const col2 = i % this.boardSize;
                        const distance = Math.abs(row1 - row2) + Math.abs(col1 - col2);
                        
                        if (distance >= minDistance && distance <= maxDistance) {
                            possiblePositions.push(i);
                        }
                    }
                }
                
                // 随机选择一个符合条件的位置
                if (possiblePositions.length > 0) {
                    pos2 = possiblePositions[Math.floor(Math.random() * possiblePositions.length)];
                } else {
                    // 如果没找到符合条件的，就找下一个空位
                    for (let i = 0; i < totalCells; i++) {
                        if (arranged[i] === undefined && i !== pos1) {
                            pos2 = i;
                            break;
                        }
                    }
                }
                
                // 放置卡片
                arranged[pos1] = pair[0];
                arranged[pos2] = pair[1];
            });
            
            // 处理困难匹配对 - 距离较远且随机性更高
            hardPairs.forEach(pairId => {
                const pair = pairGroups[pairId];
                
                // 找两个空位
                let pos1 = -1, pos2 = -1;
                
                // 随机找第一个空位
                const emptyPositions = [];
                for (let i = 0; i < totalCells; i++) {
                    if (arranged[i] === undefined) {
                        emptyPositions.push(i);
                    }
                }
                
                if (emptyPositions.length > 0) {
                    // 随机选择第一个位置
                    const randomIndex = Math.floor(Math.random() * emptyPositions.length);
                    pos1 = emptyPositions[randomIndex];
                    emptyPositions.splice(randomIndex, 1);
                    
                    if (emptyPositions.length > 0) {
                        // 随机选择距离较远的第二个位置
                        emptyPositions.sort((a, b) => {
                            // 计算与pos1的距离
                            const row1 = Math.floor(pos1 / this.boardSize);
                            const col1 = pos1 % this.boardSize;
                            
                            const rowA = Math.floor(a / this.boardSize);
                            const colA = a % this.boardSize;
                            const distA = Math.abs(row1 - rowA) + Math.abs(col1 - colA);
                            
                            const rowB = Math.floor(b / this.boardSize);
                            const colB = b % this.boardSize;
                            const distB = Math.abs(row1 - rowB) + Math.abs(col1 - colB);
                            
                            // 倾向于选择更远的位置，但有一定随机性
                            if (Math.random() < 0.7) {
                                return distB - distA; // 70%概率选择更远的
                            } else {
                                return Math.random() - 0.5; // 30%概率随机选择
                            }
                        });
                        
                        // 选择前1/3的位置中的随机一个
                        const farIndex = Math.floor(Math.random() * Math.ceil(emptyPositions.length / 3));
                        pos2 = emptyPositions[farIndex];
                    }
                }
                
                // 如果没找到位置，则使用默认寻找策略
                if (pos1 === -1 || pos2 === -1) {
                    for (let i = 0; i < totalCells; i++) {
                        if (arranged[i] === undefined) {
                            if (pos1 === -1) {
                                pos1 = i;
                            } else {
                                pos2 = i;
                                break;
                            }
                        }
                    }
                }
                
                // 放置卡片
                arranged[pos1] = pair[0];
                arranged[pos2] = pair[1];
            });
            
            // 填充可能的空位
            let allPairs = [...easyPairs, ...mediumPairs, ...hardPairs];
            // 再次打乱组合顺序，避免按顺序放置剩余卡片
            allPairs = WordUtils.shuffle(allPairs);
            
            for (let i = 0; i < totalCells; i++) {
                if (arranged[i] === undefined) {
                    // 找到有剩余卡片的匹配对
                    for (const pairId of allPairs) {
                        if (pairGroups[pairId] && pairGroups[pairId].length > 0) {
                            arranged[i] = pairGroups[pairId].pop();
                            if (pairGroups[pairId].length === 0) {
                                delete pairGroups[pairId];
                            }
                            break;
                        }
                    }
                }
            }
            
            // 最后再整体打乱20%的卡片，增加随机性
            const finalArranged = arranged.filter(card => card !== undefined);
            const shuffleCount = Math.floor(finalArranged.length * 0.2);
            
            for (let i = 0; i < shuffleCount; i++) {
                const idx1 = Math.floor(Math.random() * finalArranged.length);
                const idx2 = Math.floor(Math.random() * finalArranged.length);
                
                if (idx1 !== idx2) {
                    [finalArranged[idx1], finalArranged[idx2]] = [finalArranged[idx2], finalArranged[idx1]];
                }
            }
            
            return finalArranged;
        };
        
        // 使用智能排列而不是随机打乱
        const arrangedCards = smartShuffle(cards);
        
        // 计算内部游戏板的空方块数量
        const totalCells = this.boardSize * this.boardSize;
        const emptyCardCount = totalCells - arrangedCards.length;
        
        // 为内部游戏板创建实际卡片和空方块（从边界偏移1位）
        for (let row = 1; row <= this.boardSize; row++) {
            for (let col = 1; col <= this.boardSize; col++) {
                const index = (row - 1) * this.boardSize + (col - 1);
                
                if (index < arrangedCards.length) {
                    this.createCardElement(arrangedCards[index], row, col);
                } else {
                    this.createEmptyCell(row, col);
                }
            }
        }
    },
    
    /**
     * 创建卡片元素
     * @param {Object} cardData - 卡片数据
     * @param {number} row - 行位置
     * @param {number} col - 列位置
     */
    createCardElement(cardData, row, col) {
        const card = document.createElement('div');
        card.className = `card ${cardData.type}-card`;
        card.dataset.id = cardData.pairId;
        card.dataset.type = cardData.type;
        card.dataset.row = row;
        card.dataset.col = col;
        
        // 设置网格位置
        card.style.gridRow = row + 1;
        card.style.gridColumn = col + 1;
        
        const content = document.createElement('div');
        content.className = 'content';

        // 判断卡片类型：如果是定义卡片，使用innerHTML渲染HTML标签
        if (cardData.type === 'definition') {
            // 使用innerHTML支持HTML标签，比如<br>
            content.innerHTML = cardData.content;
        } else {
            // 单词卡片仍然使用textContent
            content.textContent = cardData.content;
        }

        card.appendChild(content);
        
        // 左键点击选择
        card.addEventListener('click', () => {
            if (!WordGame.isGameOver && !WordGame.isLoading) {
                this.selectCard(card);
            }
        });
        
        // 右键点击取消选择
        card.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            if (!WordGame.isLoading && card === this.firstSelection) {
                this.firstSelection.classList.remove('selected');
                this.firstSelection = null;
            }
        });
        
        this.boardElement.appendChild(card);
        
        // 更新游戏板矩阵
        this.boardMatrix[row][col] = {
            element: card,
            id: cardData.pairId,
            type: cardData.type,
            isEmpty: false,    // 不是空方块
            matched: false     // 初始未匹配
        };
    },
    
    /**
     * 创建空单元格
     * @param {number} row - 行位置
     * @param {number} col - 列位置
     */
    createEmptyCell(row, col) {
        const emptyCard = document.createElement('div');
        emptyCard.className = 'card empty-card path-card';
        emptyCard.dataset.row = row;
        emptyCard.dataset.col = col;
        
        // 设置网格位置
        emptyCard.style.gridRow = row + 1;
        emptyCard.style.gridColumn = col + 1;
        
        this.boardElement.appendChild(emptyCard);
        
        // 更新游戏板矩阵
        this.boardMatrix[row][col] = {
            element: emptyCard,
            isEmpty: true,     // 这是一个空方块
            matched: true,     // 标记为已匹配表示可以通行
            id: null,          // 没有内容ID
            type: null         // 没有类型
        };
    },
    
    /**
     * 选择卡片
     * @param {HTMLElement} card - 卡片元素
     */
    selectCard(card) {
        // 如果游戏结束或正在加载，不处理点击
        if (WordGame.isGameOver || WordGame.isLoading) {
            return;
        }
        
        // 已经匹配或错误状态的卡片不能再选
        if (card.classList.contains('matched') || card.classList.contains('incorrect')) {
            return;
        }
        
        // 如果有动画正在进行，不处理新的点击
        if (this.animationInProgress) {
            return;
        }
        
        // 如果点击的是已选中的卡片，取消选中
        if (card === this.firstSelection) {
            this.firstSelection.classList.remove('selected');
            this.firstSelection = null;
            return;
        }
        
        // 播放点击音效
        WordSoundManager.play('click');
        
        if (this.firstSelection) {
            // 第二次选择
            const isValid = this.isValidPair(this.firstSelection, card);
            
            if (isValid) {
                // 设置动画进行中标志
                this.animationInProgress = true;
                
                const firstRow = parseInt(this.firstSelection.dataset.row);
                const firstCol = parseInt(this.firstSelection.dataset.col);
                const secondRow = parseInt(card.dataset.row);
                const secondCol = parseInt(card.dataset.col);
                
                // 寻找连接路径
                const path = WordPathFinder.findPath(firstRow, firstCol, secondRow, secondCol);
                
                if (path) {
                    // 匹配成功
                    WordSoundManager.play('correct');
                    
                    // 显示连接线
                    this.showConnectionPath(path);
                    
                    this.firstSelection.classList.add('correct');
                    card.classList.add('correct');
                    
                    // 禁用交互，直到动画完成
                    const selectedCards = [this.firstSelection, card];
                    selectedCards.forEach(c => c.style.pointerEvents = 'none');
                    
                    setTimeout(() => {
                        // 移除连接线
                        this.removeConnectors();
                        
                        this.firstSelection.classList.add('matched');
                        card.classList.add('matched');
                        this.firstSelection.classList.remove('selected', 'correct');
                        card.classList.remove('correct');
                        
                        // 恢复交互
                        selectedCards.forEach(c => c.style.pointerEvents = '');
                        
                        // 明确更新匹配状态
                        const firstRow = parseInt(this.firstSelection.dataset.row);
                        const firstCol = parseInt(this.firstSelection.dataset.col);
                        const secondRow = parseInt(card.dataset.row);
                        const secondCol = parseInt(card.dataset.col);
                        
                        if (this.boardMatrix[firstRow][firstCol]) {
                            this.boardMatrix[firstRow][firstCol].matched = true;
                        }
                        
                        if (this.boardMatrix[secondRow][secondCol]) {
                            this.boardMatrix[secondRow][secondCol].matched = true;
                        }
                        
                        // 触发匹配成功事件
                        WordUtils.EventSystem.trigger('cards:matched', {
                            firstCard: this.firstSelection,
                            secondCard: card
                        });
                        
                        this.firstSelection = null;
                        
                        // 重置动画进行中标志
                        this.animationInProgress = false;
                    }, 800);
                } else {
                    // 无法连接
                    this.handleMismatch(card);
                }
            } else {
                // 匹配失败
                this.handleMismatch(card);
            }
        } else {
            // 第一次选择
            this.firstSelection = card;
            this.firstSelection.classList.add('selected');
        }
    },

    /**
     * 处理卡片不匹配的情况
     * @param {HTMLElement} card - 第二张选中的卡片
     */
    handleMismatch(card) {
        // 设置动画进行中标志
        this.animationInProgress = true;
        
        // 播放不匹配音效
        WordSoundManager.play('incorrect');
        
        this.firstSelection.classList.add('incorrect');
        card.classList.add('incorrect');
        
        // 禁用交互，直到动画完成
        const selectedCards = [this.firstSelection, card];
        selectedCards.forEach(c => c.style.pointerEvents = 'none');
        
        setTimeout(() => {
            this.firstSelection.classList.remove('incorrect', 'selected');
            card.classList.remove('incorrect');
            
            // 恢复交互
            selectedCards.forEach(c => c.style.pointerEvents = '');
            
            // 触发匹配失败事件
            WordUtils.EventSystem.trigger('cards:mismatched');
            
            this.firstSelection = null;
            
            // 重置动画进行中标志
            this.animationInProgress = false;
        }, 500);
    },

    /**
     * 检查两张卡片是否匹配
     * @param {HTMLElement} card1 - 第一张卡片
     * @param {HTMLElement} card2 - 第二张卡片
     * @returns {boolean} 是否匹配
     */
    isValidPair(card1, card2) {
        // 检查ID是否相同且类型不同
        return card1.dataset.id === card2.dataset.id && 
            card1.dataset.type !== card2.dataset.type;
    },

    /**
     * 显示连接路径
     * @param {Array} path - 路径数组
     */
    showConnectionPath(path) {
        this.removeConnectors();
        
        // 获取游戏板的实际位置和尺寸
        const boardRect = this.boardElement.getBoundingClientRect();
        
        // 创建Canvas元素
        const canvas = document.createElement('canvas');
        canvas.width = boardRect.width;
        canvas.height = boardRect.height;
        canvas.style.position = 'absolute';
        canvas.style.top = '0';
        canvas.style.left = '0';
        canvas.style.pointerEvents = 'none';
        canvas.style.zIndex = '100';
        canvas.className = 'connector-canvas';
        
        // 获取绘图上下文
        const ctx = canvas.getContext('2d');
        
        // 计算卡片中心点位置
        const pathPoints = [];
        for (let i = 0; i < path.length; i++) {
            const point = path[i];
            const cell = this.boardMatrix[point.row]?.[point.col];
            
            let x, y;
            if (cell && cell.element) {
                const rect = cell.element.getBoundingClientRect();
                x = rect.left - boardRect.left + rect.width / 2;
                y = rect.top - boardRect.top + rect.height / 2;
            } else {
                // 如果在某些情况下找不到卡片，使用估计值
                x = point.col * 110 + 55;
                y = point.row * 110 + 55;
            }
            
            pathPoints.push({ x, y });
        }
        
        // 设置线条样式
        ctx.strokeStyle = '#f39c12';
        ctx.lineWidth = 8;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        // 添加线条动画
        let progress = 0;
        const animationSpeed = 0.03; // 动画速度
        
        const drawAnimatedLine = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            // 绘制路径上的每个线段，基于当前进度
            ctx.beginPath();
            
            if (progress <= 0) {
                // 开始点
                ctx.moveTo(pathPoints[0].x, pathPoints[0].y);
                ctx.arc(pathPoints[0].x, pathPoints[0].y, 4, 0, Math.PI * 2);
            } else {
                const segmentCount = pathPoints.length - 1;
                const fullSegments = Math.floor(progress * segmentCount);
                const partialSegment = (progress * segmentCount) - fullSegments;
                
                // 绘制完整段
                ctx.moveTo(pathPoints[0].x, pathPoints[0].y);
                for (let i = 1; i <= fullSegments; i++) {
                    ctx.lineTo(pathPoints[i].x, pathPoints[i].y);
                }
                
                // 绘制部分段
                if (fullSegments < segmentCount) {
                    const startX = pathPoints[fullSegments].x;
                    const startY = pathPoints[fullSegments].y;
                    const endX = pathPoints[fullSegments + 1].x;
                    const endY = pathPoints[fullSegments + 1].y;
                    
                    const currentX = startX + (endX - startX) * partialSegment;
                    const currentY = startY + (endY - startY) * partialSegment;
                    
                    ctx.lineTo(currentX, currentY);
                }
            }
            
            ctx.stroke();
            
            // 绘制拐点
            ctx.fillStyle = '#f39c12';
            for (let i = 1; i < pathPoints.length - 1; i++) {
                if (i / (pathPoints.length - 1) <= progress) {
                    ctx.beginPath();
                    ctx.arc(pathPoints[i].x, pathPoints[i].y, 6, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
            
            progress += animationSpeed;
            
            if (progress <= 1) {
                requestAnimationFrame(drawAnimatedLine);
            } else {
                // 最终完整绘制
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.beginPath();
                ctx.moveTo(pathPoints[0].x, pathPoints[0].y);
                
                for (let i = 1; i < pathPoints.length; i++) {
                    ctx.lineTo(pathPoints[i].x, pathPoints[i].y);
                }
                
                ctx.stroke();
                
                // 绘制所有拐点
                ctx.fillStyle = '#f39c12';
                for (let i = 1; i < pathPoints.length - 1; i++) {
                    ctx.beginPath();
                    ctx.arc(pathPoints[i].x, pathPoints[i].y, 6, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        };
        
        // 开始动画
        drawAnimatedLine();
        
        // 将Canvas添加到游戏板
        this.boardElement.appendChild(canvas);
        this.connectors.push(canvas);
    },

    /**
     * 移除所有连接线
     */
    removeConnectors() {
        this.connectors.forEach(connector => connector.remove());
        this.connectors = [];
    },

    /**
     * 显示提示
     */
    showHint() {
        // 寻找可连接的卡片对
        const hintPair = WordPathFinder.findConnectablePair();
        
        if (hintPair) {
            // 显示提示
            hintPair.card1.element.classList.add('hint');
            hintPair.card2.element.classList.add('hint');
            
            this.showConnectionPath(hintPair.path);
            
            setTimeout(() => {
                hintPair.card1.element.classList.remove('hint');
                hintPair.card2.element.classList.remove('hint');
                this.removeConnectors();
            }, 1500);
            
            return true;
        }
        
        return false;
    },

    /**
     * 洗牌
     * @param {boolean} isAuto - 是否自动洗牌
     * @returns {Promise} 洗牌完成Promise
     */
    async shuffleBoard(isAuto) {
        // 如果是游戏结束、没有未匹配的卡片或正在加载中，不洗牌
        if (WordGame.isGameOver || WordGame.matchedPairs >= WordGame.wordPairs.length || WordGame.isLoading) {
            return false;
        }
        
        WordGame.isLoading = true;
        WordGame.shuffleCount++;
        
        // 显示加载动画
        WordUtils.LoadingManager.show('正在洗牌...');
        
        // 播放洗牌音效
        WordSoundManager.play('shuffle');
        
        // 收集所有未匹配的卡片
        const unmatchedCardElements = [];
        const unmatchedCards = [];
        
        // 只洗牌内部板卡片(不包括边界)
        for (let r = 1; r <= this.boardSize; r++) {
            for (let c = 1; c <= this.boardSize; c++) {
                if (this.boardMatrix[r][c] && !this.boardMatrix[r][c].matched && !this.boardMatrix[r][c].isEmpty) {
                    unmatchedCardElements.push(this.boardMatrix[r][c].element);
                    unmatchedCards.push({
                        row: r,
                        col: c,
                        element: this.boardMatrix[r][c].element,
                        id: this.boardMatrix[r][c].id,
                        type: this.boardMatrix[r][c].type
                    });
                    // 标记位置为空
                    this.boardMatrix[r][c] = null;
                }
            }
        }
        
        // 取消当前选中状态
        if (this.firstSelection) {
            this.firstSelection.classList.remove('selected');
            this.firstSelection = null;
        }
        
        // 给所有卡片添加洗牌动画
        unmatchedCardElements.forEach(card => {
            card.classList.add('shuffling');
            // 清除所有错误状态
            card.classList.remove('incorrect', 'selected');
            // 禁用卡片交互
            card.style.pointerEvents = 'none';
        });

        console.log("洗牌: 未匹配卡片数量", unmatchedCards.length);
        
        // 使用Promise控制动画流程
        return new Promise(resolve => {
            // 给所有卡片添加洗牌动画
            unmatchedCardElements.forEach(card => {
                card.classList.add('shuffling');
                // 禁用卡片交互
                card.style.pointerEvents = 'none';
            });
            
            // 等待洗牌动画完成（0.5秒）
            setTimeout(() => {
                if (unmatchedCards.length <= 1) {
                    // 只有一张或没有卡片，不需要洗牌
                    unmatchedCardElements.forEach(card => {
                        card.classList.remove('shuffling');
                        card.style.pointerEvents = '';
                    });
                    WordUtils.LoadingManager.hide();
                    WordGame.isLoading = false;
                    resolve(true);
                    return;
                }
                
                // 智能洗牌算法
                const smartShuffle = () => {
                    // 按匹配对分组
                    const pairGroups = {};
                    unmatchedCards.forEach(card => {
                        if (!pairGroups[card.id]) {
                            pairGroups[card.id] = [];
                        }
                        pairGroups[card.id].push(card);
                    });
                    
                    // 收集空位置
                    const emptyPositions = [];
                    for (let r = 1; r <= this.boardSize; r++) {
                        for (let c = 1; c <= this.boardSize; c++) {
                            if (!this.boardMatrix[r][c]) {
                                emptyPositions.push({ row: r, col: c });
                            }
                        }
                    }
                    
                    // 空位置随机打乱
                    for (let i = emptyPositions.length - 1; i > 0; i--) {
                        const j = Math.floor(Math.random() * (i + 1));
                        [emptyPositions[i], emptyPositions[j]] = [emptyPositions[j], emptyPositions[i]];
                    }
                    
                    // 分层放置卡片对
                    const pairIds = Object.keys(pairGroups);
                    const totalPairs = pairIds.length;
                    
                    // 前1/3的卡片对放置较近
                    const easyPairs = pairIds.slice(0, Math.ceil(totalPairs / 3));
                    // 中间1/3的卡片对放置中等距离
                    const mediumPairs = pairIds.slice(Math.ceil(totalPairs / 3), Math.ceil(totalPairs * 2 / 3));
                    // 最后1/3的卡片对放置较远
                    const hardPairs = pairIds.slice(Math.ceil(totalPairs * 2 / 3));
                    
                    // 处理简单匹配对 - 相对较近
                    let posIndex = 0;
                    easyPairs.forEach(pairId => {
                        if (pairGroups[pairId].length !== 2) return; // 跳过不是一对的
                        
                        const pos1 = emptyPositions[posIndex++];
                        // 找一个靠近的位置
                        let nearestPos;
                        let minDistance = Infinity;
                        
                        for (let i = posIndex; i < emptyPositions.length; i++) {
                            const pos = emptyPositions[i];
                            const distance = Math.abs(pos.row - pos1.row) + Math.abs(pos.col - pos1.col);
                            
                            if (distance < minDistance && distance >= 1) { // 至少有1个距离
                                minDistance = distance;
                                nearestPos = i;
                                // 如果距离足够小，就不再寻找
                                if (distance <= 2) break;
                            }
                        }
                        
                        // 交换位置，使得第二张卡片位于选定的位置
                        if (nearestPos !== undefined) {
                            [emptyPositions[posIndex], emptyPositions[nearestPos]] = 
                                [emptyPositions[nearestPos], emptyPositions[posIndex]];
                        }
                        
                        // 分配位置
                        const pos2 = emptyPositions[posIndex++];
                        
                        // 设置卡片位置
                        pairGroups[pairId][0].newPos = pos1;
                        pairGroups[pairId][1].newPos = pos2;
                    });
                    
                    // 处理中等难度匹配对 - 中等距离
                    mediumPairs.forEach(pairId => {
                        if (pairGroups[pairId].length !== 2 || posIndex >= emptyPositions.length - 1) return;
                        
                        const pos1 = emptyPositions[posIndex++];
                        
                        // 找一个中等距离的位置
                        let mediumDistPos;
                        
                        // 定义中等距离范围
                        const minDist = 3; // 至少相隔3格
                        const maxDist = 5; // 最多相隔5格
                        
                        for (let i = posIndex; i < emptyPositions.length; i++) {
                            const pos = emptyPositions[i];
                            const distance = Math.abs(pos.row - pos1.row) + Math.abs(pos.col - pos1.col);
                            
                            if (distance >= minDist && distance <= maxDist) {
                                mediumDistPos = i;
                                break;
                            }
                        }
                        
                        // 如果没找到合适的，就用下一个位置
                        if (mediumDistPos === undefined) {
                            mediumDistPos = posIndex;
                        } else {
                            // 交换位置
                            [emptyPositions[posIndex], emptyPositions[mediumDistPos]] = 
                                [emptyPositions[mediumDistPos], emptyPositions[posIndex]];
                        }
                        
                        const pos2 = emptyPositions[posIndex++];
                        
                        // 设置卡片位置
                        pairGroups[pairId][0].newPos = pos1;
                        pairGroups[pairId][1].newPos = pos2;
                    });
                    
                    // 处理困难匹配对 - 较远距离
                    hardPairs.forEach(pairId => {
                        if (pairGroups[pairId].length !== 2 || posIndex >= emptyPositions.length - 1) return;
                        
                        const pos1 = emptyPositions[posIndex++];
                        
                        // 找一个较远的位置
                        let farPosition;
                        let maxDistance = 0;
                        
                        for (let i = posIndex; i < emptyPositions.length; i++) {
                            const pos = emptyPositions[i];
                            const distance = Math.abs(pos.row - pos1.row) + Math.abs(pos.col - pos1.col);
                            
                            if (distance > maxDistance) {
                                maxDistance = distance;
                                farPosition = i;
                            }
                        }
                        
                        // 如果找到了，就交换位置
                        if (farPosition !== undefined) {
                            [emptyPositions[posIndex], emptyPositions[farPosition]] = 
                                [emptyPositions[farPosition], emptyPositions[posIndex]];
                        }
                        
                        const pos2 = emptyPositions[posIndex++];
                        
                        // 设置卡片位置
                        pairGroups[pairId][0].newPos = pos1;
                        pairGroups[pairId][1].newPos = pos2;
                    });
                    
                    // 处理剩余的单卡片
                    Object.keys(pairGroups).forEach(pairId => {
                        pairGroups[pairId].forEach(card => {
                            if (!card.newPos && posIndex < emptyPositions.length) {
                                card.newPos = emptyPositions[posIndex++];
                            }
                        });
                    });
                    
                    // 确保所有卡片都有位置
                    unmatchedCards.forEach(card => {
                        if (!card.newPos && posIndex < emptyPositions.length) {
                            card.newPos = emptyPositions[posIndex++];
                        }
                    });
                    
                    return unmatchedCards;
                };
                
                // 应用智能洗牌
                smartShuffle();
                
                // 更新卡片位置和矩阵
                unmatchedCards.forEach(card => {
                    if (card.newPos) {
                        // 更新DOM元素的数据属性
                        card.element.dataset.row = card.newPos.row;
                        card.element.dataset.col = card.newPos.col;
                        
                        // 更新游戏矩阵
                        this.boardMatrix[card.newPos.row][card.newPos.col] = {
                            element: card.element,
                            id: card.id,
                            type: card.type,
                            matched: false,
                            isEmpty: false
                        };
                        
                        // 确保之前的动画被清除
                        card.element.style.animation = '';
                        
                        // 更新DOM元素的视觉位置
                        card.element.style.gridRow = card.newPos.row + 1;  // 加1因为CSS网格从1开始
                        card.element.style.gridColumn = card.newPos.col + 1;
                    }
                });
                
                // 再等待0.5秒后完成洗牌过程
                setTimeout(() => {
                    // 移除加载指示器
                    WordUtils.LoadingManager.hide();
                    
                    // 移除洗牌动画类并恢复交互
                    unmatchedCardElements.forEach(card => {
                        card.classList.remove('shuffling');
                        card.style.pointerEvents = '';
                    });
                    
                    // 重新初始化路径查找器
                    WordPathFinder.init(this.boardMatrix, this.boardSize);
                    
                    // 清除路径缓存
                    WordPathFinder.clearCache();
                    
                    // 如果是首次自动洗牌，不扣分
                    if (!(isAuto && WordGame.shuffleCount === 1)) {
                        // 触发洗牌事件
                        WordUtils.EventSystem.trigger('board:shuffled', { isAuto });
                    }
                    
                    // 检查是否有可连接的卡片
                    setTimeout(() => {
                        const hasMatch = WordPathFinder.checkForPossibleMatches();
                        console.log("洗牌后是否有可连接的卡片:", hasMatch);
                        
                        if (!hasMatch) {
                            // 如果没有可连接的卡片，再次洗牌
                            console.log("洗牌后没有可连接的卡片，再次洗牌");
                            this.shuffleBoard(true);
                        }
                        
                        WordGame.isLoading = false;
                        resolve(true);
                    }, 600);
                }, 500);
            }, 500);
        });
    }
    };