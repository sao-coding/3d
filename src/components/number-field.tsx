import type { ComponentProps } from "react";
import type { ControllerRenderProps, FieldPath, FieldValues } from "react-hook-form";

import { Input } from "@/components/ui/input";

export function NumberField<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({
  field,
  ...props
}: { field: ControllerRenderProps<TFieldValues, TName> } & Omit<
  ComponentProps<typeof Input>,
  "value" | "onChange" | "onBlur" | "name" | "ref" | "type"
>) {
  return (
    <Input
      {...props}
      type="number"
      name={field.name}
      ref={field.ref}
      onBlur={field.onBlur}
      onChange={field.onChange}
      value={(field.value as number | string | undefined) ?? ""}
    />
  );
}
