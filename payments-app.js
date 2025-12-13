/* Payments App: handles payment methods interactions and PayHero flows */
(function(){
  function showCopyToast(){
    const toast = document.getElementById('copyToast');
    if(!toast) return;
    toast.style.display = 'block';
    setTimeout(()=>{ toast.style.display = 'none'; }, 1500);
  }

  function apiBase() {
    try {
      const { protocol, hostname, port } = window.location;
      if (String(port) === '3000') return '';
      if (hostname === 'localhost' && port === '') return 'http://localhost:3000';
      return `${protocol}//localhost:3000`;
    } catch { return 'http://localhost:3000'; }
  }

  async function apiFetch(path, options = {}) {
    const url = `${apiBase()}${path}`;
    const res = await fetch(url, options);
    const text = await res.text().catch(() => '');
    let json;
    try { json = text ? JSON.parse(text) : {}; } catch { json = { raw: text }; }
    if (!res.ok) {
      const message = (json && (json.error || json.message)) || `HTTP ${res.status}`;
      throw new Error(message);
    }
    return json;
  }

  function loadBalance() {
    const balanceEl = document.getElementById('balance');
    if (!balanceEl) return;
    const balance = storage.getBalance('demo');
    balanceEl.textContent = '$' + balance.toLocaleString('en-US', {minimumFractionDigits: 2});
  }

  function setupMenuToggle() {
    const menuToggle = document.getElementById('menuToggle');
    const sideMenu = document.getElementById('sideMenu');
    const menuClose = document.querySelector('.menu-close');
    const logout = document.querySelector('.logout');
    const toggleMode = document.getElementById('toggleMode');

    if (menuToggle) menuToggle.addEventListener('click', () => sideMenu?.classList.add('active'));
    if (menuClose) menuClose.addEventListener('click', () => sideMenu?.classList.remove('active'));
    if (logout) logout.addEventListener('click', (e) => {
      e.preventDefault();
      storage.removeUser();
      window.location.href = 'index.html';
    });
    if (toggleMode) toggleMode.addEventListener('click', () => {
      document.body.classList.toggle('light-mode');
      localStorage.setItem('theme', document.body.classList.contains('light-mode') ? 'light' : 'dark');
    });

    if (localStorage.getItem('theme') === 'light') {
      document.body.classList.add('light-mode');
    }
  }

  function normalizeKenyanMsisdn(input) {
    let v = String(input).replace(/\s|\-/g, '');
    if (v.startsWith('+')) v = v.slice(1);
    if (v.startsWith('0') && (v[1] === '7' || v[1] === '1')) v = '254' + v.slice(1);
    return v;
  }

  function sendBrowserNotification(title, message) {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body: message,
        icon: '/assets/logo.png',
        badge: '/assets/logo-badge.png',
        tag: 'preocrypto-payment',
        requireInteraction: false
      });
    }
  }

  async function pollPaymentStatus(paymentId, amountUsd, phone) {
    const credIdx = parseInt(localStorage.getItem('payheroCredIndex') || '0', 10) || 0;
    const start = Date.now();
    const timeoutMs = 2 * 60 * 1000;
    const interval = 3000;
    while (Date.now() - start < timeoutMs) {
      try {
        const j = await apiFetch(`/api/payments/${encodeURIComponent(paymentId)}/verify?cred=${credIdx}`);
        const status = (j?.data?.status || j?.status || '').toLowerCase();
        if (status === 'successful' || status === 'success' || status === 'completed') {
          onPaymentSuccess(amountUsd, phone);
          return;
        }
        if (status === 'failed' || status === 'cancelled') {
          alert('Payment ' + status + '. Please try again.');
          return;
        }
      } catch {}
      await new Promise(res => setTimeout(res, interval));
    }
    alert('Still waiting for confirmation. Balance will update when complete.');
  }

  function onPaymentSuccess(amountUsd, phone) {
    try { sendBrowserNotification('Payment Completed', 'Amount: USD ' + amountUsd); } catch {}
    alert('Payment Completed!\nM-Pesa: ' + phone + '\nAmount: USD ' + amountUsd + '\n(Note: Provider will convert to KES)');
    resetStkPush();
    backToPaymentList();
  }

  function resetStkPush() {
    const p = document.getElementById('mpesaPhone');
    const a = document.getElementById('mpesaAmount');
    const r = document.getElementById('stkResponse');
    if (p) p.value = '';
    if (a) a.value = '';
    if (r) r.style.display = 'none';
  }

  function backToPaymentList() {
    const d = document.getElementById('paymentDetails');
    if (d) d.style.display = 'none';
  }

  function selectPaymentMethod(method) {
    const detailMap = {
      mpesa: { title: 'M-Pesa (PayHero)', info: '', showStk: true },
      bank: { title: 'Bank Transfer', info: 'Account Name: PreoCrypto Ltd\nAccount Number: 1234567890\nBank: Global Finance Bank\nBranch: Nairobi Main\nSWIFT: GFBKXX\nReference: PREO-<YourEmail>\nMinimum: $50', showStk: false },
      usdt: { title: 'USDT (BEP20)', info: 'Network: BNB Smart Chain (BEP20)\nAddress: 0xcc6371a1f224ac0e655b6c787be086444be2f674\nMinimum: $25', showStk: false },
      bitcoin: { title: 'Bitcoin', info: 'Network: Bitcoin\nAddress: 1CYRe7kTYVmQEmswhDyh6kyjDhJRoB9GEm\nMinimum: $25', showStk: false },
      ethereum: { title: 'Ethereum (ERC20)', info: 'Network: Ethereum (ERC20)\nAddress: 0xcc6371a1f224ac0e655b6c787be086444be2f674\nMinimum: $25', showStk: false },
      tron: { title: 'TRON (TRC20)', info: 'Network: Tron (TRC20)\nAddress: TUmex3LPfRF8Zjbx8DUw6XS7YfDmuoXKuz\nMinimum: $25', showStk: false }
    };
    const detail = detailMap[method];
    if (!detail) return;
    const titleEl = document.getElementById('paymentDetailsTitle');
    const infoEl = document.getElementById('paymentInfo');
    const modal = document.getElementById('stkPushModal');
    const panel = document.getElementById('paymentDetails');
    if (titleEl) titleEl.textContent = detail.title;
    if (detail.showStk) {
      if (modal) modal.style.display = 'block';
      if (infoEl) infoEl.innerHTML = '';
    } else {
      if (modal) modal.style.display = 'none';
      if (infoEl) {
        infoEl.innerHTML = '<pre style="white-space:pre-wrap; word-wrap:break-word;">' + detail.info + '</pre>';
        // If Bank selected, show PayHero checkout option
        if (method === 'bank') {
          const bankCta = document.createElement('div');
          bankCta.style.marginTop = '12px';
          bankCta.innerHTML = `
            <div style="display:flex; gap:8px; align-items:center;">
              <input id="bankAmountUsd" type="number" min="10" step="0.01" placeholder="Amount (USD)" style="flex:1; padding:10px; border:1px solid var(--border-color); border-radius:8px; background:var(--bg-secondary); color:var(--text-primary);">
              <button class="action-btn" id="bankPayHeroBtn">Pay via PayHero</button>
            </div>
            <small style="color:var(--text-tertiary); display:block; margin-top:6px;">You can also send manually via bank and upload proof in Transactions.</small>
          `;
          infoEl.appendChild(bankCta);
          const btn = document.getElementById('bankPayHeroBtn');
          if (btn) btn.addEventListener('click', initiateBankPayHero);
        }
        const match = detail.info.match(/Address:\s*([^\n]+)/i);
        if (match && match[1]) {
          const addr = match[1].trim();
          let networkLabel = 'Network';
          if (method === 'usdt') networkLabel = 'BEP20';
          else if (method === 'ethereum') networkLabel = 'ERC20';
          else if (method === 'tron') networkLabel = 'TRC20';
          else if (method === 'bitcoin') networkLabel = 'Bitcoin';
          const wrap = document.createElement('div');
          wrap.style.marginTop = '12px';
          wrap.innerHTML = `
            <div style="display:flex; gap:8px; align-items:center;">
              <div class="input-with-icon" style="flex:1;">
                <input id="cryptoAddrCopy" type="text" readonly value="${addr}" style="width:100%; padding:8px; border:1px solid var(--border-color); border-radius:6px; background:var(--bg-secondary); color:var(--text-primary);">
                <button class="copy-icon-btn" id="copyIconBtn" title="Copy">📋</button>
              </div>
              <button class="action-btn outline" id="toggleQrBtn">Show QR</button>
            </div>
            <div style="display:flex; gap:8px; align-items:center; margin-top:8px;">
              <span class="network-badge">${networkLabel}</span>
              <small style="color:var(--text-tertiary);">Minimum deposit for crypto: $25</small>
            </div>
            <div id="qrWrap" style="display:none; margin-top:10px; text-align:center;">
              <div id="qrContainer" style="display:inline-block; padding:8px; background:var(--bg-tertiary); border-radius:8px;"></div>
              <div style="font-size:12px; color:var(--text-tertiary); margin-top:6px;">Scan to pay</div>
            </div>
          `;
          infoEl.appendChild(wrap);
          const iconBtn = document.getElementById('copyIconBtn');
          if (iconBtn) iconBtn.addEventListener('click', () => {
            const el = document.getElementById('cryptoAddrCopy');
            el.select();
            document.execCommand('copy');
            showCopyToast();
          });
          const toggleBtn = document.getElementById('toggleQrBtn');
          toggleBtn.addEventListener('click', () => {
            const wrapEl = document.getElementById('qrWrap');
            if (wrapEl.style.display === 'none') {
              const container = document.getElementById('qrContainer');
              container.innerHTML = '';
              try {
                let uri = addr;
                if (method === 'bitcoin') uri = `bitcoin:${addr}`;
                else if (method === 'ethereum') uri = `ethereum:${addr}`;
                else if (method === 'tron') uri = `tron:${addr}`;
                else if (method === 'usdt') uri = `ethereum:${addr}`;
                new QRCode(container, {
                  text: uri,
                  width: 160,
                  height: 160,
                  colorDark: getComputedStyle(document.body).getPropertyValue('--text-primary') || '#000',
                  colorLight: getComputedStyle(document.body).getPropertyValue('--bg-secondary') || '#fff',
                  correctLevel: QRCode.CorrectLevel.M
                });
              } catch(e) {}
              wrapEl.style.display = 'block';
              toggleBtn.textContent = 'Hide QR';
            } else {
              wrapEl.style.display = 'none';
              toggleBtn.textContent = 'Show QR';
            }
          });
        }
      }
    }
    if (panel) panel.style.display = 'block';
  }

  async function initiateBankPayHero() {
    try {
      const amountUsd = parseFloat(document.getElementById('bankAmountUsd').value);
      if (!amountUsd || amountUsd < 10) {
        alert('Amount must be at least $10');
        return;
      }
      const user = storage.getUser && storage.getUser() || {};
      const payload = {
        amount: amountUsd,
        currency: 'USD',
        payment_method: 'bank',
        description: `Bank Deposit - ${amountUsd} USD`,
        metadata: {
          user_id: user.id || user.email || user.username || 'guest',
          user_email: user.email || '',
          user_name: user.username || '',
          platform: 'preotrader_fx',
          original_amount_usd: amountUsd
        },
        customer: {
          email: user.email || '',
          name: user.username || ''
        }
      };
      const result = await apiFetch(`/api/payments/create?cred=0`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (result.success === false) throw new Error(result.error || result.message || 'Failed to create payment');
      const redirectUrl = result?.data?.payment_url || result?.payment_url;
      if (redirectUrl) {
        window.location.href = redirectUrl;
      } else {
        alert('Payment page not available. Please use manual bank transfer.');
      }
    } catch (e) {
      alert('Failed to start PayHero bank payment: ' + e.message);
    }
  }

  function initiateStkPush() {
    const phone = document.getElementById('mpesaPhone').value.trim();
    const amount = parseFloat(document.getElementById('mpesaAmount').value);
    if (!phone.match(/^(\+254|0)[17]\d{8}$/)) {
      alert('Enter a valid M-Pesa number (e.g., +254712345678 or 0712345678)');
      return;
    }
    if (!amount || amount < 10) {
      alert('Amount must be at least $10');
      return;
    }
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then(() => proceedWithStkPush(phone, amount));
    } else {
      proceedWithStkPush(phone, amount);
    }
  }

  async function proceedWithStkPush(phone, amount) {
    const resp = document.getElementById('stkResponse');
    const display = document.getElementById('stkPhoneDisplay');
    if (resp) resp.style.display = 'block';
    if (display) display.textContent = `Phone: ${phone}\nAmount: $${amount.toFixed(2)}\nStatus: Sending STK push...`;

    try {
      const user = storage.getUser() || {};
      const normalized = normalizeKenyanMsisdn(phone);
      const payload = {
        amount: amount,
        currency: 'USD',
        payment_method: 'mpesa',
        description: `PreoCrypto Deposit - ${amount} USD`,
        metadata: {
          user_id: user.id || user.email || user.username || 'guest',
          user_email: user.email || '',
          user_name: user.username || '',
          platform: 'preotrader_fx',
          msisdn: normalized,
          original_amount_usd: amount
        },
        customer: {
          email: user.email || '',
          name: user.username || '',
          phone: normalized
        }
      };

      // Prefer dedicated hosted STK creation to ensure msisdn + amount are passed properly
      const result = await apiFetch(`/api/payhero/create-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user.email || user.username || 'guest@preotrader.fx',
          amount: amount,
          phone: normalized
        })
      });
      if (result.success === false) throw new Error(result.error || result.message || 'Failed to create payment');

      const paymentId = result?.data?.id || result?.id;
      const redirectUrl = result?.data?.payment_url || result?.payment_url;

      if (display) display.textContent = `Phone: ${phone}\nAmount: $${amount.toFixed(2)}\nStatus: STK sent to ${normalized}. Waiting...`;

      if (redirectUrl) {
        window.location.href = redirectUrl; // same-tab navigation to avoid popup blockers
      }
      // Hosted checkout typically requires user confirmation; polling may not reflect until webhook/callback.
    } catch (err) {
      alert('Failed to send STK push: ' + err.message);
      if (display) display.textContent = 'Status: Failed to send STK push';
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    // Do not hard-redirect on this page; show balance if available.
    try {
      if (window.storage && storage.isLoggedIn && storage.isLoggedIn()) {
        loadBalance();
      } else {
        // Fallback: show default balance and allow viewing methods; disable STK submission until user logs in.
        const b = document.getElementById('balance');
        if (b) b.textContent = '$10,000.00';
        const sendBtn = document.getElementById('sendStkBtn');
        if (sendBtn) {
          sendBtn.disabled = true;
          sendBtn.title = 'Please log in to send STK push';
        }
      }
    } catch {}
    setupMenuToggle();

    // Wire buttons
    const sendBtn = document.getElementById('sendStkBtn');
    const cancelBtn = document.getElementById('cancelStkBtn');
    const backBtn = document.getElementById('backToListBtn');
    if (sendBtn) sendBtn.addEventListener('click', initiateStkPush);
    if (cancelBtn) cancelBtn.addEventListener('click', resetStkPush);
    if (backBtn) backBtn.addEventListener('click', backToPaymentList);

    // Expose selectPaymentMethod globally for inline onclicks
    window.selectPaymentMethod = selectPaymentMethod;
  });
})();
