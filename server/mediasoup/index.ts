import { createWorker, types as mediasoupTypes } from 'mediasoup';

export interface MediasoupConfig {
  rtcMinPort: number;
  rtcMaxPort: number;
  announcedIp: string;
}

export class MediasoupServer {
  private worker: mediasoupTypes.Worker | null = null;
  private routers = new Map<string, mediasoupTypes.Router>();
  private transports = new Map<string, mediasoupTypes.WebRtcTransport>();
  private producers = new Map<string, mediasoupTypes.Producer>();
  private consumers = new Map<string, mediasoupTypes.Consumer>();

  private config: MediasoupConfig = {
    rtcMinPort: 10000,
    rtcMaxPort: 20000,
    announcedIp: '127.0.0.1'
  };

  constructor(config?: Partial<MediasoupConfig>) {
    if (config) {
      this.config = { ...this.config, ...config };
    }
  }

  async init(): Promise<void> {
    try {
      this.worker = await createWorker({
        logLevel: 'warn',
        rtcMinPort: this.config.rtcMinPort,
        rtcMaxPort: this.config.rtcMaxPort
      });

      this.worker.on('died', () => {
        console.error('[Mediasoup] Worker died');
      });

      console.log('[Mediasoup] Worker started successfully');
    } catch (error) {
      console.error('[Mediasoup] Failed to start worker, continuing without WebRTC support:', error);
      this.worker = null;
    }
  }

  async createRouter(roomId: string): Promise<mediasoupTypes.Router> {
    if (!this.worker) {
      throw new Error('[Mediasoup] Worker not initialized');
    }

    const mediaCodecs = [
      {
        kind: 'audio' as const,
        mimeType: 'audio/opus',
        clockRate: 48000,
        channels: 2
      },
      {
        kind: 'video' as const,
        mimeType: 'video/VP8',
        clockRate: 90000,
        parameters: {
          'x-google-start-bitrate': 1000
        }
      }
    ];

    try {
      const router = await this.worker.createRouter({ mediaCodecs });
      this.routers.set(roomId, router);
      console.log(`[Mediasoup] Router created for room: ${roomId}`);
      return router;
    } catch (error) {
      console.error('[Mediasoup] Failed to create router:', error);
      throw error;
    }
  }

  async createWebRtcTransport(roomId: string, userId: string): Promise<mediasoupTypes.WebRtcTransport> {
    const router = this.routers.get(roomId) || await this.createRouter(roomId);

    const transport = await router.createWebRtcTransport({
      listenIps: [{ 
        ip: '0.0.0.0', 
        announcedIp: this.config.announcedIp
      }],
      enableUdp: true,
      enableTcp: true,
      preferUdp: true,
      initialAvailableOutgoingBitrate: 1000000
    });

    this.transports.set(userId, transport);
    console.log(`[Mediasoup] WebRtcTransport created for user: ${userId}`);
    
    return transport;
  }

  async createProducer(userId: string, kind: 'audio' | 'video', rtpParameters: any): Promise<mediasoupTypes.Producer | null> {
    const transport = this.transports.get(userId);
    if (!transport) {
      console.error(`[Mediasoup] Transport not found for user: ${userId}`);
      return null;
    }

    try {
      const producer = await transport.produce({ kind, rtpParameters });
      this.producers.set(producer.id, producer);
      console.log(`[Mediasoup] Producer created: ${producer.id} (${kind})`);
      return producer;
    } catch (error) {
      console.error('[Mediasoup] Failed to create producer:', error);
      return null;
    }
  }

  async createConsumer(userId: string, producerId: string, roomId: string): Promise<mediasoupTypes.Consumer | null> {
    const transport = this.transports.get(userId);
    const producer = this.producers.get(producerId);
    const router = this.routers.get(roomId);

    if (!transport || !producer || !router) {
      console.error(`[Mediasoup] Transport, producer or router not found for consumer creation`);
      return null;
    }

    try {
      const consumer = await transport.consume({
        producerId,
        rtpCapabilities: router.rtpCapabilities
      });

      this.consumers.set(consumer.id, consumer);
      console.log(`[Mediasoup] Consumer created: ${consumer.id} (${consumer.kind})`);
      
      return consumer;
    } catch (error) {
      console.error('[Mediasoup] Failed to create consumer:', error);
      return null;
    }
  }

  async closeTransport(userId: string): Promise<void> {
    const transport = this.transports.get(userId);
    if (transport) {
      await transport.close();
      this.transports.delete(userId);
      console.log(`[Mediasoup] Transport closed for user: ${userId}`);
    }
  }

  async closeRouter(roomId: string): Promise<void> {
    const router = this.routers.get(roomId);
    if (router) {
      await router.close();
      this.routers.delete(roomId);
      console.log(`[Mediasoup] Router closed for room: ${roomId}`);
    }
  }

  getRouter(roomId: string): mediasoupTypes.Router | undefined {
    return this.routers.get(roomId);
  }

  getTransport(userId: string): mediasoupTypes.WebRtcTransport | undefined {
    return this.transports.get(userId);
  }

  getProducer(producerId: string): mediasoupTypes.Producer | undefined {
    return this.producers.get(producerId);
  }
}

export const mediasoupServer = new MediasoupServer({
  rtcMinPort: 10000,
  rtcMaxPort: 20000,
  announcedIp: process.env.TURN_SERVER_IP || '127.0.0.1'
});
