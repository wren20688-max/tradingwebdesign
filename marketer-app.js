// ============================================================================
// Marketer Dashboard Application
// Handles marketer-specific trading, withdrawals, and account management
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
  initializeMarketerDashboard();
});

function initializeMarketerDashboard() {
  let marketerUser = storage.getUser();
  if (!marketerUser) {
    window.location.href = 'index.html';
    return;
  }

  // Check if user is a marketer
  const marketers = JSON.parse(localStorage.getItem('marketers') || '[]');
  const marketer = marketers.find(m => m.email === marketerUser.email);

  if (!marketer || !marketer.isMarketer) {
    // Redirect non-marketers to regular dashboard
    window.location.href = 'dashboard.html';
    return;
  }

  document.getElementById('username').textContent = marketerUser.username;

  // Load marketer data and refresh display
  loadMarketerData();
  calculateMarketerStats();
  renderRecentTrades();
  renderTransactionHistory();

  // Setup form handlers
  setupFormHandlers();

  // Refresh every 2 seconds
  setInterval(() => {
    loadMarketerData();
    calculateMarketerStats();
    renderRecentTrades();
  }, 2000);
}

function loadMarketerData() {
  let marketerUser = storage.getUser();
  const marketers = JSON.parse(localStorage.getItem('marketers') || '[]');
  const marketer = marketers.find(m => m.email === marketerUser.email);

  if (!marketer) return;

  // Update balance display
  const balanceEl = document.getElementById('marketerBalance');
  if (balanceEl) {
    balanceEl.textContent = '$' + (marketer.balance || 0).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }
}

function calculateMarketerStats() {
  let marketerUser = storage.getUser();
  const trades = storage.getTrades() || [];
  const marketerTrades = trades.filter(t => t.account === 'real' && t.status === 'closed');

  if (marketerTrades.length === 0) {
    document.getElementById('totalTrades').textContent = '0';
    document.getElementById('winRate').textContent = '0%';
    document.getElementById('totalPnL').textContent = '+$0.00';
    document.getElementById('winningTrades').textContent = '0';
    document.getElementById('losingTrades').textContent = '0';
    document.getElementById('avgWin').textContent = '$0.00';
    document.getElementById('avgLoss').textContent = '$0.00';
    document.getElementById('profitFactor').textContent = '1.00';
    document.getElementById('riskReward').textContent = '1:1';
    return;
  }

  // Calculate statistics
  const winningTrades = marketerTrades.filter(t => t.isWinning).length;
  const losingTrades = marketerTrades.filter(t => !t.isWinning).length;
  const totalTrades = marketerTrades.length;
  const winRate = ((winningTrades / totalTrades) * 100).toFixed(2);

  const totalPnL = marketerTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
  const totalWins = marketerTrades
    .filter(t => t.isWinning)
    .reduce((sum, t) => sum + (t.pnl || 0), 0);
  const totalLosses = Math.abs(marketerTrades
    .filter(t => !t.isWinning)
    .reduce((sum, t) => sum + (t.pnl || 0), 0));

  const avgWin = winningTrades > 0 ? totalWins / winningTrades : 0;
  const avgLoss = losingTrades > 0 ? totalLosses / losingTrades : 0;
  const profitFactor = avgLoss > 0 ? (avgWin / avgLoss).toFixed(2) : 1;

  // Update UI
  document.getElementById('totalTrades').textContent = totalTrades;
  document.getElementById('winRate').textContent = winRate + '%';
  document.getElementById('winningTrades').textContent = winningTrades;
  document.getElementById('losingTrades').textContent = losingTrades;
  document.getElementById('avgWin').textContent = '$' + avgWin.toFixed(2);
  document.getElementById('avgLoss').textContent = '$' + avgLoss.toFixed(2);
  document.getElementById('profitFactor').textContent = profitFactor;

  const totalPnLEl = document.getElementById('totalPnL');
  totalPnLEl.textContent = (totalPnL >= 0 ? '+' : '') + '$' + totalPnL.toFixed(2);
  totalPnLEl.style.color = totalPnL >= 0 ? 'var(--success)' : 'var(--danger)';

  // Risk-Reward ratio
  if (avgWin > 0 && avgLoss > 0) {
    const riskRewardRatio = (avgWin / avgLoss).toFixed(2);
    document.getElementById('riskReward').textContent = `1:${riskRewardRatio}`;
  }
}

function renderRecentTrades() {
  const trades = storage.getTrades() || [];
  const marketerTrades = trades
    .filter(t => t.account === 'real' && t.status === 'closed')
    .sort((a, b) => b.closedTime - a.closedTime)
    .slice(0, 10);

  const container = document.getElementById('recentTradesMarketer');

  if (marketerTrades.length === 0) {
    container.innerHTML = '<div style="text-align: center; color: var(--text-tertiary); padding: var(--spacing-lg);">No trades yet</div>';
    return;
  }

  container.innerHTML = '';
  marketerTrades.forEach(trade => {
    const div = document.createElement('div');
    div.style.padding = 'var(--spacing-md)';
    div.style.borderBottom = '1px solid var(--border-color)';
    div.style.display = 'flex';
    div.style.justifyContent = 'space-between';
    div.style.alignItems = 'center';

    const pnlColor = trade.pnl >= 0 ? 'var(--success)' : 'var(--danger)';
    const timeString = new Date(trade.closedTime).toLocaleString();

    div.innerHTML = `
      <div>
        <strong>${trade.type} ${trade.volume} ${trade.pair}</strong>
        <div style="font-size: 12px; color: var(--text-tertiary);">
          ${timeString} • Entry: ${trade.entryPrice.toFixed(4)}
        </div>
      </div>
      <div style="text-align: right;">
        <div style="color: ${pnlColor}; font-weight: 600;">
          ${trade.pnl >= 0 ? '+' : ''}$${trade.pnl.toFixed(2)}
        </div>
        <div style="font-size: 12px; color: ${trade.isWinning ? 'var(--success)' : 'var(--danger)'};">
          ${trade.isWinning ? '✓ Win' : '✗ Loss'}
        </div>
      </div>
    `;

    container.appendChild(div);
  });
}

function renderTransactionHistory() {
  const transactions = storage.getTransactions() || [];
  const container = document.getElementById('transactionHistoryMarketer');

  if (transactions.length === 0) {
    container.innerHTML = '<div style="text-align: center; color: var(--text-tertiary); padding: var(--spacing-lg);">No transactions yet</div>';
    return;
  }

  container.innerHTML = '';
  transactions.slice(0, 15).forEach(tx => {
    const div = document.createElement('div');
    div.style.padding = 'var(--spacing-md)';
    div.style.borderBottom = '1px solid var(--border-color)';
    div.style.display = 'flex';
    div.style.justifyContent = 'space-between';
    div.style.alignItems = 'center';

    const amountColor = tx.direction === 'credit' ? 'var(--success)' : 'var(--danger)';
    const typeIcon = tx.type === 'trade_win' ? '✓' : tx.type === 'trade_loss' ? '✗' : '💳';

    div.innerHTML = `
      <div>
        <strong>${typeIcon} ${tx.method || tx.type}</strong>
        <div style="font-size: 12px; color: var(--text-tertiary);">
          ${tx.date} • ${tx.pair || ''}
        </div>
      </div>
      <div style="text-align: right;">
        <div style="color: ${amountColor}; font-weight: 600;">
          ${tx.direction === 'credit' ? '+' : '-'}$${tx.amount.toFixed(2)}
        </div>
        <div style="font-size: 12px; color: var(--text-secondary);">
          ${tx.status}
        </div>
      </div>
    `;

    container.appendChild(div);
  });
}

function setupFormHandlers() {
  // Withdrawal form
  document.getElementById('withdrawalForm')?.addEventListener('submit', (e) => {
    e.preventDefault();

    const amount = parseFloat(document.getElementById('withdrawAmount').value);
    const method = document.getElementById('withdrawMethod').value;

    if (!amount || amount <= 0) {
      showNotification('❌ Please enter a valid amount', 'danger');
      return;
    }

    if (!method) {
      showNotification('❌ Please select a payment method', 'danger');
      return;
    }

    let marketerUser = storage.getUser();
    const marketers = JSON.parse(localStorage.getItem('marketers') || '[]');
    const marketer = marketers.find(m => m.email === marketerUser.email);

    if (!marketer) {
      showNotification('❌ Marketer account not found', 'danger');
      return;
    }

    if (marketer.balance < amount) {
      showNotification('❌ Insufficient balance for withdrawal', 'danger');
      return;
    }

    // Process withdrawal
    marketer.balance -= amount;
    localStorage.setItem('marketers', JSON.stringify(marketers));

    // Also update account data
    const accountData = {
      balance: marketer.balance,
      equity: marketer.balance,
      pnl: 0,
      positions: 0
    };
    localStorage.setItem('accountData_real', JSON.stringify(accountData));

    // Record transaction with 'completed' status
    const transaction = {
      type: 'withdrawal',
      date: new Date().toISOString().split('T')[0],
      amount: amount,
      direction: 'debit',
      method: method,
      timestamp: Date.now(),
      status: 'completed'
    };
    storage.addTransaction(transaction);

    // Clear form
    document.getElementById('withdrawalForm').reset();

    showNotification(`✅ Withdrawal of $${amount.toFixed(2)} completed!`, 'success');
    loadMarketerData();
    renderTransactionHistory();
  });

  // Menu toggle
  document.getElementById('menuToggle')?.addEventListener('click', () => {
    document.getElementById('sideMenu').classList.add('active');
  });

  document.querySelector('.menu-close')?.addEventListener('click', () => {
    document.getElementById('sideMenu').classList.remove('active');
  });

  // Logout
  document.getElementById('logoutBtn')?.addEventListener('click', (e) => {
    e.preventDefault();
    storage.removeUser();
    localStorage.removeItem('preo_user');
    localStorage.removeItem('preo_saved_email');
    localStorage.removeItem('preo_saved_password');
    localStorage.removeItem('preo_last_login');
    localStorage.removeItem('currentAccount');
    setTimeout(() => {
      window.location.href = 'index.html';
    }, 100);
  });

  // Dark mode toggle
  document.getElementById('toggleMode')?.addEventListener('click', () => {
    document.body.classList.toggle('light-mode');
    localStorage.setItem('theme', document.body.classList.contains('light-mode') ? 'light' : 'dark');
  });

  // Restore theme preference
  if (localStorage.getItem('theme') === 'light') {
    document.body.classList.add('light-mode');
  }
}

function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    bottom: var(--spacing-lg);
    right: var(--spacing-lg);
    background: ${type === 'success' ? 'var(--success)' : type === 'danger' ? 'var(--danger)' : 'var(--primary)'};
    color: white;
    padding: var(--spacing-md) var(--spacing-lg);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-lg);
    z-index: 1000;
    animation: slideInRight 0.3s ease;
  `;
  notification.textContent = message;
  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.animation = 'slideInLeft 0.3s ease reverse';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}
