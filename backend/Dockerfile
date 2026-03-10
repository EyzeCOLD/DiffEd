# Multi-stage build, for a smaller final image
FROM node:25-alpine AS setup

# INSTALL
COPY /shared/package*.json /shared/
WORKDIR /shared
RUN npm install

COPY /backend/package*.json /backend/
WORKDIR /backend
RUN npm install

# BUILD
COPY /shared /shared/
COPY /backend /backend/

WORKDIR /backend
RUN npm run build

# CLEAN
FROM node:25-alpine

RUN apk add --no-cache bash

COPY --from=setup /backend/package*.json /backend/
COPY --from=setup /backend/dist /backend/dist/
WORKDIR /backend
RUN npm install --omit=dev

# HOST
# CMD ["npm", "run", "server"]

EXPOSE 3000
