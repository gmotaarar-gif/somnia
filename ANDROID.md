# Android

Somna uses Capacitor 6, Java 17, and Android SDK 34 (build-tools 34.0.0).
Install Node 24, then `npm ci`. Set `ANDROID_HOME` to your SDK directory.

```sh
npm run android:sync  # build web assets and sync native project
npm run android:apk   # sync and assemble debug APK
```

APK: `android/app/build/outputs/apk/debug/app-debug.apk`.
The Android workflow also uploads this as `somna-debug-apk` on PRs and main pushes.
Debug APKs are for testing, not Play Store release signing.

The native window deliberately fits inside the system bars on SDK 34 rather
than drawing underneath them. Both bars are dark with light icons; CSS safe-area
insets can therefore be zero without hiding content. The app fills the available
viewport on native devices, including landscape and tablets.

To run on an emulator or a USB device with debugging enabled:

```sh
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```
