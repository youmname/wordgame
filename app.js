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
			'https://sanjinai.cn:5500',
			'https://175.24.181.59:5500'],
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
    res.header('Access-Control-Allow-Origin', 'http://127.0.0.1:5500');
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
    });
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
app.post('/api/change-password', verifyAdminToken, async (req, res) => {
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
    if (!['user', 'vip', 'admin'].includes(userType)) {
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
    const { newPassword } = req.body;
    
    if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({ success: false, message: '密码无效（最少6位）' });
    }
    
    try {
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        
        // 修正字段名为 password_hash
        db.run(
            'UPDATE users SET password_hash = ? WHERE id = ?',
            [hashedPassword, userId],
            function(err) {
                if (err) {
                    console.error('重置密码失败:', err);
                    return res.status(500).json({ success: false, message: '数据库错误' });
                }
                res.json({ success: true, message: '密码重置成功' });
            }
        );
    } catch (error) {
        console.error('密码加密失败:', error);
        res.status(500).json({ success: false, message: '密码加密失败' });
    }
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
    console.log('处理 /api/chapters 请求'); // 添加日志
    db.all('SELECT * FROM Chapters ORDER BY order_num', [], (err, rows) => {
        if (err) {
            console.error('数据库查询章节失败:', err.message);
            // 错误时返回标准格式
            return res.status(500).json({
                success: false,
                message: '数据库查询错误',
                error: err.message
            });
        }

        console.log(`数据库成功返回 ${rows ? rows.length : 0} 条章节数据`);
        // --- 修改这里，返回包含 success 和 chapters 的对象 ---
        res.json({
            success: true,
            chapters: rows || [] // 将数组放在 chapters 字段里
        });
        // --- 修改结束 ---
    });
});

// 获取特定章节的所有单词路由
app.get('/api/chapters/:chapterId/words', (req, res) => {
    const chapterId = req.params.chapterId;
    
    db.all('SELECT * FROM Words WHERE chapter_id = ?', [chapterId], (err, rows) => {
        if (err) {
            console.error(`查询章节 ${chapterId} 的单词失败:`, err.message);
            res.status(500).json({ error: '查询单词失败' });
        } else {
            console.log(`成功查询到章节 ${chapterId} 的 ${rows.length} 个单词`);
            res.json(rows);
        }
    });
});

// 已有的路由：
// 1. 基础测试 GET /
// 2. 用户登录 POST /api/login
// 3. 修改密码 POST /api/change-password
// 4. 创建用户 POST /api/admin/create-user
// 5. 获取用户列表 GET /api/admin/users
// 6. 获取章节 GET /api/chapters
// 7. 获取章节单词 GET /api/chapters/:chapterId/words
// 8. Token验证 POST /api/verify-token

// 需要添加的补充路由：

// 1. 退出登录路由
app.post('/api/logout', (req, res) => {
    res.json({
        success: true,
        message: '退出登录成功'
    });
});

// 2. 删除用户路由
app.delete('/api/admin/users/:userId', verifyAdminToken, (req, res) => {
    const userId = req.params.userId;
    
    // 防止删除自己
    if (userId === req.user.userId) {
        return res.status(400).json({
            success: false,
            message: '不能删除当前登录的管理员账号'
        });
    }

    const sql = 'DELETE FROM Users WHERE id = ?';
    db.run(sql, [userId], (err) => {
        if (err) {
            console.error('删除用户错误:', err);
            return res.status(500).json({
                success: false,
                message: '删除用户失败'
            });
        }
        
        res.json({
            success: true,
            message: '用户删除成功'
        });
    });
});

// 3. 更新用户信息路由
app.put('/api/admin/users/:userId', verifyAdminToken, async (req, res) => {
    const userId = req.params.userId;
    const { username, email, userType } = req.body;
    
    try {
        const sql = `
            UPDATE Users 
            SET username = ?, 
                email = ?, 
                user_type = ?
            WHERE id = ?
        `;
        
        db.run(sql, [username, email, userType, userId], (err) => {
            if (err) {
                console.error('更新用户信息错误:', err);
                return res.status(500).json({
                    success: false,
                    message: '更新用户信息失败'
                });
            }
            
            res.json({
                success: true,
                message: '用户信息更新成功'
            });
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: '服务器错误'
        });
    }
});

// 4. 重置用户密码路由
app.post('/api/admin/users/:userId/reset-password', verifyAdminToken, async (req, res) => {
    const userId = req.params.userId;
    const { newPassword } = req.body;
    
    try {
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        
        const sql = 'UPDATE Users SET password_hash = ? WHERE id = ?';
        db.run(sql, [hashedPassword, userId], (err) => {
            if (err) {
                console.error('重置密码错误:', err);
                return res.status(500).json({
                    success: false,
                    message: '重置密码失败'
                });
            }
            
            res.json({
                success: true,
                message: '密码重置成功'
            });
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: '服务器错误'
        });
    }
});

// 5. 获取用户详细信息路由
app.get('/api/admin/users/:userId', verifyAdminToken, (req, res) => {
    const userId = req.params.userId;
    
    const sql = `
        SELECT id, username, email, user_type, created_at, last_login 
        FROM Users 
        WHERE id = ?
    `;
    
    db.get(sql, [userId], (err, user) => {
        if (err) {
            console.error('获取用户详情错误:', err);
            return res.status(500).json({
                success: false,
                message: '获取用户详情失败'
            });
        }
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: '用户不存在'
            });
        }
        
        res.json({
            success: true,
            user
        });
    });
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