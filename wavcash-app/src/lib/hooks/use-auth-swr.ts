import useSWR, { type SWRConfiguration } from "swr";
import { usePrivy } from "@privy-io/react-auth";

export function useAuthSWR<T>(
  key: string | null,
  fetcher: () => Promise<T>,
  config?: SWRConfiguration<T>
) {
  const { ready, authenticated } = usePrivy();
  return useSWR<T>(
    ready && authenticated ? key : null,
    fetcher,
    { dedupingInterval: 60_000, revalidateOnFocus: false, ...config }
  );
}
