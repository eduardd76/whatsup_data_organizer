import express from 'express';
import path from 'path';
import { config } from '../config';
import { logger } from '../utils/logger';
import { database } from '../storage/database';
import { getQueueMetrics } from '../queue/producer';

const app = express();

// Basic auth middleware
function basicAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    res.setHeader('WWW-Authenticate', 'Basic realm="Admin"');
    return res.status(401).send('Authentication required');
  }

  const [type, credentials] = authHeader.split(' ');
  if (type !== 'Basic') {
    return res.status(401).send('Invalid authentication type');
  }

  const [username, password] = Buffer.from(credentials, 'base64').toString().split(':');

  if (username !== config.adminUsername || password !== config.adminPassword) {
    return res.status(401).send('Invalid credentials');
  }

  next();
}

app.use(basicAuth);
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// API endpoints
app.get('/api/stats', async (req, res) => {
  try {
    const queueMetrics = await getQueueMetrics();

    // Get database stats
    const totalEvents = await database.query('SELECT COUNT(*) FROM intake_events');
    const completedEvents = await database.query(
      "SELECT COUNT(*) FROM intake_events WHERE processing_status = 'completed'"
    );
    const failedEvents = await database.query(
      "SELECT COUNT(*) FROM intake_events WHERE processing_status = 'failed'"
    );
    const totalEnriched = await database.query('SELECT COUNT(*) FROM enriched_items');

    res.json({
      queue: queueMetrics,
      database: {
        totalEvents: parseInt(totalEvents.rows[0].count),
        completedEvents: parseInt(completedEvents.rows[0].count),
        failedEvents: parseInt(failedEvents.rows[0].count),
        totalEnriched: parseInt(totalEnriched.rows[0].count),
      },
    });
  } catch (error) {
    logger.error('Failed to get stats:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

app.get('/api/events', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const events = await database.listIntakeEvents(limit, offset);

    res.json({
      events,
      limit,
      offset,
    });
  } catch (error) {
    logger.error('Failed to get events:', error);
    res.status(500).json({ error: 'Failed to get events' });
  }
});

app.get('/api/enriched', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const items = await database.listEnrichedItems(limit, offset);

    res.json({
      items,
      limit,
      offset,
    });
  } catch (error) {
    logger.error('Failed to get enriched items:', error);
    res.status(500).json({ error: 'Failed to get enriched items' });
  }
});

app.get('/api/event/:id', async (req, res) => {
  try {
    const event = await database.getIntakeEventById(req.params.id);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const enrichedItem = await database.getEnrichedItemByEventId(req.params.id);

    res.json({
      event,
      enrichedItem,
    });
  } catch (error) {
    logger.error('Failed to get event:', error);
    res.status(500).json({ error: 'Failed to get event' });
  }
});

// Serve admin UI
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>WhatsApp Notion Intake - Admin</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: #f5f5f5;
          padding: 20px;
        }
        .container { max-width: 1400px; margin: 0 auto; }
        h1 { margin-bottom: 30px; color: #333; }
        .stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
          margin-bottom: 30px;
        }
        .stat-card {
          background: white;
          padding: 20px;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .stat-card h3 { font-size: 14px; color: #666; margin-bottom: 10px; }
        .stat-card .value { font-size: 32px; font-weight: bold; color: #333; }
        .section {
          background: white;
          padding: 20px;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          margin-bottom: 20px;
        }
        .section h2 { margin-bottom: 20px; color: #333; }
        table {
          width: 100%;
          border-collapse: collapse;
        }
        th, td {
          padding: 12px;
          text-align: left;
          border-bottom: 1px solid #eee;
        }
        th { background: #f9f9f9; font-weight: 600; color: #666; }
        .status {
          display: inline-block;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 500;
        }
        .status.completed { background: #d4edda; color: #155724; }
        .status.processing { background: #fff3cd; color: #856404; }
        .status.failed { background: #f8d7da; color: #721c24; }
        .status.pending { background: #d1ecf1; color: #0c5460; }
        button {
          background: #007bff;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 4px;
          cursor: pointer;
        }
        button:hover { background: #0056b3; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>📱 WhatsApp → Notion Intake Admin</h1>

        <div class="stats" id="stats">
          <div class="stat-card">
            <h3>Total Events</h3>
            <div class="value" id="totalEvents">-</div>
          </div>
          <div class="stat-card">
            <h3>Completed</h3>
            <div class="value" id="completedEvents">-</div>
          </div>
          <div class="stat-card">
            <h3>Failed</h3>
            <div class="value" id="failedEvents">-</div>
          </div>
          <div class="stat-card">
            <h3>Queue: Waiting</h3>
            <div class="value" id="queueWaiting">-</div>
          </div>
          <div class="stat-card">
            <h3>Queue: Active</h3>
            <div class="value" id="queueActive">-</div>
          </div>
          <div class="stat-card">
            <h3>Total Enriched</h3>
            <div class="value" id="totalEnriched">-</div>
          </div>
        </div>

        <div class="section">
          <h2>Recent Events</h2>
          <button onclick="loadEvents()">Refresh</button>
          <table>
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>From</th>
                <th>Type</th>
                <th>Status</th>
                <th>Retries</th>
              </tr>
            </thead>
            <tbody id="eventsTable">
              <tr><td colspan="5">Loading...</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <script>
        async function loadStats() {
          const res = await fetch('/api/stats');
          const data = await res.json();

          document.getElementById('totalEvents').textContent = data.database.totalEvents;
          document.getElementById('completedEvents').textContent = data.database.completedEvents;
          document.getElementById('failedEvents').textContent = data.database.failedEvents;
          document.getElementById('queueWaiting').textContent = data.queue.waiting;
          document.getElementById('queueActive').textContent = data.queue.active;
          document.getElementById('totalEnriched').textContent = data.database.totalEnriched;
        }

        async function loadEvents() {
          const res = await fetch('/api/events?limit=20');
          const data = await res.json();

          const tbody = document.getElementById('eventsTable');
          tbody.innerHTML = data.events.map(event => \`
            <tr>
              <td>\${new Date(event.timestamp).toLocaleString()}</td>
              <td>\${event.from_number}</td>
              <td>\${event.text ? 'Text' : ''} \${event.attachments.length > 0 ? '+ ' + event.attachments.length + ' files' : ''}</td>
              <td><span class="status \${event.processing_status}">\${event.processing_status}</span></td>
              <td>\${event.retry_count}</td>
            </tr>
          \`).join('');
        }

        // Auto-refresh
        setInterval(() => {
          loadStats();
          loadEvents();
        }, 5000);

        // Initial load
        loadStats();
        loadEvents();
      </script>
    </body>
    </html>
  `);
});

// Start admin server
async function start() {
  try {
    await database.connect();
    logger.info('Database connected (admin)');

    app.listen(config.adminPort, () => {
      logger.info(`Admin UI running on http://localhost:${config.adminPort}`);
      logger.info(`Username: ${config.adminUsername}`);
    });
  } catch (error) {
    logger.error('Failed to start admin server:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  start();
}

export default app;
