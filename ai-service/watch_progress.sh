#!/bin/bash
# Live progress monitor for pip installation

LOG_FILE="/tmp/pip_install_full.log"
REQ_FILE="requirements.txt"

# Count total packages
TOTAL=$(grep -E "==|>=" "$REQ_FILE" | grep -v "^#" | wc -l | tr -d ' ')

echo "📦 Voice Agent Installation - Live Progress Monitor"
echo "=========================================================="
echo "Press Ctrl+C to stop monitoring (installation continues)"
echo ""

while true; do
    if [ -f "$LOG_FILE" ]; then
        INSTALLED=$(grep -c "Successfully installed" "$LOG_FILE" 2>/dev/null || echo "0")
        PROGRESS=$((INSTALLED * 100 / TOTAL))
        
        # Create progress bar
        FILLED=$((PROGRESS / 2))
        BAR=""
        for i in {1..50}; do
            if [ $i -le $FILLED ]; then
                BAR="${BAR}█"
            else
                BAR="${BAR}░"
            fi
        done
        
        clear
        echo "📦 Voice Agent Installation - Live Progress"
        echo "=========================================================="
        echo ""
        echo "Progress: [$BAR] $PROGRESS%"
        echo "Packages: $INSTALLED/$TOTAL installed"
        echo ""
        echo "Latest activity:"
        echo "----------------------------------------------------------"
        tail -n 6 "$LOG_FILE" | sed 's/^/  /'
        
        if grep -q "Successfully installed" "$LOG_FILE"; then
            echo ""
            echo "✅ Installation completed!"
            break
        fi
    else
        echo "⏳ Waiting for installation to start..."
    fi
    
    sleep 1
done
