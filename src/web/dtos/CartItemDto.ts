import autogen, { Builder, Getter, Value, Data, AllArgsConstructor, Setter } from "@bollo-aggrey/ts-autogen";
import { IsInt, IsNotEmpty, IsString } from "class-validator";

@Value()
@Builder()
//@AllArgsConstructor()
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
export default CartItemDto;
