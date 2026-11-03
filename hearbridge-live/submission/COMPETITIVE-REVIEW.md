# GenHacks 对照研究与评审准备

核对日期为 2026-11-03。[GenHacks 2026 官方赛程](https://genhacks-open.devpost.com/details/dates)显示目前仍在提交窗口，最新安排为 2027-01-07 08:00 EST 公布获奖者。官方项目库本次访问返回 403。公开检索没有找到能核实为 Shail & Sharaf 同主办方的往届获奖项目。[2019 年同名活动](https://genhacks.devpost.com/)是旧金山 Make School 的高中环保活动，无法据此推断本届评委偏好。

| 对照 | Devpost 可核实的信息 | 对 HearBridge Live 的启发 |
| --- | --- | --- |
| [CallBuddy](https://devpost.com/software/callbuddy) | 2022 Hard of Hearing Hackathon 第二名。面向电话无障碍，项目页提供可试用的餐厅流程。 | 录完一次完整的随访核对，从两个冲突值到双方确认后的摘要。 |
| [ClearVoice](https://devpost.com/software/clearvoice) | HappyHacks I 第一名。以电话和 WhatsApp 串起一个具体的无障碍入口。 | 让入口跟着问题走，在冲突卡上点一次就显示要问的具体问题。 |
| [Hearing Buddy](https://devpost.com/software/hearing-buddy) | RevenueCat Shipaton 2025 Peace Prize 第二名。项目页展示设备端语音方案、上架链接及作者报告的社区反馈。 | 提交可匿名打开的版本，并补一段真正的麦克风验证和可描述的试用观察。 |

## 可复现的合成回放

运行 `node tests/replay-evaluation.mjs`。8 个手工编写的文字情境覆盖英文和中文变更、等效时间、稳定房间号，以及拼写成单词的房间号。演示用的对照策略是直接取首个提取值，并非上述获奖作品或商用产品。

- 在刻意编入的 5 个变更情境，直接取首值会保留旧值。HearBridge 在 5 个情境均显示冲突，人工确认前 8 个情境均不发布任何值。
- 给脚本提供预期值来模拟人工确认后，7 个情境可输出该值。第 8 个拼读房号没有被规则捕获，摘要显示房间未捕获。测试既没有运行语音识别，也没有测量用户是否会选对。
- 这组数据用来解释设计取舍和边界。它不是准确率报告、患者试验、用户研究或获奖概率估计。

## 录制前小规模试用

用虚构的日期、时间、房间号。邀请自愿参加的两人分别扮演接待者和来访者，尽量让他们自己找到 Ask the speaker 并说出或输入最终确认值。记录用时、是否需要提示、最终摘要是否包含旧值、以及对双语大字是否清楚的一句反馈。可让他们先用纯文字原句完成一轮，再用应用完成不同但难度相近的一轮，并记录顺序。取得同意后再记录反馈，避免真实病历和可识别信息。在 Devpost 报告实际人数和观察，样本小就说明样本小。本交付没有替参赛者完成试用。
