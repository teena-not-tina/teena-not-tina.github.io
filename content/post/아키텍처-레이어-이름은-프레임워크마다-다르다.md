---
title: "아키텍처 레이어 이름은 프레임워크마다 다르다"
date: 2026-07-21
tags: ["architecture", "backend"]
categories: ["Architecture"]
---

같은 책임도 프로젝트와 아키텍처에 따라 이름이 다르다. 이름을 외우기보다 해당 코드가 맡은 일을 확인하는 편이 정확하다.

| 책임 | 헥사고날 구조 | 클린 아키텍처 | 흔한 웹 프레임워크 이름 |
| --- | --- | --- | --- |
| HTTP 요청 처리 | inbound adapter | interface adapter | controller 또는 router |
| 업무 흐름 조율 | application | use case | service 또는 manager |
| 핵심 규칙 | domain | entity | domain service |
| DB/API 연결 | outbound adapter | framework/driver | repository 또는 client |
| 요청·응답 자료 모양 | adapter의 schema | DTO | schema 또는 model |

`service`가 특히 혼란스러운 이유는 어떤 팀에서는 업무 흐름 전체를 뜻하고, 다른 팀에서는 특정 엔티티에 묶이지 않는 순수 도메인 규칙을 뜻하기 때문이다.

따라서 새 레이어를 추가할 때는 이름보다 경계를 문서화한다. 어떤 입력을 받고, 어떤 규칙을 소유하며, 무엇에 의존할 수 있는지를 정하면 서로 다른 명명 규칙도 이해하기 쉬워진다.
