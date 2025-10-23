#!/bin/bash
# Quick setup script for SonarQube authentication

echo "🔐 SonarQube Authentication Setup"
echo "=================================="
echo ""
echo "You need a SonarQube token to run scans locally."
echo ""
echo "📌 Steps:"
echo "1. Go to: https://sonarqube.cdao.us/account/security"
echo "2. Generate a new token (or use existing one)"
echo "3. Copy the token value"
echo ""
echo "Choose how to configure:"
echo ""
echo "Option 1 - Environment File (Recommended):"
echo "  Create a .env.sonar file with:"
echo "  export SONAR_TOKEN=your_actual_token_here"
echo ""
echo "Option 2 - Export for Current Session:"
echo "  export SONAR_TOKEN=your_actual_token_here"
echo ""
echo "Option 3 - Add to Shell Profile (Persistent):"
echo "  echo 'export SONAR_TOKEN=your_actual_token_here' >> ~/.zshrc"
echo "  source ~/.zshrc"
echo ""

read -p "Would you like to set SONAR_TOKEN now? (y/n): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "Paste your SonarQube token (it will be hidden):"
    read -s SONAR_TOKEN_INPUT
    
    if [ -n "$SONAR_TOKEN_INPUT" ]; then
        # Export for current session
        export SONAR_TOKEN="$SONAR_TOKEN_INPUT"
        
        # Save to .env.sonar
        echo "export SONAR_TOKEN=$SONAR_TOKEN_INPUT" > .env.sonar
        echo "export SONAR_HOST_URL=https://sonarqube.cdao.us" >> .env.sonar
        
        echo ""
        echo "✅ Token configured!"
        echo "   - Exported for current session"
        echo "   - Saved to .env.sonar (for future sessions, run: source .env.sonar)"
        echo ""
        echo "Run 'npm run sonar:local' to start scanning!"
    else
        echo "❌ No token provided. Setup cancelled."
    fi
else
    echo ""
    echo "Setup skipped. You can configure manually later."
fi
