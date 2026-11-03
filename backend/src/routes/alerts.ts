import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authMiddleware, requireAdmin, AuthRequest } from '../middleware/auth';

export const alertsRouter = Router();

alertsRouter.use(authMiddleware);

const createAlertSchema = z.object({
  message: z.string().min(1, 'Mensagem de emergência é obrigatória'),
  deviceId: z.string().optional().nullable(),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
});

const updateAlertStatusSchema = z.object({
  status: z.enum(['PENDING', 'VIEWED', 'RESOLVED']),
});

// POST /api/alerts - Envia um alerta de emergência (qualquer usuário autenticado)
alertsRouter.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { message, deviceId, latitude, longitude } = createAlertSchema.parse(req.body);

    let validDeviceId: string | null = null;
    if (deviceId) {
      const device = await prisma.device.findUnique({
        where: { id: deviceId },
      });
      if (device && (device.userId === req.user!.id || req.user!.role === 'ADMIN')) {
        validDeviceId = device.id;
      }
    }

    // Se latitude/longitude não forem fornecidas, mas tiver dispositivo, tentar obter última localização
    let finalLat = latitude ?? null;
    let finalLng = longitude ?? null;

    if ((finalLat === null || finalLng === null) && validDeviceId) {
      const lastLoc = await prisma.location.findFirst({
        where: { deviceId: validDeviceId },
        orderBy: { collectedAt: 'desc' },
      });
      if (lastLoc) {
        finalLat = lastLoc.latitude;
        finalLng = lastLoc.longitude;
      }
    }

    const alert = await prisma.alert.create({
      data: {
        message,
        userId: req.user!.id,
        deviceId: validDeviceId,
        latitude: finalLat,
        longitude: finalLng,
        status: 'PENDING',
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        device: { select: { id: true, name: true, model: true } },
      },
    });

    return res.status(201).json(alert);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    return res.status(500).json({ error: 'Erro ao enviar alerta de emergência' });
  }
});

// GET /api/alerts - Lista alertas (apenas administradores)
alertsRouter.get('/', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { status } = req.query;

    const where: any = {};
    if (status && typeof status === 'string') {
      where.status = status;
    }

    const alerts = await prisma.alert.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true } },
        device: { select: { id: true, name: true, model: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return res.json(alerts);
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao listar alertas' });
  }
});

// PATCH /api/alerts/:id/status - Atualiza status do alerta (apenas administradores)
alertsRouter.patch('/:id/status', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = updateAlertStatusSchema.parse(req.body);

    const alert = await prisma.alert.findUnique({
      where: { id },
    });

    if (!alert) {
      return res.status(404).json({ error: 'Alerta não encontrado' });
    }

    const updatedAlert = await prisma.alert.update({
      where: { id },
      data: { status },
      include: {
        user: { select: { id: true, name: true, email: true } },
        device: { select: { id: true, name: true, model: true } },
      },
    });

    return res.json(updatedAlert);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    return res.status(500).json({ error: 'Erro ao atualizar status do alerta' });
  }
});
