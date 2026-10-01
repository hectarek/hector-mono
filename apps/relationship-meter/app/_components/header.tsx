import { Card, CardHeader, CardTitle } from "@repo/ui/components/card";

export function Header() {
  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle>Relationship Health Tracker</CardTitle>
      </CardHeader>
    </Card>
  );
}
