# Map datasets — notes (retrieved 3 October 2026)

Everything in `al_counties.csv`, `us_states.csv` and `overlays.json` was assembled by `build.py` / `build_overlays.py`
from the files in `raw/`. Each raw file is the compact string returned by an in-browser fetch, typed to disk and then
checked two ways against values computed in the browser: per-column sum and non-empty count, and a whole-string hash
(`raw/checks.md`). All retrievals matched. No WebFetch was used; every layer is `retrieval: "browser-js"`.

## How the files were put together (decisions worth knowing)

- **County Health Rankings: which release.** The latest *annual* release on countyhealthrankings.org is still the
  **2025 Annual Data Release** — no 2026 annual release is listed. There is, however, a **Supplemental Data Release
  dated 25 March 2026** that updates 50 measures with a newer data year. The 12 wanted measures it contains are taken
  from the supplement (newest values); *children in poverty*, *severe housing problems* and *% rural* are not in the
  supplement and come from the 2025 annual file. The 2025 annual values for all 15 measures are kept in
  `raw/chr_annual2025_*.csv` in case the site should show one release only. Each layer's `vintage` says which.
- **Rounding of CHR values.** The source carries long decimals. Percent measures are stored as fraction x 100 to one
  decimal, rates/days/years to one decimal, provider ratios as whole residents-per-provider. Nothing else was altered.
- **US row.** FIPS is `00` (County Health Rankings' code; QuickFacts' CSV gives `1`). US values are each source's own
  national row: QuickFacts "United States"; CHR national row; KFF "United States" (includes territories — 6,708
  designations in the 50 states + DC plus 99 in the eight territory rows = 6,807); MHA "National"; NRI "Total"
  (50 states + DC + Puerto Rico). CDC, MHA ranks, Medicaid expansion and CCBHC status have no US value.
- **District of Columbia** has an empty name field in the CHR supplement; the QuickFacts name is used.
- **HRSA county rule.** From the national mental-health HPSA detail file: Alabama rows, area designations only
  (geographic, high-needs geographic, low-income population), status Designated or Proposed For Withdrawal. Where a
  county has both a new Designated record and an older Proposed For Withdrawal record (11 counties), the Designated one
  is used. Facility HPSAs (health centers, rural health clinics, prisons) are not in the county layer.
- **Medicaid expansion dates** converted from M/D/YYYY to ISO. Status lower-cased to `adopted` / `not_adopted`.
- **Categorical columns**: `hpsa_mh_designation`, `hpsa_mh_coverage`, `hpsa_mh_status` (counties);
  `medicaid_expansion_status`, `medicaid_expansion_date`, `ccbhc_status` (states). All other columns are numeric.

## Not obtained, and why

| Wanted | Outcome |
|---|---|
| SAMHSA URS 2024 penetration rate (people served per 1,000) by state | **No national state-by-state table exists** on SAMHSA's URS pages — the output tables are one PDF per state, about 7 MB each (2025 tables are now also posted). Only Alabama's 2024 PDF was read: Alabama **18.31** per 1,000 vs U.S. **23.46** (59 states/territories reporting). Saved in `raw/urs2024_alabama.json`; not a map layer. Pulling 51 PDFs (~350 MB) was judged too heavy on the host for this pass. |
| County Health Rankings 2026 annual release | Does not exist as of today (see above). |
| MHA 2026 edition | Not published; the site's current edition is 2025 (report PDF dated September 2025). |
| KFF uninsured rate | Not fetched — covered by QuickFacts `pct_uninsured_u65` and CHR `chr_uninsured_adults`. |
| HPSA "part of county" | Never occurs: every Alabama mental-health area HPSA is built from whole counties. |
| CCBHC certification dates | ADMH pages give only "moved to the CCBHC model in 2024" (AltaPointe, WellStone) and SAMHSA approval months (Mountain Lakes October 2025, Highland April 2026). South Central is listed as a CCBHC in ADMH's directory and map but no date was found. |
| East Alabama adolescent unit — city/county | ADMH's Facility Operations page names East Alabama Medical Center (contracted child/adolescent inpatient care) but gives no address, city or county; left empty rather than filled from memory. |
| NRI per-state "people served" | The NRI report gives a national total only (8.1 million). |
| Underlying data year for some QuickFacts facts | The CSV labels for under-18, 65+, race/ethnicity, poverty and uninsured carry no year; only the QuickFacts vintage (V2025) and fact code are recorded. |

## Things that look surprising or need a human eye

**Census / CHR**
- QuickFacts cross-checks hold exactly: the 67 county populations sum to Alabama's 5,193,088; county veterans sum to
  the state's 303,253; 50 states + DC sum to the US 341,784,857.
- **Coosa and Lamar have no primary care physician ratio because the file reports zero physicians** (numerator 0).
  An empty cell there means "none", not "suppressed" — worth a distinct map treatment.
- Washington County's primary-care ratio is 15,122 residents per physician and Lowndes' is 9,777; Lowndes' mental
  health provider ratio is 9,485. These are real source values, driven by one or two providers.
- County suicide rate is suppressed for 12 counties and overdose rate for 19 (small numbers).
- **State-level survey measures jumped between the 2025 release and the March 2026 supplement** — e.g. California
  frequent mental distress 14.6% -> 18.4%, U.S. 16.3% -> 18.6%, Alabama 18.7% -> 19.6% — while the Alabama county
  average for poor mental health days moved the other way (about 6.2 -> 5.8). That looks like a method change, not a
  one-year shift. Do not compare values across the two releases.
- In the supplement Kentucky and Pennsylvania have no 2023 survey-based values, Connecticut has no provider ratios,
  and loneliness / social-support are missing for 11 states.
- CHR's page notes the project's data assets are being moved to an open-source project "beyond 2026".

**Shortage areas**
- **Madison is the only Alabama county with no current area-based mental health HPSA** (its old geographic HPSA was
  withdrawn in 1999). 66 of 67 counties are whole-county HPSAs; 21 of those are flagged "Proposed For Withdrawal".
- KFF: Alabama shows 67 mental health HPSA designations (a coincidence with the county count — it includes
  facilities), 28.4% of need met, 128 practitioners needed. DC shows 0% need met; Vermont shows N/A.

**State comparisons**
- MHA 2025: Alabama is **49th overall, 51st (last) for access to care, 50th for youth**, 18th for adults and for
  prevalence; 66.4% of youth with a major depressive episode received no services (ranked 51). MHA's Alabama workforce
  ratio (740:1) is older and rounded; CHR's current figure is 639:1.
- NRI FY2024: Alabama $133.15 per resident (rank 30 of 52). The spread is extreme — Oregon $640.80, Michigan $34.22
  (97.7% of Michigan's reported spending is state hospitals) — which reflects what each state agency controls, not
  only generosity. Use with that caveat.
- CDC 2024: Alabama suicide rate 15.9 (837 deaths), overdose rate 25.0 (1,211 deaths). These single-year state rates
  are not comparable with CHR's multi-year county rates.
- SAMHSA's CCBHC map description puts Alabama among 12 states "participating in CCBHC Medicaid Demonstration". The
  description assigns each state to one category only, and the page text mentions an earlier eight-state cohort that the
  description does not obviously include in that list — treat `ccbhc_status` as SAMHSA's wording, not a full roster.

**ADMH pages that disagree with each other** (both versions are recorded in `overlays.json`)
1. **Crisis center catchments.** The Crisis Centers page lists counties for each of the six centers: 60 counties.
   Seven — Butler, Coffee, Colbert, Covington, Crenshaw, Franklin, Lauderdale — are assigned to no center, and the alt
   text of the crisis-center map says the same. But the current map image (file dated 2026/09) shades the whole state
   and its boundaries do not obviously leave those seven out. The Crisis System of Care page describes Carastar's area
   only as "the entire River Region" plus Chambers, Lee, Russell and Tallapoosa, and spells Clarke as "Clark" and
   DeKalb as "Dekalb". The text lists from the Crisis Centers page are used.
2. **Mobile crisis teams.** The Rural Crisis Care page lists programs covering 25 counties (including the Carastar
   teams' 11 counties, Mobile, Baldwin, Jefferson and Madison). The mobile-crisis map's alt text lists only 10 counties
   (Covington, Cullman, Dallas, Escambia, Houston, Marengo, Marion, Perry, Wilcox, Winston). Elsewhere ADMH says
   "14 teams at 11 community mental health centers". The Rural Crisis Care page also still refers to "the four regional
   Crisis Centers" although six are open.
3. **Community mental health centers.** ADMH's Mental Illness Services map labels 19 centers. The Emergency Contact
   Numbers page gives one provider per county for 64 counties, but for **Blount and St. Clair it lists Eastside Mental
   Health Center (plus Restore Health Group in St. Clair), and for Jefferson eight providers**, whereas the map and
   ADMH's crisis pages attribute those three counties to JBS. The lookup uses JBS and keeps the page's listing
   alongside. The same page's by-provider list for AltaPointe omits Mobile County, though the by-county list has it.
4. **CCBHCs.** The 28 May 2026 release names four (AltaPointe, WellStone, Mountain Lakes, Highland); the service
   directory and the CCBHC map (2026/07) show five, adding South Central Alabama Mental Health.

## Layers I would trust least

1. `overlays.json › mental_illness_service_regions` and the crisis-center **opening dates** — read by eye from ADMH map
   images (the region read is at least self-consistent: every center's counties fall in one region, except AltaPointe,
   which the map shows in two).
2. `ccbhc_status` — from the alt text of a map image, one category per state.
3. `overlays.json › mobile_crisis` — ADMH's own descriptions conflict (above).
4. CHR state-level survey measures in the supplement (`chr_poor_mh_days`, `chr_freq_mental_distress`,
   `chr_excessive_drinking`, `chr_loneliness`, `chr_lack_social_support`) because of the unexplained level shift.
5. `nri_smha_exp_per_capita` as a like-for-like comparison (definition of "controlled by the SMHA" varies by state).
   The numbers themselves were extracted from a PDF but every row re-computes (total / population) to the cent.
6. `kff_mh_hpsa_population` (overlapping HPSAs can double-count) and `hpsa_mh_status` (a third of counties are
   mid-way through re-designation, so this will change at HRSA's next update).
7. `mha_mh_workforce_ratio` — superseded by `chr_mh_provider_ratio`.

## Files

- `raw/*.csv|psv|txt` — one file per retrieval, exactly as returned; `raw/*_meta.json` — URLs, source wording, observations.
- `raw/checks.md` — browser vs on-disk sums, counts and hashes for every retrieval, then the final assembly check.
- `build.py`, `build_overlays.py`, `final_check.py`, `check.py`, `hashcheck.py` — rerunnable from this folder.
