# File Storage API
API submit files using multipart forms and statically serve them afterwards.

[![GitHub release (latest by date)](https://img.shields.io/github/v/release/dot-base/file-storage-api)](https://github.com/dot-base/file-storage-api/releases)


## Quick Nav
1. [Configuration](#Configuration)
1. [Setup for Local Development](#setup-for-local-development)


## Configuration

| Variable Name | Default | Example |
| --- | --- | --- |
| DOMAIN | localhost | dotbase.local |


## Setup for Local Development

The following steps need to be done only once. After that, you are ready to deploy a dot.base stack with very little commands for testing and development.

### Install prerequisits

You will need `bash`, `coreutils`, `docker`, `git`, `mkcert`, `openssl`, `sudo` and `watch`.

### Checkout this repository

Checkout the dot.base repository and move into it.

```bash
git clone git@github.com:dot-base/file-storage-api.git
cd file-storage-api
```

### Generate a Github personal access token

Some components of the dot.base stack are private. So you need to generate a Github personal access token for an account that has access to private dot.base repositories. The token needs the right to `write:packages/read:packages`. Go to https://github.com/settings/tokens/new?scopes=write:packages to generate it.

### Login with your access token

Use `YOUR_TOKEN` and `YOUR_GITHUB_USERNAME` to login to the container registry.

```bash
export CR_PAT=<YOUR_TOKEN>
echo $CR_PAT | docker login ghcr.io -u <YOUR_GITHUB_USERNAME> --password-stdin
```

### Deploy a stack with one service overlayed for development

In order to develop a service in its complete dot.base environment, you need to deploy the complete dot.base stack and replace the service you want develop with a dev overlay (a dev container containing the toolchains required for develpment). All dot.base services contain a `launch-stack.sh`.

❗ This requires root!

```bash
./launch-stack.sh
```

### Install service dependencies

```bash
docker exec -it $(docker ps -q -f name=dotbase_file-storage-api) npm install
```

### Start this service in development mode

```bash
docker exec -it $(docker ps -q -f name=dotbase_file-storage-api) npm start
```

### Watch your dot.base stack

```bash
./dot-base/dot-base.sh watch
```

### Observe logs
```bash
./dot-base/dot-base.sh logs
```

### Stats
```bash
docker stats
```

### Use it

Just checkout the dot.base instance on `https://${APP_HOSTNAME}`, e.g. https://dotbase.local

You need to accept the security exception once in your browser as we are using a self-signed certificate.

#### Add a user

You'll want to add a user in keycloak's `dotbase` realm via the Keycloak Admin panel. `https://${APP_HOSTNAME}/auth`, e.g. https://dotbase.local/auth

Username: `admin` Password: `password`.

### Stop the stack

```bash
./dot-base/dot-base.sh stop
```

### Cleanup 

To undo initial setup, run:

❗ This requires root!
```bash
./dot-base/dot-base.sh cleanup
```

To cleanup dockers cache of images and containers run the following.

❗ **Be sure to know what you are doing. This deletes on your whole docker instance, not only on the dot.base stack! This is destructive!**

```bash
docker images prune --all
docker container prune --all
```

To cleanup dockers volumes, which will reset all databases, including dot.base FHIR data and keycloak user data, run the following.

❗ **Be sure to know what you are doing. This deletes on your whole docker instance, not only on the dot.base stack! This is destructive!**

```bash
docker volumes prune --all
```

To cleanup all of dockers data, run the following.

❗ **Be sure to know what you are doing. This deletes on your whole docker instance, not only on the dot.base stack! This is destructive!**

```bash
docker system prune --all
```
