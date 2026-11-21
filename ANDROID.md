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

`public/app-icon.png` is the user's cloud-and-black-sparkle artwork, with its
baked-in outer checkerboard removed. Its corners extend to a square so each
platform can apply its own mask. After editing it, regenerate the Android
launcher PNGs, themed icon, favicon fallbacks, and Apple touch icon:

```sh
python -m pip install Pillow==12.0.0
python scripts/generate_icons.py
```

Python is only needed to update the artwork, not for web or Android builds.
API 26+ uses the supplied artwork as a flat adaptive background with a
transparent foreground (no artificial parallax). The symbol fits Android's
central safe area; edge pixels extend beyond the nominal 72dp viewport to
cover launcher masks. API 33+ also provides the isolated monochrome symbol for
launchers with themed icons enabled. Older devices use the density-specific
square/round PNGs. Vite rewrites the web icon links for its configured base,
including the GitHub Pages project path.
