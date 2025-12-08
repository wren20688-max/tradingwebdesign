#!/usr/bin/env pwsh

$API_URL = "http://localhost:3000"
$TEST_EMAIL = "debug_$(Get-Random)@test.local"
$TEST_PASSWORD = "DebugPass123!"

function pretty($obj){ $obj | ConvertTo-Json -Depth 10 }

Write-Host "[DEBUG] Signup..."
$signup = Invoke-RestMethod -Uri "$API_URL/api/auth/signup" -Method POST -ContentType "application/json" -Body (@{ email=$TEST_EMAIL; password=$TEST_PASSWORD; username = "dbguser_$(Get-Random)" } | ConvertTo-Json)
Write-Host "Signup response:"; pretty $signup
$token = $signup.token
$headers = @{ Authorization = "Bearer $token"; "Content-Type" = "application/json" }

Write-Host "`n[DEBUG] Create trade (POST /api/trades/trades)..."
$tradeBody = @{ type='buy'; symbol='EURUSD'; size=1.5; accountType='demo' } | ConvertTo-Json
$tradeResp = Invoke-RestMethod -Uri "$API_URL/api/trades/trades" -Method POST -Headers $headers -Body $tradeBody -ContentType 'application/json'
Write-Host "Trade response:"; pretty $tradeResp

Write-Host "`n[DEBUG] Get trades (GET /api/trades/trades?... )"
$trades = Invoke-RestMethod -Uri "$API_URL/api/trades/trades?accountType=demo" -Method GET -Headers $headers
Write-Host "Trades response:"; pretty $trades

Write-Host "`n[DEBUG] Deposit (POST /api/trades/deposit)"
$deposit = Invoke-RestMethod -Uri "$API_URL/api/trades/deposit" -Method POST -Headers $headers -Body (@{ amount=500 } | ConvertTo-Json) -ContentType 'application/json'
Write-Host "Deposit response:"; pretty $deposit

Write-Host "`n[DEBUG] Withdraw (POST /api/trades/withdraw)"
$withdraw = Invoke-RestMethod -Uri "$API_URL/api/trades/withdraw" -Method POST -Headers $headers -Body (@{ amount=50 } | ConvertTo-Json) -ContentType 'application/json'
Write-Host "Withdraw response:"; pretty $withdraw

Write-Host "`n[DEBUG] Transactions (GET /api/trades/transactions)"
$trans = Invoke-RestMethod -Uri "$API_URL/api/trades/transactions" -Method GET -Headers $headers
Write-Host "Transactions response:"; pretty $trans

Write-Host "`n[DEBUG] Accounts (GET /api/trades/accounts)"
$acct = Invoke-RestMethod -Uri "$API_URL/api/trades/accounts" -Method GET -Headers $headers
Write-Host "Accounts response:"; pretty $acct

Write-Host "`n[DEBUG] Done"
