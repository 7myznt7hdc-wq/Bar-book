#!/usr/bin/env python3
"""Rebuild data/cocktails.json: hand-written classics + TheCocktailDB (free test API key '1').
Usage: python3 scripts/import_cocktaildb.py   (needs internet)"""
import json,re,urllib.request,pathlib,string,time
ROOT=pathlib.Path(__file__).parent.parent
def get(l):
  for _ in range(3):
    try:return json.load(urllib.request.urlopen(f"https://www.thecocktaildb.com/api/json/v1/1/search.php?f={l}",timeout=20))['drinks'] or []
    except Exception: time.sleep(2)
  return []
FR=lambda s:sum(float(eval(p)) if '/' in p else float(p) for p in s.split())
def to_ml(m):
  m=(m or '').strip().lower()
  r=re.match(r'^([\d/\.\s]+?)\s*(oz|ounces?|cl|ml|tsp|teaspoons?|tblsp|tbsp|tablespoons?|shots?|jiggers?|cups?|dash(?:es)?)\b',m)
  if not r: return None
  try:n=FR(r[1].replace('-',' '))
  except Exception:return None
  u=r[2];f={'oz':30,'ounce':30,'ounces':30,'cl':10,'ml':1,'tsp':5,'teaspoon':5,'teaspoons':5,'tblsp':15,'tbsp':15,'tablespoon':15,'tablespoons':15,'shot':30,'shots':30,'jigger':45,'jiggers':45,'cup':240,'cups':240}.get(u)
  return round(n*f,1) if f else None
SP=[('Mezcal','Tequila'),('Tequila','Tequila'),('Gin','Gin'),('Vodka','Vodka'),('Rum','Rum'),('Cachaca','Rum'),('Whisk','Whisky'),('Bourbon','Whisky'),('Scotch','Whisky'),('Rye','Whisky'),('Brandy','Brandy'),('Cognac','Brandy'),('Pisco','Brandy'),('Calvados','Brandy'),('Champagne','Wine/Sparkling'),('Prosecco','Wine/Sparkling'),('Wine','Wine/Sparkling'),('Vermouth','Aperitif'),('Campari','Aperitif'),('Aperol','Aperitif')]
def spirit(ings,alc):
  if alc=='Non alcoholic':return 'None (mocktail)'
  for i in ings:
    for k,v in SP:
      if k.lower() in i.lower():return v
  return 'Other/Liqueur'
base=json.load(open(ROOT/'data/classics.json'))['cocktails']
for c in base: c.setdefault('category','Classic'); c['source']='Bar Book house spec'
names={c['name'].lower() for c in base};out=list(base)
for l in string.ascii_lowercase+string.digits:
  for d in get(l):
    if d['strDrink'].lower() in names: continue
    names.add(d['strDrink'].lower());ings=[]
    for k in range(1,16):
      i=d.get(f'strIngredient{k}')
      if not i or not i.strip(): continue
      m=(d.get(f'strMeasure{k}') or '').strip();ml=to_ml(m)
      ings.append({'item':i.strip(),'ml':ml} if ml is not None else {'item':i.strip(),'amount':m or 'to taste'})
    cat=d.get('strCategory') or 'Other'
    if d.get('strAlcoholic')=='Non alcoholic': cat='Mocktail'
    out.append({'name':d['strDrink'],'spirit':spirit([x['item'] for x in ings],d.get('strAlcoholic')),'category':cat,'glass':d.get('strGlass') or '','garnish':'','method':(d.get('strInstructions') or '').strip(),'ingredients':ings,'source':f"https://www.thecocktaildb.com/drink/{d['idDrink']}"})
out.sort(key=lambda c:c['name'].lower())
json.dump({'units':'ml (converted: 1 oz = 30 ml, 1 cl = 10 ml, tsp 5 ml, tbsp 15 ml)','sources':['Bar Book house specs','TheCocktailDB (thecocktaildb.com) free API'],'cocktails':out},open(ROOT/'data/cocktails.json','w'),ensure_ascii=False,indent=1)
print(len(out),'cocktails')
