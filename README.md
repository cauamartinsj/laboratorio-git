# Sistema de Rastreamento Mobile Conectado a uma Central

Este projeto é um sistema completo de rastreamento de pessoas e dispositivos móveis conectado a uma central de monitoramento web. O projeto foi desenvolvido para fins acadêmicos utilizando a abordagem de **Vibe Coding** com foco em arquitetura limpa, código organizado e interface intuitiva.

---

## 🏗️ Arquitetura do Sistema

O repositório é organizado de forma modular em três componentes principais:

1. **`backend/`**: API RESTful desenvolvida em **Node.js + Express + TypeScript** e **Prisma ORM** com **SQLite** (configurável para PostgreSQL).
2. **`web/`**: Painel Administrativo em **React + TypeScript + Vite + Leaflet (OpenStreetMap)** para acompanhamento e histórico no mapa.
3. **`mobile/`**: Aplicativo Android/iOS desenvolvido em **React Native + Expo + TypeScript + Expo Location**.

---

## 🚀 Como Executar o Projeto

### Pré-requisitos
- Node.js (v18+)
- npm ou yarn
- Expo Go instalado no celular Android (para testes em dispositivo físico) ou Emulador Android Studio

---

### 1. Backend API

```bash
cd backend
npm install

# Configurar variáveis de ambiente
cp .env.example .env

# Sincronizar esquema do banco de dados e semear dados de teste
npx prisma db push
npx ts-node prisma/seed.ts

# Iniciar o servidor em modo de desenvolvimento (Porta 3001)
npm run dev
```

---

### 2. Painel Web Administrativo

```bash
cd web
npm install

# Iniciar aplicação React (Porta 3000)
npm run dev
```

Acesse o painel no navegador: **`http://localhost:3000`**

---

### 3. Aplicativo Mobile Android

```bash
cd mobile
npm install

# Iniciar o servidor de desenvolvimento Expo
npm start
```

---

## 🔑 Credenciais de Teste / Demonstração

| Perfil | E-mail | Senha | Acesso |
|---|---|---|---|
| **Administrador** | `admin@central.com` | `123456` | Painel Web / Central |
| **Usuário Padrão** | `carlos@exemplo.com` | `123456` | App Mobile |

---

## 📱 Configuração do Endereço do Backend no Android

Para testar no aplicativo móvel:
- **No Emulador Android Padrão**: O endereço `http://10.0.2.2:3001/api` já está pré-configurado por padrão no arquivo `mobile/src/services/api.ts`.
- **Em Dispositivo Android Real na mesma rede Wi-Fi**:
  Substitua o IP em `mobile/src/services/api.ts` pelo IP local do seu computador (exemplo: `http://192.168.1.15:3001/api`).

---

## 🐳 Execução via Docker Compose (Opcional)

Caso prefira rodar a central backend e o painel web em containers:

```bash
docker-compose up --build
```

---

## 🔒 Segurança, Privacidade e Remoção de Dados

- **Coleta Consentida**: O aplicativo Android solicita permissão explícita de localização ao usuário e rastreia apenas em primeiro plano quando iniciado manualmente.
- **Restauração e Exclusão**: Os históricos de localização e o cadastro de dispositivos podem ser apagados do banco de dados via scripts do Prisma (`npx prisma db push --force-reset`) ou endpoints de gerenciamento.

---

## 🧪 Testes Automatizados

Para executar a suíte de testes de integração da API REST:

```bash
cd backend
npm test
```
