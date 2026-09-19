#!/usr/bin/env pwsh
# WRStudios Backend Connection Test Script
# Run this in PowerShell to verify all connections are working

Write-Host "🔍 WRStudios Backend Connection Test" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# Test 1: Backend Health Check
Write-Host "1️⃣  Testing Backend Health..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:4000/" -Method GET -ErrorAction Stop
    $data = $response.Content | ConvertFrom-Json
    Write-Host "✅ Backend Running: $($data.status)" -ForegroundColor Green
    Write-Host "   Message: $($data.message)" -ForegroundColor Green
} catch {
    Write-Host "❌ Backend Not Responding at http://localhost:4000/" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "   💡 Make sure backend is running: npm run dev" -ForegroundColor Yellow
}

Write-Host ""

# Test 2: Membership Packages Endpoint
Write-Host "2️⃣  Testing Membership Packages Endpoint..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:4000/api/membership_packages" -Method GET -ErrorAction Stop
    $data = $response.Content | ConvertFrom-Json
    
    if ($data.success) {
        Write-Host "✅ Endpoint Working" -ForegroundColor Green
        Write-Host "   Found $($data.data.Count) packages:" -ForegroundColor Green
        foreach ($pkg in $data.data) {
            Write-Host "   - $($pkg.name): $($pkg.price) VNĐ" -ForegroundColor Cyan
        }
    } else {
        Write-Host "⚠️  Endpoint returned success=false" -ForegroundColor Yellow
        Write-Host "   Message: $($data.message)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Cannot reach /api/membership_packages" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Test 3: User Registration
Write-Host "3️⃣  Testing User Registration..." -ForegroundColor Yellow
$testEmail = "test_$(Get-Date -Format 'yyyyMMdd_HHmmss')@example.com"
$regPayload = @{
    name = "Test User"
    email = $testEmail
    password = "Test@123"
    phone = "0123456789"
} | ConvertTo-Json

try {
    $response = Invoke-WebRequest -Uri "http://localhost:4000/api/auth/register" `
        -Method POST `
        -Headers @{"Content-Type" = "application/json"} `
        -Body $regPayload `
        -ErrorAction Stop
    
    $data = $response.Content | ConvertFrom-Json
    if ($data.success) {
        Write-Host "✅ Registration Working" -ForegroundColor Green
        Write-Host "   User: $($data.user.name)" -ForegroundColor Green
        Write-Host "   Email: $($data.user.email)" -ForegroundColor Green
        Write-Host "   Token: $($data.token.Substring(0, 20))..." -ForegroundColor Cyan
    } else {
        Write-Host "⚠️  Registration failed" -ForegroundColor Yellow
        Write-Host "   Message: $($data.message)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Registration endpoint error" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Test 4: Admin Login
Write-Host "4️⃣  Testing Admin Login..." -ForegroundColor Yellow
$adminPayload = @{
    email = "admin"
    password = "admin123"
} | ConvertTo-Json

try {
    $response = Invoke-WebRequest -Uri "http://localhost:4000/api/auth/login" `
        -Method POST `
        -Headers @{"Content-Type" = "application/json"} `
        -Body $adminPayload `
        -ErrorAction Stop
    
    $data = $response.Content | ConvertFrom-Json
    if ($data.success) {
        Write-Host "✅ Admin Login Working" -ForegroundColor Green
        Write-Host "   User: $($data.user.name) (Role: $($data.user.role))" -ForegroundColor Green
        Write-Host "   Token: $($data.token.Substring(0, 20))..." -ForegroundColor Cyan
        $script:adminToken = $data.token
    } else {
        Write-Host "❌ Admin login failed" -ForegroundColor Red
        Write-Host "   Message: $($data.message)" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Admin login endpoint error" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Test 5: Get Users (Admin Protected)
Write-Host "5️⃣  Testing GET /api/users (Admin Protected)..." -ForegroundColor Yellow
if ($script:adminToken) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:4000/api/users" `
            -Method GET `
            -Headers @{"Authorization" = "Bearer $($script:adminToken)"} `
            -ErrorAction Stop
        
        $data = $response.Content | ConvertFrom-Json
        if ($data.success) {
            Write-Host "✅ Admin Users Endpoint Working" -ForegroundColor Green
            Write-Host "   Found $($data.data.Count) users:" -ForegroundColor Green
            $data.data | Select-Object -First 3 | ForEach-Object {
                Write-Host "   - $($_.name) ($($_.email)) [Role: $($_.role)]" -ForegroundColor Cyan
            }
            if ($data.data.Count -gt 3) {
                Write-Host "   ... and $($data.data.Count - 3) more" -ForegroundColor Cyan
            }
        } else {
            Write-Host "⚠️  Endpoint returned success=false" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "❌ Cannot access /api/users" -ForegroundColor Red
        Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host "   💡 Check if JWT token is valid" -ForegroundColor Yellow
    }
} else {
    Write-Host "⏭️  Skipped (No admin token from previous test)" -ForegroundColor Gray
}

Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "✅ Test Complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Summary:" -ForegroundColor Cyan
Write-Host "   - Backend should respond at http://localhost:4000/" -ForegroundColor Cyan
Write-Host "   - Membership packages should load from DB" -ForegroundColor Cyan
Write-Host "   - Admin login should return JWT token" -ForegroundColor Cyan
Write-Host "   - Users list should be accessible with admin token" -ForegroundColor Cyan
Write-Host ""
Write-Host "💡 Troubleshooting:" -ForegroundColor Yellow
Write-Host "   If tests fail, check:" -ForegroundColor Yellow
Write-Host "   1. MySQL is running and contains 'rental_app' database" -ForegroundColor Yellow
Write-Host "   2. Backend env vars (.env) are correct" -ForegroundColor Yellow
Write-Host "   3. Backend console for connection errors" -ForegroundColor Yellow
Write-Host "   4. Network tab in DevTools for response shapes" -ForegroundColor Yellow
