# PreoCrypto Backend API Documentation

## 🚀 Quick Start

**API Server:** `http://localhost:3000`  
**Frontend:** `http://localhost:8000`

---

## 🔐 Authentication Endpoints

### 1. **Sign Up**
```http
POST /api/auth/signup
Content-Type: application/json

{
  "email": "trader@example.com",
  "password": "secure_password123",
  "username": "trader_name",
  "category": "retail"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User created successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "userId": "uuid",
    "email": "trader@example.com",
    "username": "trader_name"
  }
}
```

### 2. **Login**
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "trader@example.com",
  "password": "secure_password123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "userId": "uuid",
    "email": "trader@example.com",
    "username": "trader_name"
  }
}
```

---

## 💰 Trading Endpoints (Requires Token)

### Headers for all authenticated requests:
```http
Authorization: Bearer <token>
```

### 3. **Get Accounts**
```http
GET /api/trades/accounts
```

**Response:**
```json
{
  "success": true,
  "accounts": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "type": "demo",
      "balance": 10000,
      "equity": 10000
    },
    {
      "id": "uuid",
      "user_id": "uuid",
      "type": "real",
      "balance": 1000,
      "equity": 1000
    }
  ]
}
```

### 4. **Create Trade**
```http
POST /api/trades/trades
Content-Type: application/json
Authorization: Bearer <token>

{
  "symbol": "EURUSD",
  "type": "buy",
  "size": 0.5,
  "entryPrice": 1.0850,
  "accountType": "demo"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Trade created",
  "trade": {
    "id": "uuid",
    "symbol": "EURUSD",
    "type": "buy",
    "size": 0.5,
    "entryPrice": 1.0850,
    "currentPrice": 1.0862,
    "pnl": 12.50,
    "status": "open"
  }
}
```

### 5. **Get Trades**
```http
GET /api/trades/trades?accountType=demo
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "trades": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "account_type": "demo",
      "symbol": "EURUSD",
      "type": "buy",
      "size": 0.5,
      "entry_price": 1.0850,
      "current_price": 1.0862,
      "pnl": 12.50,
      "status": "open",
      "created_at": "2025-12-04T18:30:00Z"
    }
  ]
}
```

### 6. **Close Trade**
```http
PATCH /api/trades/trades/{tradeId}/close
Authorization: Bearer <token>
```

### 7. **Deposit**
```http
POST /api/trades/deposit
Content-Type: application/json
Authorization: Bearer <token>

{
  "amount": 1000,
  "accountType": "demo"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Deposited $1000.00",
  "newBalance": 11000
}
```

### 8. **Withdraw**
```http
POST /api/trades/withdraw
Content-Type: application/json
Authorization: Bearer <token>

{
  "amount": 500,
  "accountType": "demo"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Withdrawal pending approval: $500.00",
  "withdrawalId": "uuid"
}
```

---

## 🛠️ Admin Endpoints (Admin/Privileged Only)

### 9. **Get Privileged Users**
```http
GET /api/admin/privileged-users
Authorization: Bearer <admin_token>
```

**Response:**
```json
{
  "success": true,
  "users": [
    {
      "id": "uuid",
      "username": "privileged_user",
      "auto_credit": 1,
      "auto_complete_withdrawals": 1,
      "win_bias": 0.8,
      "created_at": "2025-12-04T18:00:00Z"
    }
  ]
}
```

### 10. **Add Privileged User**
```http
POST /api/admin/privileged-users
Content-Type: application/json
Authorization: Bearer <admin_token>

{
  "username": "trader_name",
  "autoCredit": true,
  "autoCompleteWithdrawals": true,
  "winBias": 0.8
}
```

### 11. **Remove Privileged User**
```http
DELETE /api/admin/privileged-users/{username}
Authorization: Bearer <admin_token>
```

### 12. **Credit User**
```http
POST /api/admin/credit-user/{username}
Content-Type: application/json
Authorization: Bearer <admin_token>

{
  "amount": 1000
}
```

**Response:**
```json
{
  "success": true,
  "message": "Credited $1000.00 to trader_name",
  "newBalance": 2000
}
```

### 13. **Get Pending Withdrawals**
```http
GET /api/admin/withdrawals/pending
Authorization: Bearer <admin_token>
```

**Response:**
```json
{
  "success": true,
  "withdrawals": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "username": "trader_name",
      "email": "trader@example.com",
      "amount": 500,
      "status": "pending",
      "created_at": "2025-12-04T18:45:00Z"
    }
  ]
}
```

### 14. **Approve Withdrawal**
```http
PATCH /api/admin/withdrawals/{withdrawalId}/approve
Authorization: Bearer <admin_token>
```

**Response:**
```json
{
  "success": true,
  "message": "Withdrawal of $500.00 approved"
}
```

### 15. **Reject Withdrawal**
```http
PATCH /api/admin/withdrawals/{withdrawalId}/reject
Authorization: Bearer <admin_token>
```

---

## 📊 Biased P&L System

The backend implements a sophisticated biased P&L calculation:

- **Demo Accounts:** Win 80% of trades with positive P&L
- **Real Accounts:** Lose 70% of trades with negative P&L
- **Privileged Users:** Custom `winBias` factor (default 0.8)
- **Auto Credit:** Privileged users can auto-credit their accounts
- **Auto Withdrawals:** Privileged users can auto-complete withdrawals

---

## 🔑 JWT Token Format

Tokens expire in 7 days and include:
```json
{
  "userId": "uuid",
  "email": "trader@example.com",
  "username": "trader_name",
  "iat": 1701715200,
  "exp": 1702320000
}
```

**How to use:**
```
Authorization: Bearer <your_jwt_token>
```

---

## 📂 Database Schema

### Users Table
- `id` (TEXT, PRIMARY KEY)
- `email` (TEXT, UNIQUE)
- `password` (TEXT, hashed with bcrypt)
- `username` (TEXT, UNIQUE)
- `is_admin` (BOOLEAN)
- `created_at`, `updated_at`

### Accounts Table
- `id` (TEXT, PRIMARY KEY)
- `user_id` (FOREIGN KEY → users)
- `type` (TEXT: "demo" or "real")
- `balance` (REAL)
- `equity` (REAL)

### Trades Table
- `id`, `user_id`, `account_type`, `symbol`, `type`, `size`
- `entry_price`, `current_price`, `pnl`, `status`
- `created_at`, `closed_at`

### Privileged Users Table
- `username` (UNIQUE)
- `auto_credit`, `auto_complete_withdrawals` (BOOLEAN)
- `win_bias` (REAL, 0-1)

---

## ✅ Health Check

```http
GET /api/health
```

**Response:**
```json
{
  "success": true,
  "message": "PreoCrypto Backend API is running",
  "version": "1.0.0",
  "uptime": 3600
}
```

---

## 🧪 Test with cURL

**Sign up:**
```bash
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "username": "testuser"
  }'
```

**Login:**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

**Get accounts (replace TOKEN with actual JWT):**
```bash
curl -X GET http://localhost:3000/api/trades/accounts \
  -H "Authorization: Bearer TOKEN"
```

---

## 🔒 Security Notes

1. Change `JWT_SECRET` in `.env` for production
2. All passwords are hashed with bcryptjs
3. Admin endpoints require authentication and admin/privileged status
4. Database is SQLite (use PostgreSQL for production)

---

## 📝 Environment Variables (.env)

```
NODE_ENV=development
PORT=3000
JWT_SECRET=preocrypto-secret-key-change-in-production-2024
DB_PATH=./data/preocrypto.db
```

---

**Backend Status:** ✅ Running on port 3000  
**Database Status:** ✅ Connected (SQLite)  
**Ready for frontend integration!**
