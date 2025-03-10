#!/bin/bash

# Script to build a development client for Android

echo "🚀 Building development client for Android..."

# Install required dependencies
echo "📦 Installing dependencies..."
npm install

# Install expo-dev-client if not already installed
if ! grep -q "expo-dev-client" package.json; then
  echo "📱 Installing expo-dev-client..."
  npx expo install expo-dev-client
fi

# Install expo-build-properties if not already installed
if ! grep -q "expo-build-properties" package.json; then
  echo "🏗️ Installing expo-build-properties..."
  npx expo install expo-build-properties
fi

# Create development build
echo "🔨 Creating development build for Android..."
npx eas build --platform android --profile development --local

echo "✅ Development build completed!"
echo "📱 You can now install the APK on your device and use Google Sign-In."
echo "📝 Instructions:"
echo "1. Install the APK on your Android device"
echo "2. Start the development server with: npx expo start --dev-client"
echo "3. Open the app on your device and connect to the development server" 