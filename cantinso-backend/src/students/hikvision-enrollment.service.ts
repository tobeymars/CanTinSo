import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import DigestFetch from "digest-fetch";

type HikUserSearch = {
  UserInfoSearch?: {
    responseStatusStrg?: string;
    UserInfo?: Array<{ employeeNo?: string; name?: string }>;
  };
};

@Injectable()
export class HikvisionEnrollmentService {
  private config() {
    const { HIK_DEVICE_URL, HIK_DEVICE_USERNAME, HIK_DEVICE_PASSWORD } = process.env;
    if (!HIK_DEVICE_URL || !HIK_DEVICE_USERNAME || !HIK_DEVICE_PASSWORD) {
      throw new ServiceUnavailableException("Thiếu HIK_DEVICE_URL / HIK_DEVICE_USERNAME / HIK_DEVICE_PASSWORD trong .env");
    }
    return {
      url: HIK_DEVICE_URL.replace(/\/$/, ""),
      username: HIK_DEVICE_USERNAME,
      password: HIK_DEVICE_PASSWORD,
      fdid: process.env.HIK_FACE_FDID || "1",
      faceLibType: process.env.HIK_FACE_LIB_TYPE || "blackFD",
    };
  }

  private client() {
    const c = this.config();
    return { config: c, http: new DigestFetch(c.username, c.password) };
  }

  private async requestJson(path: string, body?: unknown) {
    const { config, http } = this.client();
    const response = await http.fetch(`${config.url}${path}`, {
      method: body === undefined ? "GET" : "POST",
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await response.text();
    if (!response.ok) {
      throw new Error(`Hikvision HTTP ${response.status}: ${text.slice(0, 500)}`);
    }
    let data: any = {};
    try { data = text ? JSON.parse(text) : {}; } catch { throw new Error("Hikvision trả về dữ liệu JSON không hợp lệ"); }
    if (data.statusCode !== undefined && Number(data.statusCode) !== 1) {
      throw new Error(data.errorMsg || data.statusString || data.subStatusCode || "Hikvision từ chối yêu cầu");
    }
    return data;
  }

  async userExists(employeeNo: string): Promise<boolean> {
    const data = await this.requestJson("/ISAPI/AccessControl/UserInfo/Search?format=json", {
      UserInfoSearchCond: {
        searchID: `cantinso-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        searchResultPosition: 0,
        maxResults: 10,
        EmployeeNoList: [{ employeeNo }],
      },
    }) as HikUserSearch;
    const users = data.UserInfoSearch?.UserInfo ?? [];
    return users.some((user) => user.employeeNo === employeeNo);
  }

  async createUser(input: { employeeNo: string; name: string; gender: "MALE" | "FEMALE" | "OTHER" }) {
    const now = new Date();
    const beginTime = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString().replace("Z", "+07:00");
    const endTime = "2037-12-31T23:59:59+07:00";
    await this.requestJson("/ISAPI/AccessControl/UserInfo/Record?format=json", {
      UserInfo: {
        employeeNo: input.employeeNo,
        name: input.name,
        userType: "normal",
        Valid: { enable: true, beginTime, endTime, timeType: "UTC" },
        gender: input.gender === "MALE" ? "male" : input.gender === "FEMALE" ? "female" : "unknown",
        userVerifyMode: "face",
        checkUser: true,
      },
    });
  }

  async uploadFace(input: { employeeNo: string; name: string; gender: "MALE" | "FEMALE" | "OTHER"; birthDate?: string | null; image: Buffer }) {
    const config = this.config();
    const http = new DigestFetch(config.username, config.password);
    const form = new FormData();
    const record = {
      faceLibType: config.faceLibType,
      FDID: config.fdid,
      FPID: input.employeeNo,
      name: input.name,
      gender: input.gender === "MALE" ? "male" : input.gender === "FEMALE" ? "female" : "unknown",
      bornTime: input.birthDate || "2010-01-01",
      faceType: "normalFace",
      saveFacePic: true,
    };
    form.append("FaceDataRecord", new Blob([JSON.stringify(record)], { type: "application/json" }));
    form.append("img", new Blob([new Uint8Array(input.image)], { type: "image/jpeg" }), `${input.employeeNo}.jpg`);
    const response = await http.fetch(`${config.url}/ISAPI/Intelligent/FDLib/FaceDataRecord?format=json`, {
      method: "POST",
      body: form,
    });
    const text = await response.text();
    if (!response.ok) throw new Error(`Hikvision tải ảnh HTTP ${response.status}: ${text.slice(0, 500)}`);
    let data: any = {};
    try { data = text ? JSON.parse(text) : {}; } catch { /* Some firmware returns XML/text on success. */ }
    if (data.statusCode !== undefined && Number(data.statusCode) !== 1) {
      throw new Error(data.errorMsg || data.statusString || data.subStatusCode || "Hikvision không nhận ảnh khuôn mặt");
    }
  }
}
