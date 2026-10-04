# Retrieval checks — JS (in-browser) vs Python (on-disk) column sums and non-empty counts

## raw/quickfacts_al_counties.csv  (67 rows)

| column | JS sum | JS count | Python sum | Python count | match |
|---|---|---|---|---|---|
| pop_est | 5193088.00 | 67 | 5193088.00 | 67 | OK |
| pct_under18 | 1418.50 | 67 | 1418.50 | 67 | OK |
| pct_65plus | 1435.10 | 67 | 1435.10 | 67 | OK |
| pct_black | 1873.90 | 67 | 1873.90 | 67 | OK |
| pct_hispanic | 356.00 | 67 | 356.00 | 67 | OK |
| pct_white_nh | 4183.30 | 67 | 4183.30 | 67 | OK |
| pct_aian | 76.80 | 67 | 76.80 | 67 | OK |
| veterans | 303253.00 | 67 | 303253.00 | 67 | OK |
| median_hh_income | 3721964.00 | 67 | 3721964.00 | 67 | OK |
| per_capita_income | 2062712.00 | 67 | 2062712.00 | 67 | OK |
| pct_poverty | 1259.40 | 67 | 1259.40 | 67 | OK |
| pct_uninsured_u65 | 701.10 | 67 | 701.10 | 67 | OK |
| pct_disability_u65 | 927.80 | 67 | 927.80 | 67 | OK |
| pct_broadband | 5517.10 | 67 | 5517.10 | 67 | OK |
| pct_bachelors | 1334.90 | 67 | 1334.90 | 67 | OK |
| pop_density | 6340.20 | 67 | 6340.20 | 67 | OK |
| land_area_sqmi | 50647.19 | 67 | 50647.19 | 67 | OK |

## raw/quickfacts_us_states.csv  (52 rows)

| column | JS sum | JS count | Python sum | Python count | match |
|---|---|---|---|---|---|
| pop_est | 683569714.00 | 52 | 683569714.00 | 52 | OK |
| pct_under18 | 1091.90 | 52 | 1091.90 | 52 | OK |
| pct_65plus | 1011.80 | 52 | 1011.80 | 52 | OK |
| pct_black | 621.60 | 52 | 621.60 | 52 | OK |
| pct_hispanic | 745.50 | 52 | 745.50 | 52 | OK |
| pct_white_nh | 3312.50 | 52 | 3312.50 | 52 | OK |
| pct_aian | 127.50 | 52 | 127.50 | 52 | OK |
| veterans | 32371766.00 | 52 | 32371766.00 | 52 | OK |
| median_hh_income | 4181725.00 | 52 | 4181725.00 | 52 | OK |
| per_capita_income | 2294509.00 | 52 | 2294509.00 | 52 | OK |
| pct_poverty | 619.80 | 52 | 619.80 | 52 | OK |
| pct_uninsured_u65 | 471.50 | 52 | 471.50 | 52 | OK |
| pct_disability_u65 | 510.60 | 52 | 510.60 | 52 | OK |
| pct_broadband | 4703.50 | 52 | 4703.50 | 52 | OK |
| pct_bachelors | 1833.40 | 52 | 1833.40 | 52 | OK |
| pop_density | 21700.10 | 52 | 21700.10 | 52 | OK |
| land_area_sqmi | 7066076.57 | 52 | 7066076.57 | 52 | OK |

Whole-string hash (h=h*31+code mod 1e9+7): JS 526319452 / Python 526319452 / OK; length JS 5905 / Python 5905

raw/quickfacts_al_counties.csv whole-string hash: JS 633635813 / Python 633635813 / OK; length JS 7039 / Python 7039

## raw/chr_supp2026_al_counties.csv  (67 rows)

| column | JS sum | JS count | Python sum | Python count | match |
|---|---|---|---|---|---|
| chr_poor_mh_days | 391.00 | 67 | 391.00 | 67 | OK |
| chr_freq_mental_distress | 1300.10 | 67 | 1300.10 | 67 | OK |
| chr_suicide_rate | 984.30 | 55 | 984.30 | 55 | OK |
| chr_drug_overdose_rate | 1323.30 | 48 | 1323.30 | 48 | OK |
| chr_mh_provider_ratio | 143487.00 | 67 | 143487.00 | 67 | OK |
| chr_pcp_ratio | 194733.00 | 65 | 194733.00 | 65 | OK |
| chr_uninsured_adults | 894.90 | 67 | 894.90 | 67 | OK |
| chr_excessive_drinking | 1067.60 | 67 | 1067.60 | 67 | OK |
| chr_social_associations | 729.10 | 67 | 729.10 | 67 | OK |
| chr_life_expectancy | 4861.70 | 67 | 4861.70 | 67 | OK |
| chr_loneliness | 2491.00 | 67 | 2491.00 | 67 | OK |
| chr_lack_social_support | 1807.20 | 67 | 1807.20 | 67 | OK |

Whole-string hash (h=h*31+code mod 1e9+7): JS 192088902 / Python 192088902 / OK; length JS 4942 / Python 4942

## raw/chr_supp2026_us_states.csv  (52 rows)

| column | JS sum | JS count | Python sum | Python count | match |
|---|---|---|---|---|---|
| chr_poor_mh_days | 280.90 | 50 | 280.90 | 50 | OK |
| chr_freq_mental_distress | 910.60 | 50 | 910.60 | 50 | OK |
| chr_suicide_rate | 845.70 | 52 | 845.70 | 52 | OK |
| chr_drug_overdose_rate | 1739.90 | 52 | 1739.90 | 52 | OK |
| chr_mh_provider_ratio | 15777.00 | 51 | 15777.00 | 51 | OK |
| chr_pcp_ratio | 66923.00 | 51 | 66923.00 | 51 | OK |
| chr_uninsured_adults | 525.90 | 52 | 525.90 | 52 | OK |
| chr_excessive_drinking | 959.70 | 50 | 959.70 | 50 | OK |
| chr_social_associations | 547.30 | 52 | 547.30 | 52 | OK |
| chr_life_expectancy | 4012.70 | 52 | 4012.70 | 52 | OK |
| chr_loneliness | 1389.60 | 41 | 1389.60 | 41 | OK |
| chr_lack_social_support | 992.90 | 41 | 992.90 | 41 | OK |

Whole-string hash (h=h*31+code mod 1e9+7): JS 223324778 / Python 223324778 / OK; length JS 3897 / Python 3897

## raw/chr_annual2025_al_counties.csv  (67 rows)

| column | JS sum | JS count | Python sum | Python count | match |
|---|---|---|---|---|---|
| chr_poor_mh_days | 418.00 | 67 | 418.00 | 67 | OK |
| chr_freq_mental_distress | 1381.90 | 67 | 1381.90 | 67 | OK |
| chr_suicide_rate | 980.00 | 54 | 980.00 | 54 | OK |
| chr_drug_overdose_rate | 1092.80 | 47 | 1092.80 | 47 | OK |
| chr_mh_provider_ratio | 155987.00 | 67 | 155987.00 | 67 | OK |
| chr_pcp_ratio | 202483.00 | 65 | 202483.00 | 65 | OK |
| chr_uninsured_adults | 940.20 | 67 | 940.20 | 67 | OK |
| chr_excessive_drinking | 1076.70 | 67 | 1076.70 | 67 | OK |
| chr_social_associations | 719.40 | 67 | 719.40 | 67 | OK |
| chr_life_expectancy | 4832.10 | 67 | 4832.10 | 67 | OK |
| chr_loneliness | 2348.20 | 67 | 2348.20 | 67 | OK |
| chr_lack_social_support | 1833.20 | 67 | 1833.20 | 67 | OK |
| chr_children_poverty | 1772.30 | 67 | 1772.30 | 67 | OK |
| chr_severe_housing | 793.40 | 67 | 793.40 | 67 | OK |
| chr_pct_rural | 4771.70 | 67 | 4771.70 | 67 | OK |

Whole-string hash (h=h*31+code mod 1e9+7): JS 856675730 / Python 856675730 / OK; length JS 6004 / Python 6004

## raw/chr_annual2025_us_states.csv  (52 rows)

| column | JS sum | JS count | Python sum | Python count | match |
|---|---|---|---|---|---|
| chr_poor_mh_days | 269.80 | 52 | 269.80 | 52 | OK |
| chr_freq_mental_distress | 860.70 | 52 | 860.70 | 52 | OK |
| chr_suicide_rate | 846.00 | 52 | 846.00 | 52 | OK |
| chr_drug_overdose_rate | 1665.90 | 52 | 1665.90 | 52 | OK |
| chr_mh_provider_ratio | 16846.00 | 52 | 16846.00 | 52 | OK |
| chr_pcp_ratio | 69113.00 | 52 | 69113.00 | 52 | OK |
| chr_uninsured_adults | 537.70 | 52 | 537.70 | 52 | OK |
| chr_excessive_drinking | 1025.80 | 52 | 1025.80 | 52 | OK |
| chr_social_associations | 549.20 | 52 | 549.20 | 52 | OK |
| chr_life_expectancy | 3992.70 | 52 | 3992.70 | 52 | OK |
| chr_loneliness | 1349.00 | 41 | 1349.00 | 41 | OK |
| chr_lack_social_support | 1033.50 | 41 | 1033.50 | 41 | OK |
| chr_children_poverty | 793.80 | 52 | 793.80 | 52 | OK |
| chr_severe_housing | 794.80 | 52 | 794.80 | 52 | OK |
| chr_pct_rural | 1398.30 | 52 | 1398.30 | 52 | OK |

Whole-string hash (h=h*31+code mod 1e9+7): JS 64706330 / Python 64706330 / OK; length JS 4770 / Python 4770

## raw/hrsa_mh_hpsa_al_counties.csv  (67 rows)

| column | JS sum | JS count | Python sum | Python count | match |
|---|---|---|---|---|---|
| hpsa_mh_score | 1021.00 | 66 | 1021.00 | 66 | OK |

Whole-string hash (h=h*31+code mod 1e9+7): JS 146203758 / Python 146203758 / OK; length JS 6454 / Python 6454

## raw/kff_mh_hpsa_states.csv  (52 rows)

| column | JS sum | JS count | Python sum | Python count | match |
|---|---|---|---|---|---|
| kff_mh_hpsa_designations | 13515.00 | 52 | 13515.00 | 52 | OK |
| kff_mh_hpsa_population | 272567469.00 | 51 | 272567469.00 | 51 | OK |
| kff_mh_hpsa_pct_need_met | 1386.21 | 51 | 1386.21 | 51 | OK |
| kff_mh_hpsa_practitioners_needed | 13478.00 | 51 | 13478.00 | 51 | OK |

Whole-string hash (h=h*31+code mod 1e9+7): JS 789785471 / Python 789785471 / OK; length JS 1681 / Python 1681

## raw/kff_medicaid_expansion_states.psv
Whole-string hash: JS 589683174 / Python 589683174; length JS 2137 / Python 2137; OK

## raw/mha2025_states.csv  (52 rows)

| column | JS sum | JS count | Python sum | Python count | match |
|---|---|---|---|---|---|
| mha_overall_rank | 1326.00 | 51 | 1326.00 | 51 | OK |
| mha_adult_rank | 1326.00 | 51 | 1326.00 | 51 | OK |
| mha_youth_rank | 1326.00 | 51 | 1326.00 | 51 | OK |
| mha_prevalence_rank | 1326.00 | 51 | 1326.00 | 51 | OK |
| mha_access_rank | 1326.00 | 51 | 1326.00 | 51 | OK |
| mha_adult_ami_pct | 1255.69 | 52 | 1255.69 | 52 | OK |
| mha_youth_mde_pct | 1001.68 | 52 | 1001.68 | 52 | OK |
| mha_youth_mde_no_services_pct | 2603.70 | 52 | 2603.70 | 52 | OK |
| mha_adult_ami_uninsured_pct | 459.70 | 52 | 459.70 | 52 | OK |
| mha_mh_workforce_ratio | 17940.00 | 52 | 17940.00 | 52 | OK |

Whole-string hash (h=h*31+code mod 1e9+7): JS 953380261 / Python 953380261 / OK; length JS 2850 / Python 2850

## raw/cdc_sos_2024_states.csv  (51 rows)

| column | JS sum | JS count | Python sum | Python count | match |
|---|---|---|---|---|---|
| cdc_suicide_rate | 814.40 | 51 | 814.40 | 51 | OK |
| cdc_suicide_deaths | 48824.00 | 51 | 48824.00 | 51 | OK |
| cdc_overdose_rate | 1280.60 | 51 | 1280.60 | 51 | OK |
| cdc_overdose_deaths | 79384.00 | 51 | 79384.00 | 51 | OK |

Whole-string hash (h=h*31+code mod 1e9+7): JS 94653049 / Python 94653049 / OK; length JS 1188 / Python 1188

## raw/nri_smha_expenditures_fy2024.csv  (53 rows)

| column | JS sum | JS count | Python sum | Python count | match |
|---|---|---|---|---|---|
| nri_smha_exp_per_capita | 9970.91 | 53 | 9970.91 | 53 | OK |
| nri_smha_exp_per_capita_rank | 1378.00 | 52 | 1378.00 | 52 | OK |
| nri_smha_exp_total | 122796777522.00 | 53 | 122796777522.00 | 53 | OK |
| nri_civilian_pop | 684652740.00 | 53 | 684652740.00 | 53 | OK |

Whole-string hash (h=h*31+code mod 1e9+7): JS 909043923 / Python 909043923 / OK; length JS 2091 / Python 2091

## raw/samhsa_ccbhc_map_alt_text.txt
Whole-string hash: JS 107140446 / Python 107140446; length JS 920 / Python 920; OK

## raw/admh_crisis_centers.txt
Whole-string hash: JS 775956973 / Python 775956973; length JS 1161 / Python 1161; OK

## raw/admh_rural_crisis_mobile_teams.txt
Whole-string hash: JS 316607444 / Python 316607444; length JS 1333 / Python 1333; OK

## raw/admh_ccbhc_service_directory.txt
Whole-string hash: JS 552944789 / Python 552944789; length JS 2024 / Python 2024; OK

## raw/admh_crisis_system_of_care.txt
Whole-string hash: JS 363134184 / Python 363134184; length JS 2550 / Python 2550; OK

## raw/admh_emergency_numbers_by_county.txt
Whole-string hash: JS 410576975 / Python 410576975; length JS 3815 / Python 3815; OK

## raw/admh_emergency_numbers_by_provider.txt
Whole-string hash: JS 765320934 / Python 765320934; length JS 2177 / Python 2177; OK

# Final assembly check (final_check.py)

OK   67 unique county FIPS, all 5-digit starting 01
OK   county FIPS are 01001..01133 odd numbers in file order
OK   52 state rows (50 states, DC, US) with unique 2-digit FIPS
OK   one US row and one DC row
OK   no column entirely empty []
OK   layer ids unique
OK   every county column has a layers.json entry with geography county, and vice versa
OK   every state column has a layers.json entry with geography state, and vice versa
OK   all layers have every required field; higher_is/retrieval/retrieved valid
OK   no zero values in county file (missing = empty, never zero)
OK   only zeros in state file are real source zeros: [('DC', 'chr_pct_rural'), ('DC', 'kff_mh_hpsa_pct_need_met')]

| file | column | final sum | final n | raw sum | raw n | match |
|---|---|---|---|---|---|---|
| al_counties.csv | pop_est | 5193088 | 67 | 5193088 | 67 | OK |
| al_counties.csv | pct_under18 | 1418.5 | 67 | 1418.5 | 67 | OK |
| al_counties.csv | pct_65plus | 1435.1 | 67 | 1435.1 | 67 | OK |
| al_counties.csv | pct_black | 1873.9 | 67 | 1873.9 | 67 | OK |
| al_counties.csv | pct_hispanic | 356.0 | 67 | 356.0 | 67 | OK |
| al_counties.csv | pct_white_nh | 4183.3 | 67 | 4183.3 | 67 | OK |
| al_counties.csv | pct_aian | 76.8 | 67 | 76.8 | 67 | OK |
| al_counties.csv | veterans | 303253 | 67 | 303253 | 67 | OK |
| al_counties.csv | median_hh_income | 3721964 | 67 | 3721964 | 67 | OK |
| al_counties.csv | per_capita_income | 2062712 | 67 | 2062712 | 67 | OK |
| al_counties.csv | pct_poverty | 1259.4 | 67 | 1259.4 | 67 | OK |
| al_counties.csv | pct_uninsured_u65 | 701.1 | 67 | 701.1 | 67 | OK |
| al_counties.csv | pct_disability_u65 | 927.8 | 67 | 927.8 | 67 | OK |
| al_counties.csv | pct_broadband | 5517.1 | 67 | 5517.1 | 67 | OK |
| al_counties.csv | pct_bachelors | 1334.9 | 67 | 1334.9 | 67 | OK |
| al_counties.csv | pop_density | 6340.2 | 67 | 6340.2 | 67 | OK |
| al_counties.csv | land_area_sqmi | 50647.19 | 67 | 50647.19 | 67 | OK |
| al_counties.csv | chr_poor_mh_days | 391.0 | 67 | 391.0 | 67 | OK |
| al_counties.csv | chr_freq_mental_distress | 1300.1 | 67 | 1300.1 | 67 | OK |
| al_counties.csv | chr_suicide_rate | 984.3 | 55 | 984.3 | 55 | OK |
| al_counties.csv | chr_drug_overdose_rate | 1323.3 | 48 | 1323.3 | 48 | OK |
| al_counties.csv | chr_mh_provider_ratio | 143487 | 67 | 143487 | 67 | OK |
| al_counties.csv | chr_pcp_ratio | 194733 | 65 | 194733 | 65 | OK |
| al_counties.csv | chr_uninsured_adults | 894.9 | 67 | 894.9 | 67 | OK |
| al_counties.csv | chr_excessive_drinking | 1067.6 | 67 | 1067.6 | 67 | OK |
| al_counties.csv | chr_social_associations | 729.1 | 67 | 729.1 | 67 | OK |
| al_counties.csv | chr_life_expectancy | 4861.7 | 67 | 4861.7 | 67 | OK |
| al_counties.csv | chr_loneliness | 2491.0 | 67 | 2491.0 | 67 | OK |
| al_counties.csv | chr_lack_social_support | 1807.2 | 67 | 1807.2 | 67 | OK |
| al_counties.csv | chr_children_poverty | 1772.3 | 67 | 1772.3 | 67 | OK |
| al_counties.csv | chr_severe_housing | 793.4 | 67 | 793.4 | 67 | OK |
| al_counties.csv | chr_pct_rural | 4771.7 | 67 | 4771.7 | 67 | OK |
| al_counties.csv | hpsa_mh_score | 1021 | 66 | 1021 | 66 | OK |
| us_states.csv | pop_est | 683569714 | 52 | 683569714 | 52 | OK |
| us_states.csv | pct_under18 | 1091.9 | 52 | 1091.9 | 52 | OK |
| us_states.csv | pct_65plus | 1011.8 | 52 | 1011.8 | 52 | OK |
| us_states.csv | pct_black | 621.6 | 52 | 621.6 | 52 | OK |
| us_states.csv | pct_hispanic | 745.5 | 52 | 745.5 | 52 | OK |
| us_states.csv | pct_white_nh | 3312.5 | 52 | 3312.5 | 52 | OK |
| us_states.csv | pct_aian | 127.5 | 52 | 127.5 | 52 | OK |
| us_states.csv | veterans | 32371766 | 52 | 32371766 | 52 | OK |
| us_states.csv | median_hh_income | 4181725 | 52 | 4181725 | 52 | OK |
| us_states.csv | per_capita_income | 2294509 | 52 | 2294509 | 52 | OK |
| us_states.csv | pct_poverty | 619.8 | 52 | 619.8 | 52 | OK |
| us_states.csv | pct_uninsured_u65 | 471.5 | 52 | 471.5 | 52 | OK |
| us_states.csv | pct_disability_u65 | 510.6 | 52 | 510.6 | 52 | OK |
| us_states.csv | pct_broadband | 4703.5 | 52 | 4703.5 | 52 | OK |
| us_states.csv | pct_bachelors | 1833.4 | 52 | 1833.4 | 52 | OK |
| us_states.csv | pop_density | 21700.1 | 52 | 21700.1 | 52 | OK |
| us_states.csv | land_area_sqmi | 7066076.57 | 52 | 7066076.57 | 52 | OK |
| us_states.csv | chr_poor_mh_days | 280.9 | 50 | 280.9 | 50 | OK |
| us_states.csv | chr_freq_mental_distress | 910.6 | 50 | 910.6 | 50 | OK |
| us_states.csv | chr_suicide_rate | 845.7 | 52 | 845.7 | 52 | OK |
| us_states.csv | chr_drug_overdose_rate | 1739.9 | 52 | 1739.9 | 52 | OK |
| us_states.csv | chr_mh_provider_ratio | 15777 | 51 | 15777 | 51 | OK |
| us_states.csv | chr_pcp_ratio | 66923 | 51 | 66923 | 51 | OK |
| us_states.csv | chr_uninsured_adults | 525.9 | 52 | 525.9 | 52 | OK |
| us_states.csv | chr_excessive_drinking | 959.7 | 50 | 959.7 | 50 | OK |
| us_states.csv | chr_social_associations | 547.3 | 52 | 547.3 | 52 | OK |
| us_states.csv | chr_life_expectancy | 4012.7 | 52 | 4012.7 | 52 | OK |
| us_states.csv | chr_loneliness | 1389.6 | 41 | 1389.6 | 41 | OK |
| us_states.csv | chr_lack_social_support | 992.9 | 41 | 992.9 | 41 | OK |
| us_states.csv | chr_children_poverty | 793.8 | 52 | 793.8 | 52 | OK |
| us_states.csv | chr_severe_housing | 794.8 | 52 | 794.8 | 52 | OK |
| us_states.csv | chr_pct_rural | 1398.3 | 52 | 1398.3 | 52 | OK |
| us_states.csv | kff_mh_hpsa_designations | 13515 | 52 | 13515 | 52 | OK |
| us_states.csv | kff_mh_hpsa_population | 272567469 | 51 | 272567469 | 51 | OK |
| us_states.csv | kff_mh_hpsa_pct_need_met | 1386.21 | 51 | 1386.21 | 51 | OK |
| us_states.csv | kff_mh_hpsa_practitioners_needed | 13478 | 51 | 13478 | 51 | OK |
| us_states.csv | mha_overall_rank | 1326 | 51 | 1326 | 51 | OK |
| us_states.csv | mha_adult_rank | 1326 | 51 | 1326 | 51 | OK |
| us_states.csv | mha_youth_rank | 1326 | 51 | 1326 | 51 | OK |
| us_states.csv | mha_prevalence_rank | 1326 | 51 | 1326 | 51 | OK |
| us_states.csv | mha_access_rank | 1326 | 51 | 1326 | 51 | OK |
| us_states.csv | mha_adult_ami_pct | 1255.69 | 52 | 1255.69 | 52 | OK |
| us_states.csv | mha_youth_mde_pct | 1001.68 | 52 | 1001.68 | 52 | OK |
| us_states.csv | mha_youth_mde_no_services_pct | 2603.70 | 52 | 2603.70 | 52 | OK |
| us_states.csv | mha_adult_ami_uninsured_pct | 459.70 | 52 | 459.70 | 52 | OK |
| us_states.csv | mha_mh_workforce_ratio | 17940 | 52 | 17940 | 52 | OK |
| us_states.csv | nri_smha_exp_per_capita | 9939.15 | 52 | 9939.15 | 52 | OK |
| us_states.csv | nri_smha_exp_per_capita_rank | 1326 | 51 | 1326 | 51 | OK |
| us_states.csv | cdc_suicide_rate | 814.4 | 51 | 814.4 | 51 | OK |
| us_states.csv | cdc_suicide_deaths | 48824 | 51 | 48824 | 51 | OK |
| us_states.csv | cdc_overdose_rate | 1280.6 | 51 | 1280.6 | 51 | OK |
| us_states.csv | cdc_overdose_deaths | 79384 | 51 | 79384 | 51 | OK |
OK   raw/checks.md contains no MISMATCH line for any retrieval
OK   overlays: 19 centers; county lookup covers all 67 counties
OK   overlays: 6 crisis centers; 60 counties assigned + 7 unassigned = 67
OK   overlays: every record block carries source_url and as_of

ALL FINAL CHECKS PASSED
