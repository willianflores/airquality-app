import prismaClient from "../../prisma";

class LoadHourDataService {
    async execute(date: string) {
        const hour = await prismaClient.hour.findMany({
            where: {
                date: {
                    gte: new Date(date), // Filtro de data usando >=
                },
            },
            select: {
                id: false,
                date: true,
                pm2_5: true,
                municipio: true,
            },
            orderBy: [
                { municipio: 'asc' }, // Ordena por municipio em ordem crescente
                { date: 'asc' },      // Ordena por date em ordem crescente
            ],
        });

        return hour;
    }
}

export { LoadHourDataService };
