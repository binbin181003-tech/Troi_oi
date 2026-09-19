# 🚀 HƯỚNG DẪN CHẠY HỆ THỐNG (Frontend + Backend)

## Yêu cầu

- Node.js v14+ (kiểm tra: `node --version`)
- MySQL 5.7+ (kiểm tra: `mysql --version`)
- PowerShell (hoặc cmd/bash tuỳ hệ điều hành)

---

## 1️⃣ SETUP DATABASE

### Bước 1: Kết nối MySQL

```powershell
mysql -u root -p
```

Nhập password: `123456789`

### Bước 2: Tạo Database (nếu chưa có)

```sql
CREATE DATABASE IF NOT EXISTS rental_app CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### Bước 3: Chạy SQL Schema

```sql
USE rental_app;

-- Copy toàn bộ SQL từ file bạn gửi và paste vào đây
-- Hoặc có thể source từ file:
-- SOURCE /path/to/schema.sql;
```

---

## 2️⃣ KHỞI ĐỘNG BACKEND

### Bước 1: Vào thư mục backend

```powershell
cd .\wrstudios-backend\
```

### Bước 2: Cài dependencies

```powershell
npm install
```

### Bước 3: Kiểm tra/cập nhật `.env`

```bash
# File: .env
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=123456789
DB_NAME=rental_app
PORT=4000
JWT_SECRET=your-secret-key-change-in-production
```

### Bước 4: Chạy server

```powershell
npm run dev
# hoặc: node index.js
```

**✅ Nếu thấy:**

```
✅ MySQL Connected Successfully!
🚀 Server running at http://localhost:4000
```

Backend đã chạy thành công!

---

## 3️⃣ KHỞI ĐỘNG FRONTEND

### Bước 1: Mở terminal mới (không đóng terminal backend)

```powershell
cd .\wrstudios-frontend\user-app\
```

### Bước 2: Cài dependencies

```powershell
npm install
```

### Bước 3: Chạy dev server

```powershell
npm start
```

**✅ Nếu thấy:**

```
Compiled successfully!
On Your Network: http://192.168.x.x:3000
```

Frontend đã chạy tại `http://localhost:3000`

---

## 4️⃣ TEST HỆ THỐNG

### Test 1: Đăng ký user mới

1. Mở `http://localhost:3000`
2. Click "Sign Up"
3. Nhập:
   - Name: `Test User`
   - Email: `test@example.com`
   - Phone: `0987654321`
   - Password: `Test123!`
4. Click "Register"

**Kiểm tra:**

- Mở MySQL: `SELECT * FROM users;`
- Bạn sẽ thấy user mới được lưu!

### Test 2: Đăng nhập

1. Click "Log In"
2. Nhập: `test@example.com` / `Test123!`
3. Click "Log In"

**Kiểm tra:**

- Bạn nên thấy user dropdown ở header
- Thông tin user được lưu trong localStorage

### Test 3: Đăng nhập Admin

1. Click "Log In"
2. Nhập: `admin` / `admin123`
3. Click "Log In"

**Kiểm tra:**

- Bạn nên thấy "Dashboard" link ở dropdown
- Truy cập `/admin` để xem admin dashboard

### Test 4: Đăng bài

1. Đảm bảo bạn đã đăng nhập (user thường)
2. Click "Post"
3. Nhập thông tin:
   - Tiêu đề: `Studio đẹp Q1`
   - Mô tả: `Studio hiện đại giá tốt`
   - Giá: `5000000`
   - Diện tích: `25`
   - Vị trí: `Quận 1, TP.HCM`
   - Upload ảnh (ít nhất 1)
4. Click "Đăng bài"

**Kiểm tra:**

- Mở MySQL: `SELECT * FROM posts;`
- Bạn sẽ thấy post mới
- Mở MySQL: `SELECT * FROM images;`
- Bạn sẽ thấy images được lưu

### Test 5: Xem bài viết

1. Click "Posts"
2. Bạn sẽ thấy danh sách bài viết từ database
3. Click vào 1 bài viết để xem chi tiết

**Kiểm tra:**

- `views` trong database sẽ tăng lên khi bạn xem bài
- Comments hiển thị từ database

---

## 5️⃣ TROUBLESHOOTING

### ❌ Backend không kết nối MySQL

```
Error: connect ECONNREFUSED 127.0.0.1:3306
```

**Giải pháp:**

1. Kiểm tra MySQL đang chạy: `mysql -u root -p`
2. Kiểm tra `.env` có DB_HOST, DB_USER, DB_PASSWORD đúng không

### ❌ Frontend không kết nối Backend

```
Error: Failed to fetch http://localhost:4000/api/...
```

**Giải pháp:**

1. Kiểm tra backend đã chạy ở port 4000: `http://localhost:4000`
2. Kiểm tra CORS được enable ở backend (có sẵn trong code)
3. Mở DevTools (F12) > Network tab > kiểm tra request

### ❌ Lỗi import/require modules

```
Error: Cannot find module 'express'
```

**Giải pháp:**

1. Chạy: `npm install`
2. Xóa node_modules: `rm -r node_modules`
3. Cài lại: `npm install`

### ❌ Port 3000 hoặc 4000 đã được sử dụng

```
Error: listen EADDRINUSE :::3000
```

**Giải pháp:**

- Thay đổi port trong `.env` (backend) hoặc `.env.local` (frontend)
- Hoặc kill process: `lsof -ti:3000 | xargs kill -9`

---

## 6️⃣ API ENDPOINTS

### Auth

- `POST /api/auth/register` - Đăng ký
- `POST /api/auth/login` - Đăng nhập
- `GET /api/auth/me` - Lấy thông tin user hiện tại (cần token)

### Posts

- `GET /api/posts` - Lấy tất cả bài viết
- `GET /api/posts/:id` - Lấy bài viết theo ID
- `POST /api/posts` - Tạo bài viết mới (cần token)
- `PUT /api/posts/:id` - Cập nhật bài viết (cần token)
- `DELETE /api/posts/:id` - Xóa bài viết (cần token)

### Comments

- `GET /api/comments/post/:postId` - Lấy comments của bài
- `POST /api/comments` - Tạo comment (cần token)
- `PUT /api/comments/:id` - Cập nhật comment (cần token)
- `DELETE /api/comments/:id` - Xóa comment (cần token)

### Users

- `GET /api/users` - Lấy tất cả users (chỉ admin)
- `GET /api/users/:id` - Lấy thông tin user (cần token)
- `PUT /api/users/:id` - Cập nhật user (cần token)
- `DELETE /api/users/:id` - Xóa user (chỉ admin)

### Membership

- `GET /api/membership` - Lấy tất cả gói membership
- `GET /api/membership/:id` - Lấy gói membership theo ID
- `POST /api/membership` - Tạo gói mới (chỉ admin)
- `PUT /api/membership/:id` - Cập nhật gói (chỉ admin)
- `DELETE /api/membership/:id` - Xóa gói (chỉ admin)

---

## 7️⃣ CẤU TRÚC DỮ LIỆU

### Ví dụ Response khi tạo post:

```json
{
  "success": true,
  "message": "Post created",
  "post_id": "post_1733047200000"
}
```

### Ví dụ Response khi lấy posts:

```json
{
  "success": true,
  "data": [
    {
      "post_id": "post_1733047200000",
      "title": "Studio đẹp Q1",
      "description": "Studio hiện đại giá tốt",
      "address": "Quận 1, TP.HCM",
      "price": 5000000,
      "area": 25,
      "views": 2,
      "created_at": "2024-12-01T10:00:00.000Z",
      "author_name": "Test User",
      "images": [
        { "image_id": "img_1733047200000_0", "img_url": "data:image/..." }
      ],
      "comments_count": 1
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 5,
    "pages": 1
  }
}
```

---

## ✅ CHECKLIST

- [ ] Database `rental_app` được tạo
- [ ] Backend chạy tại `http://localhost:4000` ✅
- [ ] Frontend chạy tại `http://localhost:3000` ✅
- [ ] Có thể đăng ký user mới ✅
- [ ] Có thể đăng nhập ✅
- [ ] Có thể đăng bài ✅
- [ ] Data được lưu vào database ✅
- [ ] Có thể xem danh sách bài viết ✅
- [ ] Có thể xem chi tiết bài viết ✅
- [ ] Có thể bình luận ✅
- [ ] Admin dashboard hoạt động ✅

---

## 💡 LƯU Ý

1. **JWT Token**: Token được lưu ở localStorage với key `auth_token`
2. **Authorization Header**: Khi gọi API có `verifyToken` middleware, phải thêm header: `Authorization: Bearer <token>`
3. **Password**: Hiện tại password không được hash (không an toàn cho production). Bạn cần thêm bcrypt sau.
4. **CORS**: Đã enable ở backend, frontend có thể gọi API từ http://localhost:3000

---

## 📞 CẦN GIÚP?

Nếu gặp lỗi, kiểm tra:

1. Console của browser (F12)
2. Terminal chạy backend
3. Terminal chạy frontend
4. MySQL connection: `mysql -u root -p`

---

**Chúc bạn chạy thử thành công! 🎉**
