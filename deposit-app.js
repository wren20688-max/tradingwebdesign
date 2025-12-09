// ============================================================================
// Deposit Application
// Handles deposit processing, payment methods, and transaction recording
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
  initializeDeposit();
});

function initializeDeposit() {
  let depositUser = storage.getUser();
  if (!depositUser) {
    window.location.href = 'index.html';
    return;
  }

  document.getElementById('username').textContent = depositUser.username;

  // Load balance and recent deposits
  loadBalanceInfo();
  renderRecentDeposits();

  // Setup payment method selection
  setupPaymentMethods();

  // Setup form submission
  document.getElementById('depositForm').addEventListener('submit', handleDeposit);

  // Setup menu and theme
  setupMenuAndTheme();

  // Refresh data every 2 seconds
  setInterval(() => {
    loadBalanceInfo();
    renderRecentDeposits();
  }, 2000);
}

function loadBalanceInfo() {
  let user = storage.getUser();
  const accountData = JSON.parse(localStorage.getItem('accountData_real') || '{"balance":0}');
  
  const pendingTransactions = (storage.getTransactions() || []).filter(t => 
    t.type === 'deposit' && t.status === 'pending'
  );
  
  const pendingAmount = pendingTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);

  document.getElementById('currentBalance').textContent = '$' + accountData.balance.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  document.getElementById('pendingDeposits').textContent = '$' + pendingAmount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  document.getElementById('pendingCount').textContent = pendingTransactions.length + (pendingTransactions.length === 1 ? ' transaction' : ' transactions');
}

function setupPaymentMethods() {
  const methodBtns = document.querySelectorAll('.payment-method-btn');
  
  methodBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      
      // Remove active from all
      methodBtns.forEach(b => b.classList.remove('active'));
      
      // Add active to clicked
      btn.classList.add('active');
      
      const method = btn.dataset.method;
      updateMethodDisplay(method);
      showMethodFields(method);
    });
  });
}

function updateMethodDisplay(method) {
  const icons = {
    bank_transfer: '🏦 Bank Transfer',
    credit_card: '💳 Credit Card',
    crypto: '₿ Cryptocurrency',
    paypal: '📱 PayPal'
  };

  document.getElementById('selectedMethod').textContent = icons[method] || method;
}

function showMethodFields(method) {
  // Hide all fields
  document.querySelectorAll('.method-fields').forEach(el => {
    el.style.display = 'none';
  });

  // Show relevant fields
  switch(method) {
    case 'bank_transfer':
      document.getElementById('bankFields').style.display = 'block';
      break;
    case 'credit_card':
      document.getElementById('creditCardFields').style.display = 'block';
      break;
    case 'crypto':
      document.getElementById('cryptoFields').style.display = 'block';
      break;
    case 'paypal':
      document.getElementById('paypalFields').style.display = 'block';
      break;
  }
}

async function handleDeposit(e) {
  e.preventDefault();

  const amount = parseFloat(document.getElementById('depositAmount').value);
  const activeMethod = document.querySelector('.payment-method-btn.active');
  const method = activeMethod ? activeMethod.dataset.method : 'bank_transfer';
  const depositUser = storage.getUser();

  // Validation
  if (!amount || amount < 10) {
    showNotification('❌ Minimum deposit is $10', 'danger');
    return;
  }

  if (amount > 100000) {
    showNotification('❌ Maximum deposit is $100,000', 'danger');
    return;
  }

  // Show processing indicator
  showNotification('⏳ Processing payment...', 'info');

  // Disable form during processing
  document.getElementById('depositForm').style.opacity = '0.6';
  document.getElementById('depositForm').style.pointerEvents = 'none';

  // Create payment intent with PayHero
  const paymentData = {
    amount: amount,
    method: method,
    currency: 'USD',
    userId: depositUser.id || depositUser.email,
    userEmail: depositUser.email,
    userName: depositUser.username
  };

  try {
    const paymentResult = await PayHeroIntegration.createPaymentIntent(paymentData);

    if (paymentResult.success) {
      // Show payment URL or redirect to payment processor
      showNotification(`✅ Payment intent created! Redirecting to ${method}...`, 'success');

      // If there's a payment URL (redirect to PayHero or payment processor)
      if (paymentResult.paymentUrl) {
        setTimeout(() => {
          window.location.href = paymentResult.paymentUrl;
        }, 1500);
      } else {
        // For demo, just process the deposit immediately
        processDepositSuccess(amount, method, depositUser);
      }
    } else {
      showNotification(`❌ ${paymentResult.error}`, 'danger');
      // Re-enable form
      document.getElementById('depositForm').style.opacity = '1';
      document.getElementById('depositForm').style.pointerEvents = 'auto';
    }
  } catch (error) {
    console.error('Payment error:', error);
    showNotification('❌ Payment processing failed: ' + error.message, 'danger');
    // Re-enable form
    document.getElementById('depositForm').style.opacity = '1';
    document.getElementById('depositForm').style.pointerEvents = 'auto';
  }
}

function processDepositSuccess(amount, method, depositUser) {

  // Get additional details based on method
  let methodDetails = method;
  if (method === 'bank_transfer') {
    methodDetails = `Bank Transfer (${document.getElementById('bankType').value})`;
  } else if (method === 'credit_card') {
    methodDetails = `${document.getElementById('cardType').value.toUpperCase()}`;
  } else if (method === 'crypto') {
    methodDetails = `${document.getElementById('cryptoType').value.toUpperCase()}`;
  } else if (method === 'paypal') {
    methodDetails = 'PayPal';
  }

  // Create transaction record
  const transaction = {
    type: 'deposit',
    date: new Date().toISOString().split('T')[0],
    amount: amount,
    direction: 'credit',
    method: methodDetails,
    timestamp: Date.now(),
    status: 'completed'
  };

  // Add transaction to storage
  storage.addTransaction(transaction);

  // Update user balance
  let user = storage.getUser();
  const accountData = JSON.parse(localStorage.getItem('accountData_real') || '{"balance":0,"equity":0,"pnl":0,"positions":0}');
  accountData.balance += amount;
  accountData.equity += amount;

  localStorage.setItem('accountData_real', JSON.stringify(accountData));
  storage.setBalance(accountData.balance, 'real');

  // Update marketer balance if applicable
  const marketers = JSON.parse(localStorage.getItem('marketers') || '[]');
  const marketer = marketers.find(m => m.email === user.email);
  if (marketer && marketer.isMarketer) {
    marketer.balance = accountData.balance;
    localStorage.setItem('marketers', JSON.stringify(marketers));
  }

  // Show success message
  showNotification(`✅ Deposit of $${amount.toFixed(2)} completed! Funds are now available.`, 'success');

  // Reset form
  document.getElementById('depositForm').reset();
  document.getElementById('depositAmount').value = '';

  // Refresh display
  loadBalanceInfo();
  renderRecentDeposits();

  // Optionally redirect after success
  setTimeout(() => {
    window.location.href = 'finances.html';
  }, 2000);
}

function renderRecentDeposits() {
  const transactions = (storage.getTransactions() || []).filter(t => t.type === 'deposit');
  const container = document.getElementById('recentDeposits');

  if (transactions.length === 0) {
    container.innerHTML = '<div style="text-align: center; color: var(--text-tertiary); padding: var(--spacing-lg);">No deposits yet</div>';
    return;
  }

  container.innerHTML = '';
  transactions.slice(0, 10).reverse().forEach(tx => {
    const div = document.createElement('div');
    div.style.padding = 'var(--spacing-md)';
    div.style.borderBottom = '1px solid var(--border-color)';
    div.style.display = 'flex';
    div.style.justifyContent = 'space-between';
    div.style.alignItems = 'center';

    const statusColor = tx.status === 'completed' ? 'var(--success)' : 'var(--warning)';
    const statusIcon = tx.status === 'completed' ? '✓' : '⏱';

    div.innerHTML = `
      <div>
        <strong>💰 ${tx.method}</strong>
        <div style="font-size: 12px; color: var(--text-tertiary);">
          ${tx.date}
        </div>
      </div>
      <div style="text-align: right;">
        <div style="color: var(--success); font-weight: 600;">
          +$${tx.amount.toFixed(2)}
        </div>
        <div style="font-size: 12px; color: ${statusColor};">
          ${statusIcon} ${tx.status}
        </div>
      </div>
    `;

    container.appendChild(div);
  });
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

function setupMenuAndTheme() {
  // Menu toggle
  document.getElementById('menuToggle')?.addEventListener('click', () => {
    document.getElementById('sideMenu').classList.add('active');
  });

  document.querySelector('.menu-close')?.addEventListener('click', () => {
    document.getElementById('sideMenu').classList.remove('active');
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

  // Logout
  document.getElementById('logoutBtn')?.addEventListener('click', (e) => {
    e.preventDefault();
    storage.removeUser();
    localStorage.removeItem('preo_user');
    localStorage.removeItem('preo_saved_email');
    localStorage.removeItem('preo_saved_password');
    localStorage.removeItem('preo_last_login');
    setTimeout(() => {
      window.location.href = 'index.html';
    }, 100);
  });
}
