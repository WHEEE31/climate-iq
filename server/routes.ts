import { Router, type Request, type Response } from 'express';

import { logger } from './logger';
import { geocodeAddress } from './climate/geocode';
import { fetchMeteoData } from './climate/openmeteo';
import { getFloodRisk } from './climate/flood';
import { getDroughtRisk } from './climate/drought';
import { getStormRisk } from './climate/storms';
import { getWildfireRisk } from './climate/wildfire';
import { getHeatRisk } from './climate/heat';
import { getAirQualityRisk } from './climate/airquality';
import {
  computeOverallScore,
  scoreToRating,
  generateSummary,
} from './climate/scoring';
import { generateRecommendations } from './climate/recommendations';
import { reverseLookup } from './climate/providers';
import { ADDRESS_MIN_LENGTH, type ClimateRiskResult } from '../shared/types';

export const apiRouter: Router = Router();

apiRouter.get('/healthz', (_req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

apiRouter.post('/climate-risk', async (req: Request, res: Response) => {
  const body = req.body as { address?: unknown } | undefined;
  const address = typeof body?.address === 'string' ? body.address.trim() : '';

  if (address.length < ADDRESS_MIN_LENGTH) {
    res.status(400).json({
      error: `Please enter an address of at least ${ADDRESS_MIN_LENGTH} characters.`,
    });
    return;
  }

  logger.info({ address }, 'Processing climate risk request');

  try {
    // 1. Geocode the address (global — Nominatim)
    const location = await geocodeAddress(address);
    if (!location) {
      res.status(422).json({
        error: `Could not locate "${address}". Try adding more detail — street, city, and country.`,
      });
      return;
    }

    // 2. One shared Open-Meteo call supplies weather + elevation for every module
    const meteo = await fetchMeteoData(location.lat, location.lng);

    // 3. Score each risk factor in parallel
    const [flood, drought, storms, wildfire, heat, airQuality] = await Promise.all([
      getFloodRisk(location.lat, location.lng, location.isUS, meteo),
      getDroughtRisk(location.lat, location.lng, location.isUS, meteo),
      getStormRisk(location.lat, location.lng, location.isUS, meteo),
      getWildfireRisk(location.lat, location.lng, location.isUS, meteo),
      getHeatRisk(location.lat, location.lng, location.isUS, meteo),
      getAirQualityRisk(location.lat, location.lng),
    ]);

    // 4. Weighted composite
    const overallScore = computeOverallScore({
      flood: flood.score,
      wildfire: wildfire.score,
      heat: heat.score,
      drought: drought.score,
      storms: storms.score,
      airQuality: airQuality.score,
    });
    const overallRating = scoreToRating(overallScore);

    const factors = [
      { id: 'flood', name: 'Flood Risk', ...pick(flood) },
      { id: 'storms', name: 'Severe Storm Risk', ...pick(storms) },
      { id: 'wildfire', name: 'Wildfire Risk', ...pick(wildfire) },
      { id: 'heat', name: 'Extreme Heat', ...pick(heat) },
      { id: 'drought', name: 'Drought Risk', ...pick(drought) },
      { id: 'airQuality', name: 'Air Quality', ...pick(airQuality) },
    ];

    const recommendations = generateRecommendations({
      flood: flood.score,
      wildfire: wildfire.score,
      heat: heat.score,
      drought: drought.score,
      storms: storms.score,
    });

    const summary = generateSummary(
      overallScore,
      overallRating,
      location.normalizedAddress,
      factors,
      location.isUS,
      location.country,
    );

    const result: ClimateRiskResult = {
      address,
      normalizedAddress: location.normalizedAddress,
      coordinates: { lat: location.lat, lng: location.lng },
      country: location.country,
      countryCode: location.countryCode,
      overallScore,
      overallRating,
      summary,
      factors,
      recommendations,
    };

    logger.info(
      { address: location.normalizedAddress, overallScore, overallRating },
      'Assessment complete',
    );

    res.json(result);
  } catch (err) {
    logger.error({ err, address }, 'Climate risk assessment failed');
    res.status(502).json({
      error:
        'One of the upstream climate data services is unavailable right now. Please try again in a moment.',
    });
  }
});

apiRouter.get('/reverse-geocode', async (req: Request, res: Response) => {
  const lat = Number.parseFloat(String(req.query.lat ?? ''));
  const lng = Number.parseFloat(String(req.query.lng ?? ''));

  if (
    Number.isNaN(lat) ||
    Number.isNaN(lng) ||
    lat < -90 ||
    lat > 90 ||
    lng < -180 ||
    lng > 180
  ) {
    res.status(400).json({ error: 'Valid lat and lng query params are required' });
    return;
  }

  const outcome = await reverseLookup(lat, lng);

  if (outcome.place) {
    res.json({
      address: outcome.place.normalizedAddress,
      countryCode: outcome.place.countryCode,
      coords: { lat, lng },
      unmapped: false,
      lookupFailed: false,
      provider: outcome.provider,
    });
    return;
  }

  if (outcome.allProvidersFailed) {
    // Every provider errored. NOT the same as "nothing is here" — the client
    // falls back to raw coordinates, which still yields a full assessment.
    logger.warn({ lat, lng }, 'All geocoding providers failed — client will use raw coordinates');
    res.json({
      address: null,
      countryCode: null,
      coords: { lat, lng },
      unmapped: false,
      lookupFailed: true,
    });
    return;
  }

  // A provider answered and reported nothing mapped here: ocean, or unsurveyed.
  res.json({
    address: null,
    countryCode: null,
    coords: { lat, lng },
    unmapped: true,
    lookupFailed: false,
  });
});


function pick(factor: {
  score: number;
  rating: string;
  description: string;
  dataSource: string;
}) {
  return {
    score: factor.score,
    rating: factor.rating as ClimateRiskResult['factors'][number]['rating'],
    description: factor.description,
    dataSource: factor.dataSource,
  };
}
