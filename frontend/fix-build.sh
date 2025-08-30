#!/bin/bash

echo "🔧 Fixing Frontend Build Issues"
echo "================================"

# Remove node_modules and package-lock.json
echo "Cleaning dependencies..."
rm -rf node_modules package-lock.json .next

# Install dependencies
echo "Installing dependencies..."
npm install

# Run type check
echo "Running type check..."
npm run type-check

# Try building
echo "Building application..."
npm run build

echo "✅ Build fix complete!"