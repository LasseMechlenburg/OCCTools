# OCC status, 17. september 2026

## Samlet dagsopdatering klar lokalt (20260917-47) — ikke installeret på serveren

- Tilføj punkt i Åbne checklister: vælg konkret Run.Id (også adhoc) og titel. Dropdown viser kun lister med åbne punkter i henteflowets svar. Flowet kontrollerer OCC_Runs.Status=Active før oprettelse i OCC_RunItems. SortOrder=0, Done/StartFlow/Alerted=No.
- Fremtidige punkter: D/CD/N/CN, gyldig dato efter dansk dagsdato, titel. OCC_Templates: Active=Yes, DaysMask=1,2,3,4,5,6,7, Season=All, ValidFrom=ValidTo=valgt dato, Role=OCC, StartFlow=No, SortOrder=0. Ingen tid eller ekstra fritekstfelter.
- Privat data/checklist-item-flow-url.txt (lokalt work/checklist-item-flow-url.txt). Servervalidering, Origin-kontrol, vedvarende request-journal, ingen automatisk retry ved usikkert udfald. HTTP-fejl fra flowet, inklusive 409, behandles konservativt som ubekræftet og kræver kontrol af flowhistorik/SharePoint.
- Åbn i eget vindue ved hver åben liste. URL ?checklistRun=<Run.Id> viser kun den valgte liste med navnefelt, afkrydsning og Refresh. Ingen automatisk synkronisering mellem vinduer; brug Refresh. Browseren afgør vinduesplacering og popup-tilladelse.
- Samlet privat ZIP: OCCtools-daily-private-20260917-47.zip. Update-OCCtools-Daily.ps1 udskifter kun de ti programfiler og de to nye flowfiler, tager backup og genstarter kun OCCtools. Eksisterende config, indhold, PDF'er, oprindelige flows, serviceindstillinger og IIS ændres ikke. Automatisk tilbagerulning af tidligere filer ved opdaterings-/helbredstjekfejl; nye ubrugte filer kan blive liggende efter rollback.
- 18 automatiske tests bestået. Browsermock: adhoc-tilføjelse, Refresh, fremtidig tilføjelse, usikkert udfald låser formularen, separat checklist-visning og afkrydsning. Opdateringsscript testet isoleret for succes og rollback med uændret admin-konfiguration. Ingen rigtige SharePoint-poster oprettet eller afkrydset i disse tests. Live sluttest udføres efter serverinstallation.
- Installer til nye installationer inkluderer nu checklist-item-moduler og lokal IIS rewrite <clear/>; dagsopdateringen rører ikke eksisterende IIS-konfiguration.

- Brugeren har endnu ikke installeret dagens opdateringer på serveren og ønsker én samlet pakke til sidst. De tidligere 43/44/45-pakker er derfor ikke dokumentation for serverens version.
- Knaptekster og henvisninger Opdatér / Opdatér fra FlightPoint ændret til Refresh. Åbn et område er fjernet. Kun lokale filer ændret indtil samlet deployment.
- Brugerens OnSelect-formel og det nye flow er modtaget. Tilføj punkt er nu implementeret som beskrevet ovenfor.

## Log-oprettelse 20260917-45

- Lav entry i Crew-/Trafiklog kræver kun Title (1–255 tegn). Flowkontrakt: logType=crew|traffic og title; Response {ok:true}. Faste feltværdier sættes i flowet: dansk dagsdato, Info only, Open, Traffic Log Type=General Info (ikke Flight).
- Ny privat fil data/log-create-flow-url.txt på serveren; lokalt work/log-create-flow-url.txt. Aldrig i Git eller frontend. GET /api/log-create viser kun configured. POST er under den eksisterende interne adgangsmodel og kræver korrekt Origin.
- Request-id og vedvarende journal forhindrer samme anmodning i at blive sendt igen. Ubebekræftede forsøg kræver manuel kontrol; ingen automatisk retry. Det er ikke en global unikhedsregel på titler, og flowets interne retry-politik er separat.
- Formularen bevarer titel, låser under gemning, og stopper ved usikkert resultat. Fanens sessionStorage husker uafklarede forsøg. Ved succes genhentes loglisten; læsefejl må ikke føre til ny oprettelse.
- Update-OCCtools-Logs.ps1 tager backup og genstarter kun OCCtools. Privat pakke indeholder flowfil; admin-konfiguration, øvrige flowfiler og driftsdata udskiftes ikke. Ingen rigtige logposter er oprettet under udviklingstest.

## UI-opdatering 20260917-44

- Admin → Menuer og links har Aktiv menu og Aktivt link. Manglende felt betyder aktiv, så eksisterende indhold bevares uændret. Gem ændringer udgiver valget.
- Inaktive menuer skjuler alle deres links uden at ændre underpunkternes egne indstillinger. Inaktive punkter markeres i admin-vælgerne og bevares dér.
- Forside, menuhjul, Emergency-genvej og menusøgning bruger aktive punkter. PDF-søgning/bibliotek respekterer skjulte PDF-links og biblioteks-menuer. Det er visningsstyring, ikke adgangskontrol til direkte URL’er.
- Faste sideknapper og Flight Monitoring er fortsat separate indbyggede genveje, ikke admin-menuer.
- Opdateringen er statisk; eksisterende server gemmer active-feltet allerede sammen med indholdet. Ingen datafil eller serverkonfiguration udskiftes.

## UI-opdatering 20260917-43

- Kopiér-knapper ved kontakttelefoner og passwords. Clipboard-fejl vises uden at afsløre password; kopiering kræver browserens tilladelse og sikker kontekst.
- Global søgning opdeles i Apps (PowerApps), Værktøjer og links, PDF-links, Nye tiltag, Kalender og Kontakter, med menunavn. Eksterne links åbnes direkte i separat vindue som øvrige links.
- PDF-indhold står separat med seks kompakte sidematch først og Vis flere; menutilknytning vises. Lys og mørk tilstand understøttes.
- Update-OCCtools-UI.ps1 opdaterer kun fire statiske filer med backup og rollback. Serversiden er ikke opdateret før operatøren kører pakken.

## Menuer og links, seneste opdatering

- Mørk/lys tilstand tilføjet i headeren. Valget gemmes lokalt i browseren som occ-theme. Mørke blågrå overflader, lyse tekster, tydelige cirkelkanter og orange fokus/hover; PDF-sider og Emergency beholder lys baggrund. Testet toggle, genindlæsning og kontaktpanel. Hurtig log er kun foreslået, ikke implementeret.

- Almindelige klik på portalens links åbner nu separate browservinduer generelt, også SVG-menuernes links. PDF-paneler/interne menuer og download-links bevarer deres funktion. Ctrl-/Cmd-/Shift-klik følger browserens normale adfærd. Browserens popup-politik kan påvirke vinduesåbning.

- Om området-knapperne er fjernet. Links i kontakt-, password- og logkort vises som kompakte ↗-pile til højre, uden ekstra tekstlinje. Linknavne er bevaret til skærmlæser og tooltip.

- FlightPoint-cirklen åbner nu forsiden direkte i ny fane, uden hjul, antal eller Om området. De bagvedliggende genvejsdata er bevaret, da sidepanelerne benytter dem. FlightPoint-adressen følger flightpoint-home-linket i admin.

- PDF-bibliotek: 186 unikke procedure-PDF'er fra Træning til Pelesys (187 kildefiler, én identisk dublet) plus 9 aftale-/transportdokumenter. Binært verificeret at alle procedure-kilder har en identisk lokal kopi. Ingen originaler ændret.
- Procedurer og manualer → Procedurebibliotek: søgning i titler og udtrukket tekst, mappefilter inklusive undermapper. Hovedsøgningen viser PDF-side og tekstuddrag. PDF'er åbner i fast dialog med sideskift, zoom og dokumentsøgning. Lokale PNG-forhåndsvisninger er valgt, fordi native PDF-iframe var blank i in-app-browseren.
- Godkendte flyselskaber, Seatingaftale VPU og VPS Transport ligger under Transport og hoteller. Seks øvrige aftaler er lagt under Overenskomster; eksisterende MCU-link bevaret. VPS Transport er kildens faktiske filnavn (brugeren skrev VPU transport).
- Seks PDF'er uden tekst: Dansk Cabin, Seatingaftale VPU, VPS Transport, COB, HRG Aerodrome Briefing og Slot Extension Eurocontrol Definition. Titler kan søges; indhold kræver OCR. Delvist scannede dokumenter markeres også.
- Dokumenter/index/preview-cache er lokale under data/documents, udeladt fra Git. Tilføjelsesdato er IKKE revisionsdato. Ændringer i kildemapper synkroniseres ikke automatisk. Admin → PDF-dokumenter understøtter filvalg/drop, nye menupunkter og udskiftning (25 MB). Udskiftning bevarer dokument-id/link, gemmer tidligere fil + indeksbackup, genindekserer og skifter preview-cacheversion. Login, Origin og CSRF kræves; versionskonflikt afvises. Isoleret test dækker ny upload, erstatning, backup, ændret søgetekst, korrupt PDF og forældet version. Ingen rigtige PDF'er udskiftet i testen.
- Checklist PowerApp er en cirkel over Åbne checklister i venstre side. Flight Monitoring er en lige stor globus med fly i højre side. Begge anmoder om separate browservinduer ved klik (browserens popup-politik gælder).
- PDF-forhåndsvisning kræver pypdfium2 i Python. Serveren bruger OCC_PYTHON hvis angivet, ellers den lokale Codex primary-runtime. Tekstudtræk bruger pypdf. Testet: PDF range206, ugyldig side404, 195 metadata-poster, global søgning, lokalt billedpreview og mappefilter.

- Otte menuer: Crewing, Transport og hoteller, Trafik, OCC-systemer, Træning, Procedurer og manualer, Union agreements og FlightPoint. Eksisterende punkter bevaret; brugerens leverede links indlagt og revision gemt via admin-API.
- Get-E Hotel/Ground Transport/Deadhead afventer links. Manglende links vises matte med Afventer link. GnA er information via Raido, ikke en manglende webadresse.
- Emergency vises fast nederst til højre, hvid med rød skrift, og følger emergency-punktets URL i admin.
- PDF-panel og admin-valget Åbn som PDF er implementeret. SharePoint blokerede indlejring af MCU-aftalen i browser-testen; original-linket er tilgængeligt. De nye lokale PDF-kopier bruger den verificerede sidevisning beskrevet ovenfor. Omgå ikke SharePoints adgangskontrol.
- CFMU NMUI bruger startadressen fra redirect_uri i brugerens link, uden midlertidige OAuth-parametre. Eksterne systemers login og drift er ikke valideret.
- Latest On blocks Canarias er brugerens titel, men URL-filnavnet er Latest offblocks W25; dette er markeret i beskrivelsen og skal bekræftes.
- Gamle Traffic tool og SBY-oversigt Rootz er bevaret uden link. Passwords/runitems er indbyggede funktioner, ikke manglende links.

## Kontrolleret

- Åbne checklister bevarer Link, Info og SortOrder fra flowet. HTTP(S)-links valideres; credentials i links afvises. Punkter sorteres efter SortOrder og dernæst ID. Lister grupperes efter Run.Id.
- Live udtræk før test: 63 punkter, 20 links, 47 Info-felter og SortOrder på alle 63. Links kontrolleret i browseren.
- Brugeren besluttede, at nye adhoc-lister skal indeholde ALLE skabelonpunkter for typen. DaysMask, ValidFrom, ValidTo og Season filtrerer kun forhåndsvisningen. Dette forklares i oprettelsesformularen.
- Efter udtrykkelig godkendelse oprettedes DIV TEST-PORTAL (Run ID 1243), med 12 punkter (30650–30661). Oprettelse svarede ok, og listen blev vist i browseren.
- Første 11 testpunkter blev afkrydset via portalens API med navnet OCC portaltest. Et frisk flowkald viste præcis ét punkt tilbage.
- Sidste punkt blev afkrydset via portalens formular med OCC portaltest. Browseren bekræftede Gemt i SharePoint og nul åbne punkter. Andre listers punkter blev ikke ændret.
- Lokale mock-tests kontrollerer dubletbeskyttelse for samme requestId, vedvarende kvittering, og stop efter ubekræftet fejl. Mock-tests kalder ikke Power Automate.
- Crew/Trafik logs, projektinformation/manualer og samlede checklist-menuer er implementeret. Manualerne er uændrede kopier.

## Resterende

- Direkte kontrol af OCC_Runs ID 1243: Status=Closed samt DoneByText/DoneAt. At en liste med alle punkter Done forsvinder fra læseflowet beviser ikke i sig selv Closed. Afkrydsningsflowet returnerer kun ok/done.
- Overvej at returnere runId, remainingCount og runClosed fra afkrydsningsflowet efter vellykket lukning. Oprettelsesflowet kan tilsvarende returnere runId og itemsCreated for bedre verifikation, herunder nul skabelonpunkter.
- Adgangsmodel og hosting for fælles brug er ikke besluttet. Aktuelt kun lokal loopback-server; personnavnet ved afkrydsning er selvangivet, ikke verificeret login.
- Dubletbeskyttelsen gælder samme requestId; en ny formular har nyt ID. Det er ikke en global unikhedsregel for checklistetype/reference.
- Brug ikke historiske forslag i POWER-AUTOMATE-NEXT.md som dokumentation for nuværende flowkontrakter.
