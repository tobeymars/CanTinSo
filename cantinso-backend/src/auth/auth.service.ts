import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
@Injectable()
export class AuthService {
 constructor(private prisma: PrismaService, private jwt: JwtService) {}
 async login(email: string, password: string) {
  const user = await this.prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
  if (!user || !user.isActive || !(await bcrypt.compare(password, user.passwordHash))) throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
  const accessToken = await this.jwt.signAsync({ sub: user.id, role: user.role, schoolId: user.schoolId });
  return { accessToken, tokenType: 'Bearer', expiresIn: process.env.JWT_EXPIRES_IN ?? '8h', user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role, schoolId: user.schoolId } };
 }
}
