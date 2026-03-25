/**
 * AI Explore feature: types for LLM-powered route generation.
 */

/** A single stop in an AI-generated exploration route. */
export interface AISiteStop {
  siteId: string;
  explanation: string;
}

/** The full response from the AI explore API. */
export interface AIRouteResult {
  /** AI-generated route title, e.g. "中国重工业的发展路径" */
  title: string;
  /** 2-3 sentence summary of why these sites form a coherent route. */
  summary: string;
  /** Ordered list of sites with per-stop explanations. */
  stops: AISiteStop[];
}

/** The request body sent to the API. */
export interface AIExploreRequest {
  query: string;
}

/** Shape of the API error response. */
export interface AIExploreError {
  error: string;
}

/** Status of the AI panel in the UI. */
export type AIExplorePanelStatus =
  | "idle"       // no query yet
  | "loading"    // awaiting API response
  | "success"    // got a route result
  | "error";     // API returned an error
