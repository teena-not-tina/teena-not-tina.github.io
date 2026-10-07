---
title: "순수함수를 preview와 apply가 공유한다"
date: 2026-08-05
tags: ["architecture", "backend"]
categories: ["Architecture"]
---
> **TL;DR** 미리보기와 실제 실행이 같은 순수함수를 쓰면 "미리보기 = 실제 결과"가 구조적으로 보장된다.
## 패턴
- `plan_rewired_edges`는 I/O가 없는 순수계산 → read 경로(미리보기)와 write 경로(실제 병합)가 **같은 함수**를 호출.
- 두 경로가 각자 계산하면 언젠가 갈라진다. 공유하면 갈라질 수가 없다.
## 부수효과 (실제로 얻은 것)
- e2e에서 **write 없이 preview만으로** self-loop 마킹이 증명됨. 파괴적 연산을 안 돌리고 검증 가능.
- 그래서 파괴적 편집 기능은 "순수계산 / 그래프 tx"를 처음부터 갈라놓는 게 이득.

---
