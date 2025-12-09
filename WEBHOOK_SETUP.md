## PayHero Webhook URL Configuration Guide

### 🔗 Finding Your Callback URL

Your callback URL depends on where your backend server is hosted. Here are the different scenarios:

---

## Option 1: Local Development (Testing)

If you're testing locally, you need to expose your local server to the internet using a tunneling service.

### Using ngrok (Recommended for Testing)

1. **Download ngrok**: https://ngrok.com/download

2. **Extract and run**:
   ```bash
   ngrok http 3001
   ```

3. **Copy the public URL** you get (looks like: `https://abc123def456.ngrok.io`)

4. **Your Callback URL**:
   ```
   https://abc123def456.ngrok.io/webhook/payhero
   ```

5. **Update in payhero-integration.js**:
   ```javascript
   WEBHOOK_URL: 'https://abc123def456.ngrok.io/webhook/payhero'
   ```

---

## Option 2: Cloud Hosting

### Heroku

1. **Deploy your backend** (webhook-handler.js) to Heroku
2. **Your app URL**: `https://your-app-name.herokuapp.com`
3. **Your Callback URL**:
   ```
   https://your-app-name.herokuapp.com/webhook/payhero
   ```

### AWS (Lambda + API Gateway)

1. Create API Gateway endpoint
2. **Your Callback URL**:
   ```
   https://your-api-id.execute-api.us-east-1.amazonaws.com/prod/webhook/payhero
   ```

### Google Cloud (Cloud Functions)

1. Deploy webhook handler as Cloud Function
2. **Your Callback URL**:
   ```
   https://us-central1-your-project.cloudfunctions.net/webhook-payhero
   ```

### Azure

1. Deploy as Azure Function
2. **Your Callback URL**:
   ```
   https://your-function-app.azurewebsites.net/api/webhook-payhero
   ```

### DigitalOcean/Linode/VPS

If you have your own server:
```
https://your-domain.com/webhook/payhero
```

---

## Option 3: Your Own Server

If you're using your own domain:

```
https://preocrypto.yourdomain.com/webhook/payhero
```

**Or if running on different port**:
```
https://preocrypto.yourdomain.com:3001/webhook/payhero
```

---

## 📝 Steps to Configure in PayHero Dashboard

1. **Log in to PayHero Dashboard**: https://dashboard.payhero.io

2. **Go to Settings** → **Webhooks** (or **API Settings**)

3. **Add Webhook Endpoint**:
   - **Endpoint URL**: (Your callback URL from above)
   - **Events**: Select all payment events:
     - ✅ payment.completed
     - ✅ payment.failed
     - ✅ payment.pending
     - ✅ payment.cancelled

4. **Save Webhook**

5. **Test Webhook** (PayHero should provide a test button)

---

## 🔐 Security Checklist

Before going to production:

- [ ] Verify HTTPS is enabled (not HTTP)
- [ ] Update `PAYHERO_SECRET_KEY` in webhook-handler.js
- [ ] Enable webhook signature verification
- [ ] Test payment flow end-to-end
- [ ] Confirm database updates on payment
- [ ] Test error handling
- [ ] Set up error notifications/alerts
- [ ] Configure email confirmations

---

## 🚀 Quick Start - Deploy to Heroku

```bash
# 1. Install Heroku CLI
# Download from: https://devcenter.heroku.com/articles/heroku-cli

# 2. Login
heroku login

# 3. Create app
heroku create your-payhero-app

# 4. Push code
git push heroku main

# 5. View logs
heroku logs --tail

# Your callback URL:
# https://your-payhero-app.herokuapp.com/webhook/payhero
```

---

## 🧪 Testing Your Webhook

### Test Endpoint Health
```bash
curl https://your-callback-url/health
```

Expected response:
```json
{"status":"ok","service":"payhero-webhook"}
```

### Simulate Payment Callback
```bash
curl -X POST https://your-callback-url/webhook/payhero \
  -H "Content-Type: application/json" \
  -d '{
    "event_type": "payment.completed",
    "data": {
      "id": "pay_test_12345",
      "amount": 103.20,
      "status": "completed",
      "payment_method": "credit_card",
      "metadata": {
        "user_id": "user123",
        "user_email": "test@example.com",
        "user_name": "Test User",
        "method_type": "credit_card",
        "original_amount": 100,
        "fee": 3.20
      }
    }
  }'
```

---

## 🔗 Integration Steps

1. **Deploy webhook-handler.js** to your chosen hosting (Heroku, AWS, etc.)
2. **Get public URL** from hosting provider
3. **Update callback URL** in PayHero Dashboard
4. **Update WEBHOOK_URL** in `payhero-integration.js`:
   ```javascript
   WEBHOOK_URL: 'https://your-callback-url/webhook/payhero'
   ```
5. **Test payment flow** end-to-end
6. **Monitor logs** for successful callbacks

---

## 📊 Webhook Event Flow

```
User initiates deposit
         ↓
deposit-app.js calls PayHero API
         ↓
User completes payment
         ↓
PayHero sends webhook to your callback URL
         ↓
webhook-handler.js receives event
         ↓
Verify webhook signature
         ↓
Process event (update database, send emails)
         ↓
Return 200 OK to PayHero
         ↓
Payment recorded in your system
         ↓
User sees confirmation in app
```

---

## 🛠️ Troubleshooting

### Webhook not receiving events?
1. Verify URL is publicly accessible
2. Check firewall/security groups allow traffic
3. Confirm HTTPS certificate is valid
4. Check PayHero logs for errors

### Signature verification failing?
1. Confirm `PAYHERO_SECRET_KEY` matches PayHero account
2. Verify payload hasn't been modified
3. Check PayHero documentation for signature format

### Database not updating?
1. Add console.log statements in event handlers
2. Check database connection
3. Verify transaction queries work
4. Check user lookup logic

### Email not sending?
1. Configure email service (SendGrid, AWS SES, etc.)
2. Test email function separately
3. Check spam folder
4. Verify email addresses are correct

---

## 📚 Resources

- **PayHero API Docs**: https://docs.payhero.io
- **Webhook Events**: https://docs.payhero.io/webhooks
- **Security Best Practices**: https://docs.payhero.io/security
- **ngrok Documentation**: https://ngrok.com/docs
- **Heroku Deployment**: https://devcenter.heroku.com/

---

## Example Callback URLs by Platform

| Platform | Example URL |
|----------|------------|
| **ngrok** | `https://abc123.ngrok.io/webhook/payhero` |
| **Heroku** | `https://my-app.herokuapp.com/webhook/payhero` |
| **AWS** | `https://api-id.execute-api.region.amazonaws.com/webhook` |
| **Custom Domain** | `https://api.yourdomain.com/webhook/payhero` |
| **Localhost:3001** | `http://localhost:3001/webhook/payhero` (local only) |

---

**Next Step**: Deploy webhook-handler.js, get your callback URL, and update PayHero settings! 🚀
