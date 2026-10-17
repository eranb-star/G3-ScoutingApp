# Android 2.6.1 — smaller bundled release

Signed APK: `releases/G3-Team-Hub-2.6.1.apk`, version 2.6.1/code 30, 18,313,326 bytes (18.31 MB / 17.47 MiB). Previous APK: 70,261,756 bytes. Reduction: 73.94%.

Includes the latest operational corrections and UI changes through website release 4396134, plus Android-only model routing. Website production is not changed by this APK release.

## Asset contract

- Bundled: 2026 optimized field, optimized KitBot, four small Studio component models, supporting images/configuration/licenses, and the application interface.
- Automatically fetched when selected: older season fields, Darwin models, and the full KitBot source used for catalogue extraction. Limestone already uses its pinned upstream host; this release does not change that source.
- Public optional assets use https://g3-6740.com with existing SHA-256 checks at each consumer. The version-specific Vercel hostname is unsuitable because it requires SSO. Preserve old asset paths/content for installed APK compatibility; changing these assets requires versioned paths and a new manifest rather than overwriting them.
- Existing field/robot loading/error/retry behavior remains. Catalogue loading now also reuses the checksum-verified bounded model cache.
- Optional cache is limited to 80 MiB and is evictable. It is NOT a guaranteed persistent offline download library. Explicit keep-offline/storage-management UI remains future work; do not label cached optional models as guaranteed offline. The bundled current field/KitBot require no model download.
- Bundled models do not make live attendance, purchasing, authentication, Onshape or AI operations offline-capable.

## Build and verification

1. `npm run build:android` (TypeScript, Vite Android mode, trim generated assets, focused routing/package test).
2. `node scripts/test-android-assets.mjs --remote` verifies hosted copies and CORS against all 13 excluded local source files.
3. Capacitor `copy android`; existing native dependencies unchanged.
4. Java 21: `C:/Users/user/.jdks/jbr-21.0.11`. Android Studio JBR is Java 25 and cannot run this Gradle wrapper. `gradlew.bat assembleRelease lintRelease --no-daemon` passed.
5. Signature verification passed; certificate SHA-256 `45675cd568ffd23d78afd54eae2e7a71d5988819809e95c650d5c27102eba580` matches the previous APK. Package `com.g3.scouting`, minimum API24, target API36.
6. All 115 packaged web assets match the final generated dist byte-for-byte. Exactly six GLBs remain: two practice models and four small components. Both practice models are self-contained (no external buffer/image dependencies).

Checksum and R8 mapping are beside the APK. Existing Vite large-chunk, SDK XML, flatDir and Gradle deprecation warnings remain. No Android device was attached: installation, real-device graphics performance and push receipt are not claimed. Install over the existing app without uninstalling to preserve local data.

The broader FRC catalogue expansion remains open; packaging changes do not add missing catalogue parts.
