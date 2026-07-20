#!/bin/bash
BRANCH="${1:-}"
cd /home/tom/dev-projects/tipi || exit 1

if [ -n "$BRANCH" ]; then
  git fetch
  git checkout "feature/$BRANCH" 2>/dev/null || git checkout "$BRANCH"
fi

# Direct via firewall restreint à l'IP de Tom (plus de tunnel ngrok)
REACT_NATIVE_PACKAGER_HOSTNAME=76.13.53.76 npx expo start
