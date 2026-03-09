# Chromadb Admin

Admin UI for the Chroma embedding database, built with Next.js

![screely-1696786774071](https://github.com/flanker/chromadb-admin/assets/109811/6d4369d4-d10c-49f7-8342-89849f271dbe)

## Links：

* GitHub Repo: [https://github.com/flanker/chromadb-admin](https://github.com/flanker/chromadb-admin)
* Chroma Official Website [https://docs.trychroma.com](https://docs.trychroma.com)

## Authentication Support

<img width="743" alt="image" src="https://github.com/flanker/chromadb-admin/assets/109811/c15cab9a-db80-4e2f-b732-a3bd5ef557da">

## Run Locally

First, start the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

THen, open [http://localhost:3001](http://localhost:3001) in your browser to see the app.

## Connect to local embedded Chroma

This UI now supports two connection modes:

- `Remote Server URL`: connect to an existing Chroma HTTP server.
- `Local Persistent Directory`: point the UI at a local Chroma data directory that contains `chroma.sqlite3`.

For local embedded mode, the app does **not** read SQLite/HNSW files directly. Instead, the server side starts a loopback-only bridge with:

```bash
chroma run --path /path/to/chroma-data
```

Requirements:

- The `chroma` CLI must be available in `PATH`, or set `CHROMA_CLI_BIN` to the full executable path.
- The selected directory must contain `chroma.sqlite3`.

This matches Chroma's current JavaScript/TypeScript client model, which talks to a server instead of opening the persisted directory directly.

## Run with Docker

Run

```bash
docker run -p 3001:3001 fengzhichao/chromadb-admin
```

and visit https://localhost:3001⁠ in the browser.

*NOTE*: Use `http://host.docker.internal:8000` for the connection string if you want to connect to a ChromaDB instance running locally.

## Build and Run with Docker locally

Build the Docker image:

```bash
docker build -t chromadb-admin .
```

Run the Docker container:

```bash
docker run -p 3001:3001 chromadb-admin
```

## Note

This is NOT an official Chroma project.

This project is licensed under the terms of the MIT license.
