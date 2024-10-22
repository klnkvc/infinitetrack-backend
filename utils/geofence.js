// Menghitung jarak antara dua titik (koordinat) menggunakan rumus Haversine
function haversineDistance(coord1, coord2) {
  const toRad = (x) => (x * Math.PI) / 180;

  const R = 6371e3; // Radius bumi dalam meter
  const dLat = toRad(coord2.latitude - coord1.latitude);
  const dLon = toRad(coord2.longitude - coord1.longitude);

  const lat1 = toRad(coord1.latitude);
  const lat2 = toRad(coord2.latitude);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const distance = R * c; // Jarak dalam meter
  return distance;
}

module.exports = {
  haversineDistance,
};
