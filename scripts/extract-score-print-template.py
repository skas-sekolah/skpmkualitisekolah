# Read-only extraction of the user-supplied XLSX; emits static rubric/layout only.
import sys,json,re,zipfile,xml.etree.ElementTree as E
z=zipfile.ZipFile(sys.argv[1]);ns={'m':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
strings=[''.join(x.itertext()) for x in E.fromstring(z.read('xl/sharedStrings.xml')).findall('m:si',ns)]
styles=E.fromstring(z.read('xl/styles.xml'));fonts=list(styles.find('m:fonts',ns));fills=list(styles.find('m:fills',ns));borders=list(styles.find('m:borders',ns));xfs=list(styles.find('m:cellXfs',ns))
def color(el):
 if el is None:return None
 rgb=el.get('rgb');return '#'+rgb[-6:] if rgb else None
css=[]
for xf in xfs:
 font=fonts[int(xf.get('fontId',0))];fill=fills[int(xf.get('fillId',0))];border=borders[int(xf.get('borderId',0))];align=xf.find('m:alignment',ns)
 st={'fontFamily':'Arial, sans-serif'}
 if font.find('m:b',ns) is not None:st['fontWeight']='bold'
 if font.find('m:i',ns) is not None:st['fontStyle']='italic'
 sz=font.find('m:sz',ns);st['fontSize']=str(float(sz.get('val',10)))+'pt' if sz is not None else '10pt'
 c=color(font.find('m:color',ns))
 if c:st['color']=c
 pattern=fill.find('m:patternFill',ns)
 if pattern is not None and pattern.get('patternType')=='solid':
  c=color(pattern.find('m:fgColor',ns))
  if c:st['backgroundColor']=c
 for side in ['top','bottom','left','right']:
  b=border.find('m:'+side,ns)
  if b is not None and b.get('style'):st['border'+side.title()]='1px solid '+(color(b.find('m:color',ns)) or '#111')
 if align is not None:
  st['textAlign']={'center':'center','right':'right','left':'left','justify':'justify'}.get(align.get('horizontal'),'left');st['verticalAlign']={'center':'middle','top':'top','bottom':'bottom'}.get(align.get('vertical'),'middle')
 css.append(st)
def col(s):
 n=0
 for ch in s:n=n*26+ord(ch)-64
 return n
def pos(s):
 a=re.match(r'([A-Z]+)(\d+)',s);return [int(a[2]),col(a[1])]
wb=E.fromstring(z.read('xl/workbook.xml'));rels={r.get('Id'):r.get('Target') for r in E.fromstring(z.read('xl/_rels/workbook.xml.rels'))};result={}
for sheet in wb.find('m:sheets',ns):
 name=sheet.get('name')
 if not re.fullmatch(r'[123](?:\.\d+){2,3}',name) and name not in ['Panitia MP','Kelab_Persatuan','Badan_Beruniform','Sukan_Permainan']:continue
 path=rels[sheet.get('{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id')].lstrip('/');path=path if path.startswith('xl/') else 'xl/'+path
 root=E.fromstring(z.read(path));unit=not name[0].isdigit();start=5 if name=='Panitia MP' else 7 if name=='Sukan_Permainan' else 6
 endcol=12 if name=='Panitia MP' else 9;rows=[];end=0
 for row in root.findall('m:sheetData/m:row',ns):
  r=int(row.get('r'));cells=[]
  for c in row:
   rr,cc=pos(c.get('r'))
   if cc>endcol:continue
   v=c.find('m:v',ns);val=(strings[int(v.text)] if c.get('t')=='s' else v.text) if v is not None else ''
   formula=c.find('m:f',ns) is not None
   # No saved input values or school-specific names from unit sheets.
   if formula or unit and r>start:val=''
   cells.append({'r':r,'c':cc,'text':val,'s':int(c.get('s',0))})
   if val and r>=start:end=max(end,r)
  if r>=start:rows.append({'r':r,'height':float(row.get('ht',15)),'cells':cells})
 if unit:
  end={'Panitia MP':23,'Sukan_Permainan':23}.get(name,48)
 else:end=max([int(c.get('r')[1:]) for c in []] or [int(row.get('r')) for row in root.findall('m:sheetData/m:row',ns) if any('Jumlah Skor Aspek' in (strings[int(c.find('m:v',ns).text)] if c.get('t')=='s' and c.find('m:v',ns) is not None else '') for c in row)] or [end])
 merges=[]
 for e in root.findall('m:mergeCells/m:mergeCell',ns):
  a,b=e.get('ref').split(':');r,c=pos(a);er,ec=pos(b)
  if r>=start and er<=end and ec<=endcol:merges.append([r,c,er,ec])
 widths=[64.0]*endcol
 for c in root.findall('m:cols/m:col',ns):
  for i in range(int(c.get('min')),min(int(c.get('max')),endcol)+1):widths[i-1]=float(c.get('width',8.43))*7
 result[name]={'start':start,'end':end,'cols':endcol,'widths':widths,'rows':[r for r in rows if r['r']<=end],'merges':merges}
# Keep only the static header for action sheets; current rubric/actions are authoritative.
for name,sheet in result.items():
 if name[0].isdigit():
  last=next((row['r'] for row in sheet['rows'] if any(c['c']==4 and c['text'] in ['4','4.0'] for c in row['cells'])),18)
  sheet['rows']=[row for row in sheet['rows'] if row['r']<=last]
  sheet['merges']=[m for m in sheet['merges'] if m[2]<=last]
used=sorted({c['s'] for sheet in result.values() for row in sheet['rows'] for c in row['cells']})
mapping={old:new for new,old in enumerate(used)}
for sheet in result.values():
 for row in sheet['rows']:
  for c in row['cells']:c['s']=mapping[c['s']]
css=[css[i] for i in used]
json.dump({'source':'TAPAK SKOR SK@S 2026.xlsx','styles':css,'sheets':result},open('app/score-print-templates.json','w'),ensure_ascii=False,separators=(',',':'))
print(len(result),'static templates extracted; no unit names or teacher/IC data included')
