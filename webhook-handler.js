// ============================================================================
// PayHero Webhook Handler - Node.js/Express Example
// Place this on your backend server to receive payment callbacks from PayHero
// ============================================================================

// Installation:
// npm install express body-parser crypto

const express = require('express');
const bodyParser = require('body-parser');
const crypto = require('crypto');

const app = express();
app.use(bodyParser.json());

// ============================================================================
// CONFIGURATION - Update these with your PayHero credentials
// ============================================================================

const PAYHERO_SECRET_KEY = 'sk_live_your_secret_key_here'; // From PayHero Dashboard
const WEBHOOK_PORT = 3001;
const WEBHOOK_PATH = '/webhook/payhero';

// ============================================================================
// WEBHOOK HANDLER
// ============================================================================

app.post(WEBHOOK_PATH, (req, res) => {
  try {
    const webhookData = req.body;
    
    // Verify webhook signature (optional but recommended for security)
    if (!verifyWebhookSignature(req, webhookData)) {
      console.warn('⚠️ Invalid webhook signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    console.log('✅ Webhook received:', webhookData.event_type);
    console.log('   Payment ID:', webhookData.data.id);
    console.log('   Amount:', webhookData.data.amount);
    console.log('   Status:', webhookData.data.status);

    // Handle different payment events
    switch(webhookData.event_type) {
      case 'payment.completed':
        handlePaymentCompleted(webhookData);
        break;
      
      case 'payment.failed':
        handlePaymentFailed(webhookData);
        break;
      
      case 'payment.pending':
        handlePaymentPending(webhookData);
        break;
      
      case 'payment.cancelled':
        handlePaymentCancelled(webhookData);
        break;
      
      default:
        console.log('Unknown event:', webhookData.event_type);
    }

    // Always return 200 to acknowledge receipt
    res.status(200).json({ received: true });

  } catch (error) {
    console.error('❌ Webhook error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================================
// WEBHOOK EVENT HANDLERS
// ============================================================================

function handlePaymentCompleted(webhookData) {
  const { data: { id, amount, metadata } } = webhookData;

  console.log('💰 Payment completed!');
  console.log('   User ID:', metadata.user_id);
  console.log('   Email:', metadata.user_email);
  console.log('   Amount:', amount);
  console.log('   Method:', metadata.method_type);

  // TODO: Update your database
  // 1. Find user by email
  // 2. Add amount to their account balance
  // 3. Record transaction as 'completed'
  // 4. Send confirmation email to user
  // 5. Update frontend (optional: send to frontend via WebSocket)

  // Example database update (pseudo-code):
  /*
  const user = await User.findOne({ email: metadata.user_email });
  if (user) {
    user.balance += metadata.original_amount; // Original amount without fees
    user.save();
    
    // Record transaction
    await Transaction.create({
      userId: user._id,
      type: 'deposit',
      amount: metadata.original_amount,
      fee: metadata.fee,
      status: 'completed',
      paymentId: id,
      method: metadata.method_type,
      timestamp: new Date()
    });
    
    // Send email
    sendEmail(metadata.user_email, 'Deposit Confirmed', `Your deposit of $${metadata.original_amount} has been completed.`);
  }
  */
}

function handlePaymentFailed(webhookData) {
  const { data: { id, amount, error_message, metadata } } = webhookData;

  console.log('❌ Payment failed!');
  console.log('   User:', metadata.user_email);
  console.log('   Error:', error_message);
  console.log('   Amount attempted:', amount);

  // TODO: Notify user of failed payment
  /*
  const user = await User.findOne({ email: metadata.user_email });
  if (user) {
    await Transaction.create({
      userId: user._id,
      type: 'deposit_failed',
      amount: metadata.original_amount,
      status: 'failed',
      paymentId: id,
      error: error_message,
      timestamp: new Date()
    });
    
    sendEmail(metadata.user_email, 'Payment Failed', `Your deposit attempt failed. Reason: ${error_message}`);
  }
  */
}

function handlePaymentPending(webhookData) {
  const { data: { id, amount, metadata } } = webhookData;

  console.log('⏳ Payment pending...');
  console.log('   User:', metadata.user_email);
  console.log('   Amount:', amount);

  // TODO: Record as pending
  /*
  const user = await User.findOne({ email: metadata.user_email });
  if (user) {
    await Transaction.create({
      userId: user._id,
      type: 'deposit',
      amount: metadata.original_amount,
      status: 'pending',
      paymentId: id,
      timestamp: new Date()
    });
    
    sendEmail(metadata.user_email, 'Payment Pending', `Your deposit is being processed. We'll confirm shortly.`);
  }
  */
}

function handlePaymentCancelled(webhookData) {
  const { data: { id, metadata } } = webhookData;

  console.log('🚫 Payment cancelled');
  console.log('   User:', metadata.user_email);

  // TODO: Record cancellation
  /*
  const user = await User.findOne({ email: metadata.user_email });
  if (user) {
    await Transaction.create({
      userId: user._id,
      type: 'deposit_cancelled',
      amount: metadata.original_amount,
      status: 'cancelled',
      paymentId: id,
      timestamp: new Date()
    });
  }
  */
}

// ============================================================================
// WEBHOOK SIGNATURE VERIFICATION
// ============================================================================

function verifyWebhookSignature(req, webhookData) {
  // Get signature from PayHero headers
  const signature = req.headers['x-payhero-signature'];
  
  if (!signature) {
    console.warn('No signature in request');
    return false;
  }

  // Recreate signature from payload
  const payload = JSON.stringify(webhookData);
  const expectedSignature = crypto
    .createHmac('sha256', PAYHERO_SECRET_KEY)
    .update(payload)
    .digest('hex');

  // Compare signatures
  const isValid = signature === expectedSignature;
  
  if (!isValid) {
    console.warn('Signature mismatch!');
    console.warn('Expected:', expectedSignature);
    console.warn('Received:', signature);
  }

  return isValid;
}

// ============================================================================
// HEALTH CHECK ENDPOINT
// ============================================================================

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'payhero-webhook' });
});

// ============================================================================
// START SERVER
// ============================================================================

app.listen(WEBHOOK_PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║         PayHero Webhook Server Running                     ║
╠════════════════════════════════════════════════════════════╣
║ Port: ${WEBHOOK_PORT}                                              ║
║ Endpoint: http://localhost:${WEBHOOK_PORT}${WEBHOOK_PATH}         ║
║                                                            ║
║ Your Callback URL for PayHero Dashboard:                 ║
║ https://your-domain.com:${WEBHOOK_PORT}${WEBHOOK_PATH}           ║
╚════════════════════════════════════════════════════════════╝
  `);
});

module.exports = app;
