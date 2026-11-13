'use strict';

/* ------------------------------------------------------------------
   mObywatel — koncepcja (mObywatel Challenge)
   Prototyp klikalny: jedna sprawa od początku do końca.
   Bez backendu, bez logowania, dane fikcyjne, stan w localStorage.
   ------------------------------------------------------------------ */

const STORAGE_KEY = 'mobywatel-koncepcja-v1';
const DNI_BLOKADY = 14;

const OSOBA = {
  imie: 'Marta',
  nazwisko: 'Kowalska',
  pesel: '850412*****',
  miasto: 'Warszawa',
  adres: 'ul. Puławska 12/4, 02-512 Warszawa'
};

const POWODY = {
  zgubiony: 'Zgubiłem lub zgubiłam',
  skradziony: 'Skradziono mi',
  zniszczony: 'Uszkodzony lub nieczytelny'
};

const DOKUMENTY = [
  {
    id: 'mdowod',
    skrot: 'mD',
    nazwa: 'mDowód',
    podtytul: 'KOWALSKA MARTA',
    opis: 'Dowód osobisty w telefonie · ważny do 12.03.2031',
    pola: [
      ['Imię i nazwisko', 'Marta Kowalska'],
      ['PESEL', OSOBA.pesel],
      ['Obywatelstwo', 'Polska'],
      ['Adres', OSOBA.adres],
      ['Seria i numer', 'ABC 123456'],
      ['Ważny do', '12 marca 2031']
    ]
  },
  {
    id: 'mprawojazdy',
    skrot: 'mPJ',
    nazwa: 'mPrawo jazdy',
    podtytul: 'KATEGORIA B',
    opis: 'Prawo jazdy · 3 punkty karne',
    pola: [
      ['Imię i nazwisko', 'Marta Kowalska'],
      ['Kategorie', 'B'],
      ['Ważne do', '9 sierpnia 2033'],
      ['Punkty karne', '3'],
      ['Numer blankietu', '00512/26/2861']
    ]
  },
  {
    id: 'mlegitymacja',
    skrot: 'mL',
    nazwa: 'mLegitymacja',
    podtytul: 'LEGITYMACJA STUDENCKA',
    opis: 'Legitymacja studencka · ulga PKP 51%',
    pola: [
      ['Imię i nazwisko', 'Marta Kowalska'],
      ['Nr albumu', '198442'],
      ['Uczelnia', 'Politechnika Warszawska'],
      ['Ważna do', '31 marca 2027'],
      ['Ulga PKP', '51%']
    ]
  }
];

const PRZYPOMNIENIA = [
  { tag: 'OC', tytul: 'OC kończy się za 11 dni', opis: 'Toyota Yaris · GD 8K113', pilne: true },
  { tag: 'BT', tytul: 'Badanie techniczne do 20 stycznia', opis: 'Toyota Yaris · GD 8K113', pilne: false },
  { tag: 'US', tytul: 'Pismo z urzędu skarbowego', opis: 'Nadpłata 240 zł do zwrotu', pilne: false }
];

const URZEDY = [
  { nazwa: 'Urząd Dzielnicy Mokotów', adres: 'ul. Rakowiecka 25/27, Warszawa', odleglosc: '2,4 km' },
  { nazwa: 'Urząd Dzielnicy Śródmieście', adres: 'ul. Nowogrodzka 43, Warszawa', odleglosc: '4,1 km' },
  { nazwa: 'Centrum Obsługi Mieszkańca', adres: 'Al. Jerozolimskie 44, Warszawa', odleglosc: '5,8 km' }
];

const DZIECI = [
  { id: 'zofia', imie: 'Zofia Kowalska', wiek: 8, pesel: '••••4421' },
  { id: 'antek', imie: 'Antoni Kowalski', wiek: 5, pesel: '••••8807' },
  { id: 'jan', imie: 'Jan Kowalski', wiek: 2, pesel: '••••1233' }
];

function wybraneDzieci(ids) {
  return DZIECI.filter(d => (ids || []).includes(d.id));
}

function kwota800(ile) {
  return (800 * ile).toLocaleString('pl-PL') + ' zł';
}

/* Świeży stan startowy — funkcja, nie stała, żeby nie współdzielić zagnieżdżonego draftu. */
function freshState() {
  return {
    senior: false, case: null, wniosek: null, meldunek: null, swiadczenie: null,
    draft: {
      powod: 'zgubiony', urzad: 0,
      meldunekRodzaj: 'staly', meldunekDzieci: [],
      swiadczenieDzieci: DZIECI.map(d => d.id), swiadczenieKonto: 'konto'
    }
  };
}

let state = load();
/* Wybory w toku trzymamy w state.draft, żeby przetrwały odświeżenie strony. */

/* ---------- stan ---------- */

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const base = freshState();
    if (!raw) return base;
    const saved = Object.assign({}, base, JSON.parse(raw));
    saved.draft = Object.assign({}, base.draft, saved.draft || {});
    return saved;
  } catch (e) {
    return freshState();
  }
}

function save() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) { /* tryb prywatny */ }
}

/* ---------- daty ---------- */

function isoToday() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

function addDays(iso, n) {
  const d = new Date(iso + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

function fmtDate(iso) {
  if (!iso) return '';
  return new Date(iso + 'T12:00:00').toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' });
}

function fmtDay(iso) {
  return new Date(iso + 'T12:00:00').toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' });
}

/* ---------- pomocnicze ---------- */

/* t(prosty, zwykly) — tekst w trybie seniora jest krótszy i prostszy */
function t(plain, normal) {
  return state.senior ? plain : normal;
}

function isBlocked() {
  return !!(state.case && state.case.status === 'zablokowany');
}

function blokadaDo() {
  return state.case ? state.case.do : addDays(isoToday(), DNI_BLOKADY);
}

const DISCLAIMER = 'Demonstracja koncepcji, dane fikcyjne. Nie jest usługą administracji publicznej.';

/* Stopka zastrzeżeń — także przy wejściu z bezpośredniego linku do kroku sprawy. */
function finePrint(before) {
  return `<p class="fine">${before ? before + ' ' : ''}${DISCLAIMER}</p>`;
}

/* ---------- widoki ---------- */

function viewHome() {
  return `
  <p class="eyebrow">${fmtDay(isoToday())}</p>
  <h1>Dzień dobry, ${OSOBA.imie}</h1>
  <p class="lede">${t('Nic nie musisz wpisywać. Dane biorę z rejestrów.', 'Twoje sprawy i dokumenty w jednym miejscu.')}</p>

  ${statusy()}

  <h2 class="section-title">Do załatwienia <small class="extra">przykłady</small></h2>
  <ul class="card">
    ${PRZYPOMNIENIA.map(r => `
      <li>
        <div class="row">
          <span class="row-ic ${r.pilne ? 'row-ic--warn' : ''}" aria-hidden="true">${r.tag}</span>
          <span class="row-main">
            <span class="row-title">${r.tytul}</span>
            <span class="row-sub">${r.opis}</span>
          </span>
        </div>
      </li>`).join('')}
  </ul>
  <p class="fine extra">Ten prototyp rozwija jedną sprawę od początku do końca — przypomnienia pokazują kontekst.</p>

  <h2 class="section-title">Co chcesz załatwić?</h2>
  <div class="tiles">
    <a class="tile" href="#/sprawa/utrata-dowodu/1">Zgubiony lub skradziony dowód</a>
    <a class="tile" href="#/sprawa/nowy-dowod/1">Wniosek o nowy dowód</a>
    <a class="tile" href="#/sprawa/meldunek/1">Meldunek<span class="tile-tag">nie ma w aplikacji</span></a>
    <a class="tile" href="#/sprawa/swiadczenie/1">800+<span class="tile-tag">nie ma w aplikacji</span></a>
    <div class="tile tile--soon">Rejestracja auta<span class="row-sub">w przygotowaniu przez Ministerstwo</span></div>
    <div class="tile tile--soon">Ulgi i podatki<span class="row-sub">wkrótce</span></div>
  </div>

  <h2 class="section-title">Twoje dokumenty</h2>
  <div class="docs">
    ${DOKUMENTY.map(d => {
      const blocked = d.id === 'mdowod' && isBlocked();
      return `<a class="doc-card ${blocked ? 'is-blocked' : ''}" href="#/dokumenty/${d.id}">
        <small>${blocked ? 'Zablokowany' : 'Dokument'}</small>
        <strong>${d.nazwa}</strong>
        <span>${d.podtytul}</span>
      </a>`;
    }).join('')}
  </div>

  <p class="fine">Demonstracja koncepcji. Osoba i dane są fikcyjne. Serwis nie jest usługą administracji publicznej.</p>`;
}

/* ---------- sprawy w toku: jedno źródło danych dla Startu i Spraw ---------- */

function sprawyWToku() {
  const lista = [];

  if (state.case) {
    const zablokowany = state.case.status === 'zablokowany';
    lista.push({
      klucz: 'dowod',
      etykieta: 'Utrata dowodu',
      tytul: zablokowany ? 'Dowód zablokowany' : 'Dowód znów działa',
      opis: zablokowany
        ? 'Banki go nie przyjmą do ' + fmtDate(state.case.do) + '.'
        : 'Odblokowany ' + fmtDate(state.case.odblokowano) + '. Możesz nim potwierdzać tożsamość.',
      znacznik: zablokowany ? { tekst: 'Zablokowany', wariant: 'warn' } : { tekst: 'Gotowe', wariant: 'ok' },
      href: '#/sprawa/utrata-dowodu/4'
    });
  }

  if (state.wniosek) {
    lista.push({
      klucz: 'wniosek',
      etykieta: 'Wniosek o nowy dowód',
      tytul: state.wniosek.urzad,
      opis: 'Złożony ' + fmtDate(state.wniosek.data) + '. Odbiór po powiadomieniu.',
      znacznik: { tekst: 'Wysłany', wariant: 'muted' },
      href: '#/sprawa/nowy-dowod/3'
    });
  }

  if (state.meldunek) {
    const czasowy = state.meldunek.rodzaj === 'czasowy';
    lista.push({
      klucz: 'meldunek',
      etykieta: 'Meldunek',
      tytul: czasowy ? 'Pobyt czasowy — 12 miesięcy' : 'Pobyt stały',
      opis: 'Złożony ' + fmtDate(state.meldunek.data) + '. Urząd potwierdzi go w ciągu dnia roboczego.',
      znacznik: { tekst: 'W toku', wariant: 'muted' },
      href: '#/sprawa/meldunek/4'
    });
  }

  if (state.swiadczenie) {
    const ile = wybraneDzieci(state.swiadczenie.dzieci).length;
    lista.push({
      klucz: 'swiadczenie',
      etykieta: '800+',
      tytul: kwota800(ile) + ' miesięcznie',
      opis: 'Wysłany ' + fmtDate(state.swiadczenie.data) + '. Weryfikacja w rejestrach do 3 dni.',
      znacznik: { tekst: 'W toku', wariant: 'muted' },
      href: '#/sprawa/swiadczenie/4'
    });
  }

  return lista;
}

function odcien(wariant) {
  if (wariant === 'warn') return ' is-warn';
  if (wariant === 'ok') return ' is-ok';
  return '';
}

/* Widok skrócony — ekran startowy. */
function statusKarta(s) {
  return `<a class="status-card${odcien(s.znacznik.wariant)} status-link" href="${s.href}">
    <div class="status-top"><strong>${s.tytul}</strong><span class="badge badge--${s.znacznik.wariant}">${s.znacznik.tekst}</span></div>
    <p class="plain" style="margin:.4rem 0 0">${s.opis}</p>
  </a>`;
}

function statusy() {
  return sprawyWToku().map(statusKarta).join('');
}

/* Widok pełny — ekran Sprawy. */
function kartaSprawy(s) {
  return `<div class="card card-pad">
    <div class="status-top">
      <div>
        <p class="eyebrow" style="margin-bottom:.2rem">${s.etykieta}</p>
        <strong>${s.tytul}</strong>
      </div>
      <span class="badge badge--${s.znacznik.wariant}">${s.znacznik.tekst}</span>
    </div>
    <p class="plain" style="margin:.5rem 0 0">${s.opis}</p>
    <a class="btn btn--ghost" href="${s.href}">Zobacz szczegóły</a>
  </div>`;
}

function listaSpraw() {
  const lista = sprawyWToku();
  if (!lista.length) {
    return `<div class="card card-pad"><p class="plain" style="margin:0">Nie masz spraw w toku.</p></div>`;
  }
  return lista.map(kartaSprawy).join('');
}

function viewSprawy() {
  return `
  <h1>Sprawy</h1>
  <p class="lede">${t('Wszystko, co teraz załatwiasz.', 'Twoje sprawy w jednym miejscu.')}</p>

  ${listaSpraw()}


  <h2>Zacznij nową sprawę</h2>
  <ul class="card">
    <li><a class="row" href="#/sprawa/utrata-dowodu/1">
      <span class="row-main">
        <span class="row-title">Zgubiony lub skradziony dowód</span>
        <span class="row-sub">Zastrzeżenie w bankach i blokada — 3 kroki</span>
      </span>
    </a></li>
    <li><a class="row" href="#/sprawa/nowy-dowod/1">
      <span class="row-main">
        <span class="row-title">Wniosek o nowy dowód</span>
        <span class="row-sub">Dane z rejestru, bez wypełniania formularzy</span>
      </span>
    </a></li>
    <li><a class="row" href="#/sprawa/meldunek/1">
      <span class="row-main">
        <span class="row-title">Meldunek</span>
        <span class="row-sub">Adres z rejestru — 3 kroki, bez wizyty</span>
      </span>
    </a></li>
    <li><a class="row" href="#/sprawa/swiadczenie/1">
      <span class="row-main">
        <span class="row-title">800+</span>
        <span class="row-sub">Dzieci z rejestru PESEL, kwota liczona od razu</span>
      </span>
    </a></li>
  </ul>

  <p class="fine">Dane fikcyjne. Prototyp koncepcji aplikacji mObywatel.</p>`;
}

function viewDokumenty() {
  return `
  <h1>Dokumenty</h1>
  <p class="lede">${t('Trzy dokumenty. Dotknij, żeby zobaczyć dane.', 'Twoje dokumenty w telefonie.')}</p>
  <ul class="card">
    ${DOKUMENTY.map(d => {
      const blocked = d.id === 'mdowod' && isBlocked();
      return `<li><a class="row" href="#/dokumenty/${d.id}">
        <span class="row-ic" aria-hidden="true">${d.skrot}</span>
        <span class="row-main">
          <span class="row-title">${d.nazwa}</span>
          <span class="row-sub">${blocked ? 'Zablokowany do ' + fmtDate(blokadaDo()) : d.opis}</span>
        </span>
        <span aria-hidden="true" style="color:var(--ink-3)">›</span>
      </a></li>`;
    }).join('')}
  </ul>
  <p class="fine">Wszystkie dokumenty są fikcyjne.</p>`;
}

function viewDokument(id) {
  const d = DOKUMENTY.find(x => x.id === id);
  if (!d) return viewNotFound();
  const blocked = id === 'mdowod' && isBlocked();
  return `
  <a class="back" href="#/dokumenty">Dokumenty</a>
  <h1>${d.nazwa}</h1>
  ${blocked ? `<div class="status-card is-warn">
    <strong>Ten dokument jest zablokowany</strong>
    <p class="plain" style="margin:.35rem 0 0">Nie potwierdzisz nim tożsamości do ${fmtDate(blokadaDo())}. <a href="#/sprawa/utrata-dowodu/4">Zobacz sprawę</a></p>
  </div>` : ''}
  <ul class="card fields">
    ${d.pola.map(([k, v]) => `<li><span class="k">${k}</span><span class="v">${v}</span></li>`).join('')}
  </ul>
  <details class="info">
    <summary>Przekaż tylko potrzebne dane</summary>
    <p>Zamiast pokazywać cały dowód, wybierasz, co udostępniasz: na przykład tylko „pełnoletność” albo sam adres. Odbiorca dostaje potwierdzenie, a Ty widzisz w historii, kto i kiedy sprawdził Twoje dane.</p>
  </details>
  <p class="fine">Prototyp nie łączy się z rejestrami — dane są wpisane na stałe.</p>`;
}

function viewUstawienia() {
  return `
  <h1>Ustawienia</h1>
  <p class="lede">${t('Dostosuj aplikację do siebie.', 'Wygląd i dostępność.')}</p>

  <div class="card">
    <div class="setting">
      <span class="setting-text">
        <strong>Tryb seniora</strong>
        <span>Większy tekst, prostszy język, mniej elementów na ekranie</span>
      </span>
      <label class="switch">
        <input type="checkbox" data-action="senior" ${state.senior ? 'checked' : ''}>
        <span class="switch-track"></span>
        <span class="sr-only">Włącz tryb seniora</span>
      </label>
    </div>
  </div>

  <h2>Osoba w pokazie</h2>
  <ul class="card fields">
    <li><span class="k">Imię i nazwisko</span><span class="v">${OSOBA.imie} ${OSOBA.nazwisko}</span></li>
    <li><span class="k">Miejscowość</span><span class="v">${OSOBA.miasto}</span></li>
    <li><span class="k">PESEL</span><span class="v">${OSOBA.pesel}</span></li>
  </ul>
  <p class="fine">Osoba i dane są fikcyjne, podobnie jak w prototypie organizatora.</p>

  <h2>Prototyp</h2>
  <div class="card card-pad">
    <p class="plain" style="margin-top:0">Koncepcja zgłoszona w mObywatel Challenge. Nie jest oficjalną aplikacją mObywatel ani usługą administracji publicznej.</p>
    <button class="btn btn--ghost" type="button" data-action="reset">Zacznij pokaz od nowa</button>
  </div>`;
}

/* ---------- sprawa: utrata dowodu ---------- */

function viewUtrata(step) {
  if (step > 3 && !state.case) step = 1;
  if (step === 1) return utrataKrok1();
  if (step === 2) return utrataKrok2();
  if (step === 3) return utrataKrok3();
  return utrataWynik();
}

function stepper(n, total) {
  return `<div class="progress" role="group" aria-label="Krok ${n} z ${total}">
    <div class="progress-bar"><span style="width:${Math.round(n / total * 100)}%"></span></div>
    <p class="progress-text">Krok ${n} z ${total}</p>
  </div>`;
}

function utrataKrok1() {
  return `
  <a class="back" href="#/">Wróć</a>
  ${stepper(1, 3)}
  <h1>Co się stało z dowodem?</h1>
  <p class="lede">${t('Zablokuję dowód w bankach na 14 dni. Inne dokumenty działają dalej.', 'Zastrzeżemy dowód w bankach i zablokujemy go na 14 dni. Pozostałe dokumenty działają bez zmian.')}</p>
  <ul class="options">
    <li><button class="option" type="button" data-action="powod" data-powod="zgubiony">
      <strong>Zgubiłem lub zgubiłam</strong>
      <span>Nie wiem, gdzie jest.</span>
    </button></li>
    <li><button class="option" type="button" data-action="powod" data-powod="skradziony">
      <strong>Skradziono mi</strong>
      <span>Ktoś mógł go zabrać.</span>
    </button></li>
    <li><button class="option" type="button" data-action="powod" data-powod="zniszczony">
      <strong>Uszkodzony lub nieczytelny</strong>
      <span>Mam go, ale się nie nadaje.</span>
    </button></li>
  </ul>`;
}

function utrataKrok2() {
  const doDnia = addDays(isoToday(), DNI_BLOKADY);
  return `
  <a class="back" href="#/sprawa/utrata-dowodu/1">Wstecz</a>
  ${stepper(2, 3)}
  <h1>Co zrobię za Ciebie</h1>
  <p class="lede">${t('Zobacz, co się zmieni. Potem zapytam o zgodę.', 'Zanim cokolwiek zrobię, zobacz dokładnie, co się zmieni.')}</p>
  <ul class="checks">
    <li>
      <span class="ic" aria-hidden="true">✓</span>
      <div><strong>Zastrzegę dowód w bankach</strong><p>Banki przestaną przyjmować go jako dokument tożsamości.</p></div>
    </li>
    <li>
      <span class="ic ic--info" aria-hidden="true">!</span>
      <div><strong>Zablokuję mDowód na ${DNI_BLOKADY} dni</strong><p>Do ${fmtDate(doDnia)}. W tym czasie nie potwierdzisz nim tożsamości.</p></div>
    </li>
    <li>
      <span class="ic" aria-hidden="true">✓</span>
      <div><strong>Pozostałe dokumenty zostaną czynne</strong><p>Prawo jazdy i legitymacja działają bez zmian.</p></div>
    </li>
    <li>
      <span class="ic" aria-hidden="true">✓</span>
      <div><strong>Będziesz mógł to cofnąć</strong><p>Jeśli dowód się znajdzie, odblokujesz go jednym przyciskiem. Zastrzeżenie złożone w banku cofasz w banku — to z aplikacji zdejmiesz tutaj.</p></div>
    </li>
    <li>
      <span class="ic ic--info" aria-hidden="true">!</span>
      <div><strong>Nie złożę wniosku o nowy dowód bez Ciebie</strong><p>Zapytam, kiedy blokada będzie się kończyła.</p></div>
    </li>
  </ul>
  <a class="btn btn--primary" href="#/sprawa/utrata-dowodu/3">Dalej</a>
  <p class="fine">Nic nie wysyłam bez Twojego potwierdzenia.</p>`;
}

function utrataKrok3() {
  return `
  <a class="back" href="#/sprawa/utrata-dowodu/2">Wstecz</a>
  ${stepper(3, 3)}
  <h1>Potwierdź</h1>
  <p class="lede">${t('Sprawdź i potwierdź.', 'Sprawdź podsumowanie i potwierdź.')}</p>
  <div class="card card-pad">
    <p class="eyebrow" style="margin-bottom:.3rem">Do wykonania</p>
    <strong style="display:block;font-size:1.02rem;margin-bottom:.55rem">Zablokowanie dowodu ABC 123456</strong>
    <ul class="checks" style="margin:0">
      <li><span class="ic" aria-hidden="true">1</span><div><strong>Zastrzeżenie w bankach</strong><p>od razu, we wszystkich bankach</p></div></li>
      <li><span class="ic" aria-hidden="true">2</span><div><strong>Blokada mDowodu</strong><p>${DNI_BLOKADY} dni, do ${fmtDate(addDays(isoToday(), DNI_BLOKADY))}</p></div></li>
    </ul>
  </div>
  <p class="fine">Powód: ${(POWODY[state.draft.powod] || POWODY.zgubiony).toLowerCase()}</p>
  <label class="ack">
    <input type="checkbox" data-action="ack">
    <span>Rozumiem, że przez ${DNI_BLOKADY} dni nie potwierdzę tożsamości mDowodem. Mogę to cofnąć.</span>
  </label>
  <button class="btn btn--primary" type="button" id="confirm-block" data-action="zablokuj" disabled>Zablokuj dowód</button>`;
}

function utrataWynik() {
  const c = state.case;
  if (c.status === 'odblokowany') {
    return `
    <h1>Dowód znów działa</h1>
    <p class="lede">${t('Odblokowany. Banki znowu go przyjmą.', 'Blokada zdjęta. Dowód jest znowu ważny w bankach i przy potwierdzaniu tożsamości.')}</p>
    <div class="status-card is-ok">
      <div class="status-top"><strong>mDowód aktywny</strong><span class="badge badge--ok">Odblokowany</span></div>
      <p class="plain" style="margin:.4rem 0 0">Odblokowany ${fmtDate(c.odblokowano)}.</p>
    </div>
    <ol class="timeline">
      <li class="is-done"><strong>${fmtDate(c.od)}</strong><span>Dowód zastrzeżony i zablokowany</span></li>
      <li class="is-done"><strong>${fmtDate(c.odblokowano)}</strong><span>Dowód się znalazł — blokada zdjęta</span></li>
    </ol>
    <a class="btn btn--primary" href="#/">Wróć na start</a>`;
  }

  return `
  <h1>Dowód zablokowany</h1>
  <p class="lede">${t('Banki go nie przyjmą. Blokada do ' + fmtDate(c.do) + '.', 'Banki już go nie przyjmą, a mDowód jest zablokowany. Blokada trwa do ' + fmtDate(c.do) + '.')}</p>

  <ol class="timeline">
    <li class="is-done"><strong>Dziś, ${fmtDate(c.od)}</strong><span>Zastrzeżony w bankach i zablokowany w aplikacji</span></li>
    <li><strong>Do ${fmtDate(c.do)}</strong><span>Jeśli dowód się znajdzie, odblokujesz go tutaj</span></li>
    <li><strong>${fmtDate(addDays(c.do, -2))}</strong><span>Przypomnę Ci i przygotuję wniosek o nowy dowód</span></li>
  </ol>

  <button class="btn btn--ghost" type="button" data-action="odblokuj">Znalazłem dowód — odblokuj</button>
  <a class="btn btn--primary" href="#/sprawa/nowy-dowod/1">Złóż wniosek o nowy dowód</a>
  <p class="fine">Bez wniosku dowód pozostanie zablokowany — nic nie dzieje się automatycznie.</p>`;
}

/* ---------- sprawa: nowy dowód ---------- */

function viewNowyDowod(step) {
  if (step > 2 && !state.wniosek) step = 1;
  if (step === 1) return nowyKrok1();
  if (step === 2) return nowyKrok2();
  return nowyWynik();
}

function nowyKrok1() {
  return `
  <a class="back" href="#/">Wróć</a>
  ${stepper(1, 2)}
  <h1>Wniosek o nowy dowód</h1>
  <p class="lede">${t('Dane wezmę z rejestru. Nic nie musisz wpisywać.', 'Dane pobiorę z rejestru — nie musisz wypełniać żadnego formularza ani robić zdjęcia.')}</p>
  <ul class="card fields">
    <li><span class="k">Imię i nazwisko</span><span class="v">${OSOBA.imie} ${OSOBA.nazwisko}</span></li>
    <li><span class="k">PESEL</span><span class="v">${OSOBA.pesel}</span></li>
    <li><span class="k">Adres</span><span class="v">${OSOBA.adres}</span></li>
    <li><span class="k">Zdjęcie</span><span class="v">z rejestru</span></li>
  </ul>
  <p class="fine">Zdjęcie pochodzi z rejestru. Jeśli chcesz nowe, zmienisz je w urzędzie.</p>
  <a class="btn btn--primary" href="#/sprawa/nowy-dowod/2">Dalej</a>`;
}

function nowyKrok2() {
  return `
  <a class="back" href="#/sprawa/nowy-dowod/1">Wstecz</a>
  ${stepper(2, 2)}
  <h1>Gdzie odbierzesz?</h1>
  <p class="lede">${t('Wybierz urząd. Reszta działa sama.', 'Wybierz najbliższy urząd — resztę załatwiam w tle.')}</p>
  <ul class="options" role="radiogroup" aria-label="Wybierz urząd">
    ${URZEDY.map((u, i) => `
      <li><label class="option">
        <span class="option-head">
          <input type="radio" name="urzad" value="${i}" data-action="urzad" data-i="${i}" ${state.draft.urzad === i ? 'checked' : ''}>
          <strong>${u.nazwa}</strong>
        </span>
        <span>${u.adres} · ${u.odleglosc}</span>
      </label></li>`).join('')}
  </ul>
  <button class="btn btn--primary" type="button" data-action="wyslij">Wyślij wniosek</button>
  <p class="fine">Opłata 0 zł — wydanie dowodu jest bezpłatne. Nic nie drukujesz.</p>`;
}

function nowyWynik() {
  const w = state.wniosek;
  return `
  <h1>Wniosek wysłany</h1>
  <p class="lede">${t('Dowód będzie do odbioru w ' + w.urzad + '.', 'Nie musisz nic robić. Odezwę się, gdy dowód będzie gotowy do odbioru.')}</p>
  <ol class="timeline">
    <li class="is-done"><strong>Dziś, ${fmtDate(w.data)}</strong><span>Wniosek wysłany, dane pobrane z rejestru</span></li>
    <li><strong>Od razu</strong><span>Zaświadczenie o utracie w skrzynce e-Doręczeń — ważne do odbioru dowodu, najwyżej 2 miesiące</span></li>
    <li><strong>Za około 2 dni</strong><span>Dowód gotowy do odbioru</span></li>
    <li><strong>${w.urzad}</strong><span>${w.adres}</span></li>
  </ol>
  <div class="card card-pad">
    <p style="margin:0" class="plain">Na miejscu potwierdzisz tożsamość dokumentem tymczasowym, który wyda urząd — nie potrzebujesz mDowodu.</p>
  </div>
  <a class="btn btn--primary" href="#/">Wróć na start</a>
  <p class="fine">Zmiana urzędu jest możliwa do momentu odbioru.</p>`;
}

/* ---------- sprawa: meldunek ---------- */

function viewMeldunek(step) {
  if (step > 3 && !state.meldunek) step = 1;
  if (step === 1) return meldunekKrok1();
  if (step === 2) return meldunekKrok2();
  if (step === 3) return meldunekKrok3();
  return meldunekWynik();
}

function meldunekKrok1() {
  const staly = state.draft.meldunekRodzaj !== 'czasowy';
  return `
  <a class="back" href="#/">Wróć</a>
  ${stepper(1, 3)}
  <h1>Gdzie się meldujesz?</h1>
  <p class="lede">${t('Adres jest w rejestrze. Nic nie wpisujesz.', 'Adres biorę z rejestru — nie wypełniasz wniosku i nie idziesz do urzędu.')}</p>
  <ul class="card fields">
    <li><span class="k">Adres</span><span class="v">${OSOBA.adres}</span></li>
    <li><span class="k">Źródło danych</span><span class="v">rejestr PESEL</span></li>
  </ul>
  <ul class="options" role="radiogroup" aria-label="Rodzaj zameldowania">
    <li><label class="option">
      <span class="option-head">
        <input type="radio" name="meldunek-rodzaj" value="staly" data-action="meldunek-rodzaj" ${staly ? 'checked' : ''}>
        <strong>Pobyt stały</strong>
      </span>
      <span>Bez terminu końca. Wniosek składasz w aplikacji — jeśli urząd będzie potrzebował potwierdzenia, dostaniesz informację, co dalej.</span>
    </label></li>
    <li><label class="option">
      <span class="option-head">
        <input type="radio" name="meldunek-rodzaj" value="czasowy" data-action="meldunek-rodzaj" ${staly ? '' : 'checked'}>
        <strong>Pobyt czasowy</strong>
      </span>
      <span>Na 12 miesięcy. Przedłużysz w aplikacji.</span>
    </label></li>
  </ul>
  <a class="btn btn--primary" href="#/sprawa/meldunek/2">Dalej</a>`;
}

function meldunekKrok2() {
  const wybrane = state.draft.meldunekDzieci || [];
  return `
  <a class="back" href="#/sprawa/meldunek/1">Wstecz</a>
  ${stepper(2, 3)}
  <h1>Kto jeszcze się melduje?</h1>
  <p class="lede">${t('Możesz zaznaczyć dzieci.', 'Dzieci są w rejestrze PESEL — zaznacz te, które mieszkają z Tobą.')}</p>
  <ul class="options">
    ${DZIECI.map(d => `
      <li><label class="option">
        <span class="option-head">
          <input type="checkbox" data-action="meldunek-dziecko" data-id="${d.id}" ${wybrane.includes(d.id) ? 'checked' : ''}>
          <strong>${d.imie}</strong>
        </span>
        <span>${d.wiek} lat · PESEL ${d.pesel}</span>
      </label></li>`).join('')}
  </ul>
  <p class="fine">Możesz nikogo nie zaznaczać — dzieci zameldowane później dopiszesz jedną akcją.</p>
  <a class="btn btn--primary" href="#/sprawa/meldunek/3">Dalej</a>`;
}

function meldunekKrok3() {
  const dzieci = wybraneDzieci(state.draft.meldunekDzieci);
  const rodzaj = state.draft.meldunekRodzaj === 'czasowy' ? 'Pobyt czasowy — 12 miesięcy' : 'Pobyt stały';
  return `
  <a class="back" href="#/sprawa/meldunek/2">Wstecz</a>
  ${stepper(3, 3)}
  <h1>Potwierdź</h1>
  <p class="lede">Sprawdź, co wysyłam do urzędu.</p>
  <div class="card card-pad">
    <p class="eyebrow" style="margin-bottom:.3rem">Wniosek o zameldowanie</p>
    <strong style="display:block;font-size:1.02rem;margin-bottom:.55rem">${rodzaj}</strong>
    <ul class="checks" style="margin:0">
      <li><span class="ic" aria-hidden="true">1</span><div><strong>${OSOBA.adres}</strong><p>adres z rejestru</p></div></li>
      <li><span class="ic" aria-hidden="true">2</span><div><strong>${dzieci.length ? dzieci.map(d => d.imie).join(', ') : 'Tylko Ty'}</strong><p>${dzieci.length ? dzieci.length + ' dzieci z rejestru PESEL' : 'bez dodatkowych osób'}</p></div></li>
    </ul>
  </div>
  <button class="btn btn--primary" type="button" data-action="meldunek-zamelduj">Zamelduj</button>
  <p class="fine">Nie musisz nic podpisywać ani drukować.</p>`;
}

function meldunekWynik() {
  const m = state.meldunek;
  const dzieci = wybraneDzieci(m.dzieci);
  return `
  <h1>Zameldowanie złożone</h1>
  <p class="lede">${t('Urząd potwierdzi je w ciągu dnia.', 'Wniosek poszedł do urzędu. Potwierdzenie dostaniesz tutaj — jeśli urząd będzie potrzebował czegoś jeszcze, napisze do Ciebie.')}</p>
  <ol class="timeline">
    <li class="is-done"><strong>Dziś, ${fmtDate(m.data)}</strong><span>Wniosek złożony${dzieci.length ? ' za Ciebie i ' + dzieci.length + ' dzieci' : ''}</span></li>
    <li><strong>Do 1 dnia roboczego</strong><span>Urząd potwierdzi zameldowanie</span></li>
    <li><strong>Zaświadczenie</strong><span>Pojawi się w dokumentach — pobierzesz je tutaj</span></li>
  </ol>
  <a class="btn btn--primary" href="#/">Wróć na start</a>`;
}

/* ---------- sprawa: 800+ ---------- */

function viewSwiadczenie(step) {
  if (step > 3 && !state.swiadczenie) step = 1;
  if (step === 1) return swiadczenieKrok1();
  if (step === 2) return swiadczenieKrok2();
  if (step === 3) return swiadczenieKrok3();
  return swiadczenieWynik();
}

function swiadczenieKrok1() {
  const wybrane = state.draft.swiadczenieDzieci || [];
  return `
  <a class="back" href="#/">Wróć</a>
  ${stepper(1, 3)}
  <h1>800+ dla kogo?</h1>
  <p class="lede">${t('Zaznacz dzieci. Kwota policzy się sama.', 'Dzieci biorę z rejestru PESEL. Zaznacz, na kogo składasz wniosek.')}</p>
  <ul class="options">
    ${DZIECI.map(d => `
      <li><label class="option">
        <span class="option-head">
          <input type="checkbox" data-action="swiadczenie-dziecko" data-id="${d.id}" ${wybrane.includes(d.id) ? 'checked' : ''}>
          <strong>${d.imie}</strong>
        </span>
        <span>${d.wiek} lat · PESEL ${d.pesel}</span>
      </label></li>`).join('')}
  </ul>
  <div class="card card-pad">
    <p class="eyebrow" style="margin:0 0 .2rem">Miesięcznie</p>
    <strong id="suma-800" style="font-size:1.25rem">${kwota800(wybrane.length)}</strong>
  </div>
  <a class="btn btn--primary" href="#/sprawa/swiadczenie/2">Dalej</a>`;
}

function swiadczenieKrok2() {
  const konto = state.draft.swiadczenieKonto || 'konto';
  return `
  <a class="back" href="#/sprawa/swiadczenie/1">Wstecz</a>
  ${stepper(2, 3)}
  <h1>Gdzie wypłata?</h1>
  <p class="lede">${t('Wybierz konto.', 'Numer konta znam z rejestru — nie musisz go przepisywać.')}</p>
  <ul class="options" role="radiogroup" aria-label="Sposób wypłaty">
    <li><label class="option">
      <span class="option-head">
        <input type="radio" name="konto" value="konto" data-action="swiadczenie-konto" ${konto === 'konto' ? 'checked' : ''}>
        <strong>Na konto w banku</strong>
      </span>
      <span>Konto …8421 — z rejestru, bez przepisywania numeru.</span>
    </label></li>
    <li><label class="option">
      <span class="option-head">
        <input type="radio" name="konto" value="pozniej" data-action="swiadczenie-konto" ${konto === 'pozniej' ? 'checked' : ''}>
        <strong>Zmienię numer później</strong>
      </span>
      <span>Wniosek zostanie przyjęty, wypłata ruszy po podaniu konta.</span>
    </label></li>
  </ul>
  <a class="btn btn--primary" href="#/sprawa/swiadczenie/3">Dalej</a>`;
}

function swiadczenieKrok3() {
  const dzieci = wybraneDzieci(state.draft.swiadczenieDzieci);
  return `
  <a class="back" href="#/sprawa/swiadczenie/2">Wstecz</a>
  ${stepper(3, 3)}
  <h1>Wyślij wniosek</h1>
  <p class="lede">Sprawdź, co wysyłam.</p>
  <div class="card card-pad">
    <p class="eyebrow" style="margin-bottom:.3rem">Wniosek 800+</p>
    <strong style="display:block;font-size:1.02rem;margin-bottom:.55rem">${dzieci.length ? kwota800(dzieci.length) + ' miesięcznie' : 'Nie wybrano dzieci'}</strong>
    <ul class="checks" style="margin:0">
      <li><span class="ic" aria-hidden="true">1</span><div><strong>${dzieci.length ? dzieci.map(d => d.imie).join(', ') : 'brak'}</strong><p>dane z rejestru PESEL</p></div></li>
      <li><span class="ic" aria-hidden="true">2</span><div><strong>${state.draft.swiadczenieKonto === 'pozniej' ? 'Konto podasz później' : 'Konto …8421'}</strong><p>wypłata co miesiąc</p></div></li>
    </ul>
  </div>
  <button class="btn btn--primary" type="button" data-action="swiadczenie-wyslij" ${dzieci.length ? '' : 'disabled'}>Wyślij wniosek</button>
  <p class="fine">Jeśli dane dzieci się nie zgadzają, poprawisz je w urzędzie.</p>`;
}

function swiadczenieWynik() {
  const s = state.swiadczenie;
  const dzieci = wybraneDzieci(s.dzieci);
  return `
  <h1>Wniosek wysłany</h1>
  <p class="lede">${t('800 zł na każde dziecko.', '800 zł na każde dziecko. Sprawdzę dane w rejestrach i dam znać, gdy decyzja będzie gotowa.')}</p>
  <ol class="timeline">
    <li class="is-done"><strong>Dziś, ${fmtDate(s.data)}</strong><span>Wniosek złożony na ${dzieci.length} ${dzieci.length === 1 ? 'dziecko' : 'dzieci'}</span></li>
    <li><strong>Do 3 dni</strong><span>Weryfikacja w rejestrach — bez Twojego udziału</span></li>
    <li><strong>Do końca miesiąca</strong><span>Pierwsza wypłata ${kwota800(dzieci.length)}</span></li>
  </ol>
  <a class="btn btn--primary" href="#/">Wróć na start</a>`;
}

function viewNotFound() {
  return `<h1>Nie ma tu nic</h1><p class="lede">Ten ekran nie istnieje w prototypie.</p><a class="btn btn--primary" href="#/">Wróć na start</a>`;
}

/* ---------- renderowanie ---------- */

const main = document.getElementById('main');
const toastEl = document.getElementById('toast');
let toastTimer = null;
let focusNext = false;

function toast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('is-visible'), 4000);
}

function route() {
  return location.hash.replace(/^#/, '').split('?')[0].split('/').filter(Boolean);
}

function applySenior() {
  document.documentElement.dataset.senior = state.senior ? 'on' : 'off';
  const btn = document.querySelector('[data-action="senior-toggle"]');
  if (btn) {
    btn.setAttribute('aria-pressed', state.senior ? 'true' : 'false');
    btn.setAttribute('aria-label', state.senior ? 'Wyłącz tryb seniora' : 'Włącz tryb seniora: większy tekst i prostszy język');
  }
  const box = document.querySelector('input[data-action="senior"]');
  if (box) box.checked = state.senior;
}

function markTab(seg) {
  let tab = 'home';
  if (seg === 'sprawy' || seg === 'sprawa') tab = 'sprawy';
  else if (seg === 'dokumenty') tab = 'dokumenty';
  else if (seg === 'ustawienia') tab = 'ustawienia';
  document.querySelectorAll('.tabbar a').forEach(a => {
    if (a.dataset.tab === tab) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
}

const NAZWY_EKRANOW = { sprawy: 'Sprawy', dokumenty: 'Dokumenty', ustawienia: 'Ustawienia' };
const NAZWY_SPRAW = {
  'utrata-dowodu': 'Utrata dowodu',
  'nowy-dowod': 'Wniosek o nowy dowód',
  meldunek: 'Meldunek',
  swiadczenie: '800+'
};

function setTitle(seg) {
  let nazwa = NAZWY_EKRANOW[seg[0]] || 'Start';
  if (seg[0] === 'sprawa') {
    nazwa = NAZWY_SPRAW[seg[1]] || 'Sprawa';
    if (seg[2]) nazwa += ' — krok ' + seg[2];
  } else if (seg[0] === 'dokumenty' && seg[1]) {
    const d = DOKUMENTY.find(x => x.id === seg[1]);
    if (d) nazwa = d.nazwa;
  }
  document.title = nazwa + ' · mObywatel — koncepcja';
}

function render() {
  const seg = route();

  /* Bezpośredni link do kroku bez danych: poprawiamy adres, zamiast pokazywać krok 1 pod błędnym. */
  const przeplyw = seg[0] === 'sprawa' ? PRZEPLYWY[seg[1]] : null;
  if (przeplyw && Number(seg[2] || 1) > przeplyw.kroki && !przeplyw.maStan()) {
    location.replace(location.pathname + location.search + '#/sprawa/' + seg[1] + '/1');
    return;
  }
  let html;
  if (!seg.length) html = viewHome();
  else if (seg[0] === 'sprawy') html = viewSprawy();
  else if (seg[0] === 'dokumenty') html = seg[1] ? viewDokument(seg[1]) : viewDokumenty();
  else if (seg[0] === 'ustawienia') html = viewUstawienia();
  else if (seg[0] === 'sprawa') html = viewSprawa(seg[1], Number(seg[2] || 1));
  else html = viewNotFound();

  main.innerHTML = html;
  main.scrollTop = 0;
  markTab(seg[0] || 'home');
  setTitle(seg);
  applySenior();

  if (focusNext) {
    focusNext = false;
    const h1 = main.querySelector('h1');
    if (h1) {
      h1.setAttribute('tabindex', '-1');
      h1.focus({ preventScroll: true });
    }
  }
}

const PRZEPLYWY = {
  'utrata-dowodu': { kroki: 3, widok: viewUtrata, maStan: () => !!state.case },
  'nowy-dowod': { kroki: 2, widok: viewNowyDowod, maStan: () => !!state.wniosek },
  meldunek: { kroki: 3, widok: viewMeldunek, maStan: () => !!state.meldunek },
  swiadczenie: { kroki: 3, widok: viewSwiadczenie, maStan: () => !!state.swiadczenie }
};

function viewSprawa(id, step) {
  const p = PRZEPLYWY[id];
  return p ? p.widok(step) + finePrint() : viewNotFound();
}

/* ---------- akcje ---------- */

function setSenior(on) {
  state.senior = on;
  save();
  applySenior();
  render();
  toast(on ? 'Tryb seniora włączony: większy tekst i prostszy język.' : 'Tryb seniora wyłączony.');
}

document.addEventListener('click', e => {
  const el = e.target.closest('[data-action]');
  if (!el) return;
  const action = el.dataset.action;

  if (action === 'senior-toggle') {
    setSenior(!state.senior);
    return;
  }

  if (action === 'powod') {
    state.draft.powod = el.dataset.powod;
    save();
    location.hash = '#/sprawa/utrata-dowodu/2';
    return;
  }


  if (action === 'zablokuj') {
    const od = isoToday();
    state.case = { powod: state.draft.powod, od: od, do: addDays(od, DNI_BLOKADY), status: 'zablokowany' };
    save();
    location.hash = '#/sprawa/utrata-dowodu/4';
    toast('Dowód zablokowany. Banki już go nie przyjmą.');
    return;
  }

  if (action === 'odblokuj') {
    state.case.status = 'odblokowany';
    state.case.odblokowano = isoToday();
    save();
    render();
    toast('Dowód odblokowany. Działa od razu.');
    return;
  }

  if (action === 'wyslij') {
    const u = URZEDY[state.draft.urzad] || URZEDY[0];
    state.wniosek = { urzad: u.nazwa, adres: u.adres, data: isoToday() };
    save();
    location.hash = '#/sprawa/nowy-dowod/3';
    toast('Wniosek wysłany. Odezwę się, gdy dowód będzie gotowy.');
    return;
  }

  if (action === 'meldunek-rodzaj') {
    state.draft.meldunekRodzaj = el.value;
    save();
    return;
  }

  if (action === 'meldunek-zamelduj') {
    state.meldunek = {
      rodzaj: state.draft.meldunekRodzaj,
      dzieci: (state.draft.meldunekDzieci || []).slice(),
      data: isoToday()
    };
    save();
    location.hash = '#/sprawa/meldunek/4';
    toast('Zameldowanie złożone. Urząd potwierdzi je w ciągu dnia.');
    return;
  }

  if (action === 'swiadczenie-wyslij') {
    state.swiadczenie = {
      dzieci: (state.draft.swiadczenieDzieci || []).slice(),
      konto: state.draft.swiadczenieKonto,
      data: isoToday()
    };
    save();
    location.hash = '#/sprawa/swiadczenie/4';
    toast('Wniosek 800+ wysłany. Odezwę się przed pierwszą wypłatą.');
    return;
  }

  if (action === 'reset') {
    state = freshState();

    save();
    location.hash = '#/';
    render();
    toast('Pokaz zresetowany.');
  }
});

document.addEventListener('change', e => {
  const el = e.target.closest('[data-action]');
  if (!el) return;

  if (el.dataset.action === 'ack') {
    const btn = document.getElementById('confirm-block');
    if (btn) btn.disabled = !el.checked;
  }

  if (el.dataset.action === 'urzad') {
    state.draft.urzad = Number(el.dataset.i);
    save();
  }

  if (el.dataset.action === 'meldunek-dziecko') {
    const id = el.dataset.id;
    const lista = state.draft.meldunekDzieci || [];
    state.draft.meldunekDzieci = el.checked ? lista.concat(id) : lista.filter(x => x !== id);
    save();
  }

  if (el.dataset.action === 'swiadczenie-dziecko') {
    const id = el.dataset.id;
    const lista = state.draft.swiadczenieDzieci || [];
    state.draft.swiadczenieDzieci = el.checked ? lista.concat(id) : lista.filter(x => x !== id);
    save();
    const suma = document.getElementById('suma-800');
    if (suma) suma.textContent = kwota800(state.draft.swiadczenieDzieci.length);
  }

  if (el.dataset.action === 'swiadczenie-konto') {
    state.draft.swiadczenieKonto = el.value;
    save();
  }

  if (el.dataset.action === 'senior') {
    setSenior(el.checked);
  }
});

window.addEventListener('hashchange', () => {
  focusNext = true;
  render();
});
render();
