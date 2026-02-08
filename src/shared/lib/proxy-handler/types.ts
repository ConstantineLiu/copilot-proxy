export interface HandlerConfig {
  bearerToken: string;
  headers: Headers;
  bodyJson: {
    messages?: unknown;
    stream?: boolean;
    model?: unknown;
  } & Record<string, unknown>;
  targetUrl: string;
  targetPath: string;
  request: Request;
}
