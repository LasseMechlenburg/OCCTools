# Daily log — implementeret lokalt i version 48

Seneste status og testgrænser står øverst i STATUS.md. CreatedByName og ModifiedByName er tilføjet af brugeren. Skriveflow: create/update med entryText, name, requestId og for update itemId/etag. Midnatskontrol bruger Created (uforanderligt oprettelsestidspunkt) i dansk tid; feltnavnet LogDate styrer læsefilteret. REST MERGE opdaterer kun EntryText og ModifiedByName og kræver triggerens IF-MATCH/etag. Planen nedenfor er det oprindelige designgrundlag.

Fælles for OCC, separat fra Crew Log og Traffic Log. En post pr. entry, lange noter, dansk dagsdato; kun dagens entries kan oprettes/redigeres. Ældre dage er læsevisning. Datovælger, hover-forhåndsvisning ved knap og eget vindue ønskes.

Brugeren har oprettet OCC_DailyLog. Foreslåede kolonner (oprettes med disse navne): Title (eksisterende, automatisk kort titel), LogDate (Date and time, Date only, required), EntryText (Multiple lines of text, plain text, required, append changes OFF), RequestId (Single line of text, required, enforce unique values). Brug eksisterende ID, Created, Modified. Slå versionshistorik til. RequestId bruges til deduplikering; version/ETag skal bruges ved redigering for ikke at overskrive samtidige ændringer.

Flow/backend skal bruge egen dagsdato i Europe/Copenhagen/Romance Standard Time og ved redigering kontrollere postens oprindelige LogDate; stol ikke på en dato fra klienten. Date-only feltets serialisering/tidszone skal testes. Midnatslås gælder portalens skrivevej; direkte SharePoint-redigeringsrettigheder er ikke automatisk begrænset. Direkte adgang skal afklares, hvis låsen også skal gælde dér. Ingen verificeret personidentitet under nuværende adgangsmodel; Created By via flow er forbindelseskontoen.

17/9: To links tilføjet til LOKAL content.json revision 12 under Trafik: Online Slot Coordination (https://www.online-coordination.com), E-Airport Slots (https://e-airportslots.aero). Ingen loginoplysninger kopieret. Backup taget. Ikke i eksisterende version 47-pakke, der bevidst ikke erstatter content.json. Live-links skal tilføjes via admin eller målrettet migration i kommende pakke uden at overskrive serverindhold.
