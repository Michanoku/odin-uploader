# Node Express Template

A clean, minimal **Node.js + Express** starter template for building web applications, with optional PostgreSQL and authentication branches.

---

## Available Branches

This repository contains multiple starting points depending on your needs:

### `main`

A lightweight Express template featuring:

* Express server setup
* EJS templating
* MVC-inspired structure
* Helmet security middleware
* Compression
* Morgan logging
* Error handling
* Jest + Supertest testing setup
* ESLint configuration

---

### `postgres`

Extends the base template with PostgreSQL and Prisma.

Additional features:

* Prisma ORM setup
* PostgreSQL configuration
* Environment-based database configuration
* Prisma migrations
* Prisma Client integration

---

### `full-stack`

Extends the PostgreSQL branch with authentication and session management.

Additional features:

* Passport authentication
* Local username/password strategy
* Bcrypt password hashing
* Express-session configuration
* Prisma session storage
* Login and registration pages (EJS)
* Request validation with Express Validator
* Protected route examples
* Authentication integration tests

---

## Features

### Core Features

* Express server setup
* EJS templating engine
* MVC-inspired structure
* Environment variable support with dotenv
* Helmet security middleware
* Response compression
* Morgan request logging
* Error handling
* ESLint
* Jest + Supertest testing

### Additional Features by Branch

| Feature                      | main | postgres | full-stack |
| ---------------------------- | ---- | -------- | ---------- |
| Express                      | ✓    | ✓        | ✓          |
| EJS                          | ✓    | ✓        | ✓          |
| Jest + Supertest             | ✓    | ✓        | ✓          |
| PostgreSQL                   |      | ✓        | ✓          |
| Prisma ORM                   |      | ✓        | ✓          |
| Sessions                     |      |          | ✓          |
| Passport Authentication      |      |          | ✓          |
| Password Hashing             |      |          | ✓          |
| Registration/Login Templates |      |          | ✓          |

---

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Create Environment Variables

```env
NODE_ENV=development
```

Additional variables may be required depending on the branch you are using.

### 3. Run the Application

Development:

```bash
npm run dev
```

Production:

```bash
npm start
```

---

## Testing

Run tests:

```bash
npm test
```

Uses:

* Jest
* Supertest

---

## Linting

```bash
npm run lint
```

---

## Scripts

```bash
npm run dev
npm start
npm run lint
npm test
```

---

## License

MIT

---

## Purpose

This template is designed for:

* Learning Express fundamentals
* Learning PostgreSQL and Prisma
* Learning authentication with Passport
* Quickly bootstrapping new projects
* Serving as a reusable starting point
