import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import axios from 'axios';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Store webhook data in memory (you can replace this with a database)
let webhookData = [];
const MAX_ENTRIES = 1000; // Limit stored entries

// Store price change logs
let priceChangeLogs = [];
const MAX_LOG_ENTRIES = 500; // Limit stored log entries

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files (dashboard HTML)
app.use(express.static(__dirname));

// Webhook endpoint - receives POST requests from n8n
app.post('/webhook/receive', (req, res) => {
    try {
        const timestamp = new Date().toISOString();
        const entry = {
            id: Date.now(),
            timestamp,
            headers: req.headers,
            body: req.body,
            query: req.query,
            method: req.method,
            ip: req.ip || req.connection.remoteAddress
        };

        // Add to beginning of array
        webhookData.unshift(entry);

        // Keep only the most recent entries
        if (webhookData.length > MAX_ENTRIES) {
            webhookData = webhookData.slice(0, MAX_ENTRIES);
        }

        console.log(`[${timestamp}] Webhook received:`, {
            method: req.method,
            bodyKeys: Object.keys(req.body),
            headers: Object.keys(req.headers)
        });

        // Send success response
        res.status(200).json({
            success: true,
            message: 'Webhook received successfully',
            id: entry.id,
            timestamp
        });
    } catch (error) {
        console.error('Error processing webhook:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// API endpoint to get all webhook data
app.get('/api/webhooks', (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 100;
        const offset = parseInt(req.query.offset) || 0;
        
        const data = webhookData.slice(offset, offset + limit);
        
        res.json({
            success: true,
            total: webhookData.length,
            count: data.length,
            offset,
            limit,
            data
        });
    } catch (error) {
        console.error('Error fetching webhook data:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// API endpoint to get a specific webhook entry
app.get('/api/webhooks/:id', (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const entry = webhookData.find(e => e.id === id);
        
        if (!entry) {
            return res.status(404).json({
                success: false,
                error: 'Webhook entry not found'
            });
        }
        
        res.json({
            success: true,
            data: entry
        });
    } catch (error) {
        console.error('Error fetching webhook entry:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// API endpoint to clear all webhook data
app.delete('/api/webhooks', (req, res) => {
    try {
        const count = webhookData.length;
        webhookData = [];
        res.json({
            success: true,
            message: `Cleared ${count} webhook entries`
        });
    } catch (error) {
        console.error('Error clearing webhook data:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Proxy endpoint to fetch data from n8n webhook (bypasses CORS)
app.get('/api/fetch-webhook', async (req, res) => {
    try {
        const WEBHOOK_URL = 'https://automation.wildeautomations.com/webhook/343dcbd2-dc35-4a61-a08a-21a0b310f085';
        
        let response;
        let data;

        // Try POST first (n8n webhooks typically expect POST)
        try {
            console.log(`Attempting to fetch from n8n webhook: ${WEBHOOK_URL}`);
            
            response = await axios.post(WEBHOOK_URL, {}, {
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'User-Agent': 'Webhook-Dashboard/1.0'
                },
                validateStatus: () => true, // Don't throw on any status
                timeout: 10000 // 10 second timeout
            });

            console.log(`n8n webhook response status: ${response.status}`);

            // If POST fails, try GET
            if (response.status >= 400) {
                console.log('POST failed, trying GET...');
                response = await axios.get(WEBHOOK_URL, {
                    headers: {
                        'Accept': 'application/json',
                        'User-Agent': 'Webhook-Dashboard/1.0'
                    },
                    validateStatus: () => true,
                    timeout: 10000
                });
                console.log(`GET response status: ${response.status}`);
            }

            if (response.status === 404) {
                throw new Error(`Webhook not found (404). Make sure the n8n workflow is active and the webhook URL is correct.`);
            }

            if (response.status >= 400) {
                throw new Error(`n8n webhook returned ${response.status}: ${response.statusText || response.status}`);
            }

            // Axios automatically parses JSON
            data = response.data;
            console.log('Successfully fetched data from n8n webhook');

        } catch (error) {
            // If axios fails, try to get error details
            if (error.response) {
                const status = error.response.status;
                const statusText = error.response.statusText;
                console.error(`n8n webhook error: ${status} ${statusText}`);
                
                if (status === 404) {
                    throw new Error(`Webhook not found (404). The n8n workflow may not be active. Please activate the workflow in n8n.`);
                }
                throw new Error(`n8n webhook returned ${status}: ${statusText}`);
            }
            
            if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
                throw new Error(`Cannot connect to n8n webhook. Check your internet connection.`);
            }
            
            console.error('Error fetching from n8n webhook:', error);
            throw error;
        }

        res.json({
            success: true,
            data: data
        });
    } catch (error) {
        console.error('Error fetching from n8n webhook:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to fetch data from n8n webhook'
        });
    }
});

// Endpoint to submit approve/reject actions
app.post('/api/submit-action', async (req, res) => {
    try {
        const ACTION_WEBHOOK_URL = 'https://jackwilde.app.n8n.cloud/webhook/4a1ca18b-35c1-4360-bc4e-d10a76c8c7a4';
        const payload = req.body;

        console.log(`Submitting action: ${payload.action}`, {
            item_id: payload.item_id,
            Item_description: payload.Item_description
        });

        // Log the price change before sending
        const logEntry = {
            id: Date.now(),
            timestamp: new Date().toISOString(),
            action: payload.action,
            item_id: payload.item_id,
            Item_description: payload.Item_description,
            direction: payload.direction,
            delta_pct: payload.delta_pct,
            suggested_price: payload.suggested_price,
            status: payload.status,
            confidence: payload.confidence,
            reason: payload.reason
        };

        const response = await axios.post(ACTION_WEBHOOK_URL, payload, {
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'User-Agent': 'Webhook-Dashboard/1.0'
            },
            validateStatus: () => true,
            timeout: 10000
        });

        if (response.status >= 400) {
            // Handle specific error codes
            if (response.status === 530) {
                throw new Error(`Webhook server is down or unreachable (530). The n8n workflow may not be active or the server is experiencing issues.`);
            } else if (response.status === 404) {
                throw new Error(`Webhook not found (404). Make sure the webhook URL is correct and the workflow is active.`);
            } else if (response.status >= 500) {
                throw new Error(`Webhook server error (${response.status}). The server is experiencing issues.`);
            } else {
                throw new Error(`Action webhook returned ${response.status}: ${response.statusText || 'Unknown error'}`);
            }
        }

        // Only log successful submissions
        logEntry.success = true;
        logEntry.webhookResponse = response.data;
        priceChangeLogs.unshift(logEntry);

        // Keep only the most recent log entries
        if (priceChangeLogs.length > MAX_LOG_ENTRIES) {
            priceChangeLogs = priceChangeLogs.slice(0, MAX_LOG_ENTRIES);
        }

        console.log(`Action submitted successfully: ${payload.action}`);

        res.json({
            success: true,
            message: `Action ${payload.action} submitted successfully`,
            data: response.data
        });
        } catch (error) {
        console.error('Error submitting action:', error);
        
        // Log failed submission
        if (logEntry) {
            logEntry.success = false;
            logEntry.error = error.message;
            priceChangeLogs.unshift(logEntry);

            // Keep only the most recent log entries
            if (priceChangeLogs.length > MAX_LOG_ENTRIES) {
                priceChangeLogs = priceChangeLogs.slice(0, MAX_LOG_ENTRIES);
            }
        }
        
        let errorMessage = 'Failed to submit action';
        let statusCode = 500;
        
        if (error.response) {
            // HTTP error response from webhook
            const status = error.response.status;
            if (status === 530) {
                errorMessage = 'Webhook server is down or unreachable (530). The n8n workflow may not be active or the server is experiencing issues.';
                statusCode = 503; // Service Unavailable
            } else if (status === 404) {
                errorMessage = 'Webhook not found (404). Make sure the webhook URL is correct and the workflow is active.';
                statusCode = 404;
            } else if (status >= 500) {
                errorMessage = `Webhook server error (${status}). The server is experiencing issues.`;
                statusCode = 502; // Bad Gateway
            } else {
                errorMessage = `Action webhook returned ${status}: ${error.response.statusText || 'Unknown error'}`;
                statusCode = status;
            }
        } else if (error.code === 'ECONNREFUSED') {
            // Connection refused - webhook server not running
            errorMessage = 'Cannot connect to webhook at http://localhost:5678. Make sure your local n8n instance is running on port 5678.';
            statusCode = 503; // Service Unavailable
        } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
            errorMessage = 'Connection timeout. The webhook server took too long to respond.';
            statusCode = 504; // Gateway Timeout
        } else if (error.message) {
            errorMessage = error.message;
        }

        res.status(statusCode).json({
            success: false,
            error: errorMessage
        });
    }
});

// API endpoint to get price change logs
app.get('/api/price-change-logs', (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 100;
        const offset = parseInt(req.query.offset) || 0;
        
        const logs = priceChangeLogs.slice(offset, offset + limit);
        
        res.json({
            success: true,
            total: priceChangeLogs.length,
            count: logs.length,
            offset,
            limit,
            logs
        });
    } catch (error) {
        console.error('Error fetching price change logs:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Chat endpoint - proxy to n8n chat webhook
app.post('/api/chat', async (req, res) => {
    try {
        const CHAT_WEBHOOK_URL = 'https://jackwilde.app.n8n.cloud/webhook/294320af-2b6f-4723-8949-aa8764c8ee04';
        const { message } = req.body;

        if (!message) {
            return res.status(400).json({
                success: false,
                error: 'Message is required'
            });
        }

        console.log(`Chat message received: ${message.substring(0, 50)}...`);

        const response = await axios.post(CHAT_WEBHOOK_URL, { message }, {
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'User-Agent': 'Webhook-Dashboard/1.0'
            },
            validateStatus: () => true,
            timeout: 30000 // 30 second timeout for chat
        });

        if (response.status === 404) {
            throw new Error(`Chat webhook not found (404). The n8n workflow may not be active. Please activate the workflow in n8n.`);
        } else if (response.status >= 400) {
            throw new Error(`Chat webhook returned ${response.status}: ${response.statusText || response.status}`);
        }

        // Extract response from webhook
        let chatResponse = response.data;
        
        // Handle different response formats
        if (typeof chatResponse === 'string') {
            chatResponse = chatResponse;
        } else if (chatResponse && chatResponse.response) {
            chatResponse = chatResponse.response;
        } else if (chatResponse && chatResponse.message) {
            chatResponse = chatResponse.message;
        } else if (chatResponse && chatResponse.data) {
            chatResponse = chatResponse.data;
        } else if (typeof chatResponse === 'object') {
            chatResponse = JSON.stringify(chatResponse, null, 2);
        }

        res.json({
            success: true,
            response: chatResponse,
            data: response.data
        });
    } catch (error) {
        console.error('Error in chat:', error);
        
        let errorMessage = 'Failed to send chat message';
        if (error.response) {
            errorMessage = `Chat webhook returned ${error.response.status}: ${error.response.statusText}`;
        } else if (error.message) {
            errorMessage = error.message;
        }

        res.status(500).json({
            success: false,
            error: errorMessage
        });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        totalEntries: webhookData.length,
        totalLogs: priceChangeLogs.length
    });
});

// Root endpoint - serve dashboard
app.get('/', (req, res) => {
    res.sendFile(join(__dirname, 'webhook-dashboard.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Webhook Dashboard Server running on http://localhost:${PORT}`);
    console.log(`📡 Webhook endpoint: http://localhost:${PORT}/webhook/receive`);
    console.log(`📊 Dashboard: http://localhost:${PORT}`);
    console.log(`\n💡 Configure your n8n webhook to POST to: http://localhost:${PORT}/webhook/receive`);
    console.log(`   Or use a service like ngrok to expose it: ngrok http ${PORT}`);
});

