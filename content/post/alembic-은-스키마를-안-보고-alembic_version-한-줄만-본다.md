---
title: "alembic 은 스키마를 안 보고 alembic_version 한 줄만 본다"
date: 2026-09-10
tags: ["alembic", "db"]
categories: ["Database"]
---
## 증상
로컬에서 테이블이 없다는 에러가 나는데 `alembic current` 는 head 라고 답한다. dev 에는 같은 테이블이 있다.
```javascript
relation "project_items" does not exist
```
## 원인
alembic 은 **실제 스키마를 조회하지 않는다.** DB 의 `alembic_version` 테이블에 적힌 리비전 이름 한 줄만 보고 판단한다. 그 이름이 실제보다 앞서 있으면 영원히 "할 일 없음" 이 된다.
```javascript
alembic_version = 'create_project_items'   "다 왔다"
실제 project_items 테이블                없음
```
## 컨테이너 환경에서 생길 수 있는 상황
컨테이너 이미지에 굽힌 마이그레이션 파일이 낡아서, 그 시절 체인에 없던 리비전을 건너뛴 채 head 를 찍었다. 이후 호스트에서 파일을 고쳐도 DB 기록은 그대로였다.
## 해결
```javascript
alembic stamp <더 이전 리비전>    기록만 되돌린다. SQL 은 실행하지 않는다
alembic upgrade head             그 위 리비전들을 실제로 적용한다
```
`stamp` 는 **기록을 고쳐 쓰는 명령**이다. "너 여기까지 온 걸로 하자" 라고 값만 바꾼다. 그래서 실제 스키마와 기록이 어긋난 것을 알고 있을 때만 쓴다.
## 전제 — 확인 없이 stamp 하면 깨진다
되돌린 구간의 리비전이 **두 번 돌아도 안전해야 한다.** 예를 들어 다시 도는 리비전이 enum 값 추가였고 `ADD VALUE IF NOT EXISTS` 라서 괜찮았다. `create_table` 처럼 두 번째 실행이 실패하는 것이 섞여 있으면 stamp 위치를 그보다 뒤로 잡아야 한다.
## 일반화
**판정하는 근거와 실제 상태가 다른 곳에 있으면 둘은 언젠가 갈린다.** 갈렸을 때 무엇이 근거인지 알아야 고칠 수 있다. alembic 의 근거는 스키마가 아니라 `alembic_version` 한 줄이다.
부수 교훈: 코드가 이미지에 굽히는 서비스에서는 호스트 파일을 고쳐도 컨테이너가 안 바뀐다. 진단할 때 컨테이너 안 파일을 직접 확인한다.
