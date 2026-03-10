WavCash
Royalty intelligence and payment infrastructure for music rights holders. WavCash tells you what your music is earning, flags when you're underpaid, and creates legally binding split agreements between collaborators.

What It Does
Music rights holders operate blind. Streaming revenue arrives on opaque schedules, often months late, with no way to verify the amount. Collaborators split royalties through verbal agreements that break down when money arrives. WavCash addresses both problems.

Royalty Intelligence — WavCash fetches stream counts across major DSPs, applies independently verified per-stream rates, and calculates what a track should be earning in real time. When actual royalty statements arrive, the platform compares them against the estimates and flags discrepancies.

Splits — A legal and onchain co-ownership record for any track with multiple contributors. Every collaborator signs before the agreement activates. The record is permanent.

Features
Royalty Sniffer
Public tool, no account required. Paste a Spotify track, album, or artist URL. WavCash fetches current stream counts and returns an estimated earnings breakdown by DSP — Spotify, Apple Music, YouTube, Tidal, Amazon, and others. Results are cached for 7 days. Anonymous users are limited to 2 lookups per hour.

Dashboard
The main view after login. Shows aggregated earnings across connected tracks, a monthly earnings chart, and a per-platform breakdown. Earnings data is calculated from actual royalty statements uploaded to the platform.

Tracks
Connect a Spotify artist account via OAuth. WavCash pulls in your artist profile and full track catalog, including ISRCs. Tracks are the source of truth for split creation and royalty matching.

Splits
Create a co-ownership agreement for any track in your catalog.

The creation flow is a multi-step wizard:

Select a track
Add contributors by email with their role (songwriter, producer, other)
Assign ownership percentages — must total 100%
Set additional terms: samples, work-for-hire, SoundExchange registration, credits, dispute resolution
Review and generate
When the agreement is submitted, a smart contract is deployed on Avalanche and invite emails are sent to all contributors. Each contributor signs via a unique link — signing is gasless, no crypto wallet required. The agreement activates automatically once every contributor has signed.
When payments arrive, they are routed to the smart contract and the smart contract automatically distributes payments to all contributors according to their verified shares.

A signed split is a permanent legal and onchain record establishing who owns what percentage of a track's earnings.

Actuals
Upload royalty statement CSVs from your distributor. WavCash parses the statement, matches line items to tracks in your catalog by ISRC or title, and flags discrepancies where actual payouts don't match expected amounts based on stream counts and DSP rates.

Notifications
In-app alerts for split activity: when a contributor signs, when an agreement activates, when a payout is distributed.

Settings
Manage your profile, connected Spotify account, and wallet address.

Tech Stack
Next.js 16 / React 19 / TypeScript
Supabase (PostgreSQL)
Privy — authentication via email or embedded wallet
Solidity smart contracts on Avalanche (Fuji testnet)
Spotify API for catalog data
Resend for transactional email
Contact
hello@wav.cash x.com/wavcash
