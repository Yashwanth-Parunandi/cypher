const IPFS_GATEWAY_PATTERN = /^https?:\/\/[^/]+\/ipfs\//i;

export interface NormalizedIPFSHash {
  raw: string;
  prefixed: string;
  original: string;
  candidates: string[];
}

export function normalizeIPFSHash(input: string): NormalizedIPFSHash {
  if (!input) throw new Error('Empty IPFS hash');

  const original = input.trim();
  const withoutGateway = original.replace(IPFS_GATEWAY_PATTERN, '');
  const withoutPrefix = withoutGateway.replace(/^ipfs:\/\//i, '');
  const withoutPath = withoutPrefix.replace(/^\/?ipfs\/?/i, '');
  const raw = withoutPath.replace(/[?#].*$/, '').trim();

  if (!raw) {
    throw new Error('Invalid IPFS hash');
  }

  const prefixed = `ipfs://${raw}`;
  const candidates = Array.from(
    new Set([
      original,
      raw,
      prefixed,
      `/ipfs/${raw}`,
      `https://gateway.pinata.cloud/ipfs/${raw}`,
      `https://ipfs.io/ipfs/${raw}`,
    ])
  );

  return { raw, prefixed, original, candidates };
}

export function getIPFSGatewayUrl(input: string, gatewayBase = 'https://gateway.pinata.cloud/ipfs/'): string {
  const { raw } = normalizeIPFSHash(input);
  return `${gatewayBase}${raw}`;
}
