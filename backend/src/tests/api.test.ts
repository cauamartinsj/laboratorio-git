import request from 'supertest';
import { app } from '../app';
import { prisma } from '../lib/prisma';
import bcrypt from 'bcryptjs';

describe('Backend API Integration Tests', () => {
  let adminToken: string;
  let userToken: string;
  let userId: string;
  let deviceId: string;

  beforeAll(async () => {
    await prisma.location.deleteMany();
    await prisma.device.deleteMany();
    await prisma.user.deleteMany();

    const hashedPassword = await bcrypt.hash('123456', 10);

    const admin = await prisma.user.create({
      data: {
        name: 'Admin Test',
        email: 'admin@test.com',
        password: hashedPassword,
        role: 'ADMIN',
      },
    });

    const user = await prisma.user.create({
      data: {
        name: 'User Test',
        email: 'user@test.com',
        password: hashedPassword,
        role: 'USER',
      },
    });

    userId = user.id;

    const adminLoginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@test.com', password: '123456' });
    adminToken = adminLoginRes.body.token;

    const userLoginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'user@test.com', password: '123456' });
    userToken = userLoginRes.body.token;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('GET /api/health', () => {
    it('deve retornar status 200 e ok', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
    });
  });

  describe('Auth Endpoints', () => {
    it('deve falhar login com senha incorreta', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'admin@test.com', password: 'wrong' });
      expect(res.status).toBe(401);
    });

    it('deve retornar perfil do usuário autenticado', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${userToken}`);
      expect(res.status).toBe(200);
      expect(res.body.email).toBe('user@test.com');
    });
  });

  describe('Device & Location Endpoints', () => {
    it('deve permitir usuário criar um dispositivo', async () => {
      const res = await request(app)
        .post('/api/devices')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ name: 'Meu Celular Android', model: 'Pixel 7' });

      expect(res.status).toBe(201);
      expect(res.body.name).toBe('Meu Celular Android');
      deviceId = res.body.id;
    });

    it('deve rejeitar coordenadas GPS inválidas', async () => {
      const res = await request(app)
        .post(`/api/devices/${deviceId}/locations`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ latitude: 100, longitude: 200 });

      expect(res.status).toBe(400);
    });

    it('deve salvar coordenadas GPS válidas e atualizar status do dispositivo', async () => {
      const res = await request(app)
        .post(`/api/devices/${deviceId}/locations`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ latitude: -23.55052, longitude: -46.633308 });

      expect(res.status).toBe(201);
      expect(res.body.latitude).toBe(-23.55052);
      expect(res.body.longitude).toBe(-46.633308);
    });

    it('deve consultar a última localização do dispositivo', async () => {
      const res = await request(app)
        .get(`/api/devices/${deviceId}/last-location`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.latitude).toBe(-23.55052);
    });

    it('deve atualizar o status de rastreamento (start/stop)', async () => {
      const res = await request(app)
        .patch(`/api/devices/${deviceId}/tracking`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ trackingActive: false });

      expect(res.status).toBe(200);
      expect(res.body.trackingActive).toBe(false);
    });

    it('deve permitir admin listar todos os dispositivos', async () => {
      const res = await request(app)
        .get('/api/devices')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
    });
  });
});
