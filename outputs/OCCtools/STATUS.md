# OCC status, 16. september 2026

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
