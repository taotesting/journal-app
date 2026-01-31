# iOS App Setup

## Prerequisites
1. Apple Developer Account ($99/year)
2. Xcode installed

## Setup Steps

### 1. Open in Xcode
```bash
cd ios/App
open App.xcodeproj
```

### 2. Configure Signing
- Select the project in the navigator
- Under "Signing & Capabilities", select your team
- Update the bundle identifier if needed

### 3. Build and Run
- Press Cmd+R in Xcode to build and run on simulator or device

## Notes
- The app currently redirects to your Vercel URL
- For offline support, you'd need to configure a service worker
- To publish to TestFlight/App Store, you'll need to configure distribution certificates

## Updating
After making web changes:
```bash
npm run build
cap sync ios
```
Then rebuild in Xcode.
