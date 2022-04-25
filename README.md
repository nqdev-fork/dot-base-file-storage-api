# File Storage API
API submit files using multipart forms and statically serve them afterwards.

[![GitHub release (latest by date)](https://img.shields.io/github/v/release/dot-base/file-storage-api)](https://github.com/dot-base/file-storage-api/releases)


## Quick Nav
1. [Production Deployment](#Production-Deployment)
1. [Configuration](#Configuration)
1. [Contributing](#Contributing)

## Production Deployment
Want a File Storage API of your own? The easiest way is to deploy our docker container. Just follow the steps below to get started.

[![Docker Build Status](https://img.shields.io/badge/We%20love-Docker-blue?style=flat&logo=Docker)](https://github.com/orgs/dot-base/packages)


### Requirements
- [Docker Engine >= v1.13](https://www.docker.com/get-started)


### Deployment
1. Set the `DOMAIN` environment variable. e.g.:
    ```
    export DOMAIN=localhost:3000 // or
    export DOMAIN=yourdomain.com
    ```
1. Start the container with a single command
    ```
    docker run --name file-storage-api -p 3000:3000 -d ghcr.io/dot-base/file-storage-api:latest
    ```
1. Done and dusted 🎉. The File Storage API is available on port 3000.

## Configuration

| Variable Name | Default | Example |
| --- | --- | --- |
| DOMAIN | - | yourdomain.com |

## Contributing

This project is written in Typescript. For an introduction into the language and best practices see the [typescript documentation](https://www.typescriptlang.org/docs/home.html).

You will need `docker`, `git`, `jq` and `openssl`. Checkout a local copy of this repository, `cd` into it and run:
```bash
./launch-stack.sh
```
Follow the steps on the screen.

By default the server is available at http://localhost:3000.

Go and mix up some code 👩‍💻. The server will reload automatically once you save. Remember to keep an eye on the console.
