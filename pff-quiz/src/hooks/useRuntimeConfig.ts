import { useState, useEffect } from 'react';
import { RuntimeConfig } from '@/types/api';

// Disable CDN fetch - use environment variables directly
const RUNTIME_CONFIG_URL = process.env.NEXT_PUBLIC_RUNTIME_CONFIG_URL || null;

export function useRuntimeConfig() {
  const [config, setConfig] = useState<RuntimeConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadConfig = async () => {
      // Skip CDN fetch - use environment variables directly
      if (!RUNTIME_CONFIG_URL) {
        setConfig({
          resultsEnabled: process.env.NEXT_PUBLIC_RESULTS_ENABLED === 'true',
          allowedBankHashes: [process.env.NEXT_PUBLIC_BANK_HASH || ''],
          picksPolicy: (process.env.NEXT_PUBLIC_PICKS_POLICY as 'at_least_one' | 'all_21_on_zero') || 'at_least_one'
        });
        setLoading(false);
        return;
      }

      try {
        // Try to fetch runtime config
        const response = await fetch(RUNTIME_CONFIG_URL);
        if (response.ok) {
          const runtimeConfig = await response.json();
          setConfig(runtimeConfig);
        } else {
          // Fall back to environment variables
          setConfig({
            resultsEnabled: process.env.NEXT_PUBLIC_RESULTS_ENABLED === 'true',
            allowedBankHashes: [process.env.NEXT_PUBLIC_BANK_HASH || ''],
            picksPolicy: (process.env.NEXT_PUBLIC_PICKS_POLICY as 'at_least_one' | 'all_21_on_zero') || 'at_least_one'
          });
        }
      } catch {
        // Fall back to environment variables on error
        setConfig({
          resultsEnabled: process.env.NEXT_PUBLIC_RESULTS_ENABLED === 'true',
          allowedBankHashes: [process.env.NEXT_PUBLIC_BANK_HASH || ''],
          picksPolicy: (process.env.NEXT_PUBLIC_PICKS_POLICY as 'at_least_one' | 'all_21_on_zero') || 'at_least_one'
        });
        setError('Failed to load runtime config, using environment variables');
      } finally {
        setLoading(false);
      }
    };

    loadConfig();
  }, []);

  return { config, loading, error };
}
