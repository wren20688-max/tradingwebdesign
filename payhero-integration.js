// ============================================================================
// PayHero Payment Integration
// Handles payment method integration with PayHero gateway
// ============================================================================

/**
 * PayHero Configuration
 * @type {Object}
 */
const PayHeroConfig = {
  // PayHero API Credentials (Replace with your actual credentials)
  PUBLIC_KEY: 'your_payhero_public_key',
  SECRET_KEY: 'your_payhero_secret_key',
  API_URL: 'https://api.payhero.io/v1',
  WEBHOOK_URL: 'https://YOUR_API_GATEWAY_ID.execute-api.YOUR_REGION.amazonaws.com/default/payhero-webhook',
  
  // Payment method mappings for PayHero
  PAYMENT_METHODS: {
    bank_transfer: {
      gateway_code: 'bank_transfer',
      provider: 'ACH',
      currency: 'USD',
      processing_time: '1-3 days',
      min_amount: 10,
      max_amount: 100000,
      fee_percentage: 0.5,
      fee_fixed: 0
    },
    credit_card: {
      gateway_code: 'credit_card',
      provider: 'CARD',
      currency: 'USD',
      processing_time: 'Instant',
      min_amount: 10,
      max_amount: 50000,
      fee_percentage: 2.9,
      fee_fixed: 0.30
    },
    crypto: {
      gateway_code: 'crypto',
      provider: 'CRYPTO',
      currency: 'USD',
      processing_time: '5-15 minutes',
      min_amount: 10,
      max_amount: 100000,
      fee_percentage: 1.0,
      fee_fixed: 0
    },
    paypal: {
      gateway_code: 'paypal',
      provider: 'PAYPAL',
      currency: 'USD',
      processing_time: 'Instant',
      min_amount: 10,
      max_amount: 100000,
      fee_percentage: 2.2,
      fee_fixed: 0.30
    }
  }
};

/**
 * Initialize PayHero Payment Handler
 * Sets up payment method integration with PayHero gateway
 */
const PayHeroIntegration = {
  
  /**
   * Create Payment Intent with PayHero
   * @param {Object} paymentData - Payment configuration
   * @returns {Promise<Object>} Payment intent response
   */
  async createPaymentIntent(paymentData) {
    const {
      amount,
      method,
      currency = 'USD',
      userId,
      userEmail,
      userName
    } = paymentData;

    // Validate payment data
    if (!this.validatePaymentData(paymentData)) {
      return {
        success: false,
        error: 'Invalid payment data'
      };
    }

    // Get method configuration
    const methodConfig = PayHeroConfig.PAYMENT_METHODS[method];
    if (!methodConfig) {
      return {
        success: false,
        error: 'Unsupported payment method'
      };
    }

    // Calculate fees
    const fee = this.calculateFee(amount, methodConfig);
    const totalAmount = amount + fee;

    // Create payment payload for PayHero
    const payload = {
      amount: totalAmount,
      currency: currency,
      payment_method: methodConfig.gateway_code,
      description: `PreoCrypto Deposit - ${amount} USD`,
      metadata: {
        user_id: userId,
        user_email: userEmail,
        user_name: userName,
        method_type: method,
        original_amount: amount,
        fee: fee,
        platform: 'preotrader_fx'
      },
      customer: {
        email: userEmail,
        name: userName
      },
      redirect_url: `${window.location.origin}/deposit.html?payment_status=success`,
      webhook_url: PayHeroConfig.WEBHOOK_URL
    };

    try {
      const response = await this.callPayHeroAPI('/payment/create', payload);
      
      if (response.success) {
        return {
          success: true,
          paymentId: response.data.id,
          paymentUrl: response.data.payment_url,
          amount: amount,
          fee: fee,
          totalAmount: totalAmount,
          method: method,
          status: 'pending',
          createdAt: new Date().toISOString()
        };
      } else {
        return {
          success: false,
          error: response.error || 'Payment intent creation failed'
        };
      }
    } catch (error) {
      console.error('PayHero API Error:', error);
      return {
        success: false,
        error: error.message || 'Payment processing failed'
      };
    }
  },

  /**
   * Process Payment with Method-specific Configuration
   * @param {Object} paymentData - Payment information
   * @returns {Promise<Object>} Processing result
   */
  async processPayment(paymentData) {
    const {
      amount,
      method,
      cardData,
      bankData,
      cryptoData,
      userId,
      userEmail
    } = paymentData;

    // Validate method-specific data
    if (!this.validateMethodData(method, paymentData)) {
      return {
        success: false,
        error: 'Invalid payment method data'
      };
    }

    const methodConfig = PayHeroConfig.PAYMENT_METHODS[method];
    const payload = {
      amount: amount,
      method: method,
      currency: 'USD',
      userId: userId,
      userEmail: userEmail
    };

    // Add method-specific payload
    switch(method) {
      case 'bank_transfer':
        payload.bank = {
          account_type: bankData?.accountType || 'checking',
          routing_number: bankData?.routingNumber,
          account_number: bankData?.accountNumber,
          account_holder: bankData?.accountHolder
        };
        break;

      case 'credit_card':
        payload.card = {
          token: cardData?.token,
          card_type: cardData?.cardType || 'visa',
          last_four: cardData?.lastFour
        };
        break;

      case 'crypto':
        payload.crypto = {
          cryptocurrency: cryptoData?.type || 'bitcoin',
          wallet_address: cryptoData?.walletAddress,
          amount_in_crypto: cryptoData?.cryptoAmount
        };
        break;

      case 'paypal':
        payload.paypal = {
          paypal_account: userEmail
        };
        break;
    }

    try {
      const response = await this.callPayHeroAPI('/payment/process', payload);
      
      if (response.success) {
        return {
          success: true,
          transactionId: response.data.transaction_id,
          status: 'completed',
          amount: amount,
          method: method,
          timestamp: Date.now()
        };
      } else {
        return {
          success: false,
          error: response.error || 'Payment processing failed',
          transactionId: response.data?.transaction_id
        };
      }
    } catch (error) {
      console.error('Payment processing error:', error);
      return {
        success: false,
        error: error.message || 'Payment processing failed'
      };
    }
  },

  /**
   * Verify Payment Status with PayHero
   * @param {string} paymentId - PayHero payment ID
   * @returns {Promise<Object>} Payment status
   */
  async verifyPaymentStatus(paymentId) {
    try {
      const response = await this.callPayHeroAPI(`/payment/${paymentId}/verify`, {}, 'GET');
      
      return {
        success: response.success,
        status: response.data?.status,
        amount: response.data?.amount,
        method: response.data?.method,
        timestamp: response.data?.created_at
      };
    } catch (error) {
      console.error('Payment verification error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  /**
   * Get Payment Method Fee
   * @param {string} method - Payment method
   * @returns {Object} Fee information
   */
  getMethodFeeInfo(method) {
    const config = PayHeroConfig.PAYMENT_METHODS[method];
    if (!config) return null;

    return {
      method: method,
      feePercentage: config.fee_percentage,
      feeFixed: config.fee_fixed,
      processingTime: config.processing_time,
      minAmount: config.min_amount,
      maxAmount: config.max_amount
    };
  },

  /**
   * Calculate Total Fee for Payment
   * @param {number} amount - Deposit amount
   * @param {Object} methodConfig - Method configuration
   * @returns {number} Total fee
   */
  calculateFee(amount, methodConfig) {
    const percentageFee = (amount * methodConfig.fee_percentage) / 100;
    const totalFee = percentageFee + methodConfig.fee_fixed;
    return Math.round(totalFee * 100) / 100;
  },

  /**
   * Validate Payment Data
   * @param {Object} paymentData - Payment data to validate
   * @returns {boolean} Validation result
   */
  validatePaymentData(paymentData) {
    const { amount, method, userId, userEmail } = paymentData;

    // Check required fields
    if (!amount || amount <= 0) return false;
    if (!method || !PayHeroConfig.PAYMENT_METHODS[method]) return false;
    if (!userId || !userEmail) return false;

    // Check amount limits
    const methodConfig = PayHeroConfig.PAYMENT_METHODS[method];
    if (amount < methodConfig.min_amount || amount > methodConfig.max_amount) return false;

    return true;
  },

  /**
   * Validate Method-specific Data
   * @param {string} method - Payment method
   * @param {Object} paymentData - Full payment data
   * @returns {boolean} Validation result
   */
  validateMethodData(method, paymentData) {
    switch(method) {
      case 'bank_transfer':
        return paymentData.bankData && 
               paymentData.bankData.routingNumber && 
               paymentData.bankData.accountNumber;
      
      case 'credit_card':
        return paymentData.cardData && paymentData.cardData.token;
      
      case 'crypto':
        return paymentData.cryptoData && paymentData.cryptoData.walletAddress;
      
      case 'paypal':
        return paymentData.userEmail;
      
      default:
        return false;
    }
  },

  /**
   * Call PayHero API
   * @param {string} endpoint - API endpoint
   * @param {Object} data - Request payload
   * @param {string} method - HTTP method
   * @returns {Promise<Object>} API response
   */
  async callPayHeroAPI(endpoint, data, method = 'POST') {
    // Route calls through backend proxy to keep credentials server-side
    let url = '';
    // Optional credential index from localStorage (0-based)
    let credIdx = 0;
    try { const v = localStorage.getItem('payheroCredIndex'); if (v !== null) credIdx = parseInt(v, 10) || 0; } catch {}
    const credParam = (Number.isFinite(credIdx) && credIdx >= 0) ? `?cred=${credIdx}` : '';
    if (endpoint.startsWith('/payment/create')) url = '/api/payments/create';
    else if (endpoint.startsWith('/payment/process')) url = '/api/payments/process';
    else if (endpoint.includes('/payment/') && endpoint.endsWith('/verify')) {
      const id = endpoint.split('/payment/')[1].replace('/verify','');
      url = `/api/payments/${id}/verify`;
    } else {
      // Fallback to proxy any other endpoint under a generic path if needed in future
      url = '/api/payments/create';
    }

    // Append credential selection when applicable
    if (!url.includes('/verify')) {
      url = `${url}${credParam}`;
    } else if (credParam) {
      url = `${url}${credParam}`;
    }

    try {
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: method !== 'GET' ? JSON.stringify(data) : undefined
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || result.error || 'API Error');
      }
      return result;
    } catch (error) {
      console.error('PayHero proxy call failed:', error);
      throw error;
    }
  },

  /**
   * Generate Unique Request ID
   * @returns {string} Unique request ID
   */
  generateRequestId() {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  },

  /**
   * Handle Payment Webhook from PayHero
   * @param {Object} webhookData - Webhook payload from PayHero
   * @returns {Object} Processing result
   */
  handleWebhook(webhookData) {
    const { 
      event_type, 
      data: {
        id,
        status,
        amount,
        metadata
      }
    } = webhookData;

    // Verify webhook signature
    if (!this.verifyWebhookSignature(webhookData)) {
      return {
        success: false,
        error: 'Invalid webhook signature'
      };
    }

    switch(event_type) {
      case 'payment.completed':
        return this.handlePaymentCompleted(webhookData);
      
      case 'payment.failed':
        return this.handlePaymentFailed(webhookData);
      
      case 'payment.pending':
        return this.handlePaymentPending(webhookData);
      
      case 'payment.cancelled':
        return this.handlePaymentCancelled(webhookData);
      
      default:
        console.warn('Unknown webhook event:', event_type);
        return { success: true, message: 'Event processed' };
    }
  },

  /**
   * Handle Completed Payment
   * @param {Object} webhookData - Webhook data
   * @returns {Object} Result
   */
  handlePaymentCompleted(webhookData) {
    const { data } = webhookData;
    const metadata = data.metadata || {};

    // Update user balance
    const user = storage.getUser();
    if (user && user.email === metadata.user_email) {
      const accountData = JSON.parse(localStorage.getItem('accountData_real') || '{"balance":0,"equity":0,"pnl":0}');
      accountData.balance += data.amount;
      accountData.equity += data.amount;
      
      localStorage.setItem('accountData_real', JSON.stringify(accountData));
      storage.setBalance(accountData.balance, 'real');

      // Record transaction
      const transaction = {
        type: 'deposit',
        date: new Date().toISOString().split('T')[0],
        amount: metadata.original_amount,
        fee: metadata.fee,
        direction: 'credit',
        method: data.payment_method,
        timestamp: Date.now(),
        status: 'completed',
        paymentId: data.id,
        transactionId: data.transaction_id
      };
      storage.addTransaction(transaction);

      return {
        success: true,
        message: 'Payment completed and balance updated',
        amount: data.amount,
        userId: metadata.user_id
      };
    }

    return {
      success: false,
      error: 'User not found'
    };
  },

  /**
   * Handle Failed Payment
   * @param {Object} webhookData - Webhook data
   * @returns {Object} Result
   */
  handlePaymentFailed(webhookData) {
    const { data } = webhookData;
    const metadata = data.metadata || {};

    // Record failed transaction
    const transaction = {
      type: 'deposit_failed',
      date: new Date().toISOString().split('T')[0],
      amount: metadata.original_amount,
      direction: 'debit',
      method: data.payment_method,
      timestamp: Date.now(),
      status: 'failed',
      paymentId: data.id,
      error: data.error_message
    };
    storage.addTransaction(transaction);

    return {
      success: true,
      message: 'Payment failed - transaction recorded',
      userId: metadata.user_id,
      error: data.error_message
    };
  },

  /**
   * Handle Pending Payment
   * @param {Object} webhookData - Webhook data
   * @returns {Object} Result
   */
  handlePaymentPending(webhookData) {
    const { data } = webhookData;

    const transaction = {
      type: 'deposit',
      date: new Date().toISOString().split('T')[0],
      amount: data.metadata?.original_amount,
      direction: 'credit',
      method: data.payment_method,
      timestamp: Date.now(),
      status: 'pending',
      paymentId: data.id
    };
    storage.addTransaction(transaction);

    return {
      success: true,
      message: 'Payment pending - awaiting confirmation'
    };
  },

  /**
   * Handle Cancelled Payment
   * @param {Object} webhookData - Webhook data
   * @returns {Object} Result
   */
  handlePaymentCancelled(webhookData) {
    const { data } = webhookData;

    const transaction = {
      type: 'deposit_cancelled',
      date: new Date().toISOString().split('T')[0],
      amount: data.metadata?.original_amount,
      direction: 'debit',
      method: data.payment_method,
      timestamp: Date.now(),
      status: 'cancelled',
      paymentId: data.id
    };
    storage.addTransaction(transaction);

    return {
      success: true,
      message: 'Payment cancelled',
      userId: data.metadata?.user_id
    };
  },

  /**
   * Verify Webhook Signature (HMAC SHA256)
   * @param {Object} webhookData - Webhook payload
   * @returns {boolean} Signature valid
   */
  verifyWebhookSignature(webhookData) {
    // This is a placeholder - implement actual HMAC verification with PayHero
    // In production, verify the webhook signature from PayHero headers
    const signature = webhookData.signature;
    const payload = JSON.stringify(webhookData);
    
    // Example HMAC verification (implement with actual PayHero secret)
    // const expectedSignature = crypto.createHmac('sha256', PayHeroConfig.SECRET_KEY).update(payload).digest('hex');
    // return signature === expectedSignature;
    
    return true; // Placeholder - always true for now
  }
};

/**
 * Export for use in other modules
 */
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    PayHeroConfig,
    PayHeroIntegration
  };
}
