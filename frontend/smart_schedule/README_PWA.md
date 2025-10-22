# Smart Schedule PWA

A Flutter Progressive Web App (PWA) that detects and displays the platform context (Web, Android PWA, or iOS PWA).

## Features

- **Platform Detection**: Automatically detects whether the app is running:
  - In a web browser
  - As an installed PWA on Android
  - As an installed PWA on iOS
- **Cupertino UI**: Uses only Cupertino widgets for a native iOS-like experience
- **PWA Ready**: Fully configured for installation on mobile devices
- **Service Worker**: Includes basic caching for offline functionality

## How to Build and Run

### Build for Web
```bash
flutter build web
```

### Serve Locally
```bash
# Using Python (if available)
cd build/web
python -m http.server 8000

# Or using Node.js http-server
npx http-server build/web -p 8000
```

### Test PWA Installation

1. **On Android Chrome**:
   - Open the app in Chrome
   - Look for the "Add to Home Screen" banner or menu option
   - Tap "Add" to install as PWA

2. **On iOS Safari**:
   - Open the app in Safari
   - Tap the Share button
   - Select "Add to Home Screen"
   - Tap "Add" to install as PWA

## Platform Detection Logic

The app uses the following detection methods:

1. **Web Detection**: Uses `kIsWeb` to detect if running on web
2. **PWA Detection**: Uses `window.matchMedia('(display-mode: standalone)')` to detect standalone mode
3. **Platform Detection**: Uses `navigator.userAgent` to distinguish between iOS and Android

## File Structure

- `lib/main.dart` - Main Flutter app with platform detection
- `web/manifest.json` - PWA manifest configuration
- `web/index.html` - HTML entry point with PWA meta tags
- `web/sw.js` - Service worker for offline functionality

## Customization

To customize the app:

1. **Change App Name**: Update `name` and `short_name` in `web/manifest.json`
2. **Change Colors**: Update `theme_color` and `background_color` in `web/manifest.json`
3. **Add Icons**: Replace icon files in `web/icons/` directory
4. **Modify UI**: Edit the `MyHomePage` widget in `lib/main.dart`

## Browser Support

- Chrome/Edge (Android & Desktop)
- Safari (iOS & macOS)
- Firefox (with limited PWA support)
- Samsung Internet (Android)
