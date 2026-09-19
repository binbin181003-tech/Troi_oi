// wrstudios-backend/routes/auth.js - SQL Server version (giữ nguyên logic)
import express from 'express';
import jwt from 'jsonwebtoken';
import db from '../config/database.js';

const router = express.Router();
const SECRET_KEY = process.env.JWT_SECRET || 'change-me';

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;

    if (!name || !email || !phone || !password) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng điền đầy đủ thông tin'
      });
    }

    // Check duplicates
    const existingNameResult = await db.query(
      'SELECT user_id FROM users WHERE name = @p0',
      [name]
    );
    const existingName = existingNameResult.recordset || [];
    if (existingName.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Tên tài khoản này đã được sử dụng'
      });
    }

    const existingEmailResult = await db.query(
      'SELECT user_id FROM users WHERE email = @p0',
      [email]
    );
    const existingEmail = existingEmailResult.recordset || [];
    if (existingEmail.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Email này đã được sử dụng'
      });
    }

    const existingPhoneResult = await db.query(
      'SELECT user_id FROM users WHERE phone = @p0',
      [phone]
    );
    const existingPhone = existingPhoneResult.recordset || [];
    if (existingPhone.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Số điện thoại này đã được sử dụng'
      });
    }

    const user_id = `user_${Date.now()}`;

    await db.query(
      `INSERT INTO users (user_id, name, email, phone, password, status, role, created_at)
       VALUES (@p0, @p1, @p2, @p3, @p4, 'active', 'member', GETDATE())`,
      [user_id, name, email, phone, password]
    );

    const token = jwt.sign(
      { user_id, email, name, role: 'member' },
      SECRET_KEY,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      success: true,
      message: 'Đăng ký thành công!',
      token, // giữ token thật để frontend dùng luôn
      user: {
        user_id,
        name,
        email,
        phone,
        role: 'member',
        status: 'active'
      }
    });

  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server',
      error: error.message
    });
  }
});

// POST /api/auth/login - PHÂN BIỆT ADMIN VÀ USER
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body; // Frontend gửi field "email" (có thể là email/phone/username)

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng điền đầy đủ thông tin'
      });
    }

    console.log('🔐 Login attempt:', email);

    let users = [];

    // ✅ KIỂM TRA ADMIN: Chỉ tìm bằng name (username)
    if (email.toLowerCase() === 'admin' || email === 'admin') {
      console.log('👑 Admin login detected');
      const adminResult = await db.query(
        'SELECT * FROM users WHERE name = @p0 AND role = @p1',
        [email, 'admin']
      );
      users = adminResult.recordset || [];
    } else {
      // ✅ USER: Chỉ tìm bằng email HOẶC phone (KHÔNG TÌM name)
      console.log('👤 User login detected');
      const userResult = await db.query(
        'SELECT * FROM users WHERE (email = @p0 OR phone = @p1) AND role <> @p2',
        [email, email, 'admin']
      );
      users = userResult.recordset || [];
    }

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Email/Số điện thoại hoặc mật khẩu không chính xác'
      });
    }

    const user = users[0];
    console.log('✅ User found:', user.user_id, user.name, user.role);

    // Check password
    const isValidPassword = (password === user.password); // TODO: bcrypt
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Email/Số điện thoại hoặc mật khẩu không chính xác'
      });
    }

    // Check status
    if (user.status !== 'active') {
      return res.status(403).json({
        success: false,
        message: 'Tài khoản đã bị vô hiệu hóa'
      });
    }

    // Create token
    const token = jwt.sign(
      {
        user_id: user.user_id,
        email: user.email,
        name: user.name,
        role: user.role
      },
      SECRET_KEY,
      { expiresIn: '24h' }
    );

    console.log('✅ Login successful:', user.name, user.role);

    res.json({
      success: true,
      message: 'Đăng nhập thành công!',
      token,
      user: {
        user_id: user.user_id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        status: user.status,
        image_url: user.image_url
      }
    });

  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server',
      error: error.message
    });
  }
});

export default router;