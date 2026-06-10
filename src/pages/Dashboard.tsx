import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";

export default function Dashboard(props: any) {
  return (
    <div className="space-y-8 p-4 md:p-8">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">
            Welcome back, Teacher! Here's your planning overview.
          </p>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Create New Unit</CardTitle>
            <CardDescription>Plan a new set of lessons and worksheets.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button>Start Planning</Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>View Calendar</CardTitle>
            <CardDescription>See your scheduled lessons and make adjustments.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="secondary">Open Calendar</Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Generate Report</CardTitle>
            <CardDescription>Create a progress report for any date range.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline">New Report</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
