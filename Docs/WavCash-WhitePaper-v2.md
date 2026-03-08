# WavCash White Paper
## Royalty Intelligence and Payment Infrastructure for Music Rights Holders
### wav.cash | February 2026 | Version 2.0

---

## Executive Summary

Music rights holders in Africa and Latin America are operating blind. Streaming
revenues in these regions grew 22.5 to 22.6 percent in 2024, among the fastest
rates anywhere in the world. The infrastructure built to track, verify, and
distribute the money those streams generate was designed for different markets,
different eras, and different rights holders. The result is a structural gap
between what the fastest-growing music markets earn and what their rights
holders actually receive.

WavCash is royalty intelligence and payment infrastructure built to close that
gap. It aggregates streaming data across every major DSP, calculates what
rights holders are owed using tamper-proof verified data, surfaces the
difference between expected and actual payouts, guides registration with
Collective Management Organizations, and in Phase 2 settles instantly to local
currency via M-Pesa, PIX, Paystack, bank transfer, or USDC.

The platform serves all music rights holders: artists, producers, songwriters,
session musicians, publishers, and anyone else with a legal stake in a musical
work. Independent artists are the primary acquisition channel and the face of
the product. Every feature is built for the broader rights holder ecosystem,
and the Enterprise tier is designed for labels, managers, and publishers
handling multiple catalogs.

---

## Part 1: The Problem

### Fragmentation by Design

A rights holder in Lagos, Nairobi, or Sao Paulo today earns royalties from
multiple sources that have nothing to do with each other. Their distributor
pays master recording royalties on a monthly or quarterly schedule. Their
Collective Management Organization may or may not have their registration on
file, and if it does, pays out every six to twelve months after significant
administrative delay. YouTube Content ID earnings operate on a separate
schedule. Sync licensing deals pay whenever a placement closes.

Each income stream has its own portal, its own statement format, and its own
currency conversion. A rights holder managing even a small catalog across two
distributors and one CMO is navigating at minimum three separate dashboards
with no unified view of their total earnings. The result is that rights holders
do not know what they are owed. They know what they were paid, and only after
the fact.

### The Verification Problem

Even when rights holders receive payment, they have no reliable way to verify
whether the amount is accurate. In 2024, Kenyan artist Bien-Aime Baraza
publicly refused to collect a royalty check for $11.61 from the Music
Copyright Society of Kenya after accumulating millions of streams. MCSK issued
it according to their distribution methodology. With no independent calculation
to compare against, artists have no way to know whether they are being paid
correctly.

In January 2026, the Nigerian Copyright Commission attempted to distribute over
one billion naira in private copy levies. Major labels objected publicly. The
International Federation of the Phonographic Industry wrote to the Commission
warning of irreversible prejudice to rights holders. The money remains
undistributed. In South Africa, SAMRO unlocked R22 million in unclaimed
royalties simply by updating bank account records.

These are not isolated incidents. They are symptoms of infrastructure that was
not built for the rights holders it purports to serve.

### The Registration Gap

A significant share of royalties go uncollected in Africa and Latin America
because rights holders have never registered their works with the relevant
CMOs. In Nigeria, publishing activity accounts for a small fraction of total
music industry revenue precisely because rights holders are not registered with
organizations like MCSN or COSON. The registration process itself is a barrier.
Each CMO has different requirements, different forms, different documentation,
and different submission channels. For a producer in Lagos managing multiple
tracks across multiple artists, navigating six different CMO processes in four
different countries is prohibitive.

### The Settlement Problem

Even when royalties are collected and verified, the last mile fails. Converting
USD or EUR royalties to Nigerian naira, Kenyan shillings, or Brazilian reais
through traditional banking infrastructure involves three to five percent in
conversion costs and processing times measured in days or weeks. For rights
holders who depend on royalty income to fund their next project, a two-to-six
month payment cycle followed by a slow and expensive conversion is not a
financial system. It is a friction machine.

The payment infrastructure to solve this problem already exists. PIX covers
175 million users across Brazil and processes transactions in seconds. M-Pesa
serves over 34 million active users in Kenya alone. Paystack handles
approximately 20 percent of all online transactions in Nigeria. For rights
holders who prefer to hold or transact in stablecoins, USDC settlement on AVAX
C-Chain is also available. What is missing is the collection and intelligence
layer that connects royalty income to these payment systems.

---

## Part 2: The Market

### Global Context

Global recorded music revenues reached $29.6 billion in 2024, growing 4.8
percent year over year according to IFPI's Global Music Report 2025. Streaming
accounted for 69 percent of total revenues, exceeding $20 billion for the first
time. Paid subscription accounts grew 10.6 percent to 752 million globally.
The growth is not evenly distributed. The fastest-growing regions are precisely
those where WavCash operates.

### Sub-Saharan Africa

Sub-Saharan Africa grew 22.6 percent in 2024, surpassing $100 million in
recorded music revenue for the first time ($110 million). South Africa accounts
for 75 percent of regional revenues and grew 14.4 percent. Nigeria is the
second-largest market and one of the fastest growing on a percentage basis in
local currency terms. CISAC reports that African CMO collections represent less
than one percent of global songwriter royalty collections despite the
continent's growing share of global streaming consumption. The infrastructure
gap is quantifiable.

### Latin America

Latin America grew 22.5 percent in 2024, its fifteenth consecutive year of
growth. Brazil, the region's largest market, grew 21.7 percent, making it the
fastest-growing top ten global market. Mexico grew 15.6 percent and entered
the global top ten for the first time, displacing Australia. Streaming accounts
for 87.8 percent of total Latin American recorded music revenues. The audience
is already digital. What the region lacks is the royalty intelligence
infrastructure to connect streaming activity to verified earnings and instant
settlement.

### Rights Holder Universe

WavCash's addressable market is not limited to artists. Any individual or
entity with a legal stake in a musical work is a potential user.

    Brazil (ECAD system):              323,000 rights holders received
                                       distributions in 2023
    Nigeria and Kenya (estimated):     40,000 registered rights holders
    South Africa (SAMRO, CAPASSO,
    SAMPRA):                           20,000 to 25,000 rights holders
    Argentina and rest of LATAM:       140,000 estimated
    Rest of Africa (estimated):        30,000 to 50,000

    Total estimated rights holders:    550,000 to 580,000

This figure understates the true addressable market because it counts only
those already engaged with formal collection systems. The informal economy of
producers, session musicians, engineers, and artists who have never registered
with any CMO is significantly larger.

---

## Part 3: The Solution

### Royalty Intelligence, Not Royalty Accounting

The fundamental insight behind WavCash is the difference between intelligence
and accounting. Accounting tells you what arrived. Intelligence tells you what
should have arrived. Existing tools in the market handle accounting. WavCash
leads with intelligence.

The oracle layer sits at the center of the product. It fetches stream counts
from every major DSP using track ISRCs, applies published per-stream rates
verified independently through Chainlink data feeds, and calculates estimated
royalties in real time. Rights holders see what they should be earning before
any payment arrives. When payments do arrive, via CSV upload at MVP and
automatic sync in Phase 3, the platform compares actuals against oracle
estimates and flags discrepancies.

The question WavCash answers is not "how much did I get paid?" It is "how much
should I be owed, and is what I received consistent with that?"

### Data Architecture and Trust

The royalty oracle pipeline runs offchain for cost efficiency. Stream count
data is fetched via DSP APIs through a daily batch job and stored in a managed
database. Per-stream rates are sourced from independently verified onchain data
feeds and stored in a rates registry on AVAX C-Chain.

WavCash uses a hybrid approach: the pipeline itself runs offchain, while trust
is enforced through a daily onchain attestation. Once per day, after the full
data snapshot is complete, WavCash writes a single cryptographic merkle root
of the entire dataset to AVAX C-Chain. If any number in the underlying data
were altered, the hash would not match the onchain record. Tampering is
detectable and the verification is permanently and publicly auditable.

The Chainlink layer is abstracted entirely from users. Rights holders interact
with "Verified" badges and clean dashboard data. The technical infrastructure
is invisible. The user-facing claim is simple: your royalty data is permanently
recorded and no one can alter your historical earnings.

### Splits by WavCash

Every song has multiple contributors. Producers, co-writers, featured artists,
session musicians, and engineers all have legitimate claims on a track's
earnings. In practice, these arrangements are governed by verbal agreements,
WhatsApp messages, and informal trust. When money arrives, disputes arise.
Splits by WavCash creates legally binding, onchain co-ownership records before
any money arrives.

When a track is finished, the rights holder creates a Split agreement: adding
each contributor by email with legal name required, or by WavCash ID, a unique
platform identifier that auto-populates contributor details. Each contributor
is assigned a role and a percentage. The agreement is sent for signatures. An
agreement does not become Active until all contributors have signed.

At MVP, a Split is a permanent legal and onchain record. It establishes who
owns what. When royalties arrive for that track, distribution to contributors
happens manually or through the creator's own arrangements.

In Phase 2, when virtual account infrastructure activates, automatic
redistribution turns on. When royalties arrive for a registered ISRC, WavCash
detects the incoming payment, checks whether an active Split agreement exists,
and automatically distributes each contributor's share to their preferred
settlement method: local currency, or USDC. The creating rights holder
forwards nothing manually. The contract executes.

The key architectural fact is that distributors pay the full royalty amount to
whoever registered the track. The distributor has no knowledge of private
split arrangements. WavCash operates as the redistribution layer between the
distributor payout and the individual contributors. This is why the virtual
account infrastructure in Phase 2 is essential: WavCash must receive the full
amount in order to redistribute it.

### Reclaim: CMO Registration Guide

Reclaim is a guided registration tool that helps rights holders navigate CMO
registration in their territory. WavCash prepares the complete submission
package: pre-filled forms using catalog data and profile data already stored
in the system. Rights holders review the package, upload required documents,
and receive step-by-step instructions for submitting through the CMO's own
channel.

WavCash does not submit to CMOs directly at MVP. CMOs do not have public
submission APIs and registration happens through portals, email, or physical
mail. WavCash prepares. The rights holder submits. Status tracking and reminder
emails keep the process moving.

Reclaim covers UBC (Nigeria), MCSK (Kenya), SAMRO and CAPASSO (South Africa),
ECAD (Brazil), and SACM (Mexico) at MVP. Each registration wizard includes a
per-track payout toggle, default on, that configures routing of distributor
royalties through WavCash for instant local settlement or USDC. This toggle is
configurable at MVP and activates operationally in Phase 2.

### Enterprise Multi-Seat Dashboard

Enterprise accounts serve any rights holder or organization managing three or
more artists or works: managers, small labels, independent publishers, and
collective groups. Enterprise is not limited to traditional label structures.

At MVP, Enterprise provides consolidated roster visibility: total earnings
across all artists, Reclaim status per artist per CMO, active Splits across the
roster, and team seat management. In Phase 2, Enterprise adds the full label
tooling suite: bulk payout management, white-label royalty statements, automatic
split redistribution across the roster, and onboarding of artists on the
label's behalf. Enterprise customers arriving at the moment payment rails
activate bring their entire roster into the payout infrastructure from day one,
generating immediate transaction volume.

---

## Part 4: Phase 2 and Beyond

### Virtual Account Infrastructure

Phase 2 activates the payment layer through virtual account infrastructure
issued in rights holders' names by market-specific BaaS partners.

    Nigeria:       Fincra or Paystack DVA (named NUBAN account)
    Brazil:        Dock plus PIX (account tied to artist's CPF)
    Mexico:        Conekta or Dock (CLABE tied to artist's RFC and CURP)
    South Africa:  Ukheshe or FinSwitch (EFT-compatible, pending validation)

Each WavCash account receives a dedicated virtual account in the rights
holder's name. The account details are never surfaced in the product UI. The
account simply receives royalties.

When a distributor pays royalties into this account, WavCash detects the
incoming payment, identifies the ISRC, checks for active Split agreements, and
routes to the rights holder's preferred settlement method: M-Pesa, PIX,
Paystack, bank transfer, or USDC.e on AVAX C-Chain. Rights holders who prefer
stablecoin settlement get the same instant clearance without any FX conversion
cost.

Fee structure on distributor royalties: 0.5 percent transaction fee plus 2
percent FX spread on local currency settlements. USDC.e settlements: 0.5
percent only. Fee structure on CMO royalties: 9.5 percent commission plus
0.5 percent processing fee.

Phase 2 turns on two transaction revenue streams simultaneously from one
infrastructure buildout. Kenya's virtual account infrastructure is a Phase 3
item pending identification of a viable local banking partner for named account
issuance.

### Product Roadmap

    Phase       Focus                          Key Additions
    MVP         Royalty intelligence           Oracle dashboard, Royalty Sniffer,
                                               Reclaim guide, onchain Splits,
                                               Enterprise roster
    Phase 2     Payments + Enterprise tools    Virtual accounts (Nigeria, Brazil,
                                               Mexico, South Africa), distributor
                                               payout rail, CMO payout rail,
                                               full Enterprise suite,
                                               local currency and USDC settlement
    Phase 3     Distribution intelligence      Distributor OAuth, Kenya rail,
                                               Ghana activation, earnings
                                               forecasting, catalog health score
    Phase 4     Territory expansion            Colombia, Argentina, Tanzania
    Phase 5     Financial products             Royalty advances, WavCash card,
                                               earnings-linked savings, float yield
    Phase 6     Data and ecosystem             Anonymized market intelligence,
                                               WavCash API, track licensing
                                               marketplace with onchain agreements
                                               and settlements for beat licensing

---

## Part 5: Technical Architecture

### Stack

    Layer                   Technology                     Rationale
    Frontend                Next.js 14 + TypeScript        SSR, API routes, Vercel deployment
    Database + Auth         Supabase (PostgreSQL +          Managed DB, RLS, encrypted key
                            Auth + Vault)                  storage. No server management.
    Blockchain              AVAX C-Chain (EVM)             Solidity contracts, low fees,
                                                           EVM tooling (Hardhat, ethers.js)
    Wallet (custodial)      ethers.js + Supabase Vault     Silent wallet creation at signup.
                                                           Keys KMS-backed.
    Oracle pipeline         Supabase Edge Functions        Daily stream count fetch.
                            (cron)                         Offchain for cost efficiency.
    Rate verification       Chainlink Data Feeds           Per-stream rates independently
                            via AVAX C-Chain               verified. Updated quarterly.
    Attestation             AVAX C-Chain                   One transaction per day covers
                            (daily merkle root)            all data. ~$0.001/day.
    Email                   Resend                         Transactional email: signing
                                                           invites, status updates, alerts
    Deployment              Vercel                         Automatic deploys from Git

### Oracle Architecture

WavCash uses a hybrid offchain and onchain approach. Stream count data is
fetched from DSP APIs via a daily offchain cron job and stored in a managed
database. Per-stream rates are sourced from Chainlink Data Feeds and stored
onchain in a rates registry on AVAX C-Chain, ensuring that the rate inputs are
independently verifiable and not controlled by WavCash. Once per day, a single
cryptographic merkle root of the entire dataset is written to AVAX C-Chain in
one transaction, creating a tamper-proof permanent record for every rights
holder, every track, and every DSP.

### Onchain Contracts

    DataAttestation.sol    Receives daily merkle root writes. Stores timestamp,
                           root hash, snapshot ID. Public verification function.

    RatesRegistry.sol      Stores per-stream rates fed by Chainlink. Quarterly
                           updates. Authoritative rate source for oracle.

    SplitFactory.sol       Deploys individual Split contracts. Maintains registry
                           of all agreements.

    Split.sol              Per-agreement contract. ISRC, contributor addresses,
                           share allocations, status enum.
                           Functions: sign(), amend(), void().

### Crypto Abstraction Principle

The entire onchain layer is invisible to users by default. Wallet creation at
signup is silent. Split agreements surface as "Agreement Active," not contract
addresses. Data attestation surfaces as "Verified," not transaction hashes.
Onchain details are available only in an optional Verification view the user
must explicitly navigate to.

Product language never uses: wallet, contract, gas, chain, transaction hash,
blockchain. It uses: account, agreement, verified, permanent record.

---

## Part 6: Business Model

### Subscription Tiers (Live at MVP)

    Tier                    Annual Price       Monthly Price    Seats
    Basic                   $6.99/month        $9.99/month      1
    Premium                 $11.99/month       $14.99/month     1
    Enterprise (3-seat)     $45/month          $55/month        3
    Enterprise (5-seat)     $75/month          $85/month        5

### Transaction Fees (Phase 2, payment rails active)

Distributor royalties settled to local currency: 0.5% transaction fee plus
2% FX spread.

Distributor royalties settled to USDC.e: 0.5% transaction fee only.

CMO royalties received through a WavCash named virtual account: 9.5%
commission plus 0.5% processing fee.

### Revenue Projections

Subscription revenue: 1,000 label and manager accounts at $75/month average
represents $900K ARR. 10,000 individual rights holders at $12/month average
represents $1.44M ARR, for a combined subscription base of approximately
$2.34M ARR at these targets.

Transaction revenue in Phase 2: A 2.5 percent effective rate on royalty flow
through the platform generates approximately $2 million per one percent of
regional streaming revenue captured.

### Future Revenue Streams

Phase 5 introduces royalty advances underwritten by oracle trajectory data and
earnings history, a WavCash card funded by royalty balance, earnings-linked
savings, and float yield on idle balances passed partially to rights holders
as an incentive for keeping balance on platform.

Phase 6 introduces anonymized market intelligence sold to labels and DSPs, API
licensing to distributors and third parties, and a track licensing marketplace
with onchain agreements and settlements for beat licensing. Producers can
license beats directly on the platform with ownership terms baked into the
agreement and automatic royalty routing upon release.

---

## Part 7: Go-to-Market

### Phase 1: Rights Holder Direct

Launch in Nigeria and South Africa with the Royalty Sniffer as the primary
acquisition tool. Any rights holder pastes their Spotify URL and sees an
estimate of their royalties and missing money before creating an account. The
conversion prompt is "Claim your earnings, create a free account." Organic
sharing is natural: "I found $X I did not know I was owed." Target: 5,000
rights holders in six months.

### Phase 2: Label Partnerships and Payments Launch

Enterprise tooling ships alongside payment infrastructure. Labels who join
bring their entire roster into the payout system at once. The Splits viral loop
activates simultaneously: every Split agreement notifies two to five new
people, and every signing page prompts account creation.

### Phase 3 and Beyond

Distributor OAuth integrations replace CSV upload with automatic statement
sync. Kenya payment infrastructure activates. Ghana adds GHAMRO CMO
integration. Colombia and Argentina follow in Phase 4. Financial products
launch in Phase 5. Data marketplace and track licensing marketplace in Phase 6.

### Milestone Summary

    Timeline       Target                           Focus
    3 months       1,000 rights holders             MVP live. Royalty Sniffer launched.
                                                    Nigeria and South Africa.
    6 months       5,000 rights holders             Enterprise tier live.
                                                    Onchain Splits active.
    12 months      5,000+ users plus 50             Payment rails live in Nigeria,
                   label accounts                   Brazil, and South Africa.
                                                    First transaction revenue.
    18 months      25,000 rights holders            $1M+ ARR. Series A ready.

---

## Conclusion

The global music industry is worth $29.6 billion and growing. The
fastest-growing markets are Africa and Latin America. The rights holders in
those markets are building global careers on infrastructure that was not
designed for them: opaque, slow, fragmented, and expensive.

WavCash is transparent by design, fast by architecture, and built from the
ground up for the rights holder in Lagos, Sao Paulo, or Nairobi who deserves
to know exactly how their music is earning and to receive that money in a form
they can use, now, not in six months. The oracle is tamper-proof. The splits
are permanent. The payment rails are local. Settlements land in local currency
or USDC, whichever the rights holder prefers. The product serves everyone:
artists, producers, songwriters, session musicians, publishers, and the
managers and labels who work with them all.

Your music. Your money. Finally.

wav.cash
