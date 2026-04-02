# Security Model

## Firebase Client Config (NOT a secret)

The Firebase configuration in `src/environments/environment.ts` contains **public client-side identifiers**, not secrets. This is by design — the Firebase JS SDK requires these values to be in the client bundle. Google's documentation confirms these are safe to expose publicly.

**Security is NOT provided by hiding these keys.** It is provided by:

### 1. Firestore Security Rules
All collections require `request.auth != null`. No unauthenticated access is possible. Rules are defined in `firestore.rules`.

### 2. Firebase Authentication
Only Google sign-in is enabled. Users must authenticate before accessing any data.

### 3. API Key Restrictions (manual setup)
In Google Cloud Console, restrict the API key to your deployed domain:
- Go to: APIs & Services > Credentials > Browser key
- Add HTTP referrer restriction: `<your-username>.github.io/*`
- This prevents the key from being used on unauthorized domains

### 4. Auth Domain Whitelist
In Firebase Console > Authentication > Settings > Authorized domains:
- Add your GitHub Pages domain: `<your-username>.github.io`

## What could someone do with the exposed Firebase config?

With just the config and no auth: **nothing**. Firestore rules block all unauthenticated reads and writes. They cannot read your data, write data, or access storage.

With the config + their own Google account: They could sign in (creating their own user) but would only be able to access their own data, governed by security rules.

## Recommendations for Production

1. Restrict the API key to your domain (see above)
2. Tighten Firestore rules to check `request.auth.uid == resource.data.userId` per collection
3. Enable App Check for additional protection against abuse
4. Move AI API calls to Cloud Functions (keeps AI provider keys server-side)
