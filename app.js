// 导入必要的模块
const express = require('express');
const https = require('https');
const fs = require('fs');
const cors = require('cors');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// JWT密钥配置 - 建议使用环境变量存储，这里使用示例密钥
const JWT_SECRET = 'vocabulary_game_secret_key_2024!@#$%';  // 实际部署时请修改为更复杂的密钥

// 修改CORS配置
const corsOptions = {
    origin: ['http://127.0.0.1:5500', 
			'http://localhost:5500',
			'https://175.24.181.59:5500',

			'https://175.24.181.59:5000',
			'http://175.24.181.59:5000',
            
			'http://175.24.181.59',
			'https://175.24.181.59',
			'https://sanjinai.cn',
			'http://sanjinai.cn',
			'https://www.sanjinai.cn',
			'http://www.sanjinai.cn',
			'null'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
        'Content-Type', 
        'Authorization', 
        'Origin',
        'X-Requested-With',
        'Accept',
        'Access-Control-Allow-Origin'
    ],
    credentials: true,
    optionsSuccessStatus: 200
};

// 创建Express应用
const app = express();

// 添加一个全局的中间件来处理CORS
app.use((req, res, next) => {
    const origin = req.headers.origin;
    
    if (corsOptions.origin.includes(origin)) {
        res.header('Access-Control-Allow-Origin', origin);
    }
    
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Origin, X-Requested-With, Accept');
    res.header('Access-Control-Allow-Credentials', 'true');
    
    next();
});

app.use(cors(corsOptions));// 启用跨域请求
// 配置中间件
//app.use(cors());  
app.use(bodyParser.json());  // 解析JSON请求体
app.use(bodyParser.urlencoded({ extended: true }));  // 解析URL编码的请求体

// 添加OPTIONS请求处理
app.options('*', cors(corsOptions));

// 数据库配置
const dbPath = 'D:\\vocabulary-project\\database\\vocabulary.db';
console.log(`连接数据库：${dbPath}`);

// 创建数据库连接
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('无法连接到数据库:', err.message);
        process.exit(1);
    }
    console.log('已成功连接到SQLite数据库');

    // 初始化数据库表结构
    initializeDatabase();
});

// 数据库初始化函数
const initializeDatabase = () => {
    // 创建Users表（如果不存在）
    const createUsersTable = `
        CREATE TABLE IF NOT EXISTS Users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            user_type TEXT NOT NULL,
            email TEXT UNIQUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_login TIMESTAMP
        )
    `;

    db.run(createUsersTable, (err) => {
        if (err) {
            console.error('创建Users表失败:', err);
            return;
        }
        console.log('Users表检查/创建成功');

        // 检查是否存在管理员账号
        checkAndCreateAdmin();
    });
    
    // 创建VocabularyLevels表（如果不存在）
    const createVocabularyLevelsTable = `
        CREATE TABLE IF NOT EXISTS VocabularyLevels (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            description TEXT,
            order_num INTEGER NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `;
    
    db.run(createVocabularyLevelsTable, (err) => {
        if (err) {
            console.error('创建VocabularyLevels表失败:', err);
            return;
        }
        console.log('VocabularyLevels表检查/创建成功');
        
        // 检查并添加默认的词汇级别
        checkAndCreateDefaultVocabularyLevels();
    });
    
    // 创建Chapters表（如果不存在，或者修改现有表）
    const checkAndUpdateChaptersTable = `
        CREATE TABLE IF NOT EXISTS Chapters_New (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT,
            order_num INTEGER NOT NULL,
            level_id INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (level_id) REFERENCES VocabularyLevels(id)
        )
    `;
    
    db.run(checkAndUpdateChaptersTable, (err) => {
        if (err) {
            console.error('创建新Chapters表失败:', err);
            return;
        }
        
        // 检查是否需要迁移数据
        db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='Chapters'", [], (err, table) => {
            if (err) {
                console.error('检查Chapters表失败:', err);
                return;
            }
            
            if (table) {
                // 如果原表存在，检查是否有level_id列
                db.get("PRAGMA table_info(Chapters)", [], (err, columns) => {
                    if (err) {
                        console.error('获取Chapters表结构失败:', err);
                        return;
                    }
                    
                    // 检查是否已有level_id列
                    const hasLevelId = columns && columns.some(col => col.name === 'level_id');
                    
                    if (!hasLevelId) {
                        console.log('需要迁移Chapters表数据...');
                        db.serialize(() => {
                            // 1. 获取考研级别ID
                            db.get("SELECT id FROM VocabularyLevels WHERE name='考研英语'", [], (err, levelRow) => {
                                if (err || !levelRow) {
                                    console.error('获取考研级别ID失败:', err);
                                    return;
                                }
                                
                                const kaoyanLevelId = levelRow.id;
                                
                                // 2. 迁移数据到新表
                                db.run(`
                                    INSERT INTO Chapters_New (id, name, description, order_num, level_id, created_at)
                                    SELECT id, name, description, order_num, ${kaoyanLevelId}, 
                                           COALESCE(created_at, CURRENT_TIMESTAMP)
                                    FROM Chapters
                                `, [], (err) => {
                                    if (err) {
                                        console.error('迁移Chapters数据失败:', err);
                                        return;
                                    }
                                    
                                    // 3. 重命名表
                                    db.run('DROP TABLE IF EXISTS Chapters_Old', [], (err) => {
                                        if (err) {
                                            console.error('删除旧备份表失败:', err);
                                            return;
                                        }
                                        
                                        db.run('ALTER TABLE Chapters RENAME TO Chapters_Old', [], (err) => {
                                            if (err) {
                                                console.error('重命名旧表失败:', err);
                                                return;
                                            }
                                            
                                            db.run('ALTER TABLE Chapters_New RENAME TO Chapters', [], (err) => {
                                                if (err) {
                                                    console.error('重命名新表失败:', err);
                                                    return;
                                                }
                                                
                                                console.log('Chapters表结构更新和数据迁移成功');
                                            });
                                        });
                                    });
                                });
                            });
                        });
                    } else {
                        console.log('Chapters表已包含level_id字段，无需迁移');
                        // 删除临时表
                        db.run('DROP TABLE IF EXISTS Chapters_New');
                    }
                });
            } else {
                // 如果原表不存在，重命名新表
                db.run('ALTER TABLE Chapters_New RENAME TO Chapters', (err) => {
                    if (err) {
                        console.error('重命名Chapters表失败:', err);
                        return;
                    }
                    console.log('已创建新的Chapters表');
                });
            }
        });
    });
    
    // 确保Words表有正确的结构
    const createWordsTable = `
        CREATE TABLE IF NOT EXISTS Words (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            word TEXT NOT NULL,
            definition TEXT NOT NULL,
            phonetic TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `;
    
    db.run(createWordsTable, (err) => {
        if (err) {
            console.error('创建/检查Words表失败:', err);
            return;
        }
        console.log('Words表检查/创建成功');
        
        // 创建WordMappings表
        const createWordMappingsTable = `
            CREATE TABLE IF NOT EXISTS WordMappings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                word_id INTEGER NOT NULL,
                chapter_id INTEGER NOT NULL,
                order_num INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (word_id) REFERENCES Words(id),
                FOREIGN KEY (chapter_id) REFERENCES Chapters(id),
                UNIQUE(word_id, chapter_id)
            )
        `;
        
        db.run(createWordMappingsTable, (err) => {
            if (err) {
                console.error('创建WordMappings表失败:', err);
                return;
            }
            console.log('WordMappings表检查/创建成功');
            
            // 检查是否需要迁移Word数据到新结构
            db.get("SELECT COUNT(*) as count FROM Words WHERE chapter_id IS NOT NULL", [], (err, result) => {
                if (err) {
                    console.error('检查Words表数据失败:', err);
                    return;
                }
                
                // 如果有旧的带chapter_id的单词数据，需要迁移到WordMappings
                if (result && result.count > 0) {
                    console.log(`需要迁移${result.count}个单词到WordMappings表...`);
                    
                    // 迁移数据到WordMappings表
                    db.run(`
                        INSERT OR IGNORE INTO WordMappings (word_id, chapter_id, order_num)
                        SELECT id, chapter_id, id
                        FROM Words 
                        WHERE chapter_id IS NOT NULL
                    `, [], (err) => {
                        if (err) {
                            console.error('迁移单词数据到WordMappings表失败:', err);
                            return;
                        }
                        console.log('单词数据迁移到WordMappings表成功');
                    });
                } else {
                    console.log('无需迁移Words表数据');
                }
            });
        });
    });
    
    // 创建UserPermissions表（如果不存在）
    const createPermissionsTable = `
        CREATE TABLE IF NOT EXISTS UserPermissions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            category_id INTEGER NOT NULL,
            has_access INTEGER DEFAULT 0 NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id, category_id)
        )
    `;
    
    db.run(createPermissionsTable, (err) => {
        if (err) {
            console.error('创建UserPermissions表失败:', err);
            return;
        }
        console.log('UserPermissions表检查/创建成功');
    });
    
    // 创建UserProgress表（如果不存在）
    const createProgressTable = `
        CREATE TABLE IF NOT EXISTS UserProgress (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            platform TEXT NOT NULL,
            module_type TEXT NOT NULL,
            related_id TEXT NOT NULL,
            progress TEXT,
            last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id, module_type, related_id)
        )
    `;
    
    db.run(createProgressTable, (err) => {
        if (err) {
            console.error('创建UserProgress表失败:', err);
            return;
        }
        console.log('UserProgress表检查/创建成功');
    });
};

// 检查并创建管理员账号
const checkAndCreateAdmin = () => {
    db.get('SELECT * FROM Users WHERE user_type = "admin"', [], (err, row) => {
        if (err) {
            console.error('检查管理员账号失败:', err);
            return;
        }
        
        if (!row) {
            // 如果不存在管理员账号，则创建
            initializeAdmin();
        } else {
            console.log('管理员账号已存在');
        }
        
        // 检查游客账号是否存在
        checkAndCreateGuestAccount();
    });
};

// 检查并创建游客账号
const checkAndCreateGuestAccount = () => {
    db.get('SELECT * FROM Users WHERE username = "guest"', [], (err, row) => {
        if (err) {
            console.error('检查游客账号失败:', err);
            return;
        }
        
        if (!row) {
            // 如果不存在游客账号，则创建
            createGuestAccount();
        } else {
            console.log('游客账号已存在');
        }
    });
};

// 创建游客账号
const createGuestAccount = async () => {
    try {
        const guestPassword = 'guest123';  // 游客账号密码
        const hashedPassword = await bcrypt.hash(guestPassword, 10);
        
        const sql = `
            INSERT INTO Users (
                username,
                password_hash,
                user_type,
                email,
                created_at
            ) VALUES (
                'guest',
                ?,
                'guest',
                'guest@example.com',
                CURRENT_TIMESTAMP
            )
        `;
        
        db.run(sql, [hashedPassword], (err) => {
            if (err) {
                console.error('创建游客账号失败:', err);
            } else {
                console.log('游客账号创建成功，账号: guest, 密码: guest123');
                
                // 为游客账号添加前5个章节的权限
                db.all('SELECT id FROM Chapters ORDER BY id LIMIT 5', [], (err, chapters) => {
                    if (err) {
                        console.error('获取章节列表失败:', err);
                        return;
                    }
                    
                    // 获取游客账号ID
                    db.get('SELECT id FROM Users WHERE username = "guest"', [], (err, user) => {
                        if (err || !user) {
                            console.error('获取游客账号ID失败:', err);
                            return;
                        }
                        
                        // 为每个章节添加权限
                        chapters.forEach(chapter => {
                            db.run('INSERT INTO UserPermissions (user_id, category_id, has_access, created_at) VALUES (?, ?, 1, CURRENT_TIMESTAMP)',
                                [user.id, chapter.id],
                                err => {
                                    if (err) console.error(`为游客账号添加章节${chapter.id}权限失败:`, err);
                                    else console.log(`为游客账号添加章节${chapter.id}权限成功`);
                                });
                        });
                    });
                });
            }
        });
    } catch (error) {
        console.error('创建游客账号时发生错误:', error);
    }
};

// 创建初始管理员账号
const initializeAdmin = async () => {
    try {
        const adminPassword = 'admin';  // 初始管理员密码
        const hashedPassword = await bcrypt.hash(adminPassword, 10);
        
        const sql = `
            INSERT INTO Users (
                username,
                password_hash,
                user_type,
                email,
                created_at
            ) VALUES (
                'admin',
                ?,
                'admin',
                'admin@example.com',
                CURRENT_TIMESTAMP
            )
        `;
        
        db.run(sql, [hashedPassword], (err) => {
            if (err) {
                console.error('创建管理员账号失败:', err);
            } else {
                console.log('管理员账号创建成功，初始密码为: admin');
            }
        });
    } catch (error) {
        console.error('创建管理员账号时发生错误:', error);
    }
};

// 验证Token的中间件
const authenticateToken = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        return res.status(401).json({
            success: false,
            message: '未提供认证token'
        });
    }
    
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        console.log('[authenticateToken] 验证通过，用户ID:', decoded.userId);
        req.user = decoded;
        next();
    } catch (error) {
        console.error('[authenticateToken] 验证失败:', error.message);
        res.status(401).json({
            success: false,
            message: 'token无效或已过期'
        });
    }
};

// 验证管理员Token的中间件
const verifyAdminToken = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        return res.status(401).json({
            success: false,
            message: '未提供认证token'
        });
    }
    
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        console.log('[verifyAdminToken] Decoded Token:', decoded);
        if (decoded.userType !== 'admin') {
            console.log(`[verifyAdminToken] Permission denied: User type is '${decoded.userType}', not 'admin'.`);
            return res.status(403).json({
                success: false,
                message: '需要管理员权限'
            });
        }
        req.user = decoded;
        next();
    } catch (error) {
        res.status(401).json({
            success: false,
            message: 'token无效或已过期'
        });
    }
};

// Token验证路由
app.post('/api/verify-token', async (req, res) => {
    // 从请求头获取token
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({
            success: false,
            message: '未提供token'
        });
    }
    
    try {
        // 验证token
        const decoded = jwt.verify(token, JWT_SECRET);
        
        // 查询用户是否存在
        const sql = 'SELECT id, username, user_type FROM Users WHERE id = ?';
        
        db.get(sql, [decoded.userId], (err, user) => {
            if (err) {
                return res.status(500).json({
                    success: false,
                    message: '服务器错误'
                });
            }
            
            if (!user) {
                return res.status(401).json({
                    success: false,
                    message: '用户不存在'
                });
            }
            
            // 返回验证成功
            res.json({
                success: true,
                user: {
                    id: user.id,
                    username: user.username,
                    userType: user.user_type
                }
            });
        });
    } catch (error) {
        // token无效或过期
        res.status(401).json({
            success: false,
            message: 'token无效或已过期'
        });
    }
});

// API路由定义
// 基础测试路由
app.get('/', (req, res) => {
    res.json({ message: 'API 服务器正常运行!' });
});

// 用户登录路由
app.post('/api/login', (req, res) => {
    const { account, password } = req.body;
    
    if (!account || !password) {
        return res.status(400).json({ success: false, message: '账号和密码不能为空' });
    }
    
    // 查询用户
    const sql = 'SELECT * FROM users WHERE username = ? OR email = ?';
    db.get(sql, [account, account], async (err, user) => {
        if (err) {
            console.error('登录查询错误:', err);
            return res.status(500).json({ success: false, message: '服务器错误' });
        }
        
        if (!user) {
            return res.status(401).json({ success: false, message: '账号或密码错误' });
        }
        
        try {
            // 验证密码 - 修正字段名为 password_hash
            const isMatch = await bcrypt.compare(password, user.password_hash);
            
            if (!isMatch) {
                return res.status(401).json({ success: false, message: '账号或密码错误' });
            }
            
            // 生成JWT token
            const token = jwt.sign(
                {
                    userId: user.id,
                    username: user.username,
                    userType: user.user_type
                },
                JWT_SECRET,
                { expiresIn: '24h' }
            );
            
            // 更新最后登录时间
            db.run('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?', [user.id]);
            
            res.json({
                success: true,
                token: token,
                user: {
                    id: user.id,
                    username: user.username,
                    userType: user.user_type,
                    email: user.email
                }
            });
        } catch (error) {
            console.error('密码验证错误:', error);
            res.status(500).json({ success: false, message: '服务器错误' });
        }
    });
});

// 修改密码
app.post('/api/change-password', authenticateToken, async (req, res) => {
    const { oldPassword, newPassword } = req.body;
    
    if (!oldPassword || !newPassword) {
        return res.status(400).json({ success: false, message: '旧密码和新密码不能为空' });
    }
    
    if (newPassword.length < 6) {
        return res.status(400).json({ success: false, message: '新密码不能少于6个字符' });
    }
    
    try {
        // 获取当前用户
        db.get('SELECT * FROM users WHERE id = ?', [req.user.userId], async (err, user) => {
            if (err) {
                return res.status(500).json({ success: false, message: '服务器错误' });
            }
            
            if (!user) {
                return res.status(404).json({ success: false, message: '用户不存在' });
            }
            
            // 验证旧密码
            const isMatch = await bcrypt.compare(oldPassword, user.password_hash);
            
            if (!isMatch) {
                return res.status(401).json({ success: false, message: '旧密码错误' });
            }
            
            // 加密新密码
            const hashedPassword = await bcrypt.hash(newPassword, 10);
            
            // 更新密码
            db.run(
                'UPDATE users SET password_hash = ? WHERE id = ?',
                [hashedPassword, req.user.userId],
                function(err) {
                    if (err) {
                        return res.status(500).json({ success: false, message: '更新密码失败' });
                    }
                    
                    res.json({ success: true, message: '密码修改成功' });
                }
            );
        });
    } catch (error) {
        console.error('修改密码错误:', error);
        res.status(500).json({ success: false, message: '服务器错误' });
    }
});

// 创建新用户路由（仅管理员可用）
app.post('/api/admin/create-user', verifyAdminToken, async (req, res) => {
    const { username, email, password, userType } = req.body;
    
    // 参数校验
    if (!username || !email || !password || !userType) {
        return res.status(400).json({ success: false, message: '缺少必要参数' });
    }
    
    // 合法性检查：确保用户类型有效
    if (!['user', 'vip', 'admin', 'guest'].includes(userType)) {
        return res.status(400).json({ success: false, message: '无效的用户类型' });
    }
    
    try {
        // 检查用户是否已存在
        db.get('SELECT * FROM users WHERE username = ? OR email = ?', [username, email], async (err, user) => {
            if (err) {
                console.error('查询用户失败:', err);
                return res.status(500).json({ success: false, message: '数据库错误' });
            }
            
            if (user) {
                return res.status(400).json({ success: false, message: '用户名或邮箱已存在' });
            }
            
            // 哈希密码
            const hashedPassword = await bcrypt.hash(password, 10);
            
            // 插入新用户 - 修正字段名为 password_hash
            db.run(
                'INSERT INTO users (username, email, password_hash, user_type) VALUES (?, ?, ?, ?)',
                [username, email, hashedPassword, userType],
                function(err) {
                    if (err) {
                        console.error('创建用户失败:', err);
                        return res.status(500).json({ success: false, message: '数据库错误' });
                    }
                    
                    console.log('用户创建成功:', username, userType);
                    res.json({ 
                        success: true,
                        message: '用户创建成功'
                    });
                }
            );
        });
    } catch (error) {
        console.error('创建用户异常:', error);
        res.status(500).json({ success: false, message: '服务器错误' });
    }
});

// 删除用户
app.delete('/api/admin/users/:userId', verifyAdminToken, (req, res) => {
    const userId = req.params.userId;
    
    // 防止删除自己
    if (userId === req.user.userId) {
        return res.status(400).json({ success: false, message: '不能删除当前登录的管理员' });
    }
    
    db.run('DELETE FROM users WHERE id = ?', [userId], function(err) {
        if (err) {
            console.error('删除用户失败:', err);
            return res.status(500).json({ success: false, message: '数据库错误' });
        }
        res.json({ success: true });
    });
});

// 重置用户密码
app.post('/api/admin/users/:userId/reset-password', verifyAdminToken, async (req, res) => {
    const userId = req.params.userId;
    // 使用默认密码123456
    const defaultPassword = '123456';
    
    try {
        const hashedPassword = await bcrypt.hash(defaultPassword, 10);
        
        // 修正字段名为 password_hash
        db.run(
            'UPDATE users SET password_hash = ? WHERE id = ?',
            [hashedPassword, userId],
            function(err) {
                if (err) {
                    console.error('重置密码失败:', err);
                    return res.status(500).json({ success: false, message: '数据库错误' });
                }
                res.json({ success: true, message: '密码重置成功为123456' });
            }
        );
    } catch (error) {
        console.error('密码加密失败:', error);
        res.status(500).json({ success: false, message: '密码加密失败' });
    }
});

// 修改用户类型
app.post('/api/admin/users/:userId/change-type', verifyAdminToken, (req, res) => {
    const userId = req.params.userId;
    const { userType } = req.body;
    
    // 验证用户类型
    if (!['user', 'vip', 'admin', 'guest'].includes(userType)) {
        return res.status(400).json({ success: false, message: '无效的用户类型' });
    }
    
    // 防止修改自己的类型
    if (userId === req.user.userId) {
        return res.status(400).json({ success: false, message: '不能修改当前登录的管理员账号类型' });
    }
    
    db.run(
        'UPDATE Users SET user_type = ? WHERE id = ?',
        [userType, userId],
        function(err) {
            if (err) {
                console.error('修改用户类型失败:', err);
                return res.status(500).json({ success: false, message: '数据库错误' });
            }
            
            // 如果修改为VIP用户或普通用户，确保所有章节都有访问权限
            if (userType === 'vip' || userType === 'user') {
                // 查询所有章节
                db.all('SELECT id FROM Categories', [], (err, categories) => {
                    if (err) {
                        console.error('获取章节列表失败:', err);
                        return;
                    }
                    
                    // 为每个章节添加权限
                    categories.forEach(category => {
                        // 检查是否已有权限记录
                        db.get('SELECT * FROM UserPermissions WHERE user_id = ? AND category_id = ?',
                            [userId, category.id],
                            (err, permission) => {
                                if (err) {
                                    console.error('查询权限失败:', err);
                                    return;
                                }
                                
                                if (permission) {
                                    // 更新现有权限
                                    db.run('UPDATE UserPermissions SET has_access = 1 WHERE user_id = ? AND category_id = ?',
                                        [userId, category.id],
                                        err => {
                                            if (err) console.error('更新权限失败:', err);
                                        });
                                } else {
                                    // 创建新权限
                                    db.run('INSERT INTO UserPermissions (user_id, category_id, has_access) VALUES (?, ?, 1)',
                                        [userId, category.id],
                                        err => {
                                            if (err) console.error('创建权限失败:', err);
                                        });
                                }
                            });
                    });
                });
            } else if (userType === 'guest') {
                // 对于游客用户，只允许访问前5个章节
                db.all('SELECT id FROM Categories ORDER BY id LIMIT 5', [], (err, limitedCategories) => {
                    if (err) {
                        console.error('获取章节列表失败:', err);
                        return;
                    }
                    
                    // 先重置所有权限
                    db.run('UPDATE UserPermissions SET has_access = 0 WHERE user_id = ?', [userId], err => {
                        if (err) {
                            console.error('重置权限失败:', err);
                            return;
                        }
                        
                        // 为前5个章节添加权限
                        limitedCategories.forEach(category => {
                            db.get('SELECT * FROM UserPermissions WHERE user_id = ? AND category_id = ?',
                                [userId, category.id],
                                (err, permission) => {
                                    if (err) {
                                        console.error('查询权限失败:', err);
                                        return;
                                    }
                                    
                                    if (permission) {
                                        // 更新现有权限
                                        db.run('UPDATE UserPermissions SET has_access = 1 WHERE user_id = ? AND category_id = ?',
                                            [userId, category.id],
                                            err => {
                                                if (err) console.error('更新权限失败:', err);
                                            });
                                    } else {
                                        // 创建新权限
                                        db.run('INSERT INTO UserPermissions (user_id, category_id, has_access) VALUES (?, ?, 1)',
                                            [userId, category.id],
                                            err => {
                                                if (err) console.error('创建权限失败:', err);
                                            });
                                    }
                                });
                        });
                    });
                });
            }
            
            res.json({ success: true, message: '用户类型修改成功' });
        }
    );
});

// 获取用户权限
app.get('/api/users/:userId/permissions', (req, res) => {
    const userId = req.params.userId;
    
    db.all('SELECT * FROM UserPermissions WHERE user_id = ?', [userId], (err, permissions) => {
        if (err) {
            console.error('获取用户权限失败:', err);
            return res.status(500).json({ success: false, message: '数据库错误' });
        }
        
        res.json({
            success: true,
            permissions
        });
    });
});

// 获取用户列表路由（仅管理员可用）
app.get('/api/admin/users', verifyAdminToken, (req, res) => {
    const sql = 'SELECT id, username, email, user_type, created_at, last_login FROM Users';
    
    db.all(sql, [], (err, users) => {
        if (err) {
            console.error('获取用户列表错误:', err);
            return res.status(500).json({
                success: false,
                message: '获取用户列表失败'
            });
        }
        
        res.json({
            success: true,
            users
        });
    });
});

// 获取所有章节路由
app.get('/api/chapters', (req, res) => {
    console.log('处理 /api/chapters 请求');
    
    // 添加支持level_id过滤
    const levelId = req.query.level_id;
    
    let query = 'SELECT * FROM Chapters';
    let params = [];
    
    if (levelId) {
        query += ' WHERE level_id = ?';
        params.push(levelId);
    }
    
    query += ' ORDER BY order_num';
    
    db.all(query, params, (err, rows) => {
        if (err) {
            console.error('数据库查询章节失败:', err.message);
            return res.status(500).json({
                success: false,
                message: '数据库查询错误',
                error: err.message
            });
        }

        console.log(`数据库成功返回 ${rows ? rows.length : 0} 条章节数据`);
        res.json({
            success: true,
            chapters: rows || []
        });
    });
});

// 获取特定章节的所有单词路由
app.get('/api/chapters/:chapterId/words', (req, res) => {
    const chapterId = req.params.chapterId;
    
    const query = `
        SELECT w.id, w.word, w.definition, w.phonetic, wm.order_num
        FROM Words w
        JOIN WordMappings wm ON w.id = wm.word_id
        WHERE wm.chapter_id = ?
        ORDER BY wm.order_num
    `;
    
    db.all(query, [chapterId], (err, rows) => {
        if (err) {
            console.error(`查询章节 ${chapterId} 的单词失败:`, err.message);
            return res.status(500).json({ 
                success: false, 
                message: '查询单词失败',
                error: err.message 
            });
        }
        
        console.log(`成功查询到章节 ${chapterId} 的 ${rows.length} 个单词`);
        
        // 兼容旧版API，直接返回数组
        res.json(rows);
    });
});

// 获取所有单词级别
app.get('/api/vocabulary-levels', (req, res) => {
    db.all('SELECT * FROM VocabularyLevels ORDER BY order_num', [], (err, rows) => {
        if (err) {
            console.error('获取单词级别失败:', err.message);
            return res.status(500).json({
                success: false,
                message: '数据库查询错误',
                error: err.message
            });
        }
        
        console.log(`数据库成功返回 ${rows ? rows.length : 0} 个单词级别`);
        res.json({
            success: true,
            levels: rows || []
        });
    });
});

// 获取特定级别的所有章节
app.get('/api/vocabulary-levels/:levelId/chapters', (req, res) => {
    const levelId = req.params.levelId;
    
    db.all('SELECT * FROM Chapters WHERE level_id = ? ORDER BY order_num', [levelId], (err, rows) => {
        if (err) {
            console.error(`获取级别 ${levelId} 的章节失败:`, err.message);
            return res.status(500).json({
                success: false,
                message: '数据库查询错误',
                error: err.message
            });
        }
        
        console.log(`数据库成功返回级别 ${levelId} 的 ${rows ? rows.length : 0} 个章节`);
        res.json({
            success: true,
            chapters: rows || []
        });
    });
});

// 创建章节API
app.post('/api/chapters', (req, res) => {
    const { name, description, level_id, order_num } = req.body;
    
    // 验证必要字段
    if (!name || !level_id) {
        return res.status(400).json({
            success: false,
            message: '缺少必要字段（名称或级别ID）'
        });
    }
    
    // 验证级别是否存在
    db.get('SELECT id FROM VocabularyLevels WHERE id = ?', [level_id], (err, level) => {
        if (err) {
            console.error('验证级别错误:', err);
            return res.status(500).json({
                success: false,
                message: '服务器错误'
            });
        }
        
        if (!level) {
            return res.status(400).json({
                success: false,
                message: '指定的级别不存在'
            });
        }
        
        // 如果没有提供排序号，获取下一个顺序值
        if (order_num === undefined || order_num === null) {
            db.get('SELECT MAX(order_num) as max_order FROM Chapters WHERE level_id = ?', [level_id], (err, result) => {
                if (err) {
                    console.error('获取最大排序号错误:', err);
                    return res.status(500).json({
                        success: false,
                        message: '服务器错误'
                    });
                }
                
                const nextOrderNum = (result.max_order || 0) + 1;
                insertChapter(nextOrderNum);
            });
        } else {
            insertChapter(order_num);
        }
    });
    
    // 插入章节
    function insertChapter(orderNum) {
        db.run(
            'INSERT INTO Chapters (name, description, level_id, order_num) VALUES (?, ?, ?, ?)',
            [name, description || '', level_id, orderNum],
            function(err) {
                if (err) {
                    console.error('创建章节错误:', err);
                    return res.status(500).json({
                        success: false,
                        message: '创建章节失败'
                    });
                }
                
                return res.json({
                    success: true,
                    message: '章节创建成功',
                    chapterId: this.lastID
                });
            }
        );
    }
});

// 导入单词API
app.post('/api/import-words', (req, res) => {
    const { chapterId, words } = req.body;
    
    // 验证必要字段
    if (!chapterId || !Array.isArray(words) || words.length === 0) {
        return res.status(400).json({
            success: false,
            message: '缺少必要字段或单词数据无效'
        });
    }
    
    // 验证章节是否存在
    db.get('SELECT id FROM Chapters WHERE id = ?', [chapterId], (err, chapter) => {
        if (err) {
            console.error('验证章节错误:', err);
            return res.status(500).json({
                success: false,
                message: '服务器错误'
            });
        }
        
        if (!chapter) {
            return res.status(400).json({
                success: false,
                message: '指定的章节不存在'
            });
        }
        
        // 开始事务
        db.serialize(() => {
            db.run('BEGIN TRANSACTION');
            
            let importCount = 0;
            let errors = [];
            
            // 依次处理每个单词
            const processNextWord = (index) => {
                if (index >= words.length) {
                    // 所有单词处理完毕，提交事务
                    db.run('COMMIT', (err) => {
                        if (err) {
                            console.error('提交事务错误:', err);
                            return res.status(500).json({
                                success: false,
                                message: '导入单词失败'
                            });
                        }
                        
                        return res.json({
                            success: true,
                            message: '单词导入成功',
                            imported: importCount,
                            errors: errors.length > 0 ? errors : undefined
                        });
                    });
                    return;
                }
                
                const word = words[index];
                
                // 验证单词数据
                if (!word.word || !word.meaning) {
                    errors.push(`跳过第${index + 1}个单词：缺少必要字段`);
                    processNextWord(index + 1);
                    return;
                }
                
                // 检查单词是否已存在
                db.get('SELECT id FROM Words WHERE word = ?', [word.word], (err, existingWord) => {
                    if (err) {
                        console.error('查询单词错误:', err);
                        errors.push(`处理"${word.word}"时出错：${err.message}`);
                        processNextWord(index + 1);
                        return;
                    }
                    
                    let wordId;
                    
                    if (existingWord) {
                        // 更新已存在的单词
                        wordId = existingWord.id;
                        db.run(
                            'UPDATE Words SET meaning = ?, phonetic = ?, example = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                            [word.meaning, word.phonetic || '', word.example || '', wordId],
                            (err) => {
                                if (err) {
                                    console.error('更新单词错误:', err);
                                    errors.push(`更新"${word.word}"失败：${err.message}`);
                                    processNextWord(index + 1);
                                    return;
                                }
                                
                                addWordMapping(wordId, index);
                            }
                        );
                    } else {
                        // 插入新单词
                        db.run(
                            'INSERT INTO Words (word, meaning, phonetic, example, created_at, updated_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)',
                            [word.word, word.meaning, word.phonetic || '', word.example || ''],
                            function(err) {
                                if (err) {
                                    console.error('插入单词错误:', err);
                                    errors.push(`插入"${word.word}"失败：${err.message}`);
                                    processNextWord(index + 1);
                                    return;
                                }
                                
                                wordId = this.lastID;
                                addWordMapping(wordId, index);
                            }
                        );
                    }
                });
                
                // 添加单词与章节的映射关系
                function addWordMapping(wordId, index) {
                    // 获取章节中的最大排序号
                    db.get('SELECT MAX(order_num) as max_order FROM WordMappings WHERE chapter_id = ?', [chapterId], (err, result) => {
                        if (err) {
                            console.error('获取最大排序号错误:', err);
                            errors.push(`为"${words[index].word}"添加映射时出错：${err.message}`);
                            processNextWord(index + 1);
                            return;
                        }
                        
                        const orderNum = (result.max_order || 0) + index + 1;
                        
                        // 检查映射是否已存在
                        db.get('SELECT id FROM WordMappings WHERE word_id = ? AND chapter_id = ?', [wordId, chapterId], (err, mapping) => {
                            if (err) {
                                console.error('查询映射错误:', err);
                                errors.push(`检查"${words[index].word}"映射时出错：${err.message}`);
                                processNextWord(index + 1);
                                return;
                            }
                            
                            if (mapping) {
                                // 更新已有映射
                                db.run(
                                    'UPDATE WordMappings SET order_num = ? WHERE id = ?',
                                    [orderNum, mapping.id],
                                    (err) => {
                                        if (err) {
                                            console.error('更新映射错误:', err);
                                            errors.push(`更新"${words[index].word}"映射时出错：${err.message}`);
                                            processNextWord(index + 1);
                                            return;
                                        }
                                        
                                        importCount++;
                                        processNextWord(index + 1);
                                    }
                                );
                            } else {
                                // 创建新映射
                                db.run(
                                    'INSERT INTO WordMappings (word_id, chapter_id, order_num) VALUES (?, ?, ?)',
                                    [wordId, chapterId, orderNum],
                                    (err) => {
                                        if (err) {
                                            console.error('插入映射错误:', err);
                                            errors.push(`为"${words[index].word}"创建映射时出错：${err.message}`);
                                            processNextWord(index + 1);
                                            return;
                                        }
                                        
                                        importCount++;
                                        processNextWord(index + 1);
                                    }
                                );
                            }
                        });
                    });
                }
            };
            
            // 开始处理第一个单词
            processNextWord(0);
            
        });
    });
});

// 单词搜索API端点
app.get('/api/words/search', (req, res) => {
    const { query, levelId, chapterId } = req.query;
    const page = parseInt(req.query.page) || 1;
    const size = parseInt(req.query.size) || 20;
    const offset = (page - 1) * size;
    
    // 构建查询条件
    let conditions = [];
    let params = [];
    
    if (query) {
        conditions.push('(w.word LIKE ? OR w.definition LIKE ?)');
        params.push(`%${query}%`, `%${query}%`);
    }
    
    if (levelId) {
        conditions.push('c.level_id = ?');
        params.push(levelId);
    }
    
    if (chapterId) {
        conditions.push('wm.chapter_id = ?');
        params.push(chapterId);
    }
    
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    
    // 查询总记录数
    const countSql = `
        SELECT COUNT(DISTINCT w.id) as total
        FROM Words w
        JOIN WordMappings wm ON w.id = wm.word_id
        JOIN Chapters c ON wm.chapter_id = c.id
        ${whereClause}
    `;
    
    // 查询单词数据
    const dataSql = `
        SELECT 
            w.id, w.word, w.phonetic, w.definition, 
            c.id as chapter_id, c.name as chapter_name,
            c.level_id, vl.name as level_name
        FROM Words w
        JOIN WordMappings wm ON w.id = wm.word_id
        JOIN Chapters c ON wm.chapter_id = c.id
        JOIN VocabularyLevels vl ON c.level_id = vl.id
        ${whereClause}
        GROUP BY w.id
        ORDER BY w.word
        LIMIT ? OFFSET ?
    `;
    
    // 执行查询
    db.get(countSql, params, (err, countResult) => {
        if (err) {
            console.error('统计单词数量失败:', err);
            return res.status(500).json({
                success: false,
                message: '查询失败'
            });
        }
        
        const total = countResult ? countResult.total : 0;
        
        // 查询分页数据
        db.all(dataSql, [...params, size, offset], (err, words) => {
            if (err) {
                console.error('查询单词失败:', err);
                return res.status(500).json({
                    success: false,
                    message: '查询失败'
                });
            }
            
            return res.json({
                success: true,
                total,
                page,
                size,
                words: words || []
            });
        });
    });
});

// 单词管理API端点
app.post('/api/words', verifyAdminToken, (req, res) => {
    const { word, phonetic, definition, chapter_id } = req.body;
    
    if (!word || !definition || !chapter_id) {
        return res.status(400).json({
            success: false,
            message: '缺少必要参数'
        });
    }
    
    // 验证章节是否存在
    db.get('SELECT * FROM Chapters WHERE id = ?', [chapter_id], (err, chapter) => {
        if (err || !chapter) {
            return res.status(404).json({
                success: false,
                message: '章节不存在'
            });
        }
        
        // 开始事务
        db.serialize(() => {
            db.run('BEGIN TRANSACTION');
            
            try {
                // 获取最大序号
                db.get('SELECT MAX(order_num) as max_order FROM WordMappings WHERE chapter_id = ?', [chapter_id], (err, result) => {
                    if (err) {
                        throw new Error('获取最大序号失败: ' + err.message);
                    }
                    
                    const nextOrder = (result && result.max_order ? result.max_order : 0) + 1;
                    
                    // 插入单词
                    db.run(
                        'INSERT INTO Words (word, phonetic, definition, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)',
                        [word, phonetic || '', definition],
                        function(err) {
                            if (err) {
                                throw new Error('插入单词失败: ' + err.message);
                            }
                            
                            const wordId = this.lastID;
                            
                            // 创建映射关系
                            db.run(
                                'INSERT INTO WordMappings (word_id, chapter_id, order_num) VALUES (?, ?, ?)',
                                [wordId, chapter_id, nextOrder],
                                err => {
                                    if (err) {
                                        throw new Error('创建映射关系失败: ' + err.message);
                                    }
                                    
                                    // 提交事务
                                    db.run('COMMIT', err => {
                                        if (err) {
                                            throw new Error('提交事务失败: ' + err.message);
                                        }
                                        
                                        return res.json({
                                            success: true,
                                            message: '单词添加成功',
                                            word_id: wordId
                                        });
                                    });
                                }
                            );
                        }
                    );
                });
            } catch (error) {
                // 回滚事务
                db.run('ROLLBACK');
                console.error('添加单词失败:', error);
                
                return res.status(500).json({
                    success: false,
                    message: '添加单词失败: ' + error.message
                });
            }
        });
    });
});

// 更新单词API端点
app.put('/api/words/:id', verifyAdminToken, (req, res) => {
    const wordId = req.params.id;
    const { word, phonetic, definition, chapter_id } = req.body;
    
    if (!word || !definition || !chapter_id) {
        return res.status(400).json({
            success: false,
            message: '缺少必要参数'
        });
    }
    
    // 验证单词是否存在
    db.get('SELECT * FROM Words WHERE id = ?', [wordId], (err, existingWord) => {
        if (err || !existingWord) {
            return res.status(404).json({
                success: false,
                message: '单词不存在'
            });
        }
        
        // 验证章节是否存在
        db.get('SELECT * FROM Chapters WHERE id = ?', [chapter_id], (err, chapter) => {
            if (err || !chapter) {
                return res.status(404).json({
                    success: false,
                    message: '章节不存在'
                });
            }
            
            // 开始事务
            db.serialize(() => {
                db.run('BEGIN TRANSACTION');
                
                try {
                    // 更新单词信息
                    db.run(
                        'UPDATE Words SET word = ?, phonetic = ?, definition = ? WHERE id = ?',
                        [word, phonetic || '', definition, wordId],
                        err => {
                            if (err) {
                                throw new Error('更新单词失败: ' + err.message);
                            }
                            
                            // 先检查映射关系是否存在
                            db.get(
                                'SELECT * FROM WordMappings WHERE word_id = ? AND chapter_id = ?',
                                [wordId, chapter_id],
                                (err, mapping) => {
                                    if (err) {
                                        throw new Error('检查映射关系失败: ' + err.message);
                                    }
                                    
                                    // 如果映射关系不存在，则创建
                                    if (!mapping) {
                                        // 获取最大序号
                                        db.get('SELECT MAX(order_num) as max_order FROM WordMappings WHERE chapter_id = ?', [chapter_id], (err, result) => {
                                            if (err) {
                                                throw new Error('获取最大序号失败: ' + err.message);
                                            }
                                            
                                            const nextOrder = (result && result.max_order ? result.max_order : 0) + 1;
                                            
                                            // 先删除旧的映射关系
                                            db.run(
                                                'DELETE FROM WordMappings WHERE word_id = ?',
                                                [wordId],
                                                err => {
                                                    if (err) {
                                                        throw new Error('删除旧映射关系失败: ' + err.message);
                                                    }
                                                    
                                                    // 创建新的映射关系
                                                    db.run(
                                                        'INSERT INTO WordMappings (word_id, chapter_id, order_num) VALUES (?, ?, ?)',
                                                        [wordId, chapter_id, nextOrder],
                                                        err => {
                                                            if (err) {
                                                                throw new Error('创建新映射关系失败: ' + err.message);
                                                            }
                                                            
                                                            // 提交事务
                                                            db.run('COMMIT', err => {
                                                                if (err) {
                                                                    throw new Error('提交事务失败: ' + err.message);
                                                                }
                                                                
                                                                return res.json({
                                                                    success: true,
                                                                    message: '单词更新成功'
                                                                });
                                                            });
                                                        }
                                                    );
                                                }
                                            );
                                        });
                                    } else {
                                        // 映射关系已存在，直接提交事务
                                        db.run('COMMIT', err => {
                                            if (err) {
                                                throw new Error('提交事务失败: ' + err.message);
                                            }
                                            
                                            return res.json({
                                                success: true,
                                                message: '单词更新成功'
                                            });
                                        });
                                    }
                                }
                            );
                        }
                    );
                } catch (error) {
                    // 回滚事务
                    db.run('ROLLBACK');
                    console.error('更新单词失败:', error);
                    
                    return res.status(500).json({
                        success: false,
                        message: '更新单词失败: ' + error.message
                    });
                }
            });
        });
    });
});

// 删除单词API端点
app.delete('/api/words/:id', verifyAdminToken, (req, res) => {
    const wordId = req.params.id;
    
    // 验证单词是否存在
    db.get('SELECT * FROM Words WHERE id = ?', [wordId], (err, word) => {
        if (err || !word) {
            return res.status(404).json({
                success: false,
                message: '单词不存在'
            });
        }
        
        // 开始事务
        db.serialize(() => {
            db.run('BEGIN TRANSACTION');
            
            try {
                // 先删除映射关系
                db.run('DELETE FROM WordMappings WHERE word_id = ?', [wordId], err => {
                    if (err) {
                        throw new Error('删除映射关系失败: ' + err.message);
                    }
                    
                    // 再删除单词
                    db.run('DELETE FROM Words WHERE id = ?', [wordId], err => {
                        if (err) {
                            throw new Error('删除单词失败: ' + err.message);
                        }
                        
                        // 提交事务
                        db.run('COMMIT', err => {
                            if (err) {
                                throw new Error('提交事务失败: ' + err.message);
                            }
                            
                            return res.json({
                                success: true,
                                message: '单词删除成功'
                            });
                        });
                    });
                });
            } catch (error) {
                // 回滚事务
                db.run('ROLLBACK');
                console.error('删除单词失败:', error);
                
                return res.status(500).json({
                    success: false,
                    message: '删除单词失败: ' + error.message
                });
            }
        });
    });
});

// 验证Token API端点
app.get('/api/verify-token', (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({
            success: false,
            message: '未提供Token'
        });
    }
    
    try {
        // 验证token
        const decoded = jwt.verify(token, JWT_SECRET);
        
        // 检查用户是否存在
        db.get('SELECT id, username, user_type FROM Users WHERE id = ?', [decoded.userId], (err, user) => {
            if (err) {
                console.error('验证Token时查询用户失败:', err);
                return res.status(500).json({
                    success: false,
                    message: '数据库错误'
                });
            }
            
            if (!user) {
                return res.status(401).json({
                    success: false,
                    message: '用户不存在'
                });
            }
            
            return res.json({
                success: true,
                message: 'Token有效',
                user: {
                    id: user.id,
                    username: user.username,
                    userType: user.user_type
                }
            });
        });
    } catch (error) {
        console.error('Token验证失败:', error);
        return res.status(401).json({
            success: false,
            message: 'Token无效或已过期'
        });
    }
});

// HTTPS服务器配置
const options = {
    // 读取SSL证书文件
    key: fs.readFileSync('D:/Certificates/mycert_key.pem'),
    cert: fs.readFileSync('D:/Certificates/mycert_crt.pem')
};

// 设置服务器端口
const PORT = process.env.PORT || 5000;

// 创建并启动HTTPS服务器
https.createServer(options, app).listen(PORT, () => {
    console.log('=================================');
    console.log(`HTTPS 服务器启动成功！`);
    console.log(`运行端口: ${PORT}`);
    console.log(`证书路径: ${options.cert}`);
    console.log(`密钥路径: ${options.key}`);
    console.log('=================================');
});

// 全局错误处理中间件
app.use((err, req, res, next) => {
    console.error('服务器错误:', err.stack);
    res.status(500).json({ 
        success: false,
        message: '服务器内部错误',
        // 在开发环境下可以返回详细错误信息
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// 处理未捕获的异常
process.on('uncaughtException', (err) => {
    console.error('未捕获的异常:', err);
    // 在生产环境中，这里可以添加报警通知等机制
});

// 处理未处理的Promise拒绝
process.on('unhandledRejection', (reason, promise) => {
    console.error('未处理的Promise拒绝:', reason);
    // 在生产环境中，这里可以添加报警通知等机制
});
