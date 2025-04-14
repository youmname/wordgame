// database/triggers/manager-triggers.js

const TriggerManager = require('./trigger-manager');

class ManagerTriggers {
  constructor(db) {
    this.triggerManager = new TriggerManager(db);
    this.db = db;
  }

  // 系统维护方法
  async maintainSystem() {
    try {
      // 1. 检查数据一致性
      await this.checkDataConsistency();
      
      // 2. 清理无效数据
      await this.cleanupInvalidData();
      
      // 3. 优化性能
      await this.optimizePerformance();
      
      console.log('系统维护完成');
    } catch (error) {
      console.error('系统维护失败:', error);
      throw error;
    }
  }

  // 检查数据一致性
  async checkDataConsistency() {
    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        // 检查级别和章节的关系
        this.db.all(`
          SELECT DISTINCT w.level_id, w.chapter_id
          FROM Words w
          LEFT JOIN Categories c ON w.level_id = c.id
          LEFT JOIN Chapters ch ON w.chapter_id = ch.id
          WHERE c.id IS NULL OR ch.id IS NULL
        `, (err, rows) => {
          if (err) {
            reject(err);
            return;
          }
          
          if (rows.length > 0) {
            console.log('发现不一致的数据:', rows);
            // 这里可以添加修复逻辑
          }
          
          resolve();
        });
      });
    });
  }

  // 清理无效数据
  async cleanupInvalidData() {
    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        // 开始事务
        this.db.run('BEGIN TRANSACTION');
        
        try {
          // 清理空章节
          this.db.run(`
            DELETE FROM Chapters 
            WHERE NOT EXISTS (
              SELECT 1 FROM Words 
              WHERE Words.chapter_id = Chapters.id
            )
          `);
          
          // 清理空级别
          this.db.run(`
            DELETE FROM Categories 
            WHERE NOT EXISTS (
              SELECT 1 FROM Words 
              WHERE Words.level_id = Categories.id
            )
          `);
          
          // 提交事务
          this.db.run('COMMIT');
          console.log('无效数据清理完成');
          resolve();
        } catch (error) {
          // 回滚事务
          this.db.run('ROLLBACK');
          reject(error);
        }
      });
    });
  }

  // 优化性能
  async optimizePerformance() {
    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        // 重新组织表
        this.db.run('VACUUM', (err) => {
          if (err) {
            reject(err);
            return;
          }
          
          // 重新分析统计信息
          this.db.run('ANALYZE', (err) => {
            if (err) {
              reject(err);
              return;
            }
            
            console.log('性能优化完成');
            resolve();
          });
        });
      });
    });
  }

  // 触发器管理方法
  async manageTriggers() {
    try {
      // 1. 检查现有触发器
      const triggers = await this.triggerManager.listTriggers();
      console.log('当前触发器:', triggers);
      
      // 2. 设置所有触发器
      await this.triggerManager.setupAllTriggers();
      
      // 3. 验证触发器状态
      await this.verifyTriggers();
      
      console.log('触发器管理完成');
    } catch (error) {
      console.error('触发器管理失败:', error);
      throw error;
    }
  }

  // 验证触发器状态
  async verifyTriggers() {
    return new Promise((resolve, reject) => {
      this.db.all(`
        SELECT name, sql FROM sqlite_master 
        WHERE type='trigger'
      `, (err, rows) => {
        if (err) {
          reject(err);
          return;
        }
        
        console.log('触发器验证结果:', rows);
        resolve();
      });
    });
  }

  // 数据管理方法
  async manageData() {
    try {
      // 1. 检查数据完整性
      await this.checkDataIntegrity();
      
      // 2. 修复数据问题
      await this.fixDataIssues();
      
      // 3. 生成数据报告
      await this.generateDataReport();
      
      console.log('数据管理完成');
    } catch (error) {
      console.error('数据管理失败:', error);
      throw error;
    }
  }

  // 检查数据完整性
  async checkDataIntegrity() {
    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        // 检查必填字段
        this.db.all(`
          SELECT COUNT(*) as count 
          FROM Words 
          WHERE word IS NULL OR meaning IS NULL
        `, (err, rows) => {
          if (err) {
            reject(err);
            return;
          }
          
          if (rows[0].count > 0) {
            console.log(`发现 ${rows[0].count} 条数据缺少必填字段`);
          }
          
          resolve();
        });
      });
    });
  }

  // 修复数据问题
  async fixDataIssues() {
    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        // 开始事务
        this.db.run('BEGIN TRANSACTION');
        
        try {
          // 修复空字段
          this.db.run(`
            UPDATE Words 
            SET word = '未知单词' 
            WHERE word IS NULL
          `);
          
          this.db.run(`
            UPDATE Words 
            SET meaning = '未知含义' 
            WHERE meaning IS NULL
          `);
          
          // 提交事务
          this.db.run('COMMIT');
          console.log('数据修复完成');
          resolve();
        } catch (error) {
          // 回滚事务
          this.db.run('ROLLBACK');
          reject(error);
        }
      });
    });
  }

  // 生成数据报告
  async generateDataReport() {
    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        // 获取统计数据
        this.db.all(`
          SELECT 
            COUNT(*) as total_words,
            COUNT(DISTINCT level_id) as total_levels,
            COUNT(DISTINCT chapter_id) as total_chapters
          FROM Words
        `, (err, stats) => {
          if (err) {
            reject(err);
            return;
          }
          
          console.log('数据统计报告:', stats[0]);
          resolve();
        });
      });
    });
  }
}

module.exports = ManagerTriggers;