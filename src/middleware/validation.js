// Validation middleware for search queries
function validateSearchQuery(req, res, next) {
  const { query } = req.body;
  
  // Check if query exists and is not empty
  if (!query || typeof query !== 'string' || query.trim().length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Suchanfrage ist erforderlich',
      message: 'Bitte geben Sie eine gültige Suchanfrage ein'
    });
  }
  
  // Check query length
  if (query.length > 500) {
    return res.status(400).json({
      success: false,
      error: 'Suchanfrage zu lang',
      message: 'Suchanfrage darf maximal 500 Zeichen lang sein'
    });
  }
  
  // Sanitize query
  req.body.query = query.trim();
  
  next();
}

// Validation middleware for data input
function validateDataInput(req, res, next) {
  const { title, content, category, tags, metadata } = req.body;
  const errors = [];
  
  // Validate required fields
  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    errors.push('Titel ist erforderlich und muss ein nicht-leerer String sein');
  }
  
  if (!content || typeof content !== 'string' || content.trim().length === 0) {
    errors.push('Inhalt ist erforderlich und muss ein nicht-leerer String sein');
  }
  
  // Validate optional fields
  if (category && typeof category !== 'string') {
    errors.push('Kategorie muss ein String sein');
  }
  
  if (tags && !Array.isArray(tags)) {
    errors.push('Tags müssen als Array angegeben werden');
  }
  
  if (metadata && typeof metadata !== 'object') {
    errors.push('Metadaten müssen ein Objekt sein');
  }
  
  // Check field lengths
  if (title && title.length > 255) {
    errors.push('Titel darf maximal 255 Zeichen lang sein');
  }
  
  if (content && content.length > 10000) {
    errors.push('Inhalt darf maximal 10.000 Zeichen lang sein');
  }
  
  if (category && category.length > 50) {
    errors.push('Kategorie darf maximal 50 Zeichen lang sein');
  }
  
  if (tags && tags.length > 20) {
    errors.push('Maximal 20 Tags sind erlaubt');
  }
  
  if (tags && tags.some(tag => typeof tag !== 'string' || tag.length > 50)) {
    errors.push('Jeder Tag muss ein String mit maximal 50 Zeichen sein');
  }
  
  // Return validation errors if any
  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      error: 'Validierungsfehler',
      messages: errors
    });
  }
  
  // Sanitize input
  if (title) req.body.title = title.trim();
  if (content) req.body.content = content.trim();
  if (category) req.body.category = category.trim().toLowerCase();
  if (tags) req.body.tags = tags.map(tag => tag.trim());
  
  next();
}

// Validation middleware for pagination parameters
function validatePagination(req, res, next) {
  const { page, limit } = req.query;
  
  if (page) {
    const pageNum = parseInt(page);
    if (isNaN(pageNum) || pageNum < 1) {
      return res.status(400).json({
        success: false,
        error: 'Ungültige Seitenzahl',
        message: 'Seitenzahl muss eine positive Ganzzahl sein'
      });
    }
    req.query.page = pageNum;
  }
  
  if (limit) {
    const limitNum = parseInt(limit);
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      return res.status(400).json({
        success: false,
        error: 'Ungültiges Limit',
        message: 'Limit muss zwischen 1 und 100 liegen'
      });
    }
    req.query.limit = limitNum;
  }
  
  next();
}

// Validation middleware for ID parameters
function validateId(req, res, next) {
  const { id } = req.params;
  
  if (!id || isNaN(parseInt(id))) {
    return res.status(400).json({
      success: false,
      error: 'Ungültige ID',
      message: 'ID muss eine gültige Ganzzahl sein'
    });
  }
  
  req.params.id = parseInt(id);
  next();
}

// Validation middleware for import data
function validateImportData(req, res, next) {
  const { data } = req.body;
  
  if (!data || !Array.isArray(data)) {
    return res.status(400).json({
      success: false,
      error: 'Ungültige Importdaten',
      message: 'Daten müssen als Array bereitgestellt werden'
    });
  }
  
  if (data.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Leere Importdaten',
      message: 'Mindestens ein Dateneintrag ist erforderlich'
    });
  }
  
  if (data.length > 1000) {
    return res.status(400).json({
      success: false,
      error: 'Zu viele Einträge',
      message: 'Maximal 1000 Einträge pro Import erlaubt'
    });
  }
  
  next();
}

// Validation middleware for file search paths
function validateFilePath(req, res, next) {
  const { path } = req.body;
  
  if (path && typeof path !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'Ungültiger Pfad',
      message: 'Pfad muss ein String sein'
    });
  }
  
  // Basic security check - prevent directory traversal
  if (path && (path.includes('..') || path.includes('~') || path.startsWith('/'))) {
    return res.status(400).json({
      success: false,
      error: 'Unsicherer Pfad',
      message: 'Pfad enthält nicht erlaubte Zeichen'
    });
  }
  
  next();
}

// General request size validation
function validateRequestSize(maxSize = '10mb') {
  return (req, res, next) => {
    const contentLength = parseInt(req.get('content-length'));
    const maxSizeBytes = parseSize(maxSize);
    
    if (contentLength && contentLength > maxSizeBytes) {
      return res.status(413).json({
        success: false,
        error: 'Anfrage zu groß',
        message: `Maximale Größe: ${maxSize}`
      });
    }
    
    next();
  };
}

// Helper function to parse size strings like '10mb'
function parseSize(size) {
  const units = {
    'b': 1,
    'kb': 1024,
    'mb': 1024 * 1024,
    'gb': 1024 * 1024 * 1024
  };
  
  const match = size.toLowerCase().match(/^(\d+)([a-z]+)$/);
  if (!match) return 0;
  
  const [, num, unit] = match;
  return parseInt(num) * (units[unit] || 0);
}

// Sanitize HTML input to prevent XSS
function sanitizeInput(input) {
  if (typeof input !== 'string') return input;
  
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

// Middleware to sanitize all string inputs
function sanitizeAllInputs(req, res, next) {
  function sanitizeObject(obj) {
    for (const key in obj) {
      if (typeof obj[key] === 'string') {
        obj[key] = sanitizeInput(obj[key]);
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        sanitizeObject(obj[key]);
      }
    }
  }
  
  if (req.body && typeof req.body === 'object') {
    sanitizeObject(req.body);
  }
  
  if (req.query && typeof req.query === 'object') {
    sanitizeObject(req.query);
  }
  
  next();
}

module.exports = {
  validateSearchQuery,
  validateDataInput,
  validatePagination,
  validateId,
  validateImportData,
  validateFilePath,
  validateRequestSize,
  sanitizeInput,
  sanitizeAllInputs
};