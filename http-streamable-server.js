import { createServer } from 'http';
import { allTools, executeToolCall } from './build/tools/index.js';

const PORT = process.env.PORT || 3000;
const MCP_ENDPOINT = '/mcp';

// Store active SSE connections
const sseConnections = new Map();
let connectionIdCounter = 0;

// MCP Protocol Handler - Direct JSON-RPC implementation
async function handleMCPRequest(jsonrpcRequest) {
  const { jsonrpc, id, method, params } = jsonrpcRequest;

  // Validate JSON-RPC 2.0
  if (jsonrpc !== '2.0') {
    return {
      jsonrpc: '2.0',
      id: id || null,
      error: {
        code: -32600,
        message: 'Invalid Request: jsonrpc must be "2.0"'
      }
    };
  }

  try {
    // Handle different MCP methods
    switch (method) {
      case 'initialize':
        return {
          jsonrpc: '2.0',
          id,
          result: {
            protocolVersion: '2025-03-26',
            capabilities: {
              tools: {}
            },
            serverInfo: {
              name: 'bitrix24-mcp-server',
              version: '1.0.0'
            }
          }
        };

      case 'tools/list':
        console.error(`Listing ${allTools.length} tools`);
        return {
          jsonrpc: '2.0',
          id,
          result: {
            tools: allTools
          }
        };

      case 'tools/call':
        if (!params || !params.name) {
          return {
            jsonrpc: '2.0',
            id,
            error: {
              code: -32602,
              message: 'Invalid params: name is required'
            }
          };
        }

        console.error(`Calling tool: ${params.name}`);
        const toolResult = await executeToolCall(params.name, params.arguments || {});

        return {
          jsonrpc: '2.0',
          id,
          result: {
            content: [
              {
                type: 'text',
                text: JSON.stringify(toolResult, null, 2)
              }
            ]
          }
        };

      case 'ping':
        return {
          jsonrpc: '2.0',
          id,
          result: {}
        };

      default:
        return {
          jsonrpc: '2.0',
          id: id || null,
          error: {
            code: -32601,
            message: `Method not found: ${method}`
          }
        };
    }
  } catch (error) {
    console.error('Error handling MCP request:', error);
    return {
      jsonrpc: '2.0',
      id: id || null,
      error: {
        code: -32603,
        message: error instanceof Error ? error.message : 'Internal error'
      }
    };
  }
}

// Create HTTP server
const httpServer = createServer(async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept, Last-Event-ID, X-Bitrix24-Webhook');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Health check endpoint
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      uptime: process.uptime(),
      protocol: 'MCP HTTP Streamable (2025-03-26)',
      endpoint: MCP_ENDPOINT,
      tools: allTools.length
    }));
    return;
  }

  // Root endpoint - status page
  if (req.method === 'GET' && req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Bitrix24 MCP Server - HTTP Streamable</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
          .container { max-width: 900px; margin: 0 auto; }
          .status { padding: 20px; background: #e8f5e8; border-radius: 5px; margin: 20px 0; }
          .info { padding: 15px; background: #f0f8ff; border-radius: 5px; margin: 10px 0; }
          code { background: #f5f5f5; padding: 2px 6px; border-radius: 3px; font-family: 'Courier New', monospace; }
          pre { background: #f5f5f5; padding: 15px; border-radius: 5px; overflow-x: auto; font-size: 13px; }
          .tool-list { max-height: 300px; overflow-y: auto; background: #fafafa; padding: 10px; border-radius: 3px; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>🚀 Bitrix24 MCP Server</h1>
          <div class="status">
            <h2>✅ Server Running</h2>
            <p><strong>Protocol:</strong> MCP HTTP Streamable (2025-03-26)</p>
            <p><strong>Endpoint:</strong> <code>http://localhost:${PORT}${MCP_ENDPOINT}</code></p>
          </div>

          <div class="info">
            <h3>📋 Server Information</h3>
            <ul>
              <li><strong>Version:</strong> 1.0.0</li>
              <li><strong>Runtime:</strong> Node.js ${process.version}</li>
              <li><strong>Port:</strong> ${PORT}</li>
              <li><strong>Available Tools:</strong> ${allTools.length}</li>
            </ul>
          </div>

          <div class="info">
            <h3>🔧 API Endpoints</h3>
            <ul>
              <li><code>GET /</code> - This status page</li>
              <li><code>GET /health</code> - Health check endpoint</li>
              <li><code>POST ${MCP_ENDPOINT}</code> - MCP JSON-RPC endpoint (send requests here)</li>
              <li><code>GET ${MCP_ENDPOINT}</code> - MCP SSE stream endpoint (optional, for server-initiated messages)</li>
            </ul>
          </div>

          <div class="info">
            <h3>📖 Usage Example - List Tools</h3>
            <pre>curl -X POST http://localhost:${PORT}${MCP_ENDPOINT} \\
  -H "Content-Type: application/json" \\
  -H "Accept: application/json" \\
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/list"
  }'</pre>
          </div>

          <div class="info">
            <h3>📖 Usage Example - Call Tool</h3>
            <pre>curl -X POST http://localhost:${PORT}${MCP_ENDPOINT} \\
  -H "Content-Type: application/json" \\
  -H "Accept: application/json" \\
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
      "name": "bitrix24_get_latest_contacts",
      "arguments": {
        "limit": 5
      }
    }
  }'</pre>
          </div>

          <div class="info">
            <h3>🛠 Available Tools (${allTools.length})</h3>
            <div class="tool-list">
              ${allTools.map(tool => `<div style="margin: 5px 0;"><code>${tool.name}</code> - ${tool.description}</div>`).join('')}
            </div>
          </div>

          <div class="info">
            <h3>🔗 MCP Client Configuration</h3>
            <p>To use this server with MCP-compatible clients (Claude Desktop, etc.), configure:</p>
            <pre>{
  "mcpServers": {
    "bitrix24": {
      "transport": "http",
      "url": "http://localhost:${PORT}${MCP_ENDPOINT}"
    }
  }
}</pre>
          </div>
        </div>
      </body>
      </html>
    `);
    return;
  }

  // MCP POST endpoint - handle JSON-RPC requests
  if (req.method === 'POST' && (req.url === MCP_ENDPOINT || req.url.startsWith(MCP_ENDPOINT + '?'))) {
    let body = '';

    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', async () => {
      try {
        // Parse JSON-RPC request
        const jsonrpcRequest = JSON.parse(body);
        console.error('\n📨 Received JSON-RPC request:', JSON.stringify(jsonrpcRequest, null, 2));

        // Extract webhook from request (header > query > body)
        const webhookFromHeader = req.headers['x-bitrix24-webhook'];
        const webhookFromQuery = new URL(req.url, `http://${req.headers.host}`).searchParams.get('webhook');

        // Inject webhook into arguments if provided
        if (jsonrpcRequest.params && jsonrpcRequest.params.arguments) {
          if (webhookFromHeader) {
            jsonrpcRequest.params.arguments._bitrix24_webhook = webhookFromHeader;
            console.error('🔑 Using webhook from X-Bitrix24-Webhook header');
          } else if (webhookFromQuery) {
            jsonrpcRequest.params.arguments._bitrix24_webhook = webhookFromQuery;
            console.error('🔑 Using webhook from ?webhook= query parameter');
          } else if (jsonrpcRequest.params.arguments._bitrix24_webhook) {
            console.error('🔑 Using webhook from request body');
          } else {
            console.error('🔑 Using default webhook from BITRIX24_WEBHOOK_URL env');
          }
        }

        // Process the request
        const response = await handleMCPRequest(jsonrpcRequest);
        console.error('📤 Sending response:', JSON.stringify(response, null, 2));

        // Check Accept header
        const acceptHeader = req.headers['accept'] || '';
        const acceptsJson = acceptHeader.includes('application/json');
        const acceptsSSE = acceptHeader.includes('text/event-stream');

        // If client accepts SSE and this is a request (has id), we can stream the response
        if (acceptsSSE && jsonrpcRequest.id && response.result) {
          res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive'
          });

          res.write(`data: ${JSON.stringify(response)}\n\n`);
          res.end();
        } else {
          // Return as regular JSON
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(response));
        }

      } catch (error) {
        console.error('❌ Error processing MCP request:', error);

        const errorResponse = {
          jsonrpc: '2.0',
          id: null,
          error: {
            code: -32700,
            message: error instanceof Error ? error.message : 'Parse error'
          }
        };

        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(errorResponse));
      }
    });

    return;
  }

  // MCP GET endpoint - open SSE stream for server-initiated messages
  if (req.method === 'GET' && req.url === MCP_ENDPOINT) {
    const acceptHeader = req.headers['accept'] || '';

    if (!acceptHeader.includes('text/event-stream')) {
      res.writeHead(405, { 'Content-Type': 'text/plain' });
      res.end('Method Not Allowed: Accept header must include text/event-stream');
      return;
    }

    const connectionId = connectionIdCounter++;
    const lastEventId = req.headers['last-event-id'];

    console.error(`\n🔌 New SSE connection: ${connectionId}, Last-Event-ID: ${lastEventId || 'none'}`);

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no'
    });

    // Send initial comment to establish connection
    res.write(': MCP SSE Stream Connected\n\n');

    // Store connection
    sseConnections.set(connectionId, {
      response: res,
      connectedAt: new Date()
    });

    // Keep-alive ping every 30 seconds
    const keepAliveInterval = setInterval(() => {
      if (!res.destroyed) {
        res.write(': keep-alive\n\n');
      }
    }, 30000);

    // Handle connection close
    req.on('close', () => {
      console.error(`🔌 SSE connection closed: ${connectionId}`);
      clearInterval(keepAliveInterval);
      sseConnections.delete(connectionId);
    });

    return;
  }

  // 404 for other routes
  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not Found');
});

// Start the server
httpServer.listen(PORT, () => {
  console.log('\n🚀 Bitrix24 MCP Server (HTTP Streamable) started');
  console.log('━'.repeat(60));
  console.log(`📍 MCP Endpoint: http://localhost:${PORT}${MCP_ENDPOINT}`);
  console.log(`🌐 Status Page:  http://localhost:${PORT}/`);
  console.log(`💚 Health Check: http://localhost:${PORT}/health`);
  console.log('━'.repeat(60));
  console.log(`💡 Available tools: ${allTools.length}`);
  console.log(`📦 Protocol: MCP HTTP Streamable (2025-03-26)`);
  console.log('━'.repeat(60));
  console.log('\n✅ Ready to accept connections!\n');
});

// Graceful shutdown
const shutdown = () => {
  console.log('\n\n🛑 Shutting down gracefully...');

  // Close all SSE connections
  console.log(`📡 Closing ${sseConnections.size} SSE connections...`);
  sseConnections.forEach((conn, id) => {
    conn.response.end();
  });
  sseConnections.clear();

  httpServer.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });

  // Force exit after 5 seconds
  setTimeout(() => {
    console.log('⚠️  Forced shutdown');
    process.exit(1);
  }, 5000);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
