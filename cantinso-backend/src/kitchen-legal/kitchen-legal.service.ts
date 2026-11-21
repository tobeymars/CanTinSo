import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../common/current-user.decorator';

const categories = ['legal', 'people', 'facility', 'operations'];
const statuses = ['valid', 'expiring', 'missing', 'not_applicable'];
const applicability = ['required', 'conditional', 'recurring'];
const fileTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE = 8 * 1024 * 1024;

@Injectable()
export class KitchenLegalService {
  constructor(private readonly prisma: PrismaService) {}

  private manager(user: AuthUser) {
    return user.role === 'CENTRAL_KITCHEN' || user.role === 'SCHOOL_KITCHEN';
  }

  private async allowedKitchenIds(user: AuthUser): Promise<string[]> {
    if (this.manager(user)) {
      if (!user.kitchenId) throw new ForbiddenException('Tài khoản chưa được gán bếp.');
      const kitchen = await this.prisma.kitchen.findUnique({ where: { id: user.kitchenId }, select: { id: true, isActive: true } });
      if (!kitchen?.isActive) throw new ForbiddenException('Bếp không còn hoạt động.');
      return [kitchen.id];
    }
    if (user.role === 'SCHOOL_ADMIN') {
      if (!user.schoolId) throw new ForbiddenException('Tài khoản chưa được gán trường.');
      const kitchens = await this.prisma.kitchen.findMany({
        where: { OR: [{ schoolId: user.schoolId }, { schools: { some: { schoolId: user.schoolId, isActive: true, OR: [{ endsAt: null }, { endsAt: { gte: new Date() } }] } } }] },
        select: { id: true },
      });
      return kitchens.map(k => k.id);
    }
    if (user.role === 'UBND_ADMIN') {
      if (!user.wardId) throw new ForbiddenException('Tài khoản chưa được gán phường.');
      const kitchens = await this.prisma.kitchen.findMany({
        where: { wardId: user.wardId },
        select: { id: true },
      });
      return kitchens.map(k => k.id);
    }
    throw new ForbiddenException('Không có quyền xem hồ sơ bếp.');
  }

  private async scope(user: AuthUser, kitchenId: string, write = false) {
    if (write && !this.manager(user)) throw new ForbiddenException('Chỉ tài khoản bếp được chỉnh sửa hồ sơ.');
    const ids = await this.allowedKitchenIds(user);
    if (!ids.includes(kitchenId)) throw new ForbiddenException('Không có quyền truy cập hồ sơ của bếp này.');
  }

  private async getDocument(user: AuthUser, id: string, write = false) {
    const doc = await this.prisma.kitchenLegalDocument.findUnique({ where: { id }, include: { attachments: { select: { id: true, name: true, mimeType: true, size: true, createdAt: true } }, kitchen: { select: { id: true, name: true } }, events: { orderBy: { createdAt: 'desc' }, take: 30 } } });
    if (!doc) throw new NotFoundException('Không tìm thấy hồ sơ.');
    await this.scope(user, doc.kitchenId, write);
    return doc;
  }

  async list(user: AuthUser) {
    const ids = await this.allowedKitchenIds(user);
    return this.prisma.kitchenLegalDocument.findMany({
      where: { kitchenId: { in: ids } },
      include: { kitchen: { select: { id: true, name: true } }, attachments: { select: { id: true, name: true, mimeType: true, size: true, createdAt: true } } },
      orderBy: [{ updatedAt: 'desc' }],
    });
  }

  get(user: AuthUser, id: string) { return this.getDocument(user, id); }

  private validate(data: any) {
    if (!data || typeof data !== 'object') throw new BadRequestException('Dữ liệu hồ sơ không hợp lệ.');
    const title = typeof data.title === 'string' ? data.title.trim() : '';
    if (!title || title.length > 180) throw new BadRequestException('Tên hồ sơ phải có từ 1 đến 180 ký tự.');
    if (!categories.includes(data.category) || !statuses.includes(data.status) || !applicability.includes(data.applicability)) throw new BadRequestException('Nhóm hoặc trạng thái hồ sơ không hợp lệ.');
    const optional = (key: string, max: number) => {
      const value = data[key];
      if (value === null || value === undefined || value === '') return null;
      if (typeof value !== 'string' || value.length > max) throw new BadRequestException(`Trường ${key} không hợp lệ.`);
      return value.trim();
    };
    const date = (key: string) => {
      const value = optional(key, 10);
      if (!value) return null;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new BadRequestException('Ngày phải có định dạng YYYY-MM-DD.');
      const parsed = new Date(value + 'T00:00:00.000Z');
      if (Number.isNaN(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== value) throw new BadRequestException('Ngày không hợp lệ.');
      return parsed;
    };
    const issuedAt = date('issuedAt'), expiresAt = date('expiresAt');
    if (issuedAt && expiresAt && expiresAt < issuedAt) throw new BadRequestException('Ngày hết hạn không được trước ngày cấp.');
    return { title, category: data.category as string, status: data.status as string, applicability: data.applicability as string,
      documentNumber: optional('documentNumber', 100), issuer: optional('issuer', 180), issuedAt, expiresAt,
      publicSummary: optional('publicSummary', 650) ?? '', note: optional('note', 1200) ?? '' };
  }

  async create(user: AuthUser, body: any) {
    const kitchenId = user.kitchenId;
    if (!kitchenId) throw new ForbiddenException('Tài khoản chưa được gán bếp.');
    await this.scope(user, kitchenId, true);
    const values = this.validate(body);
    return this.prisma.kitchenLegalDocument.create({
      data: { ...values, kitchenId, createdById: user.sub, updatedById: user.sub,
        events: { create: { actorId: user.sub, action: 'CREATED' } } },
    });
  }

  async update(user: AuthUser, id: string, body: any) {
    await this.getDocument(user, id, true);
    const values = this.validate(body);
    return this.prisma.kitchenLegalDocument.update({
      where: { id }, data: { ...values, updatedById: user.sub, events: { create: { actorId: user.sub, action: 'UPDATED' } } },
    });
  }

  async remove(user: AuthUser, id: string) {
    await this.getDocument(user, id, true);
    await this.prisma.kitchenLegalDocument.delete({ where: { id } });
    return { success: true };
  }

  async addFile(user: AuthUser, id: string, body: any) {
    const doc = await this.getDocument(user, id, true);
    if (doc.attachments.length >= 8) throw new BadRequestException('Mỗi hồ sơ tối đa 8 tệp.');
    if (!body || typeof body.name !== 'string' || body.name.length > 255 || !body.name.trim() || !fileTypes.includes(body.mimeType) || typeof body.base64 !== 'string') throw new BadRequestException('Tệp đính kèm không hợp lệ.');
    if (body.base64.length > Math.ceil(MAX_FILE * 4 / 3) + 8 || !/^[A-Za-z0-9+/]+={0,2}$/.test(body.base64)) throw new BadRequestException('Dữ liệu tệp không hợp lệ hoặc vượt quá 8 MB.');
    const bytes = Buffer.from(body.base64, 'base64');
    if (!bytes.length || bytes.length > MAX_FILE) throw new BadRequestException('Tệp phải có dung lượng từ 1 byte đến 8 MB.');
    const pdf = bytes.subarray(0, 5).toString() === '%PDF-';
    const png = bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
    const jpg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
    const webp = bytes.subarray(0,4).toString() === 'RIFF' && bytes.subarray(8,12).toString() === 'WEBP';
    if (!(body.mimeType === 'application/pdf' && pdf || body.mimeType === 'image/png' && png || body.mimeType === 'image/jpeg' && jpg || body.mimeType === 'image/webp' && webp)) throw new BadRequestException('Định dạng nội dung tệp không khớp.');
    const attachment = await this.prisma.kitchenLegalAttachment.create({ data: { documentId: id, name: body.name.trim(), mimeType: body.mimeType, size: bytes.length, data: bytes }, select: { id: true, name: true, mimeType: true, size: true, createdAt: true } });
    await this.prisma.kitchenLegalEvent.create({ data: { documentId: id, actorId: user.sub, action: 'FILE_ADDED', details: { attachmentId: attachment.id, name: attachment.name } } });
    return attachment;
  }

  async file(user: AuthUser, id: string, fileId: string) {
    await this.getDocument(user, id);
    const attachment = await this.prisma.kitchenLegalAttachment.findFirst({ where: { id: fileId, documentId: id } });
    if (!attachment) throw new NotFoundException('Không tìm thấy tệp.');
    return { name: attachment.name, mimeType: attachment.mimeType, base64: Buffer.from(attachment.data).toString('base64') };
  }

  async removeFile(user: AuthUser, id: string, fileId: string) {
    await this.getDocument(user, id, true);
    const file = await this.prisma.kitchenLegalAttachment.findFirst({ where: { id: fileId, documentId: id }, select: { id: true, name: true } });
    if (!file) throw new NotFoundException('Không tìm thấy tệp.');
    await this.prisma.kitchenLegalAttachment.delete({ where: { id: fileId } });
    await this.prisma.kitchenLegalEvent.create({ data: { documentId: id, actorId: user.sub, action: 'FILE_REMOVED', details: { name: file.name } } });
    return { success: true };
  }
}
