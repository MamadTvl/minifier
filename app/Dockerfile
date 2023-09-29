###################
# BUILD FOR LOCAL DEVELOPMENT
###################

FROM node:18-alpine As development

WORKDIR /usr/src/app
ENV NODE_ENV DEVELOPMENT

COPY --chown=node:node package*.json ./
COPY --chown=node:node yarn.lock ./

RUN yarn

COPY --chown=node:node . .

USER backend

###################
# BUILD FOR PRODUCTION
###################

FROM node:18-alpine As build

WORKDIR /usr/src/app

COPY --chown=backend:backend package*.json ./


COPY --chown=backend:backend --from=development /usr/src/app/node_modules ./node_modules

COPY --chown=backend:backend . .


ENV NODE_ENV production

RUN yarn build && yarn install --production --ignore-scripts --prefer-offline
USER backend

###################
# PRODUCTION
###################

FROM node:18-alpine As production
RUN npm install -g uglify-js sharp-cli minify

WORKDIR /app

COPY --chown=backend:backend --from=build /usr/src/app/package.json ./package.json
COPY --chown=backend:backend --from=build /usr/src/app/node_modules ./node_modules
COPY --chown=backend:backend --from=build /usr/src/app/dist ./dist

CMD ["node" ,"dist/main.js"] 