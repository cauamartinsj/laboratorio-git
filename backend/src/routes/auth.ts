import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authMiddleware, AuthRequest } from '../middleware/auth';

export const authRouter = Router();

const registerSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
});

const loginSchema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(1, 'Senha é obrigatória'),
});

authRouter.post('/register', async (req: Request, res: Response) => {
  try {
    const { name, email, password } = registerSchema.parse(req.body);

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(409).json({ error: 'E-mail já está em uso' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: 'USER',
      },
    });

    const secret = process.env.JWT_SECRET || 'super-secret-jwt-key-for-academic-tracking-system';
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
      },
      secret,
      { expiresIn: '7d' }
    );

    return res.status(201).json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    return res.status(500).json({ error: 'Erro ao registrar usuário' });
  }
});

authRouter.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    const secret = process.env.JWT_SECRET || 'super-secret-jwt-key-for-academic-tracking-system';
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
      },
      secret,
      { expiresIn: '7d' }
    );

    return res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    return res.status(500).json({ error: 'Erro ao realizar login' });
  }
});

authRouter.post('/logout', authMiddleware, (req: AuthRequest, res: Response) => {
  return res.json({ message: 'Sessão encerrada com sucesso' });
});

authRouter.get('/me', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user?.id },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });

    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    return res.json(user);
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao buscar perfil' });
  }
});
