# Webhook Dashboard

A real-time dashboard to receive and display webhook data from n8n.

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the server:**
   ```bash
   node webhook-server.js
   ```

   The server will start on `http://localhost:3000`

## Configuration

### For Local Development

1. Start the server (see above)
2. Open `http://localhost:3000` in your browser to view the dashboard
3. The webhook endpoint is: `http://localhost:3000/webhook/receive`

### For Production (Exposing to Internet)

To receive webhooks from n8n, you need to expose your local server to the internet. Use one of these methods:

#### Option 1: Using ngrok (Recommended for testing)

1. Install ngrok: https://ngrok.com/download
2. Start your server: `node webhook-server.js`
3. In another terminal, run: `ngrok http 3000`
4. Copy the HTTPS URL (e.g., `https://abc123.ngrok.io`)
5. Configure your n8n webhook to POST to: `https://abc123.ngrok.io/webhook/receive`

#### Option 2: Deploy to a Cloud Service

Deploy the server to services like:
- Heroku
- Railway
- Render
- DigitalOcean App Platform
- AWS/GCP/Azure

Then configure your n8n webhook to POST to your deployed URL.

## n8n Configuration

In your n8n workflow:

1. Add a **Webhook** node
2. Set the method to **POST**
3. Configure the webhook URL to point to your server's `/webhook/receive` endpoint:
   - Local with ngrok: `https://your-ngrok-url.ngrok.io/webhook/receive`
   - Production: `https://your-domain.com/webhook/receive`

4. The webhook will receive any data sent from your n8n workflow

## API Endpoints

- `GET /` - Dashboard HTML page
- `POST /webhook/receive` - Receive webhook data from n8n
- `GET /api/webhooks` - Get all stored webhook entries (with optional `?limit=100&offset=0`)
- `GET /api/webhooks/:id` - Get a specific webhook entry by ID
- `DELETE /api/webhooks` - Clear all stored webhook data
- `GET /health` - Health check endpoint

## Features

- ✅ Real-time webhook data reception
- ✅ Beautiful, modern dashboard UI
- ✅ Auto-refresh every 30 seconds (optional)
- ✅ View webhook body, headers, and query parameters
- ✅ JSON syntax highlighting
- ✅ Clear all data functionality
- ✅ Responsive design

## Notes

- Webhook data is stored in memory (will be lost on server restart)
- Maximum 1000 entries are stored (oldest entries are removed when limit is reached)
- For persistent storage, consider adding a database (MongoDB, PostgreSQL, etc.)

