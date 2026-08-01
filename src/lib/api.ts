import { useMutation } from '@tanstack/react-query';

import type {
  ClimateRiskInput,
  ClimateRiskResult,
  ErrorResponse,
} from '../../shared/types';

/**
 * Base URL for API calls.
 *
 * Left empty by default, which means requests go to the same origin that
 * served the page. Because the Express server serves both the API and the
 * built frontend, this works identically in local dev, in Docker, and on any
 * hosting platform — no configuration, no CORS.
 *
 * Set VITE_API_BASE_URL at build time only if you deliberately split the
 * frontend and backend onto different domains.
 */
const BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/+$/, '');

export class ApiError extends Error {
  readonly status: number;
  /** Human-readable message, matching the server's ErrorResponse shape. */
  readonly error: string;

  constructor(status: number, error: string) {
    super(error);
    this.name = 'ApiError';
    this.status = status;
    this.error = error;
  }
}

async function postJson<TBody, TResult>(
  path: string,
  body: TBody,
): Promise<TResult> {
  let response: Response;

  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    throw new ApiError(
      0,
      'Could not reach the server. Check your connection and try again.',
    );
  }

  const text = await response.text();
  let payload: unknown = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = null;
    }
  }

  if (!response.ok) {
    const message =
      (payload as ErrorResponse | null)?.error ??
      `Request failed with status ${response.status}`;
    throw new ApiError(response.status, message);
  }

  return payload as TResult;
}

export function getClimateRisk(
  data: ClimateRiskInput,
): Promise<ClimateRiskResult> {
  return postJson<ClimateRiskInput, ClimateRiskResult>('/api/climate-risk', data);
}

/**
 * Mutation hook for the climate risk assessment.
 * Call as: mutation.mutate({ data: { address } })
 */
export function useGetClimateRisk() {
  return useMutation<ClimateRiskResult, ApiError, { data: ClimateRiskInput }>({
    mutationFn: ({ data }) => getClimateRisk(data),
  });
}

export type {
  ClimateRiskInput,
  ClimateRiskResult,
  Coordinates,
  ErrorResponse,
  Recommendation,
  RecommendationPriority,
  RiskFactor,
  RiskRating,
} from '../../shared/types';
