import {
  ArgumentMetadata,
  BadRequestException,
  PipeTransform,
} from '@nestjs/common';
import { treeifyError, ZodType } from 'zod';

export class ZodValidationPipe implements PipeTransform {
  private schema: ZodType;

  constructor(schema: ZodType) {
    this.schema = schema;
  }

  transform(value: unknown, metadata: ArgumentMetadata) {
    const result = this.schema.safeParse(value);

    if (result.success) return result.data;

    throw new BadRequestException(treeifyError(result.error));
  }
}
