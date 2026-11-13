import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
const prisma = new PrismaClient();
async function main() {
 const schoolId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
 const passwordHash = await bcrypt.hash('ChangeMe123!', 12);
 await prisma.user.upsert({ where: { email: 'admin@cantinso.local' }, update: {}, create: { email: 'admin@cantinso.local', passwordHash, fullName: 'Quản trị hệ thống', role: 'SCHOOL_ADMIN', schoolId } });
 for (const name of ['1A1','2A1','2A2','3A1','4A1']) await prisma.classroom.upsert({ where: { schoolId_name_schoolYear: { schoolId, name, schoolYear: '2026-2027' } }, update: {}, create: { schoolId, name, schoolYear: '2026-2027' } });
 console.log('Seed completed. Demo account: admin@cantinso.local / ChangeMe123!');
}
main().finally(() => prisma.$disconnect());
