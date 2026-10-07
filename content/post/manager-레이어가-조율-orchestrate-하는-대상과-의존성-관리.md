---
title: "Manager 레이어가 조율(Orchestrate)하는 대상과 의존성 관리"
date: 2026-08-30
tags: ["architecture", "orchestration", "dependency", "error-handling", "backend"]
categories: ["Backend"]
---
**한 줄** — Manager는 단순히 여러 부품을 호출하는 것이 아니라, **"A가 성공해야만 B를 실행한다"**, "C가 실패하면 A의 DB 저장을 취소(Rollback/보상 트랜잭션)한다"와 같은 선후 관계와 에러 제어를 전담하는 비즈니스 흐름의 총괄 지휘자다.
### 1. Manager가 Directing(조율)하는 5대 대상
Manager는 DB뿐만 아니라 시스템 안팎의 다양한 모듈을 조합하여 하나의 시나리오를 완성한다.
```plain text
                  ┌─── 1. Handlers (DB CRUD & Transaction)
                  ├─── 2. Validators / Domain (검증 & 비즈니스 계산)
Manager (지휘자) ──┼─── 3. External API (결제, LLM, 외부 통신)
                  ├─── 4. Cache & Storage (Redis, S3 파일 업로드)
                  └─── 5. Async Task & Event (Celery, 이메일/슬랙 발송)
```
### 2. 조율 대상 간 선후 관계/의존성이 발생하는 3가지 패턴
작업 B를 하려면 반드시 작업 A가 성공해야 하거나, 중간 실패 시 복구 작업이 필요한 경우 Manager는 다음 패턴으로 의존성을 제어한다.
#### 패턴 A: 선 검증 / 조건부 실행 (Guard & Prerequisite)
> **"A(검증/조회)가 Pass되어야만 B(외부 호출/DB 저장)를 실행한다"**
- **시나리오:** 사용자가 AI 챗봇에게 질문을 보낼 때 (Quota 체크)
- **Manager의 조율 순서:**
	1. `UserHandler`로 유저 잔여 쿼터 조회
	2. `QuotaValidator`로 쿼터가 남아있는지 검증 \$\\rightarrow\$ **불통과 시 즉시 Exception 반환 (이후 단계 중단)**
	3. `LLM Client(External API)` 호출하여 답변 생성
	4. `UserHandler`로 차감된 쿼터 DB 업데이트
```python
# manager가 선후 관계를 제어하는 코드 구조
async def ask_chatbot(self, user_id: str, prompt: str):
    # 1. Prerequisite Check (선행 조건 검증)
    user = await self.user_handler.get_user(user_id)
    self.quota_validator.assert_has_quota(user)  # 실패 시 여기서 중단!

    # 2. Main Execution (외부 API)
    response = await self.llm_client.generate(prompt)

    # 3. Post-action (DB 반영)
    await self.user_handler.deduct_quota(user_id)
    return response
```
#### 패턴 B: 외부 스토리지/API 연동 후 DB 기록 (Resource First)
> **"외부 리소스(S3, 외부 서버) 생성이 성공해야만 DB에 그 결과(URL, Key)를 저장한다"**
- **시나리오:** 이미지 업로드 또는 외부 MCP 서버 연동 (`resource_manager.py` / `mcp_manager.py` 예시)
- **Manager의 조율 순서:**
	1. `S3 Storage Client`로 파일 업로드 실행 → S3 URL 획득
	2. 업로드 실패 시? DB 저장을 시작조차 하지 않고 에러 반환.
	3. 업로드 성공 시? `ImageHandler`를 통해 DB에 `image_url` 기록.
#### 패턴 C: 분산 트랜잭션과 보상 작업 (Saga Pattern / Rollback handling)
> **"DB 저장은 성공했는데, 이후 외부 API/이메일 발송이 실패하면 DB 작업을 어떻게 복구(Rollback)할 것인가?"**
DB 트랜잭션 밖에서 터지는 외부 API 에러는 DB의 `ROLLBACK` 명령어로 자동으로 취소되지 않는다. **Manager가 직접 에러를 catch하여 복구 로직을 지휘**해야 한다.
- **시나리오:** 결제 후 배송 요청
- **Manager의 조율 순서:**
	1. `OrderHandler`로 DB에 주문 데이터 저장 (PENDING)
	2. `Payment API(External)` 호출하여 카드 결제 요청
	3. **\[에러 발생\]** 결제 실패 시 → Manager의 `try-except` 블록이 실행되어 `OrderHandler.delete_order()` 또는 `status='FAILED'`로 변경하는 **보상 트랜잭션(Compensating Action)** 실행!
```python
async def process_payment(self, order_id: str):
    # 1. DB 상태 변경
    order = await self.order_handler.update_status(order_id, "PROCESSING")

    try:
        # 2. 외부 결제 API 호출 (의존적 작업)
        payment_result = await self.payment_client.pay(order.amount)
    except PaymentFailedException:
        # 3. 외부 작업 실패 시 Manager가 직접 상태를 복구/취소함!
        await self.order_handler.update_status(order_id, "CANCELLED")
        raise
```
### 3. 신입이 기억할 핵심 요약
✅
1. **Manager는 의존성 해결사다:** "A 결과가 B의 입력으로 들어가는 관계", "A가 성공해야만 B를 실행하는 선후 관계"를 관리하는 곳이 바로 Manager다.
2. **에러 파급 최소화:** 선행 단계(Validator, 외부 연결 테스트)가 실패하면 후속 단계(DB 저장, 큐 발행)가 실행되지 않도록 막아주는 가드(Guard) 역할을 한다.
3. **보상 트랜잭션:** DB 커밋 이후 외부 API(결제, 메일)가 실패했을 때, DB 데이터를 다시 취소/수정하는 복구 로직도 Manager가 담당한다.
