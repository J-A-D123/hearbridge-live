# Verification report · 2026-11-03

## Completed

- `node --test tests/*.test.mjs` ran 15 checks. Ten cover extraction, source spans, demo provenance, decisions, contradictions, equivalent times, reset, and Mandarin replay with changing session counters, and field-specific repair prompts and English recap formatting. Two cover English voice ranking and preview behavior using fake browser voices. Three inject a fake browser recognition interface to check explicit on-device behavior, event handling and cancellation. Those tests supply scripted results.
- Python served the static files successfully on localhost, including a JavaScript MIME type for ES modules.
- In the ChatGPT in-app browser on macOS, ran the fictional replay, checked both highlighted room sources, confirmed Tuesday and room 240, and verified the recap omitted the unresolved time. Captured actual browser screenshots.
- Entered a Mandarin turn in the app and got three fields. Corrected 204室 to 205室, then entered a contradictory room and observed that confirmation reopened. Opened the bilingual repair display. Verified that Clear session returned to READY with zero turns and zero cards.
- Verified desktop three-column layout at 1350 px and 390 px mobile width without horizontal overflow. Browser interaction was performed in the in-app browser. A separate headless Chrome launch did not start in this environment.

- In the upgraded build, ran both guided scenarios, confirmed the conflicting room/time cards appeared first and checked the status counts after confirmation. Verified 390 px width with no horizontal overflow. Tested the self-contained HTML through a local browser preview.

- In the latest build, opened the bilingual question from both an English room conflict and a Mandarin time conflict. Verified that Enter speaker’s answer focused the correction field and that the recap showed a newly typed room while omitting an unresolved time. Ran the separate eight-case synthetic replay.

## Verify on your Mac before recording

1. Open the local or deployed URL in Chrome. Keep the default on-device setting and select English. Use the language pack control. If the browser reports unavailable, use the typed flow or explicitly opt into the browser service where accessible.
2. Click Start mic, grant permission, and speak a fictional appointment sentence. Confirm a genuine interim or final transcript appears and the final transcript produces cards for supported forms. Test Mandarin separately if you plan to demo it.
3. Stop the mic. Turn on the room level meter, check it moves when you speak and returns to off on Clear session. Test the large repair display with any installed English and Mandarin voices.
4. Check confirmed-only JSON if you plan to demo export. Confirm one value, open the recap, download and inspect the JSON. Try denying microphone permission and check that typing still works.
5. Repeat on the actual deployed URL if you publish one. No physical microphone, local speech pack, browser-service speech, installed voice playback or public host was validated in this delivery. There is no measured transcription accuracy or clinical outcome data.
