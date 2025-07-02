const axios = require('axios');
const cheerio = require('cheerio');
const Fuse = require('fuse.js');
const fs = require('fs').promises;
const path = require('path');
const { getDataFromDB, searchDataInDB } = require('../database/queries');

// Web search implementation
async function searchWeb(query, options = {}) {
  const { limit = 10, language = 'de' } = options;
  
  try {
    // Simulate web search (replace with actual search API like Google Custom Search)
    const mockResults = [
      {
        title: `Suchergebnisse für "${query}"`,
        url: `https://example.com/search?q=${encodeURIComponent(query)}`,
        snippet: `Dies ist ein simuliertes Suchergebnis für die Anfrage "${query}". In einer echten Implementierung würde hier eine Search API verwendet werden.`,
        source: 'Web'
      },
      {
        title: `${query} - Wikipedia`,
        url: `https://de.wikipedia.org/wiki/${encodeURIComponent(query)}`,
        snippet: `Wikipedia-Artikel über ${query}. Weitere Informationen finden Sie in der Online-Enzyklopädie.`,
        source: 'Wikipedia'
      }
    ];
    
    return mockResults.slice(0, limit);
  } catch (error) {
    console.error('Web search error:', error);
    throw new Error('Web-Suche nicht verfügbar');
  }
}

// Local database search
async function searchLocal(query, options = {}) {
  const { 
    limit = 20, 
    fuzzy = true, 
    threshold = 0.6, 
    suggestionsOnly = false,
    category 
  } = options;
  
  try {
    let results;
    
    if (suggestionsOnly) {
      // Return simple suggestions for autocomplete
      results = await searchDataInDB(query, { limit: 5, fuzzy: true });
      return results.map(item => item.title);
    }
    
    if (fuzzy) {
      // Get all data for fuzzy search
      const allData = await getDataFromDB({ category });
      
      const fuse = new Fuse(allData, {
        keys: ['title', 'content', 'tags'],
        threshold,
        includeScore: true,
        minMatchCharLength: 2
      });
      
      const searchResults = fuse.search(query);
      results = searchResults.map(result => ({
        ...result.item,
        score: result.score,
        source: 'Local Database'
      })).slice(0, limit);
    } else {
      // Direct database search
      results = await searchDataInDB(query, { limit, category });
      results = results.map(item => ({
        ...item,
        source: 'Local Database'
      }));
    }
    
    return results;
  } catch (error) {
    console.error('Local search error:', error);
    throw new Error('Lokale Suche fehlgeschlagen');
  }
}

// File system search
async function searchFiles(query, searchPath = '.', options = {}) {
  const { 
    limit = 50, 
    extensions = ['.txt', '.md', '.js', '.json', '.csv'], 
    includeContent = true 
  } = options;
  
  try {
    const results = [];
    
    async function searchInDirectory(dir) {
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          
          if (entry.isDirectory() && !entry.name.startsWith('.')) {
            await searchInDirectory(fullPath);
          } else if (entry.isFile()) {
            const ext = path.extname(entry.name);
            
            // Check if file name matches query
            if (entry.name.toLowerCase().includes(query.toLowerCase()) ||
                (extensions.length === 0 || extensions.includes(ext))) {
              
              let content = '';
              let matches = 0;
              
              if (includeContent && ['.txt', '.md', '.js', '.json', '.csv'].includes(ext)) {
                try {
                  content = await fs.readFile(fullPath, 'utf-8');
                  const contentMatches = (content.toLowerCase().match(new RegExp(query.toLowerCase(), 'g')) || []).length;
                  matches = contentMatches;
                } catch (err) {
                  // File might be binary or access denied
                  content = '[Datei konnte nicht gelesen werden]';
                }
              }
              
              if (entry.name.toLowerCase().includes(query.toLowerCase()) || matches > 0) {
                const stats = await fs.stat(fullPath);
                results.push({
                  title: entry.name,
                  path: fullPath,
                  size: stats.size,
                  modified: stats.mtime,
                  matches,
                  snippet: content.length > 200 ? content.substring(0, 200) + '...' : content,
                  source: 'File System'
                });
              }
            }
          }
          
          if (results.length >= limit) break;
        }
      } catch (err) {
        // Directory access denied or other error
        console.warn('Cannot access directory:', dir, err.message);
      }
    }
    
    await searchInDirectory(searchPath);
    
    // Sort by relevance (matches count and name similarity)
    results.sort((a, b) => {
      const aRelevance = a.matches + (a.title.toLowerCase().includes(query.toLowerCase()) ? 10 : 0);
      const bRelevance = b.matches + (b.title.toLowerCase().includes(query.toLowerCase()) ? 10 : 0);
      return bRelevance - aRelevance;
    });
    
    return results.slice(0, limit);
  } catch (error) {
    console.error('File search error:', error);
    throw new Error('Dateisuche fehlgeschlagen');
  }
}

// Advanced search combining multiple sources
async function searchAdvanced(query, sources = ['local', 'files'], options = {}) {
  const { limit = 50 } = options;
  const results = [];
  
  try {
    const searchPromises = [];
    
    if (sources.includes('web')) {
      searchPromises.push(
        searchWeb(query, { limit: Math.ceil(limit / sources.length) })
          .catch(err => ({ error: 'Web search failed', results: [] }))
      );
    }
    
    if (sources.includes('local')) {
      searchPromises.push(
        searchLocal(query, { limit: Math.ceil(limit / sources.length) })
          .catch(err => ({ error: 'Local search failed', results: [] }))
      );
    }
    
    if (sources.includes('files')) {
      searchPromises.push(
        searchFiles(query, options.path || '.', { limit: Math.ceil(limit / sources.length) })
          .catch(err => ({ error: 'File search failed', results: [] }))
      );
    }
    
    const searchResults = await Promise.all(searchPromises);
    
    // Combine and deduplicate results
    const combinedResults = [];
    searchResults.forEach((result, index) => {
      if (Array.isArray(result)) {
        combinedResults.push(...result);
      } else if (result.results) {
        combinedResults.push(...result.results);
      }
    });
    
    // Remove duplicates based on title and content similarity
    const uniqueResults = [];
    combinedResults.forEach(item => {
      const isDuplicate = uniqueResults.some(existing => 
        existing.title === item.title || 
        (existing.content && item.content && existing.content === item.content)
      );
      
      if (!isDuplicate) {
        uniqueResults.push(item);
      }
    });
    
    // Sort by relevance (score if available, otherwise by source priority)
    uniqueResults.sort((a, b) => {
      if (a.score && b.score) return a.score - b.score;
      if (a.matches && b.matches) return b.matches - a.matches;
      return 0;
    });
    
    return uniqueResults.slice(0, limit);
  } catch (error) {
    console.error('Advanced search error:', error);
    throw new Error('Erweiterte Suche fehlgeschlagen');
  }
}

module.exports = {
  searchWeb,
  searchLocal,
  searchFiles,
  searchAdvanced
};