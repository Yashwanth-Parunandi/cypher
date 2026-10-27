export type NormalizedWeb3Error = {
  message: string;
  code?: string | number;
  retryable: boolean;
};

export function normalizeWeb3Error(error: any): NormalizedWeb3Error {
  const message = error?.reason || error?.message || 'Unknown blockchain error.';
  const code = error?.code;

  if (code === 4001) {
    return { message: 'Transaction rejected by user.', code, retryable: false };
  }

  if (code === 'NETWORK_ERROR' || message.includes('underlying network changed')) {
    return {
      message: 'Network changed during the request. Reconnect MetaMask on Sepolia and retry.',
      code,
      retryable: true,
    };
  }

  if (code === -32603) {
    return {
      message: 'RPC error or gas estimation failed. Check network, wallet balance, and contract state.',
      code,
      retryable: true,
    };
  }

  if (message.includes('insufficient funds')) {
    return { message: 'Insufficient ETH for gas.', retryable: false };
  }

  if (message.includes('user rejected transaction')) {
    return { message: 'Transaction rejected by user.', code, retryable: false };
  }

  return { message, code, retryable: false };
}
