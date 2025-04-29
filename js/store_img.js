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
          
          // 保存格式化后的单词列表到localStorage，供合成页面使用
          localStorage.setItem('word_list_content', output.innerHTML);
        } else {
          output.innerHTML = '<div class="warning-message">未能生成内容，请检查输入格式</div>';
        }
        
        // 保存到本地存储
        if (typeof StorageManager !== 'undefined' && StorageManager.saveRecentWork) {
          StorageManager.saveRecentWork();
        }
        
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
        
        // 保存处理后的叙述文本到localStorage，供合成页面使用
        localStorage.setItem('narrative_content', output.innerHTML);
        
        // 动态调整间距
        this.adjustSpacing();
        
        // 保存到本地存储
        if (typeof StorageManager !== 'undefined' && StorageManager.saveRecentWork) {
          StorageManager.saveRecentWork();
        }
        
        // 启用下载按钮
        document.querySelectorAll('.download-buttons button').forEach(button => {
          button.disabled = false;
        });
        
      } catch (error) {
        console.error('生成叙述文本时出错:', error);
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
    },
    
    // 增加一个辅助方法，用于获取分类的CSS类名
    getCategoryClass(category) {
      switch(category) {
        case '🔥': return 'hot-block';
        case '⭐': return 'star-block';
        case '💡': return 'trophy-block';
        case '⚠️': return 'warning-block';
        default: return '';
      }
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
      
      // 初始化图片合成器
      ImageComposer.init();
      
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
      
      // 合成编辑按钮
      const composeButton = document.getElementById('composeButton');
      if (composeButton) {
        composeButton.addEventListener('click', () => ImageComposer.showComposer());
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
      // 确保消息容器存在
      let messageContainer = document.getElementById('message-container');
      if (!messageContainer) {
        // 创建消息容器
        messageContainer = document.createElement('div');
        messageContainer.id = 'message-container';
        messageContainer.className = 'message-container';
        // 添加到body
        document.body.appendChild(messageContainer);
      }
      
      const messageElement = document.createElement('div');
      messageElement.className = `message ${type}-message`;
      messageElement.textContent = message;
      
      messageContainer.appendChild(messageElement);
      
      // 添加动画类
      setTimeout(() => {
        messageElement.classList.add('show');
      }, 10);
      
      // 3秒后移除消息
      setTimeout(() => {
        messageElement.classList.remove('show');
        setTimeout(() => {
          if (messageContainer.contains(messageElement)) {
            messageContainer.removeChild(messageElement);
          }
        }, 300);
      }, 3000);
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
    },
    
    // 预设纸张尺寸（像素单位，96dpi）
    paperSizes: {
      'A0': { width: 3370, height: 4768 },
      'A1': { width: 2384, height: 3370 },
      'A2': { width: 1684, height: 2384 },
      'A3': { width: 1191, height: 1684 },
      'A4': { width: 794, height: 1123 },
      'A5': { width: 559, height: 794 },
      'A6': { width: 397, height: 559 },
      'B4': { width: 984, height: 1390 },
      'B5': { width: 693, height: 984 },
      'letter': { width: 816, height: 1056 },
      'legal': { width: 816, height: 1344 },
      'custom': { width: 800, height: 600 }
    },
    
    // 模板存储
    templates: {},
    
    // 初始化模板
    initTemplates() {
      // 从localStorage加载保存的模板
      try {
        const savedTemplates = localStorage.getItem('image_composer_templates');
        if (savedTemplates) {
          this.templates = JSON.parse(savedTemplates);
        } else {
          this.templates = {};
        }
      } catch (e) {
        console.error('Error loading templates:', e);
        this.templates = {};
      }
    },
    
    // 更新模板选择器
    updateTemplateSelector() {
      const selector = document.getElementById('canvas-template-selector');
      if (!selector) return; // 如果选择器不存在，则直接返回
      
      // 保留第一个选项（空选项）
      const firstOption = selector.options[0];
      selector.innerHTML = '';
      selector.appendChild(firstOption);
      
      // 添加模板选项
      for (const name in this.templates) {
        const option = document.createElement('option');
        option.value = name;
        option.textContent = name;
        selector.appendChild(option);
      }
    },
    
    // 保存当前设置为模板
    saveTemplate(name) {
      // 检查是否已存在同名模板
      if (this.templates[name] && !confirm(`模板"${name}"已存在，是否覆盖？`)) {
        return;
      }
      
      // 保存当前状态
      this.templates[name] = {
        canvasSize: { ...this.state.canvasSize },
        backgroundColor: this.state.backgroundColor,
        backgroundImage: this.state.backgroundImage,
        narrativePosition: { ...this.state.narrativePosition },
        wordlistPosition: { ...this.state.wordlistPosition }
      };
      
      // 保存到localStorage
      localStorage.setItem('image_composer_templates', JSON.stringify(this.templates));
      
      // 更新模板选择器
      this.updateTemplateSelector();
      
      // 显示成功消息
      this.showMessage(`模板"${name}"已保存`, 'success');
    },
    
    // 应用模板
    applyTemplate(name) {
      const template = this.templates[name];
      if (!template) {
        this.showMessage(`找不到模板"${name}"`, 'error');
        return;
      }
      
      // 应用模板设置
      this.state.canvasSize = { ...template.canvasSize };
      this.state.backgroundColor = template.backgroundColor;
      this.state.backgroundImage = template.backgroundImage;
      this.state.narrativePosition = { ...template.narrativePosition };
      this.state.wordlistPosition = { ...template.wordlistPosition };
      
      // 更新UI
      document.getElementById('canvas-width').value = template.canvasSize.width;
      document.getElementById('canvas-width-value').textContent = template.canvasSize.width;
      document.getElementById('canvas-height').value = template.canvasSize.height;
      document.getElementById('canvas-height-value').textContent = template.canvasSize.height;
      document.getElementById('background-color').value = template.backgroundColor;
      
      // 更新背景图片（如果有）
      if (template.backgroundImage) {
        document.getElementById('background-preview').src = template.backgroundImage;
        document.getElementById('background-preview').style.display = 'block';
        document.getElementById('remove-background').style.display = 'inline-block';
      } else {
        document.getElementById('background-preview').style.display = 'none';
        document.getElementById('remove-background').style.display = 'none';
      }
      
      // 更新预览
      this.updatePreview();
      
      // 显示成功消息
      this.showMessage(`已应用模板"${name}"`, 'success');
    },
    
    // 删除模板
    deleteTemplate(name) {
      if (!this.templates[name]) {
        this.showMessage(`找不到模板"${name}"`, 'error');
        return;
      }
      
      // 确认删除
      if (!confirm(`确认删除模板"${name}"？`)) {
        return;
      }
      
      // 删除模板
      delete this.templates[name];
      
      // 保存到localStorage
      localStorage.setItem('image_composer_templates', JSON.stringify(this.templates));
      
      // 更新模板选择器
      this.updateTemplateSelector();
      
      // 重置模板选择器
      document.getElementById('canvas-template-selector').value = '';
      
      // 显示成功消息
      this.showMessage(`模板"${name}"已删除`, 'success');
    },
    
    state: {
      // ... existing code ...
    },
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
  
  // 图片合成器 - 用于将内容放置在自定义背景或模板上
  const ImageComposer = {
    // 保存当前编辑状态
    state: {
      backgroundImage: null,
      narrativeImage: null,
      wordListImage: null,
      narrativePosition: { x: 50, y: 50, width: 300, height: 200 },
      wordListPosition: { x: 400, y: 50, width: 200, height: 200 },
      canvasSize: { width: 900, height: 600 },
      maintainAspectRatio: true
    },
    
    // 存储模板数据
    templates: {},
    
    // 定义标准纸张尺寸（像素）- 基于72dpi
    paperSizes: {
      'A0': { width: 3370, height: 4768 },
      'A1': { width: 2384, height: 3370 },
      'A2': { width: 1684, height: 2384 },
      'A3': { width: 1191, height: 1684 },
      'A4': { width: 842, height: 1191 },
      'A5': { width: 595, height: 842 },
      'A6': { width: 420, height: 595 },
      'B4': { width: 1000, height: 1414 },
      'B5': { width: 707, height: 1000 },
      'letter': { width: 816, height: 1056 },
      'legal': { width: 816, height: 1344 },
      'custom': { width: 800, height: 1000 }
    },
    
    // 存储用户自定义模板
    userTemplates: [],
    
    // 初始化合成编辑器
    init() {
      try {
        console.log("ImageComposer.init开始执行");
        
        // 以下是等比例缩放需要用到的初始值
        this.aspectRatio = {
          narrative: 1,
          wordlist: 1
        };
        
        // 初始化模板系统 - 直接调用本对象的方法
        this.initTemplates();
        
        // 初始化消息容器
        this.initMessageContainer();
        
        // 尝试从本地存储加载用户模板
        this.loadUserTemplates();
        
        // 判断是否需要初始化编辑器（只有当具体的合成页面时才需要）
        const isComposerPage = document.getElementById('preview-canvas') !== null;
        
        if (isComposerPage) {
          console.log("检测到合成页面，初始化编辑器组件");
          
          // 创建合成编辑器容器 
          this.createComposerContainer();
          
          // 初始化页面尺寸选择器
          this.initPaperSizeSelector();
          
          // 初始化等比例锁定
          this.initAspectRatioLock();
          
          // 初始化模板UI
          this.initTemplateUI();
          
          // 添加拖拽调整大小功能
          this.setupResizeHandles();
          
          // 初始化拖拽手柄
          this.initDragHandles();
          
          // 初始化拖拽事件
          this.initDragEvents();
          
          // 更新模板选择器
          this.updateTemplateSelector();
          
          // 初始化自定义模板选择框
          this.updateUserTemplateSelector();
          
          // 绑定事件
          this.bindEvents();
        } else {
          console.log("非合成页面，跳过编辑器组件初始化");
          
          // 只在store_img.html页面绑定合成按钮的点击事件
          const composeButton = document.getElementById('composeButton');
          if (composeButton) {
            console.log("检测到合成按钮，绑定跳转事件");
            composeButton.addEventListener('click', () => {
              this.showComposer();
            });
          }
        }
        
        console.log("ImageComposer.init执行完成");
    } catch (error) {
        console.error('初始化图片合成器时出错:', error);
      }
    },
    
    // 初始化模板
    initTemplates() {
      console.log("ImageComposer.initTemplates执行");
      // 从localStorage加载保存的模板
      try {
        const savedTemplates = localStorage.getItem('image_composer_templates');
        if (savedTemplates) {
          this.templates = JSON.parse(savedTemplates);
        } else {
          this.templates = {};
        }
      } catch (e) {
        console.error('Error loading templates:', e);
        this.templates = {};
      }
    },
    
    // 创建合成编辑器容器
    createComposerContainer() {
      // 检查是否已存在容器
      if (document.getElementById('image-composer-container')) {
        return;
      }
      
      const composerContainer = document.createElement('div');
      composerContainer.id = 'image-composer-container';
      composerContainer.className = 'composer-container';
      composerContainer.style.display = 'none';
      
      composerContainer.innerHTML = `
        <div class="composer-header">
          <h3>图片合成编辑器</h3>
          <button id="close-composer" class="btn secondary-btn">关闭</button>
        </div>
        
        <div class="composer-content">
          <div class="tools-panel">
            <div class="tool-section">
              <h4>画布设置</h4>
              <div class="paper-size-selector">
                <label>纸张尺寸:</label>
                <select id="paper-size-selector">
                  <option value="custom">自定义 (900 x 600)</option>
                  <option value="a4">A4 (595 x 842)</option>
                  <option value="a5">A5 (420 x 595)</option>
                  <option value="b4">B4 (708 x 1000)</option>
                  <option value="b5">B5 (498 x 708)</option>
                  <option value="a0">A0 (2384 x 3370)</option>
                  <option value="screen">屏幕比例 (1200 x 675)</option>
                  <option value="square">正方形 (800 x 800)</option>
                </select>
              </div>
              <div class="size-controls">
                <div>
                  <label>宽度: <span id="canvas-width-value">900</span>px</label>
                  <input type="range" id="canvas-width" min="300" max="3000" value="900">
                </div>
                <div>
                  <label>高度: <span id="canvas-height-value">600</span>px</label>
                  <input type="range" id="canvas-height" min="300" max="3000" value="600">
                </div>
              </div>
            </div>
            
            <div class="tool-section">
              <h4>背景设置</h4>
              <button id="upload-background" class="btn">上传背景图片</button>
              <div class="color-picker-container">
                <label>背景颜色:</label>
                <input type="color" id="background-color" value="#ffffff">
              </div>
              <div class="template-selector">
                <span>选择模板:</span>
                <select id="template-selector">
                  <option value="">无模板</option>
                  <option value="template1">简约模板</option>
                  <option value="template2">教育模板</option>
                  <option value="template3">专业模板</option>
                </select>
              </div>
            </div>
            
            <div class="tool-section">
              <h4>情境文本</h4>
              <label>
                <input type="checkbox" id="show-narrative" checked>
                显示情境文本
              </label>
              <label>
                <input type="checkbox" id="narrative-keep-ratio" checked>
                保持比例
              </label>
              <div class="position-controls">
                <div>
                  <label>X位置: <span id="narrative-x-value">50</span>px</label>
                  <input type="range" id="narrative-x" min="0" max="2000" value="50">
                </div>
                <div>
                  <label>Y位置: <span id="narrative-y-value">50</span>px</label>
                  <input type="range" id="narrative-y" min="0" max="2000" value="50">
                </div>
                <div>
                  <label>宽度: <span id="narrative-width-value">300</span>px</label>
                  <input type="range" id="narrative-width" min="50" max="2000" value="300">
                </div>
                <div>
                  <label>高度: <span id="narrative-height-value">200</span>px</label>
                  <input type="range" id="narrative-height" min="50" max="2000" value="200">
                </div>
              </div>
            </div>
            
            <div class="tool-section">
              <h4>单词列表</h4>
              <label>
                <input type="checkbox" id="show-wordlist" checked>
                显示单词列表
              </label>
              <label>
                <input type="checkbox" id="wordlist-keep-ratio" checked>
                保持比例
              </label>
              <div class="position-controls">
                <div>
                  <label>X位置: <span id="wordlist-x-value">400</span>px</label>
                  <input type="range" id="wordlist-x" min="0" max="2000" value="400">
                </div>
                <div>
                  <label>Y位置: <span id="wordlist-y-value">50</span>px</label>
                  <input type="range" id="wordlist-y" min="0" max="2000" value="50">
                </div>
                <div>
                  <label>宽度: <span id="wordlist-width-value">200</span>px</label>
                  <input type="range" id="wordlist-width" min="50" max="2000" value="200">
                </div>
                <div>
                  <label>高度: <span id="wordlist-height-value">200</span>px</label>
                  <input type="range" id="wordlist-height" min="50" max="2000" value="200">
                </div>
              </div>
            </div>
            
            <div class="tool-section">
              <h4>保存模板</h4>
              <div class="template-save">
                <input type="text" id="template-name" placeholder="输入模板名称">
                <button id="save-template" class="btn">保存当前设置</button>
              </div>
              <div class="saved-templates">
                <label>自定义模板:</label>
                <select id="user-template-selector">
                  <option value="">选择已保存模板</option>
                </select>
                <button id="delete-template" class="btn secondary-btn">删除模板</button>
              </div>
            </div>
            
            <div class="actions">
              <button id="generate-composite" class="btn primary-btn">生成合成图片</button>
              <button id="download-composite" class="btn" disabled>下载合成图片</button>
            </div>
          </div>
          
          <div class="preview-panel">
            <div class="preview-canvas-container">
              <canvas id="preview-canvas" width="900" height="600"></canvas>
              <div id="narrative-handle" class="resize-handle"></div>
              <div id="wordlist-handle" class="resize-handle"></div>
            </div>
          </div>
        </div>
      `;
      
      document.body.appendChild(composerContainer);
      
      // 添加样式
      const style = document.createElement('style');
      style.textContent = `
        .composer-container {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-color: var(--bg-color);
          z-index: 1000;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        
        .composer-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 15px 20px;
          background-color: var(--card-bg);
          box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        }
        
        .composer-content {
          display: flex;
          flex: 1;
          overflow: hidden;
        }
        
        .tools-panel {
          width: 300px;
          padding: 15px;
          background-color: var(--card-bg);
          overflow-y: auto;
          box-shadow: 2px 0 5px rgba(0,0,0,0.05);
        }
        
        .preview-panel {
          flex: 1;
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 20px;
          overflow: auto;
        }
        
        .preview-canvas-container {
          position: relative;
          box-shadow: 0 0 15px rgba(0,0,0,0.1);
        }
        
        #preview-canvas {
          background-color: white;
          max-width: 100%;
          height: auto;
        }
        
        .tool-section {
          margin-bottom: 20px;
          padding-bottom: 20px;
          border-bottom: 1px solid var(--border-color);
        }
        
        .tool-section h4 {
          margin-top: 0;
          margin-bottom: 15px;
          color: var(--text-color);
        }
        
        .position-controls > div {
          margin-bottom: 10px;
        }
        
        .position-controls label {
          display: block;
          margin-bottom: 5px;
        }
        
        .position-controls input[type="range"] {
          width: 100%;
        }
        
        .resize-handles {
          position: absolute;
          border: 2px dashed rgba(78, 205, 196, 0.8);
          pointer-events: none;
        }
        
        .position-handle {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          cursor: move;
          background-color: rgba(78, 205, 196, 0.1);
          pointer-events: auto;
        }
        
        .resize-handle {
          position: absolute;
          right: -10px;
          bottom: -10px;
          width: 20px;
          height: 20px;
          background-color: #4ecdc4;
          border-radius: 50%;
          cursor: nwse-resize;
          pointer-events: auto;
        }
        
        /* 深色模式样式 */
        [data-theme="dark"] .composer-container {
          background-color: var(--bg-color);
        }
        
        [data-theme="dark"] .composer-header,
        [data-theme="dark"] .tools-panel {
          background-color: var(--card-bg);
        }
        
        [data-theme="dark"] #preview-canvas {
          background-color: #333;
        }
      `;
      document.head.appendChild(style);
    },
    
    // 初始化消息容器
    initMessageContainer() {
      // 检查是否已经存在消息容器
      let messageContainer = document.getElementById('message-container');
      
      if (!messageContainer) {
        // 创建消息容器
        messageContainer = document.createElement('div');
        messageContainer.id = 'message-container';
        messageContainer.className = 'message-container';
        
        // 添加到body
        document.body.appendChild(messageContainer);
      }
      
      return messageContainer;
    },
    
    // 加载用户模板
    loadUserTemplates() {
      try {
        const savedTemplates = localStorage.getItem('userCompositionTemplates');
        if (savedTemplates) {
          this.userTemplates = JSON.parse(savedTemplates);
        }
      } catch (error) {
        console.error('加载用户模板失败:', error);
        this.userTemplates = [];
      }
    },
    
    // 保存用户模板
    saveUserTemplate(name) {
      if (!name || name.trim() === '') {
        UIManager.showErrorMessage('请输入模板名称', 2000);
        return;
      }
      
      // 检查是否已存在同名模板
      const existingIndex = this.userTemplates.findIndex(t => t.name === name);
      
      const template = {
        name: name,
        canvasSize: { ...this.state.canvasSize },
        narrativePosition: { ...this.state.narrativePosition },
        wordListPosition: { ...this.state.wordListPosition },
        backgroundColor: document.getElementById('background-color').value
      };
      
      if (existingIndex >= 0) {
        // 更新现有模板
        this.userTemplates[existingIndex] = template;
        UIManager.showSuccessMessage(`模板"${name}"已更新`, 2000);
      } else {
        // 添加新模板
        this.userTemplates.push(template);
        UIManager.showSuccessMessage(`模板"${name}"已保存`, 2000);
      }
      
      // 保存到本地存储
      try {
        localStorage.setItem('userCompositionTemplates', JSON.stringify(this.userTemplates));
        this.updateUserTemplateSelector();
      } catch (error) {
        console.error('保存模板失败:', error);
        UIManager.showErrorMessage('保存模板失败', 2000);
      }
    },
    
    // 删除用户模板
    deleteUserTemplate(name) {
      const index = this.userTemplates.findIndex(t => t.name === name);
      if (index >= 0) {
        this.userTemplates.splice(index, 1);
        localStorage.setItem('userCompositionTemplates', JSON.stringify(this.userTemplates));
        this.updateUserTemplateSelector();
        UIManager.showSuccessMessage(`模板"${name}"已删除`, 2000);
      }
    },
    
    // 更新用户模板选择器
    updateUserTemplateSelector() {
      const selector = document.getElementById('user-template-selector');
      if (!selector) return;
      
      // 清除现有选项
      while (selector.options.length > 1) {
        selector.remove(1);
      }
      
      // 添加用户模板
      this.userTemplates.forEach(template => {
        const option = document.createElement('option');
        option.value = template.name;
        option.textContent = template.name;
        selector.appendChild(option);
      });
    },
    
    // 应用用户模板
    applyUserTemplate(name) {
      const template = this.userTemplates.find(t => t.name === name);
      if (!template) return;
      
      // 更新画布尺寸
      this.state.canvasSize = { ...template.canvasSize };
      this.updateCanvasSize();
      this.updateSliderUI('canvas-width', 'canvas-width-value', template.canvasSize.width);
      this.updateSliderUI('canvas-height', 'canvas-height-value', template.canvasSize.height);
      
      // 更新元素位置
      this.state.narrativePosition = { ...template.narrativePosition };
      this.state.wordListPosition = { ...template.wordListPosition };
      
      // 更新位置滑块
      this.updateSliderUI('narrative-x', 'narrative-x-value', template.narrativePosition.x);
      this.updateSliderUI('narrative-y', 'narrative-y-value', template.narrativePosition.y);
      this.updateSliderUI('narrative-width', 'narrative-width-value', template.narrativePosition.width);
      this.updateSliderUI('narrative-height', 'narrative-height-value', template.narrativePosition.height);
      
      this.updateSliderUI('wordlist-x', 'wordlist-x-value', template.wordListPosition.x);
      this.updateSliderUI('wordlist-y', 'wordlist-y-value', template.wordListPosition.y);
      this.updateSliderUI('wordlist-width', 'wordlist-width-value', template.wordListPosition.width);
      this.updateSliderUI('wordlist-height', 'wordlist-height-value', template.wordListPosition.height);
      
      // 更新背景颜色
      document.getElementById('background-color').value = template.backgroundColor || '#ffffff';
      
      // 更新预览
      this.updatePreview();
      
      UIManager.showSuccessMessage(`已应用模板"${name}"`, 2000);
    },
    
    // 设置拖拽调整大小功能
    setupResizeHandles() {
      const narrativeHandle = document.getElementById('narrative-handle');
      const wordlistHandle = document.getElementById('wordlist-handle');
      const canvas = document.getElementById('preview-canvas');
      
      if (!narrativeHandle || !wordlistHandle || !canvas) return;
      
      // 更新手柄位置
      this.updateHandlePositions();
      
      // 拖拽调整情境文本大小
      this.setupDragResize(narrativeHandle, 'narrativePosition');
      
      // 拖拽调整单词列表大小
      this.setupDragResize(wordlistHandle, 'wordListPosition');
    },
    
    // 设置拖拽调整大小
    setupDragResize(handle, positionKey) {
      if (!handle) return;
      
      const canvas = document.getElementById('preview-canvas');
      const canvasContainer = document.querySelector('.preview-canvas-container');
      
      let startX, startY, startWidth, startHeight;
      let aspectRatio;
      
      const onMouseDown = (e) => {
        e.preventDefault();
        
        // 获取初始位置和尺寸
        startX = e.clientX;
        startY = e.clientY;
        startWidth = this.state[positionKey].width;
        startHeight = this.state[positionKey].height;
        aspectRatio = startWidth / startHeight;
        
        // 添加鼠标移动和松开事件
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
        
        // 触摸事件支持
        document.addEventListener('touchmove', touchMove, { passive: false });
        document.addEventListener('touchend', onMouseUp);
        
        // 显示调整大小时的视觉提示
        handle.style.backgroundColor = '#ff9800';
      };
      
      const onMouseMove = (e) => {
        e.preventDefault();
        
        // 计算鼠标移动距离
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        
        // 获取canvas的缩放比例
        const rect = canvasContainer.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        
        // 计算新的宽度和高度
        let newWidth = startWidth + dx * scaleX;
        let newHeight = startHeight + dy * scaleY;
        
        // 如果保持比例，则根据纵横比调整尺寸
        const keepRatio = document.getElementById(`${positionKey === 'narrativePosition' ? 'narrative' : 'wordlist'}-keep-ratio`).checked;
        if (keepRatio) {
          if (Math.abs(dx) > Math.abs(dy)) {
            newHeight = newWidth / aspectRatio;
          } else {
            newWidth = newHeight * aspectRatio;
          }
        }
        
        // 设置最小尺寸
        newWidth = Math.max(50, newWidth);
        newHeight = Math.max(50, newHeight);
        
        // 更新状态
        this.state[positionKey].width = newWidth;
        this.state[positionKey].height = newHeight;
        
        // 更新UI
        this.updateSliderUI(
          `${positionKey === 'narrativePosition' ? 'narrative' : 'wordlist'}-width`, 
          `${positionKey === 'narrativePosition' ? 'narrative' : 'wordlist'}-width-value`, 
          Math.round(newWidth)
        );
        this.updateSliderUI(
          `${positionKey === 'narrativePosition' ? 'narrative' : 'wordlist'}-height`, 
          `${positionKey === 'narrativePosition' ? 'narrative' : 'wordlist'}-height-value`, 
          Math.round(newHeight)
        );
        
        // 更新预览和手柄位置
        this.updatePreview();
        this.updateHandlePositions();
      };
      
      const onMouseUp = () => {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        document.removeEventListener('touchmove', touchMove);
        document.removeEventListener('touchend', onMouseUp);
        handle.style.backgroundColor = '#4ecdc4';
      };
      
      // 触摸移动事件
      const touchMove = (e) => {
        e.preventDefault();
        if (e.touches.length > 0) {
          const touch = e.touches[0];
          const mockEvent = {
            clientX: touch.clientX,
            clientY: touch.clientY,
            preventDefault: () => {}
          };
          onMouseMove(mockEvent);
        }
      };
      
      handle.addEventListener('mousedown', onMouseDown);
      handle.addEventListener('touchstart', (e) => {
        if (e.touches.length > 0) {
          const touch = e.touches[0];
          const mockEvent = {
            clientX: touch.clientX,
            clientY: touch.clientY,
            preventDefault: () => {}
          };
          onMouseDown(mockEvent);
        }
      }, { passive: false });
    },
    
    // 更新手柄位置
    updateHandlePositions() {
      const canvas = document.getElementById('preview-canvas');
      // 检查canvas元素是否存在
      if (!canvas) {
        console.error('未找到预览画布元素');
        return;
      }

      const narrativeHandles = document.getElementById('narrative-handles');
      const wordlistHandles = document.getElementById('wordlist-handles');
      
      // 获取画布的实际尺寸和显示尺寸，计算正确的缩放比例
      const canvasRect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / canvasRect.width;
      const scaleY = canvas.height / canvasRect.height;
      
      // 检查narrativeHandles元素是否存在
      if (narrativeHandles && document.getElementById('show-narrative')?.checked) {
        narrativeHandles.style.display = 'block';
        const { x, y, width, height } = this.state.narrativePosition;
        
        // 使用缩放后的坐标，无需额外偏移，因为已经是容器的相对位置
        narrativeHandles.style.left = `${x / scaleX}px`;
        narrativeHandles.style.top = `${y / scaleY}px`;
        narrativeHandles.style.width = `${width / scaleX}px`;
        narrativeHandles.style.height = `${height / scaleY}px`;
      } else if (narrativeHandles) {
        narrativeHandles.style.display = 'none';
      }

      // 检查wordlistHandles元素是否存在
      if (wordlistHandles && document.getElementById('show-wordlist')?.checked) {
        wordlistHandles.style.display = 'block';
        const { x, y, width, height } = this.state.wordListPosition;
        
        // 使用缩放后的坐标，无需额外偏移，因为已经是容器的相对位置
        wordlistHandles.style.left = `${x / scaleX}px`;
        wordlistHandles.style.top = `${y / scaleY}px`;
        wordlistHandles.style.width = `${width / scaleX}px`;
        wordlistHandles.style.height = `${height / scaleY}px`;
      } else if (wordlistHandles) {
        wordlistHandles.style.display = 'none';
      }
    },
    
    // 更新画布尺寸
    updateCanvasSize() {
      const canvas = document.getElementById('preview-canvas');
      if (canvas) {
        canvas.width = this.state.canvasSize.width;
        canvas.height = this.state.canvasSize.height;
        
        // 限制最大宽度，保持在可视范围内
        const maxWidth = window.innerWidth * 0.7;
        if (canvas.width > maxWidth) {
          canvas.style.width = maxWidth + 'px';
          canvas.style.height = (maxWidth * canvas.height / canvas.width) + 'px';
        } else {
          canvas.style.width = '';
          canvas.style.height = '';
        }
        
        // 更新预览
        this.updatePreview();
      }
    },
    
    // 更新滑块UI
    updateSliderUI(sliderId, valueId, value) {
      const slider = document.getElementById(sliderId);
      const valueDisplay = document.getElementById(valueId);
      
      if (slider && valueDisplay) {
        slider.value = value;
        valueDisplay.textContent = value;
      }
    },
    
    // 渲染最终合成图片
    renderFinalComposite() {
      const canvas = document.getElementById('preview-canvas');
      if (!canvas) return;
      
      const ctx = canvas.getContext('2d');
      
      // 清除画布
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // 填充背景颜色
      const backgroundColor = document.getElementById('background-color')?.value || '#ffffff';
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // 绘制背景图片
      if (this.state.backgroundImage) {
        ctx.drawImage(this.state.backgroundImage, 0, 0, canvas.width, canvas.height);
      }
      
      // 如果选择显示叙述文本，则绘制
      if (document.getElementById('show-narrative')?.checked) {
        ctx.drawImage(
          this.state.narrativeImage, 
          this.state.narrativePosition.x, 
          this.state.narrativePosition.y,
          this.state.narrativePosition.width,
          this.state.narrativePosition.height
        );
      }
      
      // 如果选择显示单词列表，则绘制
      if (document.getElementById('show-wordlist')?.checked) {
        ctx.drawImage(
          this.state.wordListImage,
          this.state.wordListPosition.x,
          this.state.wordListPosition.y,
          this.state.wordListPosition.width,
          this.state.wordListPosition.height
        );
      }
      
      // 启用下载按钮
      const downloadButton = document.getElementById('download-composite');
      if (downloadButton) {
        downloadButton.disabled = false;
      }
      
      // 显示成功消息
      this.showMessage('已生成合成图片', 'success');
    },
    
    // 下载合成图片
    downloadComposite() {
      const canvas = document.getElementById('preview-canvas');
      if (!canvas) return;
      
      // 创建下载链接
                    const link = document.createElement('a');
      link.href = canvas.toDataURL('image/png');
      link.download = '单词学习合成图片.png';
      
      // 触发下载
      document.body.appendChild(link);
                    link.click();
      document.body.removeChild(link);
      
      // 显示成功消息
      this.showMessage('已下载合成图片', 'success');
    },
    
    // 绑定合成编辑器的事件
    bindEvents() {
      // 关闭按钮
      document.getElementById('close-composer').addEventListener('click', () => {
        this.hideComposer();
      });
      
      // 纸张尺寸选择
      document.getElementById('paper-size-selector').addEventListener('change', (e) => {
        const paperSizeKey = e.target.value;
        if (paperSizeKey && this.paperSizes[paperSizeKey]) {
          const paperSize = this.paperSizes[paperSizeKey];
          this.state.canvasSize.width = paperSize.width;
          this.state.canvasSize.height = paperSize.height;
          
          // 更新滑块UI
          this.updateSliderUI('canvas-width', 'canvas-width-value', paperSize.width);
          this.updateSliderUI('canvas-height', 'canvas-height-value', paperSize.height);
          
          // 更新画布尺寸
          this.updateCanvasSize();
          UIManager.showSuccessMessage(`已设置为${paperSize.name}尺寸`, 1500);
        }
      });
      
      // 画布尺寸滑块
      document.getElementById('canvas-width').addEventListener('input', (e) => {
        const width = parseInt(e.target.value);
        document.getElementById('canvas-width-value').textContent = width;
        this.state.canvasSize.width = width;
        this.updateCanvasSize();
        
        // 更新选择框为自定义
        document.getElementById('paper-size-selector').value = 'custom';
      });
      
      document.getElementById('canvas-height').addEventListener('input', (e) => {
        const height = parseInt(e.target.value);
        document.getElementById('canvas-height-value').textContent = height;
        this.state.canvasSize.height = height;
        this.updateCanvasSize();
        
        // 更新选择框为自定义
        document.getElementById('paper-size-selector').value = 'custom';
      });
      
      // 背景颜色选择
      document.getElementById('background-color').addEventListener('input', (e) => {
        this.updatePreview();
      });
      
      // 上传背景图片
      document.getElementById('upload-background').addEventListener('click', () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = (e) => {
          const file = e.target.files[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
              const img = new Image();
              img.onload = () => {
                this.state.backgroundImage = img;
                this.updatePreview();
              };
              img.src = event.target.result;
            };
            reader.readAsDataURL(file);
          }
        };
        input.click();
      });
      
      // 模板选择
      document.getElementById('template-selector').addEventListener('change', (e) => {
        const template = e.target.value;
        if (template) {
          this.loadTemplate(template);
        } else {
          this.state.backgroundImage = null;
          this.updatePreview();
        }
      });
      
      // 画布模板选择器（由initTemplateUI添加）
      const canvasTemplateSelector = document.getElementById('canvas-template-selector');
      if (canvasTemplateSelector) {
        canvasTemplateSelector.addEventListener('change', (e) => {
          const templateName = e.target.value;
          if (templateName) {
            this.applyTemplate(templateName);
          }
        });
      }
      
      // 显示/隐藏组件
      document.getElementById('show-narrative').addEventListener('change', (e) => {
        this.updatePreview();
        this.updateHandlePositions();
      });
      
      document.getElementById('show-wordlist').addEventListener('change', (e) => {
        this.updatePreview();
        this.updateHandlePositions();
      });
      
      // 保持比例复选框
      document.getElementById('narrative-keep-ratio').addEventListener('change', (e) => {
        // 无需立即操作，在拖拽时生效
      });
      
      document.getElementById('wordlist-keep-ratio').addEventListener('change', (e) => {
        // 无需立即操作，在拖拽时生效
      });
      
      // 保存模板按钮
      document.getElementById('save-template').addEventListener('click', () => {
        const templateName = document.getElementById('template-name').value.trim();
        if (templateName) {
          this.saveUserTemplate(templateName);
        } else {
          UIManager.showErrorMessage('请输入模板名称', 2000);
        }
      });
      
      // 用户模板选择
      document.getElementById('user-template-selector').addEventListener('change', (e) => {
        const templateName = e.target.value;
        if (templateName) {
          this.applyUserTemplate(templateName);
        }
      });
      
      // 删除模板按钮
      document.getElementById('delete-template').addEventListener('click', () => {
        const selector = document.getElementById('user-template-selector');
        const templateName = selector.value;
        if (templateName) {
          if (confirm(`确定要删除模板"${templateName}"吗？`)) {
            this.deleteUserTemplate(templateName);
          }
        } else {
          UIManager.showErrorMessage('请选择要删除的模板', 2000);
        }
      });
      
      // 位置和尺寸滑块
      const updateSliderValue = (sliderId, valueId, property, positionKey) => {
        const slider = document.getElementById(sliderId);
        const valueDisplay = document.getElementById(valueId);
        
        slider.addEventListener('input', (e) => {
          const value = e.target.value;
          valueDisplay.textContent = value;
          this.state[positionKey][property] = parseInt(value);
          this.updatePreview();
          this.updateHandlePositions();
        });
      };
      
      // 更新情境文本位置和尺寸
      updateSliderValue('narrative-x', 'narrative-x-value', 'x', 'narrativePosition');
      updateSliderValue('narrative-y', 'narrative-y-value', 'y', 'narrativePosition');
      updateSliderValue('narrative-width', 'narrative-width-value', 'width', 'narrativePosition');
      updateSliderValue('narrative-height', 'narrative-height-value', 'height', 'narrativePosition');
      
      // 更新单词列表位置和尺寸
      updateSliderValue('wordlist-x', 'wordlist-x-value', 'x', 'wordListPosition');
      updateSliderValue('wordlist-y', 'wordlist-y-value', 'y', 'wordListPosition');
      updateSliderValue('wordlist-width', 'wordlist-width-value', 'width', 'wordListPosition');
      updateSliderValue('wordlist-height', 'wordlist-height-value', 'height', 'wordListPosition');
      
      // 生成合成图片
      document.getElementById('generate-composite').addEventListener('click', () => {
        this.renderFinalComposite();
      });
      
      // 下载合成图片
      document.getElementById('download-composite').addEventListener('click', () => {
        this.downloadComposite();
      });
      
      // 监听窗口大小变化，更新拖拽手柄位置
      window.addEventListener('resize', () => {
        this.updateHandlePositions();
      });
    },
    
    // 加载模板
    loadTemplate(templateName) {
      const template = this.userTemplates.find(t => t.name === templateName);
      if (template) {
        this.state.backgroundImage = new Image();
        this.state.backgroundImage.src = template.backgroundImage;
        this.updatePreview();
      }
    },
    
    // 隐藏合成编辑器
    hideComposer() {
      const composerContainer = document.getElementById('image-composer-container');
      if (composerContainer) {
        composerContainer.style.display = 'none';
      }
    },
    
    // 更新预览
    updatePreview() {
      console.log('执行updatePreview');
      const canvas = document.getElementById('preview-canvas');
      if (!canvas) {
        console.log('未找到preview-canvas元素');
        return;
      }
      
      // 设置画布尺寸
      canvas.width = this.state.canvasSize.width;
      canvas.height = this.state.canvasSize.height;
      
      // 限制最大宽度，保持在可视范围内
      const maxWidth = window.innerWidth * 0.7;
      if (canvas.width > maxWidth) {
        canvas.style.width = maxWidth + 'px';
        canvas.style.height = (maxWidth * canvas.height / canvas.width) + 'px';
      } else {
        canvas.style.width = '';
        canvas.style.height = '';
      }
      
      // 获取2D上下文
      const ctx = canvas.getContext('2d');
      
      // 清除画布
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // 填充背景颜色
      const backgroundColor = document.getElementById('background-color')?.value || '#ffffff';
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // 绘制背景图片(如果有)
      if (this.state.backgroundImage && this.state.backgroundImage.complete) {
        ctx.drawImage(this.state.backgroundImage, 0, 0, canvas.width, canvas.height);
      }
      
      // 绘制叙述文本(如果有且应该显示)
      const showNarrative = document.getElementById('show-narrative');
      if (this.state.narrativeImage && (!showNarrative || showNarrative.checked)) {
        ctx.drawImage(
          this.state.narrativeImage,
          this.state.narrativePosition.x,
          this.state.narrativePosition.y,
          this.state.narrativePosition.width,
          this.state.narrativePosition.height
        );
      }
      
      // 绘制单词列表(如果有且应该显示)
      const showWordlist = document.getElementById('show-wordlist');
      if (this.state.wordListImage && (!showWordlist || showWordlist.checked)) {
        ctx.drawImage(
          this.state.wordListImage,
          this.state.wordListPosition.x,
          this.state.wordListPosition.y,
          this.state.wordListPosition.width,
          this.state.wordListPosition.height
        );
      }
      
      // 更新拖拽手柄位置
      if (typeof this.updateHandlePositions === 'function') {
        try {
          this.updateHandlePositions();
        } catch (error) {
          console.error('更新拖拽手柄位置时出错:', error);
        }
      }
    },
    
    // 初始化页面尺寸选择器
    initPaperSizeSelector() {
      try {
        console.log('执行initPaperSizeSelector');
        
        // 检查必要元素是否存在
        const container = document.getElementById('image-composer-container');
        if (!container) {
          console.log('未找到image-composer-container，跳过初始化尺寸选择器');
          return;
        }
        
        // 检查是否已经存在尺寸选择器
        if (document.getElementById('paper-size')) {
          console.log('尺寸选择器已存在，跳过初始化');
          return;
        }
        
        // 创建尺寸选择器容器
        const sizeSelector = document.createElement('div');
        sizeSelector.className = 'form-group paper-size-selector';
        sizeSelector.innerHTML = `
          <label for="paper-size">纸张尺寸：</label>
          <select id="paper-size" class="form-control">
            <option value="custom">自定义</option>
          </select>
        `;
        
        // 查找尺寸表单组
        const dimensionsGroup = document.querySelector('.dimensions-group');
        if (!dimensionsGroup) {
          // 如果找不到尺寸表单组，则创建一个并添加到工具面板
          const toolsPanel = container.querySelector('.tools-panel');
          if (!toolsPanel) {
            console.log('未找到工具面板，无法添加尺寸选择器');
            return;
          }
          
          // 创建尺寸表单组
          const newDimensionsGroup = document.createElement('div');
          newDimensionsGroup.className = 'dimensions-group form-group';
          
          // 添加到工具面板的首部
          if (toolsPanel.firstChild) {
            toolsPanel.insertBefore(newDimensionsGroup, toolsPanel.firstChild);
          } else {
            toolsPanel.appendChild(newDimensionsGroup);
          }
          
          // 添加尺寸选择器到新创建的表单组前面
          toolsPanel.insertBefore(sizeSelector, newDimensionsGroup);
        } else {
          // 将尺寸选择器添加到已存在的尺寸表单组的前面
          dimensionsGroup.parentNode.insertBefore(sizeSelector, dimensionsGroup);
        }
        
        // 获取选择器DOM元素
        const paperSizeSelect = document.getElementById('paper-size');
        if (!paperSizeSelect) {
          console.log('尺寸选择器创建失败');
          return;
        }
        
        // 添加尺寸选项
        for (const [name, size] of Object.entries(this.paperSizes)) {
          if (name === 'custom') continue; // 跳过自定义选项，因为已经添加了
          
          const option = document.createElement('option');
          option.value = name;
          option.textContent = `${name} (${size.width}×${size.height})`;
          paperSizeSelect.appendChild(option);
        }
        
        // 获取宽高输入框和值显示元素
        const canvasWidth = document.getElementById('canvas-width');
        const canvasHeight = document.getElementById('canvas-height');
        const widthValue = document.getElementById('canvas-width-value');
        const heightValue = document.getElementById('canvas-height-value');
        
        // 如果找不到必要元素，则退出
        if (!canvasWidth || !canvasHeight || !widthValue || !heightValue) {
          console.log('未找到画布尺寸输入框或值显示元素');
          return;
        }
        
        // 设置默认值
        paperSizeSelect.value = 'A4';
        const defaultSize = this.paperSizes['A4'];
        canvasWidth.value = defaultSize.width;
        widthValue.textContent = defaultSize.width;
        canvasHeight.value = defaultSize.height;
        heightValue.textContent = defaultSize.height;
        
        // 更新状态
        this.state.canvasSize = {
          width: defaultSize.width,
          height: defaultSize.height
        };
        
        // 处理尺寸变更
        paperSizeSelect.addEventListener('change', () => {
          const selectedSize = paperSizeSelect.value;
          
          if (selectedSize === 'custom') {
            // 不更改当前尺寸，允许用户自定义
            return;
          }
          
          // 获取选中的尺寸
          const size = this.paperSizes[selectedSize];
          if (!size) return;
          
          // 更新画布尺寸输入框
          canvasWidth.value = size.width;
          widthValue.textContent = size.width;
          canvasHeight.value = size.height;
          heightValue.textContent = size.height;
          
          // 更新状态
          this.state.canvasSize = {
            width: size.width,
            height: size.height
          };
          
          // 更新预览
          this.updatePreview();
        });
        
        console.log('尺寸选择器初始化完成');
      } catch (error) {
        console.error('初始化尺寸选择器出错:', error);
      }
    },
    
    // 初始化等比例缩放
    initAspectRatioLock() {
      // 添加锁定比例的复选框
      const lockRatioCheckbox = document.createElement('div');
      lockRatioCheckbox.className = 'form-group lock-ratio-group';
      lockRatioCheckbox.innerHTML = `
        <label>
          <input type="checkbox" id="lock-aspect-ratio"> 
          锁定宽高比
        </label>
      `;
      
      // 添加到尺寸组后面
      const dimensionsGroup = document.querySelector('.dimensions-group');
      dimensionsGroup.parentNode.insertBefore(lockRatioCheckbox, dimensionsGroup.nextSibling);
      
      // 获取宽高输入框
      const widthInput = document.getElementById('canvas-width');
      const heightInput = document.getElementById('canvas-height');
      const ratioCheckbox = document.getElementById('lock-aspect-ratio');
      
      // 初始宽高比
      let aspectRatio = this.state.canvasSize.width / this.state.canvasSize.height;
      
      // 宽度变化时，按比例调整高度
      widthInput.addEventListener('input', () => {
        if (ratioCheckbox.checked) {
          const width = parseInt(widthInput.value, 10);
          const newHeight = Math.round(width / aspectRatio);
          
          heightInput.value = newHeight;
          document.getElementById('canvas-height-value').textContent = newHeight;
          
          // 更新状态
          this.state.canvasSize.height = newHeight;
          
          // 更新预览
          this.updatePreview();
        }
      });
      
      // 高度变化时，按比例调整宽度
      heightInput.addEventListener('input', () => {
        if (ratioCheckbox.checked) {
          const height = parseInt(heightInput.value, 10);
          const newWidth = Math.round(height * aspectRatio);
          
          widthInput.value = newWidth;
          document.getElementById('canvas-width-value').textContent = newWidth;
          
          // 更新状态
          this.state.canvasSize.width = newWidth;
          
          // 更新预览
          this.updatePreview();
        }
      });
      
      // 锁定/解锁比例时，更新当前比例
      ratioCheckbox.addEventListener('change', () => {
        if (ratioCheckbox.checked) {
          aspectRatio = this.state.canvasSize.width / this.state.canvasSize.height;
        }
      });
    },
    
    // 初始化模板UI
    initTemplateUI() {
      try {
        console.log("初始化模板UI");
        
        // 检查是否已存在模板UI
        if (document.getElementById('template-controls')) {
          console.log("模板UI已存在，跳过初始化");
          return;
        }
        
        // 修复：优先查找工具面板容器，如果不存在则创建一个
        let toolsPanel = document.querySelector('.tools-panel');
        if (!toolsPanel) {
          console.log("未找到工具面板容器，创建新容器");
          // 创建一个新的工具面板容器
          const mainContainer = document.querySelector('.composer-container') || document.querySelector('main') || document.body;
          const newToolsPanel = document.createElement('div');
          newToolsPanel.className = 'tools-panel';
          mainContainer.appendChild(newToolsPanel);
          toolsPanel = newToolsPanel;
        }
        
        // 存储工具面板引用
        this._toolsPanel = toolsPanel;
        
        // 创建模板UI容器
        const templateUI = document.createElement('div');
        templateUI.id = 'template-controls';
        templateUI.className = 'template-controls tool-section';
        templateUI.innerHTML = `
          <h4>模板管理</h4>
          <div class="template-selector-controls">
            <select id="canvas-template-selector" class="form-control">
              <option value="">选择预设模板</option>
            </select>
            <button type="button" id="apply-canvas-template" class="btn">应用</button>
            <button type="button" id="delete-canvas-template" class="btn secondary-btn">删除</button>
          </div>
          <div class="template-save-controls">
            <input type="text" id="canvas-template-name" placeholder="输入模板名称">
            <button type="button" id="save-canvas-template" class="btn">保存当前设置</button>
          </div>
        `;
        
        // 添加到容器的末尾
        this._toolsPanel.appendChild(templateUI);
        
        // 更新模板选择器
        this.updateTemplateSelector();
        
        // 添加事件监听
        const applyButton = document.getElementById('apply-canvas-template');
        if (applyButton) {
          applyButton.addEventListener('click', () => {
            const selector = document.getElementById('canvas-template-selector');
            if (!selector) return;
            
            const selectedTemplate = selector.value;
            if (!selectedTemplate) {
              this.showMessage('请先选择一个模板', 'error');
              return;
            }
            
            this.applyTemplate(selectedTemplate);
          });
        }
        
        const saveButton = document.getElementById('save-canvas-template');
        if (saveButton) {
          saveButton.addEventListener('click', () => {
            const nameInput = document.getElementById('canvas-template-name');
            if (!nameInput) return;
            
            const templateName = nameInput.value.trim();
            if (!templateName) {
              this.showMessage('请输入模板名称', 'error');
              return;
            }
            
            this.saveTemplate(templateName);
            nameInput.value = ''; // 清空输入框
          });
        }
        
        const deleteButton = document.getElementById('delete-canvas-template');
        if (deleteButton) {
          deleteButton.addEventListener('click', () => {
            const selector = document.getElementById('canvas-template-selector');
            if (!selector) return;
            
            const selectedTemplate = selector.value;
            if (!selectedTemplate) {
              this.showMessage('请先选择一个模板', 'error');
              return;
            }
            
            this.deleteTemplate(selectedTemplate);
          });
        }
        
        // 初始化Canvas编辑面板
        this.initCanvasEditor();
        
        console.log("模板UI初始化完成");
      } catch (error) {
        console.error("初始化模板UI时出错:", error);
      }
    },
    
    // 初始化画布编辑器
    initCanvasEditor() {
      try {
        console.log("初始化画布编辑器");
        
        if (!this._toolsPanel) {
          console.error("工具面板不存在，无法初始化画布编辑器");
          return;
        }
        
        // 创建编辑器面板
        const editorPanel = document.createElement('div');
        editorPanel.id = 'canvas-editor';
        editorPanel.className = 'canvas-editor tool-section';
        
        editorPanel.innerHTML = `
          <h4>画布编辑器</h4>
          <div class="editor-actions">
            <button type="button" id="add-text" class="btn editor-btn">
              <i class="fa fa-font"></i> 添加文本
            </button>
            <button type="button" id="add-image" class="btn editor-btn">
              <i class="fa fa-image"></i> 添加图片
            </button>
            <button type="button" id="add-shape" class="btn editor-btn">
              <i class="fa fa-square-o"></i> 添加形状
            </button>
            <button type="button" id="change-background" class="btn editor-btn">
              <i class="fa fa-paint-brush"></i> 背景
            </button>
          </div>
          
          <div id="element-properties" class="element-properties" style="display: none;">
            <h5>元素属性</h5>
            <div class="property-group text-properties" style="display: none;">
              <textarea id="text-content" placeholder="输入文本内容"></textarea>
              <div class="property-row">
                <label>字体大小:</label>
                <input type="number" id="font-size" min="8" max="72" value="16">
              </div>
              <div class="property-row">
                <label>文本颜色:</label>
                <input type="color" id="text-color" value="#000000">
              </div>
              <div class="property-row alignment-controls">
                <label>对齐:</label>
                <button type="button" data-align="left" class="align-btn active"><i class="fa fa-align-left"></i></button>
                <button type="button" data-align="center" class="align-btn"><i class="fa fa-align-center"></i></button>
                <button type="button" data-align="right" class="align-btn"><i class="fa fa-align-right"></i></button>
              </div>
            </div>
            
            <div class="property-group shape-properties" style="display: none;">
              <div class="property-row">
                <label>形状:</label>
                <select id="shape-type">
                  <option value="rectangle">矩形</option>
                  <option value="circle">圆形</option>
                </select>
              </div>
              <div class="property-row">
                <label>边框宽度:</label>
                <input type="number" id="border-width" min="0" max="10" value="1">
              </div>
              <div class="property-row">
                <label>边框颜色:</label>
                <input type="color" id="border-color" value="#000000">
              </div>
              <div class="property-row">
                <label>背景颜色:</label>
                <input type="color" id="shape-bg-color" value="#ffffff">
              </div>
            </div>
            
            <div class="property-group common-properties">
              <div class="property-row">
                <label>透明度:</label>
                <input type="range" id="element-opacity" min="0" max="1" step="0.1" value="1">
              </div>
              <div class="property-row">
                <button type="button" id="bring-forward" class="btn small-btn">上移一层</button>
                <button type="button" id="send-backward" class="btn small-btn">下移一层</button>
              </div>
              <div class="property-row">
                <button type="button" id="delete-element" class="btn small-btn danger-btn">删除元素</button>
              </div>
            </div>
          </div>
        `;
        
        this._toolsPanel.appendChild(editorPanel);
        
        // 绑定编辑器事件
        this._bindEditorEvents();
        
      } catch (error) {
        console.error("初始化画布编辑器出错:", error);
      }
    },
    
    // 绑定编辑器事件
    _bindEditorEvents() {
      // 添加文本元素
      document.getElementById('add-text').addEventListener('click', () => {
        this._addElement('text');
      });
      
      // 添加图片元素
      document.getElementById('add-image').addEventListener('click', () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.style.display = 'none';
        
        input.addEventListener('change', (event) => {
          if (event.target.files && event.target.files[0]) {
            const file = event.target.files[0];
            const reader = new FileReader();
            
            reader.onload = (e) => {
              this._addElement('image', { src: e.target.result });
            };
            
            reader.readAsDataURL(file);
          }
          document.body.removeChild(input);
        });
        
        document.body.appendChild(input);
        input.click();
      });
      
      // 添加形状
      document.getElementById('add-shape').addEventListener('click', () => {
        this._addElement('shape');
      });
      
      // 更改背景
      document.getElementById('change-background').addEventListener('click', () => {
        const input = document.createElement('input');
        input.type = 'color';
        input.style.display = 'none';
        
        input.addEventListener('change', (event) => {
          const canvas = document.querySelector('.canvas-container');
          if (canvas) {
            canvas.style.backgroundColor = event.target.value;
          }
          document.body.removeChild(input);
        });
        
        document.body.appendChild(input);
        input.click();
      });
      
      // 文本内容更改
      const textContent = document.getElementById('text-content');
      textContent.addEventListener('input', () => {
        if (this._selectedElement && this._selectedElement.dataset.type === 'text') {
          this._selectedElement.textContent = textContent.value;
        }
      });
      
      // 字体大小更改
      document.getElementById('font-size').addEventListener('change', (event) => {
        if (this._selectedElement && this._selectedElement.dataset.type === 'text') {
          this._selectedElement.style.fontSize = `${event.target.value}px`;
        }
      });
      
      // 文本颜色更改
      document.getElementById('text-color').addEventListener('change', (event) => {
        if (this._selectedElement && this._selectedElement.dataset.type === 'text') {
          this._selectedElement.style.color = event.target.value;
        }
      });
      
      // 文本对齐
      document.querySelectorAll('.align-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          if (this._selectedElement && this._selectedElement.dataset.type === 'text') {
            // 移除所有按钮的active类
            document.querySelectorAll('.align-btn').forEach(b => b.classList.remove('active'));
            // 添加active类到当前按钮
            btn.classList.add('active');
            // 设置文本对齐
            this._selectedElement.style.textAlign = btn.dataset.align;
          }
        });
      });
      
      // 形状类型更改
      document.getElementById('shape-type').addEventListener('change', (event) => {
        if (this._selectedElement && this._selectedElement.dataset.type === 'shape') {
          this._selectedElement.dataset.shapetype = event.target.value;
          if (event.target.value === 'circle') {
            this._selectedElement.style.borderRadius = '50%';
          } else {
            this._selectedElement.style.borderRadius = '0';
          }
        }
      });
      
      // 边框宽度更改
      document.getElementById('border-width').addEventListener('change', (event) => {
        if (this._selectedElement && this._selectedElement.dataset.type === 'shape') {
          this._selectedElement.style.borderWidth = `${event.target.value}px`;
        }
      });
      
      // 边框颜色更改
      document.getElementById('border-color').addEventListener('change', (event) => {
        if (this._selectedElement && this._selectedElement.dataset.type === 'shape') {
          this._selectedElement.style.borderColor = event.target.value;
        }
      });
      
      // 形状背景颜色更改
      document.getElementById('shape-bg-color').addEventListener('change', (event) => {
        if (this._selectedElement && this._selectedElement.dataset.type === 'shape') {
          this._selectedElement.style.backgroundColor = event.target.value;
        }
      });
      
      // 元素透明度更改
      document.getElementById('element-opacity').addEventListener('input', (event) => {
        if (this._selectedElement) {
          this._selectedElement.style.opacity = event.target.value;
        }
      });
      
      // 上移一层
      document.getElementById('bring-forward').addEventListener('click', () => {
        if (this._selectedElement) {
          const zIndex = parseInt(this._selectedElement.style.zIndex || 0);
          this._selectedElement.style.zIndex = zIndex + 1;
        }
      });
      
      // 下移一层
      document.getElementById('send-backward').addEventListener('click', () => {
        if (this._selectedElement) {
          const zIndex = parseInt(this._selectedElement.style.zIndex || 0);
          this._selectedElement.style.zIndex = Math.max(0, zIndex - 1);
        }
      });
      
      // 删除元素
      document.getElementById('delete-element').addEventListener('click', () => {
        if (this._selectedElement) {
          this._selectedElement.parentNode.removeChild(this._selectedElement);
          this._selectedElement = null;
          this._hideElementProperties();
        }
      });
    },
    
    // 添加新元素到画布
    _addElement(type, options = {}) {
      const canvas = document.getElementById('preview-canvas-container');
      if (!canvas) {
        console.error("未找到画布容器");
        return;
      }
      
      let element;
      
      switch (type) {
        case 'text':
          element = document.createElement('div');
          element.dataset.type = 'text';
          element.className = 'canvas-element text-element';
          element.textContent = '双击编辑文本';
          element.style.fontSize = '16px';
          element.style.color = '#000000';
          element.style.position = 'absolute';
          element.style.minWidth = '100px';
          element.style.minHeight = '30px';
          element.style.left = '50px';
          element.style.top = '50px';
          element.style.cursor = 'move';
          
          // 双击编辑文本
          element.addEventListener('dblclick', () => {
            const textContent = document.getElementById('text-content');
            textContent.value = element.textContent;
            textContent.focus();
          });
          break;
          
        case 'image':
          element = document.createElement('img');
          element.dataset.type = 'image';
          element.className = 'canvas-element image-element';
          element.src = options.src || '';
          element.style.position = 'absolute';
          element.style.width = '150px';
          element.style.left = '50px';
          element.style.top = '50px';
          element.style.cursor = 'move';
          break;
          
        case 'shape':
          element = document.createElement('div');
          element.dataset.type = 'shape';
          element.dataset.shapetype = 'rectangle';
          element.className = 'canvas-element shape-element';
          element.style.position = 'absolute';
          element.style.width = '100px';
          element.style.height = '100px';
          element.style.backgroundColor = '#ffffff';
          element.style.border = '1px solid #000000';
          element.style.left = '50px';
          element.style.top = '50px';
          element.style.cursor = 'move';
          break;
          
        default:
          console.error("未知元素类型", type);
          return;
      }
      
      // 使元素可拖动和可调整大小
      this.makeDraggable(element);
      this.makeResizable(element);
      
      // 选中元素显示属性
      element.addEventListener('click', (event) => {
        event.stopPropagation();
        this._selectElement(element);
      });
      
      canvas.appendChild(element);
      this._selectElement(element);
    },
    
    // 选中元素
    _selectElement(element) {
      // 清除之前选中的元素样式
      if (this._selectedElement) {
        this._selectedElement.classList.remove('selected');
      }
      
      // 设置新选中的元素
      this._selectedElement = element;
      element.classList.add('selected');
      
      // 显示适当的属性面板
      this._showElementProperties(element);
    },
    
    // 显示元素属性面板
    _showElementProperties(element) {
      const propertiesPanel = document.getElementById('element-properties');
      const textProperties = document.querySelector('.text-properties');
      const shapeProperties = document.querySelector('.shape-properties');
      
      // 隐藏所有属性组
      textProperties.style.display = 'none';
      shapeProperties.style.display = 'none';
      
      // 根据元素类型显示相应属性
      if (element.dataset.type === 'text') {
        textProperties.style.display = 'block';
        document.getElementById('text-content').value = element.textContent;
        document.getElementById('font-size').value = parseInt(element.style.fontSize) || 16;
        document.getElementById('text-color').value = element.style.color || '#000000';
        
        // 设置对齐按钮状态
        document.querySelectorAll('.align-btn').forEach(btn => {
          btn.classList.remove('active');
        });
        const alignValue = element.style.textAlign || 'left';
        document.querySelector(`.align-btn[data-align="${alignValue}"]`)?.classList.add('active');
        
      } else if (element.dataset.type === 'shape') {
        shapeProperties.style.display = 'block';
        document.getElementById('shape-type').value = element.dataset.shapetype || 'rectangle';
        document.getElementById('border-width').value = parseInt(element.style.borderWidth) || 1;
        document.getElementById('border-color').value = element.style.borderColor || '#000000';
        document.getElementById('shape-bg-color').value = element.style.backgroundColor || '#ffffff';
      }
      
      // 设置通用属性
      document.getElementById('element-opacity').value = element.style.opacity || 1;
      
      // 显示属性面板
      propertiesPanel.style.display = 'block';
    },
    
    // 隐藏元素属性面板
    _hideElementProperties() {
      document.getElementById('element-properties').style.display = 'none';
    },
    
    // 使元素可拖拽
    makeDraggable(element, callback) {
      if (!element) return;
      
      let startX, startY;
      let isDragging = false;
      
      // 鼠标事件
      element.addEventListener('mousedown', startDrag);
      document.addEventListener('mousemove', drag);
      document.addEventListener('mouseup', endDrag);
      
      // 触摸事件（移动设备）
      element.addEventListener('touchstart', handleTouchStart, { passive: false });
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleTouchEnd);
      
      function startDrag(e) {
        e.preventDefault();
        e.stopPropagation();
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        element.style.cursor = 'grabbing';
        document.body.classList.add('dragging');
      }
      
      function drag(e) {
        if (!isDragging) return;
        e.preventDefault();

        // 获取画布缩放比例
        const canvas = document.getElementById('preview-canvas');
        const canvasRect = canvas.getBoundingClientRect();
        const canvasContainer = document.getElementById('preview-canvas-container');
        const scaleX = canvas.width / canvasRect.width;
        const scaleY = canvas.height / canvasRect.height;
        
        // 计算拖动距离
        const dx = (e.clientX - startX);
        const dy = (e.clientY - startY);
        
        // 更新起始位置
        startX = e.clientX;
        startY = e.clientY;
        
        // 应用缩放系数，确保拖动距离与画布缩放匹配
        callback(dx * scaleX, dy * scaleY);
      }
      
      function endDrag() {
        if (!isDragging) return;
        isDragging = false;
        element.style.cursor = 'grab';
        document.body.classList.remove('dragging');
      }
      
      function handleTouchStart(e) {
        if (e.touches.length === 1) {
          e.preventDefault(); // 阻止默认滚动
          isDragging = true;
          startX = e.touches[0].clientX;
          startY = e.touches[0].clientY;
          document.body.classList.add('dragging');
        }
      }
      
      function handleTouchMove(e) {
        if (!isDragging || e.touches.length !== 1) return;
        e.preventDefault(); // 阻止默认滚动

        // 获取画布缩放比例
        const canvas = document.getElementById('preview-canvas');
        const canvasRect = canvas.getBoundingClientRect();
        const canvasContainer = document.getElementById('preview-canvas-container');
        const scaleX = canvas.width / canvasRect.width;
        const scaleY = canvas.height / canvasRect.height;

        // 计算拖动距离
        const dx = (e.touches[0].clientX - startX);
        const dy = (e.touches[0].clientY - startY);
        
        // 更新起始位置
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        
        // 应用缩放系数，确保拖动距离与画布缩放匹配
        callback(dx * scaleX, dy * scaleY);
      }
      
      function handleTouchEnd() {
        if (!isDragging) return;
        isDragging = false;
        document.body.classList.remove('dragging');
      }
    },
    
    // 使元素可调整大小
    makeResizable(element, callback) {
      if (!element) return;
      
      let startX, startY;
      let isResizing = false;
      
      // 鼠标事件
      element.addEventListener('mousedown', startResize);
      document.addEventListener('mousemove', resize);
      document.addEventListener('mouseup', endResize);
      
      // 触摸事件（移动设备）
      element.addEventListener('touchstart', handleTouchStart, { passive: false });
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleTouchEnd);
      
      function startResize(e) {
        e.preventDefault();
        e.stopPropagation();
        isResizing = true;
        startX = e.clientX;
        startY = e.clientY;
        element.style.cursor = 'nwse-resize';
        document.body.classList.add('resizing');
      }
      
      function resize(e) {
        if (!isResizing) return;
        e.preventDefault();

        // 获取画布缩放比例
        const canvas = document.getElementById('preview-canvas');
        const canvasRect = canvas.getBoundingClientRect();
        const canvasContainer = document.getElementById('preview-canvas-container');
        const scaleX = canvas.width / canvasRect.width;
        const scaleY = canvas.height / canvasRect.height;

        // 计算大小变化
        const dx = (e.clientX - startX);
        const dy = (e.clientY - startY);
        
        // 更新起始位置
        startX = e.clientX;
        startY = e.clientY;
        
        // 应用缩放系数，确保调整大小与画布缩放匹配
        callback(dx * scaleX, dy * scaleY);
      }
      
      function endResize() {
        if (!isResizing) return;
        isResizing = false;
        element.style.cursor = 'nwse-resize';
        document.body.classList.remove('resizing');
      }
      
      function handleTouchStart(e) {
        if (e.touches.length === 1) {
          e.preventDefault();
          isResizing = true;
          startX = e.touches[0].clientX;
          startY = e.touches[0].clientY;
          document.body.classList.add('resizing');
        }
      }
      
      function handleTouchMove(e) {
        if (!isResizing || e.touches.length !== 1) return;
        e.preventDefault();

        // 获取画布缩放比例
        const canvas = document.getElementById('preview-canvas');
        const canvasRect = canvas.getBoundingClientRect();
        const canvasContainer = document.getElementById('preview-canvas-container');
        const scaleX = canvas.width / canvasRect.width;
        const scaleY = canvas.height / canvasRect.height;

        // 计算大小变化
        const dx = (e.touches[0].clientX - startX);
        const dy = (e.touches[0].clientY - startY);
        
        // 更新起始位置
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        
        // 应用缩放系数，确保调整大小与画布缩放匹配
        callback(dx * scaleX, dy * scaleY);
      }
      
      function handleTouchEnd() {
        if (!isResizing) return;
        isResizing = false;
        document.body.classList.remove('resizing');
      }
    },
    
    // 初始化拖拽手柄
    initDragHandles() {
      try {
        const previewCanvas = document.getElementById('preview-canvas');
        if (!previewCanvas) return;
        
        const canvasContainer = document.getElementById('preview-canvas-container');
        if (!canvasContainer) return;
        
        // 创建故事文本拖拽手柄
        const narrativeHandles = document.createElement('div');
        narrativeHandles.id = 'narrative-handles';
        narrativeHandles.className = 'resize-handles';
        narrativeHandles.innerHTML = `
          <div id="narrative-position-handle" class="position-handle"></div>
          <div id="narrative-resize-handle" class="resize-handle"></div>
        `;
        
        // 创建单词列表拖拽手柄
        const wordlistHandles = document.createElement('div');
        wordlistHandles.id = 'wordlist-handles';
        wordlistHandles.className = 'resize-handles';
        wordlistHandles.innerHTML = `
          <div id="wordlist-position-handle" class="position-handle"></div>
          <div id="wordlist-resize-handle" class="resize-handle"></div>
        `;
        
        // 添加到预览画布容器，而不是body
        canvasContainer.appendChild(narrativeHandles);
        canvasContainer.appendChild(wordlistHandles);
        
        // 默认隐藏
        narrativeHandles.style.display = 'none';
        wordlistHandles.style.display = 'none';
      } catch (error) {
        console.error('初始化拖拽手柄时出错:', error);
      }
    },
    
    // 初始化拖拽事件
    initDragEvents() {
      try {
        const narrativePositionHandle = document.getElementById('narrative-position-handle');
        const wordlistPositionHandle = document.getElementById('wordlist-position-handle');
        
        if (narrativePositionHandle) {
          narrativePositionHandle.addEventListener('mousedown', this.startDrag.bind(this, 'narrativePosition'));
          narrativePositionHandle.addEventListener('touchstart', this.startDrag.bind(this, 'narrativePosition'));
        }
        
        if (wordlistPositionHandle) {
          wordlistPositionHandle.addEventListener('mousedown', this.startDrag.bind(this, 'wordListPosition'));
          wordlistPositionHandle.addEventListener('touchstart', this.startDrag.bind(this, 'wordListPosition'));
        }
      } catch (error) {
        console.error('初始化拖拽事件时出错:', error);
      }
    },
    
    // 开始拖拽
    startDrag(positionKey, e) {
      e.preventDefault();
      
      const isTouch = e.type === 'touchstart';
      const startX = isTouch ? e.touches[0].clientX : e.clientX;
      const startY = isTouch ? e.touches[0].clientY : e.clientY;
      
      const startPositionX = this.state[positionKey].x;
      const startPositionY = this.state[positionKey].y;
      
      const moveHandler = isTouch ? 
        (e) => this.dragMove(e, positionKey, startX, startY, startPositionX, startPositionY, true) :
        (e) => this.dragMove(e, positionKey, startX, startY, startPositionX, startPositionY);
      
      const endHandler = () => {
        document.removeEventListener(isTouch ? 'touchmove' : 'mousemove', moveHandler);
        document.removeEventListener(isTouch ? 'touchend' : 'mouseup', endHandler);
      };
      
      document.addEventListener(isTouch ? 'touchmove' : 'mousemove', moveHandler);
      document.addEventListener(isTouch ? 'touchend' : 'mouseup', endHandler);
    },
    
    // 拖拽移动
    dragMove(e, positionKey, startX, startY, startPositionX, startPositionY, isTouch = false) {
      const clientX = isTouch ? e.touches[0].clientX : e.clientX;
      const clientY = isTouch ? e.touches[0].clientY : e.clientY;
      
      const canvas = document.getElementById('preview-canvas');
      const rect = canvas.getBoundingClientRect();
      
      // 缩放比例（预览缩放后的坐标到实际画布坐标的比例）
      const previewToRealRatio = canvas.width / rect.width;
      
      // 计算移动距离
      const dx = (clientX - startX) * previewToRealRatio;
      const dy = (clientY - startY) * previewToRealRatio;
      
      // 更新位置
      this.state[positionKey].x = Math.max(0, startPositionX + dx);
      this.state[positionKey].y = Math.max(0, startPositionY + dy);
      
      // 边界检查
      const maxX = this.state.canvasSize.width - this.state[positionKey].width;
      const maxY = this.state.canvasSize.height - this.state[positionKey].height;
      
      this.state[positionKey].x = Math.min(this.state[positionKey].x, maxX);
      this.state[positionKey].y = Math.min(this.state[positionKey].y, maxY);
      
      // 更新UI滑块
      this.updateSliderUI(
        `${positionKey === 'narrativePosition' ? 'narrative' : 'wordlist'}-x`,
        `${positionKey === 'narrativePosition' ? 'narrative' : 'wordlist'}-x-value`,
        Math.round(this.state[positionKey].x)
      );
      
      this.updateSliderUI(
        `${positionKey === 'narrativePosition' ? 'narrative' : 'wordlist'}-y`,
        `${positionKey === 'narrativePosition' ? 'narrative' : 'wordlist'}-y-value`,
        Math.round(this.state[positionKey].y)
      );
      
      // 更新预览
      this.updatePreview();
      this.updateHandlePositions();
    },
    
    // 显示图片合成编辑器
    showComposer() {
      console.log('跳转到图片合成编辑器');
      
      try {
        // 检查是否有内容可以合成
        const narrativeContent = localStorage.getItem('narrative_content');
        const wordListContent = localStorage.getItem('word_list_content');
        
        if (!narrativeContent || !wordListContent) {
          UIManager.showErrorMessage('请先生成文本内容，再使用合成编辑器', 3000);
          return;
        }
        
        // 跳转到合成页面
        window.location.href = 'hecheng.htm';
    } catch (error) {
        console.error('跳转到合成编辑器时出错:', error);
        UIManager.showErrorMessage('跳转到合成编辑器时出错', 2000);
    }
    },
    
    // 隐藏图片合成编辑器
    hideComposer() {
      const container = document.getElementById('image-composer-container');
      if (container) {
        container.style.display = 'none';
      }
    },
    
    // 准备图像
    prepareImages() {
      return new Promise((resolve, reject) => {
        try {
          console.log("准备图像 - 开始");
          
          // 获取叙述文本和单词列表的元素
          const narrativeOutput = document.getElementById('narrativeOutput');
          const wordListOutput = document.getElementById('wordListOutput');
          
          if (!narrativeOutput || !wordListOutput) {
            const errorMsg = '找不到输出元素';
            console.error(errorMsg);
            UIManager.showErrorMessage(errorMsg, 3000);
            reject(new Error(errorMsg));
            return;
          }
          
          console.log("已找到输出元素，开始转换为图像");
          
          // 确保输出元素有内容
          if (!narrativeOutput.innerHTML || !wordListOutput.innerHTML) {
            console.log("输出元素为空，尝试从localStorage获取内容");
            
            const narrativeContent = localStorage.getItem('narrative_content');
            const wordListContent = localStorage.getItem('word_list_content');
            
            if (narrativeContent) {
              narrativeOutput.innerHTML = narrativeContent;
              console.log("已从localStorage恢复narrativeOutput内容");
            }
            
            if (wordListContent) {
              wordListOutput.innerHTML = wordListContent;
              console.log("已从localStorage恢复wordListOutput内容");
            }
          }
          
          // 确保输出元素在DOM中可见（即使是临时的）
          const originalNarrativeStyle = {
            position: narrativeOutput.style.position,
            left: narrativeOutput.style.left,
            top: narrativeOutput.style.top,
            visibility: narrativeOutput.style.visibility,
            width: narrativeOutput.style.width,
            height: narrativeOutput.style.height
          };
          
          const originalWordListStyle = {
            position: wordListOutput.style.position,
            left: wordListOutput.style.left,
            top: wordListOutput.style.top,
            visibility: wordListOutput.style.visibility,
            width: wordListOutput.style.width,
            height: wordListOutput.style.height
          };
          
          // 临时设置样式，使元素可以转换为图像
          narrativeOutput.style.position = 'absolute';
          narrativeOutput.style.left = '-9999px';
          narrativeOutput.style.top = '0';
          narrativeOutput.style.visibility = 'visible';
          narrativeOutput.style.width = '500px';  // 设置合理的宽度
          narrativeOutput.style.height = 'auto';
          document.body.appendChild(narrativeOutput);
          
          wordListOutput.style.position = 'absolute';
          wordListOutput.style.left = '-9999px';
          wordListOutput.style.top = '0';
          wordListOutput.style.visibility = 'visible';
          wordListOutput.style.width = '300px';  // 设置合理的宽度
          wordListOutput.style.height = 'auto';
          document.body.appendChild(wordListOutput);
          
          // 准备两个Promise
          const promiseArray = [];
          
          // 准备叙述文本图像
          const narrativePromise = html2canvas(narrativeOutput, {
            scale: 2,
            logging: false,
            backgroundColor: null,
            useCORS: true,
            allowTaint: true,
            onclone: (clonedDoc) => {
              const clonedElement = clonedDoc.getElementById('narrativeOutput');
              if (clonedElement) {
                clonedElement.style.visibility = 'visible';
                clonedElement.style.width = '500px';
                clonedElement.style.height = 'auto';
              }
            }
            }).then(canvas => {
            const img = new Image();
            img.onload = () => {
              this.state.narrativeImage = img;
              console.log("叙述文本图像已准备完成", img.width, "x", img.height);
            };
            img.onerror = (err) => {
              console.error("加载叙述文本图像时出错:", err);
            };
            img.src = canvas.toDataURL('image/png');
            
            // 还原原始样式
            Object.keys(originalNarrativeStyle).forEach(key => {
              narrativeOutput.style[key] = originalNarrativeStyle[key];
            });
            
            return img;
            }).catch(error => {
            console.error("创建叙述文本图像时出错:", error);
            UIManager.showErrorMessage("创建叙述文本图像时出错", 3000);
            
            // 还原原始样式
            Object.keys(originalNarrativeStyle).forEach(key => {
              narrativeOutput.style[key] = originalNarrativeStyle[key];
            });
            
            throw error;
          });
          
          promiseArray.push(narrativePromise);
          
          // 准备单词列表图像
          const wordListPromise = html2canvas(wordListOutput, {
            scale: 2,
            logging: false,
            backgroundColor: null,
            useCORS: true,
            allowTaint: true,
            onclone: (clonedDoc) => {
              const clonedElement = clonedDoc.getElementById('wordListOutput');
              if (clonedElement) {
                clonedElement.style.visibility = 'visible';
                clonedElement.style.width = '300px';
                clonedElement.style.height = 'auto';
              }
            }
            }).then(canvas => {
            const img = new Image();
            img.onload = () => {
              this.state.wordListImage = img;
              console.log("单词列表图像已准备完成", img.width, "x", img.height);
            };
            img.onerror = (err) => {
              console.error("加载单词列表图像时出错:", err);
            };
            img.src = canvas.toDataURL('image/png');
            
            // 还原原始样式
            Object.keys(originalWordListStyle).forEach(key => {
              wordListOutput.style[key] = originalWordListStyle[key];
            });
            
            return img;
            }).catch(error => {
            console.error("创建单词列表图像时出错:", error);
            UIManager.showErrorMessage("创建单词列表图像时出错", 3000);
            
            // 还原原始样式
            Object.keys(originalWordListStyle).forEach(key => {
              wordListOutput.style[key] = originalWordListStyle[key];
            });
            
            throw error;
          });
          
          promiseArray.push(wordListPromise);
          
          // 等待所有图像准备完成
          Promise.all(promiseArray)
            .then(images => {
              // 设置初始位置(如果未设置)
              if (!this.state.narrativePosition) {
                this.state.narrativePosition = {
                  x: 50,
                  y: 50,
                  width: images[0].width / 2,
                  height: images[0].height / 2
                };
              }
              
              if (!this.state.wordListPosition) {
                this.state.wordListPosition = {
                  x: 400,
                  y: 50,
                  width: images[1].width / 2,
                  height: images[1].height / 2
                };
              }
              
              console.log("所有图像准备完成");
              resolve(images);
            })
            .catch(error => {
              console.error("准备图像时出错:", error);
              UIManager.showErrorMessage("准备图像时出错", 3000);
              reject(error);
            });
            
        } catch (error) {
          console.error("准备图像过程中出现未处理的错误:", error);
          UIManager.showErrorMessage("准备图像时出错", 3000);
          reject(error);
        }
      });
    },
    
    // 渲染预览，为避免递归调用而独立出来
    renderPreview() {
      try {
        const canvas = document.getElementById('preview-canvas');
        if (!canvas) {
          console.error('未找到预览画布元素');
          return;
        }
        
        const ctx = canvas.getContext('2d');
        
        // 清除画布
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // 填充背景颜色
        const backgroundColor = document.getElementById('background-color')?.value || '#ffffff';
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // 绘制背景图片(如果有)
        if (this.state.backgroundImage) {
          ctx.drawImage(this.state.backgroundImage, 0, 0, canvas.width, canvas.height);
        }
        
        // 绘制叙述文本(如果有且应该显示)
        const showNarrative = document.getElementById('show-narrative');
        if (this.state.narrativeImage && this.state.narrativeImage.complete && 
            this.state.narrativeImage.width > 0 && this.state.narrativeImage.height > 0 && 
            (!showNarrative || showNarrative.checked)) {
          try {
            ctx.drawImage(
              this.state.narrativeImage,
              this.state.narrativePosition.x,
              this.state.narrativePosition.y,
              this.state.narrativePosition.width,
              this.state.narrativePosition.height
            );
          } catch (err) {
            console.error('绘制叙述文本图像时出错:', err);
          }
        }
        
        // 绘制单词列表(如果有且应该显示)
        const showWordlist = document.getElementById('show-wordlist');
        if (this.state.wordListImage && this.state.wordListImage.complete && 
            this.state.wordListImage.width > 0 && this.state.wordListImage.height > 0 && 
            (!showWordlist || showWordlist.checked)) {
          try {
            ctx.drawImage(
              this.state.wordListImage,
              this.state.wordListPosition.x,
              this.state.wordListPosition.y,
              this.state.wordListPosition.width,
              this.state.wordListPosition.height
            );
          } catch (err) {
            console.error('绘制单词列表图像时出错:', err);
          }
        }
        
        // 更新拖拽手柄位置
        if (typeof this.updateHandlePositions === 'function') {
          try {
            this.updateHandlePositions();
          } catch (error) {
            console.error('更新拖拽手柄位置时出错:', error);
          }
        }
      } catch (error) {
        console.error('渲染预览时出错:', error);
      }
    },
    
    // 更新预览 - 改为调用renderPreview，避免循环引用
    updatePreview() {
      this.renderPreview();
    },
    
    // 显示消息
    showMessage(message, type) {
      UIManager.showMessage(message, type, 3000);
    },
    
    // 初始化操作手柄的交互
    initHandles() {
      try {
        const self = this;
        const narrativeHandles = document.getElementById('narrative-handles');
        const wordlistHandles = document.getElementById('wordlist-handles');
        const canvasContainer = document.getElementById('preview-canvas-container');
        
        // 如果手柄不存在，则创建
        if (!narrativeHandles || !wordlistHandles) {
          this.initDragHandles();
        }
        
        // 获取手柄引用（可能是刚刚创建的）
        const narrativePositionHandle = document.getElementById('narrative-position-handle');
        const narrativeResizeHandle = document.getElementById('narrative-resize-handle');
        const wordlistPositionHandle = document.getElementById('wordlist-position-handle');
        const wordlistResizeHandle = document.getElementById('wordlist-resize-handle');
        
        if (!narrativePositionHandle || !narrativeResizeHandle || 
            !wordlistPositionHandle || !wordlistResizeHandle) {
          console.error('未找到拖拽手柄元素');
          return;
        }
        
        // 更新初始位置
        this.updateHandlePositions();
        
        // 故事文本的拖拽功能
        this.makeDraggable(
          narrativePositionHandle, 
          function(dx, dy) {
            self.state.narrativePosition.x += dx;
            self.state.narrativePosition.y += dy;
            self.updateHandlePositions();
            self.renderPreview();
            
            // 更新UI滑块
            self.updateSliderUI(
              'narrative-x',
              'narrative-x-value',
              Math.round(self.state.narrativePosition.x)
            );
            self.updateSliderUI(
              'narrative-y',
              'narrative-y-value',
              Math.round(self.state.narrativePosition.y)
            );
          }
        );
        
        // 故事文本的调整大小功能
        this.makeResizable(
          narrativeResizeHandle, 
          function(dx, dy) {
            self.state.narrativePosition.width += dx;
            self.state.narrativePosition.height += dy;
            
            // 确保宽度和高度不小于最小值
            self.state.narrativePosition.width = Math.max(50, self.state.narrativePosition.width);
            self.state.narrativePosition.height = Math.max(50, self.state.narrativePosition.height);
            
            self.updateHandlePositions();
            self.renderPreview();
            
            // 更新UI滑块
            self.updateSliderUI(
              'narrative-width',
              'narrative-width-value',
              Math.round(self.state.narrativePosition.width)
            );
            self.updateSliderUI(
              'narrative-height',
              'narrative-height-value',
              Math.round(self.state.narrativePosition.height)
            );
          }
        );
        
        // 单词列表的拖拽功能
        this.makeDraggable(
          wordlistPositionHandle, 
          function(dx, dy) {
            self.state.wordListPosition.x += dx;
            self.state.wordListPosition.y += dy;
            self.updateHandlePositions();
            self.renderPreview();
            
            // 更新UI滑块
            self.updateSliderUI(
              'wordlist-x',
              'wordlist-x-value',
              Math.round(self.state.wordListPosition.x)
            );
            self.updateSliderUI(
              'wordlist-y',
              'wordlist-y-value',
              Math.round(self.state.wordListPosition.y)
            );
          }
        );
        
        // 单词列表的调整大小功能
        this.makeResizable(
          wordlistResizeHandle, 
          function(dx, dy) {
            self.state.wordListPosition.width += dx;
            self.state.wordListPosition.height += dy;
            
            // 确保宽度和高度不小于最小值
            self.state.wordListPosition.width = Math.max(50, self.state.wordListPosition.width);
            self.state.wordListPosition.height = Math.max(50, self.state.wordListPosition.height);
            
            self.updateHandlePositions();
            self.renderPreview();
            
            // 更新UI滑块
            self.updateSliderUI(
              'wordlist-width',
              'wordlist-width-value',
              Math.round(self.state.wordListPosition.width)
            );
            self.updateSliderUI(
              'wordlist-height',
              'wordlist-height-value',
              Math.round(self.state.wordListPosition.height)
            );
          }
        );

        // 禁用背景拖动，只允许图片元素拖动
        const previewCanvas = document.getElementById('preview-canvas');
        if (previewCanvas) {
          previewCanvas.style.pointerEvents = 'none';
        }

        // 确保只有手柄元素可以拖动
        if (narrativeHandles) {
          narrativeHandles.style.pointerEvents = 'auto';
        }
        if (wordlistHandles) {
          wordlistHandles.style.pointerEvents = 'auto';
        }
      } catch (error) {
        console.error('初始化拖拽手柄时出错:', error);
        UIManager.showErrorMessage('初始化拖拽控件失败', 2000);
      }
    },
    
    // 使元素可拖拽
    makeDraggable(element, callback) {
      if (!element) return;
      
      let startX, startY;
      let isDragging = false;
      
      // 鼠标事件
      element.addEventListener('mousedown', startDrag);
      document.addEventListener('mousemove', drag);
      document.addEventListener('mouseup', endDrag);
      
      // 触摸事件（移动设备）
      element.addEventListener('touchstart', handleTouchStart, { passive: false });
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleTouchEnd);
      
      function startDrag(e) {
        e.preventDefault();
        e.stopPropagation();
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        element.style.cursor = 'grabbing';
        document.body.classList.add('dragging');
      }
      
      function drag(e) {
        if (!isDragging) return;
        e.preventDefault();

        // 获取画布缩放比例
        const canvas = document.getElementById('preview-canvas');
        const canvasRect = canvas.getBoundingClientRect();
        const canvasContainer = document.getElementById('preview-canvas-container');
        const scaleX = canvas.width / canvasRect.width;
        const scaleY = canvas.height / canvasRect.height;
        
        // 计算拖动距离
        const dx = (e.clientX - startX);
        const dy = (e.clientY - startY);
        
        // 更新起始位置
        startX = e.clientX;
        startY = e.clientY;
        
        // 应用缩放系数，确保拖动距离与画布缩放匹配
        callback(dx * scaleX, dy * scaleY);
      }
      
      function endDrag() {
        if (!isDragging) return;
        isDragging = false;
        element.style.cursor = 'grab';
        document.body.classList.remove('dragging');
      }
      
      function handleTouchStart(e) {
        if (e.touches.length === 1) {
          e.preventDefault(); // 阻止默认滚动
          isDragging = true;
          startX = e.touches[0].clientX;
          startY = e.touches[0].clientY;
          document.body.classList.add('dragging');
        }
      }
      
      function handleTouchMove(e) {
        if (!isDragging || e.touches.length !== 1) return;
        e.preventDefault(); // 阻止默认滚动

        // 获取画布缩放比例
        const canvas = document.getElementById('preview-canvas');
        const canvasRect = canvas.getBoundingClientRect();
        const canvasContainer = document.getElementById('preview-canvas-container');
        const scaleX = canvas.width / canvasRect.width;
        const scaleY = canvas.height / canvasRect.height;

        // 计算拖动距离
        const dx = (e.touches[0].clientX - startX);
        const dy = (e.touches[0].clientY - startY);
        
        // 更新起始位置
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        
        // 应用缩放系数，确保拖动距离与画布缩放匹配
        callback(dx * scaleX, dy * scaleY);
      }
      
      function handleTouchEnd() {
        if (!isDragging) return;
        isDragging = false;
        document.body.classList.remove('dragging');
      }
    },
    
    // 使元素可调整大小
    makeResizable(element, callback) {
      if (!element) return;
      
      let startX, startY;
      let isResizing = false;
      
      // 鼠标事件
      element.addEventListener('mousedown', startResize);
      document.addEventListener('mousemove', resize);
      document.addEventListener('mouseup', endResize);
      
      // 触摸事件（移动设备）
      element.addEventListener('touchstart', handleTouchStart, { passive: false });
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleTouchEnd);
      
      function startResize(e) {
        e.preventDefault();
        e.stopPropagation();
        isResizing = true;
        startX = e.clientX;
        startY = e.clientY;
        element.style.cursor = 'nwse-resize';
        document.body.classList.add('resizing');
      }
      
      function resize(e) {
        if (!isResizing) return;
        e.preventDefault();

        // 获取画布缩放比例
        const canvas = document.getElementById('preview-canvas');
        const canvasRect = canvas.getBoundingClientRect();
        const canvasContainer = document.getElementById('preview-canvas-container');
        const scaleX = canvas.width / canvasRect.width;
        const scaleY = canvas.height / canvasRect.height;

        // 计算大小变化
        const dx = (e.clientX - startX);
        const dy = (e.clientY - startY);
        
        // 更新起始位置
        startX = e.clientX;
        startY = e.clientY;
        
        // 应用缩放系数，确保调整大小与画布缩放匹配
        callback(dx * scaleX, dy * scaleY);
      }
      
      function endResize() {
        if (!isResizing) return;
        isResizing = false;
        element.style.cursor = 'nwse-resize';
        document.body.classList.remove('resizing');
      }
      
      function handleTouchStart(e) {
        if (e.touches.length === 1) {
          e.preventDefault();
          isResizing = true;
          startX = e.touches[0].clientX;
          startY = e.touches[0].clientY;
          document.body.classList.add('resizing');
        }
      }
      
      function handleTouchMove(e) {
        if (!isResizing || e.touches.length !== 1) return;
        e.preventDefault();

        // 获取画布缩放比例
        const canvas = document.getElementById('preview-canvas');
        const canvasRect = canvas.getBoundingClientRect();
        const canvasContainer = document.getElementById('preview-canvas-container');
        const scaleX = canvas.width / canvasRect.width;
        const scaleY = canvas.height / canvasRect.height;

        // 计算大小变化
        const dx = (e.touches[0].clientX - startX);
        const dy = (e.touches[0].clientY - startY);
        
        // 更新起始位置
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        
        // 应用缩放系数，确保调整大小与画布缩放匹配
        callback(dx * scaleX, dy * scaleY);
      }
      
      function handleTouchEnd() {
        if (!isResizing) return;
        isResizing = false;
        document.body.classList.remove('resizing');
      }
    },
    
    // 更新模板选择器
    updateTemplateSelector() {
      console.log("执行ImageComposer.updateTemplateSelector");
      const selector = document.getElementById('canvas-template-selector');
      if (!selector) {
        console.log("未找到canvas-template-selector元素，跳过更新");
        return;
      }
      
      // 保留第一个选项（空选项）
      let firstOption;
      if (selector.options.length > 0) {
        firstOption = selector.options[0];
        selector.innerHTML = '';
        selector.appendChild(firstOption);
      } else {
        selector.innerHTML = '';
        firstOption = document.createElement('option');
        firstOption.value = '';
        firstOption.textContent = '选择预设模板';
        selector.appendChild(firstOption);
      }
      
      // 添加模板选项
      for (const name in this.templates) {
        const option = document.createElement('option');
        option.value = name;
        option.textContent = name;
        selector.appendChild(option);
      }
    },
    
    // 保存当前设置为模板
    saveTemplate(name) {
      console.log(`保存模板: ${name}`);
      if (!name || name.trim() === '') {
        this.showMessage('请输入模板名称', 'error');
        return;
      }
      
      // 检查是否已存在同名模板
      if (this.templates[name] && !confirm(`模板"${name}"已存在，是否覆盖？`)) {
        return;
      }
      
      // 保存当前状态
      this.templates[name] = {
        canvasSize: { ...this.state.canvasSize },
        backgroundColor: document.getElementById('background-color')?.value || '#ffffff',
        narrativePosition: { ...this.state.narrativePosition },
        wordListPosition: { ...this.state.wordListPosition }
      };
      
      // 保存到localStorage
      try {
        localStorage.setItem('image_composer_templates', JSON.stringify(this.templates));
        
        // 更新模板选择器
        this.updateTemplateSelector();
        
        // 显示成功消息
        this.showMessage(`模板"${name}"已保存`, 'success');
      } catch (error) {
        console.error('保存模板失败:', error);
        this.showMessage('保存模板失败', 'error');
      }
    },
    
    // 应用模板
    applyTemplate(name) {
      console.log(`应用模板: ${name}`);
      const template = this.templates[name];
      if (!template) {
        this.showMessage(`找不到模板"${name}"`, 'error');
        return;
      }
      
      try {
        // 应用模板设置
        this.state.canvasSize = { ...template.canvasSize };
        this.state.narrativePosition = { ...template.narrativePosition };
        this.state.wordListPosition = { ...template.wordListPosition };
        
        // 更新Canvas尺寸
        this.updateCanvasSize();
        
        // 更新UI元素
        const canvasWidth = document.getElementById('canvas-width');
        const canvasWidthValue = document.getElementById('canvas-width-value');
        if (canvasWidth && canvasWidthValue) {
          canvasWidth.value = template.canvasSize.width;
          canvasWidthValue.textContent = template.canvasSize.width;
        }
        
        const canvasHeight = document.getElementById('canvas-height');
        const canvasHeightValue = document.getElementById('canvas-height-value');
        if (canvasHeight && canvasHeightValue) {
          canvasHeight.value = template.canvasSize.height;
          canvasHeightValue.textContent = template.canvasSize.height;
        }
        
        const backgroundColorInput = document.getElementById('background-color');
        if (backgroundColorInput && template.backgroundColor) {
          backgroundColorInput.value = template.backgroundColor;
        }
        
        // 更新预览
        this.updatePreview();
        
        // 显示成功消息
        this.showMessage(`已应用模板"${name}"`, 'success');
      } catch (error) {
        console.error('应用模板时出错:', error);
        this.showMessage('应用模板时出错', 'error');
      }
    },
    
    // 删除模板
    deleteTemplate(name) {
      console.log(`删除模板: ${name}`);
      if (!this.templates[name]) {
        this.showMessage(`找不到模板"${name}"`, 'error');
        return;
      }
      
      // 确认删除
      if (!confirm(`确认删除模板"${name}"？`)) {
        return;
      }
      
      try {
        // 删除模板
        delete this.templates[name];
        
        // 保存到localStorage
        localStorage.setItem('image_composer_templates', JSON.stringify(this.templates));
        
        // 更新模板选择器
        this.updateTemplateSelector();
        
        // 重置模板选择器
        const selector = document.getElementById('canvas-template-selector');
        if (selector) selector.value = '';
        
        // 显示成功消息
        this.showMessage(`模板"${name}"已删除`, 'success');
      } catch (error) {
        console.error('删除模板时出错:', error);
        this.showMessage('删除模板时出错', 'error');
      }
    },
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
  window.showImageComposer = () => ImageComposer.showComposer();