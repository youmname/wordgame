const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// 配置
const DB_PATH = 'D:\\vocabulary-project\\database\\vocabulary.db'; // 请根据实际路径修改
const VOCAB_DIR = './'; // JSON文件所在目录

// 词汇级别定义
const VOCABULARY_LEVELS = [
  { id: '考研英语', filename: '考研单词表格.json' },
  { id: '六级英语', filename: '大学英语六级词汇.json' },
  { id: '初中英语', filename: '初中英语单词汇总表.json' },
  { id: '高考英语', filename: '新课标高考英语考纲3500词汇表.json' },
  { id: '雅思英语', filename: '雅思词汇9400词EXCEL词.json' }
];

// 统计变量
let totalImported = 0;
let totalSkipped = 0;
let totalErrors = 0;

// 打开数据库
console.log('正在连接数据库...');
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('连接数据库失败:', err.message);
    process.exit(1);
  }
  
  console.log('数据库连接成功!');
  console.log('----------------------------');
  
  // 开始准备数据库结构
  prepareDatabase();
});

// 准备数据库结构
function prepareDatabase() {
  console.log('正在准备数据库结构...');
  
  db.serialize(() => {
    // 临时关闭外键约束
    db.run("PRAGMA foreign_keys = OFF");
    
    // 检查并删除旧表
    db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='Words'", (err, row) => {
      if (err) {
        console.error('检查表是否存在时出错:', err.message);
        process.exit(1);
      }
      
      const dropTableIfNeeded = () => {
        if (row) {
          console.log('删除已存在的Words表...');
          db.run("DROP TABLE IF EXISTS Words", (err) => {
            if (err) {
              console.error('删除Words表时出错:', err.message);
              process.exit(1);
            }
            createTable();
          });
        } else {
          createTable();
        }
      };
      
      const createTable = () => {
        console.log('创建新的Words表...');
        db.run(`CREATE TABLE Words (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          word TEXT NOT NULL,
          meaning TEXT NOT NULL,
          phonetic TEXT,
          phrase TEXT,
          example TEXT,
          morphology TEXT,
          note TEXT,
          level_id TEXT,
          chapter_id TEXT,
          image_path TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`, (err) => {
          if (err) {
            console.error('创建Words表时出错:', err.message);
            process.exit(1);
          }
          
          console.log('Words表创建成功!');
          console.log('----------------------------');
          
          // 开始导入过程
          startImport();
        });
      };
      
      // 执行操作
      dropTableIfNeeded();
    });
  });
}

// 开始导入流程
function startImport() {
  console.log('开始导入流程...');
  importNextLevel(0);
}

// 逐个导入级别
function importNextLevel(index) {
  if (index >= VOCABULARY_LEVELS.length) {
    finishImport();
    return;
  }
  
  const level = VOCABULARY_LEVELS[index];
  console.log(`\n开始导入级别: ${level.id} (${index + 1}/${VOCABULARY_LEVELS.length})`);
  
  // 检查文件是否存在
  const filePath = path.join(VOCAB_DIR, level.filename);
  if (!fs.existsSync(filePath)) {
    console.error(`错误: 文件 "${filePath}" 不存在, 跳过此级别`);
    importNextLevel(index + 1);
    return;
  }
  
  // 读取并处理JSON文件
  console.log(`读取文件: ${level.filename}...`);
  
  let rawData;
  try {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    rawData = parseJson(fileContent);
    
    if (!rawData) {
      console.error(`无法解析文件 ${level.filename}, 跳过此级别`);
      importNextLevel(index + 1);
      return;
    }
  } catch (err) {
    console.error(`读取文件 ${level.filename} 失败:`, err.message);
    importNextLevel(index + 1);
    return;
  }
  
  // 确保数据是数组
  let wordsList = ensureArray(rawData);
  if (!wordsList || wordsList.length === 0) {
    console.error(`文件 ${level.filename} 中没有找到有效的单词数据`);
    importNextLevel(index + 1);
    return;
  }
  
  console.log(`找到 ${wordsList.length} 个单词, 开始导入过程...`);
  
  // 导入单词
  importWords(level, wordsList, () => {
    // 继续下一个级别
    importNextLevel(index + 1);
  });
}

// 解析JSON, 处理可能的格式问题
function parseJson(content) {
  // 首先尝试标准解析
  try {
    return JSON.parse(content);
  } catch (err) {
    console.log(`标准JSON解析失败: ${err.message}`);
    console.log('尝试修复常见问题...');
    
    // 修复常见问题
    let fixedContent = content
      .replace(/:\s*NaN/g, ': null')
      .replace(/:\s*undefined/g, ': null')
      .replace(/:\s*Infinity/g, ': null')
      .replace(/:\s*-Infinity/g, ': null');
    
    try {
      return JSON.parse(fixedContent);
    } catch (err2) {
      console.error(`修复后仍无法解析: ${err2.message}`);
      
      // 最后尝试使用eval (注意安全风险)
      try {
        console.log('使用高级解析方法...');
        // eslint-disable-next-line no-eval
        return eval('(' + fixedContent + ')');
      } catch (err3) {
        console.error(`所有解析方法都失败: ${err3.message}`);
        return null;
      }
    }
  }
}

// 确保数据是数组形式
function ensureArray(data) {
  if (Array.isArray(data)) {
    return data;
  }
  
  // 如果是对象,尝试找到其中的数组
  if (typeof data === 'object' && data !== null) {
    for (const key in data) {
      if (Array.isArray(data[key])) {
        console.log(`在键 "${key}" 中找到单词数组`);
        return data[key];
      }
    }
  }
  
  // 没有找到数组
  return null;
}

// 清理数据
function sanitizeValue(value) {
  // 处理无效值
  if (value === undefined) return null;
  if (value === null) return null;
  if (value === 'NaN' || Number.isNaN(value)) return null;
  if (value === Infinity || value === -Infinity) return null;
  if (value === 'undefined') return null;
  if (value === '-' || value === '-.') return null;
  
  // 处理字符串特殊值
  if (typeof value === 'string') {
    value = value.trim();
    if (value === '-' || value === '' || value === '.' || value === 'null') {
      return null;
    }
  }
  
  return value;
}

// 导入单词
function importWords(level, wordsList, callback) {
  console.log(`开始导入 ${wordsList.length} 个单词到数据库...`);
  
  // 开始事务
  db.run('BEGIN TRANSACTION', (err) => {
    if (err) {
      console.error('开始导入事务失败:', err.message);
      callback();
      return;
    }
    
    let processed = 0;
    let success = 0;
    let skipped = 0;
    let errors = 0;
    const total = wordsList.length;
    
    // 导入每个单词
    wordsList.forEach((rawWord, index) => {
      // 清理单词数据
      const wordData = {};
      for (const key in rawWord) {
        wordData[key] = sanitizeValue(rawWord[key]);
      }
      
      // 提取字段
      const word = wordData.word || '';
      const meaning = wordData.meaning || '';
      const phonetic = wordData.phonetic || '';
      const phrase = wordData.phrase || null;
      const example = wordData.example || null;
      const morphology = wordData.morphology || null;
      const note = wordData.note || null;
      const image_path = wordData.image_path || null;
      
      // 验证必填字段
      if (!word || !meaning) {
        console.log(`跳过单词 #${index + 1}: 缺少必填字段`);
        processed++;
        skipped++;
        totalSkipped++;
        checkComplete();
        return;
      }
      
      // 生成章节ID (例如: "考研英语第1章")
      const chapterId = wordData.chapter_id 
        ? `${level.id}第${wordData.chapter_id}章` 
        : `${level.id}未分类`;
      
      // 插入单词
      db.run(
        `INSERT INTO Words (word, meaning, phonetic, phrase, example, morphology, note, level_id, chapter_id, image_path) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [word, meaning, phonetic, phrase, example, morphology, note, level.id, chapterId, image_path],
        function(err) {
          processed++;
          
          if (err) {
            console.error(`导入单词 "${word}" 失败:`, err.message);
            errors++;
            totalErrors++;
          } else {
            success++;
            totalImported++;
            
            // 打印进度
            if (success % 100 === 0 || processed === total) {
              const percent = Math.floor((processed / total) * 100);
              console.log(`进度: ${percent}% (${processed}/${total}) - 成功: ${success}, 跳过: ${skipped}, 错误: ${errors}`);
            }
          }
          
          checkComplete();
        }
      );
    });
    
    function checkComplete() {
      if (processed === total) {
        // 完成事务
        db.run('COMMIT', (err) => {
          if (err) {
            console.error('提交事务失败:', err.message);
            db.run('ROLLBACK');
          }
          
          console.log(`级别导入完成! 成功: ${success}, 跳过: ${skipped}, 错误: ${errors}`);
          callback();
        });
      }
    }
  });
}

// 完成导入
function finishImport() {
  console.log('\n----------------------------');
  console.log('所有文件导入完成!');
  console.log(`总计导入: ${totalImported} 个单词`);
  console.log(`总计跳过: ${totalSkipped} 个单词`);
  console.log(`总计错误: ${totalErrors} 个单词`);
  console.log('----------------------------');
  
  // 关闭数据库连接
  db.close((err) => {
    if (err) {
      console.error('关闭数据库连接时出错:', err.message);
    } else {
      console.log('数据库连接已关闭');
    }
    
    console.log('导入过程完成!');
  });
}