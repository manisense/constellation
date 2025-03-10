#!/bin/bash

# Exit on error
set -e

echo "Cleaning up previous builds..."
rm -rf android/app/build

echo "Updating Kotlin version in build.gradle..."
sed -i '' 's/kotlinVersion = .*/kotlinVersion = "1.9.22"/' android/build.gradle

echo "Updating Gradle properties..."
cat > android/gradle.properties << EOL
# Project-wide Gradle settings.
org.gradle.jvmargs=-Xmx4096m -XX:MaxMetaspaceSize=1024m
org.gradle.parallel=true
org.gradle.configureondemand=true
org.gradle.daemon=true
android.useAndroidX=true
android.enableJetifier=true
android.enablePngCrunchInReleaseBuilds=true
reactNativeArchitectures=armeabi-v7a,arm64-v8a,x86,x86_64
newArchEnabled=false
hermesEnabled=true
expo.gif.enabled=true
expo.webp.enabled=true
expo.webp.animated=false
EX_DEV_CLIENT_NETWORK_INSPECTOR=true
expo.useLegacyPackaging=false
kotlin.code.style=official
EOL

echo "Building Android APK..."
cd android && ./gradlew assembleDebug --warning-mode all

echo "Build completed. APK location: android/app/build/outputs/apk/debug/app-debug.apk" 