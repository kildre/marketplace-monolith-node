import { ValidationError } from "class-validator";
import { buildValidated } from "src/service/validatorService";
import CartItemDto from "src/web/dtos/CartItemDto";

describe('CartItemDto', () => {

    test('should have autogen methods', async () => {
        const expectedName = "expectedName";
        const expectedQuantity = 2;

        const dto = await buildValidated<typeof CartItemDto>( CartItemDto.builder().name(expectedName).quantity(expectedQuantity));

        expect(dto.getName()).toEqual(expectedName);
        expect(dto.getQuantity()).toEqual(expectedQuantity);

    });

    test('must have a non blank name', async () => {

        const expectedName = "";
        const expectedQuantity = 2;

        try {
            await buildValidated<typeof CartItemDto>(CartItemDto.builder().name(expectedName).quantity(expectedQuantity));
            fail('Expected Validation error was not thrown.');
        } catch (e: any) {
            expect(e).toHaveLength(1);
            expect(Object.keys(e[0].constraints)).toHaveLength(1);
            expect(e[0].constraints.isNotEmpty).toBe('name should not be empty');
        }

    });

});




