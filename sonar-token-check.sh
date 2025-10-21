#!/bin/bash
# SonarQube Token Troubleshooting and Setup Guide

echo "🔍 SonarQube Token Troubleshooting"
echo "===================================="
echo ""

# Check if token is set
if [ -z "$SONAR_TOKEN" ]; then
    echo "❌ SONAR_TOKEN is not set in your environment"
    echo ""
    echo "📝 Please follow these steps:"
else
    echo "✅ SONAR_TOKEN is set (length: ${#SONAR_TOKEN})"
    echo ""
    
    # Validate token
    echo "🔐 Validating token with SonarQube server..."
    VALIDATION=$(curl -s -u "${SONAR_TOKEN}:" "https://sonarqube.cdao.us/api/authentication/validate")
    
    if echo "$VALIDATION" | grep -q '"valid":true'; then
        echo "✅ Token is VALID!"
        echo ""
        echo "You're all set! Run: npm run sonar:local"
        exit 0
    else
        echo "❌ Token is INVALID or EXPIRED"
        echo ""
        echo "📝 You need to generate a new token:"
    fi
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📌 How to Get a Valid SonarQube Token"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "1. 🌐 Open your browser and go to:"
echo "   https://sonarqube.cdao.us/account/security"
echo ""
echo "2. 🔑 Generate a new token:"
echo "   - Click 'Generate Tokens'"
echo "   - Name: 'Local Development' (or any name)"
echo "   - Type: 'User Token'"
echo "   - Expires in: Choose appropriate expiration"
echo "   - Click 'Generate'"
echo ""
echo "3. 📋 Copy the token immediately (you won't see it again!)"
echo ""
echo "4. 🔧 Set the token in your environment:"
echo ""
echo "   Option A - Current session only:"
echo "   export SONAR_TOKEN=paste-your-token-here"
echo ""
echo "   Option B - Persistent (recommended):"
echo "   # Remove the old invalid token from ~/.zshrc first:"
echo "   nano ~/.zshrc  # or use your preferred editor"
echo "   # Delete the old 'export SONAR_TOKEN=...' line"
echo "   # Add the new token:"
echo "   echo 'export SONAR_TOKEN=your-new-token-here' >> ~/.zshrc"
echo "   source ~/.zshrc"
echo ""
echo "5. ✅ Verify the new token:"
echo "   npm run sonar:check"
echo "   ./sonar-token-check.sh"
echo ""
echo "6. 🚀 Run the scan:"
echo "   npm run sonar:local"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "⚠️  Common Issues"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "• Token expired: Generate a new one"
echo "• Wrong token type: Use 'User Token', not 'Project Token'"
echo "• Insufficient permissions: Ensure your user has 'Execute Analysis' permission"
echo "• Token not in environment: Check with 'echo \$SONAR_TOKEN'"
echo "• Typo in token: Copy-paste carefully, no extra spaces"
echo ""
