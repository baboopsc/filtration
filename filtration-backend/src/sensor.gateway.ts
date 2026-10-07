import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*', // React'ten gelen anlık bağlantılara izin ver
  },
})
export class SensorGateway {
  @WebSocketServer()
  server: Server;

  // Yeni veri geldiğinde React arayüzüne fırlatacak fonksiyon
  broadcastNewData(data: any) {
    this.server.emit('yeniSensorVerisi', data);
  }
}