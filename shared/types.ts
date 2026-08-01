/**
 * Shared API contract between the browser client and the Express server.
 * Imported by both `src/` (frontend) and `server/` (backend).
 */

export const RISK_RATINGS = [
  'Minimal',
  'Low',
  'Moderate',
  'High',
  'Very High',
  'Extreme',
] as const;

export type RiskRating = (typeof RISK_RATINGS)[number];

export type RecommendationPriority = 'High' | 'Medium' | 'Low';

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface RiskFactor {
  /** Unique identifier for the risk factor */
  id: string;
  /** Human-readable name of the risk factor */
  name: string;
  /** Risk score from 0 to 100 (higher = more risk) */
  score: number;
  rating: RiskRating;
  /** Plain English explanation of what this risk means for this property */
  description: string;
  /** Name of the authoritative data source used */
  dataSource: string;
}

export interface Recommendation {
  id: string;
  title: string;
  description: string;
  priority: RecommendationPriority;
  /** Rough cost estimate, e.g. "$500–$2,000" or "Free" */
  estimatedCost: string;
}

export interface ClimateRiskResult {
  /** The address as the user typed it */
  address: string;
  /** The geocoded / normalized address */
  normalizedAddress: string;
  coordinates: Coordinates;
  country: string;
  countryCode: string;
  /** Weighted composite ClimateIQ score, 0–100 */
  overallScore: number;
  overallRating: RiskRating;
  summary: string;
  factors: RiskFactor[];
  recommendations: Recommendation[];
}

export interface ClimateRiskInput {
  address: string;
}

export interface ErrorResponse {
  error: string;
}

/** Minimum length the server will accept for an address string. */
export const ADDRESS_MIN_LENGTH = 5;
