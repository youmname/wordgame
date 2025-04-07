const express = require('express');
const mysql = require('mysql2');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const bcrypt = require('bcrypt');

const app = express();
app.use(express.json());
app.use(cors());

// 数据库连接配置
const db = mysql.createConnection({
    host: 'localhost',
    user: 'your_username',
    password: 'your_password',
    database: 'your_database'
});

// 连接数据库
db.connect((err) => {
    if (err) {
        console.error('数据库连接失败:', err);
        return;
    }
    console.log('数据库连接成功');
});

// JWT密钥
const JWT_SECRET = 'your-secret-key';

// 登录接口
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;

    // 从数据库查询用户
    const query = 'SELECT * FROM users WHERE email = ?';
    db.query(query, [email], async (err, results) => {
        if (err) {
            console.error('查询错误:', err);
            return res.status(500).json({ success: false, message: '服务器错误' });
        }

        if (results.length === 0) {
            return res.status(401).json({ success: false, message: '账号或激活码错误' });
        }

        const user = results[0];
        
        // 验证激活码
        const isValid = await bcrypt.compare(password, user.activation_code);
        
        if (!isValid) {
            return res.status(401).json({ success: false, message: '账号或激活码错误' });
        }

        // 生成JWT token
        const token = jwt.sign(
            { userId: user.id, email: user.email },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            success: true,
            token,
            user: {
                id: user.id,
                email: user.email
            }
        });
    });
});

// 验证token接口
app.post('/api/verify-token', (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ success: false, message: '未提供token' });
    }

    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        res.json({ success: true, user: decoded });
    } catch (err) {
        res.status(401).json({ success: false, message: 'token无效' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`服务器运行在端口 ${PORT}`);
}); 