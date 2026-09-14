from pathlib import Path
import re

p=Path('index.html')
s=p.read_text(encoding='utf-8')
s=s.replace('<span class="route-direction" aria-hidden="true">→</span>','<span class="route-direction" aria-hidden="true"></span>')
sec=re.search(r'(<section[^>]*id="travel"[^>]*>)(.*?)(</section>)',s,re.S)
if sec:
    body=sec.group(2)
    body=re.sub(r'<p[^>]*>\s*여행에 궁금한 점이 있으시면 문의해 주세요\.\s*</p>','',body)
    body=body.replace('<h2>스코틀랜드 여행정보</h2>','<h2>스코틀랜드 여행정보</h2><p class="travel-inquiry">여행에 궁금한 점이 있으시면 문의해 주세요.</p>',1)
    s=s[:sec.start(2)]+body+s[sec.end(2):]
p.write_text(s,encoding='utf-8')

p=Path('assets/tour-map.js')
s=p.read_text(encoding='utf-8')
old='''  [55.95236,-3.19326],
  [55.95208,-3.19370],[55.95190,-3.19435],[55.95178,-3.19505],[55.95155,-3.19745],[55.95130,-3.20055],[55.95108,-3.20405],
  [55.95122,-3.20025],[55.95108,-3.19720],[55.95082,-3.19582],
  // 뉴타운은 프린스 스트리트/국립미술관·The Mound 가까운 설명 지점으로 두고 북쪽 깊은 우회를 만들지 않는다.
  [55.95218,-3.19570],[55.95152,-3.19576],[55.95055,-3.19555],[55.94972,-3.19528],'''
new='''  [55.95236,-3.19326],
  [55.95208,-3.19370],[55.95192,-3.19435],[55.95178,-3.19505],[55.95166,-3.19745],[55.95154,-3.20055],[55.95140,-3.20405],
  // 서쪽 성벽 아래 구간에서 프린스 스트리트 쪽으로 다시 올라온 뒤, 프린스 스트리트 흐름을 따라 국립미술관/The Mound 쪽으로 돌아온다.
  [55.95178,-3.20310],[55.95208,-3.20115],[55.95224,-3.19875],[55.95220,-3.19655],[55.95218,-3.19570],
  // 뉴타운은 프린스 스트리트/국립미술관·The Mound 가까운 설명 지점으로 두고 북쪽 깊은 우회를 만들지 않는다.
  [55.95170,-3.19572],[55.95082,-3.19555],[55.94972,-3.19528],'''
if old in s:
    s=s.replace(old,new,1)
elif new not in s:
    raise SystemExit('Garden route block is neither old nor expected new version')
s=re.sub(r'const arrowSegments=\[[^\]]+\];','const arrowSegments=[2,5,8,11,14,17,20,23,26,29,32,35];',s,1)
p.write_text(s,encoding='utf-8')

targets=[]
for pattern in ('places/*.html','travel/*.html','edinburgh/people/*.html','edinburgh/themes/*.html'):
    targets += list(Path('.').glob(pattern))
tg=Path('edinburgh/tour-guide.html')
if tg.exists(): targets.append(tg)
targets=sorted(set(targets))

# Fill the remaining source-level breadcrumb/OG gaps on non-skeleton detail pages.
for f in targets:
    t=f.read_text(encoding='utf-8')
    if 'skeleton.js' in t:
        continue
    h1m=re.search(r'<h1[^>]*>(.*?)</h1>',t,re.S)
    h1=re.sub('<[^>]+>','',h1m.group(1)).strip() if h1m else ''
    if h1 and '홈' not in t:
        if str(f).startswith('travel/'):
            crumb=f'<div class="breadcrumbs"><a href="/">홈</a> › <a href="/#travel">여행 정보</a> › {h1}</div>'
        elif str(f).startswith('places/'):
            crumb=f'<div class="breadcrumbs"><a href="/">홈</a> › <a href="/edinburgh/places.html">장소로 보기</a> › {h1}</div>'
        elif '/people/' in str(f):
            crumb=f'<div class="breadcrumbs"><a href="/">홈</a> › <a href="/edinburgh/people.html">인물로 보기</a> › {h1}</div>'
        elif '/themes/' in str(f):
            crumb=f'<div class="breadcrumbs"><a href="/">홈</a> › <a href="/edinburgh/themes.html">테마로 보기</a> › {h1}</div>'
        else:
            crumb=f'<div class="breadcrumbs"><a href="/">홈</a> › {h1}</div>'
        t=t[:h1m.start()]+crumb+t[h1m.start():]
    if 'property="og:title"' not in t:
        titlem=re.search(r'<title>(.*?)</title>',t,re.S)
        metam=re.search(r'<meta name="description" content="([^"]*)"',t,re.S)
        title=(titlem.group(1).split('|')[0].strip() if titlem else h1) or h1
        desc=metam.group(1).strip() if metam else ''
        url='https://fanciful-naiad-e1081c.netlify.app/'+str(f).replace('\\','/')
        og=f'<meta property="og:type" content="article"><meta property="og:title" content="{title}"><meta property="og:description" content="{desc}"><meta property="og:url" content="{url}">'
        t=t.replace('</head>',og+'</head>',1)
    f.write_text(t,encoding='utf-8')

no_tools=[]; no_home=[]; no_og=[]
for f in targets:
    t=f.read_text(encoding='utf-8')
    if '/assets/detail-tools.js' not in t: no_tools.append(str(f))
    if '홈' not in t and 'skeleton.js' not in t: no_home.append(str(f))
    if 'property="og:title"' not in t and 'skeleton.js' not in t: no_og.append(str(f))
print('DETAIL_AUDIT_TOTAL',len(targets))
print('NO_DETAIL_TOOLS',no_tools)
print('NO_HOME_SOURCE',no_home)
print('NO_OG_SOURCE',no_og)
main=Path('index.html').read_text(encoding='utf-8')
print('MAIN_HAS_KAKAO', 'https://open.kakao.com/o/snuaTFyg' in main)
print('MAIN_HAS_EMAIL', 'scotlandkorea@gmail.com' in main)
