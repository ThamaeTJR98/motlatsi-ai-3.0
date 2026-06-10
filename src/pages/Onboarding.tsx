import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";

export default function Onboarding() {
  return (
    <div className="flex items-center justify-center h-screen bg-muted/40">
      <div className="w-full max-w-md space-y-8 p-8 bg-card text-card-foreground rounded-lg shadow-lg">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Welcome!</h1>
          <p className="text-muted-foreground">Let's set up your teaching profile.</p>
        </div>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="grades">Grades You Teach</Label>
            <Input id="grades" placeholder="e.g., Grade 4, Grade 5" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="subjects">Subjects You Teach</Label>
            <Input id="subjects" placeholder="e.g., Math, Science, English" />
          </div>
        </div>
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Your Weekly Timetable</h2>
          <p className="text-muted-foreground text-sm mb-4">Click and drag to set up your class schedule.</p>
          <div className="w-full h-64 bg-muted rounded-md flex items-center justify-center">
            <p className="text-muted-foreground">[Interactive Calendar Placeholder]</p>
          </div>
        </div>
        <Button className="w-full">Save and Continue</Button>
      </div>
    </div>
  );
}
