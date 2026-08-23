const express = require('express');
const router = express.Router();
const dbService = require('../services/db-service');
const pinterestPublisher = require('../services/pinterest-publisher');

function getAccessToken(req) {
  const conn = dbService.getConnections();
  return req.headers.authorization?.replace('Bearer ', '') ||
         req.query.token ||
         conn.pinterestAccessToken ||
         process.env.PINTEREST_ACCESS_TOKEN;
}

// GET /api/pinterest/profile - Read Account Profile Info
router.get('/profile', async (req, res) => {
  const token = getAccessToken(req);
  if (!token) {
    return res.status(401).json({ success: false, error: 'Pinterest Access Token belum dikonfigurasi.' });
  }

  try {
    const profile = await pinterestPublisher.verifyUserAccount(token);
    res.json({ success: true, profile });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/pinterest/boards - Read all user Boards
router.get('/boards', async (req, res) => {
  const token = getAccessToken(req);
  if (!token) {
    return res.status(401).json({ success: false, error: 'Pinterest Access Token belum dikonfigurasi.' });
  }

  try {
    const boards = await pinterestPublisher.getBoards(token);
    res.json({ success: true, count: boards.length, boards });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/pinterest/boards/:boardId - Read single Board details
router.get('/boards/:boardId', async (req, res) => {
  const token = getAccessToken(req);
  if (!token) {
    return res.status(401).json({ success: false, error: 'Pinterest Access Token belum dikonfigurasi.' });
  }

  try {
    const board = await pinterestPublisher.getBoardDetails(token, req.params.boardId);
    res.json({ success: true, board });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/pinterest/boards/:boardId/pins - Read Pins inside a Board
router.get('/boards/:boardId/pins', async (req, res) => {
  const token = getAccessToken(req);
  if (!token) {
    return res.status(401).json({ success: false, error: 'Pinterest Access Token belum dikonfigurasi.' });
  }

  try {
    const pageSize = Number(req.query.page_size) || 25;
    const bookmark = req.query.bookmark || null;
    const result = await pinterestPublisher.getBoardPins(token, req.params.boardId, pageSize, bookmark);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/pinterest/pins - Read User's Created Pins
router.get('/pins', async (req, res) => {
  const token = getAccessToken(req);
  if (!token) {
    return res.status(401).json({ success: false, error: 'Pinterest Access Token belum dikonfigurasi.' });
  }

  try {
    const pageSize = Number(req.query.page_size) || 25;
    const bookmark = req.query.bookmark || null;
    const result = await pinterestPublisher.getPins(token, pageSize, bookmark);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/pinterest/pins/:pinId - Read Pin details and Metrics
router.get('/pins/:pinId', async (req, res) => {
  const token = getAccessToken(req);
  if (!token) {
    return res.status(401).json({ success: false, error: 'Pinterest Access Token belum dikonfigurasi.' });
  }

  try {
    const pin = await pinterestPublisher.getPinDetails(token, req.params.pinId);
    res.json({ success: true, pin });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/pinterest/pins/:pinId/analytics - Read Pin Analytics (Impressions, Clicks, Saves)
router.get('/pins/:pinId/analytics', async (req, res) => {
  const token = getAccessToken(req);
  if (!token) {
    return res.status(401).json({ success: false, error: 'Pinterest Access Token belum dikonfigurasi.' });
  }

  try {
    const { start_date, end_date, metric_types } = req.query;
    const analytics = await pinterestPublisher.getPinAnalytics(token, req.params.pinId, start_date, end_date, metric_types);
    res.json({ success: true, analytics });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/pinterest/analytics - Read Account-wide Analytics
router.get('/analytics', async (req, res) => {
  const token = getAccessToken(req);
  if (!token) {
    return res.status(401).json({ success: false, error: 'Pinterest Access Token belum dikonfigurasi.' });
  }

  try {
    const { start_date, end_date, metric_types } = req.query;
    const analytics = await pinterestPublisher.getUserAnalytics(token, start_date, end_date, metric_types);
// POST /api/pinterest/verify-session - Verify Pinterest Web Session Cookie
router.post('/verify-session', async (req, res) => {
  try {
    const conn = dbService.getConnections();
    const sessionCookie = req.body.sessionCookie || conn.pinterestSessionCookie || process.env.PINTEREST_SESSION_COOKIE;
    const csrfToken = req.body.csrfToken || conn.pinterestCsrfToken || process.env.PINTEREST_CSRF_TOKEN;

    if (!sessionCookie) {
      return res.status(400).json({ success: false, error: 'Session Cookie wajib diisi.' });
    }

    const profile = await pinterestPublisher.verifySessionCookie(sessionCookie, csrfToken);

    // Auto-update connections if verified
    dbService.updateConnections({
      pinterestSessionCookie: sessionCookie,
      pinterestUsername: profile.username,
      pinterestStatus: 'CONNECTED',
      pinterestApiConnected: true
    });

    res.json({ success: true, profile });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// GET /api/pinterest/session-boards - Read Boards using Pinterest Web Session Cookie
router.get('/session-boards', async (req, res) => {
  try {
    const conn = dbService.getConnections();
    const sessionCookie = req.query.sessionCookie || conn.pinterestSessionCookie || process.env.PINTEREST_SESSION_COOKIE;
    const csrfToken = req.query.csrfToken || conn.pinterestCsrfToken || process.env.PINTEREST_CSRF_TOKEN;

    if (!sessionCookie) {
      return res.status(400).json({ success: false, error: 'Session Cookie belum diisi.' });
    }

    const cookieHeader = pinterestPublisher.buildCookieString(sessionCookie, csrfToken);
    const csrf = pinterestPublisher.extractCsrfToken(cookieHeader);
    const boards = await pinterestPublisher.getWebSessionBoards(cookieHeader, csrf);

    res.json({ success: true, count: boards.length, boards });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
