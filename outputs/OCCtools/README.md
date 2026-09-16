# OCC tools · installation og drift

> **Aktuel deploymentvejledning: [DEPLOY.md](DEPLOY.md).** De historiske eksempler nedenfor beskriver den tidlige prototype. Brug ikke HTTP-eksemplerne til den nuværende portal med passwords og interne PDF'er. Kør først Test-OCCtoolsHost.ps1; den nye installer kræver HTTPS, bekræftet begrænset adgang og Python/PDF-moduler.

Portalen er klar til afprøvning på IIS som `/OCCtools`. Forsiden kræver ikke login. Admin bruger én konto (`admin`), med adgangskoden valgt ved installation. Ingen standardadgangskode medfølger.

## Indhold

- Vagtstart: OCC-kalender, Adhoc/Maint-kalender og OCC-checklister.
- Get-E, Rootz og GnA med uddybning og milepæle. Datoerne er planlagt/forventet indhold fra oplægget, ikke automatiske driftsstatusser.
- Fem redigerbare værktøjsmenuer. Standby dashboard er adskilt fra Rootz SBY-oversigt.
- Klik på ⓘ eller højreklik for forklaring og procedurelink. Menuknappen ⋯ viser hjælp til hele området.
- Admin kan ændre titel, tilføje/flytte/slette menuer og links, vælge ikoner og redigere/skjule/slette projekter og milepæle.
- Data gemmes fælles på serveren, med en backup af hver tidligere version. Flere samtidige redigeringsfaner beskyttes mod overskrivning.

Links, som endnu ikke er oplyst, vises med “Link tilføjes”. Tilføj især Comply365, Get-E, de enkelte Rootz-tools, Standby dashboard, Irreg og øvrige værktøjer i admin. De tre genveje ved vagtstart følger de oprindelige kalender-/checklisteposter; ændring af deres links slår igennem begge steder. Slettes en af disse poster, forsvinder den tilsvarende genvej.

## Før installation

På serveren skal der være:

1. IIS og et eksisterende site, der håndterer `occ.ne.int`.
2. Node.js 22 eller nyere installeret fra [nodejs.org](https://nodejs.org/).
3. NSSM, som allerede er installeret hos jer. Hvis det ikke ligger i PATH, angives filstien med `-NssmPath`.
4. Microsoft [IIS URL Rewrite](https://www.iis.net/downloads/microsoft/url-rewrite) og [Application Request Routing](https://www.iis.net/downloads/microsoft/application-request-routing). Under serverens **Application Request Routing Cache → Server Proxy Settings** skal **Enable proxy** være aktiveret. Dette er en fælles IIS-indstilling; installationsscriptet kontrollerer den, men ændrer den ikke. Se [Microsofts opsætningsvejledning](https://learn.microsoft.com/en-us/iis/extensions/url-rewrite-module/reverse-proxy-with-url-rewrite-v2-and-application-request-routing).

Node-tjenesten lytter kun på 127.0.0.1. IIS sender forespørgsler for `/OCCtools` videre til den. Scriptet opretter kun en ny applikation og en separat tjeneste; det ændrer ikke `/rootz`. Eksisterende overordnede rewrite-regler kan dog påvirke nye undersider og skal ved behov tilpasses af serveradministratoren.

## Installation

Pak ZIP-filen ud på serveren. Åbn **Windows PowerShell som administrator** i mappen OCCtools og kør:

```powershell
.\Install-OCCtools.ps1 -SiteName 'Default Web Site' -Destination 'C:\OCCtools' -Origin 'http://occ.ne.int'
```

Erstat site-navnet med navnet i IIS. Hvis NSSM ikke findes automatisk:

```powershell
.\Install-OCCtools.ps1 -SiteName 'Dit IIS-site' -NssmPath 'C:\Tools\nssm.exe'
```

Vælg en adgangskode på mindst 14 tegn. Den gemmes kun som en saltet scrypt-hash. Scriptet stopper ved eksisterende destination, applikation eller tjeneste, så en tidligere installation ikke overskrives. Hvis et forsøg stopper midtvejs, skal de oplyste delresultater undersøges, før installationen gentages.

Åbn `http://occ.ne.int/OCCtools/`. Vælg **Admin** og log ind med brugernavnet `admin`.

### HTTP og admin

På den ønskede HTTP-adresse er trafikken, inklusive admin-login, ikke krypteret. Brug kun siden på det interne netværk. HTTPS på IIS anbefales, før admin anvendes i almindelig drift. Når HTTPS er sat op, ændres `origin` i `data/config.json` til fx `https://occ.ne.int`, og OCCtools-tjenesten genstartes. Sessioncookies får automatisk Secure-flag ved HTTPS. Portalens origin skal matche den adresse, brugerne faktisk åbner; aliaser med anden host/protokol afvises ved login og gemning.

## Opdatering

Tag først en backup af hele `C:\OCCtools`, især `data`. Stop derefter kun OCCtools-tjenesten:

```powershell
Stop-Service OCCtools
```

Kopiér den nye versions `dist`, `server.mjs`, `init-admin.mjs`, `seed.json` og `package.json` over programfilerne. **Bevar `data` og `iis-proxy`.** Start igen:

```powershell
Start-Service OCCtools
```

Nyt seed-indhold erstatter aldrig eksisterende adminindhold. Indholdsændringer til en installeret portal foretages i admin. Servergenstart logger admin ud, men bevarer alle gemte oplysninger.

## Backup og gendannelse

`data/content.json` indeholder det aktive indhold. `data/backup-N.json` indeholder version N før den næste gemning. Backups slettes ikke automatisk; tag dem med i serverens backup og anvend jeres normale opbevaringspolitik.

Ved gendannelse: Stop OCCtools, gem en kopi af den aktuelle `content.json`, kopiér den ønskede backup som `content.json`, og start tjenesten igen. `data/config.json` indeholder adgangskodehash og opsætning og skal også sikkerhedskopieres. Datamappen er ikke tilgængelig gennem hjemmesidens ruter.

## Fejlfinding

- **502:** Kontrollér OCCtools-tjenesten og porten i `data/config.json`/`iis-proxy/web.config`.
- **500.19:** Kontrollér URL Rewrite, ARR og nedarvede IIS-regler/konfigurationslåsning.
- **Login/gemning afvises med anden adresse:** Kontrollér `origin` i `data/config.json` og genstart tjenesten efter rettelse.
- **Admin ikke sat op:** Kør installationen; lokal forhåndsvisning har ingen konto som standard.
- **Tjenesten starter ikke:** Se `data/service-error.log` og kontrollér Node-version og filrettigheder.
- **Link ændres til HTTPS af Edge:** Portalen gemmer det præcise HTTP-link. Browserpolitikker styres uden for portalen. “Hjælp til links” forklarer muligheden for at kopiere adressen til Firefox.

## FlightPoint

### Kalender quick view · test

Vælg “Kalender · 3 dage” ved Start vagten, eller OCC-kalender i cirkelmenuen. Vinduet viser udtrækkets dato og de næste to dage med flerdagesposter på alle relevante dage. Klik på en post for beskrivelse og original-link. HTML vises som tekst; billeder fra SharePoint skal ses i originalen.

“Indlæs flow-resultat” accepterer en JSON- eller tekstfil med hele Power Automate-resultatet (`body.value`) eller et normaliseret `items`-array. Indlæste filer bliver kun i browserfanens hukommelse og gemmes ikke fælles. Ingen produktionskalenderdata medfølger installationspakken. Automatiske opdateringer fra flowet er endnu ikke tilsluttet.

I den lokale udviklingsvisning kan miljøvariablen `OCC_CALENDAR_PREVIEW_FILE` pege på et lokalt flow-resultat. Det læses kun ved direkte adgang gennem `127.0.0.1` og indgår ikke i IIS-installationen. Det viste tidspunkt kommer fra flowets `headers.Date` eller `generatedAt`; udtrækket mærkes altid som test og aldrig som live.

Begge kalendere er afprøvet med samme Microsoft-login. Direkte åbning fungerede, mens lokal iframe-indlejring gav tomme felter. Første version bruger derfor direkte links. Der kopieres ingen kalenderposter ind i portalen. En senere kalenderintegration kræver en godkendt Microsoft-dataforbindelse og afklaring af, hvem der må se oplysningerne. [Microsoft om indlejring på andre domæner](https://learn.microsoft.com/en-us/troubleshoot/sharepoint/sites/cannot-display-sharepoint-pages-in-iframe).

## Lokal forhåndsvisning

```powershell
node server.mjs
```

Åbn `http://127.0.0.1:8787/OCCtools/`. Ingen pakkeinstallation er nødvendig. Første start opretter `data/content.json` ud fra seed-indholdet. Hjemmesiden fungerer uden adminopsætning; admin kan kun aktiveres ved opsætning på maskinen.

## Verifikation før drift

Programmet er kontrolleret lokalt for læseadgang, adminbeskyttelse, login, validering, gemning, backup og konfliktbeskyttelse. Selve installationen kan først verificeres på din IIS-server. Kontrollér efter installation, at både `/rootz` og `/OCCtools` åbner, at adminændringer vises i en anden browser, og at de interne værktøjslinks fungerer fra en OCC-arbejdsstation.
