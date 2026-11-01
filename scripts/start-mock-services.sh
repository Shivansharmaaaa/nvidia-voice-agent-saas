#!/bin/bash

# Start Mock NVIDIA Services
# These simulate Nemotron Speech, LLM, and Magpie TTS for development

set -e

echo "🤖 Starting Mock NVIDIA Services..."
echo ""

cd "$(dirname "$0")/../ai-service"

# Check if venv exists
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

source venv/bin/activate

# Install dependencies if needed
if ! python3 -c "import fastapi" 2>/dev/null; then
    echo "Installing dependencies..."
    pip install -q fastapi uvicorn
fi

# Start services
echo "Starting Mock ASR Service (port 8001)..."
python3 mock_services.py 8001 > /tmp/mock-asr.log 2>&1 &
echo $! > /tmp/mock-asr.pid

echo "Starting Mock LLM Service (port 8002)..."
python3 mock_services.py 8002 > /tmp/mock-llm.log 2>&1 &
echo $! > /tmp/mock-llm.pid

echo "Starting Mock TTS Service (port 8003)..."
python3 mock_services.py 8003 > /tmp/mock-tts.log 2>&1 &
echo $! > /tmp/mock-tts.pid

sleep 3

echo ""
echo "✅ Mock services started!"
echo ""
echo "Services:"
echo "  - ASR:  http://localhost:8001/health"
echo "  - LLM:  http://localhost:8002/health"
echo "  - TTS:  http://localhost:8003/health"
echo ""
echo "Logs:"
echo "  - ASR:  tail -f /tmp/mock-asr.log"
echo "  - LLM:  tail -f /tmp/mock-llm.log"
echo "  - TTS:  tail -f /tmp/mock-tts.log"
echo ""
