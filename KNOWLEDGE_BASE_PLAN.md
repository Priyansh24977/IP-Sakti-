# Knowledge Base Plan — India + US (IP-SAKTI Sahayak)

Scope for the prototype: **two jurisdictions only — India and the US.** This is
the file we steer the DATA phase from. Check items off as each source doc is
drafted and *verified against the official text*.

## How the files work (so we don't touch code yet)

- `embed.js` reads **every `.txt` inside `data/` (flat — no subfolders)**.
- So each source is one flat file named `country_topic.txt`.
- The filename is what shows up as the citation, so a good name = a clean source label.
- After adding/editing files, rebuild with `npm run embed`.

## India

- [x] `section_3p.txt` — Section 3(p) traditional-knowledge exclusion *(exists)*
- [x] `patentability_criteria.txt` — novelty / inventive step / industrial applicability *(exists)*
- [x] `tkdl_overview.txt` — TKDL as defensive prior art *(exists)*
- [ ] `india_biodiversity_abs.txt` — Biological Diversity Act 2002 (2023 amend.), NBA approval + ABS for biological resources & associated TK
- [ ] `india_gi.txt` — Geographical Indications Act 1999 (region-linked Ayurvedic goods)
- [ ] `india_regulatory_dc_fssai.txt` — Drugs & Cosmetics (ASU drug licensing) + FSSAI Ayurveda-Aahar (nutraceutical/food route)

*(Optional later: rename the 3 existing files to an `india_` prefix so every
citation shows its country. Safe — we re-embed anyway. Your call.)*

## US

Priority order matters: § 101 comes before § 102. If someone asks "can I patent
an Ashwagandha extract in the US", the governing answer is § 101 /
products-of-nature — NOT novelty. With only a § 102 doc loaded, the assistant
gives a confident wrong answer.

- [x] `us_patent_subject_matter.txt` — 35 U.S.C. § 101 + products-of-nature doctrine (Funk Bros, Myriad) *(DRAFTED — review format)*
- [ ] `us_novelty_prior_art.txt` — § 102 novelty, § 103 non-obviousness, § 112 enablement; how TK counts as prior art *(drafted in the other chat — SAVE IT INTO data/)*
- [ ] `us_case_turmeric.txt` — US Patent 5,401,504 wound-healing claims cancelled 1997 after CSIR re-examination request; Sanskrit texts + 1953 J. Indian Medical Assn. paper as prior art
- [ ] `us_dietary_supplements_dshea.txt` — DSHEA 1994; Ayurvedic products as dietary supplements; FDA (no premarket approval), structure/function claims, cGMP
- [ ] `us_fda_botanical_drug.txt` — FDA Botanical Drug Development pathway (IND/NDA) if marketed as a drug
- [ ] `us_trademark_geo.txt` — Lanham Act trademarks + certification marks; **no sui generis GI** (the sharp India-vs-US contrast)

## Case studies (strongest demo + PPT material)

Real revoked-patent cases are the best test questions because the correct answer
is checkable, not vague. Keep each case in its own file.

- [ ] `us_case_turmeric.txt` — above
- [ ] `case_neem_epo.txt` — EPO patent EP0436257 (USDA / W.R. Grace) revoked 2000, appeal dismissed 2005 *(EPO, not US — label it honestly)*
- [ ] `case_basmati_ricetec.txt` — RiceTec US 5,663,484; most claims withdrawn/rejected 2001–02 *(optional)*

**Verify every case detail** — patent numbers, dates, and outcomes are exactly
the facts a judge might spot-check, and exactly what an LLM is most likely to
get subtly wrong.

## Verification (your responsibility — important for judging)

For each doc, confirm the statute/section numbers and case names against an
official source (India Code, IP India, TKDL; USPTO MPEP, FDA.gov, USC). I draft
the plain-language summary; you confirm it's accurate. Accuracy is what makes
the "source-cited" claim real.

## Working order

1. Agree this list (add/remove/rename anything).
2. Draft the docs — decide the split: I draft, you verify? Or you take a couple?
3. Switch the classifier from India/International to **India/US**, then `npm run embed`.
4. Test 15-20 questions, log the real numbers.
5. UI.
