import { ConflictException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { hashPin } from 'src/commons/utils';
import { UpdateMeRequestDTO, UpdateMeResponseDTO } from '../dto';
import { MeRepository } from '../me.repository';
import { UpdateMe } from '../types';

@Injectable()
export class UpdateMeUseCase {
  constructor(
    private readonly repository: MeRepository,
    private readonly configService: ConfigService,
  ) {}

  async execute(
    id: string,
    dto: UpdateMeRequestDTO,
  ): Promise<UpdateMeResponseDTO> {
    if (dto.name !== undefined) await this.ensureNameIsFree(dto.name, id);

    const data: UpdateMe = {
      ...dto,
      pinHash: dto.pin
        ? await hashPin(
            dto.pin,
            Number(this.configService.getOrThrow('SALT_ROUND')),
          )
        : undefined,
    };

    return this.repository.update(id, data);
  }

  private async ensureNameIsFree(name: string, id: string): Promise<void> {
    const user = await this.repository.findByName(name);

    if (user && user.id !== id)
      throw new ConflictException('Esse nome já está em uso');
  }
}
