const express = require('express');
const router = express.Router();
const { searchWeb, searchLocal, searchFiles, searchAdvanced } = require('../services/searchService');
const { validateSearchQuery } = require('../middleware/validation');

// Web search endpoint
router.post('/web', validateSearchQuery, async (req, res) => {
  try {
    const { query, options = {} } = req.body;
    const results = await searchWeb(query, options);
    res.json({
      success: true,
      results,
      query,
      timestamp: new Date().toISOString(),
      type: 'web'
    });
  } catch (error) {
    console.error('Web search error:', error);
    res.status(500).json({
      success: false,
      error: 'Web-Suche fehlgeschlagen',
      message: error.message
    });
  }
});

// Local data search endpoint
router.post('/local', validateSearchQuery, async (req, res) => {
  try {
    const { query, options = {} } = req.body;
    const results = await searchLocal(query, options);
    res.json({
      success: true,
      results,
      query,
      timestamp: new Date().toISOString(),
      type: 'local'
    });
  } catch (error) {
    console.error('Local search error:', error);
    res.status(500).json({
      success: false,
      error: 'Lokale Suche fehlgeschlagen',
      message: error.message
    });
  }
});

// File search endpoint
router.post('/files', validateSearchQuery, async (req, res) => {
  try {
    const { query, path = '.', options = {} } = req.body;
    const results = await searchFiles(query, path, options);
    res.json({
      success: true,
      results,
      query,
      path,
      timestamp: new Date().toISOString(),
      type: 'files'
    });
  } catch (error) {
    console.error('File search error:', error);
    res.status(500).json({
      success: false,
      error: 'Datei-Suche fehlgeschlagen',
      message: error.message
    });
  }
});

// Advanced search with multiple sources
router.post('/advanced', validateSearchQuery, async (req, res) => {
  try {
    const { query, sources = ['local', 'files'], options = {} } = req.body;
    const results = await searchAdvanced(query, sources, options);
    res.json({
      success: true,
      results,
      query,
      sources,
      timestamp: new Date().toISOString(),
      type: 'advanced'
    });
  } catch (error) {
    console.error('Advanced search error:', error);
    res.status(500).json({
      success: false,
      error: 'Erweiterte Suche fehlgeschlagen',
      message: error.message
    });
  }
});

// Get search suggestions
router.get('/suggestions', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) {
      return res.json({ suggestions: [] });
    }
    
    // Get suggestions from local data
    const suggestions = await searchLocal(q, { 
      limit: 5, 
      fuzzy: true,
      suggestionsOnly: true 
    });
    
    res.json({ suggestions });
  } catch (error) {
    console.error('Suggestions error:', error);
    res.status(500).json({
      success: false,
      error: 'Vorschläge konnten nicht geladen werden'
    });
  }
});

// Get search history
router.get('/history', async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    // TODO: Implement search history from database
    res.json({
      success: true,
      history: [],
      message: 'Suchverlauf wird in zukünftiger Version implementiert'
    });
  } catch (error) {
    console.error('History error:', error);
    res.status(500).json({
      success: false,
      error: 'Suchverlauf konnte nicht geladen werden'
    });
  }
});

module.exports = router;