import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Gender, Prisma, StudentStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../common/current-user.decorator';
import { CreateStudentDto } from './student.dto';
const genderMap: Record<string, Gender> = { Nam: 'MALE', 'Nữ': 'FEMALE', 'Khác': 'OTHER' };
const statusMap: Record<string, StudentStatus> = { 'Đang học': 'ACTIVE', 'Tạm nghỉ': 'PAUSED', 'Đã chuyển trường': 'TRANSFERRED' };
const toView = (s: any) => ({ id: s.id, code: s.code, name: s.name, className: s.classroom?.name ?? '', faceRegistered: Boolean(s.hikvisionEnrollments?.some((e: any) => e.faceUploadedAt)), gender: s.gender === 'MALE' ? 'Nam' : s.gender === 'FEMALE' ? 'Nữ' : 'Khác', birthDate: s.birthDate?.toISOString().slice(0,10) ?? '', guardian: s.guardian ?? '', phone: s.phone ?? '', status: s.status === 'ACTIVE' ? 'Đang học' : s.status === 'PAUSED' ? 'Tạm nghỉ' : 'Đã chuyển trường', createdAt: s.createdAt, updatedAt: s.updatedAt });
@Injectable()
export class StudentsService {
 constructor(private prisma: PrismaService) {}
 private school(user: AuthUser) { if (!user.schoolId) throw new ConflictException('Tài khoản chưa được gán trường'); return user.schoolId; }
 async list(user: AuthUser, q: { search?: string; className?: string; status?: string; page?: number; limit?: number }) {
  const schoolId = this.school(user); const page = Math.max(1, Number(q.page) || 1); const limit = Math.min(100, Math.max(1, Number(q.limit) || 100));
  const where: Prisma.StudentWhereInput = { schoolId, ...(q.search ? { OR: [{ code: { contains: q.search, mode: 'insensitive' } }, { name: { contains: q.search, mode: 'insensitive' } }, { guardian: { contains: q.search, mode: 'insensitive' } }] } : {}), ...(q.className ? { classroom: { name: q.className } } : {}), ...(q.status && statusMap[q.status] ? { status: statusMap[q.status] } : {}) };
  const [rows,total,active,paused,classes] = await this.prisma.$transaction([this.prisma.student.findMany({ where, include: { classroom: true, hikvisionEnrollments: { where: { deviceId: process.env.HIK_DEVICE_ID || 'hik-main' }, select: { faceUploadedAt: true } } }, orderBy: { createdAt: 'desc' }, skip: (page-1)*limit, take: limit }), this.prisma.student.count({ where }), this.prisma.student.count({ where: { schoolId, status: 'ACTIVE' } }), this.prisma.student.count({ where: { schoolId, status: 'PAUSED' } }), this.prisma.classroom.findMany({ where: { schoolId }, select: { name: true }, orderBy: { name: 'asc' } })]);
  return { data: rows.map(toView), meta: { page, limit, total, totalPages: Math.ceil(total/limit), active, paused, classCount: classes.length }, classes: classes.map(c => c.name) };
 }
 async create(user: AuthUser, dto: CreateStudentDto) {
  const schoolId = this.school(user); const code = dto.code.trim();
  if (await this.prisma.student.findFirst({ where: { schoolId, code: { equals: code, mode: 'insensitive' } } })) throw new ConflictException('Mã học sinh đã tồn tại');
  const classroom = await this.prisma.classroom.upsert({ where: { schoolId_name_schoolYear: { schoolId, name: dto.className.trim(), schoolYear: '2026-2027' } }, create: { schoolId, name: dto.className.trim(), schoolYear: '2026-2027' }, update: {} });
  const row = await this.prisma.student.create({ data: { schoolId, code, name: dto.name.trim(), classroomId: classroom.id, gender: genderMap[dto.gender], birthDate: dto.birthDate ? new Date(dto.birthDate) : null, guardian: dto.guardian?.trim(), phone: dto.phone?.trim(), status: statusMap[dto.status] }, include: { classroom: true, hikvisionEnrollments: { where: { deviceId: process.env.HIK_DEVICE_ID || 'hik-main' }, select: { faceUploadedAt: true } } } });
  return toView(row);
 }
 async update(user: AuthUser, id: string, dto: CreateStudentDto) {
  const schoolId = this.school(user); const existing = await this.prisma.student.findFirst({ where: { id, schoolId } }); if (!existing) throw new NotFoundException('Không tìm thấy học sinh');
  const duplicate = await this.prisma.student.findFirst({ where: { schoolId, code: { equals: dto.code.trim(), mode: 'insensitive' }, NOT: { id } } }); if (duplicate) throw new ConflictException('Mã học sinh đã tồn tại');
  const classroom = await this.prisma.classroom.upsert({ where: { schoolId_name_schoolYear: { schoolId, name: dto.className.trim(), schoolYear: '2026-2027' } }, create: { schoolId, name: dto.className.trim(), schoolYear: '2026-2027' }, update: {} });
  const row = await this.prisma.student.update({ where: { id }, data: { code: dto.code.trim(), name: dto.name.trim(), classroomId: classroom.id, gender: genderMap[dto.gender], birthDate: dto.birthDate ? new Date(dto.birthDate) : null, guardian: dto.guardian?.trim(), phone: dto.phone?.trim(), status: statusMap[dto.status] }, include: { classroom: true, hikvisionEnrollments: { where: { deviceId: process.env.HIK_DEVICE_ID || 'hik-main' }, select: { faceUploadedAt: true } } }); return toView(row);
 }
 async remove(user: AuthUser, id: string) { const schoolId = this.school(user); const result = await this.prisma.student.deleteMany({ where: { id, schoolId } }); if (!result.count) throw new NotFoundException('Không tìm thấy học sinh'); return { success: true }; }
}
