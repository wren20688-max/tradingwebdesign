## PayHero Payment Integration - Implementation Guide

### Overview
Complete payment integration system for PreoCrypto platform connecting 4 payment methods (Bank Transfer, Credit Card, Crypto, PayPal) with PayHero gateway.

---

## File Structure

### 1. **payhero-integration.js** (Core Integration)
Main payment processing module with PayHero API communication.

#### Key Components:

**PayHeroConfig** - Configuration object:
```javascript
{
  PUBLIC_KEY: 'your_payhero_public_key',        // Replace with real key
  SECRET_KEY: 'your_payhero_secret_key',        // Replace with real key
  API_URL: 'https://api.payhero.io/v1',
  WEBHOOK_URL: 'https://yourapp.com/webhook/payhero'
}
```

**Payment Methods Mapping:**
- `bank_transfer` - ACH processing (1-3 days, 0.5% fee)
- `credit_card` - Card processing (Instant, 2.9% + $0.30)
- `crypto` - Cryptocurrency (5-15 min, 1% fee)
- `paypal` - PayPal (Instant, 2.2% + $0.30)

#### Core Functions:

**`createPaymentIntent(paymentData)`**
- Creates payment intent with PayHero
- Validates payment data
- Calculates fees
- Returns payment URL for redirect
- **Returns:** `{success, paymentId, paymentUrl, amount, fee, totalAmount}`

**`processPayment(paymentData)`**
- Processes payment with method-specific configuration
- Handles bank, card, crypto, and PayPal data
- **Returns:** `{success, transactionId, status, timestamp}`

**`verifyPaymentStatus(paymentId)`**
- Checks payment status with PayHero
- **Returns:** `{success, status, amount, method}`

**`calculateFee(amount, methodConfig)`**
- Calculates processing fee based on method
- Formula: (amount × percentage) + fixed fee

**`getMethodFeeInfo(method)`**
- Returns fee information for method
- Shows processing time and limits

**`handleWebhook(webhookData)`**
- Processes PayHero webhook events
- Handles: payment.completed, payment.failed, payment.pending, payment.cancelled
- Updates user balance on completion

---

### 2. **deposit-app.js** (UI Integration)
Handles deposit form and PayHero integration.

#### Updated Functions:

**`handleDeposit(e)` - ASYNC**
```javascript
// Flow:
1. Validate amount ($10-$100,000)
2. Get selected payment method
3. Call PayHeroIntegration.createPaymentIntent()
4. On success: Redirect to payment URL or process demo
5. On error: Show error notification and re-enable form
```

**`processDepositSuccess(amount, method, depositUser)`**
```javascript
// After payment:
1. Record transaction in localStorage
2. Update account balance
3. Update marketer balance (if applicable)
4. Show success notification
5. Redirect to finances page
```

---

### 3. **deposit.html** (UI)
Payment method selector and deposit form.

#### Elements:
- 4 payment method buttons (Bank, Card, Crypto, PayPal)
- Amount input ($10 min, $100,000 max)
- Method-specific fields (dropdowns for each method)
- Recent deposits list
- Fee information display

---

## Implementation Steps

### Step 1: Update PayHero Credentials

Edit `payhero-integration.js` line 8-10:

```javascript
const PayHeroConfig = {
  PUBLIC_KEY: 'pk_live_your_actual_public_key',
  SECRET_KEY: 'sk_live_your_actual_secret_key',
  API_URL: 'https://api.payhero.io/v1',
  WEBHOOK_URL: 'https://your-domain.com/webhook/payhero'
};
```

### Step 2: Configure API Endpoints

Update `WEBHOOK_URL` to your server endpoint that receives PayHero webhooks:

```javascript
WEBHOOK_URL: 'https://preocrypto.yourdomain.com/webhook/payhero'
```

### Step 3: Deploy Webhook Handler

Create a backend endpoint to receive PayHero webhooks:

```javascript
// Example: Node.js/Express
app.post('/webhook/payhero', (req, res) => {
  const webhookData = req.body;
  const result = PayHeroIntegration.handleWebhook(webhookData);
  res.json({ received: true });
});
```

### Step 4: Test Payment Flow

1. Navigate to deposit.html
2. Select payment method
3. Enter amount ($10 or more)
4. Click submit
5. Verify payment intent is created
6. Test with PayHero sandbox mode

---

## Payment Flow Diagram

```
User Form (deposit.html)
    ↓
handleDeposit() [deposit-app.js]
    ↓
createPaymentIntent() [payhero-integration.js]
    ↓
PayHero API /payment/create
    ↓
Returns: paymentId + paymentUrl
    ↓
Redirect to Payment Processor
    ↓
User Completes Payment
    ↓
PayHero Webhook → Backend
    ↓
handleWebhook() [payhero-integration.js]
    ↓
Update Balance + Transaction Record
```

---

## API Reference

### PayHeroIntegration Methods

#### `createPaymentIntent(paymentData)`
**Input:**
```javascript
{
  amount: 100,              // USD amount
  method: 'credit_card',    // Payment method
  currency: 'USD',
  userId: 'user123',
  userEmail: 'user@example.com',
  userName: 'John Doe'
}
```

**Output:**
```javascript
{
  success: true,
  paymentId: 'pay_1234567890',
  paymentUrl: 'https://payment.payhero.io/...',
  amount: 100,
  fee: 3.20,
  totalAmount: 103.20,
  status: 'pending'
}
```

#### `processPayment(paymentData)`
**Input:**
```javascript
{
  amount: 100,
  method: 'bank_transfer',
  userId: 'user123',
  userEmail: 'user@example.com',
  bankData: {
    accountType: 'checking',
    routingNumber: '121000248',
    accountNumber: '123456789',
    accountHolder: 'John Doe'
  }
}
```

**Output:**
```javascript
{
  success: true,
  transactionId: 'txn_1234567890',
  status: 'completed',
  timestamp: '2024-01-15T10:30:00Z'
}
```

#### `verifyPaymentStatus(paymentId)`
**Input:** `'pay_1234567890'`

**Output:**
```javascript
{
  success: true,
  status: 'completed',
  amount: 103.20,
  method: 'credit_card'
}
```

#### `getMethodFeeInfo(method)`
**Input:** `'credit_card'`

**Output:**
```javascript
{
  method: 'credit_card',
  feePercentage: 2.9,
  feeFixed: 0.30,
  processingTime: 'Instant',
  minAmount: 10,
  maxAmount: 50000
}
```

---

## Error Handling

### Common Errors & Solutions

| Error | Cause | Solution |
|-------|-------|----------|
| "Invalid API credentials" | Wrong PUBLIC_KEY/SECRET_KEY | Update PayHeroConfig |
| "Payment intent creation failed" | Invalid payment data | Validate amount/method |
| "Unsupported payment method" | Method not in config | Check method name spelling |
| "Amount exceeds maximum" | Amount > method limit | Check method max limits |
| "Network error" | API unreachable | Check internet connection |

### Error Response Format
```javascript
{
  success: false,
  error: 'Payment processing failed',
  transactionId: 'txn_optional_id'
}
```

---

## Fee Calculation Examples

### Bank Transfer - $100
```
Base: $100
Fee: $100 × 0.5% = $0.50
Total: $100.50
```

### Credit Card - $500
```
Base: $500
Fee: ($500 × 2.9%) + $0.30 = $14.80
Total: $514.80
```

### Crypto - $250
```
Base: $250
Fee: $250 × 1% = $2.50
Total: $252.50
```

### PayPal - $1000
```
Base: $1000
Fee: ($1000 × 2.2%) + $0.30 = $22.30
Total: $1022.30
```

---

## Security Features

### 1. **Webhook Signature Verification**
```javascript
// In payhero-integration.js
verifyWebhookSignature(webhookData) {
  // HMAC SHA256 verification with PayHero secret
  // Prevents unauthorized webhook calls
}
```

### 2. **Request ID Generation**
```javascript
generateRequestId() {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
```

### 3. **Authorization Headers**
All API calls include:
- `Authorization: Bearer {PUBLIC_KEY}`
- `X-API-Key: {SECRET_KEY}`
- `X-Request-ID: {unique_id}`
- `X-Timestamp: {ISO_timestamp}`

### 4. **HTTPS Only**
- All API endpoints use HTTPS
- Webhook receiver must use HTTPS

---

## Testing Checklist

- [ ] PayHero credentials configured
- [ ] Webhook URL accessible
- [ ] Bank Transfer payment method works
- [ ] Credit Card payment method works
- [ ] Crypto payment method works
- [ ] PayPal payment method works
- [ ] Fee calculations accurate
- [ ] Balance updates on success
- [ ] Transaction records created
- [ ] Marketer balances update
- [ ] Error handling works
- [ ] Form validation works

---

## Production Deployment

### Pre-Deployment Checklist

1. **Update Credentials**
   - Replace all sandbox keys with live keys
   - Update WEBHOOK_URL to production domain

2. **Enable HTTPS**
   - All endpoints must use HTTPS
   - Valid SSL certificate required

3. **Set Webhook Secret**
   - Configure webhook signature verification
   - Store secret securely

4. **Test Transactions**
   - Execute test deposits on all payment methods
   - Verify balance updates
   - Check transaction records

5. **Monitor Integration**
   - Log all API calls
   - Monitor webhook delivery
   - Track failed payments

6. **Customer Support**
   - Document payment methods
   - Provide troubleshooting guide
   - Support contact info

---

## Support & Resources

- **PayHero Documentation:** https://docs.payhero.io
- **API Reference:** https://api.payhero.io/docs
- **Webhook Events:** https://docs.payhero.io/webhooks
- **Test Cards:** https://docs.payhero.io/testing

---

## Maintenance Notes

### Regular Tasks
- Monitor webhook delivery rates
- Review failed payment logs
- Update fee schedules if changed
- Test payment methods monthly

### Performance Optimization
- Cache method fee info (15 min TTL)
- Batch webhook processing
- Implement transaction retry logic
- Rate limit API calls (100 req/min)

---

**Version:** 1.0  
**Last Updated:** December 2024  
**Maintained By:** PreoCrypto Dev Team
