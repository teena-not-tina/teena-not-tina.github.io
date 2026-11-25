---
title: "Authentication과 Authorization은 어느 레이어에서 처리해야 할까?"
date: 2026-11-24
tags: ["architecture", "backend", "security", "authorization", "authentication"]
categories: ["Backend"]
---
**한 줄** — Authentication은 신원을 확인하고, Authorization은 접근 권한을 판단한다. 권한 검증의 위치는 정책의 책임과 필요한 데이터에 따라 결정해야 한다.

시스템 아키텍처를 설계하면서 Router가 HTTP 요청에 따라 실행할 Handler를 결정한다면, 인증과 인가 역시 Handler를 거쳐야 하는지 궁금해졌다.

### 1. 각 레이어의 책임

| Component | Responsibility |
|---|---|
| Router | HTTP Method와 URL에 따라 실행할 Endpoint 결정 |
| Middleware / Dependency | 요청의 공통 전처리 및 검증 |
| Handler / Controller | HTTP 요청 처리 및 Business Service 호출 |
| Business Service | 비즈니스 정책 검증 및 기능 수행 |
| Repository | 데이터 조회 및 저장 |

모든 기능이 Router → Handler → Module 구조를 따라야 하는 것은 아니다. Authentication은 Middleware 또는 Route Dependency에서 인증 모듈을 직접 호출해 Handler 실행 전에 처리할 수 있다. 전역 Middleware라면 라우팅보다 먼저 실행될 수도 있다.

### 2. Authentication vs. Authorization

- **Authentication (AuthN): Who are you?** JWT, Session, API Key 등의 인증 정보를 검증하여 요청자의 신원을 확인한다.
- **Authorization (AuthZ): What are you allowed to do?** 확인된 요청자가 특정 기능을 사용하거나 리소스에 접근할 권한이 있는지 판단한다.

쇼핑몰에서 CUSTOMER만 일반 주문 취소 API를 사용할 수 있다고 가정하자. SELLER가 유효한 JWT를 가지고 주문 취소 API를 호출했다면 Authentication은 성공한다. 그러나 CUSTOMER에게만 허용된 기능이므로 Authorization에서는 실패한다.

처음에는 CUSTOMER인지 확인하는 작업을 Authentication으로 분류했지만, Role을 기준으로 접근을 허용하는 것은 Authorization의 책임이다. 로그인 요구는 유효한 인증 정보가 있어야 한다는 조건이다.

### 3. Coarse-grained vs. Fine-grained Authorization

**Coarse-grained Authorization**은 특정 종류의 기능을 사용할 수 있는지 확인한다.

- CUSTOMER만 주문 취소 API를 사용할 수 있다.
- SELLER만 상품을 등록할 수 있다.
- ADMIN만 사용자 관리 기능에 접근할 수 있다.

**Fine-grained Authorization**은 특정 리소스에 대해 특정 행동을 수행할 수 있는지 확인한다.

- CUSTOMER는 자신이 구매한 주문만 취소할 수 있다.
- SELLER는 자신이 등록한 상품만 수정할 수 있다.
- 사용자는 자신에게 공유된 문서만 조회할 수 있다.

Alice와 Bob이 모두 CUSTOMER라 하더라도 Alice가 Bob의 주문을 취소할 수 있어서는 안 된다.

| Request | AuthN | Coarse AuthZ | Fine AuthZ |
|---|---|---|---|
| Alice가 자신의 주문을 취소 | Pass | Pass | Pass |
| Alice가 Bob의 주문을 취소 | Pass | Pass | Fail |
| SELLER가 일반 주문 취소 API 호출 | Pass | Fail | - |
| 인증되지 않은 사용자가 주문 취소 | Fail | - | - |

두 Authorization을 구분하는 기준은 DB 조회 여부나 Role 사용 여부가 아니라 **권한 정책의 적용 범위와 구체성**이다. 특정 팀에서의 Role을 검증한다면 Role 기반 정책이라도 Fine-grained일 수 있다.

### 4. 어느 레이어에서 검증해야 할까?

Authentication과 Coarse-grained Authorization은 Middleware 또는 Route Dependency에서 수행할 수 있다. Fine-grained Authorization은 실제 리소스의 소유권이나 접근 정책을 알아야 하므로 Business Service에서 별도의 Authorization Policy를 호출하는 방식으로 구성할 수 있다.

```text
HTTP Request
     ↓
   Router
     ↓
Authentication
     ↓
Coarse-grained Authorization
     ↓
   Handler / Controller
     ↓
Business Service / Manager
     ├── Repository (Resource 조회)
     ├── Authorization Policy (Fine-grained)
     └── Business Logic
```

이는 Route Dependency를 사용하는 예시이며, 모든 API에서 두 인가 검사를 별도로 구현해야 하는 것은 아니다. 하나의 Policy에서 함께 검증할 수도 있다.

FastAPI를 사용하는 경우의 단순화된 예시:

```python
@router.post("/orders/{order_id}/cancel")
async def cancel_order(
    order_id: int,
    user=Depends(require_customer),
):
    return await order_service.cancel_order(user, order_id)
```

여기서 require_customer는 먼저 인증된 사용자 정보를 얻은 후 CUSTOMER Role을 검사하는 Dependency라고 가정한다. Order Service는 대상 주문의 소유권과 취소 가능 상태를 별도로 검증한다.

### 5. Authorization을 Handler에만 구현하면?

HTTP API 외에도 Background Worker, CLI, MCP Server, AI Agent Tool Calling, Internal Service 등 Business Service를 호출하는 진입점은 다양하다.

권한 검증이 HTTP Handler에만 존재한다면 다른 진입점에서 정책을 우회할 가능성이 생긴다. 각 진입점에서 신뢰할 수 있는 요청자 Context를 확보하고, 실제 리소스 접근 시 필요한 권한 정책을 일관되게 적용해야 한다. 사용자 대신 실행되는 Agent의 권한도 LLM의 판단에 맡기지 않는다.

### 정리

처음에는 Router → Handler → Module이라는 구조를 모든 기능에 동일하게 적용해야 한다고 생각했다. 하지만 중요한 것은 정해진 순서가 아니라 각 컴포넌트의 책임과 의존 관계다.

Authentication은 신원을 확인하고, Authorization은 접근 권한을 판단하며, Business Service는 서비스의 실제 기능을 수행한다. 각 책임을 분리하면 정책을 독립적으로 테스트하고 여러 진입점에서 재사용할 수 있다.

이 글에서 Handler는 HTTP Controller, Service는 Use Case를 조율하는 Manager 역할로 사용했다. 프로젝트마다 명칭은 다를 수 있다.

다음 글: [Business Module은 어떻게 다른 모듈을 호출해야 할까?]({{< relref "business-module-orchestration.md" >}})
