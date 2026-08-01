import type { RiskRating } from "../../shared/types";

/**
 * Compute the overall ClimateIQ score from individual factor scores.
 * Weights are based on relative financial impact and global insured loss data.
 */
export function computeOverallScore(factors: {
  flood: number;
  wildfire: number;
  heat: number;
  drought: number;
  storms: number;
  airQuality: number;
}): number {
  const weights = {
    flood:      0.25,   // Largest single source of property damage globally
    storms:     0.22,   // Hurricanes, typhoons, tornadoes, severe thunderstorms
    wildfire:   0.20,   // Rapidly growing risk in WUI and savanna zones
    heat:       0.14,   // Health + energy cost impact, compounding all others
    drought:    0.09,   // Water availability + secondary fire / agriculture effects
    airQuality: 0.10,   // Livability, health costs, HVAC burden — includes smoke events
  };

  const weighted =
    factors.flood      * weights.flood +
    factors.storms     * weights.storms +
    factors.wildfire   * weights.wildfire +
    factors.heat       * weights.heat +
    factors.drought    * weights.drought +
    factors.airQuality * weights.airQuality;

  return Math.round(Math.min(Math.max(weighted, 0), 100));
}

/**
 * Convert a 0–100 score to a rating label.
 */
export function scoreToRating(score: number): RiskRating {
  if (score >= 85) return "Extreme";
  if (score >= 70) return "Very High";
  if (score >= 50) return "High";
  if (score >= 30) return "Moderate";
  if (score >= 15) return "Low";
  return "Minimal";
}

/**
 * Generate a 2–3 sentence plain-English summary of climate risk.
 * Adapts phrasing for non-US locations.
 */
export function generateSummary(
  overallScore: number,
  overallRating: RiskRating,
  normalizedAddress: string,
  factors: { name: string; score: number; rating: string }[],
  isUS: boolean,
  country: string
): string {
  const sortedFactors = [...factors].sort((a, b) => b.score - a.score);
  const topFactor    = sortedFactors[0];
  const secondFactor = sortedFactors[1];

  const ratingPhrases: Record<string, string> = {
    Extreme:    "faces extreme multi-hazard climate exposure",
    "Very High":"carries very high climate risk across multiple hazard categories",
    High:       "shows elevated climate risk that warrants active mitigation",
    Moderate:   "has moderate climate exposure that is worth monitoring and addressing",
    Low:        "has relatively low overall climate exposure",
    Minimal:    "has minimal climate risk based on current datasets",
  };
  const phrase = ratingPhrases[overallRating] ?? "has measurable climate risk";

  // Attribution line varies by data source availability
  const dataSources = isUS
    ? "FEMA, NOAA, and Open-Meteo global datasets"
    : `Open-Meteo global reanalysis and regional climate datasets${country ? ` for ${country}` : ""}`;

  let summary = `Based on ${dataSources}, this property ${phrase}, with a ClimateIQ score of ${overallScore}/100.`;

  if (topFactor && topFactor.score >= 30) {
    summary += ` The primary driver is ${topFactor.rating.toLowerCase()} ${topFactor.name.toLowerCase()} risk`;
    if (secondFactor && secondFactor.score >= 30 && secondFactor.score >= topFactor.score * 0.6) {
      summary += `, compounded by ${secondFactor.rating.toLowerCase()} ${secondFactor.name.toLowerCase()} exposure`;
    }
    summary += ".";
  }

  if (overallScore >= 65) {
    summary += " Proactive mitigation — including insurance review and physical hardening — is strongly recommended before purchase or renewal.";
  } else if (overallScore >= 35) {
    summary += " Targeted mitigation investments can meaningfully reduce long-term financial exposure from these hazards.";
  } else {
    summary += " The property's climate risk profile is favourable compared to global averages, though localized conditions should still be reviewed.";
  }

  return summary;
}
