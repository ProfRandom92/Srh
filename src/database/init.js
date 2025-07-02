const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs').promises;

let db;

// Database configuration
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../data/srh.db');
const DB_DIR = path.dirname(DB_PATH);

// Initialize database connection and create tables
async function initializeDatabase() {
  try {
    // Ensure data directory exists
    await fs.mkdir(DB_DIR, { recursive: true });
    
    // Create database connection
    db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        console.error('Fehler beim Öffnen der Datenbank:', err.message);
        throw err;
      }
      console.log('✅ Verbindung zur SQLite-Datenbank hergestellt');
    });
    
    // Enable foreign keys
    await runQuery('PRAGMA foreign_keys = ON');
    
    // Create tables
    await createTables();
    
    // Insert sample data if database is empty
    await insertSampleData();
    
    return db;
  } catch (error) {
    console.error('Fehler bei der Datenbankinitialisierung:', error);
    throw error;
  }
}

// Create database tables
async function createTables() {
  const createDataTable = `
    CREATE TABLE IF NOT EXISTS data_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      category TEXT DEFAULT 'general',
      tags TEXT, -- JSON array as string
      metadata TEXT, -- JSON object as string
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `;
  
  const createSearchHistoryTable = `
    CREATE TABLE IF NOT EXISTS search_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      query TEXT NOT NULL,
      results_count INTEGER DEFAULT 0,
      search_type TEXT DEFAULT 'local',
      timestamp TEXT NOT NULL
    )
  `;
  
  const createIndexes = [
    'CREATE INDEX IF NOT EXISTS idx_data_title ON data_entries(title)',
    'CREATE INDEX IF NOT EXISTS idx_data_category ON data_entries(category)',
    'CREATE INDEX IF NOT EXISTS idx_data_created ON data_entries(created_at)',
    'CREATE INDEX IF NOT EXISTS idx_search_timestamp ON search_history(timestamp)'
  ];
  
  try {
    await runQuery(createDataTable);
    await runQuery(createSearchHistoryTable);
    
    for (const indexQuery of createIndexes) {
      await runQuery(indexQuery);
    }
    
    console.log('✅ Datenbanktabellen erfolgreich erstellt');
  } catch (error) {
    console.error('Fehler beim Erstellen der Tabellen:', error);
    throw error;
  }
}

// Insert sample data if database is empty
async function insertSampleData() {
  try {
    const countResult = await runQuery('SELECT COUNT(*) as count FROM data_entries');
    const count = countResult[0].count;
    
    if (count === 0) {
      console.log('📝 Füge Beispieldaten hinzu...');
      
      const sampleData = [
        {
          title: 'Willkommen bei Srh',
          content: 'Srh ist ein intelligentes Such-Tool, das verschiedene Datenquellen durchsuchen kann. Sie können lokale Daten, Dateien und Web-Inhalte durchsuchen.',
          category: 'tutorial',
          tags: JSON.stringify(['willkommen', 'anleitung', 'erste-schritte']),
          metadata: JSON.stringify({ priority: 'high', featured: true }),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          title: 'Lokale Suche verwenden',
          content: 'Die lokale Suche durchsucht alle in der Datenbank gespeicherten Inhalte. Sie unterstützt sowohl exakte als auch unscharfe Suche mit Fuzzy-Matching.',
          category: 'tutorial',
          tags: JSON.stringify(['suche', 'lokal', 'fuzzy-matching']),
          metadata: JSON.stringify({ difficulty: 'beginner' }),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          title: 'Dateisuche konfigurieren',
          content: 'Mit der Dateisuche können Sie Inhalte in Dateien auf Ihrem System finden. Unterstützte Formate sind .txt, .md, .js, .json und .csv.',
          category: 'tutorial',
          tags: JSON.stringify(['dateien', 'suche', 'konfiguration']),
          metadata: JSON.stringify({ difficulty: 'intermediate' }),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          title: 'API-Referenz',
          content: 'Srh bietet eine REST-API für alle Suchfunktionen. Endpunkte: /api/search/local, /api/search/files, /api/search/web, /api/search/advanced',
          category: 'dokumentation',
          tags: JSON.stringify(['api', 'rest', 'endpunkte']),
          metadata: JSON.stringify({ type: 'reference' }),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          title: 'Daten importieren',
          content: 'Sie können Daten in Stapeln über die Import-Funktion hinzufügen. Unterstützte Formate sind JSON-Arrays mit title, content, category, tags und metadata Feldern.',
          category: 'datenmanagement',
          tags: JSON.stringify(['import', 'batch', 'daten']),
          metadata: JSON.stringify({ difficulty: 'advanced' }),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];
      
      for (const data of sampleData) {
        await runQuery(
          `INSERT INTO data_entries (title, content, category, tags, metadata, created_at, updated_at) 
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [data.title, data.content, data.category, data.tags, data.metadata, data.created_at, data.updated_at]
        );
      }
      
      console.log('✅ Beispieldaten erfolgreich hinzugefügt');
    }
  } catch (error) {
    console.error('Fehler beim Hinzufügen der Beispieldaten:', error);
    // Don't throw here, as this is not critical
  }
}

// Helper function to run database queries with promises
function runQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    if (sql.trim().toUpperCase().startsWith('SELECT')) {
      db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    } else {
      db.run(sql, params, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id: this.lastID, changes: this.changes });
        }
      });
    }
  });
}

// Get database instance
function getDatabase() {
  if (!db) {
    throw new Error('Datenbank ist nicht initialisiert. Rufen Sie initializeDatabase() auf.');
  }
  return db;
}

// Close database connection
function closeDatabase() {
  return new Promise((resolve, reject) => {
    if (db) {
      db.close((err) => {
        if (err) {
          reject(err);
        } else {
          console.log('✅ Datenbankverbindung geschlossen');
          resolve();
        }
      });
    } else {
      resolve();
    }
  });
}

// Database health check
async function healthCheck() {
  try {
    await runQuery('SELECT 1');
    return { status: 'healthy', timestamp: new Date().toISOString() };
  } catch (error) {
    return { status: 'unhealthy', error: error.message, timestamp: new Date().toISOString() };
  }
}

module.exports = {
  initializeDatabase,
  getDatabase,
  closeDatabase,
  runQuery,
  healthCheck
};