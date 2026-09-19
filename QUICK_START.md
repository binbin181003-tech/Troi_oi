# 🚀 WRStudios Quick Start Guide

## What Was Fixed

**5 Critical Issues** preventing database sync and admin functionality:

1. ✅ **Route Path Mismatch**: Backend route was `/api/membership` but should be `/api/membership_packages`
2. ✅ **Response Format Inconsistency**: Users endpoint returned raw array instead of `{ success, data }`
3. ✅ **Admin Token Auth Failure**: Frontend created fake `base64` token, backend expected `JWT`
4. ✅ **Missing Error Responses**: Some endpoints didn't wrap responses properly
5. ✅ **Async/Await Mismatch**: `loginAdmin()` wasn't awaited in LoginModal

---

## 🏃 Quick Start (5 minutes)

### 1. Start Backend
```powershell
cd D:\DoAnChuyenNganh_CDIO4\wrstudios-backend
npm run dev
```
**Expected Output:**
```
✅ MySQL Connected Successfully!
🚀 Server running at http://localhost:4000
```

### 2. Verify Connection (PowerShell)
```powershell
curl http://localhost:4000/api/membership_packages | ConvertFrom-Json
```
**Expected:** 3 packages (Basic, Premium, Business)

### 3. Start Frontend
```powershell
cd D:\DoAnChuyenNganh_CDIO4\wrstudios-frontend\user-app
npm start
```

### 4. Test Flow
- **Register**: Create new user → appears in MySQL `users` table
- **Admin Login**: `admin` / `admin123` → see Dashboard
- **Admin Dashboard**: View all users from database
- **Edit Package**: Admin edits price → changes appear on PremiumPage

---

## 📝 Test Checklist

### User Registration Test
- [ ] Click "Đăng ký"
- [ ] Enter: name, email, password, phone
- [ ] See success message
- [ ] Open DevTools → Network → `POST /api/auth/register`
  - Status should be 201
  - Response should have `{ success: true, token, user }`
- [ ] Run MySQL: `SELECT * FROM users WHERE email='your-email';`
  - User should appear in database

### Admin Login Test
- [ ] Click "Đăng nhập"
- [ ] Enter: username=`admin`, password=`admin123`
- [ ] See success message
- [ ] Check header → "Admin" dropdown should appear
- [ ] Open DevTools → Network → `POST /api/auth/login`
  - Response token should be JWT (starts with `eyJh...`)
  - NOT base64 (doesn't start with `eyJ1`)

### Admin Dashboard Test
- [ ] Click Admin → "Quản lý người dùng"
- [ ] Should see user list from database
- [ ] Should include newly registered user
- [ ] Try delete/toggle → real-time update

### Premium Package Edit Test
- [ ] Go to `/admin/premium`
- [ ] See 3 packages: Basic (299k), Premium (799k), Business (1.09M)
- [ ] Click "Chỉnh sửa" on any package
- [ ] Change price (e.g., 699000)
- [ ] Click "Lưu"
- [ ] Should see "✅ Cập nhật gói thành công"
- [ ] Go to `/premium` (normal user view)
- [ ] Price should be updated there too (same database)

---

## 🔧 How It Works Now

### Before Fixes ❌
```
Frontend (loginAdmin)
  ↓ creates fake base64 token
  ↓
localStorage stores btoa(adminData)
  ↓
Backend receives Authorization: Bearer btoa(...)
  ↓ tries to verify as JWT
❌ FAILS - Not a valid JWT signature

Frontend (edit package)
  ❌ Cannot call admin endpoints (403 Forbidden)
  ❌ Changes stay in localStorage only
  ❌ Database never updated
```

### After Fixes ✅
```
Frontend (loginAdmin)
  ↓ calls authAPI.login('admin', 'admin123')
  ↓
Backend receives POST /api/auth/login
  ↓ verifies admin credentials
  ↓ returns signed JWT token
  ↓
Frontend stores real JWT
  ↓
Backend receives Authorization: Bearer <JWT>
  ↓ verifies token signature ✅
  ✅ PASSES - Token is valid

Frontend (edit package)
  ✅ Can call admin endpoints
  ✅ Changes written to MySQL database
  ✅ PremiumPage reads same database
  ✅ Both views stay in sync
```

---

## 📊 Data Flow

### User Registration → Admin Sees It
```
Frontend RegisterModal
  ↓ POST /api/auth/register
Backend: Insert into users table
  ↓ Response: { success: true, user, token }
Frontend: Store token + user
  ↓ 
Admin Dashboard: GET /api/users
  ↓ [Middleware: verifyToken, isAdmin]
Backend: SELECT * FROM users
  ↓ Response: { success: true, data: [...] }
Frontend: Render user list
  ↓
✅ New user visible in admin dashboard
```

### Admin Edits Package → User Sees It
```
AdminPremiumPage: membershipAPI.update(ms_id, { price: 999000 })
  ↓ PUT /api/membership_packages/:id
  ↓ [Middleware: verifyToken, isAdmin]
Backend: UPDATE membership_packages SET price=999000
  ↓ Response: { success: true }
AdminPremiumPage: Reload data
  ↓ GET /api/membership_packages
  ↓
PremiumPage: Also fetch GET /api/membership_packages
  ↓
✅ Both pages show updated price from database
```

---

## 🧪 Testing Script

Run this PowerShell script to verify everything:
```powershell
.\test_backend_connection.ps1
```

This will test:
- Backend health check
- Membership packages endpoint
- User registration
- Admin login
- Users list (with JWT)

---

## 🔐 Important Security Notes

**Current State:**
- ⚠️ Passwords are **plain text** (NOT hashed)
- ✅ JWT tokens are signed and verified
- ✅ Admin endpoints require valid token + admin role

**For Production:**
1. Install bcrypt:
   ```bash
   npm install bcrypt
   ```
2. Hash passwords on registration
3. Use environment variables for JWT_SECRET
4. Add rate limiting to auth endpoints
5. Use HTTPS only

---

## 🆘 Troubleshooting

### Issue: "Network Error" when registering
**Solution:**
- Check if backend is running: `npm run dev` in backend folder
- Check if CORS is enabled: backend/index.js should have `app.use(cors())`
- Check if port 4000 is available

### Issue: "Admin cannot edit packages (403 Forbidden)"
**Solution:**
- Open DevTools → Network → find PUT request to `/api/membership_packages`
- Check response: Should NOT be 403
- If 403: Admin token is not valid JWT
- Check localStorage → "auth_token" should start with `eyJh`, not `eyJ1`

### Issue: "PremiumPage is empty"
**Solution:**
- DevTools → Network → `GET /api/membership_packages`
- Response should have `{ success: true, data: [{...}, {...}, {...}] }`
- If data is empty: Check MySQL `SELECT * FROM membership_packages;`
- If query returns empty: Run the INSERT statements provided

### Issue: "User doesn't appear in admin dashboard"
**Solution:**
- DevTools → Network → `GET /api/users`
- Response should be `{ success: true, data: [{...}] }`
- If data is missing: Check if logged in as admin (verify token in devtools)
- If still fails: Check backend console for errors

---

## 📞 Files Modified Summary

| File | Changes | Status |
|------|---------|--------|
| wrstudios-backend/index.js | Fixed route path | ✅ |
| wrstudios-backend/routes/users.js | Added response wrapping | ✅ |
| wrstudios-frontend/user-app/src/utils/auth.jsx | Fixed admin token | ✅ |
| wrstudios-frontend/user-app/src/components/LoginModal.jsx | Added await | ✅ |
| wrstudios-frontend/user-app/src/admin_components/AdminPremiumPage.jsx | Use API (previous) | ✅ |

---

## ✅ Expected Results After Testing

- [ ] Register new user → appears in admin list
- [ ] Admin can login with admin/admin123
- [ ] Admin can see all users from database
- [ ] Admin can edit membership packages
- [ ] PremiumPage shows updated packages
- [ ] Console shows no JWT/auth errors
- [ ] Network tab shows 200/201 status codes (not 403)

---

## 🎯 Next Steps

1. **Run both servers** (backend + frontend)
2. **Run test script** to verify connections
3. **Test registration** → check MySQL
4. **Test admin login** → check token is JWT
5. **Test admin edits** → check database updates
6. **Report any errors** with screenshot of DevTools Network tab

---

Generated: 2025-12-01
