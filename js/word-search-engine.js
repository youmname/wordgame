/**
 * 单词搜索引擎模块
 * 基于TF-IDF实现语义搜索，支持模糊匹配和高级过滤
 */

export class WordSearchEngine {
  constructor() {
    this.words = [];
    this.wordMap = new Map();
    this.invertedIndex = new Map();
    this.initialized = false;
    
    // 布隆过滤器用于快速检查单词是否存在
    this.bloomFilter = new BloomFilter(10000, 7);
    
    // 创建Web Worker用于后台处理
    this.createWorker();
  }
  
  /**
   * 创建索引处理Worker
   */
  createWorker() {
    const workerCode = `
      // TF-IDF实现
      class TFIDF {
        constructor() {
          this.documents = [];
          this.corpus = {};
          this.corpusCount = 0;
        }
        
        addDocument(doc, id) {
          const words = this.tokenize(doc);
          const wordCount = {};
          const docObj = { id, words: {}, length: words.length };
          
          // 计算词频 (TF)
          words.forEach(word => {
            wordCount[word] = (wordCount[word] || 0) + 1;
          });
          
          // 计算每个词的TF
          Object.keys(wordCount).forEach(word => {
            docObj.words[word] = wordCount[word] / words.length;
            this.corpus[word] = (this.corpus[word] || 0) + 1;
          });
          
          this.documents.push(docObj);
          this.corpusCount++;
          
          return docObj;
        }
        
        tokenize(text) {
          return text.toLowerCase()
            .replace(/[^\\w\\s]/g, ' ')
            .split(/\\s+/)
            .filter(w => w.length > 1);
        }
        
        calculateIDF() {
          const N = this.corpusCount;
          this.idf = {};
          
          Object.keys(this.corpus).forEach(word => {
            // IDF = log(N / df)
            this.idf[word] = Math.log(N / this.corpus[word]);
          });
        }
        
        calculateSimilarity(query) {
          const queryTokens = this.tokenize(query);
          const results = [];
          
          if (queryTokens.length === 0) return [];
          
          // 确保IDF已计算
          if (!this.idf) {
            this.calculateIDF();
          }
          
          const queryVector = {};
          queryTokens.forEach(token => {
            queryVector[token] = (queryVector[token] || 0) + 1;
          });
          
          Object.keys(queryVector).forEach(token => {
            queryVector[token] = queryVector[token] / queryTokens.length * (this.idf[token] || 0);
          });
          
          this.documents.forEach(doc => {
            let dotProduct = 0;
            let docMagnitude = 0;
            let queryMagnitude = 0;
            
            // 计算点积和向量大小
            Object.keys(queryVector).forEach(token => {
              if (doc.words[token]) {
                const tfidf = doc.words[token] * (this.idf[token] || 0);
                dotProduct += queryVector[token] * tfidf;
                docMagnitude += tfidf * tfidf;
              }
              queryMagnitude += queryVector[token] * queryVector[token];
            });
            
            // 计算余弦相似度
            const magnitude = Math.sqrt(docMagnitude) * Math.sqrt(queryMagnitude);
            const similarity = magnitude !== 0 ? dotProduct / magnitude : 0;
            
            if (similarity > 0) {
              results.push({
                id: doc.id,
                score: similarity
              });
            }
          });
          
          // 按相似度降序排序
          return results.sort((a, b) => b.score - a.score);
        }
      }
      
      let tfidf = null;
      let invertedIndex = null;
      let bloomFilter = null;
      
      self.onmessage = function(e) {
        const { action, data } = e.data;
        
        switch(action) {
          case 'initialize':
            tfidf = new TFIDF();
            invertedIndex = new Map();
            bloomFilter = {
              values: new Uint32Array(data.bloomFilterSize),
              add: function(key) {
                for (let i = 0; i < data.hashFunctions; i++) {
                  const hash = simpleHash(key, i) % data.bloomFilterSize;
                  this.values[hash] = 1;
                }
              },
              check: function(key) {
                for (let i = 0; i < data.hashFunctions; i++) {
                  const hash = simpleHash(key, i) % data.bloomFilterSize;
                  if (!this.values[hash]) return false;
                }
                return true;
              }
            };
            self.postMessage({ action: 'initialized' });
            break;
            
          case 'addWords':
            const addedDocs = [];
            data.words.forEach(word => {
              // 索引文档
              const docObj = tfidf.addDocument(
                \`\${word.word} \${word.meaning} \${word.category || ''} \${word.chapter || ''}\`, 
                word.id
              );
              addedDocs.push(docObj);
              
              // 更新布隆过滤器
              bloomFilter.add(word.word.toLowerCase());
              
              // 更新倒排索引
              const tokens = tfidf.tokenize(word.word + ' ' + word.meaning);
              tokens.forEach(token => {
                if (!invertedIndex.has(token)) {
                  invertedIndex.set(token, new Set());
                }
                invertedIndex.get(token).add(word.id);
              });
            });
            
            tfidf.calculateIDF();
            
            self.postMessage({ 
              action: 'wordsAdded', 
              count: data.words.length,
              bloomFilterValues: bloomFilter.values
            });
            break;
            
          case 'search':
            const { query, filters, limit } = data;
            
            if (!tfidf) {
              self.postMessage({ action: 'searchResults', results: [], error: 'Engine not initialized' });
              return;
            }
            
            // 基本搜索
            let results = tfidf.calculateSimilarity(query);
            
            // 应用过滤器
            if (filters) {
              if (filters.category) {
                results = results.filter(result => {
                  const word = data.wordsMap[result.id];
                  return word && word.category === filters.category;
                });
              }
              
              if (filters.difficulty) {
                results = results.filter(result => {
                  const word = data.wordsMap[result.id];
                  return word && word.difficulty === filters.difficulty;
                });
              }
              
              if (filters.chapter) {
                results = results.filter(result => {
                  const word = data.wordsMap[result.id];
                  return word && word.chapter === filters.chapter;
                });
              }
            }
            
            // 限制结果数量
            if (limit && results.length > limit) {
              results = results.slice(0, limit);
            }
            
            self.postMessage({ action: 'searchResults', results });
            break;
            
          case 'checkWord':
            if (!bloomFilter) {
              self.postMessage({ action: 'wordExists', exists: false, word: data.word });
              return;
            }
            
            const exists = bloomFilter.check(data.word.toLowerCase());
            self.postMessage({ action: 'wordExists', exists, word: data.word });
            break;
        }
      };
      
      // 简单的哈希函数
      function simpleHash(str, seed = 0) {
        let h = seed;
        for (let i = 0; i < str.length; i++) {
          h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
          h = h << 13 | h >>> 19;
        }
        return h >>> 0;
      }
    `;
    
    try {
      const blob = new Blob([workerCode], { type: 'application/javascript' });
      this.worker = new Worker(URL.createObjectURL(blob));
      
      this.worker.onmessage = this.handleWorkerMessage.bind(this);
      
      // 初始化搜索引擎
      this.worker.postMessage({
        action: 'initialize',
        data: {
          bloomFilterSize: this.bloomFilter.size,
          hashFunctions: this.bloomFilter.hashFunctions
        }
      });
    } catch (e) {
      console.error('无法创建Web Worker，降级为主线程处理', e);
      this.worker = null;
    }
  }
  
  /**
   * 处理Worker消息
   */
  handleWorkerMessage(e) {
    const { action, ...data } = e.data;
    
    switch(action) {
      case 'initialized':
        this.initialized = true;
        this.dispatchEvent('ready');
        break;
        
      case 'wordsAdded':
        if (data.bloomFilterValues) {
          this.bloomFilter.values = new Uint32Array(data.bloomFilterValues);
        }
        this.dispatchEvent('indexed', { count: data.count });
        break;
        
      case 'searchResults':
        this.dispatchEvent('searchResults', { results: data.results });
        break;
        
      case 'wordExists':
        this.dispatchEvent('wordExists', { 
          word: data.word, 
          exists: data.exists 
        });
        break;
    }
  }
  
  /**
   * 自定义事件分发
   */
  dispatchEvent(name, detail = {}) {
    const event = new CustomEvent(`wordSearchEngine:${name}`, { detail });
    document.dispatchEvent(event);
  }
  
  /**
   * 监听事件
   */
  on(event, callback) {
    const eventName = `wordSearchEngine:${event}`;
    document.addEventListener(eventName, (e) => callback(e.detail));
    return this;
  }
  
  /**
   * 索引单词数据
   * @param {Array} words 单词数据数组
   */
  indexWords(words) {
    if (!words || !words.length) return;
    
    this.words = words;
    
    // 更新wordMap用于快速查找
    words.forEach(word => {
      this.wordMap.set(word.id, word);
    });
    
    if (this.worker) {
      // 通过Worker处理
      this.worker.postMessage({
        action: 'addWords',
        data: { words }
      });
    } else {
      // 降级：在主线程处理
      this.indexWordsMainThread(words);
    }
  }
  
  /**
   * 主线程索引（降级方案）
   */
  indexWordsMainThread(words) {
    // 在主线程中为每个单词创建索引
    words.forEach(word => {
      const tokens = this.tokenize(word.word + ' ' + word.meaning);
      
      // 添加到布隆过滤器
      this.bloomFilter.add(word.word.toLowerCase());
      
      // 更新倒排索引
      tokens.forEach(token => {
        if (!this.invertedIndex.has(token)) {
          this.invertedIndex.set(token, new Set());
        }
        this.invertedIndex.get(token).add(word.id);
      });
    });
    
    this.initialized = true;
    this.dispatchEvent('indexed', { count: words.length });
    this.dispatchEvent('ready');
  }
  
  /**
   * 分词方法
   */
  tokenize(text) {
    return text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 1);
  }
  
  /**
   * 搜索单词
   * @param {string} query 搜索查询
   * @param {Object} filters 过滤条件
   * @param {number} limit 限制结果数量
   */
  search(query, filters = null, limit = 50) {
    if (!this.initialized) {
      console.warn('搜索引擎尚未初始化');
      return Promise.resolve([]);
    }
    
    return new Promise((resolve) => {
      const handleResults = (detail) => {
        document.removeEventListener('wordSearchEngine:searchResults', resultListener);
        
        const results = detail.results.map(result => ({
          ...result,
          word: this.wordMap.get(result.id)
        }));
        
        resolve(results);
      };
      
      const resultListener = (e) => handleResults(e.detail);
      document.addEventListener('wordSearchEngine:searchResults', resultListener);
      
      if (this.worker) {
        this.worker.postMessage({
          action: 'search',
          data: {
            query,
            filters,
            limit,
            wordsMap: Object.fromEntries(this.wordMap)
          }
        });
      } else {
        // 降级：主线程搜索
        this.searchMainThread(query, filters, limit);
      }
    });
  }
  
  /**
   * 主线程搜索（降级方案）
   */
  searchMainThread(query, filters, limit) {
    const tokens = this.tokenize(query);
    
    // 简单的词袋模型相似度计算
    const results = [];
    
    if (tokens.length === 0) {
      this.dispatchEvent('searchResults', { results: [] });
      return;
    }
    
    // 获取包含所有查询词的单词ID
    let candidateIds = new Set();
    let firstToken = true;
    
    tokens.forEach(token => {
      const matchedIds = this.invertedIndex.get(token) || new Set();
      
      if (firstToken) {
        candidateIds = new Set(matchedIds);
        firstToken = false;
      } else {
        candidateIds = new Set([...candidateIds].filter(id => matchedIds.has(id)));
      }
    });
    
    // 计算相似度
    candidateIds.forEach(id => {
      const word = this.wordMap.get(id);
      
      // 应用过滤器
      if (filters) {
        if (filters.category && word.category !== filters.category) return;
        if (filters.difficulty && word.difficulty !== filters.difficulty) return;
        if (filters.chapter && word.chapter !== filters.chapter) return;
      }
      
      // 计算简单相似度
      const wordText = `${word.word} ${word.meaning}`.toLowerCase();
      let score = 0;
      
      tokens.forEach(token => {
        if (wordText.includes(token)) {
          score += 1;
        }
      });
      
      if (score > 0) {
        results.push({
          id: word.id,
          score: score / tokens.length,
          word
        });
      }
    });
    
    // 按相似度排序
    const sortedResults = results.sort((a, b) => b.score - a.score);
    
    // 限制结果数量
    const limitedResults = limit ? sortedResults.slice(0, limit) : sortedResults;
    
    this.dispatchEvent('searchResults', {
      results: limitedResults.map(r => ({ id: r.id, score: r.score }))
    });
  }
  
  /**
   * 检查单词是否存在
   * @param {string} word 要检查的单词
   */
  hasWord(word) {
    const lowercaseWord = word.toLowerCase();
    
    // 快速检查布隆过滤器
    if (!this.bloomFilter.check(lowercaseWord)) {
      return Promise.resolve(false);
    }
    
    // 如果布隆过滤器返回可能存在，进一步确认
    if (this.worker) {
      return new Promise((resolve) => {
        const handleResult = (detail) => {
          if (detail.word === lowercaseWord) {
            document.removeEventListener('wordSearchEngine:wordExists', resultListener);
            resolve(detail.exists);
          }
        };
        
        const resultListener = (e) => handleResult(e.detail);
        document.addEventListener('wordSearchEngine:wordExists', resultListener);
        
        this.worker.postMessage({
          action: 'checkWord',
          data: { word: lowercaseWord }
        });
      });
    } else {
      // 主线程检查
      // 这里需要精确匹配而不是模糊查找
      for (const word of this.words) {
        if (word.word.toLowerCase() === lowercaseWord) {
          return Promise.resolve(true);
        }
      }
      return Promise.resolve(false);
    }
  }
  
  /**
   * 添加单个单词
   * @param {Object} word 单词对象
   */
  addWord(word) {
    if (!word || !word.id || !word.word) return;
    
    // 添加到本地数组
    this.words.push(word);
    this.wordMap.set(word.id, word);
    
    // 添加到布隆过滤器
    this.bloomFilter.add(word.word.toLowerCase());
    
    if (this.worker) {
      this.worker.postMessage({
        action: 'addWords',
        data: { words: [word] }
      });
    } else {
      // 主线程处理
      const tokens = this.tokenize(word.word + ' ' + word.meaning);
      tokens.forEach(token => {
        if (!this.invertedIndex.has(token)) {
          this.invertedIndex.set(token, new Set());
        }
        this.invertedIndex.get(token).add(word.id);
      });
    }
    
    return this;
  }
  
  /**
   * 删除单词
   * @param {string} wordId 单词ID
   */
  removeWord(wordId) {
    const word = this.wordMap.get(wordId);
    if (!word) return this;
    
    // 从词表中移除
    this.words = this.words.filter(w => w.id !== wordId);
    this.wordMap.delete(wordId);
    
    // 从倒排索引中移除
    // 注意：布隆过滤器不支持删除，可能会有假阳性
    if (!this.worker) {
      const tokens = this.tokenize(word.word + ' ' + word.meaning);
      tokens.forEach(token => {
        if (this.invertedIndex.has(token)) {
          this.invertedIndex.get(token).delete(wordId);
          
          // 如果token没有关联的单词，清除该entry
          if (this.invertedIndex.get(token).size === 0) {
            this.invertedIndex.delete(token);
          }
        }
      });
    } else {
      // Worker情况下需要重建索引
      // 这里简化处理，实际应用可能需要增量更新
      this.worker.postMessage({
        action: 'addWords',
        data: { words: this.words }
      });
    }
    
    return this;
  }
  
  /**
   * 销毁引擎，释放资源
   */
  destroy() {
    if (this.worker) {
      this.worker.terminate();
    }
    
    this.words = [];
    this.wordMap.clear();
    this.invertedIndex.clear();
    this.initialized = false;
  }
}

/**
 * 布隆过滤器实现
 * 用于快速检查单词是否存在（可能有假阳性，但没有假阴性）
 */
class BloomFilter {
  constructor(size = 10000, hashFunctions = 7) {
    this.size = size;
    this.hashFunctions = hashFunctions;
    this.values = new Uint32Array(size);
  }
  
  /**
   * 添加项到过滤器
   */
  add(key) {
    for (let i = 0; i < this.hashFunctions; i++) {
      const hash = this.getHash(key, i) % this.size;
      this.values[hash] = 1;
    }
  }
  
  /**
   * 检查项是否可能存在
   */
  check(key) {
    for (let i = 0; i < this.hashFunctions; i++) {
      const hash = this.getHash(key, i) % this.size;
      if (!this.values[hash]) return false;
    }
    return true;
  }
  
  /**
   * 简单的哈希函数
   */
  getHash(key, seed = 0) {
    let h = seed;
    for (let i = 0; i < key.length; i++) {
      h = Math.imul(h ^ key.charCodeAt(i), 3432918353);
      h = h << 13 | h >>> 19;
    }
    return h >>> 0;
  }
} 