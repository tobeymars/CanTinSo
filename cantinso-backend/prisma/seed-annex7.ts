import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const foods = [
  { code: 'MOH3958-F001', category: "I Ngũ cốc và sản phẩm chế biến", sourceRowNo: 1, name: "Gạo nếp (loại thường)", edible: 100, energy: 350, protein: 8.4, fat: 1.6, carbohydrate: 75.4, fiber: 0.5, calcium: 16, iron: 1.2, zinc: 2.2, vitaminA: 0 },
  { code: 'MOH3958-F002', category: "I Ngũ cốc và sản phẩm chế biến", sourceRowNo: 2, name: "Gạo tẻ máy", edible: 100, energy: 346, protein: 7.9, fat: 1, carbohydrate: 76.3, fiber: 0.4, calcium: 30, iron: 1.3, zinc: 1.5, vitaminA: 0 },
  { code: 'MOH3958-F003', category: "I Ngũ cốc và sản phẩm chế biến", sourceRowNo: 3, name: "Ngô bắp tươi", edible: 55, energy: 200, protein: 4.1, fat: 2.3, carbohydrate: 40.8, fiber: 1.2, calcium: 20, iron: 1.5, zinc: 1.4, vitaminA: 20 },
  { code: 'MOH3958-F004', category: "I Ngũ cốc và sản phẩm chế biến", sourceRowNo: 4, name: "Bánh đa nem", edible: 100, energy: 335, protein: 4, fat: 0.2, carbohydrate: 79.4, fiber: 0.5, calcium: 20, iron: 0.3, zinc: null, vitaminA: 0 },
  { code: 'MOH3958-F005', category: "I Ngũ cốc và sản phẩm chế biến", sourceRowNo: 5, name: "Bánh đúc", edible: 100, energy: 52, protein: 0.9, fat: 0.3, carbohydrate: 11.4, fiber: 0.1, calcium: 50, iron: 0.4, zinc: null, vitaminA: 0 },
  { code: 'MOH3958-F006', category: "I Ngũ cốc và sản phẩm chế biến", sourceRowNo: 6, name: "Bánh mỳ", edible: 100, energy: 250, protein: 7.9, fat: 0.8, carbohydrate: 52.8, fiber: 0.2, calcium: 28, iron: 2, zinc: null, vitaminA: 0 },
  { code: 'MOH3958-F007', category: "I Ngũ cốc và sản phẩm chế biến", sourceRowNo: 7, name: "Bánh phở", edible: 100, energy: 141, protein: 3.2, fat: null, carbohydrate: 32.1, fiber: null, calcium: 16, iron: 0.3, zinc: null, vitaminA: 0 },
  { code: 'MOH3958-F008', category: "I Ngũ cốc và sản phẩm chế biến", sourceRowNo: 8, name: "Bột mì", edible: 100, energy: 347, protein: 11, fat: 1.1, carbohydrate: 73.2, fiber: 0.3, calcium: 29, iron: 2, zinc: 2.5, vitaminA: 0 },
  { code: 'MOH3958-F009', category: "I Ngũ cốc và sản phẩm chế biến", sourceRowNo: 9, name: "Bún", edible: 100, energy: 112, protein: 1.7, fat: null, carbohydrate: 26.2, fiber: 0.5, calcium: 12, iron: 0.2, zinc: null, vitaminA: 0 },
  { code: 'MOH3958-F010', category: "I Ngũ cốc và sản phẩm chế biến", sourceRowNo: 10, name: "Ngô nếp luộc", edible: 50, energy: 172, protein: 3.9, fat: 2.2, carbohydrate: 34.1, fiber: 1.2, calcium: 18, iron: 0.8, zinc: null, vitaminA: 0 },
  { code: 'MOH3958-F011', category: "II Khoai củ và sản phẩm chế biến", sourceRowNo: 11, name: "Củ sắn", edible: 75, energy: 158, protein: 1.1, fat: 0.2, carbohydrate: 37.9, fiber: 1.5, calcium: 25, iron: 1.2, zinc: null, vitaminA: 1 },
  { code: 'MOH3958-F012', category: "II Khoai củ và sản phẩm chế biến", sourceRowNo: 12, name: "Củ sắn dây", edible: 90, energy: 156, protein: 1.6, fat: 0.1, carbohydrate: 37.2, fiber: 9.2, calcium: 28, iron: 0.2, zinc: null, vitaminA: 0 },
  { code: 'MOH3958-F013', category: "II Khoai củ và sản phẩm chế biến", sourceRowNo: 13, name: "Khoai lang", edible: 83, energy: 124, protein: 0.8, fat: 0.2, carbohydrate: 29.8, fiber: 1.3, calcium: 34, iron: 1, zinc: 0.2, vitaminA: 13 },
  { code: 'MOH3958-F014', category: "II Khoai củ và sản phẩm chế biến", sourceRowNo: 14, name: "Khoai môn", edible: 86, energy: 113, protein: 1.5, fat: 0.2, carbohydrate: 26.4, fiber: 1.2, calcium: 44, iron: 0.8, zinc: null, vitaminA: 0 },
  { code: 'MOH3958-F015', category: "II Khoai củ và sản phẩm chế biến", sourceRowNo: 15, name: "Khoai sọ", edible: 82, energy: 119, protein: 1.8, fat: 0.1, carbohydrate: 27.7, fiber: 1.2, calcium: 64, iron: 1.5, zinc: null, vitaminA: 4 },
  { code: 'MOH3958-F016', category: "II Khoai củ và sản phẩm chế biến", sourceRowNo: 16, name: "Khoai tây", edible: 87, energy: 96, protein: 2, fat: 0.07, carbohydrate: 21.93, fiber: 1, calcium: 10, iron: 1.2, zinc: 0.3, vitaminA: 0 },
  { code: 'MOH3958-F017', category: "II Khoai củ và sản phẩm chế biến", sourceRowNo: 17, name: "Miến dong", edible: 100, energy: 338, protein: 0.6, fat: 0.1, carbohydrate: 83.7, fiber: 1.5, calcium: 40, iron: 1, zinc: null, vitaminA: 0 },
  { code: 'MOH3958-F018', category: "III Hạt, quả giàu đạm, béo và sản phẩm chế biến", sourceRowNo: 18, name: "Đậu đen (hạt)", edible: 98, energy: 341, protein: 24.2, fat: 1.7, carbohydrate: 57.3, fiber: 4, calcium: 56, iron: 6.1, zinc: null, vitaminA: 3 },
  { code: 'MOH3958-F019', category: "III Hạt, quả giàu đạm, béo và sản phẩm chế biến", sourceRowNo: 19, name: "Đậu đũa (hạt)", edible: 90, energy: 338, protein: 23.7, fat: 2, carbohydrate: 56.2, fiber: 4.3, calcium: 110, iron: 6.5, zinc: null, vitaminA: 1 },
  { code: 'MOH3958-F020', category: "III Hạt, quả giàu đạm, béo và sản phẩm chế biến", sourceRowNo: 20, name: "Đậu Hà lan (hạt)", edible: 100, energy: 342, protein: 22.2, fat: 1.4, carbohydrate: 60.1, fiber: 6, calcium: 57, iron: 4.4, zinc: 4, vitaminA: 6 },
  { code: 'MOH3958-F021', category: "III Hạt, quả giàu đạm, béo và sản phẩm chế biến", sourceRowNo: 21, name: "Đậu tương (đậu nành)", edible: 98, energy: 418, protein: 34, fat: 18.4, carbohydrate: 29.1, fiber: 4.5, calcium: 165, iron: 11, zinc: 3.8, vitaminA: 3 },
  { code: 'MOH3958-F022', category: "III Hạt, quả giàu đạm, béo và sản phẩm chế biến", sourceRowNo: 22, name: "Đậu xanh (đậu tắt)", edible: 98, energy: 346, protein: 23.4, fat: 2.4, carbohydrate: 57.8, fiber: 4.7, calcium: 64, iron: 4.8, zinc: 1.1, vitaminA: 3 },
  { code: 'MOH3958-F023', category: "III Hạt, quả giàu đạm, béo và sản phẩm chế biến", sourceRowNo: 23, name: "Lạc hạt", edible: 98, energy: 583, protein: 27.5, fat: 44.5, carbohydrate: 18, fiber: 2.5, calcium: 68, iron: 2.2, zinc: 1.9, vitaminA: 1 },
  { code: 'MOH3958-F024', category: "III Hạt, quả giàu đạm, béo và sản phẩm chế biến", sourceRowNo: 24, name: "Vừng (đen, trắng)", edible: 95, energy: 582, protein: 20.1, fat: 46.4, carbohydrate: 21.1, fiber: 3.5, calcium: 975, iron: 14.55, zinc: 7.75, vitaminA: 1 },
  { code: 'MOH3958-F025', category: "III Hạt, quả giàu đạm, béo và sản phẩm chế biến", sourceRowNo: 25, name: "Đậu phụ", edible: 100, energy: 97, protein: 10.9, fat: 5.4, carbohydrate: 1.1, fiber: 0.4, calcium: 24, iron: 2.2, zinc: 0.8, vitaminA: 0 },
  { code: 'MOH3958-F026', category: "III Hạt, quả giàu đạm, béo và sản phẩm chế biến", sourceRowNo: 26, name: "Sữa đậu nành (100g đậu/lít)", edible: 100, energy: 29, protein: 3.1, fat: 1.6, carbohydrate: 0.5, fiber: 0.1, calcium: 18, iron: 1.2, zinc: 0.44, vitaminA: 0 },
  { code: 'MOH3958-F027', category: "IV Rau, quả, củ dùng làm rau", sourceRowNo: 27, name: "Bầu", edible: 84, energy: 18, protein: 0.6, fat: 0.02, carbohydrate: 3.88, fiber: 1, calcium: 21, iron: 0.2, zinc: 0.7, vitaminA: 1 },
  { code: 'MOH3958-F028', category: "IV Rau, quả, củ dùng làm rau", sourceRowNo: 28, name: "Bí đao (bí xanh)", edible: 73, energy: 16, protein: 0.6, fat: null, carbohydrate: 3.4, fiber: 1, calcium: 26, iron: 0.3, zinc: null, vitaminA: 0 },
  { code: 'MOH3958-F029', category: "IV Rau, quả, củ dùng làm rau", sourceRowNo: 29, name: "Bí ngô", edible: 86, energy: 29, protein: 0.3, fat: 0.07, carbohydrate: 6.83, fiber: 0.7, calcium: 24, iron: 0.5, zinc: 0.1, vitaminA: 237 },
  { code: 'MOH3958-F030', category: "IV Rau, quả, củ dùng làm rau", sourceRowNo: 30, name: "Cà chua", edible: 95, energy: 24, protein: 0.6, fat: 0.23, carbohydrate: 4.77, fiber: 0.8, calcium: 12, iron: 1.4, zinc: 0.74, vitaminA: 59 },
  { code: 'MOH3958-F031', category: "IV Rau, quả, củ dùng làm rau", sourceRowNo: 31, name: "Cà rốt (củ đỏ, vàng)", edible: 85, energy: 44, protein: 1.5, fat: 0.17, carbohydrate: 9.03, fiber: 1.2, calcium: 43, iron: 0.8, zinc: 1.11, vitaminA: 681 },
  { code: 'MOH3958-F032', category: "IV Rau, quả, củ dùng làm rau", sourceRowNo: 32, name: "Cải bắp", edible: 90, energy: 36, protein: 1.8, fat: 0.09, carbohydrate: 6.91, fiber: 1.6, calcium: 48, iron: 1.1, zinc: 0.81, vitaminA: 5 },
  { code: 'MOH3958-F033', category: "IV Rau, quả, củ dùng làm rau", sourceRowNo: 33, name: "Cải cúc", edible: 75, energy: 22, protein: 1.6, fat: null, carbohydrate: 3.9, fiber: 2, calcium: 63, iron: 0.8, zinc: 0.67, vitaminA: 12 },
  { code: 'MOH3958-F034', category: "IV Rau, quả, củ dùng làm rau", sourceRowNo: 34, name: "Cải soong", edible: 70, energy: 22, protein: 2.1, fat: 0.07, carbohydrate: 3.33, fiber: 2, calcium: 69, iron: 1.6, zinc: 0.8, vitaminA: 235 },
  { code: 'MOH3958-F035', category: "IV Rau, quả, củ dùng làm rau", sourceRowNo: 35, name: "Cải thìa (cải trắng)", edible: 75, energy: 24, protein: 1.4, fat: 0.14, carbohydrate: 4.26, fiber: 1.8, calcium: 50, iron: 0.7, zinc: 0.75, vitaminA: 223 },
  { code: 'MOH3958-F036', category: "IV Rau, quả, củ dùng làm rau", sourceRowNo: 36, name: "Cải xanh", edible: 76, energy: 23, protein: 1.7, fat: 0.14, carbohydrate: 3.76, fiber: 1.8, calcium: 89, iron: 1.9, zinc: 0.9, vitaminA: 525 },
  { code: 'MOH3958-F037', category: "IV Rau, quả, củ dùng làm rau", sourceRowNo: 37, name: "Đậu cô ve", edible: 90, energy: 77, protein: 5, fat: null, carbohydrate: 14.3, fiber: 1, calcium: 26, iron: 0.7, zinc: 0.01, vitaminA: 15 },
  { code: 'MOH3958-F038', category: "IV Rau, quả, củ dùng làm rau", sourceRowNo: 38, name: "Đậu đũa", edible: 90, energy: 67, protein: 6, fat: 0.31, carbohydrate: 9.99, fiber: 2, calcium: 47, iron: 1.6, zinc: 0.37, vitaminA: 21 },
  { code: 'MOH3958-F039', category: "IV Rau, quả, củ dùng làm rau", sourceRowNo: 39, name: "Đậu Hà Lan", edible: 90, energy: 75, protein: 6.5, fat: 0.29, carbohydrate: 11.71, fiber: 1, calcium: 57, iron: 0.8, zinc: 1.24, vitaminA: 41 },
  { code: 'MOH3958-F040', category: "IV Rau, quả, củ dùng làm rau", sourceRowNo: 40, name: "Giá đậu xanh", edible: 95, energy: 52, protein: 5.5, fat: 0.13, carbohydrate: 7.17, fiber: 2, calcium: 38, iron: 1.4, zinc: 0.41, vitaminA: 1 },
  { code: 'MOH3958-F041', category: "IV Rau, quả, củ dùng làm rau", sourceRowNo: 41, name: "Mướp", edible: 88, energy: 18, protein: 0.9, fat: 0.14, carbohydrate: 3.36, fiber: 0.5, calcium: 28, iron: 0.8, zinc: 0.07, vitaminA: 13 },
  { code: 'MOH3958-F042', category: "IV Rau, quả, củ dùng làm rau", sourceRowNo: 42, name: "Rau mồng tơi", edible: 83, energy: 24, protein: 2, fat: null, carbohydrate: 3.9, fiber: 2.5, calcium: 176, iron: 1.6, zinc: 0.54, vitaminA: 160 },
  { code: 'MOH3958-F043', category: "IV Rau, quả, củ dùng làm rau", sourceRowNo: 43, name: "Rau muống", edible: 85, energy: 28, protein: 3.2, fat: 0.24, carbohydrate: 3.26, fiber: 1, calcium: 100, iron: 1.4, zinc: 0.35, vitaminA: 142 },
  { code: 'MOH3958-F044', category: "IV Rau, quả, củ dùng làm rau", sourceRowNo: 44, name: "Rau ngót", edible: 77, energy: 45, protein: 5.3, fat: null, carbohydrate: 5.9, fiber: 2.5, calcium: 169, iron: 2.7, zinc: 0.94, vitaminA: 591 },
  { code: 'MOH3958-F045', category: "IV Rau, quả, củ dùng làm rau", sourceRowNo: 45, name: "Su hào", edible: 78, energy: 44, protein: 2.8, fat: 0.07, carbohydrate: 7.93, fiber: 1.7, calcium: 46, iron: 0.6, zinc: 0.45, vitaminA: 2 },
  { code: 'MOH3958-F046', category: "IV Rau, quả, củ dùng làm rau", sourceRowNo: 46, name: "Su su", edible: 80, energy: 23, protein: 0.8, fat: 0.1, carbohydrate: 4.6, fiber: 1, calcium: 17, iron: 0.4, zinc: 0.74, vitaminA: 0 },
  { code: 'MOH3958-F047', category: "IV Rau, quả, củ dùng làm rau", sourceRowNo: 47, name: "Súp lơ trắng", edible: 60, energy: 34, protein: 2.5, fat: 0.15, carbohydrate: 5.65, fiber: 0.9, calcium: 26, iron: 1.4, zinc: 0.2, vitaminA: 1 },
  { code: 'MOH3958-F048', category: "IV Rau, quả, củ dùng làm rau", sourceRowNo: 48, name: "Súp lơ xanh", edible: 61, energy: 39, protein: 2.95, fat: 0.3, carbohydrate: 6.08, fiber: 3.2, calcium: 33, iron: 0.73, zinc: 0.64, vitaminA: 8 },
  { code: 'MOH3958-F049', category: "IV Rau, quả, củ dùng làm rau", sourceRowNo: 49, name: "Cải ngọt", edible: 100, energy: 17, protein: 1.4, fat: 0.1, carbohydrate: 2.62, fiber: null, calcium: 128, iron: 0.77, zinc: 0.57, vitaminA: 101 },
  { code: 'MOH3958-F050', category: "V Quả chín", sourceRowNo: 50, name: "Bưởi", edible: 65, energy: 33, protein: 0.2, fat: null, carbohydrate: 8, fiber: 0.7, calcium: 23, iron: 0.5, zinc: 0.16, vitaminA: 0 },
  { code: 'MOH3958-F051', category: "V Quả chín", sourceRowNo: 51, name: "Cam", edible: 75, energy: 43, protein: 0.9, fat: 0.06, carbohydrate: 9.74, fiber: 1.4, calcium: 34, iron: 0.4, zinc: 0.22, vitaminA: 8 },
  { code: 'MOH3958-F052', category: "V Quả chín", sourceRowNo: 52, name: "Chuối tây", edible: 76, energy: 66, protein: 0.9, fat: 0.3, carbohydrate: 15, fiber: null, calcium: 12, iron: 0.5, zinc: 0.32, vitaminA: 3 },
  { code: 'MOH3958-F053', category: "V Quả chín", sourceRowNo: 53, name: "Chuối tiêu", edible: 70, energy: 100, protein: 1.5, fat: 0.2, carbohydrate: 23, fiber: 0.8, calcium: 8, iron: 0.6, zinc: 0.37, vitaminA: 4 },
  { code: 'MOH3958-F054', category: "V Quả chín", sourceRowNo: 54, name: "Dưa hấu", edible: 52, energy: 18, protein: 1.2, fat: 0.2, carbohydrate: 2.8, fiber: 0.5, calcium: 8, iron: 1, zinc: 0.11, vitaminA: 37 },
  { code: 'MOH3958-F055', category: "V Quả chín", sourceRowNo: 57, name: "Đu đủ chín", edible: 88, energy: 38, protein: 1, fat: 0.11, carbohydrate: 8.19, fiber: 0.6, calcium: 40, iron: 2.6, zinc: 0.1, vitaminA: 56 },
  { code: 'MOH3958-F056', category: "V Quả chín", sourceRowNo: 56, name: "Nhãn", edible: 55, energy: 52, protein: 0.9, fat: null, carbohydrate: 12, fiber: 1, calcium: 21, iron: 0.4, zinc: 0.29, vitaminA: 0 },
  { code: 'MOH3958-F057', category: "V Quả chín", sourceRowNo: 57, name: "Ổi", edible: 95, energy: 61, protein: 0.6, fat: 0.76, carbohydrate: 12.94, fiber: 6, calcium: 10, iron: 1.3, zinc: 2.4, vitaminA: 31 },
  { code: 'MOH3958-F058', category: "V Quả chín", sourceRowNo: 58, name: "Quít", edible: 74, energy: 40, protein: 0.8, fat: null, carbohydrate: 9.2, fiber: 0.6, calcium: 35, iron: 0.4, zinc: 0.2, vitaminA: 25 },
  { code: 'MOH3958-F059', category: "V Quả chín", sourceRowNo: 59, name: "Vải", edible: 52, energy: 49, protein: 0.7, fat: 0.35, carbohydrate: 10.75, fiber: 1.1, calcium: 6, iron: 0.5, zinc: 0.07, vitaminA: 0 },
  { code: 'MOH3958-F060', category: "VI Dầu, mỡ, bơ", sourceRowNo: 100, name: "Dầu thảo mộc (Lạc, vừng, ...)", edible: 100, energy: 897, protein: 0, fat: 99.7, carbohydrate: 0, fiber: 0, calcium: null, iron: null, zinc: null, vitaminA: 0 },
  { code: 'MOH3958-F061', category: "VI Dầu, mỡ, bơ", sourceRowNo: 101, name: "Mỡ lợn nước", edible: 100, energy: 896, protein: 0, fat: 99.6, carbohydrate: 0, fiber: 0, calcium: 2, iron: 0.3, zinc: null, vitaminA: 0 },
  { code: 'MOH3958-F062', category: "VI Dầu, mỡ, bơ", sourceRowNo: 102, name: "Dầu đậu tương", edible: 100, energy: 900, protein: 0, fat: 100, carbohydrate: 0, fiber: 0, calcium: null, iron: 0.02, zinc: null, vitaminA: 0 },
  { code: 'MOH3958-F063', category: "VII Thịt và sản phẩm chế biến", sourceRowNo: 103, name: "Thịt bò, lưng, nạc", edible: 100, energy: 121, protein: 23.07, fat: 3.16, carbohydrate: 0.1, fiber: 0, calcium: 23, iron: 1.63, zinc: 4.05, vitaminA: 0 },
  { code: 'MOH3958-F064', category: "VII Thịt và sản phẩm chế biến", sourceRowNo: 104, name: "Thịt bò, lưng, nạc và mỡ", edible: 100, energy: 174, protein: 21.53, fat: 9.49, carbohydrate: 0.7, fiber: 0, calcium: 5, iron: 1.78, zinc: 3.64, vitaminA: 0 },
  { code: 'MOH3958-F065', category: "VII Thịt và sản phẩm chế biến", sourceRowNo: 105, name: "Thịt gà ta", edible: 48, energy: 199, protein: 20.3, fat: 13.1, carbohydrate: 0, fiber: 0, calcium: 12, iron: 1.5, zinc: 1.5, vitaminA: 120 },
  { code: 'MOH3958-F066', category: "VII Thịt và sản phẩm chế biến", sourceRowNo: 106, name: "Thịt lợn mỡ", edible: 98, energy: 394, protein: 14.5, fat: 37.3, carbohydrate: 0, fiber: 0, calcium: 8, iron: 0.4, zinc: 1.59, vitaminA: 2 },
  { code: 'MOH3958-F067', category: "VII Thịt và sản phẩm chế biến", sourceRowNo: 107, name: "Thịt lợn nạc", edible: 98, energy: 139, protein: 19, fat: 7, carbohydrate: 0, fiber: 0, calcium: 7, iron: 0.96, zinc: 2.5, vitaminA: 2 },
  { code: 'MOH3958-F068', category: "VII Thịt và sản phẩm chế biến", sourceRowNo: 108, name: "Thịt lợn nửa nạc, nửa mỡ", edible: 98, energy: 260, protein: 16.5, fat: 21.5, carbohydrate: 0, fiber: 0, calcium: 9, iron: 1.5, zinc: 1.91, vitaminA: 10 },
  { code: 'MOH3958-F069', category: "VII Thịt và sản phẩm chế biến", sourceRowNo: 109, name: "Chân giò lợn", edible: 62, energy: 230, protein: 15.7, fat: 18.6, carbohydrate: 0, fiber: 0, calcium: 24, iron: 2.1, zinc: 1.93, vitaminA: 30 },
  { code: 'MOH3958-F070', category: "VII Thịt và sản phẩm chế biến", sourceRowNo: 110, name: "Sườn lợn", edible: 43, energy: 187, protein: 17.9, fat: 12.8, carbohydrate: 0, fiber: 0, calcium: 7, iron: 0.61, zinc: 3.6, vitaminA: 0 },
  { code: 'MOH3958-F071', category: "VII Thịt và sản phẩm chế biến", sourceRowNo: 111, name: "Giò bò", edible: 100, energy: 335, protein: 18.2, fat: 29, carbohydrate: 0.4, fiber: 0.1, calcium: 33, iron: 2.81, zinc: 1.06, vitaminA: 0 },
  { code: 'MOH3958-F072', category: "VII Thịt và sản phẩm chế biến", sourceRowNo: 112, name: "Giò lụa", edible: 100, energy: 205, protein: 16.9, fat: 15, carbohydrate: 0.5, fiber: 0.1, calcium: 24, iron: 0.87, zinc: 2.41, vitaminA: 0 },
  { code: 'MOH3958-F073', category: "VII Thịt và sản phẩm chế biến", sourceRowNo: 113, name: "Thịt lợn, nạc vai", edible: 100, energy: 149, protein: 20.83, fat: 7.29, carbohydrate: 0, fiber: null, calcium: 24, iron: 0.67, zinc: 2.38, vitaminA: 1 },
  { code: 'MOH3958-F074', category: "VII Thịt và sản phẩm chế biến", sourceRowNo: 114, name: "Thịt lợn, nạc mông", edible: 100, energy: 141, protein: 24.68, fat: 4.72, carbohydrate: 0, fiber: null, calcium: 42, iron: 0.66, zinc: 2.33, vitaminA: 1 },
  { code: 'MOH3958-F075', category: "VII Thịt và sản phẩm chế biến", sourceRowNo: 115, name: "Thịt lợn, nạc thăn", edible: 100, energy: 118, protein: 23, fat: 2.9, carbohydrate: 0.04, fiber: null, calcium: 38, iron: 0.72, zinc: 1.8, vitaminA: 0 },
  { code: 'MOH3958-F076', category: "VII Thịt và sản phẩm chế biến", sourceRowNo: 116, name: "Thịt gà công nghiệp, cánh", edible: 100, energy: 188, protein: 19.09, fat: 12.43, carbohydrate: 0, fiber: null, calcium: 19, iron: 1.07, zinc: 0.94, vitaminA: 7 },
  { code: 'MOH3958-F077', category: "VII Thịt và sản phẩm chế biến", sourceRowNo: 117, name: "Thịt gà công nghiệp, đùi", edible: 100, energy: 137, protein: 18, fat: 6.8, carbohydrate: 0.89, fiber: null, calcium: 18, iron: 0.75, zinc: 1.63, vitaminA: 10 },
  { code: 'MOH3958-F078', category: "VII Thịt và sản phẩm chế biến", sourceRowNo: 118, name: "Thịt gà công nghiệp, lườn", edible: 100, energy: 134, protein: 22.86, fat: 4.68, carbohydrate: 0, fiber: null, calcium: 23, iron: 0.69, zinc: 1, vitaminA: 9 },
  { code: 'MOH3958-F079', category: "VIII Thủy sản và sản phẩm chế biến", sourceRowNo: 119, name: "Cá chép", edible: 60, energy: 96, protein: 16, fat: 3.6, carbohydrate: 0, fiber: 0, calcium: 17, iron: 0.9, zinc: 1.48, vitaminA: 181 },
  { code: 'MOH3958-F080', category: "VIII Thủy sản và sản phẩm chế biến", sourceRowNo: 120, name: "Cá mè", edible: 65, energy: 144, protein: 15.4, fat: 9.1, carbohydrate: 0, fiber: 0, calcium: 157, iron: null, zinc: null, vitaminA: 0 },
  { code: 'MOH3958-F081', category: "VIII Thủy sản và sản phẩm chế biến", sourceRowNo: 121, name: "Cá ngừ", edible: 58, energy: 87, protein: 21, fat: 0.3, carbohydrate: 0, fiber: 0, calcium: 44, iron: 1, zinc: 0.52, vitaminA: 5 },
  { code: 'MOH3958-F082', category: "VIII Thủy sản và sản phẩm chế biến", sourceRowNo: 122, name: "Cá nục", edible: 73, energy: 111, protein: 20.2, fat: 3.3, carbohydrate: 0, fiber: 0, calcium: 85, iron: 3.25, zinc: 1.72, vitaminA: 15 },
  { code: 'MOH3958-F083', category: "VIII Thủy sản và sản phẩm chế biến", sourceRowNo: 123, name: "Cá quả", edible: 60, energy: 97, protein: 18.2, fat: 2.7, carbohydrate: 0, fiber: 0, calcium: 90, iron: null, zinc: null, vitaminA: 0 },
  { code: 'MOH3958-F084', category: "VIII Thủy sản và sản phẩm chế biến", sourceRowNo: 124, name: "Cá rô phi", edible: 57, energy: 100, protein: 19.7, fat: 2.3, carbohydrate: 0, fiber: 0, calcium: 50, iron: 0.53, zinc: null, vitaminA: 0 },
  { code: 'MOH3958-F085', category: "VIII Thủy sản và sản phẩm chế biến", sourceRowNo: 125, name: "Cá thu", edible: 65, energy: 166, protein: 18.2, fat: 10.3, carbohydrate: 0, fiber: 0, calcium: 50, iron: 1.3, zinc: null, vitaminA: 10 },
  { code: 'MOH3958-F086', category: "VIII Thủy sản và sản phẩm chế biến", sourceRowNo: 126, name: "Cá trắm cỏ", edible: 65, energy: 91, protein: 17, fat: 2.6, carbohydrate: 0, fiber: 0, calcium: 57, iron: 0.1, zinc: null, vitaminA: 0 },
  { code: 'MOH3958-F087', category: "VIII Thủy sản và sản phẩm chế biến", sourceRowNo: 127, name: "Cá trôi", edible: 72, energy: 127, protein: 18.8, fat: 5.7, carbohydrate: 0, fiber: 0, calcium: 76, iron: 0.05, zinc: null, vitaminA: 0 },
  { code: 'MOH3958-F088', category: "VIII Thủy sản và sản phẩm chế biến", sourceRowNo: 128, name: "Cua đồng", edible: 31, energy: 87, protein: 12.3, fat: 3.3, carbohydrate: 2, fiber: 0, calcium: 826, iron: 1.4, zinc: null, vitaminA: 210 },
  { code: 'MOH3958-F089', category: "VIII Thủy sản và sản phẩm chế biến", sourceRowNo: 129, name: "Tôm biển", edible: 46, energy: 82, protein: 17.6, fat: 0.9, carbohydrate: 0.9, fiber: 0, calcium: 79, iron: 1.6, zinc: 1.11, vitaminA: 20 },
  { code: 'MOH3958-F090', category: "VIII Thủy sản và sản phẩm chế biến", sourceRowNo: 130, name: "Tôm đồng", edible: 90, energy: 90, protein: 18.4, fat: 1.8, carbohydrate: 0, fiber: 0, calcium: 1120, iron: 2.2, zinc: null, vitaminA: 15 },
  { code: 'MOH3958-F091', category: "VIII Thủy sản và sản phẩm chế biến", sourceRowNo: 131, name: "Cá basa, phi lê", edible: 100, energy: 67, protein: 9.7, fat: 0.8, carbohydrate: 5.32, fiber: 0, calcium: 34, iron: 0.2, zinc: 0.26, vitaminA: 2 },
  { code: 'MOH3958-F092', category: "IX Trứng và sản phẩm chế biến", sourceRowNo: 132, name: "Trứng gà ta", edible: 86, energy: 150, protein: 12.96, fat: 10.33, carbohydrate: 1.25, fiber: 0, calcium: 55, iron: 2.7, zinc: 0.9, vitaminA: 166 },
  { code: 'MOH3958-F093', category: "IX Trứng và sản phẩm chế biến", sourceRowNo: 133, name: "Trứng vịt", edible: 88, energy: 172, protein: 13.02, fat: 12.02, carbohydrate: 2.94, fiber: 0, calcium: 71, iron: 3.2, zinc: 0.8, vitaminA: 232 },
  { code: 'MOH3958-F094', category: "IX Trứng và sản phẩm chế biến", sourceRowNo: 134, name: "Trứng chim cút", edible: 89, energy: 157, protein: 12.78, fat: 10.47, carbohydrate: 2.89, fiber: 0, calcium: 60, iron: 3.65, zinc: 1.47, vitaminA: 301 },
  { code: 'MOH3958-F095', category: "X Sữa và sản phẩm chế biến", sourceRowNo: 135, name: "Sữa bò tươi", edible: 100, energy: 74, protein: 3.9, fat: 4.4, carbohydrate: 4.8, fiber: 0, calcium: 120, iron: 0.1, zinc: 0.4, vitaminA: 52 },
  { code: 'MOH3958-F096', category: "X Sữa và sản phẩm chế biến", sourceRowNo: 136, name: "Sữa dê tươi", edible: 100, energy: 69, protein: 3.5, fat: 4.1, carbohydrate: 4.5, fiber: 0, calcium: 147, iron: 0.1, zinc: 0.3, vitaminA: 52 },
  { code: 'MOH3958-F097', category: "X Sữa và sản phẩm chế biến", sourceRowNo: 137, name: "Sữa chua", edible: 100, energy: 61, protein: 3.3, fat: 3.7, carbohydrate: 3.6, fiber: 0, calcium: 120, iron: 0.1, zinc: 0.59, vitaminA: 26 },
  { code: 'MOH3958-F098', category: "X Sữa và sản phẩm chế biến", sourceRowNo: 138, name: "Sữa bột toàn phần", edible: 100, energy: 494, protein: 27, fat: 26, carbohydrate: 38, fiber: 0, calcium: 939, iron: 1.1, zinc: 3.34, vitaminA: 322 },
  { code: 'MOH3958-F099', category: "X Sữa và sản phẩm chế biến", sourceRowNo: 139, name: "Sữa đặc có đường Việt Nam", edible: 100, energy: 336, protein: 8.1, fat: 8.8, carbohydrate: 56, fiber: 0, calcium: 307, iron: 0.6, zinc: null, vitaminA: 62 }
] as const;

async function main() {
  const reference = await prisma.nutritionReference.upsert({
    where: { code: 'MOH-3958-QD-BYT-2025-APPENDIX-7-V1' },
    update: {
      title: 'Thành phần dinh dưỡng của một số thực phẩm thông dụng (trong 100g thực phẩm ăn được)',
      issuingBody: 'Bộ Y tế',
      documentNo: '3958/QĐ-BYT',
      issuedAt: new Date('2025-12-25T00:00:00.000Z'),
      effectiveAt: new Date('2025-12-25T00:00:00.000Z'),
      appendix: 'Phụ lục 7',
      sourceUrl: 'https://thuvienphapluat.vn/van-ban/The-thao-Y-te/Quyet-dinh-3958-QD-BYT-2025-Huong-dan-dinh-duong-doi-voi-bua-an-hoc-duong-690450.aspx',
      version: 1,
    },
    create: {
      code: 'MOH-3958-QD-BYT-2025-APPENDIX-7-V1',
      title: 'Thành phần dinh dưỡng của một số thực phẩm thông dụng (trong 100g thực phẩm ăn được)',
      issuingBody: 'Bộ Y tế',
      documentNo: '3958/QĐ-BYT',
      issuedAt: new Date('2025-12-25T00:00:00.000Z'),
      effectiveAt: new Date('2025-12-25T00:00:00.000Z'),
      appendix: 'Phụ lục 7',
      sourceUrl: 'https://thuvienphapluat.vn/van-ban/The-thao-Y-te/Quyet-dinh-3958-QD-BYT-2025-Huong-dan-dinh-duong-doi-voi-bua-an-hoc-duong-690450.aspx',
      version: 1,
    },
  });

  for (const food of foods) {
    const ingredient = await prisma.ingredient.upsert({
      where: { code: food.code },
      update: { name: food.name, category: food.category },
      create: { code: food.code, name: food.name, unit: 'g', category: food.category },
    });

    await prisma.ingredientNutritionProfile.upsert({
      where: {
        ingredientId_nutritionReferenceId: {
          ingredientId: ingredient.id,
          nutritionReferenceId: reference.id,
        },
      },
      update: {
        sourceRowNo: food.sourceRowNo,
        sourceCategory: food.category,
        edibleRatePercent: String(food.edible),
        energyKcal: String(food.energy),
        proteinG: String(food.protein),
        fatG: food.fat === null ? null : String(food.fat),
        carbohydrateG: String(food.carbohydrate),
        fiberG: food.fiber === null ? null : String(food.fiber),
        calciumMg: food.calcium === null ? null : String(food.calcium),
        ironMg: food.iron === null ? null : String(food.iron),
        zincMg: food.zinc === null ? null : String(food.zinc),
        vitaminARaeMcg: String(food.vitaminA),
      },
      create: {
        ingredientId: ingredient.id,
        nutritionReferenceId: reference.id,
        sourceRowNo: food.sourceRowNo,
        sourceCategory: food.category,
        edibleRatePercent: String(food.edible),
        energyKcal: String(food.energy),
        proteinG: String(food.protein),
        fatG: food.fat === null ? null : String(food.fat),
        carbohydrateG: String(food.carbohydrate),
        fiberG: food.fiber === null ? null : String(food.fiber),
        calciumMg: food.calcium === null ? null : String(food.calcium),
        ironMg: food.iron === null ? null : String(food.iron),
        zincMg: food.zinc === null ? null : String(food.zinc),
        vitaminARaeMcg: String(food.vitaminA),
      },
    });
  }

  const seededCount = await prisma.ingredientNutritionProfile.count({
    where: { nutritionReferenceId: reference.id },
  });
  if (seededCount !== foods.length) {
    throw new Error(`Expected ${foods.length} Annex 7 profiles, found ${seededCount}`);
  }
  console.log(`Annex 7 seed completed: ${seededCount} foods (idempotent).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
