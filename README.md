# Webhook Dashboard

A professional webhook dashboard for receiving, displaying, and managing webhook data from n8n workflows. Features include real-time data display, price change approval/rejection workflow, and an integrated chat interface.

## Features

- 📊 **Real-time Webhook Data Display** - View incoming webhook data in a clean, professional table format
- ✅ **Approve/Reject Workflow** - Approve or reject price changes with one click
- 📝 **Price Change Log** - Complete history of all price change actions
- 💬 **Chat Interface** - Integrated chat functionality for AI interactions
- 🔄 **Auto-refresh** - Optional automatic data refresh every 30 seconds
- 🎨 **Professional UI** - Clean, modern design with basic colors (no gradients)

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the server:**
   ```bash
   node webhook-server.js
   ```
   
   Or use the convenience script:
   ```bash
   ./start-webhook-dashboard.sh
   ```

3. **Open the dashboard:**
   - Visit `http://localhost:3000` in your browser

## Configuration

### Webhook URLs

The dashboard is configured to work with these n8n webhooks:

- **Data Source:** `https://automation.wildeautomations.com/webhook/343dcbd2-dc35-4a61-a08a-21a0b310f085`
- **Action Webhook:** `https://jackwilde.app.n8n.cloud/webhook/4a1ca18b-35c1-4360-bc4e-d10a76c8c7a4`
- **Chat Webhook:** `https://jackwilde.app.n8n.cloud/webhook/294320af-2b6f-4723-8949-aa8764c8ee04`

You can update these URLs in `webhook-server.js` if needed.

## Usage

### Dashboard Page

- View incoming webhook data in a table format
- Columns displayed: Item_description, item_id, direction, delta_pct, suggested_price, status, confidence, reason
- Click "Approve" or "Reject" to submit actions
- View all price change history in the log section

### Chat Page

- Switch to the Chat tab
- Type your message and press Enter or click Send
- Receive responses from the n8n chat webhook

## API Endpoints

- `GET /` - Dashboard HTML page
- `GET /api/fetch-webhook` - Fetch data from n8n webhook (proxy)
- `POST /api/submit-action` - Submit approve/reject actions
- `GET /api/price-change-logs` - Get price change log history
- `POST /api/chat` - Send chat messages
- `POST /webhook/receive` - Receive webhook data from n8n
- `GET /health` - Health check endpoint

## Project Structure

```
webhook-dashboard/
├── webhook-dashboard.html  # Main dashboard UI
├── webhook-server.js       # Express server
├── package.json           # Dependencies
├── README.md             # This file
└── start-webhook-dashboard.sh  # Startup script
```

## Dependencies

- express - Web server
- axios - HTTP client
- cors - CORS middleware

## Notes

- Webhook data and logs are stored in memory (will be lost on server restart)
- Maximum 1000 webhook entries and 500 log entries are stored
- For production, consider adding a database (MongoDB, PostgreSQL, etc.)

## License

ISC

# pricechanger-webhook
# pricechanger-webhook
# pricechanger-webhook
