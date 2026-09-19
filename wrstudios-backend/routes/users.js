import express from 'express';
import db from '../config/database.js';
import { verifyToken, isAdmin } from '../middleware/auth.js';

const router = express.Router();

/**
 * Helper: chuẩn hóa record user từ SQL Server
 */
const mapUserRow = (row) => ({
  user_id: row.user_id,
  name: row.name,
  email: row.email,
  phone: row.phone,
  password: row.password, // giữ nguyên như logic cũ (nếu trước đây có trả)
  role: row.role,
  status: row.status,
  created_at: row.created_at,
  updated_at: row.updated_at,
});

/**
 * GET /api/users
 * Lấy tất cả users (chỉ admin)
 * Response: { success: true, data: [...] }
 */
router.get('/', verifyToken, isAdmin, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        user_id, name, email, phone, password, role, status, created_at, updated_at
      FROM users
      ORDER BY created_at DESC
    `);

    const rows = result.recordset || [];
    return res.json({
      success: true,
      data: rows.map(mapUserRow),
    });
  } catch (error) {
    console.error('GET /api/users error:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi server khi lấy danh sách users',
      error: error.message,
    });
  }
});

/**
 * GET /api/users/:id
 * Lấy chi tiết user (admin hoặc chính user đó)
 * Response: { success: true, data: {...} }
 */
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Admin hoặc chính user đó
    const requesterId = req.user?.user_id || req.user?.id;
    const requesterRole = req.user?.role;
    if (requesterRole !== 'admin' && String(requesterId) !== String(id)) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền truy cập thông tin user này',
      });
    }

    const result = await db.query(
      `
      SELECT 
        user_id, name, email, phone, password, role, status, created_at, updated_at
      FROM users
      WHERE user_id = @id
      `,
      { id }
    );

    const row = result.recordset?.[0];
    if (!row) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy user',
      });
    }

    return res.json({
      success: true,
      data: mapUserRow(row),
    });
  } catch (error) {
    console.error('GET /api/users/:id error:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi server khi lấy chi tiết user',
      error: error.message,
    });
  }
});

/**
 * PUT /api/users/:id
 * Cập nhật user (admin hoặc chính user đó)
 * Body: { name?, email?, phone?, status?, role?, password? }
 */
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, status, role, password } = req.body;

    const requesterId = req.user?.user_id || req.user?.id;
    const requesterRole = req.user?.role;

    // Không phải admin thì chỉ sửa profile cơ bản của chính mình
    const isSelf = String(requesterId) === String(id);
    const isAdminUser = requesterRole === 'admin';

    if (!isAdminUser && !isSelf) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền cập nhật user này',
      });
    }

    // Check tồn tại user
    const existing = await db.query(
      `SELECT user_id FROM users WHERE user_id = @id`,
      { id }
    );
    if (!existing.recordset?.length) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy user',
      });
    }

    // Validate email unique nếu có đổi email
    if (email) {
      const emailCheck = await db.query(
        `
        SELECT user_id 
        FROM users
        WHERE email = @email AND user_id <> @id
        `,
        { email, id }
      );
      if (emailCheck.recordset?.length) {
        return res.status(400).json({
          success: false,
          message: 'Email đã tồn tại',
        });
      }
    }

    // Build dynamic update
    const fields = [];
    const params = { id };

    if (name !== undefined) {
      fields.push(`name = @name`);
      params.name = name;
    }
    if (email !== undefined) {
      fields.push(`email = @email`);
      params.email = email;
    }
    if (phone !== undefined) {
      fields.push(`phone = @phone`);
      params.phone = phone;
    }
    if (password !== undefined) {
      fields.push(`password = @password`);
      params.password = password;
    }

    // Chỉ admin mới được sửa role/status
    if (isAdminUser && status !== undefined) {
      fields.push(`status = @status`);
      params.status = status;
    }
    if (isAdminUser && role !== undefined) {
      fields.push(`role = @role`);
      params.role = role;
    }

    if (!fields.length) {
      return res.status(400).json({
        success: false,
        message: 'Không có dữ liệu hợp lệ để cập nhật',
      });
    }

    fields.push(`updated_at = GETDATE()`);

    await db.query(
      `
      UPDATE users
      SET ${fields.join(', ')}
      WHERE user_id = @id
      `,
      params
    );

    const updated = await db.query(
      `
      SELECT 
        user_id, name, email, phone, password, role, status, created_at, updated_at
      FROM users
      WHERE user_id = @id
      `,
      { id }
    );

    return res.json({
      success: true,
      message: 'Cập nhật user thành công',
      data: mapUserRow(updated.recordset[0]),
    });
  } catch (error) {
    console.error('PUT /api/users/:id error:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi server khi cập nhật user',
      error: error.message,
    });
  }
});

/**
 * PUT /api/users/:id/profile
 * Cập nhật profile riêng (tương thích frontend hiện tại)
 * Body: { name?, email?, phone?, currentPassword?, newPassword? }
 */
router.put('/:id/profile', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, currentPassword, newPassword } = req.body;

    const requesterId = req.user?.user_id || req.user?.id;
    const requesterRole = req.user?.role;

    const isSelf = String(requesterId) === String(id);
    const isAdminUser = requesterRole === 'admin';

    if (!isAdminUser && !isSelf) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền cập nhật profile này',
      });
    }

    const currentUserResult = await db.query(
      `
      SELECT user_id, password
      FROM users
      WHERE user_id = @id
      `,
      { id }
    );

    const currentUser = currentUserResult.recordset?.[0];
    if (!currentUser) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy user',
      });
    }

    // Nếu đổi password thì check currentPassword (giữ logic plain text như cũ)
    if (newPassword !== undefined && newPassword !== '') {
      if (!currentPassword) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng nhập mật khẩu hiện tại',
        });
      }

      if (!isAdminUser && currentPassword !== currentUser.password) {
        return res.status(400).json({
          success: false,
          message: 'Mật khẩu hiện tại không đúng',
        });
      }
    }

    // Check email duplicate
    if (email) {
      const emailCheck = await db.query(
        `
        SELECT user_id
        FROM users
        WHERE email = @email AND user_id <> @id
        `,
        { email, id }
      );
      if (emailCheck.recordset?.length) {
        return res.status(400).json({
          success: false,
          message: 'Email đã tồn tại',
        });
      }
    }

    const fields = [];
    const params = { id };

    if (name !== undefined) {
      fields.push('name = @name');
      params.name = name;
    }
    if (email !== undefined) {
      fields.push('email = @email');
      params.email = email;
    }
    if (phone !== undefined) {
      fields.push('phone = @phone');
      params.phone = phone;
    }
    if (newPassword !== undefined && newPassword !== '') {
      fields.push('password = @password');
      params.password = newPassword;
    }

    if (!fields.length) {
      return res.status(400).json({
        success: false,
        message: 'Không có dữ liệu để cập nhật',
      });
    }

    fields.push('updated_at = GETDATE()');

    await db.query(
      `
      UPDATE users
      SET ${fields.join(', ')}
      WHERE user_id = @id
      `,
      params
    );

    const updated = await db.query(
      `
      SELECT 
        user_id, name, email, phone, password, role, status, created_at, updated_at
      FROM users
      WHERE user_id = @id
      `,
      { id }
    );

    return res.json({
      success: true,
      message: 'Cập nhật profile thành công',
      user: mapUserRow(updated.recordset[0]),
    });
  } catch (error) {
    console.error('PUT /api/users/:id/profile error:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi server khi cập nhật profile',
      error: error.message,
    });
  }
});

/**
 * GET /api/users/:id/password
 * Trả password cho màn profile hiện tại (giữ tương thích code cũ)
 */
router.get('/:id/password', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    const requesterId = req.user?.user_id || req.user?.id;
    const requesterRole = req.user?.role;
    if (requesterRole !== 'admin' && String(requesterId) !== String(id)) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền truy cập mật khẩu user này',
      });
    }

    const result = await db.query(
      `
      SELECT password
      FROM users
      WHERE user_id = @id
      `,
      { id }
    );

    const row = result.recordset?.[0];
    if (!row) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy user',
      });
    }

    return res.json({
      success: true,
      password: row.password,
    });
  } catch (error) {
    console.error('GET /api/users/:id/password error:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi server khi lấy mật khẩu',
      error: error.message,
    });
  }
});

/**
 * GET /api/users/:id/membership
 * Lấy membership hiện tại của user
 */
router.get('/:id/membership', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    const requesterId = req.user?.user_id || req.user?.id;
    const requesterRole = req.user?.role;
    if (requesterRole !== 'admin' && String(requesterId) !== String(id)) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền truy cập membership user này',
      });
    }

    // Tùy schema, query dưới đây giả định membership_user có:
    // user_id, ms_id, start_date, end_date, posts_used
    const result = await db.query(
      `
      SELECT TOP 1
        mu.user_id,
        mu.ms_id,
        mu.start_date,
        mu.end_date,
        mu.posts_used,
        mp.name AS package_name,
        mp.post_limit
      FROM membership_user mu
      INNER JOIN membership_packages mp ON mp.ms_id = mu.ms_id
      WHERE mu.user_id = @id
      ORDER BY mu.end_date DESC
      `,
      { id }
    );

    const row = result.recordset?.[0];
    if (!row) {
      return res.json({
        success: true,
        data: {
          hasActiveMembership: false,
        },
      });
    }

    const now = new Date();
    const endDate = row.end_date ? new Date(row.end_date) : null;
    const isActive = endDate ? endDate >= now : false;

    const daysRemaining = endDate
      ? Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    const currentPostCount = Number(row.posts_used || 0);
    const postLimit = Number(row.post_limit || 0);

    // canRenew: bạn có thể đổi rule theo logic cũ
    const canRenew = !isActive || daysRemaining <= 7;

    return res.json({
      success: true,
      data: {
        hasActiveMembership: isActive,
        canRenew,
        currentPostCount,
        membership: {
          ms_id: row.ms_id,
          package_name: row.package_name,
          post_limit: postLimit,
          start_date: row.start_date,
          end_date: row.end_date,
          daysRemaining: Math.max(0, daysRemaining),
        },
      },
    });
  } catch (error) {
    console.error('GET /api/users/:id/membership error:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi server khi lấy membership',
      error: error.message,
    });
  }
});

/**
 * DELETE /api/users/:id
 * Xóa user (chỉ admin)
 * Response: { success: true, data: deletedUser }
 */
router.delete('/:id', verifyToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await db.query(
      `
      SELECT 
        user_id, name, email, phone, password, role, status, created_at, updated_at
      FROM users
      WHERE user_id = @id
      `,
      { id }
    );

    const user = existing.recordset?.[0];
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy user',
      });
    }

    await db.query(
      `
      DELETE FROM users
      WHERE user_id = @id
      `,
      { id }
    );

    return res.json({
      success: true,
      message: 'Xóa user thành công',
      data: mapUserRow(user),
    });
  } catch (error) {
    console.error('DELETE /api/users/:id error:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi server khi xóa user',
      error: error.message,
    });
  }
});

export default router;