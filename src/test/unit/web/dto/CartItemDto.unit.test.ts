import ConstraintError from "src/domain/errors/ConstraintError";
import CartItemDto from "src/web/dtos/CartItemDto";

describe('CartItemDto', () => {

    test('should have autogen methods', async () => {
        const expectedName = "expectedName";
        const expectedQuantity = 2;

        const dto = new CartItemDto({name: expectedName, quantity: expectedQuantity});

        expect(dto.name).toEqual(expectedName);
        expect(dto.quantity).toEqual(expectedQuantity);

    });

    test('must have a non blank name', async () => {

        const expectedName = "";
        const expectedQuantity = 2;

        try {
            new CartItemDto({name: expectedName, quantity: expectedQuantity});
            fail('Expected Validation error was not thrown.');
        } catch (e: any) {

            expect(e instanceof ConstraintError).toBe(true);

            const cause = e.cause;

            expect(cause).toHaveLength(1);
            expect(Object.keys(cause[0].constraints)).toHaveLength(1);
            expect(cause[0].constraints.isNotEmpty).toBe('name should not be empty');
        }

    });

});




