"use client";

import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";

const MunUpCard: React.FC = () => {
  return (
    <div className="w-full">
      <Card className="w-full shadow-md">
        <CardHeader>
          <CardTitle className="text-base sm:text-xl text-gray-600 select-none">
            Concentração de Material Particulado no Ar dos Municípios do Acre
          </CardTitle>
          <CardDescription>Dias com PM2,5 superior a 15 μg/m<sup>3</sup>, nível máximo recomendado pela OMS</CardDescription>
        </CardHeader>
        <CardContent className="p-4">
          <iframe
            className="w-full border-none" 
            title="P78sH" 
            aria-label="Split Bars" 
            id="datawrapper-chart-P78sH" 
            src="https://datawrapper.dwcdn.net/P78sH/14/" 
            scrolling="no" 
            width= "100%" 
            height="623" 
            data-external="1">
          </iframe>
        </CardContent>
      </Card>
    </div>
  );
};

export default MunUpCard;
