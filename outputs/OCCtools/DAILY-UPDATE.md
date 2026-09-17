# Dagsopdatering 17. september 2026 — version 47

Pakken er PRIVAT: den indeholder to signerede Power Automate-adresser. Del den ikke i GitHub, mail eller en offentlig mappe. Kopiér kun til den aftalte OCC-server.

## Med i pakken

- Kopiér telefonnummer/password og tydeligere grupperet søgning.
- Aktiv/inaktiv menu og link i admin.
- Lav entry i Crew-/Trafiklog med kun titel.
- Tilføj punkt på en åben checkliste, inklusive adhoc.
- Fremtidigt punkt til D/CD/N/CN på én valgt dato.
- Åbn en checkliste i eget vindue med afkrydsning.
- Refresh-tekster; Åbn et område fjernet.

## Installation på DK-AP-PR-OCCH01

Kopiér OCCtools-daily-private-20260917-47.zip til C:\Temp. Kør i PowerShell som administrator:

```powershell
$zip = 'C:\Temp\OCCtools-daily-private-20260917-47.zip'
$unpack = 'C:\Temp\OCCtools-daily-20260917-47'
if (Test-Path -LiteralPath $unpack) { throw 'Udpakningsmappen findes allerede. Stop og kontrollér om opdateringen allerede er kørt.' }
Expand-Archive -LiteralPath $zip -DestinationPath $unpack
& "$unpack\Update-OCCtools-Daily.ps1" -Destination 'C:\OCCtools'
```

Scriptet stopper/genstarter kun OCCtools kortvarigt, tager backup og kontrollerer de to nye endpoints lokalt. Det opretter ikke SharePoint-poster og ændrer ikke admin-login, eksisterende data, PDF'er, IIS eller serviceindstillinger. Ved fejl gendannes de eksisterende filer fra backup. Nye ubrugte modulfiler kan blive liggende.

Åbn https://occ.ne.int/OCCtools/ og tryk Ctrl+F5. Ingen af de tidligere 43/44/45-opdateringspakker skal installeres først.

## Kontrol efter installation

Kontrollér kopiering, søgegrupper, admin Aktiv-felter og Refresh. Åbn en eksisterende checkliste og prøv Åbn i eget vindue. Visningen opdateres manuelt med Refresh, også når en anden bruger ændrer listen.

Lav entry og Tilføj punkt er testet med fiktive lokale data. Første rigtige gemning skal kontrolleres i SharePoint og flowhistorikken: korrekt liste, dato og titel. Fremtidige punkter ligger i OCC_Templates og vises først, når dagens liste dannes. Listen over åbne checklister viser kun runs, der har åbne punkter i henteflowets svar.

Ved ubekræftet gemning må man ikke prøve igen uden at kontrollere SharePoint og flowhistorik. Formularen låser derfor. Den signerede flowadresse kan ikke i sig selv verificere flowets feltopsætning.

Bevar den beskyttede backup på serveren. Slet eller arkivér ZIP og udpakkede flowfiler sikkert efter vellykket installation efter jeres lokale praksis.
