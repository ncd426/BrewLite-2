import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { jest } from '@jest/globals';
import request from 'supertest';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';

describe('AppController (HTTP)', () => {
  let app: INestApplication;
  const prisma = {
    $queryRaw: jest.fn<() => Promise<unknown>>(),
  };

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  beforeEach(() => {
    prisma.$queryRaw.mockReset();
    prisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);
  });

  afterAll(async () => {
    await app.close();
  });

  it('keeps GET / independent of database readiness', async () => {
    await request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');

    expect(prisma.$queryRaw).not.toHaveBeenCalled();
  });

  it('reports ready only after a successful database probe', async () => {
    await request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect({ status: 'ok', database: 'up' });

    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
  });

  it('returns 503 without exposing database connection errors', async () => {
    prisma.$queryRaw.mockRejectedValueOnce(
      new Error('Database unavailable at private-db:5432; password=test-secret'),
    );

    await request(app.getHttpServer())
      .get('/health')
      .expect(503)
      .expect({ status: 'error', database: 'down' });
  });

  it('checks the database again and recovers when connectivity returns', async () => {
    prisma.$queryRaw.mockRejectedValueOnce(new Error('Connection refused'));

    await request(app.getHttpServer())
      .get('/health')
      .expect(503);
    await request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect({ status: 'ok', database: 'up' });

    expect(prisma.$queryRaw).toHaveBeenCalledTimes(2);
  });
});
