/**
 * 工具模块
 * 提供游戏中使用的通用工具函数
 */
const WordUtils = {
    /**
     * 事件系统
     * 用于组件间通信
     */
    EventSystem: {
        events: {},
        
        /**
         * 订阅事件
         * @param {string} eventName - 事件名称
         * @param {Function} callback - 回调函数
         */
        on(eventName, callback) {
            if (!this.events[eventName]) {
                this.events[eventName] = [];
            }
            this.events[eventName].push(callback);
        },
        
        /**
         * 触发事件
         * @param {string} eventName - 事件名称
         * @param {*} data - 事件数据
         */
        trigger(eventName, data) {
            const callbacks = this.events[eventName];
            if (callbacks) {
                callbacks.forEach(callback => callback(data));
            }
        }
    },
    
    /**
     * 错误提示管理
     */
    ErrorManager: {
        /**
         * 显示错误提示
         * @param {string} message - 错误信息
         * @param {number} duration - 显示时长(毫秒)
         * @param {string} type - 提示类型: 'error'|'success'|'warning'
         */
        showToast(message, duration = 3000, type = 'error') {
            const toast = document.getElementById('error-toast');
            toast.textContent = message;
            toast.classList.add('active');
            
            // 根据消息类型设置不同的样式
            if (type === 'error') {
                toast.style.backgroundColor = 'rgba(231, 76, 60, 0.9)';
            } else if (type === 'success') {
                toast.style.backgroundColor = 'rgba(46, 204, 113, 0.9)';
            } else if (type === 'warning') {
                toast.style.backgroundColor = 'rgba(243, 156, 18, 0.9)';
            }
            
            setTimeout(() => {
                toast.classList.remove('active');
            }, duration);
        }
    },
    
    /**
     * 加载管理
     */
    LoadingManager: {
        /**
         * 显示加载动画
         * @param {string} message - 加载提示信息
         */
        show(message = '正在加载...') {
            const loading = document.getElementById('loading-overlay');
            loading.querySelector('.loading-text').textContent = message;
            loading.classList.add('active');
        },
        
        /**
         * 隐藏加载动画
         */
        hide() {
            const loading = document.getElementById('loading-overlay');
            loading.classList.remove('active');
        }
    },
    
    /**
     * 自定义确认框
     * @param {string} title - 标题
     * @param {string} message - 信息内容
     * @param {Function} onConfirm - 确认回调
     * @param {Function} onCancel - 取消回调（可选）
     */
    showConfirm(title, message, onConfirm, onCancel) {
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.style.zIndex = '3000';
        
        const content = document.createElement('div');
        content.className = 'modal-content';
        
        const titleEl = document.createElement('h2');
        titleEl.textContent = title;
        
        const messageEl = document.createElement('p');
        messageEl.textContent = message;
        messageEl.style.margin = '20px 0';
        
        // 按钮容器
        const buttonContainer = document.createElement('div');
        buttonContainer.style.display = 'flex';
        buttonContainer.style.justifyContent = 'center';
        buttonContainer.style.gap = '20px';
        buttonContainer.style.marginTop = '20px';
        
        // 取消按钮
        const cancelButton = document.createElement('button');
        cancelButton.className = 'btn';
        cancelButton.style.backgroundColor = 'rgba(150, 150, 150, 0.8)';
        cancelButton.textContent = '取消';
        cancelButton.addEventListener('click', () => {
            document.body.removeChild(modal);
            if (typeof onCancel === 'function') {
                onCancel();
            }
        });
        
        // 确认按钮
        const confirmButton = document.createElement('button');
        confirmButton.className = 'btn';
        confirmButton.style.backgroundColor = 'rgba(231, 76, 60, 0.8)';
        confirmButton.textContent = '确定';
        confirmButton.addEventListener('click', () => {
            document.body.removeChild(modal);
            if (typeof onConfirm === 'function') {
                onConfirm();
            }
        });
        
        // 添加按钮到容器
        buttonContainer.appendChild(cancelButton);
        buttonContainer.appendChild(confirmButton);
        
        content.appendChild(titleEl);
        content.appendChild(messageEl);
        content.appendChild(buttonContainer);
        modal.appendChild(content);
        
        document.body.appendChild(modal);
    },
    
    /**
     * 打乱数组
     * @param {Array} array - 要打乱的数组
     * @returns {Array} 打乱后的新数组
     */
    shuffle(array) {
        const newArray = [...array];
        for (let i = newArray.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
        }
        return newArray;
    },
    
    /**
     * 解析自定义输入的单词数据
     * @param {string} text - 输入文本
     * @returns {Array} 单词对数组
     */
    parseCustomInput(text) {
        const lines = text.trim().split('\n');
        const pairs = [];
        
        lines.forEach(line => {
            if (!line.trim()) return;
            
            const parts = line.split(/\s+/);
            if (parts.length >= 2) {
                const word = parts[0].trim();
                const definition = parts.slice(1).join(' ').trim();
                if (word && definition) {
                    pairs.push({ word, definition });
                }
            }
        });
        
        return pairs;
    },
    
    /**
     * 加载图片并返回Promise
     * @param {string} src - 图片源
     * @returns {Promise} Promise对象
     */
    loadImage(src) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error(`Failed to load image from ${src}`));
            img.src = src;
        });
    }
};