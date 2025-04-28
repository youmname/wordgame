const WordProcessor = {
    // 解析和处理单词分类
    parseCategory(line) {
      const trimmed = line.trim();
      if (trimmed.includes('🔥')) return { type: 'hot', emoji: '🔥', title: trimmed.replace('🔥', '').trim() };
      if (trimmed.includes('⭐')) return { type: 'star', emoji: '⭐', title: trimmed.replace('⭐', '').trim() };
      if (trimmed.includes('💡')) return { type: 'trophy', emoji: '💡', title: trimmed.replace('💡', '').trim() };
      if (trimmed.includes('⚠️')) return { type: 'warning', emoji: '⚠️', title: trimmed.replace('⚠️', '').trim() };
      return null;
    },
  
    // 解析单词条目
    parseWordItem(line, currentCategory) {
      if (!currentCategory) return null;
      
      const trimmed = line.trim();
      const wordLine = trimmed.startsWith('-') ? trimmed.substring(1).trim() : trimmed;
      const parts = wordLine.split('/').map(part => part.trim());
      const wordPart = parts[0].trim();
      
      // 解析单词和释义
      let word, translation;
      if (wordPart.includes('（') && wordPart.includes('）')) {
        [word, translation] = wordPart.split('（').map(p => p.replace('）', '').trim());
      } else if (wordPart.includes('(') && wordPart.includes(')')) {
        [word, translation] = wordPart.split('(').map(p => p.replace(')', '').trim());
      } else {
        word = wordPart;
        translation = '';
      }
      
      // 解析音标
      const phonetics = parts.length > 1 ? '/' + parts.slice(1).join('/').trim() + '/' : '';
      
      return { word, translation, phonetics, category: currentCategory };
    },
    
    // 格式化文本内容
    formatText() {
      console.log("formatText开始执行");
      const input = document.getElementById('wordListInput').value;
      const output = document.getElementById('wordListOutput');
      output.innerHTML = '';
      
      try {
        const lines = input.split('\n').filter(line => line.trim());
        let currentCategory = '';
        
        // 使用DocumentFragment减少DOM重绘
        const fragment = document.createDocumentFragment();
        
        lines.forEach(line => {
          const category = this.parseCategory(line);
          if (category) {
            currentCategory = category.type;
            const categoryDiv = document.createElement('div');
            categoryDiv.className = `category ${category.type}-block`;
            categoryDiv.innerHTML = `
              <span class="icon">${category.emoji}</span>
              <span class="word-list-title-${category.type}">${category.title}</span>
            `;
            fragment.appendChild(categoryDiv);
                } else {
            const wordData = this.parseWordItem(line, currentCategory);
            if (wordData) {
              const itemDiv = document.createElement('div');
              itemDiv.className = 'sub-item';
              itemDiv.innerHTML = `
                <span class="bullet">•</span>
                <span class="word" data-word="${wordData.word}">${wordData.word}</span>
                <span class="phonetics">${wordData.phonetics}</span>
              `;
              
              // 添加点击发音功能
              itemDiv.querySelector('.word').addEventListener('click', () => {
                if ('speechSynthesis' in window) {
                  const utterance = new SpeechSynthesisUtterance(wordData.word);
                  utterance.lang = 'en-US';
                  speechSynthesis.speak(utterance);
                }
              });
              
              fragment.appendChild(itemDiv);
                }
            }
        });
        
        // 一次性更新DOM
        if (fragment.childNodes.length > 0) {
          output.appendChild(fragment);
          UIManager.showSuccessMessage('格式化成功', 1500);
        } else {
          output.innerHTML = '<div class="warning-message">未能生成内容，请检查输入格式</div>';
        }
        
        // 保存到本地存储
        StorageManager.saveRecentWork();
      } catch (error) {
        console.error('Error formatting word list:', error);
        output.innerHTML = '<div class="warning-message">发生错误，请检查输入内容</div>';
      }
    },
    
    // 生成叙述文本
    generateNarrative() {
      const input = document.getElementById('narrativeInput').innerHTML;
      const output = document.getElementById('narrativeOutput');
      const wordListInput = document.getElementById('wordListInput').value;
      
      try {
        // 构建单词分类数据
        const wordCategories = this.buildWordCategories(wordListInput);
        
        // 处理标记的词汇
        let processed = this.processMarkedWords(input, wordCategories);
        
        output.innerHTML = processed;
        
        // 动态调整间距
        this.adjustSpacing();
        
        // 保存到本地存储
        StorageManager.saveRecentWork();
      } catch (error) {
        console.error('Error generating narrative:', error);
        output.innerHTML = '<div class="warning-message">发生错误，请检查输入内容</div>';
      }
    },
    
    // 构建单词分类数据
    buildWordCategories(wordListInput) {
      const wordCategories = {};
      let currentCategory = null;
      
      const lines = wordListInput.split('\n').map(line => line.trim()).filter(line => line.length > 0);
      
      lines.forEach(line => {
        const category = this.parseCategory(line);
        if (category) {
          currentCategory = category.type;
          wordCategories[currentCategory] = { words: {}, colorClass: category.type };
        } else if (currentCategory) {
          const wordData = this.parseWordItem(line, currentCategory);
          if (wordData && wordData.word) {
            wordCategories[currentCategory].words[wordData.word.toLowerCase()] = {
              phonetics: wordData.phonetics,
              translation: wordData.translation
            };
          }
        }
      });
      
      return wordCategories;
    },
    
    // 处理标记的词汇
    processMarkedWords(input, wordCategories) {
      // 处理 **中文(英文)** 格式
        let processed = input.replace(/\*\*([^(（]+?)[（(]([^）)]+)[）)]\*\*/g,
            (_, cn, en) => {
                const englishWord = en.trim().toLowerCase();
          let colorClass = 'term-en';
          
          for (const [category, data] of Object.entries(wordCategories || {})) {
                    if (data.words[englishWord]) {
              colorClass = data.colorClass;
                        break;
                    }
                }
          
                return `
                    <span class="term-box">
                        <span class="${colorClass}">${en.trim()}</span>
                        <span class="term-cn">${cn.trim()}</span>
                    </span>
                `;
            }
        );
      
      return processed;
    },
    
    // 调整间距
    adjustSpacing() {
        setTimeout(() => {
            try {
                document.querySelectorAll('.term-box').forEach(box => {
                    const cn = box.querySelector('.term-cn');
                    if (cn) {
                        const cnHeight = cn.getBoundingClientRect().height;
                        box.style.paddingBottom = `${cnHeight + 2}px`;
                    }
                });
            } catch (error) {
                console.error('Error adjusting spacing:', error);
            }
      }, 100);
    }
  };
  
  // 图像导出管理器
  const ImageExporter = {
    config: {
      scale: 3,
      useCORS: true,
      logging: false,
      allowTaint: true
    },
    
    // 添加新属性，保存JSZip库的加载状态
    jsZipLoaded: false,
    
    showLoading() {
      const loading = document.getElementById('loading');
      if (loading) loading.style.display = 'inline';
      
      // 添加进度条
      const progressBar = document.createElement('div');
      progressBar.className = 'progress-indicator';
      progressBar.id = 'progress-bar';
      document.body.appendChild(progressBar);
      
      // 模拟进度
      let width = 0;
      const interval = setInterval(() => {
        if (width >= 90) {
          clearInterval(interval);
        } else {
          width += 5;
          progressBar.style.width = width + '%';
        }
      }, 100);
      
      // 将interval ID保存起来，以便在hideLoading中清除
      this.progressInterval = interval;
    },
    
    hideLoading() {
      const loading = document.getElementById('loading');
      if (loading) loading.style.display = 'none';
      
      // 清除进度条定时器
      if (this.progressInterval) {
        clearInterval(this.progressInterval);
        this.progressInterval = null;
      }
      
      // 移除进度条
      const progressBar = document.getElementById('progress-bar');
      if (progressBar) {
        progressBar.style.width = '100%';
        setTimeout(() => progressBar.remove(), 300);
      }
    },
    
    // 检查是否有内容需要下载
    checkContents() {
      const narrativeOutput = document.getElementById('narrativeOutput');
      const wordListOutput = document.getElementById('wordListOutput');
      
      const hasNarrativeContent = narrativeOutput && narrativeOutput.innerHTML.trim().length > 0;
      const hasWordListContent = wordListOutput && wordListOutput.innerHTML.trim().length > 0;
      
      if (!hasNarrativeContent && !hasWordListContent) {
        UIManager.showErrorMessage('没有内容可下载，请先生成文本和单词列表', 3000);
        return false;
      }
      
      return { hasNarrativeContent, hasWordListContent };
    },
    
    // 生成元素的图片数据
    generateImageData(element, isTransparent = false, scale = 3) {
      if (!element || !element.innerHTML.trim()) {
        return Promise.resolve(null);
      }
      
      // 保存原始样式
      const originalBackground = element.style.background;
      const originalBoxShadow = element.style.boxShadow;
      
      // 如果需要透明背景，则临时修改样式
      if (isTransparent) {
        element.style.background = 'transparent';
        element.style.boxShadow = 'none';
      }
      
      return html2canvas(element, {
        ...this.config,
        backgroundColor: isTransparent ? null : undefined,
        scale: scale
      }).then(canvas => {
        // 还原原始样式
        if (isTransparent) {
          element.style.background = originalBackground;
          element.style.boxShadow = originalBoxShadow;
        }
        
        // 检查画布是否正确生成
        if (!canvas || canvas.width <= 0 || canvas.height <= 0) {
          throw new Error('无效的画布');
        }
        
        // 返回图片数据
        return canvas.toDataURL('image/png', 1.0);
      });
    },
    
    // 分别下载单个元素
    downloadElementAsImage(element, filename, isTransparent = false, scale = 3) {
      if (!element || !element.innerHTML.trim()) {
        return Promise.resolve(null);
      }
      
      return this.generateImageData(element, isTransparent, scale).then(imgData => {
        if (!imgData) return null;
        
        // 创建下载链接并点击
        const link = document.createElement('a');
        link.download = filename;
        link.href = imgData;
        
        // 确保下载功能生效
        document.body.appendChild(link);
        setTimeout(() => {
          link.click();
          document.body.removeChild(link);
        }, 200);
        
        return link;
      });
    },
    
    // 加载JSZip库
    loadJSZip() {
      return new Promise((resolve, reject) => {
        if (window.JSZip) {
          this.jsZipLoaded = true;
          resolve(window.JSZip);
          return;
        }
        
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
        script.onload = () => {
          this.jsZipLoaded = true;
          resolve(window.JSZip);
        };
        script.onerror = () => {
          reject(new Error('无法加载JSZip库，请检查网络连接'));
        };
        document.head.appendChild(script);
      });
    },
    
    // 创建并下载ZIP文件
    downloadAsZip(files, zipFilename = '词汇学习资料.zip') {
      return this.loadJSZip()
        .then(JSZip => {
          const zip = new JSZip();
          
          // 将文件添加到zip
          Object.keys(files).forEach(filename => {
            const dataURL = files[filename];
            if (dataURL) {
              // 从dataURL中提取base64数据
              const base64Data = dataURL.split(',')[1];
              zip.file(filename, base64Data, {base64: true});
            }
          });
          
          // 生成zip文件
          return zip.generateAsync({type: 'blob'});
        })
        .then(blob => {
          // 创建下载链接
          const link = document.createElement('a');
          link.href = URL.createObjectURL(blob);
          link.download = zipFilename;
          
          // 触发下载
          document.body.appendChild(link);
          link.click();
          
          // 清理
          setTimeout(() => {
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href);
          }, 100);
          
          return true;
        });
    },
    
    // 打包下载所有内容
    downloadAllAsZip(isTransparent = false, isHighQuality = false) {
      // 检查是否有内容需要下载
      const contentStatus = this.checkContents();
      if (!contentStatus) return;
      
      this.showLoading();
      UIManager.showSuccessMessage('正在准备打包下载...', 1500);
      
      const { hasNarrativeContent, hasWordListContent } = contentStatus;
      const narrativeOutput = document.getElementById('narrativeOutput');
      const wordListOutput = document.getElementById('wordListOutput');
      
      const scale = isHighQuality ? 4 : 3;
      const qualityText = isHighQuality ? '高清' : '标准';
      const transparentText = isTransparent ? '透明' : '有背景';
      const filesPromises = [];
      const fileNames = [];
      
      if (hasNarrativeContent) {
        filesPromises.push(this.generateImageData(
          narrativeOutput, 
          isTransparent, 
          scale
        ));
        fileNames.push(`情境文本-${qualityText}${transparentText}.png`);
      }
      
      if (hasWordListContent) {
        filesPromises.push(this.generateImageData(
          wordListOutput, 
          isTransparent, 
          scale
        ));
        fileNames.push(`单词列表-${qualityText}${transparentText}.png`);
      }
      
      Promise.all(filesPromises)
        .then(dataURLs => {
          const files = {};
          dataURLs.forEach((dataURL, index) => {
            if (dataURL) {
              files[fileNames[index]] = dataURL;
            }
          });
          
          return this.downloadAsZip(files);
        })
        .then(() => {
          this.hideLoading();
          UIManager.showSuccessMessage(`已打包下载${transparentText}${qualityText}图片`, 2000);
        })
        .catch(error => {
          console.error('打包下载出错:', error);
          this.hideLoading();
          UIManager.showErrorMessage('打包下载失败: ' + error.message, 3000);
        });
    },
    
    downloadStandardImage() {
      // 检查是否有内容需要下载
      const contentStatus = this.checkContents();
      if (!contentStatus) return;
      
      this.showLoading();
      
      const { hasNarrativeContent, hasWordListContent } = contentStatus;
      const narrativeOutput = document.getElementById('narrativeOutput');
      const wordListOutput = document.getElementById('wordListOutput');
      
      // 创建延迟下载的函数，以避免浏览器同时下载多个文件的限制
      const delayedDownloads = [];
      
      if (hasNarrativeContent) {
        delayedDownloads.push(
          () => this.downloadElementAsImage(
            narrativeOutput, 
            'narrative-standard.png', 
            false
          )
        );
      }
      
      if (hasWordListContent) {
        delayedDownloads.push(
          () => this.downloadElementAsImage(
            wordListOutput, 
            'wordlist-standard.png', 
            false
          )
        );
      }
      
      // 顺序执行下载，确保每个下载都能成功
      let downloadCount = 0;
      let currentDownload = Promise.resolve();
      
      delayedDownloads.forEach((downloadFn, index) => {
        currentDownload = currentDownload
          .then(() => {
            // 每个下载之间间隔300ms
            return new Promise(resolve => setTimeout(resolve, 300 * index));
          })
          .then(() => downloadFn())
          .then(() => {
            downloadCount++;
            return Promise.resolve();
          })
          .catch(err => {
            console.error('下载出错:', err);
            return Promise.resolve(); // 继续下一个下载
          });
      });
      
      currentDownload.finally(() => {
        this.hideLoading();
        if (downloadCount > 0) {
          UIManager.showSuccessMessage(`已下载${downloadCount}个标准图片`, 2000);
        } else {
          UIManager.showErrorMessage('未能下载任何内容', 3000);
        }
      });
    },
    
    downloadTransparentHighQuality() {
      // 检查是否有内容需要下载
      const contentStatus = this.checkContents();
      if (!contentStatus) return;
      
      this.showLoading();
      
      const { hasNarrativeContent, hasWordListContent } = contentStatus;
      const narrativeOutput = document.getElementById('narrativeOutput');
      const wordListOutput = document.getElementById('wordListOutput');
      
      // 创建延迟下载的函数
      const delayedDownloads = [];
      
      if (hasNarrativeContent) {
        delayedDownloads.push(
          () => this.downloadElementAsImage(
            narrativeOutput, 
            'narrative-transparent-hq.png', 
            true, 
            4 // 高清
          )
        );
      }
      
      if (hasWordListContent) {
        delayedDownloads.push(
          () => this.downloadElementAsImage(
            wordListOutput, 
            'wordlist-transparent-hq.png', 
            true, 
            4 // 高清
          )
        );
      }
      
      // 顺序执行下载
      let downloadCount = 0;
      let currentDownload = Promise.resolve();
      
      delayedDownloads.forEach((downloadFn, index) => {
        currentDownload = currentDownload
          .then(() => {
            // 每个下载之间间隔500ms
            return new Promise(resolve => setTimeout(resolve, 500 * index));
          })
          .then(() => downloadFn())
          .then(() => {
            downloadCount++;
            return Promise.resolve();
          })
          .catch(err => {
            console.error('下载高清透明图片出错:', err);
            return Promise.resolve(); // 继续下一个下载
          });
      });
      
      currentDownload.finally(() => {
        this.hideLoading();
        if (downloadCount > 0) {
          UIManager.showSuccessMessage(`已下载${downloadCount}个高清透明图片`, 2000);
        } else {
          UIManager.showErrorMessage('未能下载任何内容', 3000);
        }
      });
    },
    
    // 打包下载标准图片
    downloadStandardZip() {
      this.downloadAllAsZip(false, false);
    },
    
    // 打包下载高清透明图片
    downloadTransparentHQZip() {
      this.downloadAllAsZip(true, true);
    },
    
    // 添加PDF导出功能
    exportToPDF() {
      // 检查是否有内容需要导出
      const contentStatus = this.checkContents();
      if (!contentStatus) return;
      
      this.showLoading();
      
      // 使用动态加载方式引入jsPDF库
      if (typeof window.jspdf === 'undefined') {
        // 如果jsPDF库未加载，则先加载库
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
        script.onload = () => {
          // 加载成功后继续执行PDF导出
          this._generatePDF(contentStatus);
        };
        script.onerror = () => {
          // 加载失败时提示用户
          this.hideLoading();
          UIManager.showErrorMessage('无法加载PDF生成库，请检查网络连接', 3000);
        };
        document.head.appendChild(script);
      } else {
        // 如果jsPDF已加载，直接执行导出
        this._generatePDF(contentStatus);
      }
    },
    
    // 实际生成PDF的内部方法
    _generatePDF(contentStatus) {
      try {
        const { hasNarrativeContent, hasWordListContent } = contentStatus;
        const narrativeOutput = document.getElementById('narrativeOutput');
        const wordListOutput = document.getElementById('wordListOutput');
        
        // 临时解决方案：将内容转换为图片后插入PDF
        const promises = [];
        
        if (hasNarrativeContent) {
          promises.push(html2canvas(narrativeOutput, {
            ...this.config,
            scale: 2
          }));
        }
        
        if (hasWordListContent) {
          promises.push(html2canvas(wordListOutput, {
            ...this.config,
            scale: 2
          }));
        }
        
        Promise.all(promises)
          .then(canvases => {
            // 创建PDF
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF('p', 'pt', 'a4');
            
            // 计算PDF页面宽度（减去页边距）
            const pageWidth = pdf.internal.pageSize.getWidth() - 40;
            
            let currentY = 20; // 起始Y坐标
            
            canvases.forEach((canvas, index) => {
              // 如果不是第一个画布，先添加新页面
              if (index > 0) {
                pdf.addPage();
                currentY = 20;
              }
              
              // 计算图像等比例缩放后的尺寸
              const imgWidth = pageWidth;
              const imgHeight = (canvas.height * imgWidth) / canvas.width;
              
              // 添加画布到PDF
              const imgData = canvas.toDataURL('image/png');
              pdf.addImage(imgData, 'PNG', 20, currentY, imgWidth, imgHeight);
            });
            
            // 保存PDF
            pdf.save('词汇学习内容.pdf');
            this.hideLoading();
            UIManager.showSuccessMessage('PDF文件已导出', 2000);
          })
          .catch(error => {
            console.error('生成PDF出错:', error);
            this.hideLoading();
            UIManager.showErrorMessage('生成PDF失败，请重试', 3000);
          });
      } catch (error) {
        console.error('PDF生成错误:', error);
        this.hideLoading();
        UIManager.showErrorMessage('PDF功能出错，请确保内容正确生成', 3000);
      }
    }
  };
  
  // UI管理器
  const UIManager = {
    messageContainer: null,
    
    init() {
      // 创建消息容器
      this.messageContainer = document.createElement('div');
      this.messageContainer.className = 'message-container';
      document.body.appendChild(this.messageContainer);
      
      // 添加主题切换
      this.setupThemeToggle();
      
      // 绑定事件
      this.bindEvents();
    },
    
    setupThemeToggle() {
      // 检查页面中是否已存在主题切换按钮
      const existingToggle = document.querySelector('.theme-toggle');
      if (existingToggle) {
        console.log('主题切换按钮已存在');
        
        // 绑定主题切换事件
        const lightBtn = document.getElementById('light-theme');
        const darkBtn = document.getElementById('dark-theme');
        
        if (lightBtn) {
          lightBtn.addEventListener('click', () => this.changeTheme('light'));
        }
        
        if (darkBtn) {
          darkBtn.addEventListener('click', () => this.changeTheme('dark'));
        }
      } else {
        console.log('创建新的主题切换按钮');
        const toggleContainer = document.createElement('div');
        toggleContainer.className = 'theme-toggle';
        toggleContainer.innerHTML = `
          <button id="light-theme" class="theme-btn active" aria-label="浅色主题">☀️</button>
          <button id="dark-theme" class="theme-btn" aria-label="深色主题">🌙</button>
        `;
        
        // 添加到DOM中
        const container = document.querySelector('.container');
        if (container) {
          container.prepend(toggleContainer);
          
          // 绑定主题切换事件
          const lightBtn = document.getElementById('light-theme');
          const darkBtn = document.getElementById('dark-theme');
          
          if (lightBtn) {
            lightBtn.addEventListener('click', () => this.changeTheme('light'));
          }
          
          if (darkBtn) {
            darkBtn.addEventListener('click', () => this.changeTheme('dark'));
          }
        }
      }
      
      // 检查之前的主题设置
      const savedTheme = localStorage.getItem('preferred-theme');
      if (savedTheme) {
        this.changeTheme(savedTheme);
      }
    },
    
    changeTheme(theme) {
      // 应用主题前先添加过渡类
      document.body.classList.add('theme-transition');
      
      // 异步应用主题，确保过渡动画能显示
      setTimeout(() => {
        document.body.setAttribute('data-theme', theme);
        localStorage.setItem('preferred-theme', theme);
        
        // 更新按钮状态
        document.querySelectorAll('.theme-btn').forEach(btn => btn.classList.remove('active'));
        
        // 修复：先检查元素是否存在再访问
        const themeBtn = document.getElementById(`${theme}-theme`);
        if (themeBtn) {
          themeBtn.classList.add('active');
        }
        
        // 通知用户已切换主题
        this.showSuccessMessage(`已切换到${theme === 'dark' ? '深色' : '浅色'}主题`, 1500);
        
        // 移除过渡类
        setTimeout(() => document.body.classList.remove('theme-transition'), 500);
      }, 10);
    },
    
    bindEvents() {
      // 实时预览功能
      const wordListInput = document.getElementById('wordListInput');
      if (wordListInput) {
        wordListInput.addEventListener('input', this.debounce(() => {
          if (wordListInput.value.trim().length > 10) {
            WordProcessor.formatText();
          }
        }, 800));
      }
      
      const narrativeInput = document.getElementById('narrativeInput');
      if (narrativeInput) {
        narrativeInput.addEventListener('input', this.debounce(() => {
          if (narrativeInput.innerHTML.trim().length > 10) {
            WordProcessor.generateNarrative();
          }
        }, 800));
      }
      
      // 绑定按钮事件
      const generateButton = document.getElementById('generateButton');
      if (generateButton) {
        generateButton.addEventListener('click', () => WordProcessor.generateNarrative());
      }
      
      const formatButton = document.getElementById('formatButton');
      if (formatButton) {
        formatButton.addEventListener('click', () => WordProcessor.formatText());
      }
      
      const downloadStandardButton = document.getElementById('downloadStandardButton');
      if (downloadStandardButton) {
        downloadStandardButton.addEventListener('click', () => ImageExporter.downloadStandardImage());
      }
      
      const downloadTransparentButton = document.getElementById('downloadTransparentButton');
      if (downloadTransparentButton) {
        downloadTransparentButton.addEventListener('click', () => ImageExporter.downloadTransparentHighQuality());
      }
      
      // 打包下载按钮
      const downloadZipButton = document.getElementById('downloadZipButton');
      if (downloadZipButton) {
        downloadZipButton.addEventListener('click', () => {
          // 显示选择对话框，让用户选择打包类型
          const choiceDialog = document.createElement('div');
          choiceDialog.className = 'download-choice-dialog';
          choiceDialog.innerHTML = `
            <div class="dialog-content">
              <h3>选择打包类型</h3>
              <button id="packStandard" class="btn">标准质量</button>
              <button id="packTransparent" class="btn primary-btn">高清透明</button>
              <button id="cancelPack" class="btn secondary-btn">取消</button>
            </div>
          `;
          
          document.body.appendChild(choiceDialog);
          
          // 添加对话框的样式
          const style = document.createElement('style');
          style.textContent = `
            .download-choice-dialog {
              position: fixed;
              top: 0;
              left: 0;
              width: 100%;
              height: 100%;
              background-color: rgba(0, 0, 0, 0.5);
              display: flex;
              justify-content: center;
              align-items: center;
              z-index: 1000;
            }
            .dialog-content {
              background-color: var(--card-bg);
              border-radius: 10px;
              padding: 20px;
              box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
              text-align: center;
            }
            .dialog-content h3 {
              margin-top: 0;
              margin-bottom: 20px;
              color: var(--text-color);
            }
            .dialog-content .btn {
              margin: 10px;
              min-width: 120px;
            }
          `;
          document.head.appendChild(style);
          
          // 绑定按钮事件
          document.getElementById('packStandard').addEventListener('click', () => {
            document.body.removeChild(choiceDialog);
            ImageExporter.downloadAllAsZip(false, false);
          });
          
          document.getElementById('packTransparent').addEventListener('click', () => {
            document.body.removeChild(choiceDialog);
            ImageExporter.downloadAllAsZip(true, true);
          });
          
          document.getElementById('cancelPack').addEventListener('click', () => {
            document.body.removeChild(choiceDialog);
          });
        });
      }
      
      // 导出PDF按钮
      const exportPdfButton = document.getElementById('exportPdfButton');
      if (exportPdfButton) {
        exportPdfButton.addEventListener('click', () => ImageExporter.exportToPDF());
      }
      
      // 重置按钮事件
      const resetButton = document.getElementById('resetButton');
      if (resetButton) {
        resetButton.addEventListener('click', (e) => {
          e.preventDefault();
          if (confirm('确定要重置所有内容吗？这将清除当前的单词和文本。')) {
            document.getElementById('narrativeInput').innerHTML = '在这里输入内容，例如：**人工智能(AI)**正在**改变(transform)**我们的**生活(life)**方式。';
            document.getElementById('wordListInput').value = '';
            document.getElementById('narrativeOutput').innerHTML = '';
            document.getElementById('wordListOutput').innerHTML = '';
            this.showSuccessMessage('已重置所有内容', 1500);
          }
        });
      }
      
      // 检查是否有保存的工作
      document.addEventListener('DOMContentLoaded', () => {
        const hasRecentWork = StorageManager.checkRecentWork();
        if (hasRecentWork) {
          this.showRestorePrompt();
        }
      });
    },
    
    // 防抖函数
    debounce(func, wait) {
      let timeout;
      return function() {
        const context = this;
        const args = arguments;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), wait);
      };
    },
    
    showSuccessMessage(message, duration = 2000) {
      this.showMessage(message, 'success', duration);
    },
    
    showErrorMessage(message, duration = 3000) {
      this.showMessage(message, 'error', duration);
    },
    
    showMessage(message, type, duration) {
      const messageElement = document.createElement('div');
      messageElement.className = `message ${type}-message`;
      messageElement.textContent = message;
      
      this.messageContainer.appendChild(messageElement);
      
      // 动画效果
      setTimeout(() => messageElement.classList.add('show'), 10);
      
      // 自动消失
      setTimeout(() => {
        messageElement.classList.remove('show');
        setTimeout(() => messageElement.remove(), 300);
      }, duration);
    },
    
    showRestorePrompt() {
      const promptDiv = document.createElement('div');
      promptDiv.className = 'restore-prompt';
      promptDiv.innerHTML = `
        <p>发现之前未完成的工作，是否恢复？</p>
        <div class="prompt-buttons">
          <button id="restore-yes" class="btn">恢复</button>
          <button id="restore-no" class="btn">不需要</button>
        </div>
      `;
      
      document.querySelector('.container').prepend(promptDiv);
      
      document.getElementById('restore-yes').addEventListener('click', () => {
        StorageManager.restoreRecentWork();
        promptDiv.remove();
      });
      
      document.getElementById('restore-no').addEventListener('click', () => {
        promptDiv.remove();
      });
    }
  };
  
  // 存储管理器
  const StorageManager = {
    STORAGE_KEY: 'vocabulary_tool_recent_work',
    
    saveRecentWork() {
      try {
        const narrativeInput = document.getElementById('narrativeInput').innerHTML;
        const wordListInput = document.getElementById('wordListInput').value;
        
        if (!narrativeInput && !wordListInput) return;
        
        const data = {
          narrative: narrativeInput,
          wordList: wordListInput,
          timestamp: Date.now()
        };
        
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
      } catch (error) {
        console.error('Error saving recent work:', error);
      }
    },
    
    checkRecentWork() {
      try {
        const savedData = localStorage.getItem(this.STORAGE_KEY);
        if (!savedData) return false;
        
        const data = JSON.parse(savedData);
        // 仅检查过去24小时内的工作
        const isRecent = (Date.now() - data.timestamp) < 24 * 60 * 60 * 1000;
        
        return isRecent && (data.narrative || data.wordList);
      } catch (error) {
        console.error('Error checking recent work:', error);
        return false;
      }
    },
    
    restoreRecentWork() {
      try {
        const savedData = localStorage.getItem(this.STORAGE_KEY);
        if (!savedData) return;
        
        const data = JSON.parse(savedData);
        
        if (data.narrative) {
          document.getElementById('narrativeInput').innerHTML = data.narrative;
        }
        
        if (data.wordList) {
          document.getElementById('wordListInput').value = data.wordList;
        }
        
        UIManager.showSuccessMessage('已恢复之前的工作', 2000);
      } catch (error) {
        console.error('Error restoring recent work:', error);
        UIManager.showErrorMessage('恢复失败', 2000);
      }
    }
  };
  
  // 初始化
  document.addEventListener('DOMContentLoaded', function() {
    // 设置字体加载检测
    document.fonts.ready.then(function() {
      console.log('所有字体已加载完成');
      UIManager.showSuccessMessage('应用已就绪', 1500);
    }).catch(function(error) {
      console.warn('字体加载发生问题:', error);
    });
    
    // 初始化UI管理器
    UIManager.init();
  });
  
  // 导出全局函数
  window.generateNarrative = () => WordProcessor.generateNarrative();
  window.formatText = () => WordProcessor.formatText();
  window.downloadStandardImage = () => ImageExporter.downloadStandardImage();
  window.downloadTransparentHighQuality = () => ImageExporter.downloadTransparentHighQuality();
  window.downloadAllAsZip = (isTransparent, isHighQuality) => ImageExporter.downloadAllAsZip(isTransparent, isHighQuality);
  window.exportToPDF = () => ImageExporter.exportToPDF();