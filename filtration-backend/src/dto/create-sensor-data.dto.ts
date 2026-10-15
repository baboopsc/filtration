import { IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateSensorDataDto {
  @IsNumber({}, { message: 'waterLevel sayisal bir deger olmalidir' })
  @Min(0, { message: 'waterLevel 0 veya daha buyuk olmalidir' })
  @Max(100, { message: 'waterLevel en fazla 100 olabilir' })
  waterLevel: number;

  @IsNumber({}, { message: 'filterClogging sayisal bir deger olmalidir' })
  @Min(0, { message: 'filterClogging 0 veya daha buyuk olmalidir' })
  @Max(100, { message: 'filterClogging en fazla 100 olabilir' })
  filterClogging: number;

  @IsOptional()
  @IsNumber({}, { message: 'flowRate sayisal bir deger olmalidir' })
  flowRate?: number;

  @IsOptional()
  @IsString({ message: 'deviceId metin tipinde olmalidir' })
  deviceId?: string;
}
