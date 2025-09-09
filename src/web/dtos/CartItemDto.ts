import autogen, { Builder, Getter, Value } from "@bollo-aggrey/ts-autogen";
import { IsInt, IsNotEmpty, IsString, validateOrReject } from "class-validator";

@Value()
@Builder()
class RawCartItemDto {

    @IsString()
    @IsNotEmpty()
    @Getter()
    private name!: string;

    @IsInt()
    @Getter()
    private quantity!: number;

}

const CartItemDto = autogen(RawCartItemDto);

const originalBuilderMethod = CartItemDto.builder;

CartItemDto.builder = () => {
    console.log('custom builder ...');
    const builder = originalBuilderMethod();

    const originalBuildMethod = builder.build;

    builder.build = async () => {
        const dto = originalBuildMethod();
        console.log('validating ...');
        await validateOrReject(dto);
        return dto;
    }

    return builder;
}

export default CartItemDto;
