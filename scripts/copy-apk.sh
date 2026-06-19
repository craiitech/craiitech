#!/usr/bin/env bash
set -e

APK_SRC="android/app/build/outputs/apk/debug/app-debug.apk"
APK_DEST="public/downloads/rsu-eoms-portal.apk"

if [ ! -f "$APK_SRC" ]; then
  echo "APK not found at $APK_SRC. Run ./gradlew assembleDebug first."
  exit 1
fi

cp "$APK_SRC" "$APK_DEST"
echo "Copied APK to $APK_DEST ($(du -h "$APK_DEST" | cut -f1))"
