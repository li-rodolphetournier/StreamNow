SHELL := /bin/bash

.PHONY: install dev home home-build home-start docker-up docker-down format lint

install:
	npm install

dev:
	npm run dev

home:
	npm run home

home-build:
	npm run home:build

home-start:
	npm run home:start

docker-up:
	docker compose -f docker-compose.dev.yml up --build

docker-down:
	docker compose -f docker-compose.dev.yml down

lint:
	npm run lint

format:
	npx prettier --write .


