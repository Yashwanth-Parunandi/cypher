import React, { useState, useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { connectMetaMask, isMetaMaskInstalled } from '@/services/web3Service';
import { getConnectedWalletAddress, onWalletStateInvalidated } from '@/services/walletService';
import { useToast } from '@/hooks/use-toast';
import { Wallet } from 'lucide-react';

interface MetaMaskButtonProps {
  onConnect?: (address: string) => void;
  showWarningOnlyOnAction?: boolean;
}

const MetaMaskButton: React.FC<MetaMaskButtonProps> = ({ onConnect }) => {
  const [address, setAddress] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const { toast } = useToast();
  const onConnectRef = useRef(onConnect);

  useEffect(() => {
    onConnectRef.current = onConnect;
  }, [onConnect]);

  useEffect(() => {
    let cancelled = false;

    const hydrateConnection = async () => {
      if (!isMetaMaskInstalled()) {
        return;
      }

      try {
        const existingAddress = await getConnectedWalletAddress();
        if (!cancelled && existingAddress) {
          setAddress(existingAddress);
          onConnectRef.current?.(existingAddress);
        }
      } catch (error) {
        console.warn('Failed to hydrate MetaMask connection:', error);
      }
    };

    void hydrateConnection();

    // Subscribe to wallet state invalidations (chain changed, account disconnected)
    const unsubscribe = onWalletStateInvalidated(() => {
      if (!cancelled) {
        setAddress(null);
      }
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  const handleConnect = async () => {
    if (!isMetaMaskInstalled()) {
      toast({
        title: 'MetaMask Not Installed',
        description: 'Please install MetaMask browser extension to interact with Web3 features.',
        variant: 'destructive',
      });
      return;
    }

    setIsConnecting(true);
    try {
      const userAddress = await connectMetaMask();
      if (userAddress) {
        setAddress(userAddress);
        if (onConnect) onConnect(userAddress);
        
        toast({
          title: 'Wallet Connected',
          description: `Connected: ${userAddress.substring(0, 6)}...${userAddress.substring(userAddress.length - 4)}`,
        });
      }
    } catch (error: any) {
      console.warn('Failed to connect to MetaMask:', error);
      toast({
        title: 'Connection Failed',
        description: error.message || 'Could not connect to wallet.',
        variant: 'destructive',
      });
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <Button 
      onClick={handleConnect}
      disabled={isConnecting}
      className={`font-semibold shadow-sm flex items-center gap-1.5 ${
        address 
          ? 'bg-slate-800 text-white hover:bg-slate-900 border border-slate-700' 
          : 'bg-gradient-to-r from-orange-500 to-amber-600 hover:opacity-90 text-white'
      }`}
    >
      <Wallet className="h-4 w-4" />
      {isConnecting ? (
        <span className="flex items-center gap-2">
          <span className="animate-spin h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full"></span>
          Connecting...
        </span>
      ) : address ? (
        `${address.substring(0, 6)}...${address.substring(address.length - 4)}`
      ) : (
        'Connect Wallet'
      )}
    </Button>
  );
};

export default MetaMaskButton;
