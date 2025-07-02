const { insertData, updateDataInDB, deleteDataFromDB, getDataFromDB, bulkInsertData } = require('../database/queries');

// Add new data entry
async function addData({ title, content, category = 'general', tags = [], metadata = {} }) {
  try {
    if (!title || !content) {
      throw new Error('Titel und Inhalt sind erforderlich');
    }
    
    const dataEntry = {
      title: title.trim(),
      content: content.trim(),
      category: category.toLowerCase(),
      tags: Array.isArray(tags) ? tags : [tags],
      metadata: typeof metadata === 'object' ? metadata : {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    const result = await insertData(dataEntry);
    return { id: result.id, ...dataEntry };
  } catch (error) {
    console.error('Add data error:', error);
    throw new Error(`Fehler beim Hinzufügen der Daten: ${error.message}`);
  }
}

// Update existing data entry
async function updateData(id, { title, content, category, tags, metadata }) {
  try {
    if (!id) {
      throw new Error('ID ist erforderlich');
    }
    
    const updates = {
      updated_at: new Date().toISOString()
    };
    
    if (title !== undefined) updates.title = title.trim();
    if (content !== undefined) updates.content = content.trim();
    if (category !== undefined) updates.category = category.toLowerCase();
    if (tags !== undefined) updates.tags = Array.isArray(tags) ? tags : [tags];
    if (metadata !== undefined) updates.metadata = typeof metadata === 'object' ? metadata : {};
    
    const result = await updateDataInDB(id, updates);
    
    if (!result) {
      return null;
    }
    
    return result;
  } catch (error) {
    console.error('Update data error:', error);
    throw new Error(`Fehler beim Aktualisieren der Daten: ${error.message}`);
  }
}

// Delete data entry
async function deleteData(id) {
  try {
    if (!id) {
      throw new Error('ID ist erforderlich');
    }
    
    const result = await deleteDataFromDB(id);
    return result;
  } catch (error) {
    console.error('Delete data error:', error);
    throw new Error(`Fehler beim Löschen der Daten: ${error.message}`);
  }
}

// Get data with pagination and filtering
async function getData(options = {}) {
  try {
    const { 
      page = 1, 
      limit = 50, 
      category, 
      search, 
      all = false,
      statsOnly = false 
    } = options;
    
    if (statsOnly) {
      // Return statistics about the data
      const allData = await getDataFromDB({ all: true });
      const categories = {};
      let totalTags = new Set();
      
      allData.forEach(item => {
        categories[item.category] = (categories[item.category] || 0) + 1;
        if (item.tags) {
          item.tags.forEach(tag => totalTags.add(tag));
        }
      });
      
      return {
        totalEntries: allData.length,
        categories,
        totalCategories: Object.keys(categories).length,
        totalTags: totalTags.size,
        lastUpdated: allData.length > 0 ? Math.max(...allData.map(item => new Date(item.updated_at).getTime())) : null
      };
    }
    
    if (all) {
      const data = await getDataFromDB({ category, search });
      return {
        entries: data,
        total: data.length
      };
    }
    
    const offset = (page - 1) * limit;
    const data = await getDataFromDB({ 
      category, 
      search, 
      limit, 
      offset 
    });
    
    // Get total count for pagination
    const totalData = await getDataFromDB({ category, search });
    
    return {
      entries: data,
      total: totalData.length
    };
  } catch (error) {
    console.error('Get data error:', error);
    throw new Error(`Fehler beim Abrufen der Daten: ${error.message}`);
  }
}

// Import bulk data
async function importData(dataArray, format = 'json') {
  try {
    if (!Array.isArray(dataArray)) {
      throw new Error('Daten müssen als Array bereitgestellt werden');
    }
    
    let imported = 0;
    let failed = 0;
    const errors = [];
    
    // Validate and prepare data
    const validData = [];
    
    for (let i = 0; i < dataArray.length; i++) {
      const item = dataArray[i];
      
      try {
        if (!item.title || !item.content) {
          throw new Error('Titel und Inhalt sind erforderlich');
        }
        
        const dataEntry = {
          title: item.title.trim(),
          content: item.content.trim(),
          category: (item.category || 'general').toLowerCase(),
          tags: Array.isArray(item.tags) ? item.tags : (item.tags ? [item.tags] : []),
          metadata: typeof item.metadata === 'object' ? item.metadata : {},
          created_at: item.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        validData.push(dataEntry);
        imported++;
      } catch (error) {
        failed++;
        errors.push({ index: i, error: error.message });
      }
    }
    
    // Bulk insert valid data
    if (validData.length > 0) {
      await bulkInsertData(validData);
    }
    
    return {
      imported,
      failed,
      errors: errors.length > 10 ? errors.slice(0, 10) : errors // Limit error reporting
    };
  } catch (error) {
    console.error('Import data error:', error);
    throw new Error(`Fehler beim Importieren der Daten: ${error.message}`);
  }
}

// Validate data structure
function validateDataStructure(data) {
  const requiredFields = ['title', 'content'];
  const optionalFields = ['category', 'tags', 'metadata'];
  
  for (const field of requiredFields) {
    if (!data[field] || typeof data[field] !== 'string' || data[field].trim().length === 0) {
      throw new Error(`Feld '${field}' ist erforderlich und muss ein nicht-leerer String sein`);
    }
  }
  
  if (data.category && typeof data.category !== 'string') {
    throw new Error("Feld 'category' muss ein String sein");
  }
  
  if (data.tags && !Array.isArray(data.tags)) {
    throw new Error("Feld 'tags' muss ein Array sein");
  }
  
  if (data.metadata && typeof data.metadata !== 'object') {
    throw new Error("Feld 'metadata' muss ein Objekt sein");
  }
  
  return true;
}

// Get data suggestions for autocomplete
async function getDataSuggestions(query, options = {}) {
  try {
    const { limit = 5, type = 'title' } = options;
    
    const data = await getDataFromDB({ search: query, limit: limit * 3 });
    
    let suggestions = [];
    
    if (type === 'title') {
      suggestions = data.map(item => item.title).filter(title => 
        title.toLowerCase().includes(query.toLowerCase())
      );
    } else if (type === 'category') {
      const categories = [...new Set(data.map(item => item.category))];
      suggestions = categories.filter(category => 
        category.toLowerCase().includes(query.toLowerCase())
      );
    } else if (type === 'tags') {
      const allTags = new Set();
      data.forEach(item => {
        if (item.tags) {
          item.tags.forEach(tag => {
            if (tag.toLowerCase().includes(query.toLowerCase())) {
              allTags.add(tag);
            }
          });
        }
      });
      suggestions = Array.from(allTags);
    }
    
    return suggestions.slice(0, limit);
  } catch (error) {
    console.error('Get suggestions error:', error);
    throw new Error(`Fehler beim Abrufen der Vorschläge: ${error.message}`);
  }
}

module.exports = {
  addData,
  updateData,
  deleteData,
  getData,
  importData,
  validateDataStructure,
  getDataSuggestions
};