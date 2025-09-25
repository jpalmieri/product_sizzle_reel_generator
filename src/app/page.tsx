import { MainLayout } from "@/components/layout/main-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default function Home() {
  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold tracking-tight">AI Sizzle Reel Generator</h1>
          <p className="text-xl text-muted-foreground">
            Transform your product demos into cinematic sizzle reels with AI
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Test Components</CardTitle>
            <CardDescription>
              Testing our shadcn/ui components are working correctly
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Sample Input</label>
                <Input placeholder="Enter text here..." />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Sample Textarea</label>
                <Textarea placeholder="Enter description..." />
              </div>
            </div>
            <div className="flex gap-2">
              <Button>Primary Button</Button>
              <Button variant="outline">Outline Button</Button>
              <Button variant="secondary">Secondary Button</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
