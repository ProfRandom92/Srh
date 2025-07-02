const { runQuery } = require('./init');

// Insert new data entry
async function insertData(data) {
  const { title, content, category, tags, metadata, created_at, updated_at } = data;
  
  const sql = `
    INSERT INTO data_entries (title, content, category, tags, metadata, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;
  
  const params = [
    title,
    content,
    category,
    JSON.stringify(tags),
    JSON.stringify(metadata),
    created_at,
    updated_at
  ];
  
  return await runQuery(sql, params);
}

// Update existing data entry
async function updateDataInDB(id, updates) {
  const fields = [];
  const params = [];
  
  for (const [key, value] of Object.entries(updates)) {
    if (key === 'tags' || key === 'metadata') {
      fields.push(`${key} = ?`);
      params.push(JSON.stringify(value));
    } else {
      fields.push(`${key} = ?`);
      params.push(value);
    }
  }
  
  if (fields.length === 0) {
    throw new Error('Keine Felder zum Aktualisieren angegeben');
  }
  
  params.push(id);
  
  const sql = `UPDATE data_entries SET ${fields.join(', ')} WHERE id = ?`;
  const result = await runQuery(sql, params);
  
  if (result.changes > 0) {
    return await getDataById(id);
  }
  
  return null;
}

// Delete data entry
async function deleteDataFromDB(id) {
  const sql = 'DELETE FROM data_entries WHERE id = ?';
  const result = await runQuery(sql, [id]);
  return result.changes > 0;
}

// Get data by ID
async function getDataById(id) {
  const sql = 'SELECT * FROM data_entries WHERE id = ?';
  const results = await runQuery(sql, [id]);
  
  if (results.length > 0) {
    const data = results[0];
    return parseDataEntry(data);
  }
  
  return null;
}

// Get data with filters and pagination
async function getDataFromDB(options = {}) {
  const { category, search, limit, offset, all = false } = options;
  
  let sql = 'SELECT * FROM data_entries WHERE 1=1';
  const params = [];
  
  // Add category filter
  if (category) {
    sql += ' AND category = ?';
    params.push(category);
  }
  
  // Add search filter
  if (search) {
    sql += ' AND (title LIKE ? OR content LIKE ? OR tags LIKE ?)';
    const searchPattern = `%${search}%`;
    params.push(searchPattern, searchPattern, searchPattern);
  }
  
  // Add ordering
  sql += ' ORDER BY updated_at DESC';
  
  // Add pagination if not requesting all
  if (!all && limit) {
    sql += ' LIMIT ?';
    params.push(limit);
    
    if (offset) {
      sql += ' OFFSET ?';
      params.push(offset);
    }
  }
  
  const results = await runQuery(sql, params);
  return results.map(parseDataEntry);
}

// Search data in database with advanced options
async function searchDataInDB(query, options = {}) {
  const { limit = 20, category, fuzzy = false } = options;
  
  let sql, params;
  
  if (fuzzy) {
    // Use LIKE for fuzzy search
    sql = `
      SELECT *, 
        CASE 
          WHEN title LIKE ? THEN 3
          WHEN content LIKE ? THEN 2
          WHEN tags LIKE ? THEN 1
          ELSE 0
        END as relevance_score
      FROM data_entries 
      WHERE (title LIKE ? OR content LIKE ? OR tags LIKE ?)
    `;
    
    const searchPattern = `%${query}%`;
    params = [searchPattern, searchPattern, searchPattern, searchPattern, searchPattern, searchPattern];
    
    if (category) {
      sql += ' AND category = ?';
      params.push(category);
    }
    
    sql += ' ORDER BY relevance_score DESC, updated_at DESC LIMIT ?';
    params.push(limit);
  } else {
    // Exact search with full-text matching
    sql = `
      SELECT * FROM data_entries 
      WHERE (title LIKE ? OR content LIKE ? OR tags LIKE ?)
    `;
    
    const exactPattern = `%${query}%`;
    params = [exactPattern, exactPattern, exactPattern];
    
    if (category) {
      sql += ' AND category = ?';
      params.push(category);
    }
    
    sql += ' ORDER BY updated_at DESC LIMIT ?';
    params.push(limit);
  }
  
  const results = await runQuery(sql, params);
  return results.map(parseDataEntry);
}

// Bulk insert data
async function bulkInsertData(dataArray) {
  const sql = `
    INSERT INTO data_entries (title, content, category, tags, metadata, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;
  
  const results = [];
  
  for (const data of dataArray) {
    const { title, content, category, tags, metadata, created_at, updated_at } = data;
    
    const params = [
      title,
      content,
      category,
      JSON.stringify(tags),
      JSON.stringify(metadata),
      created_at,
      updated_at
    ];
    
    try {
      const result = await runQuery(sql, params);
      results.push({ success: true, id: result.id });
    } catch (error) {
      results.push({ success: false, error: error.message });
    }
  }
  
  return results;
}

// Get all categories
async function getCategories() {
  const sql = 'SELECT DISTINCT category FROM data_entries ORDER BY category';
  const results = await runQuery(sql);
  return results.map(row => row.category);
}

// Get all tags
async function getAllTags() {
  const sql = 'SELECT tags FROM data_entries WHERE tags IS NOT NULL AND tags != "[]"';
  const results = await runQuery(sql);
  
  const tagSet = new Set();
  
  results.forEach(row => {
    try {
      const tags = JSON.parse(row.tags);
      if (Array.isArray(tags)) {
        tags.forEach(tag => tagSet.add(tag));
      }
    } catch (error) {
      // Ignore invalid JSON
    }
  });
  
  return Array.from(tagSet).sort();
}

// Get data statistics
async function getDataStats() {
  const totalSql = 'SELECT COUNT(*) as total FROM data_entries';
  const categorySql = 'SELECT category, COUNT(*) as count FROM data_entries GROUP BY category';
  
  const [totalResult, categoryResults] = await Promise.all([
    runQuery(totalSql),
    runQuery(categorySql)
  ]);
  
  const categories = {};
  categoryResults.forEach(row => {
    categories[row.category] = row.count;
  });
  
  return {
    total: totalResult[0].total,
    categories
  };
}

// Search history functions
async function addSearchHistory(query, resultsCount, searchType) {
  const sql = `
    INSERT INTO search_history (query, results_count, search_type, timestamp)
    VALUES (?, ?, ?, ?)
  `;
  
  const params = [query, resultsCount, searchType, new Date().toISOString()];
  return await runQuery(sql, params);
}

async function getSearchHistory(limit = 10) {
  const sql = `
    SELECT * FROM search_history 
    ORDER BY timestamp DESC 
    LIMIT ?
  `;
  
  return await runQuery(sql, [limit]);
}

// Helper function to parse data entry from database
function parseDataEntry(row) {
  const parsed = { ...row };
  
  // Parse JSON fields
  try {
    parsed.tags = JSON.parse(row.tags || '[]');
  } catch (error) {
    parsed.tags = [];
  }
  
  try {
    parsed.metadata = JSON.parse(row.metadata || '{}');
  } catch (error) {
    parsed.metadata = {};
  }
  
  return parsed;
}

// Clean up old search history
async function cleanupSearchHistory(daysToKeep = 30) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
  
  const sql = 'DELETE FROM search_history WHERE timestamp < ?';
  const result = await runQuery(sql, [cutoffDate.toISOString()]);
  
  return result.changes;
}

module.exports = {
  insertData,
  updateDataInDB,
  deleteDataFromDB,
  getDataById,
  getDataFromDB,
  searchDataInDB,
  bulkInsertData,
  getCategories,
  getAllTags,
  getDataStats,
  addSearchHistory,
  getSearchHistory,
  cleanupSearchHistory
};