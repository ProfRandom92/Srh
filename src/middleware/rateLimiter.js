const { RateLimiterMemory, RateLimiterRedis } = require('rate-limiter-flexible');

// Configure rate limiters based on environment
const useRedis = process.env.REDIS_URL && process.env.NODE_ENV === 'production';

// General API rate limiter
const apiRateLimiter = useRedis ? 
  new RateLimiterRedis({
    storeClient: require('redis').createClient(process.env.REDIS_URL),
    keyPrefix: 'api_limit',
    points: 100, // Number of requests
    duration: 60, // Per 60 seconds
    blockDuration: 60, // Block for 60 seconds if limit exceeded
  }) :
  new RateLimiterMemory({
    keyPrefix: 'api_limit',
    points: 100,
    duration: 60,
    blockDuration: 60,
  });

// Search rate limiter (more restrictive)
const searchRateLimiter = useRedis ?
  new RateLimiterRedis({
    storeClient: require('redis').createClient(process.env.REDIS_URL),
    keyPrefix: 'search_limit',
    points: 30, // Number of search requests
    duration: 60, // Per 60 seconds
    blockDuration: 120, // Block for 2 minutes if limit exceeded
  }) :
  new RateLimiterMemory({
    keyPrefix: 'search_limit',
    points: 30,
    duration: 60,
    blockDuration: 120,
  });

// Data modification rate limiter (very restrictive)
const dataModificationRateLimiter = useRedis ?
  new RateLimiterRedis({
    storeClient: require('redis').createClient(process.env.REDIS_URL),
    keyPrefix: 'data_mod_limit',
    points: 10, // Number of data modification requests
    duration: 60, // Per 60 seconds
    blockDuration: 300, // Block for 5 minutes if limit exceeded
  }) :
  new RateLimiterMemory({
    keyPrefix: 'data_mod_limit',
    points: 10,
    duration: 60,
    blockDuration: 300,
  });

// Import rate limiter (extremely restrictive)
const importRateLimiter = useRedis ?
  new RateLimiterRedis({
    storeClient: require('redis').createClient(process.env.REDIS_URL),
    keyPrefix: 'import_limit',
    points: 3, // Number of import requests
    duration: 3600, // Per hour
    blockDuration: 3600, // Block for 1 hour if limit exceeded
  }) :
  new RateLimiterMemory({
    keyPrefix: 'import_limit',
    points: 3,
    duration: 3600,
    blockDuration: 3600,
  });

// General rate limiter middleware
async function rateLimiter(req, res, next) {
  try {
    const key = req.ip || req.connection.remoteAddress;
    await apiRateLimiter.consume(key);
    next();
  } catch (rateLimiterRes) {
    const remainingPoints = rateLimiterRes.remainingPoints;
    const msBeforeNext = rateLimiterRes.msBeforeNext;
    
    res.set({
      'Retry-After': Math.round(msBeforeNext / 1000) || 1,
      'X-RateLimit-Limit': 100,
      'X-RateLimit-Remaining': remainingPoints,
      'X-RateLimit-Reset': new Date(Date.now() + msBeforeNext).toISOString(),
    });
    
    res.status(429).json({
      success: false,
      error: 'Zu viele Anfragen',
      message: 'Rate Limit überschritten. Bitte versuchen Sie es später erneut.',
      retryAfter: Math.round(msBeforeNext / 1000)
    });
  }
}

// Search-specific rate limiter middleware
async function searchRateLimit(req, res, next) {
  try {
    const key = req.ip || req.connection.remoteAddress;
    await searchRateLimiter.consume(key);
    next();
  } catch (rateLimiterRes) {
    const remainingPoints = rateLimiterRes.remainingPoints;
    const msBeforeNext = rateLimiterRes.msBeforeNext;
    
    res.set({
      'Retry-After': Math.round(msBeforeNext / 1000) || 1,
      'X-RateLimit-Limit': 30,
      'X-RateLimit-Remaining': remainingPoints,
      'X-RateLimit-Reset': new Date(Date.now() + msBeforeNext).toISOString(),
    });
    
    res.status(429).json({
      success: false,
      error: 'Such-Rate-Limit überschritten',
      message: 'Zu viele Suchanfragen. Bitte warten Sie vor dem nächsten Versuch.',
      retryAfter: Math.round(msBeforeNext / 1000)
    });
  }
}

// Data modification rate limiter middleware
async function dataModificationRateLimit(req, res, next) {
  try {
    const key = req.ip || req.connection.remoteAddress;
    await dataModificationRateLimiter.consume(key);
    next();
  } catch (rateLimiterRes) {
    const remainingPoints = rateLimiterRes.remainingPoints;
    const msBeforeNext = rateLimiterRes.msBeforeNext;
    
    res.set({
      'Retry-After': Math.round(msBeforeNext / 1000) || 1,
      'X-RateLimit-Limit': 10,
      'X-RateLimit-Remaining': remainingPoints,
      'X-RateLimit-Reset': new Date(Date.now() + msBeforeNext).toISOString(),
    });
    
    res.status(429).json({
      success: false,
      error: 'Datenänderungs-Rate-Limit überschritten',
      message: 'Zu viele Datenänderungen. Bitte warten Sie vor weiteren Änderungen.',
      retryAfter: Math.round(msBeforeNext / 1000)
    });
  }
}

// Import rate limiter middleware
async function importRateLimit(req, res, next) {
  try {
    const key = req.ip || req.connection.remoteAddress;
    await importRateLimiter.consume(key);
    next();
  } catch (rateLimiterRes) {
    const remainingPoints = rateLimiterRes.remainingPoints;
    const msBeforeNext = rateLimiterRes.msBeforeNext;
    
    res.set({
      'Retry-After': Math.round(msBeforeNext / 1000) || 1,
      'X-RateLimit-Limit': 3,
      'X-RateLimit-Remaining': remainingPoints,
      'X-RateLimit-Reset': new Date(Date.now() + msBeforeNext).toISOString(),
    });
    
    res.status(429).json({
      success: false,
      error: 'Import-Rate-Limit überschritten',
      message: 'Zu viele Import-Vorgänge. Bitte warten Sie eine Stunde vor dem nächsten Import.',
      retryAfter: Math.round(msBeforeNext / 1000)
    });
  }
}

// Health check for rate limiters
async function rateLimiterHealthCheck() {
  try {
    const testKey = 'health_check_' + Date.now();
    await apiRateLimiter.consume(testKey, 0); // Consume 0 points for testing
    return { status: 'healthy', timestamp: new Date().toISOString() };
  } catch (error) {
    return { 
      status: 'unhealthy', 
      error: error.message, 
      timestamp: new Date().toISOString() 
    };
  }
}

// Get rate limit status for a key
async function getRateLimitStatus(key, limiterType = 'api') {
  try {
    let limiter;
    let maxPoints;
    
    switch (limiterType) {
      case 'search':
        limiter = searchRateLimiter;
        maxPoints = 30;
        break;
      case 'dataModification':
        limiter = dataModificationRateLimiter;
        maxPoints = 10;
        break;
      case 'import':
        limiter = importRateLimiter;
        maxPoints = 3;
        break;
      default:
        limiter = apiRateLimiter;
        maxPoints = 100;
    }
    
    const resRateLimiter = await limiter.get(key);
    
    if (resRateLimiter) {
      return {
        limit: maxPoints,
        remaining: resRateLimiter.remainingPoints || maxPoints,
        reset: new Date(Date.now() + resRateLimiter.msBeforeNext).toISOString(),
        blocked: resRateLimiter.msBeforeNext > resRateLimiter.duration
      };
    } else {
      return {
        limit: maxPoints,
        remaining: maxPoints,
        reset: null,
        blocked: false
      };
    }
  } catch (error) {
    return {
      error: 'Rate limit status nicht verfügbar',
      message: error.message
    };
  }
}

// Middleware to add rate limit headers to all responses
function addRateLimitHeaders(req, res, next) {
  const originalSend = res.send;
  
  res.send = function(data) {
    // Add common rate limit headers
    res.set({
      'X-RateLimit-API-Limit': '100',
      'X-RateLimit-Search-Limit': '30',
      'X-RateLimit-Data-Limit': '10',
      'X-RateLimit-Import-Limit': '3'
    });
    
    originalSend.call(this, data);
  };
  
  next();
}

module.exports = {
  rateLimiter,
  searchRateLimit,
  dataModificationRateLimit,
  importRateLimit,
  rateLimiterHealthCheck,
  getRateLimitStatus,
  addRateLimitHeaders
};