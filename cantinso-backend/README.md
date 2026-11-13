# CanTinSo Backend — NestJS + PostgreSQL

## Stack
- NestJS 11, TypeScript
- PostgreSQL 16, Prisma ORM 6
- JWT Bearer authentication, bcrypt password hashing
- DTO validation, Helmet, CORS, school-level data isolation

## Run locally
```bash
cp .env.example .env
# Change JWT_SECRET before using outside local development
docker compose up -d
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run prisma:seed
npm run start:dev
```
API base URL: `http://localhost:3000/api/v1`

Seed account (local development only): `admin@cantinso.local` / `ChangeMe123!`. Change or remove this account before deployment.

## Endpoints
| Method | Endpoint | Description |
|---|---|---|
| POST | `/auth/login` | Login, returns JWT |
| GET | `/students` | Search/filter/paginate students and summary |
| POST | `/students` | Create student |
| PUT | `/students/:id` | Update student |
| DELETE | `/students/:id` | Delete student |

Student list query params: `search`, `className`, `status` (`Đang học` / `Tạm nghỉ`), `page`, `limit`.

All `/students` endpoints require `Authorization: Bearer <accessToken>`. Each request is scoped to the authenticated user's `schoolId`; users without an assigned school cannot access student records.

## Frontend contract
Student fields intentionally follow `StudentManagement.tsx`: `id`, `code`, `name`, `className`, `gender`, `birthDate`, `guardian`, `phone`, `status`. API list response is `{ data, meta, classes }`.

## Domain foundation
The Prisma schema also includes suppliers, ingredients, inventory lots, dishes, meal plans, food-safety checks and trace events. These are database foundations; corresponding CRUD/workflow modules are the next implementation phase.

## Production checklist
- Replace the development JWT secret and seed credentials.
- Configure TLS, restricted CORS, database backups and secret management.
- Add role/permission guards for each operational workflow.
- Review retention/access policies for student and guardian personal data.
- Add audit logs and automated tests before production rollout.
