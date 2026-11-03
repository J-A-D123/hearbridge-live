## Inspiration

A missed room number can derail an otherwise clear audiology follow-up. A caption can make a spoken sentence visible, but the listener still has to decide whether the room, date or time was heard correctly. HearBridge Live gives both people a place to check those details together before they part.

## What it does

HearBridge Live accepts browser speech captions or typed turns. It highlights common date, time and room phrases and keeps the original turns attached as evidence. When two candidate values appear, the app asks the people in the conversation to resolve them. A field-specific repair card lets the listener show the speaker a large English and Mandarin question alongside the caption candidates, then enter the speaker’s answer. They can also confirm an existing candidate. The shared recap and optional JSON export contain only human-confirmed details. A later contradictory mention reopens the relevant card.

English and Mandarin repair phrases can be displayed in large type or read through an installed local voice. An optional local room-activity meter makes relative microphone activity visible. Two guided scenarios use fictional turns and simulated recognition signals. One has a room change in English, and the other has a time change in Mandarin. The dashboard moves unresolved conflicts to the top and tracks confirmed details as the conversation progresses. Judges can inspect both scenarios without microphone permissions or credentials.

## How it was built

The project uses HTML, CSS and JavaScript ES modules. The Web Speech API supplies optional browser speech recognition and local speech synthesis. On-device recognition requires a supported language pack. Users can explicitly opt into browser-service recognition, which may transmit speech to the provider. Web Audio supplies the relative input-level meter. A deterministic extraction and reconciliation module preserves exact source spans, groups equivalent clock formats and keeps confirmation separate from recognition. Python's standard-library server can preview the static files. The core rules are covered by Node.js tests.

## Challenges and what the project taught us

A low recognition score can be useful context, but a high score cannot tell which of two room numbers is current. The app keeps the evidence visible and leaves the decision to the people in the conversation. Browser speech support varies, so typed input and a permission-free sample use the same verification workflow.

## Reproducible workflow check

The repository includes an eight-case synthetic text replay covering changed details, equivalent times, stable values and a room phrasing the matcher misses. The five intentionally changed details were flagged as conflicts. Recaps withheld all eight values before a scripted confirmation. The replay checks workflow behavior and exposes extraction limits. It does not measure speech accuracy or user outcomes.

## Scope

This is a communication-access prototype for one logistical exchange at a time. It has no clinical validation. The meter reports relative activity, and the bilingual support covers language-selectable captions and curated repair phrases. The app has no transcript backend or persistent transcript storage.

## Originality and tool disclosure

HearBridge Live was newly implemented on November 3, 2026, after GenHacks opened. This codebase, UI and fictional demo were created separately from earlier HearBridge, HearGuard Campus, HearPath and AuditoryBridge projects. No prior project code, dataset or design asset was imported into this repository.

OpenAI Codex generated the initial implementation, original SVG icon, tests and submission drafts with human-provided project direction. Runtime speech uses browser and device speech facilities. Extraction, conflict handling and recap use deterministic JavaScript. No external runtime libraries, templates, stock assets or third-party datasets are bundled. Python and Node.js were used as development and verification tools.
