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
They use the committed `android/app/somna-debug.keystore` so local and CI builds
can update each other. This public test key uses alias `androiddebugkey` and
passwords `android`; never use it to sign a production release. An APK installed
with a different debug key must be uninstalled before the first update.

The native window deliberately fits inside the system bars on SDK 34 rather
than drawing underneath them. Both bars are dark with light icons; CSS safe-area
insets can therefore be zero without hiding content. The app fills the available
viewport on native devices, including landscape and tablets.

To run on an emulator or a USB device with debugging enabled:

```sh
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

## App icon

`public/app-icon.svg` is the editable source for the moon, star, and tide mark.
After editing its paths or gradients, regenerate the Android vectors, legacy
launcher PNGs, favicon fallbacks, and Apple touch icon:

```sh
python -m pip install CairoSVG==2.8.2 Pillow==12.0.0
python scripts/generate_icons.py
```

Python is only needed to update the artwork, not for web or Android builds.
The native foreground is transparent and fits the central 66dp adaptive-icon
safe circle. API 26+ uses separate foreground/background layers; API 33+ also
provides a monochrome mark for launchers with themed icons enabled. Older
devices use the density-specific square/round PNGs. The web links use Vite's
base URL so favicons also work under the GitHub Pages project path.
