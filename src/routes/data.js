const express = require('express');
const router = express.Router();
const { addData, updateData, deleteData, getData, importData } = require('../services/dataService');
const { validateDataInput } = require('../middleware/validation');

// Get all data entries
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 50, category, search } = req.query;
    const data = await getData({ page, limit, category, search });
    res.json({
      success: true,
      data: data.entries,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: data.total,
        totalPages: Math.ceil(data.total / limit)
      }
    });
  } catch (error) {
    console.error('Get data error:', error);
    res.status(500).json({
      success: false,
      error: 'Daten konnten nicht geladen werden'
    });
  }
});

// Add new data entry
router.post('/', validateDataInput, async (req, res) => {
  try {
    const { title, content, category, tags, metadata } = req.body;
    const result = await addData({ title, content, category, tags, metadata });
    res.status(201).json({
      success: true,
      data: result,
      message: 'Daten erfolgreich hinzugefügt'
    });
  } catch (error) {
    console.error('Add data error:', error);
    res.status(500).json({
      success: false,
      error: 'Daten konnten nicht hinzugefügt werden'
    });
  }
});

// Update existing data entry
router.put('/:id', validateDataInput, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, category, tags, metadata } = req.body;
    const result = await updateData(id, { title, content, category, tags, metadata });
    
    if (!result) {
      return res.status(404).json({
        success: false,
        error: 'Dateneintrag nicht gefunden'
      });
    }
    
    res.json({
      success: true,
      data: result,
      message: 'Daten erfolgreich aktualisiert'
    });
  } catch (error) {
    console.error('Update data error:', error);
    res.status(500).json({
      success: false,
      error: 'Daten konnten nicht aktualisiert werden'
    });
  }
});

// Delete data entry
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await deleteData(id);
    
    if (!result) {
      return res.status(404).json({
        success: false,
        error: 'Dateneintrag nicht gefunden'
      });
    }
    
    res.json({
      success: true,
      message: 'Daten erfolgreich gelöscht'
    });
  } catch (error) {
    console.error('Delete data error:', error);
    res.status(500).json({
      success: false,
      error: 'Daten konnten nicht gelöscht werden'
    });
  }
});

// Import bulk data
router.post('/import', async (req, res) => {
  try {
    const { data, format = 'json' } = req.body;
    
    if (!data || !Array.isArray(data)) {
      return res.status(400).json({
        success: false,
        error: 'Ungültiges Datenformat. Array erwartet.'
      });
    }
    
    const result = await importData(data, format);
    res.json({
      success: true,
      imported: result.imported,
      failed: result.failed,
      message: `${result.imported} Einträge erfolgreich importiert`
    });
  } catch (error) {
    console.error('Import data error:', error);
    res.status(500).json({
      success: false,
      error: 'Datenimport fehlgeschlagen'
    });
  }
});

// Export data
router.get('/export', async (req, res) => {
  try {
    const { format = 'json', category } = req.query;
    const data = await getData({ category, all: true });
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="srh-export-${Date.now()}.json"`);
    res.json({
      exported_at: new Date().toISOString(),
      total_entries: data.total,
      data: data.entries
    });
  } catch (error) {
    console.error('Export data error:', error);
    res.status(500).json({
      success: false,
      error: 'Datenexport fehlgeschlagen'
    });
  }
});

// Get data statistics
router.get('/stats', async (req, res) => {
  try {
    const stats = await getData({ statsOnly: true });
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Statistiken konnten nicht geladen werden'
    });
  }
});

module.exports = router;