#!/usr/bin/env pwsh

# Resets the PreoCrypto SQLite database by dropping user-related tables
$DB_PATH = Join-Path $PSScriptRoot 'data' 'preocrypto.db'

Write-Host "Resetting database at: $DB_PATH" -ForegroundColor Yellow

if (-Not (Test-Path $DB_PATH)) {
  Write-Host "Database file not found, nothing to reset." -ForegroundColor Green
  exit 0
}

# Load System.Data.SQLite if available; else use sqlite3 CLI if present
function Invoke-SqliteQuery($dbPath, $sql) {
  $sqliteExe = Get-Command sqlite3 -ErrorAction SilentlyContinue
  if ($sqliteExe) {
    & $sqliteExe.Path $dbPath $sql | Out-Null
  } else {
    Write-Host "sqlite3 CLI not found. Delete the DB file instead." -ForegroundColor Yellow
    Remove-Item -Force $dbPath
  }
}

$queries = @(
  "DROP TABLE IF EXISTS withdrawals;",
  "DROP TABLE IF EXISTS trades;",
  "DROP TABLE IF EXISTS transactions;",
  "DROP TABLE IF EXISTS accounts;",
  "DROP TABLE IF EXISTS privileged_users;",
  "DROP TABLE IF EXISTS admin_actions;",
  "DROP TABLE IF EXISTS admin_settings;",
  "DELETE FROM users WHERE is_admin <> 1;"
)

foreach ($q in $queries) { Invoke-SqliteQuery $DB_PATH $q }

Write-Host "✅ Database reset complete." -ForegroundColor Green
