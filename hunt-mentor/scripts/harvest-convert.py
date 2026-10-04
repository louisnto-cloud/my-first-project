import csv,json,sys
SP={'BEAB':'black bear','BEAG':'grizzly bear','BOBC':'bobcat','CARI':'caribou','COUG':'cougar','DEMU':'mule deer','DEWT':'white tailed deer','ELK':'elk','GOAT':'mountain goat','LYNX':'lynx','MOOS':'moose','SHEE':'mountain sheep','WOLF':'wolf'}
REG={'2','3','4','5','8'} if len(sys.argv)<2 else None
YEARS=range(2020,2025)
def num(x):
  x=x.strip()
  return None if x=='' else (int(float(x)) if float(x).is_integer() else float(x))
rows=[];tot=[]
for r in csv.DictReader(open('big-game-harvest-statistics-1976-to-2024-wmu.csv',encoding='utf-8-sig')):
  y=int(r['HUNT YEAR']); w=r['WMU']; g=r['REGION']
  if y not in YEARS or (REG and g not in REG): continue
  if w.endswith('00') or w=='900' or w in('770','780') or not w.isdigit(): continue
  T=w.endswith('99')
  mu=None if T else f"{g[0]}-{int(w[1:])}"
  for res,p in ((True,'RESIDENT'),(False,'NON-RESIDENT')):
    h,d,k=num(r[p+' HUNTERS']),num(r[p+' DAYS']),num(r[p+' KILLS'])
    if h is None and d is None and k is None: continue
    row={'species':SP[r['SPECIES']],'region':g,'mu':mu,'wmuCode':w,'year':y,'hunters':h,'kills':k,'days':d,
         'successPct': round(k/h*100,1) if (h and k is not None) else None,'resident':res,
         'killsFromCI': r['CI']=='yes','lowConfidence': (h is None or h<20)}
    (tot if T else rows).append(row)
for r in csv.DictReader(open('big-game-harvest-statistics-1976-to-2024-region.csv',encoding='utf-8-sig')):
  y=int(r['HUNT YEAR']); w=r['WMU']; g=r['REGION']
  if y not in YEARS or (REG and g not in REG) or not w.endswith('99'): continue
  for res,p in ((True,'RESIDENT'),(False,'NON-RESIDENT')):
    h,d,k=num(r[p+' HUNTERS']),num(r[p+' DAYS']),num(r[p+' KILLS'])
    if h is None and d is None and k is None: continue
    tot.append({'species':SP[r['SPECIES']],'region':g,'mu':None,'wmuCode':w,'year':y,'hunters':h,'kills':k,'days':d,'successPct': round(k/h*100,1) if (h and k is not None) else None,'resident':res,'killsFromCI': r['CI']=='yes','lowConfidence': (h is None or h<20)})
rows.sort(key=lambda x:(x['region'],int(x['wmuCode']),x['species'],x['year'],not x['resident']))
out={'source':'BC Ministry of Water, Land and Resource Stewardship, Big Game Harvest Statistics 1976 to 2024 (BC Data Catalogue), WMU level CSV',
 'url':'https://catalogue.data.gov.bc.ca/dataset/big-game-harvest-statistics-1976-to-2024',
 'regionCsvUrl':'https://catalogue.data.gov.bc.ca/dataset/f2303645-5952-4766-bd5c-3b9b50dda1ca/resource/f9faaa13-7ef3-4b78-8754-923769ceb6d3/download/big-game-harvest-statistics-1976-to-2024-region.csv',
 'csvUrl':'https://catalogue.data.gov.bc.ca/dataset/f2303645-5952-4766-bd5c-3b9b50dda1ca/resource/ea1505f6-77ab-4838-b4a9-309ec55a3c20/download/big-game-harvest-statistics-1976-to-2024-wmu.csv',
 'licence':'Open Government Licence - British Columbia',
 'datasetUpdated':'2026-09-14','years':list(YEARS),'checked':'2026-10-04','regions':sorted(REG) if REG else 'all',
 'notes':('Resident hunters, days and kills are Hunter Sample survey ESTIMATES (sample based, rounded), combining general open season and LEH. '
  'Non-resident rows (resident:false) come from guide outfitter declarations and permit to accompany reports. '
  'killsFromCI=true: kills replaced with compulsory inspection counts (grizzly, caribou, cougar, goat, sheep), so successPct mixes sources. '
  'successPct = kills / hunters * 100 computed by Hunt Mentor from the published counts (the dataset publishes no success rate). '
  'lowConfidence = fewer than 20 hunters (or hunters not published): do not show a percentage as reliable. '
  'Hunt year runs April 1 to March 31. MU-level hunters cannot be summed to a region total. Region R00/900 unassigned rows are excluded. regionTotals holds the published region totals (WMU code R99, mu null). '
  'See research/2026-10-04-harvest-stats.md.'),
 'regionTotals':tot,
 'rows':rows}
json.dump(out,open(sys.argv[2] if len(sys.argv)>2 else '/home/user/my-first-project/hunt-mentor/data/harvest/bc-harvest.json','w'),separators=(',',':'))
print(len(rows))
