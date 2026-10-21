---
title: "Makefile 기초: target, recipe, dependency와 변수 평가"
date: 2026-08-11
tags: ["make", "infrastructure"]
categories: ["Infrastructure"]
---

Makefile은 명령을 짧은 이름으로 실행하고, 명령 사이의 의존성을 표현하는 도구다.

## target, recipe, dependency

```makefile
up-all: up-web up-worker

up-web:
	docker compose up -d web
```

`up-all`은 target, `up-web`은 dependency, 들여쓴 셸 명령은 recipe다. recipe 들여쓰기는 탭을 사용한다.

## 명령 별칭에는 PHONY

```makefile
.PHONY: up-all up-web
```

이 이름과 같은 파일이 있어도 make가 recipe를 건너뛰지 않도록 한다.

## 변수 평가 시점

```makefile
PROJECT = $(shell cat .project-name)
```

`=`는 변수를 사용할 때 계산하고, `:=`는 Makefile을 읽을 때 계산한다. 파일 읽기나 셸 실행처럼 비용이 있는 값은 꼭 필요한 target에서만 계산되도록 평가 시점을 정한다.

## 안전하게 확인하기

```sh
make -n up-web
```

`-n`은 명령을 실행하지 않고 실행 계획만 출력한다. target을 바꾸는 리팩터링 전후에 결과를 비교하면 동작이 의도치 않게 달라졌는지 확인할 수 있다.

`.NOTPARALLEL:`은 target 간 병렬 실행이 안전하지 않을 때 사용한다. 다만 파일 전체를 직렬화할 수 있으므로 실제 공유 자원 충돌이 있는 범위에만 적용한다.

[GNU Make 공식 매뉴얼](https://www.gnu.org/software/make/manual/make.html)
