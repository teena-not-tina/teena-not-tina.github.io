---
title: "Business Module은 어떻게 다른 모듈을 호출해야 할까?"
date: 2026-11-24
tags: ["architecture", "backend", "orchestration", "dependency", "http"]
categories: ["Backend"]
---
**한 줄** — 하나의 Use Case를 누가 책임지는지 먼저 정하고, 필요한 모듈을 조합해야 한다. 모든 모듈을 직선적인 호출 흐름으로 연결할 필요는 없다.

[이전 글]({{< relref "authentication-authorization-layer-responsibility.md" >}})에서 Authentication과 Authorization의 책임을 구분했다. 이번에는 하나의 API가 여러 도메인의 기능을 필요로 할 때 전체 실행 흐름을 누가 관리해야 하는지 주문 취소를 예시로 생각해 보았다.

### 1. Business Requirements

`POST /orders/1001/cancel`

| 요구사항 | 담당 영역 |
|---|---|
| 로그인한 사용자만 주문 취소 가능 | Authentication 요구 |
| CUSTOMER만 일반 주문 취소 API 사용 가능 | Coarse-grained Authorization |
| 자신이 구매한 주문만 취소 가능 | Fine-grained Authorization |
| 배송이 시작된 주문은 취소 불가 | Business Rule |
| 결제된 주문은 환불해야 함 | Business Rule |
| 주문 취소 시 상품 재고를 복구해야 함 | Business Rule |

### 2. Business Rule vs. Business Logic

- **Business Rule: What must happen?** 서비스가 준수해야 하는 정책과 조건.
- **Business Logic: How does it happen?** 해당 정책을 실제로 수행하는 로직.

| Business Rule | Business Logic |
|---|---|
| 배송이 시작된 주문은 취소할 수 없다 | 주문 상태를 조회하고 검증한다 |
| 결제된 주문은 환불해야 한다 | Payment Module을 호출하여 환불한다 |
| 주문 취소 시 재고를 복구해야 한다 | Inventory Module을 호출하여 재고를 갱신한다 |

재고를 복구해야 한다는 요구사항 자체는 Business Rule이고, 실제 재고 수량을 갱신하는 구현은 Business Logic이다. 두 개념은 서로 배타적인 것이 아니라 정책과 그 구현이라는 관점에서 구분한 것이다.

사용자에게 특정 작업을 수행할 권한이 있더라도 현재 비즈니스 상태에서 작업이 유효하지 않을 수 있다. 자신의 주문을 취소할 권한이 있지만 배송이 시작되었다면 취소할 수 없는 경우다.

### 3. 어떤 모듈이 전체 흐름을 관리할까?

처음에는 Router → Authentication → Handler → Authorization → Repository → Inventory Module → Order Module → Payment Module처럼 필요한 모듈을 하나의 직선적인 호출 흐름으로 연결하려고 했다.

하지만 Repository가 Inventory Module을 호출해야 하는 이유가 불명확하고, 모듈 간 의존 관계가 복잡해진다.

먼저 고려해야 할 것은 API의 핵심 목적이다. 주문 취소 API의 목적은 결제나 재고 관리 자체가 아니라 주문 취소다.

따라서 Order Service 또는 별도의 CancelOrderUseCase(Manager)가 전체 흐름을 관리하고 필요한 모듈을 호출할 수 있다.

```text
Order Handler / Controller
          ↓
Order Service / CancelOrderUseCase
          ├── Order Repository ── Database
          ├── Authorization Policy
          ├── Payment Service ── Payment API
          └── Inventory Service ── Inventory Repository
```

이처럼 여러 모듈을 조합하여 하나의 비즈니스 작업을 수행하는 것을 **Orchestration**이라고 한다.

Payment Service는 환불 처리에 집중하고, Inventory Service는 재고 관리에 집중한다. 각 모듈이 전체 주문 취소 시나리오를 알 필요는 없다.

### 4. Request Execution Flow

Alice가 자신의 결제 완료 주문을 취소한다고 가정한다.

1. Router에서 요청을 처리할 Endpoint를 찾는다.
2. Authentication에서 Alice의 신원을 확인한다.
3. Coarse-grained Authorization에서 CUSTOMER Role을 검증한다.
4. Order Handler가 Order Service를 호출한다.
5. Order Repository를 통해 주문 정보를 조회한다.
6. Fine-grained Authorization에서 주문의 소유권을 검증한다.
7. 주문 상태가 취소 가능한 상태인지 확인한다.
8. Payment Service를 호출하여 환불한다.
9. Inventory Service를 호출하여 재고를 복구한다.
10. Order Repository를 통해 주문 상태를 CANCELLED로 변경한다.
11. Handler가 HTTP Response를 반환한다.

```python
class OrderService:
    async def cancel_order(self, user, order_id):
        order = await order_repository.get(order_id)
        if order is None:
            raise OrderNotFound()

        authorization.check_ownership(user, order)

        if order.status not in {"PENDING", "PAID"}:
            raise OrderCancellationConflict()

        if order.status == "PAID":
            await payment_service.refund(order.payment_id)

        await inventory_service.restore(order.items)
        await order_repository.update_status(order_id, "CANCELLED")
```

위 코드는 모든 작업이 성공하는 Happy Path를 설명하기 위한 단순화된 예시다. PENDING과 PAID만 취소할 수 있고 주문 시 재고를 차감한다는 가정을 사용했다. 실제 구현에서는 동시 요청, 상태 전이, 중복 환불 방지, 실패 복구 등의 설계가 필요하다.

Repository는 Business Service에 의해 호출되며 다른 Business Module의 실행 순서를 관리하지 않는다. Repository의 책임은 데이터 접근이고, Service 또는 Use Case의 책임은 비즈니스 흐름을 관리하는 것이다.

### 5. 실패 원인에 따른 HTTP Status Code

| Status Code | 실패 원인 |
|---|---|
| 401 Unauthorized | 유효한 인증 정보가 없음 |
| 403 Forbidden | 주문 취소 기능 또는 대상 주문에 대한 권한이 없음 |
| 404 Not Found | 대상 주문이 존재하지 않음 |
| 409 Conflict | 현재 주문 상태와 요청한 작업이 충돌함 |

처음에는 이미 배송이 시작된 주문을 취소하려는 요청에 409와 404 중 무엇을 반환해야 할지 고민했다.

이 상황에서는 **409 Conflict**가 자연스럽다. Authentication과 Authorization은 성공했고 리소스도 존재하지만, 현재 리소스의 상태가 요청한 작업과 충돌하기 때문이다.

다른 사용자의 주문에 접근한 경우에는 리소스의 존재 여부를 노출하지 않기 위해 403 대신 404를 반환하는 정책을 적용할 수도 있다.

### 6. Happy Path만으로 충분할까?

만약 외부 결제사를 통한 50,000원 환불에는 성공했지만 재고 복구 과정에서 Database Timeout이 발생한다면?

| 작업 | 결과 |
|---|---|
| Payment Refund | SUCCESS |
| Inventory Restoration | FAILED |
| Order Status Update | NOT EXECUTED (PAID) |

각 모듈의 책임을 분리했더라도 전체 비즈니스 작업의 데이터 정합성이 자동으로 보장되는 것은 아니다.

다음 학습에서는 외부 API가 포함된 상황에서 DB Rollback으로 해결할 수 있는 범위, 고객이 재시도할 때 발생할 중복 처리, 실패한 작업의 상태와 복구 방법을 살펴보려고 한다. Transaction, Idempotency, Retry, Saga Pattern은 아직 남아 있는 학습 주제다.

### 정리

Business Module을 설계할 때 필요한 기능들을 호출 순서대로 연결하는 것보다 하나의 Use Case를 누가 책임지고, 각 모듈은 어떤 역할에 집중해야 하는지 정의하는 것이 중요하다. 모듈의 책임과 실행 흐름의 책임을 분리하면 비즈니스 정책과 의존 관계를 명확하게 관리할 수 있다.
