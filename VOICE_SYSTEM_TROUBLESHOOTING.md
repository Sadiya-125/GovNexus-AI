# Voice System Troubleshooting Guide

## Quick Diagnostics

### 1. Check Redis Connection
Visit: `http://localhost:3000/api/voice/health`

Expected response:
```json
{
  "status": "healthy",
  "redis": {
    "status": "✓ Connected",
    "sessionId": "...",
    "ttl": 3600
  }
}
```

If you see "✗ Connection failed", check:
- [ ] `UPSTASH_REDIS_REST_URL` is set in `.env`
- [ ] `UPSTASH_REDIS_REST_TOKEN` is set in `.env`
- [ ] Values don't have extra quotes or whitespace
- [ ] Upstash Redis instance is active (check https://console.upstash.com)

### Known Issue Fixed: JSON Parsing Error (v1.1)

**Error You Would See**: `Failed to retrieve session: "[object Object]" is not valid JSON`

**Root Cause**: Upstash Redis REST API returns data in different formats (sometimes already parsed JSON objects instead of strings)

**Fix Applied**: Updated `lib/voice/session.ts` getSession() method to handle both formats:
```typescript
// Now handles both string and object responses:
if (typeof data === "string") {
  session = JSON.parse(data);  // Parse if string
} else if (typeof data === "object") {
  session = data;  // Use directly if already object
}
```

**Status**: ✅ FIXED in this build - Ensure you run `npm run build` to apply the fix

### 2. Environment Variables Required

```
UPSTASH_REDIS_REST_URL=https://your-instance.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_token_here
REDIS_SESSION_TTL=3600  # Optional, defaults to 1 hour
```

### 3. Verify Twilio Configuration

1. Go to https://www.twilio.com/console/phone-numbers/incoming
2. Find your phone number
3. Under "A Call Comes In", verify the webhook URL points to:
   - Production: `https://yourdomain.com/api/voice/incoming`
   - Development: Use ngrok or tunnel service
4. Make sure "POST" method is selected
5. Click "Save"

### 4. Voice Flow Endpoints

The voice system uses these endpoints in sequence:

1. **Incoming Call Handler** → `/api/voice/incoming`
   - Creates session, asks for language

2. **Language Selection** → `/api/voice/select-language`
   - Updates session with language, asks for phone

3. **Phone Collection** → `/api/voice/collect-phone`
   - Accepts DTMF or speech input

4. **Phone Confirmation** → `/api/voice/confirm-phone`
   - Confirms the phone number

5. **User Lookup** → `/api/voice/lookup-user`
   - Finds users by phone number

6. **User Selection** (if multiple) → `/api/voice/select-user`
   - Lets caller select which account to use

7. **Voice Processing** → `/api/voice/process`
   - Handles voice commands via Sarvam AI

### 5. Testing the Voice System

#### Option A: Using Twilio Console
1. Go to https://www.twilio.com/console/phone-numbers/incoming
2. Click on your number
3. Click "Make a Test Call" button
4. Wait for the call to connect
5. You should hear: "Welcome to GovNexus AI. Please select your language..."

#### Option B: Using ngrok for Local Testing
```bash
# In a new terminal, run:
ngrok http 3000

# Copy the https URL (e.g., https://1234-56-789-10.ngrok.io)

# Update Twilio webhook to:
# https://1234-56-789-10.ngrok.io/api/voice/incoming

# Call your Twilio number
```

#### Option C: Manual Testing with curl
```bash
curl -X POST http://localhost:3000/api/voice/incoming \
  -d "CallSid=CA0000000000000000000000000000001" \
  -d "From=%2B919876543210"
```

### 6. Monitoring Logs

Check Next.js server logs for messages like:
```
[Voice] Incoming call: CA0000000000...
[Voice] Session created: 12345-67890-...
[Voice] Language selected: en
[Voice] Phone collected: +919876543210
[Voice] Found 1 user(s) for phone: +919876543210
```

If you see errors like:
```
[Voice] Failed to create session - Redis error: ...
```

Then the Redis connection is the issue.

### 7. Database Seeding Check

Verify seed data was created:
```bash
npx prisma studio

# Then check:
# - Product table: Should have ~100 products
# - Order table: Should have ~500 orders
# - UserProfile table: Should have test users with phone numbers
```

### 8. Common Issues

| Issue | Solution |
|-------|----------|
| Blank graph on dashboard | Extended to 12 months - refresh page |
| Chatbot returns 1 grocery | Fixed - now returns all matching category |
| "Voice call gives no response" | Check health endpoint, verify Redis, check Twilio webhook |
| Redis connection timeout | Verify Upstash URL and token, check network |
| Session not found after phone collection | Check Redis TTL (default 3600s = 1 hour) |
| User not found after phone lookup | Verify UserProfile has phoneNumber field populated |

### 9. Next Steps If Still Not Working

1. **Enable Debug Logging**
   ```bash
   # In terminal
   DEBUG=* npm run dev
   ```

2. **Check Twilio Logs**
   - Go to https://www.twilio.com/console/voice-logs
   - Look for errors or warnings on your test calls

3. **Verify Network Access**
   - Make sure Twilio can reach your webhook URL
   - Test with curl from terminal to verify endpoint works

4. **Check Session Persistence**
   - Visit `/api/voice/health` to verify Redis is working
   - All session data is stored in Redis, not database

---

## For Developers

### Adding New Voice Features

1. Create new endpoint in `app/api/voice/[feature]/route.ts`
2. Use `sessionManager.getSession()` to retrieve user's session
3. Use `sessionManager.updateSession()` to persist changes
4. Return TwiML XML response (not JSON)
5. Add endpoint URL to the voice flow in the previous endpoint's `gather` action

### Session Data Structure

```typescript
interface VoiceSession {
  sessionId: string;
  userIds: string[];           // All users with this phone
  selectedUserId?: string;     // Active user for current conversation
  companyNames: string[];
  phoneNumber?: string;
  phoneCollected: boolean;
  userLookupComplete: boolean;
  language: SupportedLanguage; // 'en' | 'hi' | 'te' | 'ta' | 'kn' | 'mr'
  activeIntent: Intent | null;
  pendingAction: PendingAction | null;
  pendingEntity: Record<string, unknown>;
  conversationHistory: ConversationMessage[];
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
}
```

### Testing with Mock Data

Create test users with phone numbers in `prisma/seed.ts`:
```typescript
const testUser = await prisma.userProfile.create({
  data: {
    userId: "test-user-123",
    phoneNumber: "+919876543210",
    companyName: "Test Company",
    userType: "retailer",
  },
});
```

Then call the voice system with that phone number to test.
