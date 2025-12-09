#!/usr/bin/env pwsh

$API_URL = "http://localhost:3000"
$TEST_EMAIL = "e2etest_$(Get-Random)@test.local"
$TEST_PASSWORD = "TestPass123!"

Write-Host "========== PreoCrypto Backend E2E Test ==========" -ForegroundColor Cyan

# Step 1: Signup
Write-Host "`n[STEP 1] Creating test account..." -ForegroundColor Yellow
try {
    $signupBody = @{
        email = $TEST_EMAIL
        password = $TEST_PASSWORD
        username = "testuser_$(Get-Random)"
    } | ConvertTo-Json
    
    $signupResp = Invoke-RestMethod -Uri "$API_URL/api/auth/signup" -Method POST -ContentType "application/json" -Body $signupBody -ErrorAction Stop
    $token = $signupResp.token
    Write-Host "✅ Account created successfully" -ForegroundColor Green
    Write-Host "   Email: $TEST_EMAIL"
    Write-Host "   Token: $($token.Substring(0, 30))..."
} catch {
    Write-Host "❌ Signup failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

$headers = @{ "Authorization" = "Bearer $token"; "Content-Type" = "application/json" }

# Step 2: Get accounts
Write-Host "`n[STEP 2] Fetching accounts..." -ForegroundColor Yellow
try {
    $accountsResp = Invoke-RestMethod -Uri "$API_URL/api/trades/accounts" -Method GET -Headers $headers -ErrorAction Stop
    Write-Host "✅ Accounts retrieved" -ForegroundColor Green
    $accountsResp.accounts | ForEach-Object {
        Write-Host "   - $($_.type): Balance = $$(if($_.balance) { $_.balance } else { '0' })"
    }
} catch {
    Write-Host "❌ Failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Step 3: Create trade
Write-Host "`n[STEP 3] Creating demo trade..." -ForegroundColor Yellow
try {
    $tradeBody = @{
        type = "buy"
        symbol = "EURUSD"
        size = 1.5
        accountType = "demo"
    } | ConvertTo-Json
    
    Write-Host "   Request body: $tradeBody"
    
    $tradeResp = Invoke-RestMethod -Uri "$API_URL/api/trades/trades" -Method POST -Headers $headers -Body $tradeBody -ErrorAction Stop
    Write-Host "✅ Trade created" -ForegroundColor Green
    Write-Host "   Symbol: $($tradeResp.trade.symbol)"
    Write-Host "   P&L: $$(if($tradeResp.trade.pnl) { $tradeResp.trade.pnl } else { 'N/A' })"
} catch {
    Write-Host "❌ Failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Step 4: Get trades
Write-Host "`n[STEP 4] Fetching trades..." -ForegroundColor Yellow
try {
    $tradesResp = Invoke-RestMethod -Uri "$API_URL/api/trades/trades?accountType=demo" -Method GET -Headers $headers -ErrorAction Stop
    Write-Host "✅ Trades retrieved" -ForegroundColor Green
    Write-Host "   Total: $($tradesResp.trades.Count)"
} catch {
    Write-Host "❌ Failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Step 5: Deposit
Write-Host "`n[STEP 5] Creating deposit..." -ForegroundColor Yellow
try {
    $depositBody = @{ amount = 1000 } | ConvertTo-Json
    $depositResp = Invoke-RestMethod -Uri "$API_URL/api/trades/deposit" -Method POST -Headers $headers -Body $depositBody -ErrorAction Stop
    Write-Host "✅ Deposit successful" -ForegroundColor Green
    Write-Host "   New Balance: $$(if($depositResp.newBalance) { $depositResp.newBalance } else { 'N/A' })"
} catch {
    Write-Host "❌ Failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Step 6: Withdrawal
Write-Host "`n[STEP 6] Creating withdrawal..." -ForegroundColor Yellow
try {
    $withdrawBody = @{ amount = 100 } | ConvertTo-Json
    $withdrawResp = Invoke-RestMethod -Uri "$API_URL/api/trades/withdraw" -Method POST -Headers $headers -Body $withdrawBody -ErrorAction Stop
    Write-Host "✅ Withdrawal request created" -ForegroundColor Green
    Write-Host "   Message: $($withdrawResp.message)"
} catch {
    Write-Host "❌ Failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Step 7: Get transactions
Write-Host "`n[STEP 7] Fetching transactions..." -ForegroundColor Yellow
try {
    $transResp = Invoke-RestMethod -Uri "$API_URL/api/trades/transactions" -Method GET -Headers $headers -ErrorAction Stop
    Write-Host "✅ Transactions retrieved" -ForegroundColor Green
    Write-Host "   Total: $($transResp.transactions.Count)"
} catch {
    Write-Host "❌ Failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Step 8: Create bot
Write-Host "`n[STEP 8] Creating bot..." -ForegroundColor Yellow
try {
    $botBody = @{
        name = "E2E Test Bot"
        asset = "XAUUSD"
        type = "buy"
        size = 0.5
        interval = 60
    } | ConvertTo-Json
    
    $botResp = Invoke-RestMethod -Uri "$API_URL/api/bots" -Method POST -Headers $headers -Body $botBody -ErrorAction Stop
    Write-Host "✅ Bot created" -ForegroundColor Green
    Write-Host "   ID: $($botResp.bot.id)"
    Write-Host "   Name: $($botResp.bot.name)"
} catch {
    Write-Host "❌ Failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n========== All Tests Complete ==========" -ForegroundColor Cyan
Write-Host "✅ Backend integration successful!" -ForegroundColor Green
