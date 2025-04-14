// database/triggers/trigger-manager.js

const config = require('./triggers-config');

class TriggerManager {
  constructor(db) {
    this.db = db;
  }

  // 创建单个触发器
  async createTrigger(table, triggerName, triggerConfig) {
    return new Promise((resolve, reject) => {
      const sql = `
        CREATE TRIGGER IF NOT EXISTS ${triggerName}
        ${triggerConfig.event} ON ${table}
        FOR EACH ROW
        ${triggerConfig.condition ? `WHEN ${triggerConfig.condition}` : ''}
        BEGIN
          ${triggerConfig.action}
        END;
      `;

      console.log('创建触发器的SQL:', sql); // 添加调试日志

      this.db.run(sql, (err) => {
        if (err) {
          console.error(`创建触发器 ${triggerName} 失败:`, err);
          reject(err);
        } else {
          console.log(`触发器 ${triggerName} 创建成功`);
          resolve();
        }
      });
    });
  }

  // 设置所有触发器
  async setupAllTriggers() {
    try {
      // 启用外键约束
      await new Promise((resolve, reject) => {
        this.db.run('PRAGMA foreign_keys = ON', (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      // 遍历所有表的触发器配置
      for (const [table, triggers] of Object.entries(config)) {
        for (const [triggerName, triggerConfig] of Object.entries(triggers)) {
          await this.createTrigger(table, triggerName, triggerConfig);
        }
      }

      console.log('所有触发器设置完成');
    } catch (error) {
      console.error('设置触发器失败:', error);
      throw error;
    }
  }

  // 删除触发器
  async dropTrigger(triggerName) {
    return new Promise((resolve, reject) => {
      this.db.run(`DROP TRIGGER IF EXISTS ${triggerName}`, (err) => {
        if (err) {
          console.error(`删除触发器 ${triggerName} 失败:`, err);
          reject(err);
        } else {
          console.log(`触发器 ${triggerName} 删除成功`);
          resolve();
        }
      });
    });
  }

  // 列出所有触发器
  async listTriggers() {
    return new Promise((resolve, reject) => {
      this.db.all(
        "SELECT name FROM sqlite_master WHERE type='trigger'",
        (err, rows) => {
          if (err) {
            console.error('获取触发器列表失败:', err);
            reject(err);
          } else {
            console.log('当前触发器列表:', rows.map(row => row.name));
            resolve(rows.map(row => row.name));
          }
        }
      );
    });
  }
}

module.exports = TriggerManager;