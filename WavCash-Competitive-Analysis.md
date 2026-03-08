# WavCash: Competitive Analysis
### Updated February 2026 | Covers MVP + Full Roadmap

---

## Overview

WavCash competes across multiple layers simultaneously. At MVP, the product
competes in royalty visibility and label tooling. In Phase 2, it competes in
payments infrastructure and publishing administration. By Phase 5 and beyond,
it competes in music-focused financial products. No single competitor operates
across all of these layers, which is the core structural advantage.

The analysis below covers five competitive categories: royalty intelligence
tools, label royalty accounting software, publishing administration and
collection, distribution platforms, and onchain music infrastructure.

---

## Category 1: Royalty Intelligence and Discrepancy Detection

These tools sit closest to WavCash's core MVP proposition.

---

### Claimy

    Founded:        2023 (Paris, France)
    Raised:         EUR 1.5M pre-seed (October 2025)
    Traction:       EUR 6M in rights under management, 160,000 copyrights
    Notable users:  David Guetta, Celine Dion, Aya Nakamura
    Markets:        France and United Kingdom only

Claimy focuses on identifying unclaimed or underpaid royalties for established
artists and publishers. Their pitch: approximately 30% of music royalties fail
to reach intended recipients annually, a figure they use to justify a
commission-based recovery model. Their early traction with major-name clients
validates investor appetite for royalty intelligence products.

The gap is geographic and demographic. Claimy serves established Western
catalogs, not independent rights holders in emerging markets. They have no
presence in Africa or Latin America, no mobile-first infrastructure, and no
payment rails suited to M-Pesa, PIX, or Paystack. Their model is also reactive
(recover what was missed) rather than predictive (show what should be earned
in real time).

WavCash position: The same market thesis, applied to faster-growing markets
with a real-time oracle rather than a retrospective audit model.

---

### Soundcharts

    Focus:          Music analytics dashboard
    Pricing:        $400 per month and above
    Markets:        Global (Western focus)
    Users:          Primarily labels and managers

Soundcharts aggregates streaming analytics across platforms and surfaces chart
performance, playlist placements, and audience data. It is analytics-forward,
not royalty-forward. It does not calculate what rights holders are owed,
surface discrepancy between earned and paid, or offer any payment
infrastructure.

At $400 per month minimum, it is also priced for established label operations,
not independent artists or small labels in emerging markets.

WavCash position: Not a direct royalty intelligence competitor. Overlaps on
data aggregation but diverges sharply on purpose, price point, and payment
infrastructure.

---

### Chartmetric

    Focus:          Music intelligence for labels and A&R
    Pricing:        From $10/month (personal) to enterprise
    Markets:        Global (US/Western catalog focus)
    Users:          Labels, A&R teams, marketing departments

Chartmetric tracks streaming performance, social data, playlist placements,
and audience demographics for decision-making. It is not a royalty tool. It
does not tell rights holders what they are owed or surface missing money. It
is competitive intelligence, not financial intelligence.

WavCash position: Different tool for different job. No meaningful competition
at MVP or in any future phase.

---

## Category 2: Label Royalty Accounting Software

These tools handle royalty calculation and statement generation for labels.
They serve a similar customer (label/manager) but solve a different problem:
accounting for royalties already received, not surfacing what should have been
received. None have payment infrastructure for emerging markets.

---

### Reprtoir

    HQ:             Cannes, France
    Focus:          Catalog management and royalty accounting for labels
                    and publishers
    Pricing:        Tiered by catalog size (audio files hosted)
    Markets:        Europe-focused, some global coverage
    Users:          Small to enterprise label operations

Reprtoir is an all-in-one workspace: catalog management, royalty accounting,
contract tracking, and statement generation. It handles incoming statements
from distributors and PROs and calculates what each rights holder is owed
based on contract terms. It supports 150-plus currencies and CWR export for
publishing.

What it does not do: real-time oracle estimation, discrepancy detection against
expected earnings, CMO registration guidance, onchain split agreements, or
payment rails to M-Pesa, PIX, or Paystack. It is an accounting tool for
royalties already collected, not an intelligence tool for royalties that should
be collected.

WavCash position: Partial overlap at Enterprise tier (Phase 2). WavCash adds
the intelligence layer (what you should earn) and the payment layer (instant
local settlement) that Reprtoir does not address.

---

### Curve Royalty Systems

    HQ:             Amsterdam, Netherlands
    Focus:          Enterprise royalty accounting and reporting
    Pricing:        Enterprise (custom, high)
    Markets:        US and European major and mid-size labels
    Users:          Enterprise labels, large publishers

Curve handles high-volume royalty accounting: millions of lines of sales data,
contract management, mechanical royalty processing, and artist dashboard
access. It is built for scale and complexity. The pricing reflects this: it is
not accessible to independent managers or small labels in emerging markets.

It has no discrepancy detection against oracle estimates, no CMO registration
guidance, no onchain splits, and no emerging market payment rails.

WavCash position: Not a realistic competitive threat at MVP or Phase 2. Curve
competes in a price band and complexity tier that WavCash does not address in
the near term. Long-term, the Enterprise product may overlap at the label tier
in Phase 4 and beyond.

---

### Infinite Catalog

    HQ:             United States
    Focus:          Royalty accounting and analytics for indie labels
    Pricing:        Tiered, accessible for small labels
    Markets:        US-focused
    Users:          Independent labels and managers

Infinite Catalog is the most accessible of the accounting tools for small
labels. It handles royalty calculation, statement generation, and artist
transparency. It is user-friendly and more affordable than Reprtoir or Curve.

It is US-focused and has no payment rail integrations for emerging markets. It
does not surface discrepancies against expected earnings. It does not offer CMO
registration, onchain splits, or oracle-based estimation. It is an accounting
platform, not an intelligence platform.

WavCash position: Closest analog in spirit at the Enterprise tier. The
differentiation is geography, payment infrastructure, discrepancy detection,
and the oracle layer. Infinite Catalog serves US labels well. It serves
Nigerian or Brazilian labels poorly or not at all.

---

### eddy.app

    HQ:             Europe
    Focus:          Royalty reporting and accounting for indie labels
    Pricing:        From EUR 39/month
    Markets:        European focus
    Users:          Small independent labels

eddy.app is entry-level royalty accounting software: affordable, simple,
statement-focused. It handles incoming distributor data and generates reports
for artists. It is not a discrepancy detection tool, oracle estimator, CMO
guide, split agreement platform, or payment rail. It exists at a price point
accessible to small labels but serves only accounting needs.

WavCash position: Minimal overlap. Different customer geography, different
product purpose.

---

### LabelGrid

    Focus:          Distribution plus basic royalty management
    Pricing:        Bundled with distribution
    Markets:        Mixed, some global
    Users:          Small labels

LabelGrid combines distribution with basic royalty reporting. Its royalty
features are shallow compared to dedicated accounting tools. No oracle,
no discrepancy detection, no emerging market rails, no splits infrastructure.

WavCash position: Adjacent but not competitive. LabelGrid users who need
actual royalty intelligence and payment infrastructure would move to WavCash.

---

## Category 3: Publishing Administration and Collection

These organizations collect royalties on behalf of rights holders through CMO
relationships. WavCash does not compete with them at MVP and is explicitly
designed to complement them. In Phase 2, the CMO payout rail creates a degree
of functional overlap in one area: receiving and distributing CMO royalties.

---

### Afro Soundtrack

    Focus:          Publishing administration for African artists
    Markets:        Africa (primary), global publishing representation
    Model:          Commission on collected royalties
    Relationship:   Partnership opportunity, not competitor

Afro Soundtrack handles CMO registration, global publishing representation,
and royalty collection on behalf of African artists. They have relationships
with CMOs that WavCash does not have and does not need to build at MVP.

The gap they leave is visibility. Artists receive quarterly statements with
little transparency into how royalties were calculated or whether everything
was collected. WavCash fills this gap. In Phase 2, artists who use Afro
Soundtrack for collection can route their received royalties through WavCash
for instant local settlement and split distribution.

WavCash position: Complementary at MVP (we send artists to them for
collection, they collect, we show artists what was collected versus what was
owed). Potential integration partner. In Phase 2 with CMO payout rail active,
partial functional overlap in Nigeria and Brazil, where artists might choose
WavCash's named virtual account as their CMO payout destination.

---

### Songtrust

    Focus:          Global publishing administration
    Markets:        Global
    Model:          15% commission plus annual fee
    Users:          Independent songwriters globally

Songtrust handles publishing administration globally: CMO registration,
royalty collection, and statement generation. They serve a large volume of
independent songwriters but offer no real-time visibility, no discrepancy
detection, no local payment rails in Africa or Latin America, and no split
agreements.

WavCash position: Same as Afro Soundtrack. Complementary at MVP, potential
overlap in Phase 2 depending on how artists configure their payout routing.

---

### CD Baby Pro / DistroKid Publishing

    Focus:          Publishing administration bundled with distribution
    Markets:        Global
    Model:          Commission or annual fee
    Users:          Independent artists

Several distributors offer publishing administration add-ons (CD Baby Pro,
DistroKid Music Publishing). These collect mechanical and performance royalties
on behalf of artists through affiliated publishers. They provide quarterly
statements and no real-time intelligence. No local payment rails. No
discrepancy detection. No split agreements.

WavCash position: Not a direct competitor. WavCash aggregates the data from
these services and surfaces what artists should be receiving versus what
arrives.

---

## Category 4: Distribution Platforms

Distributors are not royalty intelligence or payment infrastructure competitors.
They are data sources. However, as some distributors add analytics features
(DistroKid's Spotify for Artists integration, TuneCore's analytics dashboard),
there is surface-level overlap in earnings visibility.

---

### DistroKid, TuneCore, Amuse, CD Baby

    Focus:          Music distribution to streaming platforms
    Royalty view:   Platform-by-platform earnings statements (quarterly or
                    monthly depending on plan)
    Markets:        Global

Distributors show rights holders what they paid out. They do not show what
rights holders should have earned. They have no oracle layer, no discrepancy
detection, no cross-distributor aggregation, no CMO registration, no split
agreements, and no instant local payment rails.

Many rights holders use multiple distributors for different projects. Each
distributor dashboard shows only that distributor's data. WavCash aggregates
across all of them and surfaces the total picture plus discrepancies.

WavCash position: Distributors are data sources, not competitors. WavCash adds
value on top of what distributors provide. Long-term, distributor OAuth
integrations (Phase 3) deepen this relationship rather than creating conflict.

---

## Category 5: Onchain Music Infrastructure

These projects use blockchain for music ownership or distribution. They address
adjacent problems but not the royalty intelligence and payment infrastructure
problem WavCash solves.

---

### Audius

    Focus:          Decentralized streaming platform
    Blockchain:     Solana
    Markets:        Global
    Traction:       Multi-million user base

Audius is a streaming platform, not a royalty intelligence tool. Artists
upload to Audius and receive AUDIO token payments. It does not address the
problem of fragmented royalties across existing DSPs, CMO registration, split
agreements for existing catalog, or fiat settlement to local payment rails.

WavCash position: Non-overlapping. Audius operates in a parallel universe
(decentralized streaming). WavCash operates in the existing music
infrastructure stack.

---

### Royal.io

    Focus:          Tokenized music ownership (fractional royalty shares)
    Blockchain:     Ethereum/Base
    Markets:        US-focused
    Investors:      a16z

Royal allows artists to sell fractional ownership of their streaming royalties
to fans as NFTs. This is an investment and fan engagement product. It does not
aggregate royalty data, detect discrepancies, guide CMO registration, or
provide payment infrastructure for rights holders in emerging markets.

WavCash position: Non-overlapping at MVP and Phase 2. WavCash's Phase 6
secondary splits marketplace (selling percentage of future royalties onchain)
would create a partial conceptual overlap, but the target market, mechanism,
and geography differ significantly.

---

### Catalog

    Focus:          Music NFT platform
    Markets:        Small, primarily US and Europe
    Users:          Independent artists interested in NFT sales

Catalog allows artists to mint songs as NFTs for direct sale. It is a sales
and collectibles platform, not royalty infrastructure. No overlap with
WavCash at any phase.

---

## Summary: The Competitive Gap

No existing tool combines all of the following:

    Real-time royalty estimation via DSP oracle
    Discrepancy detection against distributor actuals
    CMO registration guidance for African and LATAM markets
    Onchain split agreements with local wallet abstraction
    Virtual account infrastructure for named receipt of royalties
    Instant settlement to M-Pesa, PIX, Paystack, and bank transfer
    Enterprise multi-artist roster management
    Royalty advances underwritten by oracle trajectory data

Western tools (Reprtoir, Curve, Infinite Catalog) solve parts of the
accounting problem for US and European markets. Publishing admins (Afro
Soundtrack, Songtrust) solve the collection problem without visibility. No
tool solves the intelligence, verification, and instant local payment problem
for rights holders in Africa and Latin America.

---

## Competitive Matrix: Core Differentiators

    Factor                    Reprtoir  Claimy  Afro Soundtrack  WavCash
    ---------------------------------------------------------------------------
    Real-time oracle          No        No      No               Yes
    Discrepancy detection     No        Yes*    No               Yes
    CMO registration guide    No        No      Yes              Yes
    Onchain splits            No        No      No               Yes
    M-Pesa / PIX / Paystack   No        No      No               Yes (Phase 2)
    Emerging market native    No        No      Yes (Africa)     Yes
    Enterprise roster tools   Yes       No      No               Yes (Phase 2)
    Royalty advances          No        No      No               Yes (Phase 5)
    Data intelligence API     No        No      No               Yes (Phase 6)

    * Claimy detects discrepancies retrospectively in Western markets only

---

## Future Competitive Risks

### Phase 3 risk: distributor feature expansion

As distributors like DistroKid and TuneCore build out analytics dashboards,
they may surface basic earnings visibility natively. This risk is mitigated by
two factors: distributors show only their own data (WavCash aggregates all),
and no distributor has incentive to surface discrepancies in their own payout
accuracy.

### Phase 4 to 5 risk: African fintech expansion

African fintech companies (Flutterwave, Paystack, Chipper Cash) have the
payment rail infrastructure but not the music domain expertise. A fintech
player adding a "creator tools" product is a realistic Phase 4-plus risk.
WavCash's moat by that stage is the oracle, the CMO network, and the onchain
attribution layer, none of which a payments company can replicate quickly.

### Phase 5 risk: streaming platform advances

Spotify and Apple have begun experimenting with direct artist advances. These
products are not royalty intelligence tools and do not provide the
transparency, discrepancy detection, or split infrastructure WavCash builds.
They do compete for the same underlying royalty cash flow in Phase 5 when
WavCash launches royalty advances.

---

*Source: IFPI Global Music Report 2025, CISAC Global Collections Report 2025,
Claimy press releases (October 2025), company websites and pricing pages*
