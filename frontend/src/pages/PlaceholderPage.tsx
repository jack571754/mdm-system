import React from "react";
import { Clock, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

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
    <div className="bg-white rounded-xl border border-slate-200/80 p-8 shadow-xs max-w-4xl mx-auto my-6">
      <div className="flex items-center justify-between mb-4">
        <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
          计划在 {sprint} 中落地交付
        </span>
        <span className="text-xs text-slate-400 flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-blue-500" />
          实施路线图规划中
        </span>
      </div>

      <h2 className="text-xl font-bold text-slate-900 mb-2">{title}</h2>
      <p className="text-sm text-slate-600 mb-6">{description}</p>

      <div className="bg-slate-50 rounded-xl p-5 border border-slate-200/70 mb-6">
        <div className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-3">
          功能与接口规划要点
        </div>
        <ul className="space-y-2 text-xs text-slate-600">
          {features.map((feat, idx) => (
            <li key={idx} className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
              <span>{feat}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex items-center gap-4">
        <Link
          to="/dashboard"
          className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium transition-colors flex items-center gap-1.5"
        >
          <span>返回系统概览</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
};
