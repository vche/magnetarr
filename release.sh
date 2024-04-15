#!/usr/bin/env bash
version=$(cat package.json |jq -r '.version')
echo "--> Updating version to $version"

echo "--> Building packages"
npm run release
if [ $? -ne 0 ]; then 
  echo "The command failed with exit status $?" 
  exit 1 
fi

echo "--> Pushing commit"
igit up -m "Update release to $version"
if [ $? -ne 0 ]; then 
  echo "The command failed with exit status $?" 
  exit 1 
fi

echo "--> Generating github release v$version"
gh release create v$version --generate-notes
if [ $? -ne 0 ]; then 
  echo "The command failed with exit status $?" 
  exit 1 
fi
