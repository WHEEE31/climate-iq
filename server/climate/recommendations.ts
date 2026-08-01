interface FactorScores {
  flood: number;
  wildfire: number;
  heat: number;
  drought: number;
  storms: number;
}

export interface Recommendation {
  id: string;
  title: string;
  description: string;
  priority: "High" | "Medium" | "Low";
  estimatedCost: string;
}

/**
 * Generate 3–5 personalized mitigation recommendations based on the property's
 * risk factor scores. Higher-scoring risks produce higher-priority recommendations.
 */
export function generateRecommendations(scores: FactorScores): Recommendation[] {
  const candidates: (Recommendation & { weight: number })[] = [];

  // --- FLOOD ---
  if (scores.flood >= 70) {
    candidates.push({
      id: "flood-insurance",
      title: "Purchase or Review NFIP Flood Insurance",
      description: "This property is in a high-risk FEMA flood zone where federal flood insurance is often required. Standard homeowners policies do not cover flooding — a separate NFIP or private flood policy is essential to protect your asset.",
      priority: "High",
      estimatedCost: "$700–$3,500/year",
      weight: scores.flood,
    });
    candidates.push({
      id: "flood-barriers",
      title: "Install Flood Barriers and Backflow Prevention",
      description: "Deployable flood barriers (FloodSax, AquaDam) and basement backflow valves can significantly reduce interior flood damage. For properties in Zone AE/VE, also consider elevating mechanical systems above the Base Flood Elevation.",
      priority: "High",
      estimatedCost: "$1,500–$15,000",
      weight: scores.flood * 0.9,
    });
  } else if (scores.flood >= 35) {
    candidates.push({
      id: "flood-readiness",
      title: "Build a Flood Emergency Kit and Drainage Plan",
      description: "Even moderate flood risk can cause costly damage. Clear gutters and downspouts seasonally, ensure grading slopes away from the foundation, and keep a flood emergency kit with sandbags and sump pump backup power ready.",
      priority: "Medium",
      estimatedCost: "$200–$800",
      weight: scores.flood,
    });
  }

  // --- WILDFIRE ---
  if (scores.wildfire >= 65) {
    candidates.push({
      id: "defensible-space",
      title: "Create and Maintain 100-Foot Defensible Space",
      description: "Clear combustible vegetation within 30 feet of the structure (Zone 1) and reduce fuel density out to 100 feet (Zone 2). This is the single highest-ROI wildfire mitigation for properties in the Wildland-Urban Interface — it directly improves survivability and may lower insurance premiums.",
      priority: "High",
      estimatedCost: "$1,000–$5,000 + annual maintenance",
      weight: scores.wildfire,
    });
    candidates.push({
      id: "ember-resistant-vents",
      title: "Install Ember-Resistant Vents and Class A Roofing",
      description: "Most homes ignite from embers entering through attic and eave vents, not from direct flame contact. Replace standard vents with ember-resistant models (IBHS-rated) and ensure roofing is Class A fire-rated. These upgrades can be the difference between a home surviving or burning.",
      priority: "High",
      estimatedCost: "$1,200–$8,000",
      weight: scores.wildfire * 0.95,
    });
  } else if (scores.wildfire >= 35) {
    candidates.push({
      id: "wildfire-landscaping",
      title: "Switch to Fire-Resistant Landscaping",
      description: "Replace highly combustible plants (juniper, arborvitae, ornamental grasses) with low-fuel, high-moisture alternatives. Stone mulch in the immediate 5 feet around the structure eliminates a critical ember catch zone and reduces maintenance cost.",
      priority: "Medium",
      estimatedCost: "$500–$3,000",
      weight: scores.wildfire,
    });
  }

  // --- HEAT ---
  if (scores.heat >= 65) {
    candidates.push({
      id: "insulation-hvac",
      title: "Upgrade Insulation and HVAC Efficiency",
      description: "In extreme heat zones, cooling costs can represent 40–60% of annual energy bills. Upgrading attic insulation to R-49+ and installing a high-efficiency heat pump (SEER 20+) can reduce cooling costs by 30–50% and protect occupant health during heat emergencies.",
      priority: "High",
      estimatedCost: "$5,000–$18,000",
      weight: scores.heat,
    });
    candidates.push({
      id: "cool-roof",
      title: "Install a Cool Roof or Solar Reflective Coating",
      description: "Cool roofs reflect more sunlight and absorb less heat — reducing roof surface temperatures by up to 50°F in peak summer heat. This directly lowers cooling loads, extends roof lifespan, and improves comfort. Eligible for federal tax credits under the Inflation Reduction Act.",
      priority: "Medium",
      estimatedCost: "$1,000–$6,000",
      weight: scores.heat * 0.85,
    });
  } else if (scores.heat >= 35) {
    candidates.push({
      id: "shade-trees",
      title: "Plant Strategic Shade Trees on West and South Exposures",
      description: "Mature deciduous trees on the west and south sides of a home can reduce summer cooling loads by 15–35%. This is one of the highest-ROI, lowest-cost interventions available for properties with moderate heat exposure — and adds property value.",
      priority: "Low",
      estimatedCost: "$300–$1,500",
      weight: scores.heat,
    });
  }

  // --- DROUGHT ---
  if (scores.drought >= 55) {
    candidates.push({
      id: "water-conservation",
      title: "Install Greywater Recycling and Rainwater Capture",
      description: "In drought-prone areas, properties with on-site water retention infrastructure face fewer supply restrictions and lower water bills. A greywater system (laundry-to-landscape) paired with a 500-gallon rainwater cistern can offset 30–50% of outdoor water use.",
      priority: "High",
      estimatedCost: "$2,000–$8,000",
      weight: scores.drought,
    });
  } else if (scores.drought >= 30) {
    candidates.push({
      id: "drought-landscaping",
      title: "Convert Turf to Drought-Tolerant Landscaping",
      description: "Traditional lawns are among the largest residential water consumers. Replacing turf with native, drought-adapted plants and drip irrigation can reduce outdoor water use by 50–70%, lower maintenance costs, and make the property more resilient to future water restrictions.",
      priority: "Medium",
      estimatedCost: "$3,000–$10,000",
      weight: scores.drought,
    });
  }

  // --- STORMS ---
  if (scores.storms >= 70) {
    candidates.push({
      id: "storm-hardening",
      title: "Harden the Roof and Windows Against Severe Weather",
      description: "In high-storm-risk areas, the roof is the most vulnerable element. Install hurricane straps or clips to connect the roof deck to the wall framing, upgrade to impact-rated windows (especially critical in hurricane zones), and consider a whole-home generator given the frequency of outages.",
      priority: "High",
      estimatedCost: "$3,000–$20,000",
      weight: scores.storms,
    });
  } else if (scores.storms >= 45) {
    candidates.push({
      id: "storm-prep",
      title: "Invest in a Backup Power Source and Storm Kit",
      description: "Moderate storm regions experience regular multi-day outages from severe thunderstorms. A standby generator or battery backup system (Tesla Powerwall, Generac) protects essential systems — sump pumps, refrigeration, heating — and provides significant quality-of-life insurance.",
      priority: "Medium",
      estimatedCost: "$800–$12,000",
      weight: scores.storms,
    });
  }

  // Universal recommendations for any meaningful risk
  const maxScore = Math.max(scores.flood, scores.wildfire, scores.heat, scores.drought, scores.storms);
  if (maxScore >= 40) {
    candidates.push({
      id: "insurance-review",
      title: "Conduct a Full Insurance Coverage Review",
      description: "Climate risk elevates the likelihood that standard homeowners policies are underinsured for real hazards. Request a full coverage review from your insurer — specifically asking about named-peril exclusions for flood, wildfire, and wind — and compare against at least two additional providers.",
      priority: maxScore >= 65 ? "High" : "Medium",
      estimatedCost: "Free",
      weight: maxScore * 0.7,
    });
  }

  // Sort by weight descending, take top 5
  candidates.sort((a, b) => b.weight - a.weight);

  // Ensure we have at least 3
  const selected = candidates.slice(0, 5);
  if (selected.length < 3) {
    selected.push({
      id: "home-audit",
      title: "Schedule a Climate Resilience Home Audit",
      description: "A certified home energy and resilience auditor can identify specific vulnerabilities in your property's construction, insulation, drainage, and landscaping that may not be visible to the naked eye. Many utilities offer subsidized audits.",
      priority: "Low",
      estimatedCost: "Free–$500",
      weight: 0,
    });
  }

  return selected.map(({ weight: _w, ...rec }) => rec);
}
