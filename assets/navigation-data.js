(()=>{
  const item=(number,name,url)=>({number,name,url});
  window.EW_PLACE_REGIONS=[
    {scope:'edinburgh',id:'new-town',name:'뉴타운 주변',items:[
      {name:'스콧 기념탑',url:'/places/scott-monument.html'},
      {name:'프린세스 스트리트 가든',url:'/places/princes-street.html'},
      {name:'스코틀랜드 국립미술관',url:'/places/national-gallery.html'},
      {name:'에든버러 뉴타운',url:'/places/new-town.html'},
      {name:'조지 스트리트',url:'/edinburgh/places/george-street.html'},
      {name:'세인트 앤드루 스퀘어',url:'/edinburgh/places/st-andrew-square.html'},
      {name:'제임스 클러크 맥스웰 동상',url:'/edinburgh/places/james-clerk-maxwell-statue.html'},
      {name:'발모럴 호텔',url:'/places/balmoral-hotel.html'}
    ]},
    {scope:'edinburgh',id:'castle',name:'에든버러 성 주변',items:[
      {name:'뉴 칼리지',url:'/places/new-college.html'},
      {name:'작가박물관',url:'/places/writers-museum.html'},
      {name:'베넬',url:'/edinburgh/places/vennel.html'},
      {name:'에든버러 성',url:'/places/edinburgh-castle.html'},
      {name:'빅토리아 스트리트',url:'/edinburgh/places/victoria-street.html'},
      {name:'그래스마켓',url:'/places/grassmarket.html'}
    ]},
    {scope:'edinburgh',id:'greyfriars',name:'그레이프라이어스 주변',items:[
      {name:'그레이프라이어스',url:'/places/greyfriars.html'},
      {name:'바비 동상',url:'/places/greyfriars-bobby.html'},
      {name:'국립박물관',url:'/places/national-museum.html'},
      {name:'서전스 홀',url:'/edinburgh/places/surgeons-hall.html'},
      {name:'플레전스',url:'/edinburgh/places/pleasance.html'},
      {name:'올드 칼리지',url:'/edinburgh/places/old-college.html'},
      {name:'맥이완 홀',url:'/edinburgh/places/mcewan-hall.html'},
      {name:'엘리펀트 하우스',url:'/places/elephant-house.html'}
    ]},
    {scope:'edinburgh',id:'royal-mile',name:'로열마일 중심',items:[
      {name:'로열마일',url:'/places/royal-mile.html'},
      {name:'데이비드 흄 동상',url:'/places/david-hume.html'},
      {name:'세인트 자일스',url:'/places/st-giles.html'},
      {name:'머캣 크로스',url:'/edinburgh/places/mercat-cross.html'},
      {name:'시티 챔버스',url:'/edinburgh/places/city-chambers.html'},
      {name:'존 녹스 하우스',url:'/places/john-knox-house.html'}
    ]},
    {scope:'edinburgh',id:'canongate',name:'캐넌게이트 주변',items:[
      {name:'캐넌게이트',url:'/places/canongate.html'},
      {name:'에든버러 박물관',url:'/edinburgh/places/museum-of-edinburgh.html'},
      {name:'애덤 스미스 무덤',url:'/edinburgh/places/adam-smith-grave.html'}
    ]},
    {scope:'edinburgh',id:'holyrood',name:'홀리루드 주변',items:[
      {name:'스코틀랜드 의회',url:'/places/scottish-parliament.html'},
      {name:'홀리루드 궁전',url:'/places/holyrood-palace.html'},
      {name:'아서스 시트',url:'/places/arthurs-seat.html'}
    ]},
    {scope:'edinburgh',id:'calton-hill',name:'칼튼 힐 주변',items:[
      {name:'칼튼 힐',url:'/places/calton-hill.html'},
      {name:'올드 칼튼 묘지',url:'/edinburgh/places/old-calton-burial-ground.html'},
      {name:'번스 기념비',url:'/edinburgh/places/burns-monument.html'},
      {name:'코난 도일 펍',url:'/edinburgh/places/conan-doyle-pub.html'},
      {name:'셜록 홈즈 동상',url:'/edinburgh/places/sherlock-holmes-statue.html'}
    ]},
    {scope:'edinburgh',id:'nearby',name:'에든버러 근교',items:[
      {name:'포스 브리지',url:'/edinburgh/places/forth-bridge.html'},
      {name:'로슬린',url:'/edinburgh/places/rosslyn.html'},
      {name:'로열 요트 브리타니아',url:'/edinburgh/places/royal-yacht-britannia.html'}
    ]},
    {scope:'scotland',id:'fife',name:'파이프',items:[
      {name:'세인트앤드루스',url:'/st-andrews/'},
      {name:'앤드루 카네기 생가 박물관',url:'/scotland/places/andrew-carnegie-birthplace-museum.html'}
    ]},
    {scope:'scotland',id:'east-northeast',name:'동부 · 북동부',items:[
      {name:'던노타 성',url:'/scotland/places/dunnottar-castle.html'}
    ]},
    {scope:'scotland',id:'highlands',name:'하이랜드',items:[
      {name:'글렌코',url:'/scotland/places/glencoe.html'}
    ]}
  ];

  window.EW_DETAIL_SERIES=[
    {id:'edinburgh-castle',kind:'story',name:'에든버러 성',hub:'/places/edinburgh-castle.html',items:[
      item('01','에스플러네이드와 에든버러 성문','/places/edinburgh-castle-esplanade.html'),
      item('02','아가일 배터리와 원 오클록 건','/places/edinburgh-castle-argyle-battery.html'),
      item('03','세인트 마가렛 예배당과 몬스 메그','/places/edinburgh-castle-st-margarets-chapel.html'),
      item('04','하프문 배터리와 데이비드 타워','/places/edinburgh-castle-half-moon-battery.html'),
      item('05','크라운 스퀘어와 그레이트 홀','/places/edinburgh-castle-crown-square.html'),
      item('06','스코틀랜드 왕관 보석과 운명의 돌','/places/edinburgh-castle-honours-stone.html'),
      item('07','에든버러 성의 전쟁포로 감옥','/places/edinburgh-castle-prisoners-of-war.html'),
      item('08','서쪽 성벽과 에든버러 서쪽 전망','/places/edinburgh-castle-western-view.html')
    ]},
    {id:'greyfriars',kind:'story',name:'그레이프라이어스',hub:'/places/greyfriars.html',items:[
      item('01','그레이프라이어스 바비','/places/greyfriars-bobby-story.html'),
      item('02','해리포터와 묘비의 이름들','/places/greyfriars-harry-potter.html'),
      item('03','플로든 성벽과 제임스 4세','/places/greyfriars-flodden-wall.html'),
      item('04','오래된 묘지','/places/greyfriars-old-cemetery.html'),
      item('05','그레이프라이어스 교회','/places/greyfriars-kirk.html'),
      item('06','알렉산더 헨더슨','/places/greyfriars-alexander-henderson.html'),
      item('07','언약도 순교자들','/places/greyfriars-covenanter-martyrs.html')
    ]},
    {id:'national-museum',kind:'story',name:'스코틀랜드 국립박물관',hub:'/places/national-museum.html',items:[
      item('01','복제양 돌리','/places/national-museum-dolly.html'),
      item('02','아브로스 선언문','/places/national-museum-arbroath.html'),
      item('03','루이스 체스맨','/places/national-museum-lewis-chessmen.html'),
      item('04','밀레니엄 시계','/places/national-museum-millennium-clock.html')
    ]},
    {id:'st-giles',kind:'story',name:'세인트 자일스',hub:'/places/st-giles.html',items:[
      item('01','세인트 자일스 전체 이야기','/places/st-giles-overview.html'),
      item('02','벽에 남은 스코틀랜드 인물들','/places/st-giles-memorials.html'),
      item('03','존 녹스와 종교개혁','/places/st-giles-john-knox.html'),
      item('04','몬트로즈와 아가일','/places/st-giles-montrose-argyll.html'),
      item('05','제니 게디스의 의자','/places/st-giles-jenny-geddes.html'),
      item('06','국민서약','/places/st-giles-national-covenant.html'),
      item('07','시슬 채플','/places/st-giles-thistle-chapel.html'),
      item('08','세인트 자일스의 스테인드글라스','/places/st-giles-stained-glass.html'),
      item('09','고개를 들어 세인트 자일스를 보다','/places/st-giles-architecture.html'),
      item('10','존 녹스의 무덤','/places/john-knox-grave.html')
    ]},
    {id:'royal-mile',kind:'story',name:'로열마일',hub:'/places/royal-mile.html',items:[
      item('01','로열마일 전체 이야기','/places/royal-mile-overview.html'),
      item('02','글래드스톤스 랜드','/places/royal-mile-gladstones-land.html'),
      item('03','디컨 브로디','/places/royal-mile-deacon-brodie.html'),
      item('04','하트 오브 미들로디언','/places/royal-mile-heart-midlothian.html'),
      item('05','머캣 크로스','/places/royal-mile-mercat-cross.html'),
      item('06','시티 챔버스','/places/royal-mile-city-chambers.html'),
      item('07','메리 킹스 클로즈','/places/royal-mile-mary-kings-close.html')
    ]},
    {id:'canongate',kind:'story',name:'캐넌게이트',hub:'/places/canongate.html',items:[
      item('01','캐넌게이트 전체 이야기','/places/canongate-overview.html'),
      item('02','World’s End — 정말 ‘세상의 끝’이었던 곳','/places/canongate-worlds-end.html'),
      item('03','캐넌게이트 커크 — 왕실의 교회와 작은 묘지','/places/canongate-kirk-stories.html'),
      item('04','로버트 퍼거슨 — 길 위에 서 있는 젊은 시인','/places/canongate-robert-fergusson.html'),
      item('05','아담 스미스 — 《국부론》의 저자가 잠든 곳','/places/canongate-adam-smith.html'),
      item('06','스크루지는 이 묘지에서 태어났을까?','/places/canongate-scrooge.html'),
      item('07','호레이셔스 보나 — 한국에서도 부르는 찬송가','/places/canongate-horatius-bonar.html'),
      item('08','900년 길 끝에서 만나는 현재','/places/canongate-holyrood-end.html')
    ]},
    {id:'glencoe',kind:'story',name:'글렌코',hub:'/scotland/places/glencoe.html',items:[
      item('01','글렌코를 만나는 세 가지 방법','/scotland/places/glencoe-three-ways.html'),
      item('02','글렌코 학살, 손님이 살인자가 된 밤','/scotland/places/glencoe-massacre.html'),
      item('03','해그리드 오두막은 어디 갔을까?','/scotland/places/glencoe-film-locations.html')
    ]},
    {id:'st-andrews',kind:'course',name:'세인트앤드루스',hub:'/st-andrews/',hubItem:{number:'00',name:'전체 개요',url:'/st-andrews/'},items:[
      item('01','올드코스','/st-andrews/old-course.html'),
      item('02','순교자 기념탑','/st-andrews/martyrs-monument.html'),
      item('03','세인트앤드루스 대학교','/st-andrews/university-of-st-andrews.html'),
      item('04','조지 위샤트','/st-andrews/george-wishart.html'),
      item('05','패트릭 해밀턴','/st-andrews/patrick-hamilton.html'),
      item('06','세인트앤드루스 성','/st-andrews/st-andrews-castle.html'),
      item('07','세인트앤드루스 대성당','/st-andrews/st-andrews-cathedral.html'),
      item('08','세인트메리스 칼리지','/st-andrews/st-marys-college.html'),
      item('09','블랙프라이어스 채플','/st-andrews/blackfriars-chapel.html'),
      item('10','사우스 스트리트','/st-andrews/south-street.html')
    ]}
  ];
})();