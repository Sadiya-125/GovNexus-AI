-- Create UserProfile table for voice authentication
CREATE TABLE IF NOT EXISTS "UserProfile" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "phoneNumber" TEXT NOT NULL UNIQUE,
  "companyName" TEXT NOT NULL,
  "userType" TEXT NOT NULL DEFAULT 'agency',
  "preferredLanguage" TEXT NOT NULL DEFAULT 'en',
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create index for phone number lookup
CREATE UNIQUE INDEX IF NOT EXISTS "UserProfile_phoneNumber_key" ON "UserProfile"("phoneNumber");
CREATE INDEX IF NOT EXISTS "UserProfile_userId_idx" ON "UserProfile"("userId");

-- Sample data (replace with your actual user)
-- INSERT INTO "UserProfile" ("id", "userId", "phoneNumber", "companyName", "userType", "preferredLanguage")
-- VALUES ('test-profile-1', 'test-user-1', '+919876543210', 'Test Organization', 'agency', 'en');
