import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";

export default function Reports() {
  return (
    <div className="p-4 md:p-8">
      <div className="max-w-3xl mx-auto space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Generate a Report</CardTitle>
            <CardDescription>Select a date range to generate a report on lesson coverage and pacing.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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
            <Button className="w-full">Generate Report</Button>
          </CardContent>
        </Card>
        <div className="w-full p-8 bg-card border rounded-lg shadow-sm flex items-center justify-center min-h-[300px]">
          <p className="text-muted-foreground">[Generated Report Will Appear Here]</p>
        </div>
      </div>
    </div>
  );
}
