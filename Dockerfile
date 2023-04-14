#Dockerfile for Metasnapper-server Back4App deployment

FROM node:16

WORKDIR /app

COPY ["package.json", "package-lock.json*", "./"]

RUN npm install

COPY . .

EXPOSE 5000

CMD [ "node", ".\echo-servers\cors-server" ]