
all: up

# build, create start and attach containers
up:
	docker compose up --build

# stops and deletes containers - external networks and volumes are NOT removed
down:
	docker compose down

# stops containers - volume network config retain state, container ram is lost
stop:
	docker compose stop

# start stopped but existing containers
start:
	docker compose start

dev:
	docker compose -f compose.dev.yaml up --build

logs:
	docker compose logs

ps:
	docker compose ps -a

clean:
	docker compose down --rmi all


fclean: clean
	docker compose down -v

# removes all unused build cache, docker images and docker volumes
prune:
	docker builder prune -af
	docker image prune -af
	docker volume prune -af

re: fclean all

.PHONY: all up down logs clean fclean re
