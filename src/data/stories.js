// Mock mese adatok
const stories = [
  // 0-3 Age Group
  {
    id: 3,
    title: 'Maci és a Hold',
    slug: 'maci-es-a-hold',
    coverEmoji: '🧸',
    ageGroup: '0-3',
    moralWeight: 1, // KÖNNYED
    readingTime: 4,
    tags: ['félelem leküzdése', 'bátorság'],
    content: `Kis Maci az erdő szélén lakott egy barátságos barlangban...\n(A teljes mese itt jönne a valóságban, ez csak egy kibővített mock adat demo a szűrőkhöz.)`,
    discussionQuestions: [
      'Mit látott meg Kis Maci az ablakon keresztül?',
      'Mit mondott a Mama, ki vigyáz Macira éjszaka?',
      'Szoktál te is félni egy kicsit sötétben? Mi segít ilyenkor?'
    ],
    heroImage: '🐻'
  },
  {
    id: 6,
    title: 'A Kismadár Első Dala',
    slug: 'kismadar-elso-dala',
    coverEmoji: '🐦',
    ageGroup: '0-3',
    moralWeight: 1, // KÖNNYED
    readingTime: 3,
    tags: ['bátorság'],
    content: `A kismadár nagyon félt elhagyni a fészket, de egy nap a napfény kicsalogatta, és énekelni kezdett...\n(Mock szöveg)`,
    discussionQuestions: [
      'Mi csalogatta ki a kismadarat a fészekből?',
      'Mit kezdett el csinálni a kismadár, amikor kirepült?',
      'Szerinted is jó érzés kipróbálni valami új dolgot?'
    ],
    heroImage: '🐦'
  },
  {
    id: 7,
    title: 'Pötyi és a Színek',
    slug: 'potyi-es-a-szinek',
    coverEmoji: '🐞',
    ageGroup: '0-3',
    moralWeight: 1, // KÖNNYED
    readingTime: 2,
    tags: ['okosság'],
    content: `Pötyi katicabogár minden virágnál megtanult egy új színt. A pipacs piros volt, a nefelejcs kék...\n(Mock szöveg)`,
    discussionQuestions: [
      'Milyen színű volt a pipacs?',
      'Milyen színű volt a nefelejcs?',
      'Neked mi a legkedvesebb színed a világon?'
    ],
    heroImage: '🐞'
  },
  {
    id: 8,
    title: 'Nyuszi Barátot Keres',
    slug: 'nyuszi-baratot-keres',
    coverEmoji: '🐰',
    ageGroup: '0-3',
    moralWeight: 2, // ELGONDOLKODTATÓ
    readingTime: 5,
    tags: ['barátság', 'szeretet'],
    content: `Nyuszi nagyon egyedül érezte magát, amíg nem találkozott a mókussal, aki megosztotta vele a mogyoróját...\n(Mock szöveg)`,
    discussionQuestions: [
      'Kivel találkozott a Nyuszi?',
      'Mit adott a mókus a Nyuszinak?',
      'Te is meg szoktad osztani a játékaidat a barátaiddal?'
    ],
    heroImage: '🐰'
  },
  {
    id: 9,
    title: 'A Kis Csiga Házikója',
    slug: 'kis-csiga-hazikoja',
    coverEmoji: '🐌',
    ageGroup: '0-3',
    moralWeight: 2, // ELGONDOLKODTATÓ
    readingTime: 4,
    tags: ['okosság', 'türelem'],
    content: `A kis csiga megértette, hogy bár ő a leglassabb az erdőben, cserébe mindig magával viszi az otthonát...\n(Mock szöveg)`,
    discussionQuestions: [
      'Ki a leglassabb állat az erdőben?',
      'Mit visz magával a kis csiga a hátán?',
      'Szerinted miért jó, hogy a csigának mindig ott van a házikója?'
    ],
    heroImage: '🐌'
  },
  
  // 4-6 Age Group
  {
    id: 1,
    title: 'A Kiskondás',
    slug: 'a-kiskondas',
    coverEmoji: '🐷',
    ageGroup: '4-6',
    moralWeight: 2, // ELGONDOLKODTATÓ
    readingTime: 10,
    tags: ['bátorság', 'barátság'],
    content: `Egyszer volt, hol nem volt, volt egyszer egy szegény özvegyasszony, s annak egy fia. Úgy hívták a fiút, hogy Kis Kondás, mert amióta az eszét tudta, ő őrizte a falu kondáját...\n(Mock szöveg)`,
    discussionQuestions: [
      'Kinek segített Kis Kondás az erdőben?',
      'Hányszor kellett megfújnia a kürtjét, hogy segítséget hívjon?',
      'Szerinted megéri segíteni másoknak, még ha egy kicsit félünk is?'
    ],
    heroImage: '👦'
  },
  {
    id: 4,
    title: 'A Bölcs Róka',
    slug: 'a-bolcs-roka',
    coverEmoji: '🦊',
    ageGroup: '4-6',
    moralWeight: 2, // ELGONDOLKODTATÓ
    readingTime: 8,
    tags: ['okosság', 'türelem'],
    content: `Az erdő mélyén élt egy róka, akit mindenki Bölcs Rókának hívott. Egy napon a Nyúl szaladt hozzá, lélekszakadva. A folyó elöntötte az otthonát...\n(Mock szöveg)`,
    discussionQuestions: [
      'Miért rohant a Nyúl a Bölcs Rókához?',
      'Minek az odúját ajánlotta a róka a nyuszinak?',
      'Miért fontos megállni és gondolkodni, amikor valami váratlan dolog történik?'
    ],
    heroImage: '🦊'
  },
  {
    id: 5,
    title: 'Csipkebogyó hercegnő',
    slug: 'csipkebogyo-hercegno',
    coverEmoji: '🌹',
    ageGroup: '4-6',
    moralWeight: 1, // KÖNNYED
    readingTime: 7,
    tags: ['szeretet', 'türelem'],
    content: `Volt egyszer egy király és egy királyné. A király hatalmas lakomát rendezett, de csak tizenkét arany tányérja volt...\n(Mock szöveg)`,
    discussionQuestions: [
      'Hány arany tányérja volt a királynak?',
      'Milyen állatokat és embereket altatott el a varázslat száz évre?',
      'Mit gondolsz, hogyan érezte magát az a tündér akit nem hívtak meg?'
    ],
    heroImage: '👑'
  },
  {
    id: 10,
    title: 'A Morcos Sárkány',
    slug: 'morcos-sarkany',
    coverEmoji: '🐉',
    ageGroup: '4-6',
    moralWeight: 1, // KÖNNYED
    readingTime: 6,
    tags: ['barátság'],
    content: `A sárkány csak azért volt morcos, mert soha senki nem hívta meg játszani a lovagvárba...\n(Mock szöveg)`,
    discussionQuestions: [
      'Miért volt valójában morcos a sárkány?',
      'Hova nem hívták meg soha játszani?',
      'Hogyan tudnál felvidítani egy barátodat, ha szomorú lenne?'
    ],
    heroImage: '🐉'
  },
  {
    id: 11,
    title: 'A Szorgalmas Hangya',
    slug: 'szorgalmas-hangya',
    coverEmoji: '🐜',
    ageGroup: '4-6',
    moralWeight: 3, // KOMOLY
    readingTime: 12,
    tags: ['okosság', 'türelem'],
    content: `A tücsök egész nyáron csak hegedült, míg a hangya szorgalmasan gyűjtögette az élelmet a hideg télre...\n(Mock szöveg)`,
    discussionQuestions: [
      'Mit csinált a tücsök egész nyáron?',
      'Miért dolgozott a hangya olyan keményen melegben is?',
      'Szerinted megéri előre gondolkodni és felkészülni a dolgokra?'
    ],
    heroImage: '🐜'
  },

  // 7+ Age Group
  {
    id: 2,
    title: 'A Három Kívánság',
    slug: 'a-harom-kivansag',
    coverEmoji: '⭐',
    ageGroup: '7+',
    moralWeight: 3, // KOMOLY
    readingTime: 12,
    tags: ['mértékletesség', 'bölcsesség'],
    content: `Réges-régen, egy kis faluban élt egy szegény favágó... (Mock szöveg)`,
    discussionQuestions: [
      'Kivel találkozott a favágó az öreg tölgyfa alatt?',
      'Mi volt a favágó első buta kívánsága, ami elrontott mindent?',
      'Ha lenne három kívánságod most, mikor lenne a legokosabb használni őket?'
    ],
    heroImage: '🌟'
  },
  {
    id: 12,
    title: 'A Csillagász Titka',
    slug: 'csillagasz-titka',
    coverEmoji: '🔭',
    ageGroup: '7+',
    moralWeight: 3, // KOMOLY
    readingTime: 15,
    tags: ['bölcsesség', 'okosság'],
    content: `A falu fölötti hegyen élt egy csillagász, aki heteken át egy különleges teleszkópot épített...\n(Mock szöveg)`,
    discussionQuestions: [
      'Hol élt a csillagász?',
      'Mit épített hosszú heteken keresztül?',
      'Szerinted léteznek olyan dolgok, amiket nem látunk a szemünkkel, de mégis tudjuk, hogy ott vannak?'
    ],
    heroImage: '🔭'
  },
  {
    id: 13,
    title: 'A Rejtélyes Térkép',
    slug: 'rejtelyes-terkep',
    coverEmoji: '🗺️',
    ageGroup: '7+',
    moralWeight: 2, // ELGONDOLKODTATÓ
    readingTime: 14,
    tags: ['bátorság', 'barátság'],
    content: `Két barát talált egy poros, régi térképet a padláson, ami egy teljesen elfeledett városba vezetett...\n(Mock szöveg)`,
    discussionQuestions: [
      'Hol találták meg a gyerekek a régi térképet?',
      'Szerinted mit kellett magukkal vinniük a hosszú útra?',
      'Szerinted okos ötlet egyedül elindulni egy nagy kalandra, vagy jobb, ha ketten vannak?'
    ],
    heroImage: '🗺️'
  },
  {
    id: 14,
    title: 'Az Időutazó Óra',
    slug: 'idoutazo-ora',
    coverEmoji: '⏳',
    ageGroup: '7+',
    moralWeight: 3, // KOMOLY
    readingTime: 18,
    tags: ['mértékletesség', 'bölcsesség'],
    content: `A fiú talált egy apró zsebórát, amivel vissza lehetett pörgetni az időt pár perccel. De minden használatnál egy kicsit idősebb lett ő maga...\n(Mock szöveg)`,
    discussionQuestions: [
      'Milyen különleges képessége volt a zsebórának?',
      'Mi volt az ára annak, ha a fiú visszatekerte az időt?',
      'Ha hibázol, jobb elfogadni és tanulni belőle, vagy mindent megváltoztatni utólag?'
    ],
    heroImage: '🕰️'
  },
  {
    id: 15,
    title: 'A Nevető Vulkán',
    slug: 'neveto-vulkan',
    coverEmoji: '🌋',
    ageGroup: '7+',
    moralWeight: 1, // KÖNNYED
    readingTime: 9,
    tags: ['barátság', 'szeretet'],
    content: `A sziget lakói arra ébredtek, hogy az öreg vulkán nem hamut köpköd, hanem ezüstösen kacag, mert a felhők csiklandozták a tetejét...\n(Mock szöveg)`,
    discussionQuestions: [
      'Mire ébredtek fel a kis sziget lakói?',
      'Miért nevetett ilyen jót az öreg vulkán?',
      'Szerinted is igaz az, hogy nehezen lehetsz mérges, ha közben nagyon nevetsz?'
    ],
    heroImage: '🌋'
  }
];

export default stories;
