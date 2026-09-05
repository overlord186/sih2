const fs = require('fs');
const data = JSON.parse(fs.readFileSync('public/india.geojson', 'utf8'));
let count = 0;
let points = 0;
if (data.geometry.type === 'Polygon') {
    count += data.geometry.coordinates.length;
    data.geometry.coordinates.forEach(r => points += r.length);
} else if (data.geometry.type === 'MultiPolygon') {
    data.geometry.coordinates.forEach(poly => {
        count += poly.length;
        poly.forEach(r => points += r.length);
    });
}
console.log('Rings:', count, 'Points:', points);
