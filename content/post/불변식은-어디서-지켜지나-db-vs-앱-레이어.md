---
title: "불변식은 어디서 지켜지나 — DB vs 앱 레이어"
date: 2026-07-24
tags: ["architecture", "db"]
categories: ["Architecture"]
---
> **TL;DR** "이 제약 어디서 강제됨?"의 답이 DB가 아니라 코드면, 책임 레이어를 재확인할 신호.
- Neo4j `MERGE`는 "관계 1:1"을 **강제하지 않는다** — 그 불변식은 Python 오케스트레이션(`prepare_graph_data`의 disjoint partition)이 지킨다(예시).
- 일반화: 데이터 무결성이 **스키마 제약인지 앱 로직인지** 항상 의식하자. 코드가 지키는 불변식은 테스트·리뷰로만 보장된다(DB가 안 막아줌).

---
