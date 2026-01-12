#!/bin/bash

echo "🚀 Starting Webhook Dashboard Server..."
echo ""
echo "📡 Webhook endpoint: http://localhost:3000/webhook/receive"
echo "📊 Dashboard: http://localhost:3000"
echo ""
echo "💡 To expose to the internet (for n8n webhooks), use ngrok:"
echo "   ngrok http 3000"
echo ""
node webhook-server.js

