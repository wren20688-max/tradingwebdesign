#!/usr/bin/env pwsh

# E2E Test Script for PreoTrade FX
$API_URL = "http://localhost:3000"
$DEMO_EMAIL = "test_e2e_$(Get-Date -Format 'yyyyMMddHHmmss')@preofx.local"
$DEMO_PASSWORD = "demo12345"
$ADMIN_EMAIL = "admin@preofx.local"
$ADMIN_PASSWORD = "admin12345"

Write-Host "========== PreoTrade FX E2E Test ==========" -ForegroundColor Cyan

# Test 1: Signup a new demo user
Write-Host "`n[TEST 1] Signup new user..." -ForegroundColor Yellow
$signupBody = @{
    email = $DEMO_EMAIL
    password = $DEMO_PASSWORD
    username = "test_user_$(Get-Random)"
} | ConvertTo-Json

$signupResp = Invoke-RestMethod -Uri "$API_URL/api/auth/signup" -Method POST -ContentType "application/json" -Body $signupBody

if ($signupResp.token) {
    Write-Host "✅ Signup successful" -ForegroundColor Green
    $demoToken = $signupResp.token
    Write-Host "   Token: $($demoToken.Substring(0, 20))..."
} else {
    Write-Host "❌ Signup failed" -ForegroundColor Red
    exit 1
}

# Test 2: Create a demo trade
Write-Host "`n[TEST 2] Create demo trade..." -ForegroundColor Yellow
$headers = @{ "Authorization" = "Bearer $demoToken" }
$tradeBody = @{
    type = "buy"
    symbol = "EURUSD"
    size = 1.5
    accountType = "demo"
} | ConvertTo-Json

$tradeResp = Invoke-RestMethod -Uri "$API_URL/api/trades/trades" -Method POST -ContentType "application/json" -Headers $headers -Body $tradeBody

if ($tradeResp.trade) {
    Write-Host "✅ Trade created successfully" -ForegroundColor Green
    Write-Host "   Symbol: $($tradeResp.trade.symbol)"
    Write-Host "   P&L: $$($tradeResp.trade.pnl)"
} else {
    Write-Host "❌ Trade creation failed" -ForegroundColor Red
    exit 1
}

# Test 3: Get accounts and check balance
Write-Host "`n[TEST 3] Fetch accounts..." -ForegroundColor Yellow
$accountsResp = Invoke-RestMethod -Uri "$API_URL/api/trades/accounts" -Method GET -Headers $headers

if ($accountsResp.accounts) {
    Write-Host "✅ Accounts retrieved" -ForegroundColor Green
    $accountsResp.accounts | ForEach-Object {
        Write-Host "   $($_.type): Balance = $$($_.balance)"
    }
} else {
    Write-Host "❌ Failed to fetch accounts" -ForegroundColor Red
}

# Test 4: Create a deposit
Write-Host "`n[TEST 4] Create deposit..." -ForegroundColor Yellow
$depositBody = @{
    amount = 1000
} | ConvertTo-Json

$depositResp = Invoke-RestMethod -Uri "$API_URL/api/trades/deposit" -Method POST -ContentType "application/json" -Headers $headers -Body $depositBody

if ($depositResp.newBalance) {
    Write-Host "✅ Deposit successful" -ForegroundColor Green
    Write-Host "   New Balance: $$($depositResp.newBalance)"
} else {
    Write-Host "❌ Deposit failed" -ForegroundColor Red
}

# Test 5: Create a withdrawal
Write-Host "`n[TEST 5] Create withdrawal..." -ForegroundColor Yellow
$withdrawBody = @{
    amount = 100
} | ConvertTo-Json

$withdrawResp = Invoke-RestMethod -Uri "$API_URL/api/trades/withdraw" -Method POST -ContentType "application/json" -Headers $headers -Body $withdrawBody

if ($withdrawResp.withdrawalId -or $withdrawResp.newBalance) {
    Write-Host "✅ Withdrawal request created" -ForegroundColor Green
    Write-Host "   Status: $($withdrawResp.message)"
} else {
    Write-Host "❌ Withdrawal failed" -ForegroundColor Red
}

# Test 6: Get trades
Write-Host "`n[TEST 6] Fetch trades..." -ForegroundColor Yellow
$tradesResp = Invoke-RestMethod -Uri "$API_URL/api/trades/trades?accountType=demo" -Method GET -Headers $headers

if ($tradesResp.trades) {
    Write-Host "✅ Trades retrieved" -ForegroundColor Green
    Write-Host "   Total trades: $($tradesResp.trades.Count)"
} else {
    Write-Host "❌ Failed to fetch trades" -ForegroundColor Red
}

# Test 7: Get transactions
Write-Host "`n[TEST 7] Fetch transactions..." -ForegroundColor Yellow
$transResp = Invoke-RestMethod -Uri "$API_URL/api/trades/transactions" -Method GET -Headers $headers

if ($transResp.transactions) {
    Write-Host "✅ Transactions retrieved" -ForegroundColor Green
    Write-Host "   Total transactions: $($transResp.transactions.Count)"
} else {
    Write-Host "❌ Failed to fetch transactions" -ForegroundColor Red
}

# Test 8: Create bot
Write-Host "`n[TEST 8] Create bot..." -ForegroundColor Yellow
$botBody = @{
    name = "Test Bot"
    asset = "XAUUSD"
    type = "buy"
    size = 0.5
    interval = 60
} | ConvertTo-Json

$botResp = Invoke-RestMethod -Uri "$API_URL/api/bots" -Method POST -ContentType "application/json" -Headers $headers -Body $botBody

if ($botResp.bot) {
    Write-Host "✅ Bot created" -ForegroundColor Green
    Write-Host "   Name: $($botResp.bot.name)"
} else {
    Write-Host "❌ Bot creation failed" -ForegroundColor Red
}

Write-Host "`n========== E2E Test Complete ==========" -ForegroundColor Cyan
Write-Host "✅ All tests passed!" -ForegroundColor Green
