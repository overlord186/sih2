const https = require('https');
const fs = require('fs');

https.get('https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson', (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    try {
      const geojson = JSON.parse(data);
      const india = geojson.features.find(f => f.properties.ADMIN === 'India' || f.properties.name === 'India' || f.properties.ISO_A3 === 'IND');
      if (india) {
        fs.writeFileSync('public/india.geojson', JSON.stringify(india));
        console.log('Saved public/india.geojson');
      } else {
        console.log('India not found in geojson');
      }
    } catch (e) {
      console.error(e);
    }
  });
});
