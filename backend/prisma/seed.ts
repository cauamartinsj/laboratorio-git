import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Semeando banco de dados...');

  await prisma.location.deleteMany();
  await prisma.device.deleteMany();
  await prisma.user.deleteMany();

  const hashedPassword = await bcrypt.hash('123456', 10);

  const admin = await prisma.user.create({
    data: {
      name: 'Central Admin',
      email: 'admin@central.com',
      password: hashedPassword,
      role: 'ADMIN',
    },
  });

  const user1 = await prisma.user.create({
    data: {
      name: 'Carlos Silva (Demonstração)',
      email: 'carlos@exemplo.com',
      password: hashedPassword,
      role: 'USER',
    },
  });

  const user2 = await prisma.user.create({
    data: {
      name: 'Maria Souza (Demonstração)',
      email: 'maria@exemplo.com',
      password: hashedPassword,
      role: 'USER',
    },
  });

  const device1 = await prisma.device.create({
    data: {
      name: 'Smartphone Carlos - Galaxy S22',
      model: 'Samsung S22',
      userId: user1.id,
      trackingActive: true,
      lastActiveAt: new Date(),
    },
  });

  const device2 = await prisma.device.create({
    data: {
      name: 'Tablet Maria - Tab A8',
      model: 'Samsung Tab A8',
      userId: user2.id,
      trackingActive: false,
      lastActiveAt: new Date(Date.now() - 3600000),
    },
  });

  await prisma.location.createMany({
    data: [
      {
        deviceId: device1.id,
        latitude: -23.55052,
        longitude: -46.633308,
        collectedAt: new Date(Date.now() - 30000),
        receivedAt: new Date(Date.now() - 30000),
      },
      {
        deviceId: device1.id,
        latitude: -23.55120,
        longitude: -46.634100,
        collectedAt: new Date(Date.now() - 15000),
        receivedAt: new Date(Date.now() - 15000),
      },
      {
        deviceId: device2.id,
        latitude: -23.56168,
        longitude: -46.655981,
        collectedAt: new Date(Date.now() - 3600000),
        receivedAt: new Date(Date.now() - 3600000),
      },
    ],
  });

  console.log('Semeamento concluído com sucesso!');
  console.log('ADMIN: admin@central.com / 123456');
  console.log('USER : carlos@exemplo.com / 123456');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
