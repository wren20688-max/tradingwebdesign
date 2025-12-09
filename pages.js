// ==================== MULTI-PAGE NAVIGATION ====================
// Setup menu toggle and navigation across all pages

document.addEventListener('DOMContentLoaded', () => {
  // Menu toggle
  const menuToggle = document.getElementById('menuToggle');
  const sideMenu = document.getElementById('sideMenu');
  const menuClose = document.querySelector('.menu-close');

  if (menuToggle) {
    menuToggle.addEventListener('click', () => {
      if (sideMenu) {
        sideMenu.classList.add('open');
        // add overlay
        if (!document.querySelector('.overlay')) {
          const ov = document.createElement('div'); ov.className = 'overlay'; document.body.appendChild(ov);
          ov.addEventListener('click', ()=>{ if (sideMenu) sideMenu.classList.remove('open'); ov.remove(); });
        }
      }
    });
  }

  if (menuClose) {
    menuClose.addEventListener('click', () => {
      if (sideMenu) sideMenu.classList.remove('open');
      const ov = document.querySelector('.overlay'); if (ov) ov.remove();
    });
  }

  // Close menu on menu item click
  const menuItems = document.querySelectorAll('.menu-item');
  menuItems.forEach(item => {
    item.addEventListener('click', () => {
      if (sideMenu) sideMenu.classList.remove('open');
    });
  });

  // Add Admin link for privileged users (if not present)
  try {
    const me = storage.getUser()?.username;
    const entry = getPrivilegedEntry(me);
    if (entry || (storage.getUser() && storage.getUser().isAdmin)) {
      const menu = document.querySelector('.menu-items');
      if (menu && !menu.querySelector('a[href="admin.html"]')) {
        const el = document.createElement('a');
        el.href = 'admin.html';
        el.className = 'menu-item';
        el.innerHTML = '🛠️ Admin';
        menu.appendChild(el);
        el.addEventListener('click', ()=> { if (sideMenu) sideMenu.classList.remove('open'); });
      }
    }
  } catch(e) { /* ignore if storage not available */ }

  // Insert user header/avatar into menu (if side menu present)
  try {
    const menu = document.querySelector('.menu-items');
    const headerExists = document.querySelector('.side-menu .menu-header');
    if (menu && !headerExists) {
      const u = storage.getUser();
      const name = u?.username || (u?.email ? u.email.split('@')[0] : 'Guest');
      const initials = (name || 'G').replace(/[^A-Z0-9]/ig,'').slice(0,2).toUpperCase() || 'G';
      const header = document.createElement('div'); header.className = 'menu-header';
      header.innerHTML = `<div class=\"avatar\">${initials}</div><div class=\"user-info\"><div class=\"name\">${name}</div><div class=\"role\">${(u?.isAdmin||getPrivilegedEntry(u?.username))? 'Privileged' : 'Trader'}</div></div>`;
      // insert at top
      const sideMenuInner = document.querySelector('.side-menu');
      if (sideMenuInner) sideMenuInner.insertBefore(header, sideMenuInner.firstChild.nextSibling);
    }
  } catch(e) {}

  // Close menu when clicking outside
  document.addEventListener('click', (e) => {
    if (sideMenu && sideMenu.classList.contains('open')) {
      if (!sideMenu.contains(e.target) && !menuToggle?.contains(e.target)) {
        sideMenu.classList.remove('open');
      }
    }
  });

  // Update balance display and KPIs on page load
  updatePageBalance();
  populateDashboardHeader();
});

function updatePageBalance() {
  const user = storage.getUser();
  const currentAccount = localStorage.getItem('currentAccount') || 'demo';
  const balance = storage.getAccountBalance(currentAccount);
  
  const balanceEl = document.getElementById('balance');
  if (balanceEl) {
    balanceEl.textContent = '$' + balance.toLocaleString('en-US', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    });
  }

  // Update KPI cards if present (on manual trading page)
  const kpiBalance = document.getElementById('kpiBalance');
  const kpiEquity = document.getElementById('kpiEquity');
  if (kpiBalance) kpiBalance.textContent = '$' + balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (kpiEquity) kpiEquity.textContent = '$' + balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ==================== PAGE-SPECIFIC INITIALIZATION ====================

// Auto-trading page
if (window.location.pathname.includes('auto-trading')) {
  document.addEventListener('DOMContentLoaded', () => {
    initAutoTradingPage();
  });
}

function initAutoTradingPage() {
  const riskSlider = document.getElementById('riskLevel');
  const riskDisplay = document.getElementById('riskDisplay');
  
  if (riskSlider) {
    riskSlider.addEventListener('input', () => {
      if (riskDisplay) riskDisplay.textContent = riskSlider.value;
    });
  }

  renderActiveBots();
  
  const importBotBtn = document.querySelector('.import-section .action-btn');
  if (importBotBtn) {
    importBotBtn.addEventListener('click', () => importBot());
  }
}

function importBot() {
  const botInput = document.getElementById('botImport');
  if (!botInput || !botInput.value.trim()) {
    alert('Please enter bot code');
    return;
  }

  const currentAccount = localStorage.getItem('currentAccount') || 'demo';
  const bots = JSON.parse(localStorage.getItem(`importedBots_${currentAccount}`) || '[]');
  bots.push({
    name: `Bot ${Date.now()}`,
    code: botInput.value.trim(),
    created: new Date().toLocaleString()
  });
  localStorage.setItem(`importedBots_${currentAccount}`, JSON.stringify(bots));
  alert('Bot imported successfully!');
  botInput.value = '';
  renderActiveBots();
}

function renderActiveBots() {
  const container = document.getElementById('activeBots');
  if (!container) return;

  const currentAccount = localStorage.getItem('currentAccount') || 'demo';
  const bots = JSON.parse(localStorage.getItem(`importedBots_${currentAccount}`) || '[]');
  
  container.innerHTML = '';
  if (bots.length === 0) {
    container.innerHTML = '<div class="empty-state">No bots imported</div>';
    return;
  }

  bots.forEach(bot => {
    const div = document.createElement('div');
    div.style.cssText = 'padding:8px; background:rgba(46,204,113,0.1); border-radius:4px; margin:6px 0; font-size:12px;';
    div.innerHTML = `<strong>${bot.name}</strong><br/><small>${bot.created}</small>`;
    container.appendChild(div);
  });
}

// Finances page
if (window.location.pathname.includes('finances')) {
  document.addEventListener('DOMContentLoaded', () => {
    initFinancesPage();
  });
}

function initFinancesPage() {
  updateFinancesDetails();
  renderFinancesTransactions();

  const depositBtn = document.getElementById('depositBtn');
  const withdrawBtn = document.getElementById('withdrawBtn');

  if (depositBtn) {
    depositBtn.addEventListener('click', () => handleDeposit());
  }

  if (withdrawBtn) {
    withdrawBtn.addEventListener('click', () => handleWithdraw());
  }
}

function handleDeposit() {
  const amount = parseFloat(document.getElementById('depositAmount')?.value);
  if (!amount || amount <= 0) {
    alert('Please enter a valid amount');
    return;
  }

  const currentAccount = localStorage.getItem('currentAccount') || 'demo';
  const currentBalance = storage.getAccountBalance(currentAccount);
  const newBalance = currentBalance + amount;
  storage.setAccountBalance(currentAccount, newBalance);

  const transactions = JSON.parse(localStorage.getItem(`transactions_${currentAccount}`) || '[]');
  transactions.unshift({
    type: 'Deposit',
    amount: amount,
    date: new Date().toLocaleString(),
    status: 'completed'
  });
  localStorage.setItem(`transactions_${currentAccount}`, JSON.stringify(transactions));

  document.getElementById('depositAmount').value = '';
  alert(`✅ Deposit successful! $${amount.toFixed(2)} added.`);
  
  updatePageBalance();
  updateFinancesDetails();
  renderFinancesTransactions();
}

function handleWithdraw() {
  const amount = parseFloat(document.getElementById('withdrawAmount')?.value);
  const currentAccount = localStorage.getItem('currentAccount') || 'demo';
  const currentBalance = storage.getAccountBalance(currentAccount);

  if (!amount || amount <= 0) {
    alert('Please enter a valid amount');
    return;
  }

  if (amount > currentBalance) {
    alert('Insufficient balance');
    return;
  }

  const username = storage.getUser()?.username;
  const privEntry = getPrivilegedEntry(username);
  const isMarketersAdminUser = privEntry && privEntry.autoCompleteWithdrawals;

  const newBalance = currentBalance - amount;
  storage.setAccountBalance(currentAccount, newBalance);

  const transactions = JSON.parse(localStorage.getItem(`transactions_${currentAccount}`) || '[]');
  const status = isMarketersAdminUser ? 'completed' : 'pending';
  transactions.unshift({
    type: 'Withdrawal',
    amount: amount,
    date: new Date().toLocaleString(),
    status: status,
    username: username
  });
  localStorage.setItem(`transactions_${currentAccount}`, JSON.stringify(transactions));

  document.getElementById('withdrawAmount').value = '';
  
  if (isMarketersAdminUser) {
    alert(`✅ Withdrawal completed! $${amount.toFixed(2)} processed.`);
  } else {
    alert(`⏳ Withdrawal pending! $${amount.toFixed(2)} awaiting approval.`);
  }

  updatePageBalance();
  updateFinancesDetails();
  renderFinancesTransactions();
}

function updateFinancesDetails() {
  const currentAccount = localStorage.getItem('currentAccount') || 'demo';
  const trades = JSON.parse(localStorage.getItem(`trades_${currentAccount}`) || '[]');
  const balance = storage.getAccountBalance(currentAccount);

  const totalBalance = document.getElementById('totalBalance');
  const availableBalance = document.getElementById('availableBalance');
  const pendingTrades = document.getElementById('pendingTrades');

  if (totalBalance) totalBalance.textContent = '$' + balance.toLocaleString('en-US', { minimumFractionDigits: 2 });
  if (availableBalance) availableBalance.textContent = '$' + balance.toLocaleString('en-US', { minimumFractionDigits: 2 });
  if (pendingTrades) pendingTrades.textContent = trades.filter(t => t.status === 'open').length;
}

function renderFinancesTransactions() {
  const container = document.getElementById('financesTransactions');
  if (!container) return;

  const currentAccount = localStorage.getItem('currentAccount') || 'demo';
  const transactions = JSON.parse(localStorage.getItem(`transactions_${currentAccount}`) || '[]').slice(0, 10);
  
  container.innerHTML = '';
  if (transactions.length === 0) {
    container.innerHTML = '<div class="empty-state">No transactions yet</div>';
    return;
  }

  transactions.forEach(t => {
    const div = document.createElement('div');
    div.style.cssText = 'padding:10px; margin:8px 0; background:rgba(0,163,255,0.05); border-radius:6px; display:flex; justify-content:space-between; align-items:center;';
    
    const statusIcon = t.type === 'Withdrawal' ? 
      (t.status === 'completed' ? ' ✅' : ' ⏳') : '';
    
    div.innerHTML = `<span><strong>${t.date}</strong><br/>${t.type}: $${parseFloat(t.amount).toFixed(2)}</span><span>${statusIcon}</span>`;
    container.appendChild(div);
  });
}

// Transactions page
if (window.location.pathname.includes('transactions')) {
  document.addEventListener('DOMContentLoaded', () => {
    renderAllTransactions();
  });
}

function renderAllTransactions() {
  const container = document.getElementById('allTransactionsList');
  if (!container) return;

  const currentAccount = localStorage.getItem('currentAccount') || 'demo';
  const transactions = JSON.parse(localStorage.getItem(`transactions_${currentAccount}`) || '[]');

  container.innerHTML = '';
  if (transactions.length === 0) {
    container.innerHTML = '<div class="empty-state" style="padding:40px; text-align:center;">No transactions yet</div>';
    return;
  }

  const table = document.createElement('table');
  table.style.cssText = 'width:100%; border-collapse:collapse;';
  table.innerHTML = `
    <thead style="background:rgba(0,163,255,0.1);">
      <tr>
        <th style="padding:10px; text-align:left;">Date</th>
        <th style="padding:10px; text-align:left;">Type</th>
        <th style="padding:10px; text-align:left;">Amount</th>
        <th style="padding:10px; text-align:left;">Status</th>
      </tr>
    </thead>
  `;

  const tbody = document.createElement('tbody');
  transactions.forEach(t => {
    const tr = document.createElement('tr');
    tr.style.cssText = 'border-bottom:1px solid rgba(0,0,0,0.05);';
    const statusIcon = t.status === 'completed' ? '✅' : (t.status === 'pending' ? '⏳' : '');
    tr.innerHTML = `
      <td style="padding:10px;">${t.date || ''}</td>
      <td style="padding:10px;">${t.type || ''}</td>
      <td style="padding:10px; color:${parseFloat(t.amount) > 0 ? '#2ecc71' : '#e74c3c'}; font-weight:600;">$${parseFloat(t.amount).toFixed(2)}</td>
      <td style="padding:10px;">${statusIcon} ${t.status || ''}</td>
    `;
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  container.appendChild(table);
}

// Profile page
if (window.location.pathname.includes('profile')) {
  document.addEventListener('DOMContentLoaded', () => {
    initProfilePage();
  });
}

function initProfilePage() {
  const user = storage.getUser();
  
  document.getElementById('profileEmail').textContent = user?.email || '-';
  document.getElementById('profileUsername').textContent = user?.username || '-';
  document.getElementById('profileAccountType').textContent = localStorage.getItem('currentAccount') === 'real' ? 'Real Trading' : 'Demo Practice';
  document.getElementById('profileMemberSince').textContent = new Date().toLocaleDateString();

  const accountOpts = document.querySelectorAll('.account-opt');
  accountOpts.forEach(opt => {
    opt.addEventListener('click', function() {
      const type = this.getAttribute('data-type');
      localStorage.setItem('currentAccount', type);
      accountOpts.forEach(o => o.classList.remove('active'));
      this.classList.add('active');
      updatePageBalance();
    });
  });
}

// Payment methods page
if (window.location.pathname.includes('payment-methods')) {
  document.addEventListener('DOMContentLoaded', () => {
    // Already handles via onclick attributes in HTML
  });
}

window.selectPaymentMethod = function(method) {
  const details = document.getElementById('paymentDetails');
  const paymentOptions = document.querySelector('.payment-options');
  
  const paymentInfo = {
    mpesa: `
      <p><strong>Phone Number:</strong> +254 712 345 678</p>
      <p><strong>Business Name:</strong> PreoCrypto Ltd</p>
      <p><strong>Account:</strong> 123456789</p>
      <p><strong style="color:#2ecc71;">Minimum Deposit: $20</strong></p>
      <p>Send the amount to the above M-Pesa number and provide the transaction code in the notes.</p>
    `,
    bank: `
      <p><strong>Account Name:</strong> PreoCrypto Limited</p>
      <p><strong>Account Number:</strong> 1234567890</p>
      <p><strong>Bank:</strong> Standard Bank Kenya</p>
      <p><strong>SWIFT Code:</strong> SBKEKE22</p>
      <p><strong style="color:#2ecc71;">Minimum Deposit: $30</strong></p>
      <p>Please include your account number as reference.</p>
    `,
    usdt: `
      <p><strong>Network:</strong> ERC-20 (Ethereum)</p>
      <p><strong>Wallet Address:</strong> 0x1234567890abcdef1234567890abcdef12345678</p>
      <p><strong style="color:#2ecc71;">Minimum Deposit: $30</strong></p>
      <p>Send USDT to the address above. Funds will be credited within 1-2 confirmations.</p>
    `,
    bitcoin: `
      <p><strong>Bitcoin Address:</strong> 1A1z7agoat7t7UqKgrczq34otQJXjNQjH</p>
      <p><strong style="color:#2ecc71;">Minimum Deposit: $30</strong></p>
      <p><strong>Network:</strong> Bitcoin Mainnet</p>
      <p>Send Bitcoin to the address above. Funds will be credited within 2-3 confirmations.</p>
    `,
    ethereum: `
      <p><strong>Network:</strong> Ethereum Mainnet</p>
      <p><strong>Wallet Address:</strong> 0x9876543210fedcba9876543210fedcba98765432</p>
      <p><strong style="color:#2ecc71;">Minimum Deposit: $30</strong></p>
      <p>Send ETH to the address above. Funds will be credited within 12 confirmations.</p>
    `,
    tron: `
      <p><strong>Network:</strong> Tron (TRC-20)</p>
      <p><strong>Wallet Address:</strong> TGdfdfdfdfdfdfdfdfdfdfdfdfdfdfdfdf</p>
      <p><strong style="color:#2ecc71;">Minimum Deposit: $30</strong></p>
      <p>Send TRX to the address above. Funds will be credited almost instantly.</p>
    `
  };

  document.getElementById('paymentDetailsTitle').textContent = `Payment Details: ${method.toUpperCase()}`;
  document.getElementById('paymentInfo').innerHTML = paymentInfo[method] || '';
  if (paymentOptions) paymentOptions.style.display = 'none';
  if (details) details.style.display = 'block';
};

window.backToPaymentList = function() {
  const details = document.getElementById('paymentDetails');
  const paymentOptions = document.querySelector('.payment-options');
  if (paymentOptions) paymentOptions.style.display = 'grid';
  if (details) details.style.display = 'none';
};

window.applyTransactionFilters = function() {
  // Implementation for transaction filtering if needed
  renderAllTransactions();
};

const API_URL = 'http://localhost:5000/api';

// Check if user is logged in, redirect if not
function checkAuth() {
  const user = storage.getUser();
  if (!user) {
    window.location.href = 'index.html';
    return false;
  }
  return user;
}

// Check if user is admin
function isAdmin() {
  const user = storage.getUser();
  return user && user.isAdmin === true;
}

// Get privileged user entry
function getPrivilegedEntry(username) {
  const user = storage.getUser();
  if (!user) return null;
  // This will be verified with backend
  return user.isPrivileged || false;
}

// Get all privileged users
function getPrivilegedUsers() {
  return fetch(`${API_URL}/privileged-users`)
    .then(r => r.json())
    .catch(e => { console.error(e); return []; });
}

// Add privileged user
function addPrivilegedUser(username, options) {
  return fetch(`${API_URL}/privileged-users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, ...options })
  }).then(r => r.json());
}

// Remove privileged user
function removePrivilegedUser(username) {
  return fetch(`${API_URL}/privileged-users/${username}`, {
    method: 'DELETE'
  }).then(r => r.json());
}

// Admin credit user
function adminCreditUser(username, amount) {
  return fetch(`${API_URL}/admin/credit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, amount })
  }).then(r => r.json());
}

// Render pending withdrawals
function renderPendingWithdrawals() {
  return fetch(`${API_URL}/pending-withdrawals`)
    .then(r => r.json())
    .then(withdrawals => {
      const container = document.createElement('div');
      if (!withdrawals || withdrawals.length === 0) {
        container.textContent = 'No pending withdrawals';
        return container;
      }
      withdrawals.forEach(w => {
        const row = document.createElement('div');
        row.style.cssText = 'display:flex; gap:8px; align-items:center; margin:6px 0; padding:8px; border-bottom:1px solid #eee;';
        row.innerHTML = `<div style="flex:1"><strong>${w.username}</strong><br/><small>$${w.amount} • ${w.method}</small></div><button class="approve-withdrawal action-btn small" data-id="${w.id}">Approve</button>`;
        container.appendChild(row);
      });
      return container;
    });
}

// Run self test
function runSelfTest() {
  return fetch(`${API_URL}/admin/self-test`, {
    method: 'POST'
  }).then(r => r.json());
}

// Setup menu toggle
document.addEventListener('DOMContentLoaded', () => {
  const menuToggle = document.getElementById('menuToggle');
  const sideMenu = document.getElementById('sideMenu');
  const menuClose = document.querySelector('.menu-close');

  if (menuToggle) {
    menuToggle.addEventListener('click', () => {
      sideMenu.style.left = '0';
    });
  }

  if (menuClose) {
    menuClose.addEventListener('click', () => {
      sideMenu.style.left = '-250px';
    });
  }

  // Logout handler
  const logoutBtn = document.querySelector('.logout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      storage.logout();
      window.location.href = 'index.html';
    });
  }

  // Theme toggle
  const toggleMode = document.getElementById('toggleMode');
  if (toggleMode) {
    toggleMode.addEventListener('click', () => {
      document.body.classList.toggle('dark-mode');
      localStorage.setItem('theme', document.body.classList.contains('dark-mode') ? 'dark' : 'light');
    });
    // Load saved theme
    if (localStorage.getItem('theme') === 'dark') {
      document.body.classList.add('dark-mode');
    }
  }
});
