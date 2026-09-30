import React from "react";
import { Clock, ArrowRight, Construction } from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface PlaceholderProps {
  title: string;
  sprint: string;
  description: string;
  features: string[];
}

export const PlaceholderPage: React.FC<PlaceholderProps> = ({
  title,
  sprint,
  description,
  features,
}) => {
  return (
    <div className="max-w-4xl mx-auto py-6">
      <Card className="border-border shadow-xs">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between mb-2">
            <Badge variant="outline" className="font-normal bg-secondary/50 text-foreground">
              计划在 {sprint} 中落地交付
            </Badge>
            <span className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-muted-foreground" />
              实施路线图规划中
            </span>
          </div>
          <CardTitle className="text-xl flex items-center gap-2">
            <Construction className="w-5 h-5 text-muted-foreground" />
            {title}
          </CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            {description}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="rounded-lg border border-border bg-muted/30 p-4">
            <div className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3">
              功能与接口规划要点
            </div>
            <ul className="space-y-2 text-xs text-muted-foreground">
              {features.map((feat, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                  <span className="text-foreground/90">{feat}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex items-center gap-4">
            <Button asChild size="sm">
              <Link to="/dashboard" className="flex items-center gap-1.5">
                <span>返回系统概览</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
