import { validateOrReject } from "class-validator";

export async function buildValidated<T extends object>(builder: { build: () => T }): Promise<T> {
  const instance = builder.build();
  await validateOrReject(instance);
  return instance;
}