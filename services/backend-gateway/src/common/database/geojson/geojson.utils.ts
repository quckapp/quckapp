import { Schema } from 'mongoose';
import type {
  Point,
  LineString,
  Polygon,
  MultiPoint,
  MultiLineString,
  MultiPolygon,
  GeoJsonObject,
  Position,
  Feature,
  FeatureCollection,
} from 'geojson';

/**
 * GeoJSON Utilities for MongoDB GeoSpatial Operations
 *
 * This module provides utilities for working with GeoJSON data structures
 * in MongoDB, enabling location-based services and mapping features.
 *
 * MongoDB supports the following GeoJSON types:
 * - Point
 * - LineString
 * - Polygon
 * - MultiPoint
 * - MultiLineString
 * - MultiPolygon
 * - GeometryCollection
 */

/**
 * GeoJSON Point schema definition for Mongoose
 */
export const PointSchema = {
  type: {
    type: String,
    enum: ['Point'],
    required: true,
    default: 'Point',
  },
  coordinates: {
    type: [Number], // [longitude, latitude]
    required: true,
    validate: {
      validator: (coords: number[]) =>
        coords.length === 2 &&
        coords[0] >= -180 &&
        coords[0] <= 180 &&
        coords[1] >= -90 &&
        coords[1] <= 90,
      message: 'Invalid coordinates. Must be [longitude, latitude] with valid ranges.',
    },
  },
};

/**
 * GeoJSON Polygon schema definition for Mongoose
 */
export const PolygonSchema = {
  type: {
    type: String,
    enum: ['Polygon'],
    required: true,
    default: 'Polygon',
  },
  coordinates: {
    type: [[[Number]]], // Array of linear rings
    required: true,
  },
};

/**
 * GeoJSON LineString schema definition for Mongoose
 */
export const LineStringSchema = {
  type: {
    type: String,
    enum: ['LineString'],
    required: true,
    default: 'LineString',
  },
  coordinates: {
    type: [[Number]], // Array of positions
    required: true,
  },
};

/**
 * Location document interface
 */
export interface LocationDocument {
  type: 'Point';
  coordinates: [number, number]; // [longitude, latitude]
}

/**
 * Create a GeoJSON Point
 *
 * @param longitude - Longitude (-180 to 180)
 * @param latitude - Latitude (-90 to 90)
 */
export function createPoint(longitude: number, latitude: number): Point {
  if (longitude < -180 || longitude > 180) {
    throw new Error('Longitude must be between -180 and 180');
  }
  if (latitude < -90 || latitude > 90) {
    throw new Error('Latitude must be between -90 and 90');
  }

  return {
    type: 'Point',
    coordinates: [longitude, latitude],
  };
}

/**
 * Create a GeoJSON Point from latitude/longitude (common order in APIs)
 *
 * @param latitude - Latitude (-90 to 90)
 * @param longitude - Longitude (-180 to 180)
 */
export function createPointFromLatLng(latitude: number, longitude: number): Point {
  return createPoint(longitude, latitude);
}

/**
 * Create a GeoJSON LineString from an array of points
 *
 * @param points - Array of [longitude, latitude] positions
 */
export function createLineString(points: Position[]): LineString {
  if (points.length < 2) {
    throw new Error('LineString must have at least 2 points');
  }

  return {
    type: 'LineString',
    coordinates: points,
  };
}

/**
 * Create a GeoJSON Polygon from an array of points
 *
 * @param points - Array of [longitude, latitude] positions (first and last must match)
 */
export function createPolygon(points: Position[]): Polygon {
  if (points.length < 4) {
    throw new Error('Polygon must have at least 4 points (3 unique + closing point)');
  }

  // Ensure the polygon is closed
  const first = points[0];
  const last = points[points.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1]) {
    points = [...points, first];
  }

  return {
    type: 'Polygon',
    coordinates: [points],
  };
}

/**
 * Create a circular polygon (approximation using regular polygon)
 *
 * @param center - Center point [longitude, latitude]
 * @param radiusKm - Radius in kilometers
 * @param segments - Number of segments (default: 32)
 */
export function createCircle(
  center: Position,
  radiusKm: number,
  segments: number = 32,
): Polygon {
  const [lng, lat] = center;
  const points: Position[] = [];

  // Convert radius to degrees (approximate)
  const radiusLat = radiusKm / 111.32; // 1 degree latitude ≈ 111.32 km
  const radiusLng = radiusKm / (111.32 * Math.cos((lat * Math.PI) / 180));

  for (let i = 0; i <= segments; i++) {
    const angle = (i * 2 * Math.PI) / segments;
    const x = lng + radiusLng * Math.cos(angle);
    const y = lat + radiusLat * Math.sin(angle);
    points.push([x, y]);
  }

  return {
    type: 'Polygon',
    coordinates: [points],
  };
}

/**
 * Create a bounding box polygon
 *
 * @param southwest - Southwest corner [longitude, latitude]
 * @param northeast - Northeast corner [longitude, latitude]
 */
export function createBoundingBox(southwest: Position, northeast: Position): Polygon {
  const [swLng, swLat] = southwest;
  const [neLng, neLat] = northeast;

  return {
    type: 'Polygon',
    coordinates: [
      [
        [swLng, swLat], // SW
        [neLng, swLat], // SE
        [neLng, neLat], // NE
        [swLng, neLat], // NW
        [swLng, swLat], // Close polygon (back to SW)
      ],
    ],
  };
}

/**
 * Calculate distance between two points using Haversine formula
 *
 * @param point1 - First point [longitude, latitude]
 * @param point2 - Second point [longitude, latitude]
 * @returns Distance in kilometers
 */
export function calculateDistance(point1: Position, point2: Position): number {
  const [lon1, lat1] = point1;
  const [lon2, lat2] = point2;

  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Convert degrees to radians
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Calculate the center of a polygon or set of points
 *
 * @param points - Array of [longitude, latitude] positions
 */
export function calculateCenter(points: Position[]): Position {
  let sumLng = 0;
  let sumLat = 0;

  for (const [lng, lat] of points) {
    sumLng += lng;
    sumLat += lat;
  }

  return [sumLng / points.length, sumLat / points.length];
}

/**
 * Check if a point is inside a polygon (ray casting algorithm)
 *
 * @param point - Point to check [longitude, latitude]
 * @param polygon - Polygon coordinates
 */
export function isPointInPolygon(point: Position, polygon: Position[]): boolean {
  const [x, y] = point;
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];

    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }

  return inside;
}

/**
 * MongoDB GeoSpatial query builders
 */
export const GeoQuery = {
  /**
   * Find documents near a point
   *
   * @param field - Field name containing the location
   * @param point - Center point [longitude, latitude]
   * @param maxDistanceMeters - Maximum distance in meters
   * @param minDistanceMeters - Minimum distance in meters (optional)
   */
  near(
    field: string,
    point: Position,
    maxDistanceMeters: number,
    minDistanceMeters?: number,
  ): Record<string, any> {
    const query: any = {
      [field]: {
        $near: {
          $geometry: createPoint(point[0], point[1]),
          $maxDistance: maxDistanceMeters,
        },
      },
    };

    if (minDistanceMeters !== undefined) {
      query[field].$near.$minDistance = minDistanceMeters;
    }

    return query;
  },

  /**
   * Find documents near a point using $geoNear aggregation (with distance calculation)
   */
  geoNear(
    point: Position,
    distanceField: string = 'distance',
    maxDistanceMeters?: number,
    query?: Record<string, any>,
  ): Record<string, any> {
    const geoNear: any = {
      near: createPoint(point[0], point[1]),
      distanceField,
      spherical: true,
    };

    if (maxDistanceMeters !== undefined) {
      geoNear.maxDistance = maxDistanceMeters;
    }

    if (query) {
      geoNear.query = query;
    }

    return { $geoNear: geoNear };
  },

  /**
   * Find documents within a polygon
   *
   * @param field - Field name containing the location
   * @param polygon - Polygon coordinates
   */
  within(field: string, polygon: Polygon): Record<string, any> {
    return {
      [field]: {
        $geoWithin: {
          $geometry: polygon,
        },
      },
    };
  },

  /**
   * Find documents within a bounding box
   *
   * @param field - Field name containing the location
   * @param southwest - Southwest corner [longitude, latitude]
   * @param northeast - Northeast corner [longitude, latitude]
   */
  withinBox(
    field: string,
    southwest: Position,
    northeast: Position,
  ): Record<string, any> {
    return {
      [field]: {
        $geoWithin: {
          $box: [southwest, northeast],
        },
      },
    };
  },

  /**
   * Find documents within a center sphere (great circle distance)
   *
   * @param field - Field name containing the location
   * @param center - Center point [longitude, latitude]
   * @param radiusRadians - Radius in radians (divide km by 6371)
   */
  withinCenterSphere(
    field: string,
    center: Position,
    radiusRadians: number,
  ): Record<string, any> {
    return {
      [field]: {
        $geoWithin: {
          $centerSphere: [center, radiusRadians],
        },
      },
    };
  },

  /**
   * Find documents that intersect with a geometry
   *
   * @param field - Field name containing the geometry
   * @param geometry - GeoJSON geometry to intersect with
   */
  intersects(field: string, geometry: GeoJsonObject): Record<string, any> {
    return {
      [field]: {
        $geoIntersects: {
          $geometry: geometry,
        },
      },
    };
  },
};

/**
 * Create a 2dsphere index for a location field
 *
 * @param schema - Mongoose schema
 * @param field - Field name to index
 */
export function createGeoIndex(schema: Schema, field: string): void {
  schema.index({ [field]: '2dsphere' });
}

/**
 * Convert kilometers to radians (for $centerSphere queries)
 */
export function kmToRadians(km: number): number {
  return km / 6371; // Earth's radius in km
}

/**
 * Convert meters to radians
 */
export function metersToRadians(meters: number): number {
  return meters / 6371000; // Earth's radius in meters
}

/**
 * Create a Feature from a geometry with properties
 */
export function createFeature(
  geometry: GeoJsonObject,
  properties: Record<string, any> | null,
  id?: string | number,
): Feature {
  return {
    type: 'Feature',
    geometry: geometry as any,
    properties,
    ...(id !== undefined && { id }),
  };
}

/**
 * Create a FeatureCollection from an array of features
 */
export function createFeatureCollection(features: Feature[]): FeatureCollection {
  return {
    type: 'FeatureCollection',
    features,
  };
}

/**
 * Location-related constants
 */
export const GEO_CONSTANTS = {
  /** Earth's radius in kilometers */
  EARTH_RADIUS_KM: 6371,
  /** Earth's radius in meters */
  EARTH_RADIUS_M: 6371000,
  /** Default search radius in meters (5km) */
  DEFAULT_SEARCH_RADIUS: 5000,
  /** Maximum search radius in meters (50km) */
  MAX_SEARCH_RADIUS: 50000,
};
