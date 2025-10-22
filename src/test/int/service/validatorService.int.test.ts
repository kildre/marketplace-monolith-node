import 'reflect-metadata';
import { IsEmail, IsInt, IsNotEmpty, Min, IsOptional } from 'class-validator';
import type { ValidationError } from 'class-validator';
import { buildValidated } from '../../../main/service/validatorService'; // adjust path

class PersonDto {
  @IsNotEmpty()
  name!: string;

  @IsEmail()
  email!: string;

  @IsInt()
  @Min(1)
  age!: number;
}

// 🔧 Replace NoDecoratorsDto with a permissive DTO:
class PermissiveDto {
  @IsOptional()
  foo?: string;
}

describe('buildValidated (integration)', () => {
  // ... your existing tests ...

  it('passes validation when the DTO has only optional (permissive) decorators', async () => {
    const instance = new PermissiveDto();
    instance.foo = 'bar';
    const builder = { build: () => instance };

    const result = await buildValidated<PermissiveDto>(builder);

    expect(result).toBe(instance);
    expect(result.foo).toBe('bar');
  });

  // If you still want to assert behavior for a truly undecorated class,
  // you can assert it *throws* with the unknownValue constraint:
  it('throws "unknownValue" when the class has no decorators (current class-validator behavior)', async () => {
    class NoDecoratorsDto {
      foo?: string;
    }
    const instance = new NoDecoratorsDto();
    instance.foo = 'bar';

    await expect(
      buildValidated<NoDecoratorsDto>({ build: () => instance })
    ).rejects.toEqual(
      expect.arrayContaining<Partial<ValidationError>>([
        expect.objectContaining({
          constraints: expect.objectContaining({
            unknownValue: expect.stringContaining('unknown value was passed'),
          }),
        }),
      ])
    );
  });
});
