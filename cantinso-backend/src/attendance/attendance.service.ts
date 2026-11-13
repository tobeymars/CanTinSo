import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { randomUUID } from "crypto";
import DigestFetch from "digest-fetch";
import { PrismaService } from "../prisma/prisma.service";

type HikEvent = {
  employeeNoString?: string;
  serialNo?: string | number;
  major?: number;
  minor?: number;
  time?: string;
  attendanceStatus?: string;
  currentVerifyMode?: string;
};

type HikResponse = {
  AcsEvent?: {
    InfoList?: HikEvent | HikEvent[];
    responseStatusStrg?: string;
    totalMatches?: number;
    numOfMatches?: number;
  };
};

@Injectable()
export class AttendanceService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AttendanceService.name);
  private timer: NodeJS.Timeout | null = null;
  private polling = false;

  private readonly intervalMs = 5000;
  private readonly pageSize = 30;

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit() {
    this.logger.log("Hikvision attendance polling started");
    void this.pollDevice();

    this.timer = setInterval(() => {
      void this.pollDevice();
    }, this.intervalMs);
  }

  onModuleDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private deviceConfig() {
    const url = process.env.HIK_DEVICE_URL;
    const username = process.env.HIK_DEVICE_USERNAME;
    const password = process.env.HIK_DEVICE_PASSWORD;
    const deviceId = process.env.HIK_DEVICE_ID || "hik-main";
    const schoolId = process.env.HIK_SCHOOL_ID;

    if (!url || !username || !password || !schoolId) {
      throw new Error("Thiếu cấu hình HIK_DEVICE hoặc HIK_SCHOOL_ID");
    }

    return { url, username, password, deviceId, schoolId };
  }

  // Chuyển thời gian sang múi giờ Việt Nam để truy vấn máy.
  private toDeviceTime(date: Date): string {
    const vietnamTime = new Date(date.getTime() + 7 * 60 * 60 * 1000);

    return vietnamTime.toISOString().slice(0, 19) + "+07:00";
  }

  private async pollDevice() {
    if (this.polling) return;

    this.polling = true;

    try {
      const config = this.deviceConfig();

      const client = new DigestFetch(config.username, config.password);

      // Truy vấn lặp lại 2 phút để tránh bỏ sót sự kiện đến trễ.
      // Database tự chống trùng bằng deviceId + deviceSerialNo.
      const endTime = new Date();
      const startTime = new Date(endTime.getTime() - 2 * 60 * 1000);
      const searchID = randomUUID();

      let position = 0;
      let savedCount = 0;
      let hasMore = true;

      while (hasMore) {
        const body = {
          AcsEventCond: {
            searchID,
            searchResultPosition: position,
            maxResults: this.pageSize,
            major: 5,
            minor: 75,
            startTime: this.toDeviceTime(startTime),
            endTime: this.toDeviceTime(endTime),
          },
        };

        const response = await client.fetch(
          `${config.url}/ISAPI/AccessControl/AcsEvent?format=json`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          },
        );

        if (!response.ok) {
          const errorBody = await response.text();

          this.logger.error(`Hikvision HTTP ${response.status}: ${errorBody}`);

          throw new Error(`Hikvision trả về HTTP ${response.status}`);
        }

        const result = (await response.json()) as HikResponse;
        const eventData = result.AcsEvent;

        if (!eventData) break;

        const rawEvents = eventData.InfoList;
        const events = rawEvents
          ? Array.isArray(rawEvents)
            ? rawEvents
            : [rawEvents]
          : [];

        for (const event of events) {
          if (
            !event.employeeNoString ||
            event.serialNo === undefined ||
            !event.time
          ) {
            continue;
          }

          const serialNo = BigInt(event.serialNo);
          const occurredAt = new Date(event.time);

          if (Number.isNaN(occurredAt.getTime())) continue;

          // Tìm học sinh theo mã trên máy và đúng trường.
          const student = await this.prisma.student.findFirst({
            where: {
              schoolId: config.schoolId,
              code: event.employeeNoString,
            },
            select: { id: true },
          });

          try {
            await this.prisma.attendanceEvent.create({
              data: {
                schoolId: config.schoolId,
                studentId: student?.id ?? null,
                deviceId: config.deviceId,
                deviceSerialNo: serialNo,
                employeeNoString: event.employeeNoString,
                major: event.major ?? 0,
                minor: event.minor ?? 0,
                occurredAt,
                attendanceStatus: event.attendanceStatus ?? null,
                currentVerifyMode: event.currentVerifyMode ?? null,
              },
            });

            savedCount++;
          } catch (error) {
            // P2002: sự kiện đã được lưu trước đó.
            if (
              !(error instanceof Error) ||
              !("code" in error) ||
              error.code !== "P2002"
            ) {
              throw error;
            }
          }
        }

        position += events.length;

        hasMore = eventData.responseStatusStrg === "MORE" && events.length > 0;
      }

      if (savedCount > 0) {
        this.logger.log(`Đã lưu ${savedCount} sự kiện Hikvision mới`);
      }
    } catch (error) {
      this.logger.error(error instanceof Error ? error.message : String(error));
    } finally {
      this.polling = false;
    }
  }

  async getEvents(schoolId: string, limit = 100) {
    const events = await this.prisma.attendanceEvent.findMany({
      where: { schoolId },
      include: {
        student: {
          select: {
            id: true,
            code: true,
            name: true,
            classroom: {
              select: { name: true },
            },
          },
        },
      },
      orderBy: { occurredAt: "desc" },
      take: Math.min(200, Math.max(1, limit)),
    });

    // BigInt không thể serialize trực tiếp thành JSON.
    return events.map((event) => ({
      ...event,
      deviceSerialNo: event.deviceSerialNo.toString(),
    }));
  }
}
