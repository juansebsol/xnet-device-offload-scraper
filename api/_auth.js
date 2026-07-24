// api/_auth.js
// Shared API key auth for all Vercel routes.
// Expect: Authorization: Bearer <api_key>

const { supabase } = require('./_supabase');

const VALID_SCOPES = new Set(['read', 'write', 'trigger']);

function applyCors(res, methods = 'GET, POST, DELETE, OPTIONS') {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', methods);
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

function extractBearerToken(req) {
  const header = String(req.headers.authorization || req.headers.Authorization || '').trim();
  if (!header) return '';

  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) return '';
  return match[1].trim();
}

function hasRequiredScopes(keyScopes, requiredScopes) {
  if (!requiredScopes || requiredScopes.length === 0) return true;
  const scopes = Array.isArray(keyScopes) ? keyScopes : [];
  return requiredScopes.every((scope) => scopes.includes(scope));
}

async function touchLastUsed(keyId) {
  try {
    await supabase
      .from('api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', keyId);
  } catch (error) {
    console.warn('Failed to update api_keys.last_used_at:', error.message);
  }
}

/**
 * Authenticate request against api_keys table.
 * @param {object} req
 * @param {object} res
 * @param {string[]} requiredScopes e.g. ['read'] | ['write'] | ['trigger']
 * @returns {Promise<{ ok: true, apiKey: object } | { ok: false }>}
 */
async function requireApiKey(req, res, requiredScopes = []) {
  const invalidScopes = requiredScopes.filter((scope) => !VALID_SCOPES.has(scope));
  if (invalidScopes.length > 0) {
    res.status(500).json({ error: 'Server auth misconfigured', details: { invalidScopes } });
    return { ok: false };
  }

  const token = extractBearerToken(req);
  if (!token) {
    res.status(401).json({
      error: 'Unauthorized',
      details: 'Missing Authorization Bearer token',
      example: 'Authorization: Bearer xnet_live_...',
    });
    return { ok: false };
  }

  const { data: apiKey, error } = await supabase
    .from('api_keys')
    .select('id, name, api_key, key_prefix, scopes, is_active, expires_at, revoked_at')
    .eq('api_key', token)
    .maybeSingle();

  if (error) {
    console.error('API key lookup failed:', error);
    res.status(500).json({ error: 'Authentication lookup failed' });
    return { ok: false };
  }

  if (!apiKey || !apiKey.is_active) {
    res.status(401).json({ error: 'Unauthorized', details: 'Invalid or inactive API key' });
    return { ok: false };
  }

  if (apiKey.expires_at && new Date(apiKey.expires_at).getTime() <= Date.now()) {
    res.status(401).json({ error: 'Unauthorized', details: 'API key expired' });
    return { ok: false };
  }

  if (!hasRequiredScopes(apiKey.scopes, requiredScopes)) {
    res.status(403).json({
      error: 'Forbidden',
      details: 'API key is missing required scope',
      required_scopes: requiredScopes,
      key_scopes: apiKey.scopes || [],
    });
    return { ok: false };
  }

  // Best-effort usage tracking; do not block the request.
  touchLastUsed(apiKey.id);

  return { ok: true, apiKey };
}

module.exports = {
  applyCors,
  requireApiKey,
};
