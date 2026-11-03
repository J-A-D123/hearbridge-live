# HearBridge Live

**A shared confirmation workspace for accessible conversations.** Built as a fresh, self-contained prototype on November 3, 2026 for GenHacks. Suggested track is Healthcare & Environmental.

## 在 Mac 上启动

1. 解压项目，用 VS Code 打开 `hearbridge-live` 文件夹。
2. 打开 VS Code 的 Terminal → New Terminal，运行下方命令。保持终端开启。
3. 在 Chrome 打开 [本机应用](http://127.0.0.1:8000)，点 **Run guided demo**。依次点 **Next sample turn**，打开房间卡上的 **See source turns**，与对话伙伴核对后确认 **room 240**，最后打开 **Open confirmed recap**。

```sh
python3 -m http.server 8000 --bind 127.0.0.1 --directory dist
```

顶部 **Guided scenario** 可切换至 **Rehab reception · Mandarin**，体验中文随访时间从下午两点改到三点的核对流程。面板会优先显示冲突，并实时统计对话轮次、冲突和人工确认数。

应用无需安装 Python 包或 npm 包，也无需 API 密钥。静态文件通过 HTTP 提供给浏览器，Python 只用于本地预览。Node.js 20+ 用于自动化测试。应用用到的浏览器功能见下方。

## Live audio and bilingual interaction

- **Live captions.** Select English or Mandarin, open **Privacy & audio** and use **Prepare selected language pack** where supported. Click **Start mic** and grant permission. In on-device mode the app checks support and refuses to fall back to an online service. Availability depends on browser, OS and language. A user can explicitly select **Browser service (may send audio)**. This uses the browser's recognition service, which may send speech to its provider. Ask everyone first. Browser support and provider availability vary, including by region.
- **Typed input.** Enter your own English or Mandarin utterance. Try `周二下午三点半去204室`. Typing uses the same extraction and confirmation pipeline and remains available without microphone access.
- **Repair phrases.** Four paired English/Mandarin prompts can be shown in large type. Speech output requires an installed local voice. Text is available without voices. This is a bilingual phrasebook and language-selectable captions, with no automatic translation or language detection.
- **English playback.** Under **Privacy & audio → English playback**, choose a local voice and pace, then use **Preview English voice**. Automatic mode favors standard narration voices. English recaps read common numeric room identifiers digit by digit.
- **Room activity.** A separately enabled local microphone meter computes smoothed relative amplitude using Web Audio. Its labels describe input activity. It has no calibrated dB SPL, sound classification or emergency detection.
- **Private by default.** There is no app backend, analytics, account, transcript persistence or automatic upload. Static hosting may log ordinary page requests. Clear session stops audio and clears the conversation. Browser/provider behavior depends on the audio mode. Export is manual and only includes verified values, their decision source, and the sample flag.

## How it works

```text
Microphone / Typed input / Fictional replay
       → finalized turn with source + optional recognition signal
       → English/Mandarin pattern extraction and exact text spans
       → compare candidate values by detail type
       → speaker and listener verify a value or type a correction
       → confirmed-only shared recap and optional JSON export
```

The matcher covers common date, clock time and room forms. It handles one appointment or logistical exchange per session. It does not infer clinical content, speaker identities, negation, or which conflicting utterance is authoritative. Start a fresh session for another appointment. A later contradictory mention reopens the affected card. Recognition scores are provider signals, can be absent, and are not calibrated probabilities. Human confirmation remains necessary even when no conflict is flagged. This is a communication prototype and has no clinical validation.

## Tests

```sh
node --test tests/*.test.mjs
```

See [verification notes](submission/VERIFICATION.md) for checks actually completed and the physical microphone checklist. Use a fictional sentence in live tests. The demo fixtures carry synthetic recognition scores.

## Publish when ready

1. Use GitHub Desktop to add the extracted project folder as a new local repository, then commit and publish it publicly under your own GitHub account. Keep the first commit's real timestamp. From a signed-out window, verify the README, `dist/`, tests and submission disclosures are accessible.
2. Optional live link. On any static HTTPS host, upload the **contents of `dist/`** as the document root so `index.html` is served at the landing URL. For GitHub Pages, one straightforward path is to create a separate public demo repository, copy the contents of `dist/` into its root, then select **Settings → Pages → Deploy from a branch → main → / (root)**. Keep the main repository as the canonical source. [GitHub Pages publishing guide](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site). A host must serve `.mjs` as JavaScript and preserve relative asset paths.
3. Check the real HTTPS link signed out. Run the sample, test typed input and confirm the app works on mobile. If live captions are used in your recording, verify the intended language/browser mode on that URL first. Add only actual published URLs to Devpost.

## Submission kit

- [Devpost rules, fields and checklist](submission/DEVPOST.md)
- [English Project Story](submission/PROJECT-STORY.md)
- [Timed English demo script](submission/DEMO-SCRIPT.md)
- [Build provenance and AI disclosure](submission/PROVENANCE.md)
- [Competitive review and trial protocol](submission/COMPETITIVE-REVIEW.md)
- [Tests and verification](submission/VERIFICATION.md)

Project source is offered under the [MIT License](LICENSE). No external runtime libraries, fonts or stock media are bundled.
