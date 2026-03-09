ALTER TABLE public.sniffer_results ADD COLUMN artist_id text;
CREATE INDEX idx_sniffer_results_artist_ip ON public.sniffer_results(artist_id, ip_hash);
