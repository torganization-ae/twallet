#!/usr/bin/env bash

set -e

VERSION=$(node -p "require('./package.json').version")

printf '%s' "$VERSION" > public/version.txt

git add public/version.txt
git commit --amend --no-verify --no-edit public/version.txt
