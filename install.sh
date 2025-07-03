#!/bin/bash

# Security Research Helper (Srh) Installation Script

echo "🛡️  Security Research Helper (Srh) Installation"
echo "=============================================="
echo

# Check if Python 3 is available
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is required but not installed. Please install Python 3.7 or higher."
    exit 1
fi

# Check Python version
PYTHON_VERSION=$(python3 -c 'import sys; print(".".join(map(str, sys.version_info[:2])))')
REQUIRED_VERSION="3.7"

if ! python3 -c "import sys; exit(0 if sys.version_info >= (3, 7) else 1)"; then
    echo "❌ Python 3.7 or higher is required. Current version: $PYTHON_VERSION"
    exit 1
fi

echo "✅ Python $PYTHON_VERSION detected"

# Check if pip is available
if ! command -v pip3 &> /dev/null; then
    echo "❌ pip3 is required but not installed. Please install pip for Python 3."
    exit 1
fi

echo "✅ pip3 available"

# Install Python dependencies
echo
echo "📦 Installing Python dependencies..."
if pip3 install -r requirements.txt; then
    echo "✅ Dependencies installed successfully"
else
    echo "❌ Failed to install dependencies"
    exit 1
fi

# Make main script executable
echo
echo "🔧 Setting up executable permissions..."
chmod +x main.py
echo "✅ Executable permissions set"

# Create reports directory
echo
echo "📁 Creating reports directory..."
mkdir -p reports
echo "✅ Reports directory created"

# Test basic functionality
echo
echo "🧪 Testing basic functionality..."
if python3 main.py --help &> /dev/null; then
    echo "✅ Basic functionality test passed"
else
    echo "❌ Basic functionality test failed"
    exit 1
fi

echo
echo "🎉 Installation completed successfully!"
echo
echo "Usage:"
echo "  python3 main.py info          # Show available modules"
echo "  python3 main.py --help        # Show help"
echo "  ./main.py info                 # Direct execution"
echo
echo "Examples:"
echo "  python3 main.py network -t 127.0.0.1"
echo "  python3 main.py password"
echo "  python3 main.py report -f html"
echo
echo "📖 See README.md for complete documentation"
echo
echo "⚠️  Remember: Use this tool responsibly and only on systems you own or have explicit permission to test."