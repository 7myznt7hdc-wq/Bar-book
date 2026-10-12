#!/usr/bin/env python3
"""Refresh data/bars.json from a published 1-50 list article.
Usage: python3 scripts/refresh_bars.py URL YEAR
Parses lines like '1. Bar Leone, Hong Kong, China' (format used by thespiritsbusiness.com).
Existing sourced signature cocktails are kept for bars that remain on the list."""
import json,re,sys,urllib.request,html,pathlib
url,year=sys.argv[1],int(sys.argv[2]);p=pathlib.Path(__file__).parent.parent/'data/bars.json'
old={b['name']:b for b in json.loads(p.read_text())['bars']} if p.exists() else {}
t=urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0'})).read().decode('utf-8','ignore')
t=html.unescape(re.sub(r'<[^>]+>','\n',t));seen={};
for m in re.finditer(r'^\s*(\d{1,2})\.\s+([^,\n]+),\s*([^,\n]+),\s*([^\n]+?)\s*$',t,re.M):
  r=int(m[1]);
  if 1<=r<=50 and r not in seen: seen[r]=(m[2].strip(),m[3].strip(),m[4].strip())
if len(seen)!=50: sys.exit(f'Parsed {len(seen)} bars, expected 50 – not writing.')
bars=[]
for r in range(1,51):
  n,c,co=seen[r];s=old.get(n,{}).get('signatureCocktails',[])
  bars.append({'rank':r,'name':n,'city':c,'country':co,'signatureCocktails':s,'signatureStatus':'sourced' if s else 'unknown'})
p.write_text(json.dumps({'list':f"The World's 50 Best Bars {year}",'year':year,'announced':'see source','sources':[url],'bars':bars},ensure_ascii=False,indent=1))
print('Wrote',p)
