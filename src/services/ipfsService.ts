import axios from 'axios';
import { normalizeIPFSHash } from '@/lib/ipfs';

const IPFS_GATEWAYS = [
  'https://gateway.pinata.cloud/ipfs/',
  'https://ipfs.io/ipfs/',
  'https://cloudflare-ipfs.com/ipfs/',
  'https://dweb.link/ipfs/',
];

export const uploadToPinata = async (data: any): Promise<string | null> => {
  // 1. Try local secure proxy server first
  try {
    const proxyResponse = await axios.post(
      'http://localhost:4000/api/pinJSON',
      { data },
      { timeout: 3500 }
    );
    if (proxyResponse.data?.hash) {
      return normalizeIPFSHash(proxyResponse.data.hash).raw;
    }
  } catch {
    // Local proxy not running, fall back to direct Pinata API
  }

  // 2. Fallback to direct Pinata API
  try {
    const apiKey = import.meta.env.VITE_PINATA_API_KEY || import.meta.env.PINATA_API_KEY;
    const secretApiKey = import.meta.env.VITE_PINATA_SECRET_API_KEY || import.meta.env.PINATA_SECRET_API_KEY;
    
    if (!apiKey || !secretApiKey) {
      console.warn('Pinata API keys not found in environment. Set PINATA_API_KEY and PINATA_SECRET_API_KEY.');
      // If neither is available, generate deterministic hash for demo/offline purposes
      return null;
    }
    
    const response = await axios.post(
      'https://api.pinata.cloud/pinning/pinJSONToIPFS',
      {
        pinataContent: data,
        pinataMetadata: {
          name: `Certificate-${data?.id || Date.now()}`,
        },
      },
      {
        headers: {
          pinata_api_key: apiKey,
          pinata_secret_api_key: secretApiKey,
          'Content-Type': 'application/json',
        },
        timeout: 45000,
      }
    );
    
    return normalizeIPFSHash(response.data.IpfsHash).raw;
  } catch (error) {
    console.error('IPFS upload error:', error);
    return null;
  }
};

export const getFromIPFS = async (ipfsHash: string): Promise<any> => {
  const { raw } = normalizeIPFSHash(ipfsHash);
  const controllers = IPFS_GATEWAYS.map(() => new AbortController());

  const result = await new Promise<unknown>((resolve) => {
    let remaining = IPFS_GATEWAYS.length;
    let settled = false;

    IPFS_GATEWAYS.forEach((gateway, index) => {
      void axios.get(`${gateway}${raw}`, {
        timeout: 8000,
        signal: controllers[index].signal,
      }).then((response) => {
        if (response.data && !settled) {
          settled = true;
          controllers.forEach((controller) => controller.abort());
          resolve(response.data);
        } else if (!settled) {
          remaining -= 1;
          if (remaining === 0) {
            resolve(null);
          }
        }
      }).catch(() => {
        if (settled) return;
        remaining -= 1;
        if (remaining === 0 && !settled) {
          resolve(null);
        }
      });
    });
  });

  if (!result) {
    console.warn(`Failed to retrieve IPFS content for ${raw} across all public gateways.`);
  }

  return result;
};
