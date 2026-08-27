up:
	docker compose up -d

down:
	docker compose down

build:
	docker compose up -d --build

restart:
	docker compose restart

logs:
	docker compose logs -f app

shell:
	docker compose exec app bash

migrate:
	docker compose exec app php artisan migrate

migrate-fresh:
	docker compose exec app php artisan migrate:fresh --seed

seed:
	docker compose exec app php artisan db:seed

npm-dev:
	docker compose exec app npm run dev

artisan:
	docker compose exec app php artisan $(cmd)