const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const { exec } = require('child_process');

// 处理Web上传的文件导入
async function handleWebImport(file, levelId) {
    return new Promise((resolve, reject) => {
        // 将上传的文件保存到临时目录
        const tempDir = path.join(__dirname, 'temp');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir);
        }
        
        const tempFilePath = path.join(tempDir, file.originalname);
        fs.writeFileSync(tempFilePath, file.buffer);
        
        // 调用命令行导入脚本
        exec(`node import_words.js "${tempFilePath}" "${levelId}"`, {
            cwd: __dirname
        }, (error, stdout, stderr) => {
            // 清理临时文件
            fs.unlinkSync(tempFilePath);
            
            if (error) {
                console.error('导入失败:', error);
                console.error('错误输出:', stderr);
                reject(new Error(stderr || error.message));
                return;
            }
            
            // 解析导入结果
            try {
                const result = JSON.parse(stdout);
                resolve(result);
            } catch (e) {
                console.error('解析导入结果失败:', e);
                reject(new Error('无法解析导入结果'));
            }
        });
    });
}

// 命令行导入处理
async function handleCliImport(filePath, levelId) {
    // 原有的命令行导入逻辑
    const db = new sqlite3.Database(path.join(__dirname, 'vocabulary.db'));
    
    try {
        // 读取文件内容
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const words = JSON.parse(fileContent);
        
        // 开始导入
        let importedCount = 0;
        
        for (const word of words) {
            // 处理每个单词的导入
            await new Promise((resolve, reject) => {
                const sql = `INSERT INTO Words (word, phonetic, meaning, level_id, chapter_id) 
                           VALUES (?, ?, ?, ?, ?)`;
                           
                db.run(sql, [
                    word.word,
                    word.phonetic || '',
                    word.meaning || '',
                    levelId,
                    word.chapter || null
                ], function(err) {
                    if (err) {
                        reject(err);
                    } else {
                        importedCount++;
                        resolve();
                    }
                });
            });
        }
        
        return { success: true, importedCount };
    } catch (error) {
        throw error;
    } finally {
        db.close();
    }
}

// 主函数
async function main() {
    // 如果是通过命令行调用
    if (require.main === module) {
        const args = process.argv.slice(2);
        if (args.length < 2) {
            console.error('用法: node import_words.js <文件路径> <级别ID>');
            process.exit(1);
        }
        
        const [filePath, levelId] = args;
        
        try {
            const result = await handleCliImport(filePath, levelId);
            // 输出JSON格式的结果，供Web接口调用时解析
            console.log(JSON.stringify(result));
        } catch (error) {
            console.error(JSON.stringify({
                success: false,
                message: error.message
            }));
            process.exit(1);
        }
    }
}

// 导出函数供Web接口使用
module.exports = {
    handleWebImport,
    handleCliImport
};

// 如果是直接运行此文件，则执行main函数
if (require.main === module) {
    main();
} 