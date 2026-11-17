import { Injectable } from '@nestjs/common';
import { LoginRequestDTO } from './dto/request';
import { LoginResponseDTO } from './dto/response';
import { LoginUseCase } from './use-cases/login.use-case';
import { LogoutUseCase } from './use-cases/logout.use-case';

@Injectable()
export class AuthFacade {
  constructor(
    private readonly loginUseCase: LoginUseCase,
    private readonly logoutUseCase: LogoutUseCase,
  ) {}

  async login(dto: LoginRequestDTO): Promise<LoginResponseDTO> {
    const { user, token } = await this.loginUseCase.execute(dto);
    return { user, token };
  }

  logout(token: string): Promise<void> {
    return this.logoutUseCase.execute(token);
  }
}
