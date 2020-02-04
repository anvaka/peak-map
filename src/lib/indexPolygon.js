var inside = require('point-in-polygon');
var simplify = require('./simplify');


export default function indexPolygon(nominatimResponse) {
  if (!nominatimResponse) return yes;
  let {boundingbox} = nominatimResponse;

  let tolerance = (boundingbox[3] - boundingbox[2])/1000;

  let checkForGeo = yes;

  if (nominatimResponse.geojson) {
    checkForGeo = checkInsideGeoJSON(nominatimResponse.geojson);
  }

  return function isInside(lonLat) {
    return isInsideBoundingBox(lonLat) && checkForGeo(lonLat);
  }

  function yes() { return true; }

  function isInsideBoundingBox(lonLat) {
    return !(lonLat[1] < boundingbox[0] || lonLat[1] > boundingbox[1] ||
     lonLat[0] < boundingbox[2] || lonLat[0] > boundingbox[3]);

  }


  function checkInsideGeoJSON(poly) {
    let coordinates = poly.coordinates;
    if (poly.type === 'Polygon') {
      coordinates = [coordinates];
    } else if (poly.type === 'MultiPolygon') {
      coordinates = poly.coordinates;
    } else if (poly.type === 'Point') {
      return yes;
    } else { 
      throw new Error('Unsupported polygon type ' + poly.type);
    }

    let polygons = coordinates.map(polygon => {
      let final = simplify(polygon[0], tolerance);
      return final;
    });

    return function isInsideGeoJSON(lonLat) {
      for (let i = 0; i < polygons.length; ++i) {
        if (inside(lonLat, polygons[i])) return true;
      }

      return false;
    }
  }

}
