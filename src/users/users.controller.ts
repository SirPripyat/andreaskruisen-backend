import { Body, Controller, HttpCode, HttpStatus, Post } from "@nestjs/common";
import { ZodValidationPipe } from "../commons/pipes/zod-validation.pipe";
import { CreateUser, CreateUserSchema } from "./dto/create-user.schema";
import { UsersService } from "./users.service";

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body(new ZodValidationPipe(CreateUserSchema)) dto: CreateUser) {
    await this.usersService.create(dto);
  }
}
