# The Pirate Phone Backend

## Description

This is the server for the Pirate Phone project. It is a service that allows efficient handling of a large number of calls. The server is configured to secure its user base and performs monitoring on callers to prevent abuse.

## Installation

1. Install dependencies

```bash
npm install
```

2. Configure environment variables

-   Create a `.env` file at the root of the project
-   Add the following environment variables:

```
URI="mongodb://base:code@127.0.0.1:27018/database?authSource=admin"
ISDEV=true
```

3. Start the server

```bash
npm start
```
