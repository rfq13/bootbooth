#!/bin/bash

echo "🚀 Starting Photo Booth Server (C++)..."
echo "=========================================="

# Check if required directories exist
mkdir -p uploads
mkdir -p previews
mkdir -p data
mkdir -p bin
mkdir -p obj

echo "📁 Directory structure verified"

# Build the server
echo "🔨 Building server..."
make clean
make

if [ $? -ne 0 ]; then
    echo "❌ Build failed!"
    exit 1
fi

echo "✅ Build completed successfully"

# Check if binary exists
if [ ! -f "./bin/photobooth-server" ]; then
    echo "❌ Server binary not found!"
    exit 1
fi

echo "🚀 Starting server..."
echo "📡 MJPEG Server will run on port 3003"
echo "🌐 Server running in standalone mode"
echo "📝 Logs will appear below:"
echo ""

# Run the server
./bin/photobooth-server