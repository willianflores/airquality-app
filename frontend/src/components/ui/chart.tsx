// Arquivo temporário para resolver dependência
// Este componente não está sendo usado na aplicação atual

import * as React from "react";

export interface ChartConfig {
  [key: string]: any;
}

export const ChartContainer = ({ children, ...props }: { children: React.ReactNode; [key: string]: any }) => {
  return <div {...props}>{children}</div>;
};

export const ChartTooltip = ({ children, ...props }: { children?: React.ReactNode; [key: string]: any }) => {
  return <div {...props}>{children}</div>;
};

export const ChartTooltipContent = ({ ...props }: { [key: string]: any }) => {
  return <div {...props}></div>;
};

export const ChartLegend = ({ children, ...props }: { children?: React.ReactNode; [key: string]: any }) => {
  return <div {...props}>{children}</div>;
};

export const ChartLegendContent = ({ ...props }: { [key: string]: any }) => {
  return <div {...props}></div>;
};