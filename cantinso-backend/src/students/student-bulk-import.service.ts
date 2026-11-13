import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
} from "@nestjs/common";
import AdmZip from "adm-zip";
import * as XLSX from "xlsx";
import { Gender, Prisma, StudentStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { AuthUser } from "../common/current-user.decorator";
import { HikvisionEnrollmentService } from "./hikvision-enrollment.service";

type ImportRow = {
  code: string; name: string; className: string; gender: Gender;
  birthDate: Date | null; guardian: string; phone: string; status: StudentStatus;
  image: Buffer;
};
type ResultRow = { code: string; name: string; status: string; message: string };

const normalizeHeader = (value: unknown) => String(value ?? "").trim().toLowerCase()
  .normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/[^a-z0-9]/g, "");

const aliases: Record<string, string> = {
  code: "code", mahocsinh: "code", studentcode: "code",
  name: "name", hoten: "name", hovaten: "name", studentname: "name",
  classname: "className", lop: "className", tenlop: "className",
  gender: "gender", gioitinh: "gender",
  birthdate: "birthDate", ngaysinh: "birthDate",
  guardian: "guardian", nguoigiamho: "guardian", phuhuynh: "guardian",
  phone: "phone", sodienthoai: "phone", dienthoai: "phone",
  status: "status", trangthai: "status",
};
const genderMap: Record<string, Gender> = { nam: "MALE", nu: "FEMALE", khac: "OTHER", male: "MALE", female: "FEMALE", other: "OTHER" };
const statusMap: Record<string, StudentStatus> = { danghoc: "ACTIVE", active: "ACTIVE", tamnghi: "PAUSED", paused: "PAUSED", dachuyentruong: "TRANSFERRED", transferred: "TRANSFERRED" };

@Injectable()
export class StudentBulkImportService {
  private readonly logger = new Logger(StudentBulkImportService.name);
  constructor(private readonly prisma: PrismaService, private readonly hik: HikvisionEnrollmentService) {}

  private parseDate(value: unknown): Date | null {
    if (value === undefined || value === null || value === "") return null;
    if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
    if (typeof value === "number") {
      const parts = XLSX.SSF.parse_date_code(value);
      if (parts) return new Date(Date.UTC(parts.y, parts.m - 1, parts.d));
    }
    const raw = String(value).trim();
    const vi = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
    const date = vi ? new Date(Date.UTC(Number(vi[3]), Number(vi[2]) - 1, Number(vi[1]))) : new Date(raw);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  private parseWorkbook(buffer: Buffer, images: Map<string, Buffer>): ImportRow[] {
    let workbook: XLSX.WorkBook;
    try { workbook = XLSX.read(buffer, { type: "buffer", cellDates: true }); }
    catch { throw new BadRequestException("Không đọc được Excel. Hãy dùng .xlsx hoặc .xls hợp lệ."); }
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    if (!sheet) throw new BadRequestException("Excel không có trang tính dữ liệu.");
    const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "", raw: false });
    if (!rawRows.length) throw new BadRequestException("Excel chưa có dòng học sinh.");
    if (rawRows.length > 1500) throw new BadRequestException("Mỗi lần chỉ nhập tối đa 1.500 học sinh (giới hạn thiết bị).");
    const seen = new Set<string>();
    const parsed: ImportRow[] = [];
    for (let index = 0; index < rawRows.length; index++) {
      const mapped: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(rawRows[index])) {
        const canonical = aliases[normalizeHeader(key)];
        if (canonical) mapped[canonical] = value;
      }
      const code = String(mapped.code ?? "").trim();
      const name = String(mapped.name ?? "").trim();
      const className = String(mapped.className ?? "").trim();
      const line = index + 2;
      if (!code || !name || !className) throw new BadRequestException(`Dòng ${line}: bắt buộc có Mã học sinh, Họ và tên, Lớp.`);
      if (code.length > 30 || !/^[A-Za-z0-9_-]+$/.test(code)) {
        throw new BadRequestException(`Dòng ${line}: mã học sinh chỉ gồm chữ/số/_/-, tối đa 30 ký tự để tương thích thiết bị.`);
      }
      const key = code.toLocaleLowerCase("vi");
      if (seen.has(key)) throw new BadRequestException(`Excel có mã học sinh bị lặp: ${code}.`);
      seen.add(key);
      const genderKey = normalizeHeader(mapped.gender || "Nam");
      const statusKey = normalizeHeader(mapped.status || "Đang học");
      const gender = genderMap[genderKey];
      const status = statusMap[statusKey];
      if (!gender) throw new BadRequestException(`Dòng ${line}: giới tính phải là Nam, Nữ hoặc Khác.`);
      if (!status) throw new BadRequestException(`Dòng ${line}: trạng thái phải là Đang học, Tạm nghỉ hoặc Đã chuyển trường.`);
      const birthDate = this.parseDate(mapped.birthDate);
      if (mapped.birthDate && !birthDate) throw new BadRequestException(`Dòng ${line}: ngày sinh không hợp lệ.`);
      const image = images.get(key);
      if (!image) throw new BadRequestException(`Thiếu ảnh ${code}.jpg trong ZIP.`);
      if (image.length > 200 * 1024) throw new BadRequestException(`Ảnh ${code}.jpg vượt quá 200 KB.`);
      if (image.length < 4 || image[0] !== 0xff || image[1] !== 0xd8 || image[2] !== 0xff) {
        throw new BadRequestException(`Ảnh ${code}.jpg không phải JPEG hợp lệ.`);
      }
      parsed.push({
        code, name, className, gender, status, birthDate,
        guardian: String(mapped.guardian ?? "").trim(),
        phone: String(mapped.phone ?? "").trim(), image,
      });
    }
    return parsed;
  }

  async importZip(user: AuthUser, file?: Express.Multer.File) {
    if (!user.schoolId) throw new ConflictException("Tài khoản chưa được gán trường.");
    if (!file?.buffer) throw new BadRequestException("Vui lòng chọn file ZIP.");
    if (file.size > 30 * 1024 * 1024) throw new BadRequestException("ZIP tối đa 30 MB.");
    let zip: AdmZip;
    try { zip = new AdmZip(file.buffer); } catch { throw new BadRequestException("File ZIP không hợp lệ."); }
    const entries = zip.getEntries().filter((entry) => !entry.isDirectory);
    let uncompressed = 0;
    for (const entry of entries) {
      uncompressed += entry.header.size;
      if (uncompressed > 60 * 1024 * 1024) throw new BadRequestException("Tổng dung lượng giải nén vượt quá 60 MB.");
    }
    const workbooks = entries.filter((e) => /\.(xlsx|xls)$/i.test(e.entryName));
    if (workbooks.length !== 1) throw new BadRequestException("ZIP phải chứa đúng một file Excel (.xlsx hoặc .xls).");
    const images = new Map<string, Buffer>();
    for (const entry of entries.filter((e) => /\.(jpe?g)$/i.test(e.entryName))) {
      const key = entry.entryName.split(/[\\/]/).pop()!.replace(/\.jpe?g$/i, "").toLocaleLowerCase("vi");
      if (images.has(key)) throw new BadRequestException(`Có nhiều ảnh trùng mã ${key} trong ZIP.`);
      images.set(key, entry.getData());
    }
    const rows = this.parseWorkbook(workbooks[0].getData(), images);
    const results: ResultRow[] = [];
    let imported = 0, skipped = 0, failed = 0, faceUploaded = 0;

    for (const row of rows) {
      let student: { id: string } | null = null;
      try {
        const deviceHasUser = await this.hik.userExists(row.code);
        student = await this.prisma.student.findFirst({
          where: { schoolId: user.schoolId, code: { equals: row.code, mode: "insensitive" } },
          select: { id: true },
        });
        let enrollment = student ? await this.prisma.hikvisionStudentEnrollment.findUnique({
          where: { deviceId_employeeNo: { deviceId: process.env.HIK_DEVICE_ID || "hik-main", employeeNo: row.code } },
        }) : null;

        if (deviceHasUser && (!enrollment || !enrollment.userCreatedAt)) {
          results.push({ code: row.code, name: row.name, status: "EXISTS_ON_DEVICE", message: "Mã đã tồn tại trên máy; không ghi đè thông tin hoặc ảnh." });
          skipped++;
          continue;
        }

        if (!student) {
          const classroom = await this.prisma.classroom.upsert({
            where: { schoolId_name_schoolYear: { schoolId: user.schoolId, name: row.className, schoolYear: "2026-2027" } },
            create: { schoolId: user.schoolId, name: row.className, schoolYear: "2026-2027" },
            update: {},
          });
          const created = await this.prisma.student.create({
            data: {
              schoolId: user.schoolId, code: row.code, name: row.name, classroomId: classroom.id,
              gender: row.gender, birthDate: row.birthDate, guardian: row.guardian || null,
              phone: row.phone || null, status: row.status,
            },
            select: { id: true },
          });
          student = created;
          imported++;
        }

        const deviceId = process.env.HIK_DEVICE_ID || "hik-main";
        enrollment = enrollment ?? await this.prisma.hikvisionStudentEnrollment.create({
          data: { schoolId: user.schoolId, studentId: student.id, deviceId, employeeNo: row.code },
        });

        if (!deviceHasUser && !enrollment.userCreatedAt) {
          await this.hik.createUser({ employeeNo: row.code, name: row.name, gender: row.gender });
          await this.prisma.hikvisionStudentEnrollment.update({
            where: { id: enrollment.id }, data: { userCreatedAt: new Date(), lastError: null },
          });
        }

        const latest = await this.prisma.hikvisionStudentEnrollment.findUnique({ where: { id: enrollment.id } });
        if (!latest?.faceUploadedAt) {
          await this.hik.uploadFace({
            employeeNo: row.code, name: row.name, gender: row.gender,
            birthDate: row.birthDate?.toISOString().slice(0, 10), image: row.image,
          });
          await this.prisma.hikvisionStudentEnrollment.update({
            where: { id: enrollment.id }, data: { faceUploadedAt: new Date(), lastError: null },
          });
          faceUploaded++;
        }
        results.push({ code: row.code, name: row.name, status: "SUCCESS", message: "Đã lưu học sinh và đồng bộ người dùng/ảnh khuôn mặt." });
      } catch (error) {
        failed++;
        const message = error instanceof Error ? error.message : "Lỗi không xác định";
        if (student) {
          const deviceId = process.env.HIK_DEVICE_ID || "hik-main";
          await this.prisma.hikvisionStudentEnrollment.updateMany({
            where: { schoolId: user.schoolId, studentId: student.id, deviceId },
            data: { lastError: message.slice(0, 1000) },
          }).catch(() => undefined);
        }
        this.logger.error(`Import ${row.code}: ${message}`);
        results.push({ code: row.code, name: row.name, status: "FAILED", message });
      }
    }
    return { summary: { total: rows.length, imported, faceUploaded, skipped, failed }, results };
  }

  async getTemplate() {
    const rows = [
      ["Mã học sinh", "Họ và tên", "Lớp", "Giới tính", "Ngày sinh", "Người giám hộ", "Số điện thoại", "Trạng thái"],
      ["HS001", "Nguyễn Văn A", "1A1", "Nam", "2019-01-15", "Nguyễn Thị B", "0900000000", "Đang học"],
    ];
    const sheet = XLSX.utils.aoa_to_sheet(rows);
    sheet["!cols"] = [{ wch: 18 }, { wch: 28 }, { wch: 12 }, { wch: 14 }, { wch: 16 }, { wch: 24 }, { wch: 18 }, { wch: 20 }];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, "HocSinh");
    return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
  }
}
