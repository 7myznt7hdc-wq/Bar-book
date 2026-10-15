#!/usr/bin/env python3
"""Refresh data/bars.json from The 50 Best Bars official 1-50 list page.

Usage:
  python3 scripts/refresh_bars.py                 # check the50.com, update only if a NEW year with exactly 50 bars
  python3 scripts/refresh_bars.py --dry-run       # parse & report, never write
  python3 scripts/refresh_bars.py --force         # allow rewriting the same year (e.g. fix data)
  python3 scripts/refresh_bars.py --html file.html [--year 2027]   # parse a saved copy (testing)

Safety rules (the script exits 0 without writing unless ALL hold):
  * ranks 1..50 each parsed exactly once, with a bar name and city
  * the list year can be detected (or --year given) and is newer than the year in bars.json (unless --force)
Signature cocktails (sourced) are kept for any bar whose name is still on the list; countries are
reused from the existing file or a city->country table; unknown countries are left blank.
Exit codes: 0 = no change or updated, 2 = parse failed (nothing written).
"""
import argparse,html,json,pathlib,re,sys,urllib.request
URL='https://www.the50.com/bars/best-in-the-world/list/1-50'
ROOT=pathlib.Path(__file__).resolve().parent.parent;P=ROOT/'data'/'bars.json'
def fetch(u):
  req=urllib.request.Request(u,headers={'User-Agent':'Mozilla/5.0 (BarBook refresh; +https://github.com/7myznt7hdc-wq/Bar-book)','Accept-Language':'en-GB'})
  return urllib.request.urlopen(req,timeout=30).read().decode('utf-8','ignore')
def parse(t):
  rows={}
  for m in re.finditer(r'class="rank\s*"\s*>\s*(\d{1,3})\s*</p>.*?<h2>(.*?)</h2>\s*</a>\s*<p>(.*?)</p>',t,re.S):
    r=int(m[1]);name=html.unescape(re.sub(r'<[^>]+>','',m[2])).strip();city=html.unescape(re.sub(r'<[^>]+>','',m[3])).strip()
    if 1<=r<=50 and name and r not in rows: rows[r]=(name,city)
  y=re.search(r'T50BB(\d\d)',t) or re.search(r'The 50 Best Bars (20\d\d)',t)
  year=(2000+int(y[1]) if len(y[1])==2 else int(y[1])) if y else None
  return rows,year
def main():
  a=argparse.ArgumentParser();a.add_argument('--dry-run',action='store_true');a.add_argument('--force',action='store_true');a.add_argument('--html');a.add_argument('--year',type=int);a.add_argument('--url',default=URL);o=a.parse_args()
  t=open(o.html,encoding='utf-8',errors='ignore').read() if o.html else fetch(o.url)
  rows,year=parse(t);year=o.year or year
  if sorted(rows)!=list(range(1,51)): print(f'Parsed {len(rows)} ranks (need exactly 1..50) – not writing.');return 2
  if not year: print('Could not detect list year – not writing.');return 2
  old=json.loads(P.read_text()) if P.exists() else {'year':0,'bars':[]}
  if year<=old.get('year',0) and not o.force: print(f'List year {year} is not newer than current {old.get("year")} – nothing to do.');return 0
  by={b['name']:b for b in old['bars']};cc={b['city']:b['country'] for b in old['bars'] if b.get('country')}
  bars=[]
  for r in range(1,51):
    n,c=rows[r];ob=by.get(n,{});sig=ob.get('signatureCocktails',[])
    bars.append({'rank':r,'name':n,'city':c,'country':ob.get('country') or cc.get(c,''),'signatureCocktails':sig,'signatureStatus':'sourced' if sig else 'unknown'})
  out={'list':f"The World's 50 Best Bars {year}",'year':year,'announced':f'{year} (see source)','sources':[o.url],'bars':bars}
  kept=sum(1 for b in bars if b['signatureCocktails']);new=[b['name'] for b in bars if b['name'] not in by]
  print(f'{year}: 50 bars parsed; {kept} keep sourced drinks; new entries: {len(new)} {new[:10]}')
  if o.dry_run: print('Dry run – not writing.');return 0
  P.write_text(json.dumps(out,ensure_ascii=False,indent=1));print('Wrote',P);return 0
if __name__=='__main__': sys.exit(main())
