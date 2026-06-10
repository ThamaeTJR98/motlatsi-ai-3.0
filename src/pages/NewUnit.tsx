import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";

export default function NewUnit() {
  return (
    <div className="p-4 md:p-8">
      <Card className="max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle>Create a New Bulk Unit</CardTitle>
          <CardDescription>Define the learning objectives and date range to generate a full lesson plan.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="unit-name">Unit Name</Label>
            <Input id="unit-name" placeholder='e.g., "Q3: Fractions & Ecosystems"' />
          </div>
          <div className="space-y-2">
            <Label>Learning Objectives</Label>
            <div className="p-4 border rounded-md min-h-[100px] bg-muted/50">
              <p className="text-sm text-muted-foreground">[Checkbox list of objectives will go here]</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start-date">Start Date</Label>
              <Input id="start-date" type="date" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-date">End Date</Label>
              <Input id="end-date" type="date" />
            </div>
          </div>
          <Button size="lg" className="w-full">
            Generate Plan & Worksheets
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
