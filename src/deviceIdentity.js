const { supabase } = require('./supabase');
const {
  normalizeNasId,
  normalizeDeviceType,
  formatNasIdForDeviceType,
} = require('./nasIdUtils');

async function resolveDeviceIdentity(nasId, explicitDeviceType = '') {
  const rawNasId = String(nasId || '').trim();
  const normalizedNasId = normalizeNasId(rawNasId);
  let deviceType = normalizeDeviceType(explicitDeviceType);
  let deviceName = '';

  if (normalizedNasId && !deviceType) {
    const { data, error } = await supabase
      .from('devices')
      .select('device_type, device_name')
      .eq('nas_id', normalizedNasId)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to resolve device metadata for ${normalizedNasId}: ${error.message}`);
    }

    deviceType = normalizeDeviceType(data?.device_type);
    deviceName = data?.device_name || '';
  }

  const scrapeNasId = deviceType
    ? formatNasIdForDeviceType(normalizedNasId, deviceType)
    : rawNasId;

  return {
    inputNasId: rawNasId,
    nasId: normalizedNasId || rawNasId,
    scrapeNasId,
    deviceType,
    deviceName,
  };
}

module.exports = { resolveDeviceIdentity };
