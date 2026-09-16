# OCCtools — start her

Fast, aktiv projektmappe: `C:\Users\lam\Documents\OCCtools`.

## Åbn siden

Dobbeltklik på **start-OCCtools.cmd**. Ingen administratorrettigheder kræves.
Åbn http://127.0.0.1:8787/OCCtools/ i browseren. Startfilen genbruger en allerede kørende server.

## Redigér links og menuer

Vælg **Admin**, skriv brugernavnet **Lasse** og den aftalte adgangskode. Adgangskoden gemmes kun som saltet hash i den private konfiguration. Der er ingen adgang uden password. Brug HTTPS og aftal adgangskontrol før fælles installation.

Under **Menuer og links** kan du oprette menuer, vælge navn og ikon, tilføje links med beskrivelse og manual, flytte links mellem menuer og ændre rækkefølgen. Tryk **Gem ændringer**. Hjulene tilpasser sig automatisk; store menuer får flere sider. Det gælder værktøjsmenuerne, ikke checklist-typerne fra Power Automate.

Indhold gemmes i `outputs/OCCtools/data/content.json`. Hver gemning tager en kopi af den tidligere version som `backup-<revision>.json`.

## PDF-bibliotek

Åbn **Procedurer og manualer → Procedurebibliotek**, eller søg i hovedsøgefeltet. Biblioteket filtrerer efter kildemappe og søger i den tekst, der kan udtrækkes. Scannede sider kræver OCR for indholdssøgning; de kan altid findes på dokumenttitlen. PDF-visningen har sideskift, zoom og søgning med sidematch.

Lokale kopier ligger under `outputs/OCCtools/data/documents/`. De opdateres ikke automatisk fra OneDrive/Comply365. Tilføjelsesdato er ikke revisionsdato. I **Admin → PDF-dokumenter** kan du vælge “Nyt punkt med PDF” eller “Udskift eksisterende PDF”. Træk én PDF ind eller brug filvælgeren (maks. 25 MB, uden adgangskode). Ny PDF: vælg navn/menu, upload, og tryk “Gem ændringer” for at udgive menupunktet. Udskiftning gemmes straks; linket bevares, søgeindekset opdateres, og den tidligere fil samt et indeks-backup bevares. Backup-gendannelse er endnu ikke tilgængelig som en admin-knap. Ved flytning til en anden maskine skal `OCC_PYTHON` pege på Python med pypdfium2; tekstindeksering kræver pypdf.

## Projektmapper

- `outputs/OCCtools/`: server, side og driftsdokumentation.
- `outputs/OCCtools/STATUS.md`: status og kendte begrænsninger.
- `outputs/OCCtools/data/`: privat indhold, konfiguration og gemmehistorik.
- `outputs/OCCtools/dist/manuals/`: GnA-manualerne.
- `work/`: private flow-adresser, tests og arbejdsfiler. Del ikke denne mappe.
- `.git/`: lokal versionshistorik for programkoden. Intet er uploadet til GitHub.

Flow-nøgler, driftsdata og manualer er udeladt fra kodehistorikken, men stadig gemt lokalt. Versionshistorik er ikke ekstern backup; aftal sikker backup af hele mappen før egentlig drift.

Den gamle mappe `C:\Users\lam\Documents\Codex\2026-09-15\jeg` er bevaret som sikkerhedskopi. Dens startfil peger hertil. Arbejd fremover kun i denne nye mappe.

## Fortsæt i Codex

Tilføj denne eksisterende mappe som lokalt projekt med navnet **OCCtools**. ChatGPT-projektet “OCCtool Page” er ikke kodeprojektet. Nye opgaver skal læse README og STATUS først.
