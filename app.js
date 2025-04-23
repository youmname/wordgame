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

// 导入清理管理器
// const CleanupManager = require('./cleanup-manager');

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
app.use(bodyParser.json({ limit: '50mb' }));  // 解析JSON请求体
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));  // 解析URL编码的请求体

// 添加OPTIONS请求处理
app.options('*', cors(corsOptions));

// 数据库配置
const dbPath = 'D:\\vocabulary-project\\database\\vocabulary.db';
console.log(`连接数据库：${dbPath}`);

// 创建清理管理器实例
// const cleanupManager = new CleanupManager(dbPath);

// // 设置定时清理（每天凌晨2点执行）
// const scheduleCleanup = () => {
//     const now = new Date();
//     const targetTime = new Date(
//         now.getFullYear(),
//         now.getMonth(),
//         now.getDate() + 1, // 明天
//         2, // 2点
//         0, // 0分
//         0  // 0秒
//     );
    
//     const timeUntilTarget = targetTime - now;
    
//     setTimeout(async () => {
//         try {
//             // await cleanupManager.runCleanup(); // This line uses the commented out manager
//             console.log('Cleanup task skipped as manager is commented out.');
//         } catch (error) {
//             console.error('定时清理失败:', error);
//         }
        
//         // 设置下一次清理
//         // scheduleCleanup(); // Don't reschedule if commented out
//     }, timeUntilTarget);
// };

// // 启动定时清理
// // cleanupManager.initLog(); // Uses commented out manager
// // scheduleCleanup(); // Calls commented out function

// 创建数据库连接
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
    if (err) {
        console.error('无法连接到数据库:', err.message);
        process.exit(1);
    }
    console.log('已成功连接到SQLite数据库');

    // 配置数据库连接，增加超时和busy_timeout设置
    db.configure('busyTimeout', 30000); // 30秒超时
    db.run('PRAGMA journal_mode = WAL;'); // 使用WAL模式可以减少锁定
    db.run('PRAGMA synchronous = NORMAL;'); // 降低同步级别可提高性能

    // 初始化数据库表结构
    initializeDatabase();
    
    // 启动定时清理任务
    // scheduleCleanup();
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
    
    // 创建Chapters表（如果不存在）
    const createChaptersTable = `
        CREATE TABLE IF NOT EXISTS Chapters (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT,
            order_num INTEGER NOT NULL,
            level_id INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (level_id) REFERENCES Categories(id)
        )
    `;
    
    db.run(createChaptersTable, (err) => {
        if (err) {
            console.error('创建Chapters表失败:', err);
            return;
        }
        console.log('Chapters表检查/创建成功');
    });
    
    // 确保Words表有正确的结构
    const createWordsTable = `
        CREATE TABLE IF NOT EXISTS Words (
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
        )
    `;
    
    db.run(createWordsTable, (err) => {
        if (err) {
            console.error('创建/检查Words表失败:', err);
            return;
        }
        console.log('Words表检查/创建成功');
        
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

    // 新增进度表事务
    const createUserChapterProgressTable = `
        CREATE TABLE IF NOT EXISTS UserChapterProgress (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            level_id TEXT NOT NULL,
            last_unlocked_order INTEGER NOT NULL,
            last_accessed_order INTEGER NOT NULL,
            PRIMARY KEY (user_id, level_id),
      FOREIGN KEY (user_id) REFERENCES Users(id),
            FOREIGN KEY (level_id) REFERENCES Categories(id)
        )`;

    db.run(createUserChapterProgressTable, (err) => {
        if (err) {
            console.error('创建UserChapterProgress表失败:', err);
        }
        console.log('UserChapterProgress表检查/创建成功');
    });

    // --- 新增：创建 UserPoints 表 ---
    const createUserPointsTable = `
        CREATE TABLE IF NOT EXISTS UserPoints (
            user_id INTEGER PRIMARY KEY,              -- 用户ID (关联 Users 表)
            total_points INTEGER DEFAULT 0 NOT NULL,   -- 当前总积分
            consecutive_login_days INTEGER DEFAULT 0 NOT NULL, -- 连续登录天数
            max_consecutive_login_days INTEGER DEFAULT 0 NOT NULL, -- 历史最大连续登录天数 (新增)
            total_login_days INTEGER DEFAULT 0 NOT NULL,       -- 总登录天数 (新增)
            last_login_date DATE,                      -- 最后登录日期 (存储 YYYY-MM-DD 格式)
            points_multiplier REAL DEFAULT 1.0 NOT NULL, -- 当前积分倍数 (REAL 用于存储小数)
            completed_levels INTEGER DEFAULT 0 NOT NULL, -- 已完成关卡总数
            FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
        );
    `;
    db.run(createUserPointsTable, (err) => {
        if (err) {
            console.error('创建 UserPoints 表失败:', err);
        } else {
            console.log('UserPoints 表检查/创建成功');
            // 创建索引
            const createUserPointsIndex = `
                CREATE INDEX IF NOT EXISTS idx_user_points_user_id ON UserPoints (user_id);
            `;
            db.run(createUserPointsIndex, (err) => {
                if (err) {
                    console.error('创建 UserPoints 表索引失败:', err);
                } else {
                    console.log('UserPoints 表索引创建/检查成功');
                }
            });
        }
    });
    // --- 结束新增 UserPoints 表 ---

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
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

    if (!token) {
        console.log('[authenticateToken] 拒绝访问：未提供 Token');
        return res.status(401).json({ // 直接返回 401
            success: false,
            message: '需要提供认证 Token'
        });
    }
    
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        console.log('[authenticateToken] JWT 验证通过，用户ID:', decoded.userId);
        // 确保证包含了需要的信息，特别是 id 和 type
        req.user = { id: decoded.userId, username: decoded.username, type: decoded.userType };
        next(); // 验证成功，继续处理请求
    } catch (error) {
        console.error('[authenticateToken] JWT 验证失败:', error.message);
        return res.status(401).json({ // Token 无效或过期，返回 401
            success: false,
            message: 'Token 无效或已过期'
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
app.post('/api/verify-token', (req, res) => {
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
            
            // --- 新增：处理登录积分和连续登录 --- 
            const userId = user.id; 
            const todayDate = new Date().toISOString().split('T')[0]; // 获取今天的日期 'YYYY-MM-DD'

            // 查询或创建用户的积分记录
            const getUserPointsSql = 'SELECT * FROM UserPoints WHERE user_id = ?';

            db.get(getUserPointsSql, [userId], (err, userPoints) => {
                if (err) {
                    console.error(`[Login Points] Error fetching UserPoints for user ${userId}:`, err.message);
                    // 出错也继续登录，只记录错误
                    return proceedWithLogin(token, user, res); // 修改：传递 res
                }

                let currentPoints = userPoints ? userPoints.total_points : 0;
                let consecutiveDays = userPoints ? userPoints.consecutive_login_days : 0;
                let maxConsecutiveDays = userPoints ? userPoints.max_consecutive_login_days : 0; // 新增: 获取最大连续天数
                let totalLoginDays = userPoints ? userPoints.total_login_days : 0;             // 新增: 获取总登录天数
                let lastLoginDate = userPoints ? userPoints.last_login_date : null;
                let multiplier = userPoints ? userPoints.points_multiplier : 1.0;
                let completedLevels = userPoints ? userPoints.completed_levels : 0; 

                // 检查是否是新的一天登录
                if (lastLoginDate !== todayDate) {
                    console.log(`[Login Points] User ${userId} first login for today (${todayDate}). Last login: ${lastLoginDate}`);

                    // --- 新增: 总登录天数 +1 ---
                    totalLoginDays += 1;
                    console.log(`[Login Points] User ${userId} total login days updated to: ${totalLoginDays}`);
                    // --- 结束新增 --- 

                    let daysDifference = 1; 
                    if (lastLoginDate) {
                        const lastDate = new Date(lastLoginDate);
                        const today = new Date(todayDate);
                        const diffTime = Math.abs(today - lastDate);
                        daysDifference = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    }

                    // 更新连续登录天数
                    if (daysDifference === 1) {
                        consecutiveDays += 1;
                        console.log(`[Login Points] Consecutive login for user ${userId}. New streak: ${consecutiveDays}`);
                    } else {
                        consecutiveDays = 1; // 中断，重置为1
                        console.log(`[Login Points] Login streak broken for user ${userId}. Resetting to 1.`);
                    }

                    // --- 新增: 更新最大连续登录天数 ---
                    if (consecutiveDays > maxConsecutiveDays) {
                        maxConsecutiveDays = consecutiveDays;
                        console.log(`[Login Points] User ${userId} new max consecutive login days: ${maxConsecutiveDays}`);
                    }
                    // --- 结束新增 ---

                    // --- 阶梯式积分倍数计算 (示例) ---
                    if (consecutiveDays >= 30) { multiplier = 1.5; }
                    else if (consecutiveDays >= 14) { multiplier = 1.3; }
                    else if (consecutiveDays >= 7) { multiplier = 1.2; }
                    else if (consecutiveDays >= 3) { multiplier = 1.1; }
                    else { multiplier = 1.0; }
                    console.log(`[Login Points] User ${userId} new multiplier: ${multiplier}`);
                    // --- 结束倍数计算 ---

                    // 增加登录积分
                    currentPoints += 5;
                    console.log(`[Login Points] Awarded 5 login points to user ${userId}. New total: ${currentPoints}`);

                    // 更新数据库 (使用 INSERT ... ON CONFLICT, 添加新字段)
                    const updateSql = `
                        INSERT INTO UserPoints (
                            user_id, total_points, consecutive_login_days, max_consecutive_login_days, 
                            total_login_days, last_login_date, points_multiplier, completed_levels
                        )
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                        ON CONFLICT(user_id) DO UPDATE SET
                            total_points = excluded.total_points,
                            consecutive_login_days = excluded.consecutive_login_days,
                            max_consecutive_login_days = excluded.max_consecutive_login_days, -- 更新最大值
                            total_login_days = excluded.total_login_days,           -- 更新总数
                            last_login_date = excluded.last_login_date,
                            points_multiplier = excluded.points_multiplier,
                            completed_levels = UserPoints.completed_levels 
                    `;
                    db.run(updateSql, [
                        userId, currentPoints, consecutiveDays, maxConsecutiveDays, 
                        totalLoginDays, todayDate, multiplier, completedLevels
                    ], (updateErr) => {
                        if (updateErr) {
                            console.error(`[Login Points] Error updating UserPoints for user ${userId}:`, updateErr.message);
                        }
                        // 无论更新是否成功，都继续登录流程
                        proceedWithLogin(token, user, res); 
                    });

                } else {
                    console.log(`[Login Points] User ${userId} already logged in today (${todayDate}). No points logic run.`);
                    // 今天已登录过，直接继续
                    proceedWithLogin(token, user, res); 
                }
            });
            // --- 结束新增逻辑 ---

/*
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
*/
        } catch (error) {
            console.error('密码验证错误:', error);
            res.status(500).json({ success: false, message: '服务器错误' });
        }
    });
});

// --- 新增：封装继续登录的逻辑 --- 
function proceedWithLogin(token, user, res) {
    // 确保响应只发送一次
    if (res.headersSent) {
        console.warn(`[Login] Attempted to send response twice for user ${user.id}.`);
        return;
    }
    // 更新 users 表的 last_login (这个是原有的逻辑)
    db.run('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?', [user.id], (err) => {
        if (err) {
            console.error(`[Login] Failed to update last_login for user ${user.id}:`, err.message);
        }
    });

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
}
// --- 结束新增函数 ---

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
                db.all('SELECT id FROM Chapters', [], (err, chapters) => {
                    if (err) {
                        console.error('获取章节列表失败:', err);
                        return;
                    }
                    
                    // 为每个章节添加权限
                    chapters.forEach(chapter => {
                        // 检查是否已有权限记录
                        db.get('SELECT * FROM UserPermissions WHERE user_id = ? AND category_id = ?',
                            [userId, chapter.id],
                            (err, permission) => {
                                if (err) {
                                    console.error('查询权限失败:', err);
                                    return;
                                }
                                
                                if (permission) {
                                    // 更新现有权限
                                    db.run('UPDATE UserPermissions SET has_access = 1 WHERE user_id = ? AND category_id = ?',
                                        [userId, chapter.id],
                                        err => {
                                            if (err) console.error('更新权限失败:', err);
                                        });
                                } else {
                                    // 创建新权限
                                    db.run('INSERT INTO UserPermissions (user_id, category_id, has_access) VALUES (?, ?, 1)',
                                        [userId, chapter.id],
                                        err => {
                                            if (err) console.error('创建权限失败:', err);
                                        });
                                }
                            });
                    });
                });
            } else if (userType === 'guest') {
                // 对于游客用户，只允许访问前5个章节
                db.all('SELECT id FROM Chapters ORDER BY id LIMIT 5', [], (err, limitedChapters) => {
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
                        limitedChapters.forEach(chapter => {
                            db.get('SELECT * FROM UserPermissions WHERE user_id = ? AND category_id = ?',
                                [userId, chapter.id],
                                (err, permission) => {
                                    if (err) {
                                        console.error('查询权限失败:', err);
                                        return;
                                    }
                                    
                                    if (permission) {
                                        // 更新现有权限
                                        db.run('UPDATE UserPermissions SET has_access = 1 WHERE user_id = ? AND category_id = ?',
                                            [userId, chapter.id],
                                            err => {
                                                if (err) console.error('更新权限失败:', err);
                                            });
                                    } else {
                                        // 创建新权限
                                        db.run('INSERT INTO UserPermissions (user_id, category_id, has_access) VALUES (?, ?, 1)',
                                            [userId, chapter.id],
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

// 获取所有章节
app.get('/api/chapters', (req, res) => {
    const levelId = req.query.levelId;
    
    let query = 'SELECT * FROM Chapters';
    let params = [];
    
    if (levelId) {
        query += ' WHERE level_id = ?';
        params.push(levelId);
    }
    
    query += ' ORDER BY order_num';
    
    db.all(query, params, (err, rows) => {
        if (err) {
            console.error('获取章节列表失败:', err);
            return res.status(500).json({
                success: false,
                message: '数据库查询错误'
            });
        }

        return res.json({
            success: true,
            chapters: rows || []
        });
    });
});

// 创建新章节
app.post('/api/chapters', authenticateToken, (req, res) => {
    const { name, description, level_id, order_num } = req.body;
    
    // 验证必要字段
    if (!name || !level_id) {
        return res.status(400).json({
            success: false,
            message: '章节名称和级别ID不能为空'
        });
    }

    // 检查级别是否存在
    db.get('SELECT id FROM Categories WHERE id = ?', [level_id], (err, level) => {
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
        
        // 获取默认排序序号（如果未提供）
        const getOrderNum = (callback) => {
            if (order_num) {
                callback(order_num);
        } else {
                db.get('SELECT MAX(order_num) AS max_order FROM Chapters WHERE level_id = ?', [level_id], (err, result) => {
                    if (err) {
                        console.error('获取最大排序序号错误:', err);
                        callback(1); // 默认为1
                    } else {
                        callback((result.max_order || 0) + 1);
                    }
                });
            }
        };
        
        getOrderNum((finalOrderNum) => {
            // 插入新章节
            db.run(
                'INSERT INTO Chapters (name, description, level_id, order_num) VALUES (?, ?, ?, ?)',
                [name, description || '', level_id, finalOrderNum],
                function(err) {
                    if (err) {
                        console.error('创建章节错误:', err);
                        return res.status(500).json({
                            success: false,
                            message: '创建章节失败: ' + err.message
                        });
                    }
                    
                    // 返回成功结果
                    return res.status(201).json({
                        success: true,
                        message: '章节创建成功',
                        chapterId: this.lastID,
                        chapter: {
                            id: this.lastID,
                            name,
                            description: description || '',
                            level_id,
                            order_num: finalOrderNum
                        }
                    });
                }
            );
        });
    });
});

// 获取章节信息
app.get('/api/chapters/:chapterId', (req, res) => {
    const chapterId = req.params.chapterId;
    
    db.get('SELECT * FROM Chapters WHERE id = ?', [chapterId], (err, row) => {
        if (err) {
            console.error('获取章节详情失败:', err.message);
            return res.status(500).json({
                success: false,
                message: '数据库查询错误',
                error: err.message
            });
        }
        
        if (!row) {
            return res.status(404).json({
                success: false,
                message: '章节不存在'
            });
        }
        
    res.json({
        success: true,
            chapter: row
        });
    });
});

// 更新章节
app.put('/api/chapters/:chapterId', authenticateToken, (req, res) => {
    const chapterId = req.params.chapterId;
    const { name, description, level_id, order_num } = req.body;
    
    // 验证必要字段
    if (!name || !level_id) {
        return res.status(400).json({
            success: false,
            message: '章节名称和级别ID不能为空'
        });
    }

    // 检查章节是否存在
    db.get('SELECT id FROM Chapters WHERE id = ?', [chapterId], (err, chapter) => {
        if (err) {
            console.error('验证章节错误:', err);
            return res.status(500).json({
                success: false,
                message: '服务器错误'
            });
        }
        
        if (!chapter) {
            return res.status(404).json({
                success: false,
                message: '章节不存在'
            });
        }
        
        // 检查级别是否存在
        db.get('SELECT id FROM Categories WHERE id = ?', [level_id], (err, level) => {
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
            
            // 更新章节
            db.run(
                'UPDATE Chapters SET name = ?, description = ?, level_id = ?, order_num = ? WHERE id = ?',
                [name, description || '', level_id, order_num || 1, chapterId],
                function(err) {
            if (err) {
                        console.error('更新章节错误:', err);
                return res.status(500).json({
                    success: false,
                            message: '更新章节失败: ' + err.message
                });
            }
            
                    return res.json({
            success: true,
                        message: '章节更新成功',
                        chapter: {
                            id: chapterId,
                            name,
                            description: description || '',
                            level_id,
                            order_num: order_num || 1
                        }
                    });
                }
            );
        });
    });
});

// 获取特定章节的单词
app.get('/api/chapters/:chapterId/words', (req, res) => {
    const chapterId = req.params.chapterId;
    const page = parseInt(req.query.page) || 1;
    const size = parseInt(req.query.size) || 20;
    
    // 计算偏移量
    const offset = (page - 1) * size;
    
    console.log(`获取章节 ${chapterId} 的单词，页码: ${page}, 每页大小: ${size}`);
    
    // 查询总记录数 - 修改查询以直接从Words表获取数据
    db.get('SELECT COUNT(*) as total FROM Words WHERE chapter_id = ?', 
        [chapterId], 
        (err, countResult) => {
        if (err) {
            console.error('获取章节单词数量失败:', err);
            return res.status(500).json({
                success: false,
                message: '获取章节单词失败: ' + err.message
            });
        }
            
        const total = countResult ? countResult.total : 0;
        console.log(`章节 ${chapterId} 有 ${total} 个单词`);
            
        // 查询单词数据 - 修改查询以直接从Words表获取数据
        const query = `
            SELECT 
                w.id, 
                w.word, 
                w.meaning, 
                w.phonetic,
                w.phrase,
                w.example,
                w.morphology,
                w.note,
                w.level_id,
                w.chapter_id,
                c.name AS chapter_name
            FROM Words w
            LEFT JOIN Chapters c ON w.chapter_id = c.id
            WHERE w.chapter_id = ?
            ORDER BY w.id
            LIMIT ? OFFSET ?
        `;
            
        db.all(query, [chapterId, size, offset], (err, words) => {
            if (err) {
                console.error('获取章节单词失败:', err);
                return res.status(500).json({
                    success: false,
                    message: '获取章节单词失败: ' + err.message
                });
            }
            
            res.json({
                success: true,
                words: words || [],
                total: total,
                page: page,
                size: size
            });
        });
    });
});

// 获取特定章节的所有单词 - 不分页版本
app.get('/api/chapters/:chapterId/allwords', (req, res) => {
    // 从URL参数中获取章节ID
    const chapterId = req.params.chapterId;
    
    // 步骤1: 查询总记录数 - 获取该章节的单词总数
    db.get('SELECT COUNT(*) as total FROM Words WHERE chapter_id = ?', 
        [chapterId], 
        (err, countResult) => {
            // 处理错误情况
            if (err) {
                console.error('获取章节单词数量失败:', err);
                return res.status(500).json({
                    success: false,
                    message: '获取章节单词失败: ' + err.message
                });
            }
            
            // 获取总数，如果没有结果则默认为0
            const total = countResult ? countResult.total : 0;
            console.log(`章节 ${chapterId} 有 ${total} 个单词`);
            
            // 步骤2: 查询单词数据 - 获取该章节的所有单词详情
            // 注意：我们移除了LIMIT和OFFSET，获取所有单词
            const query = `
                SELECT 
                    w.id, 
                    w.word, 
                    w.meaning, 
                    w.phonetic,
                    w.phrase,
                    w.example,
                    w.morphology,
                    w.note,
                    w.level_id,
                    w.chapter_id,
                    c.name AS chapter_name
                FROM Words w
                LEFT JOIN Chapters c ON w.chapter_id = c.id
                WHERE w.chapter_id = ?
                ORDER BY w.id
            `;
            
            // 执行查询，只传入chapterId参数
            db.all(query, [chapterId], (err, words) => {
                // 处理错误情况
                if (err) {
                    console.error('获取章节单词失败:', err);
                    return res.status(500).json({
                        success: false,
                        message: '获取章节单词失败: ' + err.message
                    });
                }
                
                // 成功响应 - 返回单词数据和总数
                res.json({
                    success: true,
                    words: words || [],
                    total: total
                    // 移除了page字段，因为不再分页
                });
            });
        });
});

// 删除章节
app.delete('/api/chapters/:chapterId', authenticateToken, (req, res) => {
    const chapterId = req.params.chapterId;
    
    // 检查章节是否存在
    db.get('SELECT id FROM Chapters WHERE id = ?', [chapterId], (err, chapter) => {
        if (err) {
            console.error('验证章节错误:', err);
            return res.status(500).json({
            success: false,
            message: '服务器错误'
        });
    }
        
        if (!chapter) {
            return res.status(404).json({
            success: false,
                message: '章节不存在'
        });
    }
    
        // 开始事务
        db.serialize(() => {
            db.run('BEGIN TRANSACTION');
    
            try {
                // 删除章节 (不需要先删除WordMappings，Words表直接包含chapter_id)
                db.run('DELETE FROM Chapters WHERE id = ?', [chapterId], function(err) {
        if (err) {
                        throw new Error('删除章节失败: ' + err.message);
                    }
                    
                    // 提交事务
                    db.run('COMMIT', function(err) {
        if (err) {
                            throw new Error('提交事务失败: ' + err.message);
                        }
                        
                        return res.json({
                            success: true,
                            message: '章节删除成功'
                        });
                    });
                });
            } catch (error) {
                // 回滚事务
                db.run('ROLLBACK');
                console.error('删除章节过程中发生错误:', error);
                
            return res.status(500).json({
                success: false,
                    message: error.message
                });
            }
        });
    });
});

// 获取所有词汇级别
app.get('/api/vocabulary-levels', (req, res) => {
    db.all('SELECT * FROM Categories ORDER BY order_num', [], (err, rows) => {
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
app.get('/api/vocabulary-levels/:levelId/chapters', authenticateToken, (req, res) => {
    const levelId = req.params.levelId;
    const userId = req.user.id; // 从 authenticateToken 获取
    const userType = req.user.type; // 从 authenticateToken 获取

    console.log(`[Get Chapters] Request received for level: ${levelId}, UserID: ${userId}, UserType: ${userType}`);

    // 1. 管理员特权处理
    if (userType === 'admin') {
        console.log('[Get Chapters] Admin user detected. Unlocking all chapters.');
        const query = 'SELECT *, 0 as locked FROM Chapters WHERE level_id = ? ORDER BY order_num';
        db.all(query, [levelId], (err, chapters) => {
            if (err) {
                console.error(`[Get Chapters - Admin] Database error for level ${levelId}:`, err.message);
                return res.status(500).json({ success: false, message: '数据库查询错误' });
            }
            console.log(`[Get Chapters - Admin] Successfully fetched ${chapters.length} chapters for level ${levelId}.`);
            return res.json({ success: true, chapters: chapters || [] });
        });
        return; // 管理员逻辑结束
    }

    // --- 非管理员用户处理 ---

    // 2. 获取用户在该级别的进度 (last_unlocked_order 和 last_accessed_order)
    const getProgress = () => {
        return new Promise((resolve, reject) => {
            // 确保进度记录存在，不存在则插入默认值 (解锁第一章, 访问第一章)
            const ensureSql = `INSERT OR IGNORE INTO UserChapterProgress (user_id, level_id, last_unlocked_order, last_accessed_order) VALUES (?, ?, 1, 1)`;
            db.run(ensureSql, [userId, levelId], (err) => {
                if (err) {
                    console.error(`[Get Chapters - Ensure Progress] Failed for User ${userId}, Level ${levelId}:`, err.message);
                    // 即使确保失败，也尝试查询，可能记录已存在
                } else {
                    console.log(`[Get Chapters - Ensure Progress] Ensured record for User ${userId}, Level ${levelId}.`);
                }

                // 查询进度 (同时获取 last_unlocked_order 和 last_accessed_order)
                const selectSql = 'SELECT last_unlocked_order, last_accessed_order FROM UserChapterProgress WHERE user_id = ? AND level_id = ?';
                db.get(selectSql, [userId, levelId], (err, row) => {
                    if (err) {
                        console.error(`[Get Chapters - Get Progress] Failed for User ${userId}, Level ${levelId}:`, err.message);
                        reject(err); // 查询失败，拒绝 Promise
                    } else {
                        const lastUnlocked = row ? row.last_unlocked_order : 1; // 默认解锁第一章
                        const lastAccessed = row ? row.last_accessed_order : 1; // 默认访问第一章
                        console.log(`[Get Chapters - Get Progress] User ${userId}, Level ${levelId}, Last Unlocked Order: ${lastUnlocked}, Last Accessed Order: ${lastAccessed}`);
                        // 返回包含两个值的对象
                        resolve({ lastUnlockedOrder: lastUnlocked, lastAccessedOrder: lastAccessed });
                    }
                });
            });
        });
    };

    // 3. 获取所有章节并计算锁定状态
    const getChaptersWithLockStatus = (lastUnlockedOrder) => {
        return new Promise((resolve, reject) => {
            // --- 修改 SQL 查询以包含 word_count --- 
            // const query = 'SELECT * FROM Chapters WHERE level_id = ? ORDER BY order_num'; 
    const query = `
                SELECT 
                    c.*, 
                    (SELECT COUNT(*) FROM Words w WHERE w.chapter_id = c.id) as word_count
                FROM 
                    Chapters c 
                WHERE 
                    c.level_id = ? 
                ORDER BY 
                    c.order_num
    `;
            // --- 结束修改 ---
            db.all(query, [levelId], (err, chapters) => {
        if (err) {
                    console.error(`[Get Chapters - Fetch Chapters] Failed for Level ${levelId}:`, err.message);
                    reject(err);
                } else {
                    console.log(`[Get Chapters - Fetch Chapters] Fetched ${chapters.length} chapters for level ${levelId}. Calculating lock status...`);
                    const chaptersWithStatus = chapters.map(chapter => {
                        let isLocked;
                        if (userType === 'guest') {
                            // 游客逻辑：解锁条件是 order_num <= lastUnlockedOrder AND order_num <= 5
                            isLocked = !(chapter.order_num <= lastUnlockedOrder && chapter.order_num <= 5);
                        } else {
                            // 其他用户逻辑：解锁条件是 order_num <= lastUnlockedOrder
                            isLocked = !(chapter.order_num <= lastUnlockedOrder);
                        }
                        return {
                            ...chapter,
                            locked: isLocked // boolean true or false
                        };
                    });
                    resolve(chaptersWithStatus);
                }
            });
        });
    };

    // 4. 特殊处理游客：检查是否访问第一个级别
    const handleGuestAndProceed = async () => {
        try {
            let progressData = { lastUnlockedOrder: 1, lastAccessedOrder: 1 }; // 默认值

            if (userType === 'guest') {
                // 检查是否为第一个级别
                const firstLevelQuery = 'SELECT id FROM Categories ORDER BY order_num ASC LIMIT 1';
                const firstLevel = await new Promise((resolve, reject) => {
                    db.get(firstLevelQuery, [], (err, row) => {
                        if (err) reject(err);
                        else resolve(row);
                });
            });

                if (!firstLevel || levelId !== firstLevel.id) {
                    console.log(`[Get Chapters - Guest] Access denied. Guest user trying to access non-first level (${levelId}).`);
                    // 游客访问非第一级别，返回空列表和默认访问进度
                    return res.json({ success: true, chapters: [], last_accessed_order: 1 });
                }
                console.log(`[Get Chapters - Guest] Guest accessing the first level (${levelId}). Proceeding.`);
                // 游客访问第一级别，需要获取他们的进度
                progressData = await getProgress();
            } else {
                // 其他用户，直接获取进度
                progressData = await getProgress();
            }

            // 获取带有锁定状态的章节列表
            const chapters = await getChaptersWithLockStatus(progressData.lastUnlockedOrder);
            console.log(`[Get Chapters] Successfully processed chapters for User ${userId}, Level ${levelId}. Sending response.`);
            // 在响应中同时包含章节列表和 last_accessed_order
            res.json({ success: true, chapters: chapters || [], last_accessed_order: progressData.lastAccessedOrder });

        } catch (error) {
            console.error(`[Get Chapters] Error processing request for User ${userId}, Level ${levelId}:`, error.message);
            res.status(500).json({ success: false, message: '处理章节信息时出错' });
        }
    };

    // --- 执行 ---
    handleGuestAndProceed();
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
                if (!word.word || !word.definition) {
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
                    
                    if (existingWord) {
                        // 更新已存在的单词
                        db.run(
                            'UPDATE Words SET meaning = ?, phonetic = ?, example = ?, chapter_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                            [word.definition || word.meaning, word.phonetic || '', word.example || '', chapterId, existingWord.id],
                            (err) => {
                                if (err) {
                                    console.error('更新单词错误:', err);
                                    errors.push(`更新"${word.word}"失败：${err.message}`);
                                    processNextWord(index + 1);
                                    return;
                                }
                                
                                importCount++;
                                processNextWord(index + 1);
                            }
                        );
                    } else {
                        // 插入新单词
                        db.run(
                            'INSERT INTO Words (word, meaning, phonetic, example, chapter_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)',
                            [word.word, word.definition || word.meaning, word.phonetic || '', word.example || '', chapterId],
                            function(err) {
                                if (err) {
                                    console.error('插入单词错误:', err);
                                    errors.push(`插入"${word.word}"失败：${err.message}`);
                                    processNextWord(index + 1);
                                    return;
                                }
                                
                                importCount++;
                                processNextWord(index + 1);
                            }
                        );
                    }
                });
            };
            
            // 开始处理第一个单词
            processNextWord(0);
        });
    });
});

// 获取所有单词的API端点（支持分页和级别筛选）
app.get('/api/words', (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const size = parseInt(req.query.size) || 20;
    const levelId = req.query.levelId; // 可选的级别过滤
    
    // 计算偏移量
    const offset = (page - 1) * size;
    
    console.log(`获取单词列表, 页码: ${page}, 每页大小: ${size}, 级别: ${levelId || 'all'}`);
    
    // 构建查询条件
    let whereClause = '';
    let queryParams = [];
    
    if (levelId) {
        whereClause = 'WHERE w.level_id = ?';
        queryParams.push(levelId);
    }
    
    // 查询总记录数
    const countQuery = `
        SELECT COUNT(*) as total 
        FROM Words w
        ${whereClause}
    `;
    
    // 查询单词数据（带分页）
    const wordsQuery = `
        SELECT 
            w.id, 
            w.word, 
            w.meaning, 
            w.phonetic,
            w.phrase,
            w.example,
            w.morphology,
            w.note,
            w.level_id,
            w.chapter_id,
            c.name AS chapter_name
        FROM Words w
        LEFT JOIN Chapters c ON w.chapter_id = c.id
        ${whereClause}
        ORDER BY w.id DESC
        LIMIT ? OFFSET ?
    `;
    
    // 执行计数查询
    db.get(countQuery, queryParams, (err, countResult) => {
        if (err) {
            console.error('获取单词总数失败:', err);
                    return res.status(500).json({
                        success: false,
                message: '获取单词失败: ' + err.message
            });
        }
        
        const total = countResult ? countResult.total : 0;
        console.log(`单词总数: ${total}`);
        
        // 复制查询参数并添加分页
        const wordsQueryParams = [...queryParams, size, offset];
        
        // 查询单词数据
        db.all(wordsQuery, wordsQueryParams, (err, words) => {
            if (err) {
                console.error('获取单词列表失败:', err);
                return res.status(500).json({
            success: false,
                    message: '获取单词失败: ' + err.message
                });
            }
            
            return res.json({
                    success: true,
                words: words || [],
                total: total,
                page: page,
                size: size
                });
            });
    });
});

// 单词搜索API端点
app.get('/api/words/search', (req, res) => {
    const query = req.query.q || '';
    const page = parseInt(req.query.page) || 1;
    const size = parseInt(req.query.size) || 20;
    const levelId = req.query.levelId; // 可选的级别过滤
    
    // 计算偏移量
    const offset = (page - 1) * size;
    
    console.log(`搜索单词: "${query}", 页码: ${page}, 每页大小: ${size}, 级别ID: ${levelId || 'all'}`);
    
    // 如果没有搜索关键词，返回空结果
    if (!query.trim()) {
        return res.json({
            success: true,
            words: [],
            total: 0,
            page: page,
            size: size
        });
    }
    
    // 构建查询条件
    let whereClause = 'WHERE (w.word LIKE ? OR w.meaning LIKE ?)';
    let queryParams = [`%${query}%`, `%${query}%`];
    
    if (levelId) {
        whereClause += ' AND w.level_id = ?';
        queryParams.push(levelId);
    }
    
    // 查询总记录数
    const countQuery = `
        SELECT COUNT(*) as total 
        FROM Words w
        ${whereClause}
    `;
    
    // 查询单词数据（带分页）
    const wordsQuery = `
        SELECT 
            w.id, 
            w.word, 
            w.meaning, 
            w.phonetic,
            w.phrase,
            w.example,
            w.morphology,
            w.note,
            w.level_id,
            w.chapter_id,
            c.name AS chapter_name
        FROM Words w
        LEFT JOIN Chapters c ON w.chapter_id = c.id
        ${whereClause}
        ORDER BY w.id DESC
        LIMIT ? OFFSET ?
    `;
    
    // 执行计数查询
    db.get(countQuery, queryParams, (err, countResult) => {
        if (err) {
            console.error('获取单词总数失败:', err);
            return res.status(500).json({
            success: false,
                message: '获取单词失败: ' + err.message
            });
        }
        
        const total = countResult ? countResult.total : 0;
        console.log(`单词总数: ${total}`);
        
        // 复制查询参数并添加分页
        const wordsQueryParams = [...queryParams, size, offset];
        
        // 查询单词数据
        db.all(wordsQuery, wordsQueryParams, (err, words) => {
            if (err) {
                console.error('获取单词列表失败:', err);
                return res.status(500).json({
            success: false,
                    message: '获取单词失败: ' + err.message
                });
            }
            
            return res.json({
                success: true,
                words: words || [],
                total: total,
                page: page,
                size: size
            });
        });
    });
});

// 单词管理API端点
app.post('/api/words', authenticateToken, (req, res) => {
    const { word, meaning, phonetic, phrase, example, morphology, note, level_id, chapter_id, image_path } = req.body;
    
    // 验证必要字段
    if (!word || !meaning) {
        return res.status(400).json({
            success: false,
            message: '单词和释义不能为空'
        });
    }
    
    // 生成章节ID (如果没有提供)
    let actualChapterId = chapter_id;
    let actualLevelId = level_id;
    
    if (!actualChapterId && !actualLevelId) {
        return res.status(400).json({
            success: false,
            message: '章节ID和级别ID至少要提供一个'
        });
    }
    
    console.log(`添加单词: "${word}", 级别: "${actualLevelId || '未指定'}", 章节: "${actualChapterId || '未指定'}"`);
    
    // 开始事务
    db.run('BEGIN TRANSACTION', function(err) {
            if (err) {
            console.error('开始事务失败:', err);
                return res.status(500).json({
                    success: false,
                message: '数据库错误: ' + err.message
            });
        }
        
        // 1. 检查和处理级别
        const handleLevel = () => {
            return new Promise((resolve, reject) => {
                // 如果没有提供级别ID，则创建一个"未分类"级别
                if (!actualLevelId) {
                    actualLevelId = "未分类";
                }
                
                // 检查级别是否存在
                db.get('SELECT id, name FROM Categories WHERE id = ?', [actualLevelId], (err, level) => {
                        if (err) {
                        return reject(err);
                    }
                    
                    if (level) {
                        // 级别存在，直接返回
                        return resolve(level);
                    } else {
                        // 创建新级别
                        const levelName = actualLevelId; // 使用ID作为名称
                        const levelDesc = levelName + ' 词汇';
                        
                        db.run(
                            'INSERT INTO Categories (id, name, description, order_num) VALUES (?, ?, ?, ?)',
                            [actualLevelId, levelName, levelDesc, 100],
                            function(err) {
                                if (err) {
                                    return reject(err);
                                }
                                console.log(`创建了新级别: ${actualLevelId}`);
                                resolve({ id: actualLevelId, name: levelName });
                            }
                        );
                    }
                });
            });
        };
        
        // 2. 检查和处理章节
        const handleChapter = (level) => {
            return new Promise((resolve, reject) => {
                // 如果没有提供章节ID，则创建一个默认章节
                if (!actualChapterId) {
                    actualChapterId = `${level.name}未分类`;
                }
                
                // 检查章节是否存在
                db.get('SELECT id, name FROM Chapters WHERE id = ?', [actualChapterId], (err, chapter) => {
                    if (err) {
                        return reject(err);
                    }
                    
                    if (chapter) {
                        // 章节存在，直接返回
                        return resolve(chapter);
                        } else {
                        // 查询该级别下已有章节的最大顺序号
                        db.get('SELECT MAX(order_num) as max_order FROM Chapters WHERE level_id = ?', 
                            [level.id], 
                            (err, result) => {
                                if (err) {
                                    return reject(err);
                                }
                                
                                // 计算新章节的顺序号
                                const orderNum = ((result && result.max_order) || 0) + 1;
                                const chapterName = actualChapterId; // 使用ID作为名称
                                
                                // 创建新章节
                                db.run(
                                    'INSERT INTO Chapters (id, name, description, order_num, level_id) VALUES (?, ?, ?, ?, ?)',
                                    [actualChapterId, chapterName, chapterName, orderNum, level.id],
                                    function(err) {
                                        if (err) {
                                            return reject(err);
                                        }
                                        console.log(`创建了新章节: ${actualChapterId}, 属于级别: ${level.id}`);
                                        resolve({ id: actualChapterId, name: chapterName });
                                    }
                                );
                            }
                        );
                    }
                });
            });
        };
        
        // 3. 添加单词
        const addWord = (chapter) => {
            return new Promise((resolve, reject) => {
                db.run(
                    `INSERT INTO Words (word, meaning, phonetic, phrase, example, morphology, note, level_id, chapter_id, image_path)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [word, meaning, phonetic || null, phrase || null, example || null, morphology || null, 
                     note || null, actualLevelId, chapter.id, image_path || null],
                    function(err) {
                        if (err) {
                            return reject(err);
                        }
                        resolve(this.lastID);
                    }
                );
            });
        };
        
        // 执行完整流程
        handleLevel()
            .then(handleChapter)
            .then(addWord)
            .then((wordId) => {
                // 提交事务
                db.run('COMMIT', function(err) {
                    if (err) {
                        console.error('提交事务失败:', err);
                        db.run('ROLLBACK');
                            return res.status(500).json({
                                success: false,
                            message: '提交事务失败: ' + err.message
                        });
                    }
                    
                    return res.json({
                                success: true,
                        message: '单词添加成功',
                        wordId: wordId,
                        level_id: actualLevelId,
                        chapter_id: actualChapterId
                    });
                });
            })
            .catch((err) => {
                // 回滚事务
                console.error('添加单词失败:', err);
                db.run('ROLLBACK');
                return res.status(500).json({
                    success: false,
                    message: '添加单词失败: ' + err.message
                });
            });
    });
});

// 更新单词API端点
app.put('/api/words/:id', verifyAdminToken, (req, res) => {
    const wordId = req.params.id;
    const { word, phonetic, meaning, chapter_id, phrase, example, morphology, note, level_id, image_path } = req.body;
    
    if (!word || !meaning || !chapter_id) {
        return res.status(400).json({
            success: false,
            message: '缺少必要参数'
        });
    }
    
    // 验证单词是否存在
    db.get('SELECT * FROM Words WHERE id = ?', [wordId], (err, existingWord) => {
        if (err) {
            console.error('查询单词失败:', err);
            return res.status(500).json({
                success: false,
                message: '数据库错误: ' + err.message
            });
        }
        
        if (!existingWord) {
            return res.status(404).json({
                success: false,
                message: '单词不存在'
            });
        }
        
        // 声明变量存储级别ID
        const actualLevelId = level_id || existingWord.level_id || '';
        
        // 开始事务
        db.run('BEGIN TRANSACTION', function(err) {
            if (err) {
                console.error('开始事务失败:', err);
                return res.status(500).json({
                    success: false,
                    message: '数据库错误: ' + err.message
                });
            }
            
            // 1. 检查章节是否存在
            const checkChapter = () => {
                return new Promise((resolve, reject) => {
                    db.get('SELECT * FROM Chapters WHERE id = ?', [chapter_id], (err, chapter) => {
                        if (err) {
                            reject(err);
                            return;
                        }
                        
                        if (chapter) {
                            resolve(true); // 章节已存在
                        } else {
                            // 查询级别
                            db.get('SELECT * FROM Categories WHERE id = ?', [actualLevelId], (err, level) => {
                                if (err) {
                                    reject(err);
                                    return;
                                }
                                
                                // 如果级别不存在，则创建
                                const createLevelIfNeeded = (callback) => {
                                    if (level) {
                                        callback();
                                    } else {
                                        db.run(
                                            'INSERT INTO Categories (id, name, description, order_num) VALUES (?, ?, ?, ?)',
                                            [actualLevelId, actualLevelId, actualLevelId + ' 词汇', 100],
                                            function(err) {
                                                if (err) {
                                                    reject(err);
                                                } else {
                                                    callback();
                        }
                    }
                );
            }
                                };
                                
                                // 创建级别后创建章节
                                createLevelIfNeeded(() => {
                                    db.get('SELECT MAX(order_num) as max_order FROM Chapters WHERE level_id = ?', 
                                        [actualLevelId], 
                                        (err, result) => {
                                            if (err) {
                                                reject(err);
                                                return;
                                            }
                                            
                                            const orderNum = ((result && result.max_order) || 0) + 1;
                                            
                                            // 创建章节
                                            db.run(
                                                'INSERT INTO Chapters (id, name, description, order_num, level_id) VALUES (?, ?, ?, ?, ?)',
                                                [chapter_id, chapter_id, chapter_id, orderNum, actualLevelId],
                                                function(err) {
                                                    if (err) {
                                                        reject(err);
                                                    } else {
                                                        resolve(true);
                                                    }
                                                }
                                            );
        }
    );
});
                            });
                        }
                    });
                });
            };
            
            // 2. 更新单词
            const updateWord = () => {
                return new Promise((resolve, reject) => {
                    db.run(
                        'UPDATE Words SET word = ?, phonetic = ?, meaning = ?, phrase = ?, example = ?, morphology = ?, note = ?, chapter_id = ?, level_id = ?, image_path = ? WHERE id = ?',
                        [word, phonetic || '', meaning, phrase || '', example || '', morphology || '', note || '', chapter_id, actualLevelId, image_path || '', wordId],
                        function(err) {
                            if (err) {
                                reject(err);
                            } else {
                                resolve(true);
                            }
                        }
                    );
                });
            };
            
            // 执行所有步骤
            checkChapter()
                .then(() => updateWord())
                .then(() => {
                    // 提交事务
                    db.run('COMMIT', function(err) {
                        if (err) {
                            console.error('提交事务失败:', err);
                            db.run('ROLLBACK');
                            return res.status(500).json({
                                success: false,
                                message: '提交事务失败: ' + err.message
                            });
                        }
                        
        return res.json({
            success: true,
                            message: '单词更新成功'
                        });
                    });
                })
                .catch((err) => {
                    // 回滚事务
                    console.error('更新单词失败:', err);
                    db.run('ROLLBACK');
                    return res.status(500).json({
                        success: false,
                        message: '更新单词失败: ' + err.message
                    });
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
                // 直接删除单词（不需要先删除映射关系）
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

// 新增批量导入API
app.post('/api/words/bulk-import', authenticateToken, (req, res) => {
    const { jsonData } = req.body;
    
    if (!jsonData) {
        return res.status(400).json({
            success: false,
            message: '缺少JSON数据'
        });
    }
    
    try {
        // 解析JSON数据
        let wordsList;
        if (typeof jsonData === 'string') {
            wordsList = JSON.parse(jsonData);
                } else {
            wordsList = jsonData;
        }
        
        if (!Array.isArray(wordsList)) {
            return res.status(400).json({
                success: false,
                message: 'JSON数据必须是数组格式'
            });
        }
        
        // 开始事务
        db.serialize(() => {
            db.run('BEGIN TRANSACTION');
            
            let processed = 0;
            let success = 0;
            let skipped = 0;
            let errors = [];
            const total = wordsList.length;
            
            // 确保所有单词所需的级别都存在
            const levelIds = new Set();
            wordsList.forEach(word => {
                if (word.level_id) {
                    levelIds.add(word.level_id);
                }
            });
            
            // 创建所有需要的级别
            const createLevels = (callback) => {
                if (levelIds.size === 0) {
                    callback();
                    return;
                }
                
                let processed = 0;
                const levels = Array.from(levelIds);
                
                levels.forEach(levelId => {
                    db.get('SELECT id FROM Categories WHERE id = ?', [levelId], (err, level) => {
                        if (err) {
                            errors.push(`检查词汇级别 "${levelId}" 失败:`, err);
                        } else if (!level) {
                            // 创建级别
                            db.run(
                                'INSERT INTO Categories (id, name, description, order_num) VALUES (?, ?, ?, ?)',
                                [levelId, levelId, levelId + ' 词汇', 100],
                                function(err) {
                                    if (err) {
                                        errors.push(`创建词汇级别 "${levelId}" 失败:`, err);
                                    }
                                }
                            );
                        }
                        
                        processed++;
                        if (processed === levels.length) {
                            callback();
                        }
                    });
                });
            };
            
            // 处理所有单词
            const processWords = () => {
                // 获取所有章节ID
                const chapterIds = new Set();
                wordsList.forEach(word => {
                    if (word.chapter_id) {
                        chapterIds.add(word.chapter_id);
                    } else if (word.level_id) {
                        // 生成默认章节ID
                        chapterIds.add(`${word.level_id}未分类`);
                    }
                });
                
                // 创建所有需要的章节
                const createChapters = (callback) => {
                    if (chapterIds.size === 0) {
                        callback();
                        return;
                    }
                    
                    let processed = 0;
                    const chapters = Array.from(chapterIds);
                    
                    chapters.forEach(chapterId => {
                        db.get('SELECT id FROM Chapters WHERE id = ?', [chapterId], (err, chapter) => {
                            if (err) {
                                errors.push(`检查章节 ${chapterId} 失败:`, err);
                                checkComplete();
                                return;
                            }
                            
                            if (!chapter) {
                                // 提取level_id
                                let levelId = null;
                                for (const word of wordsList) {
                                    if (word.chapter_id === chapterId && word.level_id) {
                                        levelId = word.level_id;
                                        break;
                                    } else if (chapterId.startsWith(word.level_id)) {
                                        levelId = word.level_id;
                                        break;
                                    }
                                }
                                
                                if (!levelId) {
                                    errors.push(`无法确定章节 ${chapterId} 的级别`);
                                    checkComplete();
                                    return;
                                }
                                
                                // 获取章节顺序
                                db.get('SELECT MAX(order_num) as max_order FROM Chapters WHERE level_id = ?', [levelId], (err, result) => {
                                    if (err) {
                                        errors.push(`获取章节顺序失败:`, err);
                                        checkComplete();
                                        return;
                                    }
                                    
                                    const orderNum = ((result && result.max_order) || 0) + 1;
                                    
                                    // 创建章节
                                    db.run(
                                        'INSERT INTO Chapters (id, name, description, order_num, level_id) VALUES (?, ?, ?, ?, ?)',
                                        [chapterId, chapterId, chapterId, orderNum, levelId],
                                        function(err) {
                                            if (err) {
                                                errors.push(`创建章节 ${chapterId} 失败:`, err);
                                            }
                                            checkComplete();
                                        }
                                    );
                                });
            } else {
                                checkComplete();
                            }
                            
                            function checkComplete() {
                                processed++;
                                if (processed === chapters.length) {
                                    callback();
                                }
                            }
                        });
                    });
                };
                
                // 导入所有单词
                const importWords = () => {
                    if (wordsList.length === 0) {
                        finishImport();
                        return;
                    }
                    
                    const processNextWord = (index) => {
                        if (index >= wordsList.length) {
                            finishImport();
                            return;
                        }
                        
                        const wordData = wordsList[index];
                        
                        // 清理数据
                        for (const key in wordData) {
                            if (wordData[key] === undefined || wordData[key] === null ||
                                wordData[key] === 'NaN' || wordData[key] === 'undefined' ||
                                wordData[key] === Infinity || wordData[key] === -Infinity) {
                                wordData[key] = null;
                            }
                            if (typeof wordData[key] === 'string' && wordData[key].trim() === '') {
                                wordData[key] = null;
                            }
                        }
                        
                        // 验证必要字段
                        if (!wordData.word || !wordData.meaning) {
                            skipped++;
                            processed++;
                            errors.push(`跳过单词 #${index + 1}: 缺少必要字段`);
                            processNextWord(index + 1);
                            return;
                        }
                        
                        // 处理level_id和chapter_id
                        const level_id = wordData.level_id || 'default';
                        const chapter_id = wordData.chapter_id || `${level_id}未分类`;
                        
                        // 插入单词
                        db.run(
                            `INSERT INTO Words (word, meaning, phonetic, phrase, example, morphology, note, level_id, chapter_id, image_path)
                             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                            [
                                wordData.word,
                                wordData.meaning,
                                wordData.phonetic || null,
                                wordData.phrase || null,
                                wordData.example || null,
                                wordData.morphology || null,
                                wordData.note || null,
                                level_id,
                                chapter_id,
                                wordData.image_path || null
                            ],
                    function(err) {
                                processed++;
                                
                        if (err) {
                                    errors.push(`导入单词 "${wordData.word}" 失败:`, err);
                                } else {
                                    success++;
                                }
                                
                                // 打印进度
                                if (processed % 100 === 0 || processed === total) {
                                    console.log(`导入进度: ${Math.floor((processed / total) * 100)}% (${processed}/${total})`);
                                }
                                
                                processNextWord(index + 1);
                            }
                        );
                    };
                    
                    // 开始处理第一个单词
                    processNextWord(0);
                };
                
                // 执行流程：先创建级别，再创建章节，最后导入单词
                createLevels(() => {
                    createChapters(() => {
                        importWords();
                    });
                });
            };
            
            // 开始处理
            processWords();
            
            // 完成导入
            function finishImport() {
                db.run('COMMIT', (err) => {
                    if (err) {
                        console.error('提交事务失败:', err);
                        db.run('ROLLBACK');
                            return res.status(500).json({
                                success: false,
                            message: '批量导入失败: ' + err.message
                            });
                        }
                        
                        res.json({
                            success: true,
                        message: '批量导入成功',
                        stats: {
                            total: total,
                            imported: success,
                            skipped: skipped,
                            errors: errors.length
                        },
                        errors: errors.length > 0 ? errors : undefined
                    });
                });
            }
        });
    } catch (error) {
        console.error('批量导入单词错误:', error);
        return res.status(500).json({
            success: false,
            message: '处理JSON数据失败: ' + error.message
        });
    }
});

// 获取用户进度API端点
app.get('/api/progress', async (req, res) => {
    const userId = getUserId(req); // 从session/cookie获取用户ID
    const levelId = req.query.level;
  
    // 初始化进度
    await db.run(`
      INSERT OR IGNORE INTO UserChapterProgress (user_id, level_id)
      VALUES (?, ?)
    `, [userId, levelId]);
  
    // 获取进度
    const progress = await db.get(`
      SELECT last_unlocked, last_accessed 
      FROM UserChapterProgress
      WHERE user_id = ? AND level_id = ?
    `, [userId, levelId]);
  
    res.json({
      lastUnlocked: progress?.last_unlocked || 1,
      lastAccessed: progress?.last_accessed || 1
    });
  });
  
// 更新用户进度
  app.post('/api/progress', async (req, res) => {
    const { levelId, chapterOrder } = req.body;
    const userId = getUserId(req);
  
    await db.run(`
      UPDATE UserChapterProgress
      SET 
        last_accessed = ?,
        last_unlocked = MAX(last_unlocked, ?)
      WHERE user_id = ? AND level_id = ?
    `, [chapterOrder, chapterOrder, userId, levelId]);
  
    res.sendStatus(200);
  });

// 新增：更新用户章节进度接口
app.post('/api/progress/complete-chapter', authenticateToken, (req, res) => {
    console.log('[Complete Chapter - TRACE] Handler started.'); // <-- 新增日志
    const userId = req.user.id;
    const { levelId, completedOrderNum, totalScore } = req.body;

    console.log(`[Complete Chapter] Received request: User ${userId}, Level ${levelId}, Completed Order ${completedOrderNum}, Total Score ${totalScore}`);

    // 1. 参数验证
    if (!levelId || completedOrderNum === undefined || completedOrderNum === null) {
        console.error('[Complete Chapter] Bad request: Missing levelId or completedOrderNum.');
        return res.status(400).json({ success: false, message: '缺少 levelId 或 completedOrderNum' });
    }

    const completedNum = parseInt(completedOrderNum, 10);
    if (isNaN(completedNum) || completedNum < 1) {
        console.error('[Complete Chapter] Bad request: Invalid completedOrderNum:', completedOrderNum);
        return res.status(400).json({ success: false, message: '无效的 completedOrderNum' });
    }

    // 2. 计算下一个解锁的 order_num
    const nextOrderNum = completedNum + 1;
    console.log('[Complete Chapter - TRACE] Parameters validated:', { userId, levelId, completedNum, nextOrderNum }); // <-- 新增日志

    // 3. 更新数据库
    const sql = `
        UPDATE UserChapterProgress
        SET
            last_accessed_order = ?,
            last_unlocked_order = MAX(last_unlocked_order, ?)
        WHERE user_id = ? AND level_id = ?
    `;

    try { // <-- 添加 try 块以防万一
        console.log('[Complete Chapter - TRACE] Preparing to execute db.run...'); // <-- 新增日志
        db.run(sql, [completedNum, nextOrderNum, userId, levelId], function(err) {
            if (err) {
                console.error('[Complete Chapter - TRACE] db.run callback error:', err); // <-- 修改日志
                console.error(`[Complete Chapter] Database error updating progress for User ${userId}, Level ${levelId}:`, err.message);
                // 避免在回调错误中再次发送响应，如果已经发送过
                if (!res.headersSent) {
                   return res.status(500).json({ success: false, message: '更新进度失败' });
                }
                return; // 明确返回
            }

            console.log('[Complete Chapter - TRACE] db.run callback success. Changes:', this.changes); // <-- 新增日志
            // 检查是否有行被更新
            if (this.changes === 0) {
                console.warn(`[Complete Chapter] No rows updated for User ${userId}, Level ${levelId}. Record might not exist yet (should have been created on chapter load).`);
            }

            console.log(`[Complete Chapter] Successfully updated progress for User ${userId}, Level ${levelId}. Last accessed: ${completedNum}, Unlocked up to: ${nextOrderNum}.`);
            
            // --- 新增：处理通关积分和里程碑 --- 
            if (this.changes > 0) { // 确保章节进度真的更新了
                console.log(`[Complete Chapter Points] Awarding points for user ${userId}, level ${levelId}, chapter ${completedNum}`);

                // 查询当前积分和倍数
                const getUserPointsSql = 'SELECT * FROM UserPoints WHERE user_id = ?';
                db.get(getUserPointsSql, [userId], (err, userPoints) => {
                    if (err) {
                        console.error(`[Complete Chapter Points] Error fetching UserPoints for user ${userId}:`, err.message);
                        // 积分获取失败，但章节进度已更新，仍需返回成功，只记录错误
                        if (!res.headersSent) {
                             res.status(200).json({ success: true, message: '进度更新成功，但积分处理出错' });
                        }
                        return; 
                    }

                    // 如果用户还没有积分记录，使用默认值 (虽然登录时应该创建了)
                    const currentPoints = userPoints ? userPoints.total_points : 0;
                    const multiplier = userPoints ? userPoints.points_multiplier : 1.0;
                    let completedLevels = userPoints ? userPoints.completed_levels : 0;

                    // 计算获得积分 - 使用前端传递的总分，如果没有则使用默认的10分
                    let pointsEarned;
                    if (totalScore !== undefined && !isNaN(parseInt(totalScore))) {
                        // 使用前端传递的总分
                        pointsEarned = parseInt(totalScore);
                        console.log(`[Complete Chapter Points] Using frontend total score: ${pointsEarned}`);
                    } else {
                        // 使用默认的10分作为基础分
                        const basePoints = 10;
                        pointsEarned = Math.floor(basePoints * multiplier);
                        console.log(`[Complete Chapter Points] Using default score: basePoints=${basePoints}, multiplier=${multiplier}, pointsEarned=${pointsEarned}`);
                    }
                    
                    const newTotalPoints = currentPoints + pointsEarned;
                    completedLevels += 1; // 完成关卡数+1

                    console.log(`[Complete Chapter Points] User ${userId}: Earned=${pointsEarned}, New Total=${newTotalPoints}, Completed Levels=${completedLevels}`);

                    // 更新 UserPoints 表
                    const updateSql = `
                        UPDATE UserPoints
                        SET total_points = ?, completed_levels = ?
                        WHERE user_id = ?
                    `;
                    db.run(updateSql, [newTotalPoints, completedLevels, userId], (updateErr) => {
                        if (updateErr) {
                            console.error(`[Complete Chapter Points] Error updating UserPoints for user ${userId}:`, updateErr.message);
                            // 更新积分失败，也发送成功响应，只记录错误
                            if (!res.headersSent) {
                                res.status(200).json({ success: true, message: '进度更新成功，但积分保存出错' });
                            }
                        } else {
                            console.log(`[Complete Chapter Points] Successfully updated UserPoints for user ${userId}.`);
                            // --- 发送最终成功响应 --- 
                            if (!res.headersSent) {
                                res.status(200).json({ success: true, message: '进度更新成功', pointsEarned: pointsEarned });
                            }
                        }
                    });
                });
            } else {
                 // UserChapterProgress 未更新，直接返回之前的成功响应
                 if (!res.headersSent) {
                     res.status(200).json({ success: true, message: '进度更新成功 (未变化)' });
                 }
            }
            // --- 结束积分处理逻辑 ---
        });
    } catch (syncError) { // <-- 添加 catch 块
        console.error('[Complete Chapter - TRACE] Synchronous error during db.run initiation:', syncError);
        if (!res.headersSent) {
            res.status(500).json({ success: false, message: '更新进度时发生意外错误' });
        }
    }
});

// --- 新增：里程碑奖励函数 ---
// --- 结束新增函数 ---

// 新增：查找下一章节API端点
app.get('/api/chapters/find-next', authenticateToken, (req, res) => {
    console.log('============================开始寻找下一个章节============================')
    const { levelId, currentOrderNum } = req.query;
    const userId = req.user.id;

    console.log(`[Find Next Chapter] Request received: User ${userId}, Level ${levelId}, Current Order ${currentOrderNum}`);

    // 参数验证
    if (!levelId || currentOrderNum === undefined || currentOrderNum === null) {
        console.error('[Find Next Chapter] Bad request: Missing levelId or currentOrderNum.');
        return res.status(400).json({ success: false, message: '缺少 levelId 或 currentOrderNum' });
    }

    const currentNum = parseInt(currentOrderNum, 10);
    if (isNaN(currentNum) || currentNum < 0) { // currentOrderNum 可以是 0 或更大
        console.error('[Find Next Chapter] Bad request: Invalid currentOrderNum:', currentOrderNum);
        return res.status(400).json({ success: false, message: '无效的 currentOrderNum' });
    }

    const nextOrderNum = currentNum + 1;
    console.log(`[Find Next Chapter] Looking for chapter with order_num = ${nextOrderNum} in level ${levelId}`);

    // 查询数据库
    const sql = `
        SELECT id, name
        FROM Chapters
        WHERE level_id = ? AND order_num = ?
        LIMIT 1
    `;

    const params = [levelId, nextOrderNum]; // 将参数放入数组
    console.log(`[Find Next Chapter - DEBUG] Executing SQL: ${sql.replace(/\s+/g, ' ').trim()} with params:`, params); // 添加详细日志

    console.log('============================开始查询数据库============================')
    // db.get(sql, [levelId, nextOrderNum], (err, row) => { // 使用 params 数组
    db.get(sql, params, (err, row) => {
        if (err) {
            console.error(`[Find Next Chapter] Database error searching for next chapter (Order ${nextOrderNum}, Level ${levelId}):`, err.message);
            return res.status(500).json({ success: false, message: '查询下一章节失败' });
        }

        if (row) {
            // 找到了下一章节
            console.log(`[Find Next Chapter] Found next chapter: ID=${row.id}, Name=${row.name}`);
            res.json({
                success: true,
                nextChapter: {
                    id: row.id,
                    name: row.name,
                    order_num: nextOrderNum // 可以选择性地返回 order_num
                }
            });
        } else {
            // 未找到下一章节（可能是最后一关）
            console.log(`[Find Next Chapter] No next chapter found for Order ${nextOrderNum}, Level ${levelId}.`);
            res.status(404).json({ success: false, message: '未找到下一章节，可能已是最后一关' });
        }
    });
});

// --- 修改/新增：热力图数据接口，基于 UserPoints 推断登录 --- 
app.get('/api/activity/heatmap', authenticateToken, (req, res) => {
    try {
        const userId = req.user.id;
        const daysToQuery = 90; // 查询过去多少天的数据
        console.log(`[Heatmap API v3] Request for user ${userId}, last ${daysToQuery} days.`);

        const endDate = new Date(); // 今天

        // 查询用户的积分信息，主要需要 consecutive_login_days 和 last_login_date
        const getUserPointsSql = 'SELECT consecutive_login_days, last_login_date FROM UserPoints WHERE user_id = ?';

        db.get(getUserPointsSql, [userId], (err, userPoints) => {
            if (err) {
                console.error(`[Heatmap API v3] Database error fetching UserPoints for user ${userId}:`, err.message);
                return res.status(500).json({ success: false, message: '数据库查询错误' });
            }

            const consecutiveDays = userPoints ? userPoints.consecutive_login_days : 0;
            const lastLoginDateStr = userPoints ? userPoints.last_login_date : null;

            console.log(`[Heatmap API v3] User ${userId}: ConsecutiveDays=${consecutiveDays}, LastLoginDate=${lastLoginDateStr}`);

            const heatmapData = {};
            const todayStr = endDate.toISOString().split('T')[0];

            // 生成过去 N 天的日期范围并初始化为 0
            for (let i = 0; i < daysToQuery; i++) {
                const date = new Date(endDate);
                date.setDate(endDate.getDate() - i);
                const dateStr = date.toISOString().split('T')[0];
                heatmapData[dateStr] = 0; 
            }

            // 根据连续登录天数和最后登录日期标记活跃天
            if (lastLoginDateStr && consecutiveDays > 0) {
                 // 确保最后登录日期在查询范围内
                 if (heatmapData.hasOwnProperty(lastLoginDateStr)) {
                    const lastLogin = new Date(lastLoginDateStr);
                    // 从最后登录日期往前标记连续的天数
                    for (let i = 0; i < consecutiveDays; i++) {
                        const loginDate = new Date(lastLogin);
                        loginDate.setDate(lastLogin.getDate() - i);
                        const loginDateStrLoop = loginDate.toISOString().split('T')[0]; // 使用不同变量名避免覆盖
                        // 确保这个推断出的日期也在我们的查询范围内
                        if (heatmapData.hasOwnProperty(loginDateStrLoop)) {
                            heatmapData[loginDateStrLoop] = 1; // 标记为活跃
                        } else {
                            // 如果推断出的日期超出了查询范围，就停止标记
                            console.log(`[Heatmap API v3] Inferred date ${loginDateStrLoop} out of range for user ${userId}. Stopping marking.`);
                            break;
                        }
                    }
                 } else {
                    console.log(`[Heatmap API v3] Last login date ${lastLoginDateStr} is outside the ${daysToQuery}-day query range for user ${userId}.`);
                 }
            }

            console.log(`[Heatmap API v3] Generated heatmap data for user ${userId}.`);
            res.json({ success: true, heatmapData: heatmapData });
        });

    } catch (error) {
        console.error("[Heatmap API v3] Error:", error);
        res.status(500).json({ success: false, message: '服务器内部错误' });
    }
});
// --- 结束热力图接口 ---

// --- 新增：获取用户积分状态接口 --- 
app.get('/api/user/points', authenticateToken, (req, res) => {
    const userId = req.user.id;

    const sql = 'SELECT * FROM UserPoints WHERE user_id = ?';
    db.get(sql, [userId], (err, row) => {
        if (err) {
            console.error(`[Get Points] Error fetching UserPoints for user ${userId}:`, err.message);
            return res.status(500).json({ success: false, message: '查询用户积分信息失败' });
        }

        if (row) {
            // 找到了记录，返回
            console.log(`[Get Points] Found points data for user ${userId}:`, row);
            // 确保返回所有字段，即使是 null 或 0
            res.json({
                success: true, 
                pointsData: {
                    user_id: row.user_id,
                    total_points: row.total_points || 0,
                    consecutive_login_days: row.consecutive_login_days || 0,
                    max_consecutive_login_days: row.max_consecutive_login_days || 0,
                    total_login_days: row.total_login_days || 0,
                    last_login_date: row.last_login_date, // 可以是 null
                    points_multiplier: row.points_multiplier || 1.0,
                    completed_levels: row.completed_levels || 0
                }
            });
        } else {
            // 没有记录，返回默认值
            console.log(`[Get Points] No points data found for user ${userId}. Returning default values.`);
            res.json({
                success: true,
                pointsData: {
                    user_id: userId,
                    total_points: 0,
                    consecutive_login_days: 0,
                    max_consecutive_login_days: 0,
                    total_login_days: 0,
                    last_login_date: null,
                    points_multiplier: 1.0,
                    completed_levels: 0
                }
            });
        }
    });
});
// --- 结束新增接口 ---

// --- 新增：获取用户已完成章节的总单词数 --- 
app.get('/api/user/stats/completed-word-count', authenticateToken, (req, res) => {
    const userId = req.user.id;
    console.log(`[Stats API] Request for completed word count for user ${userId}`);

    // SQL 查询：
    // 1. 从 UserChapterProgress 获取用户每个 level 的 last_unlocked_order
    // 2. JOIN Chapters 找到 order_num 小于 last_unlocked_order 的章节
    // 3. LEFT JOIN Words 并 COUNT 单词数，按章节分组
    // 4. 最后 SUM 所有已完成章节的单词数
    const sql = `
        SELECT SUM(word_counts.count) as total_completed_words
        FROM (
            SELECT COUNT(w.id) as count
            FROM Chapters ch
            JOIN UserChapterProgress ucp ON ch.level_id = ucp.level_id
            LEFT JOIN Words w ON w.chapter_id = ch.id
            WHERE ucp.user_id = ? 
              AND ch.order_num < ucp.last_unlocked_order -- 关键：找到已完成的章节
            GROUP BY ch.id
        ) AS word_counts;
    `;

    db.get(sql, [userId], (err, row) => {
        if (err) {
            console.error(`[Stats API] Database error fetching completed word count for user ${userId}:`, err.message);
            return res.status(500).json({ success: false, message: '查询单词统计失败' });
        }

        const totalCount = row ? row.total_completed_words : 0;
        console.log(`[Stats API] User ${userId} has completed a total of ${totalCount} words.`);

        res.json({ success: true, totalCompletedWords: totalCount });
    });
});
// --- 结束新增接口 ---

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

// 创建新词汇级别 (需要管理员权限)
app.post('/api/vocabulary-levels', verifyAdminToken, (req, res) => {
    const { name, description, order_num } = req.body;

    // 1. 验证必要字段
    if (!name) {
        return res.status(400).json({ success: false, message: '级别名称不能为空' });
    }

    // 2. 确定排序序号
    const determineOrderNum = (callback) => {
        if (order_num !== undefined && !isNaN(parseInt(order_num))) {
            // 如果提供了有效的 order_num，直接使用
            callback(parseInt(order_num));
        } else {
            // 否则，查询当前最大排序号并加 1
            db.get('SELECT MAX(order_num) as max_order FROM Categories', [], (err, result) => {
                if (err) {
                    console.error('查询最大排序号失败:', err);
                    callback(1); // 查询失败或无数据时默认为 1
                } else {
                    callback((result.max_order || 0) + 1);
                }
            });
        }
    };

    // 3. 执行插入操作
    determineOrderNum((finalOrderNum) => {
        const sql = 'INSERT INTO Categories (name, description, order_num) VALUES (?, ?, ?)';
        db.run(sql, [name, description || '', finalOrderNum], function(err) { // 使用 function 获取 this.lastID
            if (err) {
                console.error('创建词汇级别失败:', err);
                // 检查是否是唯一性约束错误 (例如，名称重复)
                if (err.message && err.message.includes('UNIQUE constraint failed')) {
                    return res.status(409).json({ success: false, message: '级别名称已存在' }); // 409 Conflict
                }
                return res.status(500).json({ success: false, message: '数据库错误，无法创建级别' });
            }

            // 插入成功
            const newLevelId = this.lastID;
            console.log(`词汇级别创建成功: ID=${newLevelId}, Name=${name}`);
            res.status(201).json({ // 201 Created
                success: true,
                message: '词汇级别创建成功',
                level_id: newLevelId,
                level: {
                    id: newLevelId,
                    name: name,
                    description: description || '',
                    order_num: finalOrderNum
                }
            });
        });
    });
});
