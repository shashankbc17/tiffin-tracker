# 🍱 TiffinFlow - Daily Meal & Carry-Over Tracker

**TiffinFlow** is an iOS-style Progressive Web App (PWA) tailored for tracking daily breakfast and lunch subscriptions from your cook or tiffin service provider.

It solves the age-old problem: **when the cook takes leave or you skip a meal, the package automatically carries over**, extending the validity of your subscription and keeping a penny-perfect accounting of every meal served.

---

## ✨ Key Features

1. **Automatic Carry-Over Engine**:
   - Subscribe for $N$ days (e.g. 30 days).
   - If a day or meal is skipped or the cook goes on holiday, the system **automatically carries over the credit** and dynamically pushes out the expiry date (`Original Date → Extended Date`).
   - Live badge: `+X Days Carried Over!`.

2. **Per-Person & Meal Rate Calculations**:
   - Separate customizable rates for **Breakfast** and **Lunch**.
   - Adjustable **Persons count** (for roommates, partners, or extra guests).
   - Automatic live calculation of total amount spent, carry-over value saved, and remaining days.

3. **Cupertino iOS Mobile Experience**:
   - Designed to look and feel like an iOS 18 native app with glassmorphism, Cupertino segmented controls, safe-area notches, and tactile animations.
   - Interactive **Calendar View** with amber 🍳, green 🍱, violet ⏭️, and red 🏖️ status indicators.
   - Tap any date to retroactively log meals or pre-schedule leaves.

4. **1-Tap WhatsApp Statement Generator**:
   - Generates a pre-formatted, polite invoice/statement ready to send directly to your cook on WhatsApp with exact counts and total balance due.

5. **Cloud Sync + Offline Capability**:
   - Google Sign-In with Cloud Firestore persistence.
   - Works 100% offline out-of-the-box with immediate LocalStorage caching and sample demo data.

---

## 📱 How to Run on Your iPhone (No Mac Needed!)

Because TiffinFlow is a Progressive Web App (PWA), you do not need Xcode, a Mac, or sideloading certificates:

### Method 1: Host on GitHub Pages (Recommended)
1. Push this repository to GitHub.
2. In your repo settings, go to **Settings → Pages** and choose **GitHub Actions** as the source.
3. Once deployed, open the live link (`https://<your-username>.github.io/tiffin-tracker/`) in **Safari on your iPhone**.
4. Tap the **Share** button (box with an upward arrow) $\rightarrow$ scroll down and tap **"Add to Home Screen"**.
5. The TiffinFlow app icon will appear directly on your iPhone home screen!

### Method 2: Test Locally Over Home Wi-Fi
1. On your Windows PC, run:
   ```bash
   npm run dev
   ```
2. Check your Windows local IP (e.g. `192.168.1.5`):
   ```bash
   ipconfig
   ```
3. On your iPhone connected to the same Wi-Fi, open Safari and navigate to:
   ```
   http://192.168.x.x:5173
   ```

---

## 🛠️ Local Development (Windows)

```bash
# Install dependencies
npm install

# Start local dev server
npm run dev

# Production build
npm run build
```

---

## ☁️ Setting up Firebase & Google Sign-In (Optional)

1. Go to [Firebase Console](https://console.firebase.google.com/) and create a free project.
2. Enable **Authentication** $\rightarrow$ **Sign-in method** $\rightarrow$ **Google**.
3. Under **Authorized domains**, add your GitHub Pages domain (`<username>.github.io`) and `localhost`.
4. Enable **Cloud Firestore** in test/production mode with rule:
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /users/{userId}/{document=**} {
         allow read, write: if request.auth != null && request.auth.uid == userId;
       }
     }
   }
   ```
5. Paste your Firebase web config keys into `src/services/firebase.ts` or directly through the in-app Settings screen.
