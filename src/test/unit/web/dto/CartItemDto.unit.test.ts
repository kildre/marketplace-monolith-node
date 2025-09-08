import CartItemDto from "src/web/dtos/CartItemDto";

test('should have autogen methods', function() {
    const expectedName = "expectedName";
    const expectedQuantity = 2;

    const dto = CartItemDto.builder().name(expectedName).quantity(expectedQuantity).build();

    expect(dto.getName()).toEqual(expectedName);
    expect(dto.getQuantity()).toEqual(expectedQuantity);

});