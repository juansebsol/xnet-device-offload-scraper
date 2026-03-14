const DEVICE_TYPES = {
  CAMBIUM: 'cambium',
  RUCKUS: 'ruckus',
  UBIQUITI: 'ubiquiti',
  ALTA: 'alta',
};

function normalizeNasId(nasId) {
  return String(nasId || '')
    .trim()
    .replace(/[^a-zA-Z0-9]/g, '')
    .toLowerCase();
}

function normalizeDeviceType(deviceType) {
  const normalized = String(deviceType || '').trim().toLowerCase();

  if (!normalized) return '';
  if (normalized === 'ubnt') return DEVICE_TYPES.UBIQUITI;

  const validTypes = new Set(Object.values(DEVICE_TYPES));
  return validTypes.has(normalized) ? normalized : '';
}

function groupNasIdPairs(normalizedNasId, separator, transform = (value) => value) {
  const pairs = String(normalizedNasId || '').match(/.{1,2}/g);
  if (!pairs) return String(normalizedNasId || '');
  return pairs.map(transform).join(separator);
}

function formatNasIdForDeviceType(nasId, deviceType) {
  const normalizedNasId = normalizeNasId(nasId);
  const normalizedType = normalizeDeviceType(deviceType);

  if (!normalizedNasId) return '';

  switch (normalizedType) {
    case DEVICE_TYPES.CAMBIUM:
      return groupNasIdPairs(normalizedNasId, '-', (value) => value.toUpperCase());
    case DEVICE_TYPES.RUCKUS:
    case DEVICE_TYPES.UBIQUITI:
      return groupNasIdPairs(normalizedNasId, ':');
    case DEVICE_TYPES.ALTA:
    default:
      return normalizedNasId;
  }
}

module.exports = {
  DEVICE_TYPES,
  normalizeNasId,
  normalizeDeviceType,
  formatNasIdForDeviceType,
};
