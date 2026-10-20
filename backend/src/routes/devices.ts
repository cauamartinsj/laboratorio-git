import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authMiddleware, AuthRequest } from '../middleware/auth';

export const devicesRouter = Router();

devicesRouter.use(authMiddleware);

const locationSchema = z.object({
  latitude: z.number().min(-90).max(90, 'Latitude inválida'),
  longitude: z.number().min(-180).max(180, 'Longitude inválida'),
  collectedAt: z.string().optional(),
});

const trackingStatusSchema = z.object({
  trackingActive: z.boolean(),
});

const registerDeviceSchema = z.object({
  name: z.string().min(1, 'Nome do dispositivo é obrigatório'),
  model: z.string().optional(),
});

// GET /api/devices - Lista dispositivos autorizados (ADMIN vê todos; USER vê apenas os seus)
devicesRouter.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const isUserAdmin = req.user?.role === 'ADMIN';

    const whereClause = isUserAdmin ? {} : { userId: req.user?.id };

    const devices = await prisma.device.findMany({
      where: whereClause,
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
        locations: {
          orderBy: { collectedAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const formattedDevices = devices.map((device) => {
      const lastLocation = device.locations[0] || null;
      return {
        id: device.id,
        name: device.name,
        model: device.model,
        trackingActive: device.trackingActive,
        lastActiveAt: device.lastActiveAt,
        userId: device.userId,
        user: device.user,
        lastLocation: lastLocation
          ? {
              id: lastLocation.id,
              latitude: lastLocation.latitude,
              longitude: lastLocation.longitude,
              collectedAt: lastLocation.collectedAt,
              receivedAt: lastLocation.receivedAt,
            }
          : null,
      };
    });

    return res.json(formattedDevices);
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao buscar dispositivos' });
  }
});

// POST /api/devices - Registra ou garante a existência de um dispositivo do usuário logado
devicesRouter.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { name, model } = registerDeviceSchema.parse(req.body);

    const device = await prisma.device.create({
      data: {
        name,
        model: model || 'Android Mobile',
        userId: req.user!.id,
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    return res.status(201).json(device);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    return res.status(500).json({ error: 'Erro ao cadastrar dispositivo' });
  }
});

// GET /api/devices/:id - Busca detalhes de um dispositivo específico
devicesRouter.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const device = await prisma.device.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true } },
        locations: {
          orderBy: { collectedAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!device) {
      return res.status(404).json({ error: 'Dispositivo não encontrado' });
    }

    if (req.user?.role !== 'ADMIN' && device.userId !== req.user?.id) {
      return res.status(403).json({ error: 'Acesso não autorizado a este dispositivo' });
    }

    const lastLocation = device.locations[0] || null;

    return res.json({
      ...device,
      locations: undefined,
      lastLocation: lastLocation
        ? {
            id: lastLocation.id,
            latitude: lastLocation.latitude,
            longitude: lastLocation.longitude,
            collectedAt: lastLocation.collectedAt,
            receivedAt: lastLocation.receivedAt,
          }
        : null,
    });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao buscar detalhes do dispositivo' });
  }
});

// POST /api/devices/:id/locations - Recebimento de coordenadas GPS
devicesRouter.post('/:id/locations', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { latitude, longitude, collectedAt } = locationSchema.parse(req.body);

    const device = await prisma.device.findUnique({ where: { id } });

    if (!device) {
      return res.status(404).json({ error: 'Dispositivo não encontrado' });
    }

    if (req.user?.role !== 'ADMIN' && device.userId !== req.user?.id) {
      return res.status(403).json({ error: 'Acesso não autorizado para enviar dados a este dispositivo' });
    }

    const collectedDate = collectedAt ? new Date(collectedAt) : new Date();

    const location = await prisma.location.create({
      data: {
        deviceId: id,
        latitude,
        longitude,
        collectedAt: collectedDate,
        receivedAt: new Date(),
      },
    });

    await prisma.device.update({
      where: { id },
      data: {
        lastActiveAt: new Date(),
        trackingActive: true,
      },
    });

    return res.status(201).json(location);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    return res.status(500).json({ error: 'Erro ao salvar localização' });
  }
});

// GET /api/devices/:id/locations - Consulta do histórico de rastreamento do dispositivo
devicesRouter.get('/:id/locations', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { limit, startDate, endDate } = req.query;

    const device = await prisma.device.findUnique({ where: { id } });

    if (!device) {
      return res.status(404).json({ error: 'Dispositivo não encontrado' });
    }

    if (req.user?.role !== 'ADMIN' && device.userId !== req.user?.id) {
      return res.status(403).json({ error: 'Acesso não autorizado a este dispositivo' });
    }

    const where: any = { deviceId: id };

    if (startDate || endDate) {
      where.collectedAt = {};
      if (startDate) where.collectedAt.gte = new Date(startDate as string);
      if (endDate) where.collectedAt.lte = new Date(endDate as string);
    }

    const takeCount = limit ? parseInt(limit as string, 10) : 100;

    const locations = await prisma.location.findMany({
      where,
      orderBy: { collectedAt: 'desc' },
      take: takeCount,
    });

    return res.json(locations);
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao buscar histórico de localizações' });
  }
});

// GET /api/devices/:id/last-location - Consulta da última localização de um dispositivo
devicesRouter.get('/:id/last-location', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const device = await prisma.device.findUnique({ where: { id } });

    if (!device) {
      return res.status(404).json({ error: 'Dispositivo não encontrado' });
    }

    if (req.user?.role !== 'ADMIN' && device.userId !== req.user?.id) {
      return res.status(403).json({ error: 'Acesso não autorizado a este dispositivo' });
    }

    const lastLocation = await prisma.location.findFirst({
      where: { deviceId: id },
      orderBy: { collectedAt: 'desc' },
    });

    if (!lastLocation) {
      return res.status(404).json({ error: 'Nenhuma localização cadastrada para este dispositivo' });
    }

    return res.json(lastLocation);
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao buscar última localização' });
  }
});

// PATCH /api/devices/:id/tracking - Atualização do status do rastreamento (Start/Stop)
devicesRouter.patch('/:id/tracking', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { trackingActive } = trackingStatusSchema.parse(req.body);

    const device = await prisma.device.findUnique({ where: { id } });

    if (!device) {
      return res.status(404).json({ error: 'Dispositivo não encontrado' });
    }

    if (req.user?.role !== 'ADMIN' && device.userId !== req.user?.id) {
      return res.status(403).json({ error: 'Acesso não autorizado a este dispositivo' });
    }

    const updatedDevice = await prisma.device.update({
      where: { id },
      data: {
        trackingActive,
        ...(trackingActive ? { lastActiveAt: new Date() } : {}),
      },
    });

    return res.json(updatedDevice);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    return res.status(500).json({ error: 'Erro ao atualizar status do rastreamento' });
  }
});
