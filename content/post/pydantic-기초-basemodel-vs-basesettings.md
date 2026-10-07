---
title: "Pydantic 기초 — BaseModel vs BaseSettings"
date: 2026-08-28
tags: ["python", "backend"]
categories: ["Python"]
---
> **한 줄** — Pydantic은 "데이터가 기대한 모양이 맞는지" 자동 검사·변환해주는 라이브러리. `BaseModel`은 요청/응답처럼 그때그때 다른 데이터용, `BaseSettings`는 환경변수처럼 배포 시 고정되는 데이터용 — 검사 기능은 같고 **값을 어디서 자동으로 채워오냐**만 다르다.
## 왜 필요한가
파이썬은 원래 타입을 안 지켜도 돌아간다(`age = "스물다섯"`도 일단 안 터짐). Pydantic은 데이터가 **들어오는 순간** 타입·형식을 강제한다.
비유: 입국심사대. 여권(데이터)이 들어올 때 그 자리에서 검사하고, 아니면 바로 돌려보낸다(에러). 통과한 데이터만 들여보내니 이후 코드는 값이 이상할 걱정을 안 해도 된다.
## BaseModel — 데이터가 요청/응답으로 옴
```python
# schema/user_schema.py
class SendVerificationEmailRequest(BaseModel):
    email: EmailStr
```
누가 명시적으로 값을 넣어줘야 한다 — FastAPI가 HTTP 요청 본문을 파싱해서 채우거나, 코드에서 직접 만든다. `EmailStr`은 이메일 형식이 아니면 자동으로 걸러주는 Pydantic 특수 타입.
## BaseSettings — 데이터가 환경변수에서 저절로 옴
```python
# utils/settings.py
class JWTSettings(BaseSettings):
    secret_key: str = "..."
    class Config:
        env_prefix = "jwt_"

jwt_settings = JWTSettings()   # 인자를 하나도 안 줬는데 채워짐
```
`JWTSettings()`라고 괄호만 열었는데 `secret_key`가 채워진다 — 생성될 때 환경변수(`JWT_SECRET_KEY`)부터 뒤져보는 동작이 내장돼 있기 때문. `BaseModel`은 이런 자동 조회를 안 한다.
## 정리
<table fit-page-width="true" header-row="true">
<tr>
<td></td>
<td>쓰는 곳</td>
<td>데이터 출처</td>
<td>예</td>
</tr>
<tr>
<td>`BaseModel`</td>
<td>`schema/` 전부</td>
<td>HTTP 요청/응답 (매번 다름)</td>
<td>`UserCreateRequest`</td>
</tr>
<tr>
<td>`BaseSettings`</td>
<td>`utils/settings.py` 전부</td>
<td>환경변수 (배포 시 고정)</td>
<td>`JWTSettings`</td>
</tr>
</table>
## 신입이 기억할 핵심
> 둘 다 "검사"는 같다. `BaseSettings`만 **환경변수에서 자동으로 채워 넣는 능력**이 추가로 있다 — 그래서 요청 데이터엔 `BaseModel`, 설정값엔 `BaseSettings`를 쓴다.
