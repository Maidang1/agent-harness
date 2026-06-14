source visual truth path: /Users/bytedance/.codex/generated_images/019ec69c-46f9-7dd0-89b0-2b39b5639070/ig_0b5833dff3c167df016a2ec2bcec8481919dcbb2a2597c5d94.png
implementation screenshot path: /Users/bytedance/codes/myself/book-agent/tmp/design-qa/book-agent-final-screen.png
viewport: 1440 x 1024
state: empty first-run chat state
full-view comparison evidence: opened the selected C reference image and captured the local app at http://localhost:5177/.
focused region comparison evidence: focused review covered left titlebar/sidebar, main header, empty recommendation module, preference strip, and composer.

**Findings**
- No actionable P0/P1/P2 findings.

**Open Questions**
- The source image shows a populated assistant recommendation thread. The implemented app currently renders the empty first-run state until a real conversation exists, using the same layout language and recommendation structure.

**Implementation Checklist**
- Left titlebar fold control keeps the existing macOS traffic-light adjacent placement.
- Sidebar uses C-style dense action rows, grouped chat history, pinned settings, shortcuts, and active states.
- Main surface uses the C direction with provider status, model selector, centered reading content, preference chips, and fixed composer.
- Empty recommendation rows use icon-library book marks and row dividers.
- Page language is set to `zh-CN` to reduce Chrome translate interference.

**Follow-up Polish**
- Add richer recommendation rendering when assistant output includes structured book metadata.

patches made since previous QA pass: removed repeated empty title in the header, replaced fake book-cover initials with Phosphor book icons, reduced composer weight, and changed document language to zh-CN.
final result: passed
