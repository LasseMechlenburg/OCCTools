# Næste Power Automate-forbindelser

Historisk integrationsforslag. Flere punkter nedenfor er nu implementeret; teksten er ikke en aktuel status. Se STATUS.md for verificeret status og resterende arbejde.

## 1. Opret checkliste

Et separat HTTP-flow modtager eksempelvis:

```json
{"requestId":"unik-anmodnings-id","checklistCode":"DIV","reference":"DK1234"}
```

Tillad kun de bekræftede koder: `PreOps`, `Wetlease`, `DIV`, `Crew ILL`, `AdHoc Sale`. De er læst fra templates; kontrollér at de også findes som choices i OCC_Runs.

| Kode | Obligatorisk reference |
|---|---|
| PreOps | Ingen; dags dato anvendes |
| Wetlease | Flightnummer |
| DIV | Flightnummer |
| AdHoc Sale | Flightnummer |
| Crew ILL | Crewnummer, behold eventuelle foranstillede nuller |

Foreslået standard er dags dato i Europe/Copenhagen for alle oprettelser. Power Apps-koden har også en datovælger; afklar senere hvis andre datoer skal kunne vælges fra siden.

Flowets trin:

1. Validér checklistCode og påkrævet reference før der oprettes noget. Serveren skal validere de samme felter.
2. Brug requestId som dubletbeskyttelse med en varig unik nøgle. Et gentaget netværkskald må ikke skabe endnu en run. Nøglelagring/kolonne aftales før implementering.
3. Create item i OCC_Runs: Title = kode plus reference når den kræves; RunDate = dags dato; ChecklistCode = kode; Status = Active. Bevar Power Apps-appens eksisterende navngivning medmindre andet aftales.
4. Opret OCC_RunItems med det nye run-ID og checklistCode via samme logik som PA_CreateRunItemsFromTemplates.
5. Returnér først succes, når oprettelsen af punkterne er bekræftet. Fejl efter oprettelse af run skal kunne genoptages uden dubletter, og skal ikke returnere falsk succes.

```json
{"ok":true,"runId":123,"checklistCode":"DIV","title":"DIV DK1234","runDate":"2026-09-16","itemsCreated":12}
```

Request-eksemplet er en kontrakt, ikke en URL eller et færdigt flow. Vi mangler handlingerne i PA_CreateRunItemsFromTemplates for at bevare feltmapping, dato-/sæsonregler og dubletkontrol. Et Power Apps-trigger-flow kan ikke uden videre vælges som child flow: child flows kræver manuel trigger og samme solution. Mulighederne er en fælles child-flow-logik med Power Apps/HTTP som indgange, eller en separat HTTP-version med de eksisterende handlinger. Den nuværende Power Apps-udgave må ikke ødelægges.

Microsoft: https://learn.microsoft.com/en-us/power-automate/create-child-flows

## 2. Afkryds punkt

Et separat HTTP-flow modtager:

```json
{"itemId":30555,"done":true}
```

Validér et positivt item-ID, hent det konkrete punkt i OCC_RunItems, kontrollér adgang og opdatér Done=true. Bevar alle øvrige felter. Hvis appen også bruger DoneBy, DoneAt eller færdig-status på run, skal de regler afdækkes før implementering; Power Apps-koden for afkrydsning mangler stadig.

```json
{"ok":true,"itemId":30555,"done":true}
```

Siden skal vente på bekræftet gemning, før punktet forsvinder. Ved fejl bliver punktet stående med fejlbesked. Gentaget Done=true skal være sikkert. Aktuel test-afkrydsning må ikke kaldes en gemt ændring.

Microsoft: https://learn.microsoft.com/en-us/connectors/sharepoint/

## 3. Åbne checklister skal også returnere adhoc-runs

Det hidtidige filter for D/CD/N/CN i dag/i går udelukker adhoc-checklister. Læseflowet skal udvides: returnér åbne punkter for aktive relevante runs, inklusive PreOps, Wetlease, DIV, Crew ILL og AdHoc Sale. Aktive adhoc-runs må ikke forsvinde ved midnat, bare fordi de er fra dagen før. Den eksisterende regel for D/CD/N/CN kan bevares separat.

Returnér run-ID, checklistCode, Title, RunDate og Status sammen med punktets ID, Title, Done og link. Gruppér siden efter run-ID, ikke kun titel: to runs kan have samme titel. Genhent åbne checklister efter bekræftet oprettelse og efter afkrydsning.

## 4. Crew log og Trafik log

Foreslået separat læseflow, med pagination slået til:

```json
{"generatedAt":"2026-09-16T08:00:00Z","crewLog":{"value":[]},"trafficLog":{"value":[]}}
```

Dette er en foreslået ramme; de faktiske liste-/feltnavne og et eksempel på én post fra hver log mangler. Aftal også hvilken periode der skal vises. Send kun felter, som skal vises på portalen. Særligt Crew log kan indeholde personfølsomme oplysninger; undlad unødvendige helbredsdetaljer, og afklar portalens adgang før tilslutning. Denne opgave omfatter i første omgang læsning, ikke oprettelse/redigering af logposter.

## Tilslutning og sikkerhed

- Send de nye URL'er via den aftalte private konfiguration; de skal kun ligge på serveren, aldrig i browserkode eller offentlig pakke.
- Skrivende flows må kun kaldes ved eksplicit brugerhandling, aldrig ved hover eller sideindlæsning. Kun læseflows indlæses automatisk.
- Kontrollér brugeradgang til at oprette/afkrydse; flowforbindelsens ejer må ikke utilsigtet give alle portalbesøgende skriveadgang.
- Brug særskilt testsæt eller tydeligt godkendte test-runs til live skriveprøver.
- Log ikke passwords, hemmelige flow-URL'er eller unødvendige crewoplysninger.
