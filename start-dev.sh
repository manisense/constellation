#!/bin/bash
cd /Users/manish/Downloads/Projects/Constellation
export NODE_OPTIONS=--openssl-legacy-provider
export EXPO_DEVTOOLS_LISTEN_ADDRESS=0.0.0.0
export REACT_NATIVE_PACKAGER_HOSTNAME=11.4.0.105
npx --no-install expo start --dev-client --clear 