# Verification checklist

Nothing is published until every box is ticked. The same list appears in every
pull request, so it is checked at each step, not only at the end.

## 1. Sources

- [ ] Every dataset is listed in `sources.md` with: publisher, dataset code or
      page title, URL, date accessed, and the exact filters used (country, year,
      unit, size class).
- [ ] Sources are official or primary (statistics offices, Eurostat, peer-reviewed
      papers, company filings). No blog or AI answer is used as a data source.
- [ ] The licence or terms of use allow reuse, and the required credit is shown.

## 2. Numbers and claims

- [ ] Every number in the report can be traced to a source row or to a documented
      calculation.
- [ ] Every number was checked a second time: by re-reading the source, or by a
      different AI or person (record who checked it in the dev log).
- [ ] Units, years and definitions match between Spain and the EU figures
      (same year, same indicator, same size classes).
- [ ] No `TODO-VERIFY:` markers are left anywhere.

## 3. Data handling

- [ ] Files in `data/raw/` are unchanged since download.
- [ ] Every step from raw to processed data is written down (script or list of
      steps), so someone else can repeat it and get the same result.

## 4. Honesty

- [ ] The dev log is up to date, including what went wrong.
- [ ] Limits of the analysis are stated in the report (what the data cannot say).
- [ ] AI use is disclosed: which AI did what.

## 5. Presentation

- [ ] Charts have a title, units, source line and year.
- [ ] The case study follows `templates/case-study-template.md`.
