// wrstudios-backend/routes/transactions.js
import express from 'express';
import db from '../config/database.js';

const router = express.Router();

// Tạo table transactions (chạy 1 lần duy nhất) - SQL Server version
const createTransactionsTable = async () => {
  try {
    await db.query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='transactions' AND xtype='U')
      CREATE TABLE transactions (
        id NVARCHAR(50) PRIMARY KEY,
        userId NVARCHAR(50) NOT NULL,
        userAccount NVARCHAR(255) NOT NULL,
        method NVARCHAR(50) NOT NULL,
        planName NVARCHAR(100) NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        currency NVARCHAR(10) DEFAULT 'VND',
        content NVARCHAR(MAX),
        status NVARCHAR(20) CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
        date DATETIME DEFAULT GETDATE(),
        createdAt DATETIME DEFAULT GETDATE(),
        updatedAt DATETIME DEFAULT GETDATE()
      )
    `);

    // Tạo trigger để auto update updatedAt khi UPDATE
    await db.query(`
      IF OBJECT_ID('trg_transactions_updatedAt', 'TR') IS NULL
      EXEC('
        CREATE TRIGGER trg_transactions_updatedAt
        ON transactions
        AFTER UPDATE
        AS
        BEGIN
          SET NOCOUNT ON;
          UPDATE t
          SET updatedAt = GETDATE()
          FROM transactions t
          INNER JOIN inserted i ON t.id = i.id;
        END
      ')
    `);

    console.log('✅ Transactions table ready (SQL Server)');
  } catch (error) {
    console.error('❌ Error creating transactions table:', error.message);
  }
};

// Chạy khi server start
createTransactionsTable();

// GET /api/transactions - Lấy tất cả giao dịch
router.get('/', async (req, res) => {
  try {
    const rows = await db.query(
      'SELECT * FROM transactions ORDER BY date DESC'
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/transactions - Tạo giao dịch mới
router.post('/', async (req, res) => {
  try {
    const { userId, userAccount, method, planName, amount, currency, content } = req.body;

    const id = `TRX${Date.now()}`;

    await db.query(
      `INSERT INTO transactions (id, userId, userAccount, method, planName, amount, currency, content, status, date)
       VALUES (@id, @userId, @userAccount, @method, @planName, @amount, @currency, @content, 'pending', GETDATE())`,
      {
        id,
        userId,
        userAccount,
        method,
        planName,
        amount,
        currency,
        content: content ?? null
      }
    );

    res.status(201).json({ success: true, id });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PATCH /api/transactions/:id - Duyệt/Từ chối
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // "approved" or "rejected"

    // Update transaction status
    await db.query(
      'UPDATE transactions SET status = @status WHERE id = @id',
      { status, id }
    );

    // Nếu approved → Tạo membership_user
    if (status === 'approved') {
      const transaction = await db.query(
        'SELECT userId, planName FROM transactions WHERE id = @id',
        { id }
      );

      if (transaction.length > 0) {
        const { userId, planName } = transaction[0];

        // Lấy thông tin gói
        const plan = await db.query(
          'SELECT ms_id, duration FROM membership_packages WHERE name = @planName',
          { planName }
        );

        if (plan.length > 0) {
          const { ms_id, duration } = plan[0];
          const member_user_id = `mu_${Date.now()}`;

          // Insert vào membership_user (date math bằng DATEADD của SQL Server)
          await db.query(
            `INSERT INTO membership_user (member_user_id, start_at, end_at, status, user_id, ms_id)
             VALUES (@member_user_id, GETDATE(), DATEADD(DAY, @duration, GETDATE()), 'active', @userId, @ms_id)`,
            { member_user_id, duration, userId, ms_id }
          );
        }
      }
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;