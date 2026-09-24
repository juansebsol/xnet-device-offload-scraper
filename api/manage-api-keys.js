// api/manage-api-keys.js
// GET    /api/manage-api-keys          - list keys
// POST   /api/manage-api-keys          - create key
// DELETE /api/manage-api-keys?id=...   - revoke key
// Requires Bearer key with `admin` scope.
// Uses existing SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY on the server.

const crypto = require('crypto');
const { supabase } = require('./_supabase');
const { applyCors, requireApiKey } = require('./_auth');

const ALLOWED_SCOPES = new Set(['read', 'write', 'trigger', 'admin']);

function normalizeScopes(scopes) {
  if (!Array.isArray(scopes)) return [];
  return [...new Set(
    scopes
      .map((scope) => String(scope || '').trim().toLowerCase())
      .filter((scope) => ALLOWED_SCOPES.has(scope))
  )];
}

function generateApiKey() {
  return `xnet_live_${crypto.randomBytes(24).toString('hex')}`;
}

module.exports = async (req, res) => {
  applyCors(res, 'GET, POST, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();

  const auth = await requireApiKey(req, res, ['admin']);
  if (!auth.ok) return;

  try {
    switch (req.method) {
      case 'GET':
        return await handleListKeys(req, res);
      case 'POST':
        return await handleCreateKey(req, res);
      case 'DELETE':
        return await handleRevokeKey(req, res);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('manage-api-keys error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

async function handleListKeys(req, res) {
  const { data, error } = await supabase
    .from('api_keys')
    .select('id, name, api_key, key_prefix, scopes, is_active, expires_at, last_used_at, created_at, revoked_at')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to list api keys:', error);
    return res.status(500).json({ error: 'Failed to list API keys' });
  }

  return res.status(200).json({
    count: (data || []).length,
    keys: data || [],
  });
}

async function handleCreateKey(req, res) {
  const name = String(req.body?.name || '').trim();
  const scopes = normalizeScopes(req.body?.scopes);
  const expiresAt = req.body?.expires_at ? String(req.body.expires_at).trim() : null;

  if (!name) {
    return res.status(400).json({ error: 'name is required' });
  }

  if (scopes.length === 0) {
    return res.status(400).json({
      error: 'scopes is required and must include at least one of: read, write, trigger, admin',
    });
  }

  if (expiresAt && Number.isNaN(new Date(expiresAt).getTime())) {
    return res.status(400).json({ error: 'expires_at must be a valid ISO date string' });
  }

  const apiKey = generateApiKey();

  const { data, error } = await supabase
    .from('api_keys')
    .insert({
      name,
      api_key: apiKey,
      key_prefix: 'xnet_live',
      scopes,
      expires_at: expiresAt || null,
      is_active: true,
    })
    .select('id, name, api_key, key_prefix, scopes, is_active, expires_at, created_at')
    .single();

  if (error) {
    console.error('Failed to create api key:', error);
    return res.status(500).json({ error: 'Failed to create API key', details: error.message });
  }

  return res.status(201).json({
    message: 'API key created successfully',
    key: data,
  });
}

async function handleRevokeKey(req, res) {
  const id = String(req.query.id || '').trim();
  const name = String(req.query.name || '').trim();

  if (!id && !name) {
    return res.status(400).json({ error: 'id or name query parameter is required' });
  }

  let query = supabase
    .from('api_keys')
    .update({
      is_active: false,
      revoked_at: new Date().toISOString(),
    })
    .eq('is_active', true);

  if (id) query = query.eq('id', id);
  else query = query.eq('name', name);

  const { data, error } = await query
    .select('id, name, is_active, revoked_at')
    .maybeSingle();

  if (error) {
    console.error('Failed to revoke api key:', error);
    return res.status(500).json({ error: 'Failed to revoke API key' });
  }

  if (!data) {
    return res.status(404).json({ error: 'Active API key not found' });
  }

  return res.status(200).json({
    message: `API key "${data.name}" revoked successfully`,
    key: data,
  });
}
