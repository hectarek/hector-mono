import {
  NativeSelect,
  NativeSelectOption,
} from "@repo/ui/components/native-select";

// The book to copy recipes into: one recipe from its ⋯ sheet, or several from Copy recipes.
export function BookSelect({
  targets,
}: {
  targets: { id: string; name: string }[];
}) {
  return (
    <NativeSelect
      name="targetSpaceId"
      required
      aria-label="Copy into"
      className="w-full"
    >
      {targets.map((target) => (
        <NativeSelectOption key={target.id} value={target.id}>
          {target.name}
        </NativeSelectOption>
      ))}
    </NativeSelect>
  );
}
