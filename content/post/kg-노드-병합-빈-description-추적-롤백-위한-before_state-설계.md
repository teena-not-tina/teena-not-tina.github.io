---
title: "데이터 병합을 되돌릴 수 있게 스냅샷을 설계하기"
date: 2026-08-14
tags: ["backend", "database", "design"]
categories: ["Backend"]
---

두 레코드를 하나로 합치는 기능을 만들 때, 결과만 저장하면 나중에 취소할 방법이 없다. 병합 전 사라질 정보를 명시적으로 기록해야 한다.

## 예시 데이터

아래 값은 설명을 위해 만든 가상 데이터다.

```json
{
  "records": [
    {"id": "record-a", "name": "Green Tea", "description": "Unsweetened tea"},
    {"id": "record-b", "name": "Green Tea Drink", "description": "Tea beverage"}
  ],
  "relation": {"from": "record-b", "to": "record-a", "type": "similar_to"}
}
```

두 항목을 `record-a`로 합치면 `record-b`와 관련 관계가 사라질 수 있다. 삭제된 ID만 남겨서는 이름, 설명, 연결을 복구하지 못한다.

## 되돌리기에 필요한 기록

```json
{
  "before": {
    "records": [
      {"id": "record-a", "name": "Green Tea", "description": "Unsweetened tea"},
      {"id": "record-b", "name": "Green Tea Drink", "description": "Tea beverage"}
    ],
    "relations": [
      {"from": "record-b", "to": "record-a", "type": "similar_to"}
    ]
  },
  "after": {"survivor_id": "record-a"}
}
```

복구에 필요한 필드와 연결을 병합 이벤트에 함께 저장한다. 스냅샷은 해당 변경과 원자적으로 기록하고, 복구 작업은 이미 처리한 이벤트를 다시 적용해도 결과가 중복되지 않도록 설계한다.

## 설명이 비어 있는 문제는 따로 다루기

병합 결과의 설명을 어떻게 만들지와, 취소를 위해 무엇을 보존할지는 서로 다른 문제다. 설명 생성 규칙을 바꾸더라도 복구 정보가 빠지지 않도록 저장 모델과 별도로 검토한다.

## 확인할 질문

- 병합 전 어떤 레코드와 관계가 사라지는가?
- 스냅샷이 변경 이벤트와 같은 트랜잭션에 저장되는가?
- 복구 후 원래의 ID와 연결을 재구성할 수 있는가?
- 부분 실패나 재시도에서 이벤트가 중복 적용되지 않는가?

핵심은 병합 알고리즘보다 복구 계약을 먼저 정하는 것이다. 이 글의 모든 레코드와 값은 공개용 합성 예시다.
