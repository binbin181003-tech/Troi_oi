// wrstudios-backend/config/database.js
import sql from 'mssql';
import dotenv from 'dotenv';

dotenv.config();

// Parse DATABASE_URL or use individual environment variables
let dbConfig = {};

if (process.env.DATABASE_URL) {
  // Parse DATABASE_URL format (SQL Server):
  // sqlserver://user:password@host:port/database
  // hoặc mssql://user:password@host:port/database
  try {
    const url = new URL(process.env.DATABASE_URL);

    dbConfig = {
      server: url.hostname,
      port: parseInt(url.port) || 1433,
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      database: url.pathname.slice(1), // Remove leading '/'
      options: {
        encrypt: false, // set true if using Azure SQL
        trustServerCertificate: true // needed for local/self-signed cert
      },
      pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
      }
    };

    console.log('📊 Using DATABASE_URL for connection');
  } catch (error) {
    console.error('❌ Error parsing DATABASE_URL:', error.message);
    console.error('⚠️ Falling back to individual environment variables');

    dbConfig = {
      server: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT) || 1433,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      options: {
        encrypt: false,
        trustServerCertificate: true
      },
      pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
      }
    };
  }
} else {
  // Use individual environment variables
  dbConfig = {
    server: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT) || 1433,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    options: {
      encrypt: false,
      trustServerCertificate: true
    },
    pool: {
      max: 10,
      min: 0,
      idleTimeoutMillis: 30000
    }
  };
  console.log('📊 Using individual environment variables for connection');
}

// Create + test connection pool once
let pool;

try {
  pool = await sql.connect(dbConfig);

  // Optional: tương đương logic setup session (MySQL group_concat_max_len)
  // SQL Server không cần setting tương tự cho case này, nên bỏ qua.

  console.log('✅ SQL Server Connected Successfully!');
  console.log(`   Database: ${dbConfig.database}`);
} catch (err) {
  console.error('\n❌ SQL Server Connection Error:', err.message);
  console.error('\n📊 Connection Details:');
  console.error(`   Host: ${dbConfig.server}`);
  console.error(`   Port: ${dbConfig.port}`);
  console.error(`   User: ${dbConfig.user}`);
  console.error(`   Database: ${dbConfig.database || 'NOT SET'}`);
  console.error(`   Password: ${dbConfig.password ? '***SET***' : '(empty)'}`);
  console.error('\n💡 Troubleshooting:');
  console.error('   1. Verify SQL Server service is running');
  console.error('   2. Check DATABASE_URL format: sqlserver://user:password@host:port/database');
  console.error('   3. Ensure database exists');
  console.error('   4. Verify SQL login/user permissions');
  console.error('   5. Enable TCP/IP in SQL Server Configuration Manager\n');
  process.exit(1);
}

export { sql };
export default pool;