import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

// Mirrors bgrm (tenant bo): a newer, deactivated StateInfo row sits ahead of the
// active one. MDMS v2 returns newest first and applies isActive before limit.
const stateInfoRows = [
  { uniqueIdentifier: 'Demo.pg', isActive: false, data: { languages: [{ value: 'en_IN' }, { value: 'ka_IN' }] } },
  { uniqueIdentifier: 'Demo.bo', isActive: true, data: { languages: [{ value: 'en_IN', label: 'ENGLISH' }, { value: 'sw_KE', label: 'KISWAHILI' }] } },
];

const mdmsSearch = vi.fn(async (_tenantId: string, _schema: string, options?: { limit?: number; isActive?: boolean }) => {
  const rows = options?.isActive === undefined ? stateInfoRows : stateInfoRows.filter((r) => r.isActive === options.isActive);
  return rows.slice(0, options?.limit ?? 100);
});

vi.mock('@/providers/bridge', () => ({
  digitClient: { stateTenantId: 'bo', mdmsSearch: (...args: Parameters<typeof mdmsSearch>) => mdmsSearch(...args) },
}));

import { useAvailableLocales } from './useAvailableLocales';

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('useAvailableLocales', () => {
  it('reads the active StateInfo even when a newer inactive one exists', async () => {
    const { result } = renderHook(() => useAvailableLocales(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.locales.map((l) => l.value)).toEqual(['en_IN', 'sw_KE', 'default']);
  });
});
