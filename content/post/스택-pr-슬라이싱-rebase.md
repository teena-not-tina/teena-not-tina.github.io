---
title: "변경 스택 — 슬라이싱 + rebase"
date: 2026-07-24
tags: ["pr-workflow", "backend"]
categories: ["Collaboration"]
---
> **TL;DR** 변경 스택을 어떻게 나누고(슬라이싱) + 어떻게 유지하나(rebase).
## 슬라이싱
- 개수가 아니라 **seam + 독립 리뷰 가능성**으로 자른다.
- 단, **shared 반환 계약 + 그 유일한 소비자는 한 seam** → 못 쪼갠다. (예: `build_merge_preview` 반환(shared) ↔ 라우터 소비자는 한 쌍이라 한 변경.)
- 예시 프로젝트 create-edge를 primitives/guardrails/router/dispatch 4개로 쪼갠 건, 각 레이어가 계약이 아니라 **독립 덩어리**여서 가능했다.
## rebase (base가 rewrite됐을 때)
- `git rebase --onto <새base> <옛base>` → 옛 base 커밋은 드롭하고 **내 커밋만** replay.
- **스택 맨 아래를 고치면 그 위 전부 재rebase 연쇄**가 따라온다.
- 충돌 해결 후 `git add` → `git rebase --continue`. **`add`**** 전에 충돌 마커 잔존 여부 grep 필수** (안 하면 마커째 커밋됨).

---
