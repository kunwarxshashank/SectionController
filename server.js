// server.js
const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();
const PORT = parseInt('3010', 10);
const API_BASE_URL = process.env.REALTIME_API_BASE || `http://localhost:${PORT}`;

const sectionWatchers = new Map();

const fetcher = (...args) => {
  if (typeof fetch !== 'undefined') {
    return fetch(...args);
  }
  return import('node-fetch').then(({ default: nodeFetch }) => nodeFetch(...args));
};


async function broadcastSectionUpdate(io, sectionId) {
  try {
    const response = await fetcher(`${API_BASE_URL}/api/sections/bpl`);
    if (!response.ok) {
      throw new Error(`Failed to fetch section ${sectionId}: ${response.status}`);
    }

    const payload = await response.json();
    io.to(sectionId).emit('section:update', payload);
  } catch (error) {
    console.error(`[ws] section:update error for ${sectionId}`, error);
    io.to(sectionId).emit('section:error', {
      sectionId,
      message: error.message || 'Failed to fetch section data',
    });
  }
}


function ensureSectionWatcher(io, sectionId) {
  const normalized = sectionId.toLowerCase();
  let watcher = sectionWatchers.get(normalized);

  if (!watcher) {
    watcher = { count: 0, interval: null };
    sectionWatchers.set(normalized, watcher);
  }

  watcher.count += 1;

  if (!watcher.interval) {
    watcher.interval = setInterval(() => broadcastSectionUpdate(io, normalized), 15000);
  }

  return normalized;
}


function releaseSectionWatcher(sectionId) {
  const normalized = sectionId.toLowerCase();
  const watcher = sectionWatchers.get(normalized);
  if (!watcher) return;

  watcher.count -= 1;
  if (watcher.count <= 0) {
    clearInterval(watcher.interval);
    sectionWatchers.delete(normalized);
  }
}


app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  const io = new Server(server);

  io.on('connection', (socket) => {
    console.log('Client connected');
    const subscriptions = new Set();

    socket.on('section:subscribe', async ({ sectionId }) => {
      if (!sectionId) {
        socket.emit('section:error', { message: 'Section ID is required' });
        return;
      }

      const normalized = ensureSectionWatcher(io, sectionId);
      subscriptions.add(normalized);
      socket.join(normalized);
      await broadcastSectionUpdate(io, normalized);
    });

    
    socket.on('section:unsubscribe', ({ sectionId }) => {
      if (!sectionId) return;
      const normalized = sectionId.toLowerCase();
      if (subscriptions.has(normalized)) {
        subscriptions.delete(normalized);
        socket.leave(normalized);
        releaseSectionWatcher(normalized);
      }
    });
    
    socket.on('message', (data) => {
      // Handle messages
      io.emit('message', data);
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected');
      subscriptions.forEach((sectionId) => releaseSectionWatcher(sectionId));
      subscriptions.clear();
    });
  });

  server.listen(PORT, () => {
    console.log(`> Ready on http://localhost:${PORT}`);
  });
});